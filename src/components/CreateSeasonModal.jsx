import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Calendar,
  Sprout,
  Scaling,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from './ui/ModalShell';

const CreateSeasonModal = ({ isOpen, onClose, farmId, farm, remainingArea, usedArea }) => {
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
    if (!formData.cropId || !formData.area) {
      return;
    }
    
    // Convert area to number for backend validation
    const submissionData = {
        ...formData,
        area: Number(formData.area)
    };
    
    createSeasonMutation.mutate(submissionData);
  };

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Initiate Season"
      description={<span className="text-xs font-bold uppercase tracking-widest">Timeline Management</span>}
      icon={
        <span className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
          <Calendar className="h-6 w-6" aria-hidden="true" />
        </span>
      }
      size="md"
      headerClassName="bg-green-600 text-white border-none"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="outline" className="flex-1 h-14 rounded-2xl font-black">
            Cancel
          </Button>
          <Button 
            type="submit"
            form="create-season-form"
            loading={createSeasonMutation.isPending}
            disabled={!formData.cropId || !formData.area}
            className="flex-1 h-14 rounded-2xl font-black bg-green-600 shadow-xl shadow-green-100"
          >
            Confirm Season
          </Button>
        </>
      }
    >
      <form id="create-season-form" onSubmit={handleSubmit} className="space-y-6">
        {createSeasonMutation.isError && (
          <div role="alert" className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm font-bold border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {createSeasonMutation.error?.response?.data?.message || "Failed to initiate season"}
          </div>
        )}

        <div className="space-y-2">
          <label htmlFor="create-season-crop" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Select Registered Crop</label>
          <div className="relative">
              <Sprout className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
              <select 
              id="create-season-crop"
              value={formData.cropId} 
              onChange={(e) => setFormData({ ...formData, cropId: e.target.value })}
              className="w-full h-14 bg-muted border border-border rounded-2xl pl-12 pr-4 text-sm font-bold focus:ring-2 focus:ring-green-600 outline-none appearance-none"
              >
              <option value="">Choose from inventory...</option>
              {crops?.map(crop => (
                  <option key={crop._id} value={crop._id}>{crop.name} ({crop.category})</option>
              ))}
              </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="create-season-date" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Planting Date</label>
            <Input 
              id="create-season-date"
              type="date" 
              value={formData.plantedDate}
              onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
              className="h-14 rounded-2xl bg-muted border-border font-bold"
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="create-season-area" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Area to Plant ({farm?.sizeUnit})</label>
            <div className="relative">
              <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input 
                id="create-season-area"
                type="number" 
                placeholder={remainingArea != null ? `Max ${remainingArea}` : `Max ${farm?.size}`}
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="h-14 pl-12 rounded-2xl bg-muted border-border font-bold"
              />
            </div>
            {remainingArea != null && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-2">
                Available: {remainingArea} {farm?.sizeUnit}{usedArea != null ? ` • In use: ${usedArea}` : ''}
              </p>
            )}
          </div>
        </div>

        <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 flex gap-3">
          <AlertCircle className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <p className="text-xs font-bold text-blue-900 leading-relaxed">
            Initiating a season allows you to log specific practices against this crop and enables AI health monitoring.
          </p>
        </div>
      </form>
    </ModalShell>
  );
};

export default CreateSeasonModal;
