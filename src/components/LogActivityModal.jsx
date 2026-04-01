import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X,
  Zap,
  Loader2,
  Calendar,
  Layers,
  MapPin,
  Check,
  ChevronDown,
  Info,
  Camera,
  Sprout,
  Scaling
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const LogActivityModal = ({ isOpen, onClose, farmId, farm }) => {
  const queryClient = useQueryClient();
  const [step, setStep] = React.useState(1);
  const [formData, setFormData] = React.useState({
    practiceId: '',
    cropId: '',
    cropSeasonId: '',
    soilType: '',
    size: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [imageFile, setImageFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);

  // Fetch Practices
  const { data: practices } = useQuery({
    queryKey: ['practices'],
    queryFn: async () => {
      const response = await api.get('/practices');
      return response.data.data;
    }
  });

  // Fetch Farm Crops
  const { data: crops } = useQuery({
    queryKey: ['farm-crops', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/crops`);
      return response.data.data;
    },
    enabled: !!farmId
  });

  // Fetch Active Seasons
  const { data: seasons } = useQuery({
    queryKey: ['farm-seasons', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/seasons`);
      return response.data.data?.filter(s => s.status === 'active');
    },
    enabled: !!farmId
  });

  const logActivityMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Submitting activity log:", data);
      const form = new FormData();
      Object.entries(data).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
            form.append(key, value);
        }
      });
      if (imageFile) form.append('image', imageFile);
      
      return await api.post('/practices/activities', form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm-activities', farmId]);
      queryClient.invalidateQueries(['carbon-credits']);
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setStep(1);
    setFormData({
      practiceId: '',
      cropId: '',
      cropSeasonId: '',
      soilType: '',
      size: '',
      startDate: new Date().toISOString().split('T')[0],
      endDate: '',
      notes: ''
    });
    setImageFile(null);
    setPreviewUrl(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleNext = () => setStep(prev => prev + 1);
  const handleBack = () => setStep(prev => prev - 1);

  const handleSubmit = () => {
    if (!formData.endDate) {
        console.error("End date is required by the engine.");
        return;
    }
    
    const submissionData = {
        ...formData,
        farmId,
        size: Number(formData.size),
        sizeUnit: farm?.sizeUnit || 'acres'
    };
    logActivityMutation.mutate(submissionData);
  };

  if (!isOpen) return null;

  //const selectedPractice = practices?.find(p => p._id === formData.practiceId);

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Log Activity</h2>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
                Step {step} of 3: {step === 1 ? 'Methodology' : step === 2 ? 'Context' : 'Evidence'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {logActivityMutation.isError && (
            <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {logActivityMutation.error?.response?.data?.message || "Verification failed. Check your data."}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">Select Practice Type</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {practices?.map((practice) => (
                    <button
                      key={practice._id}
                      onClick={() => setFormData({ ...formData, practiceId: practice._id })}
                      className={`p-4 rounded-2xl text-left border-2 transition-all ${
                        formData.practiceId === practice._id
                          ? 'bg-indigo-50 border-indigo-600 shadow-md'
                          : 'bg-white border-gray-100 hover:border-indigo-200'
                      }`}
                    >
                      <p className={`font-black uppercase text-[10px] mb-1 ${formData.practiceId === practice._id ? 'text-indigo-600' : 'text-gray-400'}`}>
                        {practice.category}
                      </p>
                      <p className="font-bold text-gray-900">{practice.name}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Start Date</label>
                  <Input 
                    type="date" 
                    value={formData.startDate} 
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">End Date (Actual/Projected)</label>
                  <Input 
                    type="date" 
                    value={formData.endDate} 
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="h-12 rounded-xl"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Target Crop</label>
                  <select 
                    value={formData.cropId} 
                    onChange={(e) => setFormData({ ...formData, cropId: e.target.value })}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="">Select a crop...</option>
                    {crops?.map(crop => (
                      <option key={crop._id} value={crop._id}>{crop.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Soil Segment</label>
                  <select 
                    value={formData.soilType} 
                    onChange={(e) => setFormData({ ...formData, soilType: e.target.value })}
                    className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                  >
                    <option value="">Choose soil type...</option>
                    {farm?.soilType?.map(type => (
                      <option key={type} value={type}>{type.toUpperCase()}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Active Crop Season (Optional)</label>
                <select 
                  value={formData.cropSeasonId} 
                  onChange={(e) => setFormData({ ...formData, cropSeasonId: e.target.value })}
                  className="w-full h-12 bg-gray-50 border border-gray-100 rounded-xl px-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                >
                  <option value="">Not linked to a specific season</option>
                  {seasons?.map(season => (
                    <option key={season._id} value={season._id}>
                      {season.cropId?.name} - Planted {new Date(season.plantedDate).toLocaleDateString()} ({season.area} {season.areaUnit})
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Activity Area ({farm?.sizeUnit})</label>
                <div className="relative">
                  <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input 
                    type="number" 
                    placeholder={`Max ${farm?.size} ${farm?.sizeUnit}`}
                    value={formData.size}
                    onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                    className="h-12 pl-12 rounded-xl font-bold"
                  />
                </div>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
               <div 
                className="relative h-64 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
                onClick={() => document.getElementById('evidence-upload').click()}
              >
                {previewUrl ? (
                  <img src={previewUrl} alt="Evidence" className="w-full h-full object-cover" />
                ) : (
                  <div className="text-center">
                    <div className="bg-white p-4 rounded-full shadow-sm mb-4 inline-block group-hover:scale-110 transition-transform">
                      <Camera className="h-8 w-8 text-indigo-600" />
                    </div>
                    <p className="text-sm text-gray-500 font-bold">Upload Field Evidence</p>
                    <p className="text-xs text-gray-400 mt-1">Photo required for carbon verification</p>
                  </div>
                )}
                <input id="evidence-upload" type="file" className="hidden" accept="image/*" onChange={handleImageChange} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Notes / Observations</label>
                <textarea 
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Describe the application process or field conditions..."
                  className="w-full min-h-[100px] bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
                />
              </div>

              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex gap-3">
                <Info className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-xs font-bold text-amber-900 leading-relaxed">
                  Logging this activity will trigger the AI Verification Engine and initiate carbon sequestration calculations for your credits.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-4">
          {step > 1 ? (
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs" onClick={handleBack}>
              Back
            </Button>
          ) : (
            <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase text-xs" onClick={onClose}>
              Discard
            </Button>
          )}

          {step < 3 ? (
            <Button 
              disabled={step === 1 ? !formData.practiceId || !formData.startDate || !formData.endDate : !formData.cropId || !formData.soilType || !formData.size}
              onClick={handleNext} 
              className="flex-1 h-14 rounded-2xl font-black uppercase text-xs bg-indigo-600 shadow-xl shadow-indigo-200"
            >
              Continue
            </Button>
          ) : (
            <Button 
              disabled={!imageFile || logActivityMutation.isPending}
              onClick={handleSubmit}
              className="flex-1 h-14 rounded-2xl font-black uppercase text-xs bg-indigo-600 shadow-xl shadow-indigo-200"
            >
              {logActivityMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Log & Verify Activity'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogActivityModal;
