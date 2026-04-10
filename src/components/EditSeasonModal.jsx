import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Calendar, Loader2, Scaling, AlertCircle, Edit2 } from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const EditSeasonModal = ({ isOpen, onClose, farmId, farm, season, maxArea }) => {
  const queryClient = useQueryClient();

  const [formData, setFormData] = React.useState({
    plantedDate: '',
    area: '',
    status: 'active',
  });

  React.useEffect(() => {
    if (!isOpen || !season) return;
    setFormData({
      plantedDate: season.plantedDate ? new Date(season.plantedDate).toISOString().split('T')[0] : '',
      area: season.area != null ? String(season.area) : '',
      status: season.status || 'active',
    });
  }, [isOpen, season]);

  const updateSeasonMutation = useMutation({
    mutationFn: async (data) => {
      return await api.patch(`/practices/farms/${farmId}/seasons/${season._id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm-seasons', farmId]);
      onClose();
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!season) return;

    const payload = {
      plantedDate: formData.plantedDate || undefined,
      area: formData.area !== '' ? Number(formData.area) : undefined,
      status: formData.status || undefined,
    };

    updateSeasonMutation.mutate(payload);
  };

  if (!isOpen || !season) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-lg shadow-2xl overflow-hidden flex flex-col">
        <div className="p-8 bg-blue-600 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Edit2 className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Edit Season</h2>
              <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1">
                {season.cropId?.name || 'Crop Season'}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {updateSeasonMutation.isError && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-bold border border-red-100 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              {updateSeasonMutation.error?.response?.data?.message || 'Failed to update season'}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Planting Date</label>
              <div className="relative">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="date"
                  value={formData.plantedDate}
                  onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 font-bold"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Area ({farm?.sizeUnit})</label>
              <div className="relative">
                <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  type="number"
                  placeholder={maxArea != null ? `Max ${maxArea}` : ''}
                  value={formData.area}
                  onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                  className="h-14 pl-12 rounded-2xl bg-gray-50 border-gray-100 font-bold"
                />
              </div>
              {maxArea != null && (
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest ml-2">
                  Remaining available: {maxArea} {farm?.sizeUnit}
                </p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-14 bg-gray-50 border border-gray-100 rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none"
            >
              <option value="active">Active</option>
              <option value="harvested">Harvested</option>
              <option value="failed">Failed</option>
            </select>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" onClick={onClose} variant="outline" className="flex-1 h-14 rounded-2xl font-black">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={updateSeasonMutation.isPending}
              className="flex-1 h-14 rounded-2xl font-black bg-blue-600 shadow-xl shadow-blue-100"
            >
              {updateSeasonMutation.isPending ? <Loader2 className="animate-spin h-5 w-5" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default EditSeasonModal;
