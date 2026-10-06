import React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Calendar, Scaling, AlertCircle, Edit2 } from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from './ui/ModalShell';

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
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Edit Season"
      description={<span className="text-xs font-bold uppercase tracking-widest">{season.cropId?.name || 'Crop Season'}</span>}
      icon={
        <span className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
          <Edit2 className="h-6 w-6" aria-hidden="true" />
        </span>
      }
      size="md"
      headerClassName="bg-blue-600 text-white border-none"
      footer={
        <>
          <Button type="button" onClick={onClose} variant="outline" className="flex-1 h-14 rounded-2xl font-black">
            Cancel
          </Button>
          <Button
            type="submit"
            form="edit-season-form"
            loading={updateSeasonMutation.isPending}
            className="flex-1 h-14 rounded-2xl font-black bg-blue-600 shadow-xl shadow-blue-100"
          >
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-season-form" onSubmit={handleSubmit} className="space-y-6">
        {updateSeasonMutation.isError && (
          <div role="alert" className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm font-bold border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            {updateSeasonMutation.error?.response?.data?.message || 'Failed to update season'}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label htmlFor="edit-season-date" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Planting Date</label>
            <div className="relative">
              <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="edit-season-date"
                type="date"
                value={formData.plantedDate}
                onChange={(e) => setFormData({ ...formData, plantedDate: e.target.value })}
                className="h-14 pl-12 rounded-2xl bg-muted border-border font-bold"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="edit-season-area" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Area ({farm?.sizeUnit})</label>
            <div className="relative">
              <Scaling className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <Input
                id="edit-season-area"
                type="number"
                placeholder={maxArea != null ? `Max ${maxArea}` : ''}
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                className="h-14 pl-12 rounded-2xl bg-muted border-border font-bold"
              />
            </div>
            {maxArea != null && (
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest ml-2">
                Remaining available: {maxArea} {farm?.sizeUnit}
              </p>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="edit-season-status" className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">Status</label>
          <select
            id="edit-season-status"
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            className="w-full h-14 bg-muted border border-border rounded-2xl px-4 text-sm font-bold focus:ring-2 focus:ring-blue-600 outline-none"
          >
            <option value="active">Active</option>
            <option value="harvested">Harvested</option>
            <option value="failed">Failed</option>
          </select>
        </div>
      </form>
    </ModalShell>
  );
};

export default EditSeasonModal;
