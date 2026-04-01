import React from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { 
  X,
  Upload,
  Loader2,
  MapPin,
  Info,
  Plus,
  Check
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const SOIL_TYPES = ["clay", "sandy", "loamy", "silty", "peaty", "laterite", "clay-loam", "sandy-loam"];

const farmSchema = z.object({
  name: z.string().min(2, "Farm name must be at least 2 characters").max(100),
  size: z.coerce.number().positive("Farm size must be a positive number"),
  sizeUnit: z.enum(["acres", "hectares"]),
  location: z.object({
    address: z.string().min(1, "Address is required"),
    city: z.string().min(1, "City is required"),
    state: z.string().min(1, "State is required"),
    country: z.string().min(1, "Country is required"),
    coordinates: z.object({
      latitude: z.coerce.string().optional().transform(v => v ? parseFloat(v) : undefined),
      longitude: z.coerce.string().optional().transform(v => v ? parseFloat(v) : undefined),
    }).optional()
  }),
  description: z.string().max(500).optional(),
  irrigationType: z.enum(["drip", "sprinkler", "flood", "rainfed", "none"]),
  soilType: z.array(z.string()).min(1, "At least one soil type is required"),
  establishedDate: z.string().optional(),
});

const CreateFarmModal = ({ isOpen, onClose }) => {
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = React.useState(false);
  const [isDetectingLocation, setIsDetectingLocation] = React.useState(false);
  const [locationError, setLocationError] = React.useState('');
  const [error, setError] = React.useState('');
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [imageFile, setImageFile] = React.useState(null);

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
        }
      },
      establishedDate: ''
    }
  });

  const selectedSoils = watch('soilType');

  const toggleSoil = (type) => {
    const current = [...selectedSoils];
    const index = current.indexOf(type);
    if (index > -1) current.splice(index, 1);
    else current.push(type);
    setValue('soilType', current, { shouldValidate: true });
  };

  const handleGetLocation = React.useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser');
      return;
    }

    setIsDetectingLocation(true);
    setLocationError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setValue('location.coordinates.latitude', position.coords.latitude.toString());
        setValue('location.coordinates.longitude', position.coords.longitude.toString());
        setIsDetectingLocation(false);
      },
      (error) => {
        let message = 'Failed to get location';
        if (error.code === 1) message = 'Location permission denied';
        else if (error.code === 2) message = 'Location unavailable';
        else if (error.code === 3) message = 'Location request timed out';
        
        setLocationError(message);
        setIsDetectingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0
      }
    );
  }, [setValue]);

  React.useEffect(() => {
    if (isOpen) {
      reset();
      setPreviewUrl(null);
      setImageFile(null);
      setError('');
      setLocationError('');
      handleGetLocation();
    }
  }, [isOpen, reset, handleGetLocation]);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');

    const formData = new FormData();
    
    const metadata = {
      name: data.name,
      size: data.size,
      sizeUnit: data.sizeUnit,
      description: data.description || '',
      irrigationType: data.irrigationType,
      soilType: data.soilType,
      location: data.location,
      establishedDate: data.establishedDate
    };

    formData.append('metadata', JSON.stringify(metadata));

    if (imageFile) formData.append('image', imageFile);

    try {
      await api.post('/farms', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      queryClient.invalidateQueries(['farms']);
      onClose();
    } catch (err) {
      console.error('Farm creation error:', err);
      setError(err.response?.data?.message || 'Failed to create farm. Please check your inputs.');
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
              <Plus className="h-6 w-6 text-primary" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Add New Farm</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <form onSubmit={handleSubmit(onSubmit)} className="p-8 space-y-8">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100 flex items-center gap-3">
                <Info className="h-5 w-5 flex-shrink-0" />
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
                    {["drip", "sprinkler", "flood", "rainfed", "none"].map(type => (
                      <option key={type} value={type}>{type.charAt(0).toUpperCase() + type.slice(1)}</option>
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
                      selectedSoils.includes(type)
                        ? 'bg-primary text-white border-primary shadow-md'
                        : 'bg-white text-gray-500 border-gray-200 hover:border-primary/50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5">
                      {selectedSoils.includes(type) && <Check className="h-3 w-3" />}
                      {type.replace('-', ' ').toUpperCase()}
                    </div>
                  </button>
                ))}
              </div>
              {errors.soilType && <p className="text-xs text-red-500 font-medium">{errors.soilType.message}</p>}
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Location Details</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2 space-y-2">
                  <label className="text-sm font-bold text-gray-700">Address</label>
                  <Input placeholder="Street name, landmark..." {...register('location.address')} className={errors.location?.address ? 'border-red-500' : ''} />
                  {errors.location?.address && <p className="text-xs text-red-500 font-medium">{errors.location.address.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">City</label>
                  <Input placeholder="Lagos" {...register('location.city')} className={errors.location?.city ? 'border-red-500' : ''} />
                  {errors.location?.city && <p className="text-xs text-red-500 font-medium">{errors.location.city.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">State/Province</label>
                  <Input placeholder="Lagos State" {...register('location.state')} className={errors.location?.state ? 'border-red-500' : ''} />
                  {errors.location?.state && <p className="text-xs text-red-500 font-medium">{errors.location.state.message}</p>}
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700">Country</label>
                  <Input placeholder="Nigeria" {...register('location.country')} className={errors.location?.country ? 'border-red-500' : ''} />
                  {errors.location?.country && <p className="text-xs text-red-500 font-medium">{errors.location.country.message}</p>}
                </div>
              </div>
              
              <div className="bg-blue-50/50 p-4 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-blue-700 font-bold text-sm">
                    <MapPin className="h-4 w-4" />
                    Coordinates (Recommended for precision)
                  </div>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleGetLocation}
                    disabled={isDetectingLocation}
                    className="text-blue-600 hover:text-blue-700 hover:bg-blue-100/50 h-8 px-2"
                  >
                    {isDetectingLocation ? (
                      <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    ) : (
                      <Plus className="h-3 w-3 mr-1" />
                    )}
                    {isDetectingLocation ? 'Detecting...' : 'Refresh Location'}
                  </Button>
                </div>

                {locationError && (
                  <p className="text-[10px] text-amber-600 font-medium bg-amber-50 p-2 rounded-lg border border-amber-100">
                    {locationError}. You can enter coordinates manually.
                  </p>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-600 uppercase">Latitude</label>
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder="6.5244" 
                      {...register('location.coordinates.latitude')} 
                      className="bg-white/50"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-blue-600 uppercase">Longitude</label>
                    <Input 
                      type="number" 
                      step="any" 
                      placeholder="3.3792" 
                      {...register('location.coordinates.longitude')} 
                      className="bg-white/50"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-bold text-primary uppercase tracking-wider">Media & Description</h3>
              <div 
                className="relative h-48 rounded-2xl border-2 border-dashed border-gray-200 hover:border-primary/50 transition-colors bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                onClick={() => document.getElementById('farm-image-v3').click()}
              >
                {previewUrl ? (
                  <>
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <p className="text-white font-bold">Change Image</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white p-3 rounded-full shadow-sm mb-2 group-hover:scale-110 transition-transform">
                      <Upload className="h-6 w-6 text-primary" />
                    </div>
                    <p className="text-sm text-gray-500 font-medium">Click to upload farm photo</p>
                    <p className="text-xs text-gray-400 mt-1 text-center px-4">Highly recommended for visual identification</p>
                  </>
                )}
                <input 
                  id="farm-image-v3" 
                  type="file" 
                  className="hidden" 
                  accept="image/*" 
                  onChange={handleImageChange} 
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea 
                  className="w-full min-h-[100px] bg-white border border-gray-200 rounded-lg p-3 text-sm focus:ring-2 focus:ring-primary outline-none transition-all"
                  placeholder="Share any additional details about your farm's history or special practices..."
                  {...register('description')}
                />
                {errors.description && <p className="text-xs text-red-500 font-medium">{errors.description.message}</p>}
              </div>
            </div>
          </form>
        </div>

        <div className="p-8 border-t border-gray-100 flex gap-4 bg-gray-50/50 rounded-b-3xl">
          <Button type="button" variant="outline" className="flex-1 rounded-xl h-12" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            type="submit" 
            onClick={handleSubmit(onSubmit)}
            className="flex-1 rounded-xl h-12 font-bold shadow-lg shadow-primary/20" 
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="animate-spin mr-2 h-5 w-5" />
                Registering...
              </>
            ) : 'Register Farm'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CreateFarmModal;
