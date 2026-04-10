import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { X, Camera, Loader2, FileText, AlertCircle, Info } from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';

const CompleteActivityModal = ({ isOpen, onClose, activity, farmId }) => {
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = React.useState(null);
  const [previewUrl, setPreviewUrl] = React.useState(null);
  const [notes, setNotes] = React.useState('');

  const reset = React.useCallback(() => {
    setImageFile(null);
    setPreviewUrl(null);
    setNotes('');
  }, []);

  React.useEffect(() => {
    if (!isOpen) reset();
  }, [isOpen, reset]);

  const practiceName = activity?.practiceId?.name || 'Practice';
  const status = activity?.status;
  const canComplete = status === 'active' || status === 'pending_start';

  const gate = activity?.completionEligibility || null;
  const gateMaturity = gate?.requiredMaturity || null;

  const seasonObj = activity?.cropSeasonId && typeof activity.cropSeasonId === 'object' ? activity.cropSeasonId : null;
  const plantedDate = seasonObj?.plantedDate ? new Date(seasonObj.plantedDate) : null;
  const cropName = activity?.cropId?.name;
  const category = activity?.cropId?.category;

  const { data: maturity } = useQuery({
    queryKey: ['crop-maturity', cropName, category],
    queryFn: async () => {
      if (!cropName) return null;
      const res = await api.get('/practices/reference/crops/maturity', { params: { name: cropName, category } });
      return res.data.data;
    },
    enabled: !!cropName && !gateMaturity && isOpen && !!activity,
  });

  const computedDaysSincePlanted = React.useMemo(() => {
    if (!plantedDate) return null;
    const now = new Date();
    const raw = Math.floor((now.getTime() - plantedDate.getTime()) / (1000 * 60 * 60 * 24));
    if (!Number.isFinite(raw)) return null;
    return Math.max(0, raw);
  }, [plantedDate]);

  const completeMutation = useMutation({
    mutationFn: async () => {
      if (!activity?._id) throw new Error('Activity is required');
      if (!imageFile) throw new Error('Completion image is required');

      const form = new FormData();
      form.append('image', imageFile);
      if (notes?.trim()) form.append('notes', notes.trim());

      return await api.post(`/practices/activities/${activity._id}/complete`, form, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
    },
    onSuccess: () => {
      const fid = farmId || activity?.farmId;
      if (fid) queryClient.invalidateQueries(['farm-activities', fid]);
      queryClient.invalidateQueries(['carbon-credits']);
      onClose();
      reset();
    }
  });

  if (!isOpen || !activity) return null;

  const resolvedMaturity = gateMaturity || maturity;
  const daysSincePlanted = gate?.daysSincePlanted ?? computedDaysSincePlanted;

  const maturityMinDays = resolvedMaturity?.minDays ?? null;
  const maturityMaxDays = resolvedMaturity?.maxDays ?? null;
  const maturityWindow = maturityMinDays != null && maturityMaxDays != null ? `${maturityMinDays}–${maturityMaxDays} days` : null;
  const maturityWeeks = resolvedMaturity?.minWeeks != null && resolvedMaturity?.maxWeeks != null ? `${resolvedMaturity.minWeeks}–${resolvedMaturity.maxWeeks} weeks` : null;
  const maturityMonths = resolvedMaturity?.minMonths != null && resolvedMaturity?.maxMonths != null ? `${resolvedMaturity.minMonths}–${resolvedMaturity.maxMonths} months` : null;
  const plantedLabel = plantedDate ? plantedDate.toLocaleDateString() : null;

  const tooEarly = gate
    ? gate.isMatured === false
    : !!seasonObj && maturityMinDays != null && daysSincePlanted != null && daysSincePlanted < maturityMinDays;
  const remainingDays = gate?.remainingDaysToMin ?? (tooEarly && maturityMinDays != null && daysSincePlanted != null ? Math.max(0, maturityMinDays - daysSincePlanted) : 0);
  const gateBlockedReason = gate?.blockedReason || null;

  return (
    <div className="fixed inset-0 z-[130] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-start shrink-0">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-indigo-100">Practice Completion</p>
            <h2 className="text-2xl font-black tracking-tight mt-1">Upload Evidence</h2>
            <p className="text-indigo-100 text-sm font-bold mt-2">{practiceName}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-6">
          {!canComplete && (
            <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50">
              <p className="text-xs font-bold text-amber-900">
                This activity can’t be completed from status: <span className="font-black">{status}</span>
              </p>
            </div>
          )}

          {tooEarly && (
            <div className="p-4 rounded-2xl border border-red-100 bg-red-50 flex gap-3">
              <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-xs font-bold text-red-700 leading-relaxed">
                  {gateBlockedReason ? (
                    gateBlockedReason
                  ) : (
                    <>
                      Too early to complete. <span className="font-black">{cropName}</span> needs at least{' '}
                      <span className="font-black">{maturityMinDays}</span> days from planting. Current:{' '}
                      <span className="font-black">{daysSincePlanted}</span> days. Wait ~{remainingDays} more days.
                    </>
                  )}
                </p>

                {(maturityWindow || maturityWeeks || maturityMonths) && (
                  <div className="mt-2 text-[11px] font-bold text-red-700/90 flex items-center gap-2 flex-wrap">
                    <span>
                      Expected maturity window:{' '}
                      <span className="font-black">{maturityWindow || `${maturityMinDays}+ days`}</span>
                      {maturityWeeks ? <span className="font-black">{' '}(~{maturityWeeks})</span> : null}
                      {maturityMonths ? <span className="font-black">{' '}(~{maturityMonths})</span> : null}
                    </span>

                    <span className="relative inline-flex items-center group">
                      <span className="text-[11px] font-black underline decoration-dotted underline-offset-2 cursor-help">Why disabled?</span>
                      <Info className="h-4 w-4 text-red-600 ml-1" />
                      <span className="pointer-events-none absolute left-0 top-full mt-2 w-[320px] max-w-[80vw] bg-white border border-red-100 shadow-xl rounded-2xl p-3 text-[11px] font-bold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">
                        <p className="leading-relaxed">
                          This completion evidence is locked until the crop reaches minimum maturity.
                          {plantedLabel ? ` Planted date: ${plantedLabel}.` : ''}
                          {maturityMinDays != null ? ` Minimum: ${maturityMinDays} days.` : ''}
                          {remainingDays ? ` Remaining: ~${remainingDays} days.` : ''}
                        </p>
                        <p className="mt-2 leading-relaxed text-gray-600">
                          Note: The backend enforces this too, so uploading early will be rejected even if you try from another client.
                        </p>
                        {resolvedMaturity?.notes ? (
                          <p className="mt-2 leading-relaxed text-gray-600">Maturity note: {resolvedMaturity.notes}</p>
                        ) : null}
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          <div
            className="relative h-56 rounded-[2rem] border-2 border-dashed border-gray-200 hover:border-indigo-400 transition-colors bg-gray-50 flex flex-col items-center justify-center cursor-pointer overflow-hidden group"
            onClick={() => document.getElementById('completion-evidence-upload')?.click()}
          >
            {previewUrl ? (
              <img src={previewUrl} alt="Completion evidence" className="w-full h-full object-cover" />
            ) : (
              <div className="text-center">
                <div className="bg-white p-4 rounded-full shadow-sm mb-4 inline-block group-hover:scale-110 transition-transform">
                  <Camera className="h-8 w-8 text-indigo-600" />
                </div>
                <p className="text-sm text-gray-500 font-black">Upload Completion Evidence</p>
                <p className="text-xs text-gray-400 mt-1">Photo required for AI verification & carbon credits</p>
              </div>
            )}
            <input
              id="completion-evidence-upload"
              type="file"
              className="hidden"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setImageFile(file);
                setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1 flex items-center gap-2">
              <FileText className="h-3 w-3" />
              Notes (Optional)
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any notes about what was completed in the field..."
              className="w-full min-h-[90px] bg-gray-50 border border-gray-100 rounded-2xl p-4 text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none"
            />
          </div>

          {completeMutation.isError && (
            <div className="p-4 rounded-2xl border border-red-100 bg-red-50">
              <p className="text-xs font-bold text-red-700">{completeMutation.error?.message || 'Failed to upload evidence'}</p>
            </div>
          )}
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-100 flex gap-4 shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-black uppercase text-xs">
            Cancel
          </Button>
          <Button
            onClick={() => completeMutation.mutate()}
            disabled={!canComplete || tooEarly || !imageFile || completeMutation.isPending}
            className="flex-1 h-12 rounded-2xl font-black uppercase text-xs bg-indigo-600 shadow-xl shadow-indigo-200"
          >
            {completeMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Submit Evidence'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CompleteActivityModal;
