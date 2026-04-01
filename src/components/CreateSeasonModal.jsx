import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X,
  Calendar,
  Loader2,
  Sprout,
  Scaling,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const CreateSeasonModal = ({ isOpen, onClose, farmId, farm }) => {
  const queryClient = useQueryClient();
  const [formData, setFormData] = React.useState({
    cropId: '',
    plantedDate: new Date().toISOString().split('T')[0],
    area: '',
    areaUnit: farm?.sizeUnit || 'acres'
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

  const createSeasonMutation = useMutation({
    mutationFn: async (data) => {
      console.log("Creating season with data:", data);
      return await api.post(`/practices/farms/${farmId}/seasons`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm-seasons', farmId]);
      onClose();
      setFormData({
        cropId: '',
        plantedDate: new Date().toISOString().split('T')[0],
        area: '',
        areaUnit: farm?.sizeUnit || 'acres'
      });
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log("Handle submit called. FormData:", formData);
    if (!formData.cropId || !formData.area) {
        console.warn("Validation failed: cropId or area missing");
        return;
    }
    
    // Convert area to number for backend validation
    const submissionData = {
        ...formData,
        area: Number(formData.area)
    };
    
    createSeasonMutation.mutate(submissionData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-8 bg-green-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Calendar className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Initiate Season</h2>
              <p className="text-green-100 text-xs font-bold uppercase tracking-widest mt-1">Timeline Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {createSeasonMutation.isError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {createSeasonMutation.error?.response?.data?.message || "Failed to initiate season"}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Select Registered Crop</label>
            <div className="relative">
                <Sprout className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <select 
                value={formData.cropId} 
                onChange={(e) => setFormData({ ...formData, cropId: e.target.value })}
                className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-green-600 outline-none appearance-none"
                >
                <option value="">Choose from inventory...</option>
                {crops?.map(crop => (
                    <option key={crop._id} value={crop._id}>{crop.name} ({crop.category})</option>
                ))}
                </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Planting Date</label>
              <Input 
                type="date" 
                value={formData.plantedDate}
                onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
                className="h-14 rounded-2xl bg-gray-50 border-gray-100 font-bold"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Area to Plant ({farm?.sizeUnit})</label>
              <div className="relative">
                <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                  type="number" 
                  placeholder={`Max ${farm?.size}`}
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 font-bold"
                />
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
            <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs font-bold text-blue-900 leading-relaxed">
              Initiating a season allows you to log specific practices against this crop and enables AI health monitoring.
            </p>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1 h-14 rounded-2xl font-black">Cancel</Button>
            <Button 
              type="submit"
              disabled={!formData.cropId || !formData.area || createSeasonMutation.isPending}
              className="flex-1 h-14 rounded-2xl font-black bg-green-600 shadow-xl shadow-green-100"
            >
              {createSeasonMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Confirm Season'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSeasonModal;
