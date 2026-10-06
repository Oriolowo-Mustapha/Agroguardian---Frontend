import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Plus,
  Upload,
  PawPrint,
  Info,
  Beef,
  Bird,
  Fish,
  Rabbit
} from 'lucide-react';
import api from '../lib/axios';
import ModalShell from './ui/ModalShell';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const SPECIES_OPTIONS = [
  { value: 'cattle', label: 'Cattle', icon: Beef, trackingDefault: 'individual' },
  { value: 'goat', label: 'Goat', icon: Rabbit, trackingDefault: 'individual' },
  { value: 'sheep', label: 'Sheep', icon: Rabbit, trackingDefault: 'individual' },
  { value: 'rabbit', label: 'Rabbit', icon: Rabbit, trackingDefault: 'individual' },
  { value: 'pig', label: 'Pig', icon: PawPrint, trackingDefault: 'individual' },
  { value: 'poultry', label: 'Poultry', icon: Bird, trackingDefault: 'batch' },
  { value: 'fish', label: 'Fish', icon: Fish, trackingDefault: 'batch' }
];

const POULTRY_TYPES = ['broiler', 'layer', 'noiler', 'kuroiler', 'cockerel', 'pullet', 'dual_purpose', 'turkey', 'duck', 'guinea_fowl', 'quail'];
const FISH_TYPES = ['tilapia', 'catfish', 'carp', 'salmon', 'trout', 'other'];
const ACQUISITION_METHODS = ['purchase', 'birth', 'gift', 'other'];

const TAG_REQUIRED_SPECIES = ['cattle', 'goat', 'sheep', 'pig', 'rabbit'];

const moneyOptional = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().nonnegative().optional()
);

const moneyRequired = z.preprocess(
  (v) => (v === '' || v == null ? undefined : v),
  z.coerce.number().nonnegative('Enter a valid amount')
);

const livestockSchema = z.object({
  species: z.string().min(1, 'Species is required'),
  trackingType: z.enum(['individual', 'batch']),

  tagId: z.string().max(50).optional(),
  breed: z.string().max(100).optional(),
  quantity: z.coerce.number().int().positive().optional(),
  gender: z.enum(['male', 'female', 'unknown']).optional(),
  dateOfBirth: z.string().optional(),
  acquisitionDate: z.string().min(1, 'Acquisition date is required'),
  acquisitionMethod: z.enum(['purchase', 'birth', 'gift', 'other']),
  // Amount paid (only relevant if acquired by purchase)
  acquisitionCost: moneyOptional,
  // Farmer's expected selling price / current value
  cost: moneyRequired,
  weight: z.coerce.number().positive().optional(),
  color: z.string().max(50).optional(),
  poultryType: z.string().optional(),
  fishType: z.string().optional(),
  housingUnit: z.string().max(100).optional(),
  notes: z.string().max(1000).optional()
}).superRefine((data, ctx) => {
  // Batch tracking requires quantity
  if (data.trackingType === 'batch' && (!data.quantity || data.quantity < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['quantity'],
      message: 'Quantity is required for batch tracking'
    });
  }

  // Poultry requires poultryType
  if (data.species === 'poultry' && (!data.poultryType || !data.poultryType.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['poultryType'],
      message: 'Poultry type is required'
    });
  }

  // For batch tracking, weight represents average weight per animal
  if (data.trackingType === 'batch' && (!data.weight || data.weight <= 0)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['weight'],
      message: 'Average weight per animal is required for batch tracking'
    });
  }

  // Poultry batches should include hatch date (stored as dateOfBirth)
  if (data.species === 'poultry' && data.trackingType === 'batch' && (!data.dateOfBirth || !data.dateOfBirth.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['dateOfBirth'],
      message: 'Hatch date is required for poultry batches'
    });
  }

  // Tag/ID is required only for specific species when tracking individually
  const tagRequired = data.trackingType === 'individual' && TAG_REQUIRED_SPECIES.includes(data.species);
  if (tagRequired && (!data.tagId || !data.tagId.trim())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['tagId'],
      message: 'Tag/ID Number is required for this animal'
    });
  }

  // Purchase requires purchase amount
  if (data.acquisitionMethod === 'purchase' && (data.acquisitionCost == null || Number.isNaN(Number(data.acquisitionCost)))) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['acquisitionCost'],
      message: 'Purchase amount is required when acquisition method is Purchase'
    });
  }
});

const AddLivestockModal = ({ isOpen, onClose, farmId }) => {
  const queryClient = useQueryClient();
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [imageFile, setImageFile] = React.useState(null);
  const [error, setError] = React.useState('');

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm({
    resolver: zodResolver(livestockSchema),
    defaultValues: {
      species: '',
      trackingType: 'individual',
      acquisitionMethod: 'purchase',
      acquisitionDate: new Date().toISOString().split('T')[0],
      gender: 'unknown'
    }
  });

  const selectedSpecies = watch('species');
  const trackingType = watch('trackingType');
  const acquisitionMethod = watch('acquisitionMethod');
  const tagIdRequired =
    trackingType === 'individual' && TAG_REQUIRED_SPECIES.includes(selectedSpecies);

  // Auto-set tracking type based on species
  React.useEffect(() => {
    const speciesConfig = SPECIES_OPTIONS.find(s => s.value === selectedSpecies);
    if (speciesConfig) {
      setValue('trackingType', speciesConfig.trackingDefault);
    }
  }, [selectedSpecies, setValue]);

  // If acquisition method isn't purchase, clear purchase amount
  React.useEffect(() => {
    if (acquisitionMethod !== 'purchase') {
      setValue('acquisitionCost', undefined);
    }
  }, [acquisitionMethod, setValue]);

  React.useEffect(() => {
    if (isOpen) {
      reset({
        species: '',
        trackingType: 'individual',
        acquisitionMethod: 'purchase',
        acquisitionDate: new Date().toISOString().split('T')[0],
        gender: 'unknown'
      });
      setPreviewUrl(null);
      setImageFile(null);
      setError('');
    }
  }, [isOpen, reset]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const createMutation = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      const metadata = { ...data, farmId };
      formData.append('metadata', JSON.stringify(metadata));
      if (imageFile) {
        formData.append('image', imageFile);
      }
      return api.post('/livestock', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['livestock', farmId]);
      queryClient.invalidateQueries(['livestock-stats', farmId]);
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to add livestock');
    }
  });

  const onSubmit = (data) => {
    setError('');
    createMutation.mutate(data);
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Add Livestock"
      size="lg"
      icon={
        <div className="bg-primary/10 p-2 rounded-xl">
          <PawPrint className="h-6 w-6 text-primary" aria-hidden="true" />
        </div>
      }
      footer={
        <>
          <Button type="button" variant="outline" className="flex-1 rounded-xl h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSubmit(onSubmit)}
            loading={createMutation.isPending}
            className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20"
          >
            {createMutation.isPending ? (
              'Adding...'
            ) : (
              <>
                <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
                Add Livestock
              </>
            )}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        {error && (
          <div role="alert" className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm font-medium border border-destructive/20 flex items-center gap-3">
            <Info className="h-5 w-5 shrink-0" aria-hidden="true" />
            {error}
          </div>
        )}

            {/* Species Selection */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-foreground">Select Species *</label>
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {SPECIES_OPTIONS.map((species) => {
                  const Icon = species.icon;
                  const isSelected = selectedSpecies === species.value;
                  return (
                    <button
                      key={species.value}
                      type="button"
                      onClick={() => setValue('species', species.value)}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-2xl border-2 transition-all flex flex-col items-center gap-2 ${
                        isSelected
                          ? 'border-primary bg-primary/10 text-primary'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <Icon className={`h-8 w-8 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                      <span className="text-xs font-bold">{species.label}</span>
                    </button>
                  );
                })}
              </div>
              {errors.species && (
                <p role="alert" className="text-xs text-destructive font-medium">{errors.species.message}</p>
              )}
            </div>

            {/* Tracking Type */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-foreground">Tracking Type</label>
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => setValue('trackingType', 'individual')}
                  aria-pressed={trackingType === 'individual'}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    trackingType === 'individual'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <h4 className="font-bold text-foreground">Individual</h4>
                  <p className="text-xs text-muted-foreground mt-1">Track a single animal with unique ID</p>
                </button>
                <button
                  type="button"
                  onClick={() => setValue('trackingType', 'batch')}
                  aria-pressed={trackingType === 'batch'}
                  className={`flex-1 p-4 rounded-xl border-2 transition-all ${
                    trackingType === 'batch'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  }`}
                >
                  <h4 className="font-bold text-foreground">Batch</h4>
                  <p className="text-xs text-muted-foreground mt-1">Track a group (e.g., 50 chickens)</p>
                </button>
              </div>
            </div>

            {/* Basic Info */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Basic Information</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                {trackingType === 'individual' ? (
                  <>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-foreground">
                        Tag/ID Number{tagIdRequired ? ' *' : ''}
                      </label>
                      <Input
                        placeholder="e.g., EAR-001"
                        {...register('tagId')}
                        className={errors.tagId ? 'border-destructive' : ''}
                      />
                      {errors.tagId && (
                        <p role="alert" className="text-xs text-destructive font-medium">{errors.tagId.message}</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Quantity *</label>
                    <Input 
                      type="number" 
                      min="1" 
                      placeholder="e.g., 50" 
                      {...register('quantity')} 
                      className={errors.quantity ? 'border-destructive' : ''}
                    />
                    {errors.quantity && (
                      <p role="alert" className="text-xs text-destructive">{errors.quantity.message}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Breed</label>
                  <Input placeholder="e.g., Holstein, Angus" {...register('breed')} />
                </div>

                {trackingType === 'individual' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Gender</label>
                    <select
                      className="w-full h-11 px-3 bg-background border border-border rounded-lg text-base sm:text-sm"
                      {...register('gender')}
                    >
                      <option value="unknown">Unknown</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                    </select>
                  </div>
                )}

                {/* Poultry Type */}
                {selectedSpecies === 'poultry' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Poultry Type *</label>
                    <select
                      className={`w-full h-11 px-3 bg-background border rounded-lg text-base sm:text-sm ${
                        errors.poultryType ? 'border-destructive' : 'border-border'
                      }`}
                      {...register('poultryType')}
                    >
                      <option value="">Select type...</option>
                      {POULTRY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </option>
                      ))}
                    </select>
                    {errors.poultryType && (
                      <p role="alert" className="text-xs text-destructive font-medium">{errors.poultryType.message}</p>
                    )}
                  </div>
                )}

                {/* Fish Type */}
                {selectedSpecies === 'fish' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">Fish Type</label>
                    <select
                      className="w-full h-11 px-3 bg-background border border-border rounded-lg text-base sm:text-sm"
                      {...register('fishType')}
                    >
                      <option value="">Select type...</option>
                      {FISH_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* Acquisition Details */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Acquisition Details</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Acquisition Date *</label>
                  <Input 
                    type="date" 
                    {...register('acquisitionDate')} 
                    className={errors.acquisitionDate ? 'border-destructive' : ''}
                  />
                  {errors.acquisitionDate && (
                    <p role="alert" className="text-xs text-destructive">{errors.acquisitionDate.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">How Acquired</label>
                  <select
                    className="w-full h-11 px-3 bg-background border border-border rounded-lg text-base sm:text-sm"
                    {...register('acquisitionMethod')}
                  >
                    {ACQUISITION_METHODS.map((method) => (
                      <option key={method} value={method}>
                        {method.charAt(0).toUpperCase() + method.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                {acquisitionMethod === 'purchase' && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      Purchase Amount (₦) *
                    </label>
                    <Input
                      type="number"
                      min="0"
                      placeholder="0"
                      {...register('acquisitionCost')}
                      className={errors.acquisitionCost ? 'border-destructive' : ''}
                    />
                    <p className="text-xs text-muted-foreground">
                      {trackingType === 'batch'
                        ? 'Total amount paid for the whole batch.'
                        : 'Amount paid for the animal.'}
                    </p>
                    {errors.acquisitionCost && (
                      <p role="alert" className="text-xs text-destructive font-medium">{errors.acquisitionCost.message}</p>
                    )}
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Estimated Selling Value (₦) *</label>
                  <Input
                    type="number"
                    min="0"
                    placeholder="0"
                    {...register('cost')}
                    className={errors.cost ? 'border-destructive' : ''}
                  />
                  <p className="text-xs text-muted-foreground">
                    {trackingType === 'batch'
                      ? 'Total expected selling value for the whole batch.'
                      : 'Expected selling value for the animal.'}
                  </p>
                  {errors.cost && (
                    <p role="alert" className="text-xs text-destructive font-medium">{errors.cost.message}</p>
                  )}
                </div>

                {(trackingType === 'individual' || (selectedSpecies === 'poultry' && trackingType === 'batch')) && (
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-foreground">
                      {selectedSpecies === 'poultry' && trackingType === 'batch' ? 'Hatch Date *' : 'Date of Birth'}
                    </label>
                    <Input
                      type="date"
                      {...register('dateOfBirth')}
                      className={errors.dateOfBirth ? 'border-destructive' : ''}
                    />
                    {errors.dateOfBirth && (
                      <p role="alert" className="text-xs text-destructive font-medium">{errors.dateOfBirth.message}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Physical Attributes */}
            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Physical Attributes</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">
                    {trackingType === 'batch'
                      ? (selectedSpecies === 'poultry'
                        ? 'Average Weight per Bird (kg) *'
                        : 'Average Weight per Animal (kg) *')
                      : 'Weight (kg)'}
                  </label>
                  <Input 
                    type="number" 
                    step="0.1" 
                    min="0" 
                    placeholder={trackingType === 'batch' ? 'e.g., 1.8' : 'e.g., 350'}
                    {...register('weight')} 
                    className={errors.weight ? 'border-destructive' : ''}
                  />
                  {trackingType === 'batch' && (
                    <p className="text-xs text-muted-foreground">
                      Enter the average live weight of one {selectedSpecies === 'poultry' ? 'bird' : 'animal'} in this batch.
                    </p>
                  )}
                  {errors.weight && (
                    <p role="alert" className="text-xs text-destructive font-medium">{errors.weight.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Color/Markings</label>
                  <Input placeholder="e.g., Black and white" {...register('color')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-foreground">Housing Unit</label>
                  <Input placeholder="e.g., Pen A, Coop 1" {...register('housingUnit')} />
                </div>
              </div>
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <label className="text-sm font-bold text-foreground">Photo</label>
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload livestock photo"
                className="relative h-48 rounded-2xl border-2 border-dashed border-border hover:border-primary/50 transition-colors bg-muted flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                onClick={() => document.getElementById('livestock-image').click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('livestock-image').click();
                  }
                }}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100">
                      <p className="text-white font-bold">Change Image</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-card p-3 rounded-full shadow-sm mb-2">
                      <Upload className="h-6 w-6 text-primary" aria-hidden="true" />
                    </div>
                    <p className="text-sm text-muted-foreground font-medium">Click to upload photo</p>
                  </>
                )}
                <input
                  id="livestock-image"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleImageChange}
                />
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-foreground">Notes</label>
              <textarea
                className="w-full min-h-[80px] bg-background border border-border rounded-lg p-3 text-base sm:text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Any additional notes..."
                {...register('notes')}
              />
            </div>
          </form>
    </ModalShell>
  );
};

export default AddLivestockModal;
