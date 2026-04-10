import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { X, Loader2, Info, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../lib/axios';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const SOIL_TYPES = ["clay", "sandy", "loamy", "silty", "peaty", "laterite", "clay-loam", "sandy-loam"];

const farmSchema = z.object({
  name: z.string().min(2, 'Farm name must be at least 2 characters').max(100),
  size: z.coerce.number().positive('Farm size must be a positive number'),
  sizeUnit: z.enum(['acres', 'hectares']),
  location: z.object({
    address: z.string().min(1, 'Address is required'),
    city: z.string().min(1, 'City is required'),
    state: z.string().min(1, 'State is required'),
    country: z.string().min(1, 'Country is required'),
    coordinates: z
      .object({
        latitude: z.coerce.number().optional(),
        longitude: z.coerce.number().optional(),
      })
      .optional(),
  }),
  description: z.string().max(500).optional(),
  irrigationType: z.enum(['drip', 'sprinkler', 'flood', 'rainfed', 'none']),
  soilType: z.array(z.string()).min(1, 'At least one soil type is required'),
  establishedDate: z.string().optional(),
});

const toDateInputValue = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

export default function EditFarmModal({ isOpen, onClose, farm }) {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState('');

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(farmSchema),
    defaultValues: {
      name: '',
      size: '',
      sizeUnit: 'acres',
      irrigationType: 'none',
      soilType: [],
      description: '',
      location: {
        address: '',
        city: '',
        state: '',
        country: 'Nigeria',
        coordinates: {
          latitude: '',
          longitude: '',
        },
      },
      establishedDate: '',
    },
  });

  const selectedSoils = watch('soilType');

  const toggleSoil = (type) => {
    const current = Array.isArray(selectedSoils) ? [...selectedSoils] : [];
    const index = current.indexOf(type);
    if (index > -1) current.splice(index, 1);
    else current.push(type);
    setValue('soilType', current, { shouldValidate: true });
  };

  React.useEffect(() => {
    if (!isOpen) return;
    setError('');

    const coords = farm?.location?.coordinates;
    reset({
      name: farm?.name || '',
      size: farm?.size ?? '',
      sizeUnit: farm?.sizeUnit || 'acres',
      irrigationType: farm?.irrigationType || 'none',
      soilType: farm?.soilType || [],
      description: farm?.description || '',
      location: {
        address: farm?.location?.address || '',
        city: farm?.location?.city || '',
        state: farm?.location?.state || '',
        country: farm?.location?.country || 'Nigeria',
        coordinates: {
          latitude: coords?.latitude ?? '',
          longitude: coords?.longitude ?? '',
        },
      },
      establishedDate: toDateInputValue(farm?.establishedDate),
    });
  }, [isOpen, farm, reset]);

  const onSubmit = async (data) => {
    if (!farm?._id) return;
    setIsLoading(true);
    setError('');

    // Backend updateFarmSchema expects coordinates either omitted or full numbers.
    // If only one of lat/lon is present, omit coordinates to avoid validation issues.
    const lat = data?.location?.coordinates?.latitude;
    const lon = data?.location?.coordinates?.longitude;
    const coordinates =
      typeof lat === 'number' && !Number.isNaN(lat) && typeof lon === 'number' && !Number.isNaN(lon)
        ? { latitude: lat, longitude: lon }
        : undefined;

    const payload = {
      name: data.name,
      size: data.size,
      sizeUnit: data.sizeUnit,
      description: data.description || '',
      irrigationType: data.irrigationType,
      soilType: data.soilType,
      location: {
        address: data.location.address,
        city: data.location.city,
        state: data.location.state,
        country: data.location.country,
        ...(coordinates ? { coordinates } : {}),
      },
      establishedDate: data.establishedDate || undefined,
    };

    try {
      await api.put(`/farms/${farm._id}`, payload);
      queryClient.invalidateQueries(['farm', farm._id]);
      queryClient.invalidateQueries(['farms']);
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update farm profile.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white rounded-3xl w-full max-w-2xl my-auto shadow-2xl animate-in fade-in zoom-in duration-200 flex flex-col max-h-[90vh]">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex justify-between items-center z-10 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Check className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Edit Farm Profile</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                <Info className="h-5 w-5 shrink-0" />
                {error}
              </div>
            )}

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Basic Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Farm Name</label>
                  <Input placeholder="e.g. Sunshine Acres" {...register('name')} className={errors.name ? 'border-red-500' : ''} />
                  {errors.name && <p className="text-xs text-red-500 font-medium">{errors.name.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Established Date</label>
                  <Input type="date" {...register('establishedDate')} />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Size</label>
                  <div className="flex gap-2">
                    <Input type="number" step="0.1" placeholder="50" {...register('size')} className={errors.size ? 'border-red-500' : ''} />
                    <select
                      className="bg-gray-50 border border-gray-200 rounded-lg px-3 text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
                      {...register('sizeUnit')}
                    >
                      <option value="acres">Acres</option>
                      <option value="hectares">Hectares</option>
                    </select>
                  </div>
                  {errors.size && <p className="text-xs text-red-500 font-medium">{errors.size.message}</p>}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Irrigation Type</label>
                  <select
                    className="w-full h-10 bg-white border border-input rounded-md px-3 py-2 text-sm focus:ring-2 focus:ring-primary outline-none"
                    {...register('irrigationType')}
                  >
                    {['drip', 'sprinkler', 'flood', 'rainfed', 'none'].map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <label className="text-sm font-bold text-gray-700">Soil Types (Select all that apply)</label>
              <div className="flex flex-wrap gap-2">
                {SOIL_TYPES.map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => toggleSoil(type)}
                    className={`px-4 py-2 rounded-full text-xs font-bold transition-all border ${
                      selectedSoils?.includes(type)
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {selectedSoils?.includes(type) && <Check className="h-3 w-3" />}
                      {type}
                    </div>
                  </button>
                ))}
              </div>
              {errors.soilType && <p className="text-xs text-red-500 font-medium">{errors.soilType.message}</p>}
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Location</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2 md:col-span-2">
                  <label className="text-sm font-bold text-gray-700">Address</label>
                  <Input placeholder="Farm address" {...register('location.address')} />
                  {errors.location?.address && <p className="text-xs text-red-500 font-medium">{errors.location.address.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">City</label>
                  <Input placeholder="City" {...register('location.city')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">State</label>
                  <Input placeholder="State" {...register('location.state')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Country</label>
                  <Input placeholder="Country" {...register('location.country')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Latitude (optional)</label>
                  <Input type="number" step="0.000001" placeholder="" {...register('location.coordinates.latitude')} />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Longitude (optional)</label>
                  <Input type="number" step="0.000001" placeholder="" {...register('location.coordinates.longitude')} />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-700">Description</label>
              <textarea
                className="w-full min-h-[96px] border border-gray-200 rounded-xl p-3 text-sm focus:ring-2 focus:ring-primary outline-none"
                placeholder="Short description"
                {...register('description')}
              />
              {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={onClose} className="rounded-xl">
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading} className="rounded-xl font-black h-11 px-6">
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Saving...
                  </span>
                ) : (
                  'Save changes'
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
