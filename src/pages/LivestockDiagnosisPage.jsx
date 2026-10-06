import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  Stethoscope,
  Plus,
  Upload,
  Camera,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  RefreshCw,
  ChevronRight,
  X,
  MessageCircle,
  PawPrint,
  Beef,
  Bird,
  Fish,
  Rabbit,
  Send,
  Activity,
  Heart,
  Syringe,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from '../components/ui/ModalShell';
import { LoadingState, EmptyState } from '../components/ui/States';

const speciesIcons = {
  cattle: Beef,
  goat: Rabbit,
  sheep: Rabbit,
  pig: PawPrint,
  poultry: Bird,
  fish: Fish
};

const SeverityBadge = ({ severity }) => {
  // Backend/AI sometimes returns "moderate"; normalize to our UI schema
  const normalizedSeverity = severity === 'moderate' ? 'medium' : severity;

  const configs = {
    low: { label: 'Low', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    medium: { label: 'Medium', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    high: { label: 'High', color: 'bg-orange-100 text-orange-700', icon: AlertTriangle },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-700 animate-pulse', icon: AlertCircle }
  };
  const config = configs[normalizedSeverity] || configs.low;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold uppercase ${config.color}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    processing: { label: 'Processing...', color: 'bg-blue-100 text-blue-700', icon: Loader2 },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    detected: { label: 'Detected', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
    treating: { label: 'Treating', color: 'bg-purple-100 text-purple-700', icon: Syringe },
    treated: { label: 'Treated', color: 'bg-teal-100 text-teal-700', icon: CheckCircle2 },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    failed: { label: 'Failed', color: 'bg-red-100 text-red-700', icon: AlertCircle }
  };
  const config = configs[status] || configs.processing;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold ${config.color}`}>
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} aria-hidden="true" />
      {config.label}
    </span>
  );
};

const humanizeEnum = (value) => {
  if (!value) return '';
  return String(value)
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
};

const getLivestockLabel = (diagnosis) => {
  const l = diagnosis?.livestockId;
  if (!l) return diagnosis?.animalDescription || 'Unknown';

  const primary = l?.name || l?.tagId;
  if (primary) return primary;

  const isBatch = l?.trackingType === 'batch' || (diagnosis?.batchSize || 0) > 1;
  if (isBatch) {
    const batchBase =
      l?.batchId ? `Batch ${l.batchId}` : l?.poultryType ? `${humanizeEnum(l.poultryType)} batch` : 'Batch';
    const size = typeof l?.quantity === 'number' ? l.quantity : diagnosis?.batchSize;
    const sizeLabel = typeof size === 'number' && size > 1 ? ` (${size})` : '';
    return `${batchBase}${sizeLabel}`;
  }

  return 'Animal';
};

const DiagnosisCard = ({ diagnosis, onClick }) => {
  const SpeciesIcon = speciesIcons[diagnosis.livestockId?.species] || PawPrint;
  
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick?.();
        }
      }}
      className="bg-card rounded-2xl border border-border shadow-sm hover:shadow-lg transition-all cursor-pointer group p-4 sm:p-6"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-muted flex-shrink-0">
          {diagnosis.imageUrls?.[0] ? (
            <img 
              src={diagnosis.imageUrls[0]} 
              alt="Diagnosis" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SpeciesIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-foreground group-hover:text-primary transition-colors line-clamp-1">
                {diagnosis.diagnosis}
              </h3>
              <p className="text-sm text-muted-foreground">
                {getLivestockLabel(diagnosis)} • {diagnosis.livestockId?.species || diagnosis.species || 'Unknown'}
              </p>
            </div>
            <div className="flex flex-col shrink-0 gap-1 items-end">
              <StatusBadge status={diagnosis.status} />
              {diagnosis.status !== 'processing' && (
                <SeverityBadge severity={diagnosis.severity} />
              )}
            </div>
          </div>

          {diagnosis.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {diagnosis.symptoms.slice(0, 3).map((symptom, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-muted text-muted-foreground rounded-lg text-xs">
                  {symptom}
                </span>
              ))}
              {diagnosis.symptoms.length > 3 && (
                <span className="px-2 py-0.5 bg-muted text-muted-foreground rounded-lg text-xs">
                  +{diagnosis.symptoms.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 mt-4 pt-4 border-t border-border">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {new Date(diagnosis.createdAt).toLocaleDateString()}
              </span>
              {diagnosis.confidence > 0 && (
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" aria-hidden="true" />
                  {Math.round(diagnosis.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary transition-colors" aria-hidden="true" />
          </div>
        </div>
      </div>
    </div>
  );
};

const DiagnosisDetailsModal = ({ isOpen, onClose, diagnosisId, initialDiagnosis, farmId }) => {
  const queryClient = useQueryClient();

  const { data: diagnosis, isLoading } = useQuery({
    queryKey: ['livestock-diagnosis', diagnosisId],
    queryFn: async () => {
      const response = await api.get(`/livestock-diagnosis/${diagnosisId}`);
      return response.data?.data || response.data;
    },
    enabled: isOpen && !!diagnosisId
  });

  const d = diagnosis || initialDiagnosis;

  const updateStatusMutation = useMutation({
    mutationFn: async (newStatus) => {
      const response = await api.patch(`/livestock-diagnosis/${diagnosisId}/status`, { status: newStatus });
      return response.data?.data || response.data;
    },
    onSuccess: () => {
      if (farmId) queryClient.invalidateQueries(['livestock-diagnoses', farmId]);
      queryClient.invalidateQueries(['livestock-diagnosis', diagnosisId]);
    }
  });

  const toggleTreatmentTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await api.patch(`/livestock-diagnosis/${diagnosisId}/treatment-plan/${taskId}/toggle`);
      return response.data?.data || response.data;
    },
    onSuccess: (data) => {
      if (farmId) queryClient.invalidateQueries(['livestock-diagnoses', farmId]);
      queryClient.setQueryData(['livestock-diagnosis', diagnosisId], data);
    }
  });

  const canShow = isOpen && (isLoading || d);
  if (!canShow) return null;

  const SpeciesIcon = speciesIcons[d?.livestockId?.species] || PawPrint;
  const isBatch = (d?.batchSize || 0) > 1;
  const affectedPercent = isBatch && d?.affectedCount
    ? Math.round((d.affectedCount / d.batchSize) * 100)
    : null;

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Diagnosis Details"
      description={`${getLivestockLabel(d)} • ${d?.livestockId?.species || d?.species || 'Unknown'}`}
      icon={
        <span className="bg-primary/10 p-2 rounded-xl">
          <Stethoscope className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
      }
      size="xl"
      bodyClassName="space-y-6"
      footer={
        <div className="flex w-full flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {d?.status !== 'resolved' && (
              <Button
                className="rounded-xl"
                loading={updateStatusMutation.isPending}
                onClick={() => updateStatusMutation.mutate('resolved')}
              >
                Mark Resolved
              </Button>
            )}
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      }
    >
      {isLoading && !d ? (
        <LoadingState label="Loading diagnosis details..." />
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {d?.status && <StatusBadge status={d.status} />}
            {d?.severity && d?.status !== 'processing' && <SeverityBadge severity={d.severity} />}
          </div>

          {/* Title */}
          <div className="bg-muted rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-card border border-border flex items-center justify-center flex-shrink-0">
                {d?.imageUrls?.[0] ? (
                  <img src={d.imageUrls[0]} alt="Diagnosis" className="w-full h-full object-cover" />
                ) : (
                  <SpeciesIcon className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <h3 className="text-lg font-black text-foreground leading-tight">
                  {d?.diagnosis || 'Diagnosis'}
                </h3>
                <div className="flex flex-wrap gap-3 mt-2 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" aria-hidden="true" />
                    {d?.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                  </span>
                  {typeof d?.confidence === 'number' && (
                    <span className="flex items-center gap-1">
                      <Activity className="h-4 w-4" aria-hidden="true" />
                      {Math.round(d.confidence * 100)}% confidence
                    </span>
                  )}
                </div>

                {isBatch && (
                  <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                    <div className="font-bold text-amber-900 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                      Batch case
                    </div>
                    <div className="text-amber-800 mt-1">
                      Batch size: <span className="font-bold">{d.batchSize}</span>
                      {d.affectedCount ? (
                        <>
                          {' '}• affected: <span className="font-bold">{d.affectedCount}</span>
                          {affectedPercent !== null ? ` (${affectedPercent}%)` : ''}
                        </>
                      ) : (
                        <> • affected: <span className="font-bold">Unknown</span></>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Images */}
          {d?.imageUrls?.length > 0 && (
            <div>
              <h4 className="font-bold text-foreground mb-3">Submitted Photos</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {d.imageUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-2xl overflow-hidden border border-border hover:shadow-md transition"
                    title="Open image"
                  >
                    <img src={url} alt={`Diagnosis ${idx + 1}`} className="w-full max-w-full aspect-square object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Symptoms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3">Symptoms</h4>
              {d?.symptoms?.length ? (
                <div className="flex flex-wrap gap-2">
                  {d.symptoms.map((s, idx) => (
                    <span key={idx} className="px-3 py-1 bg-muted text-foreground rounded-full text-xs font-medium">
                      {s}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No symptoms provided.</p>
              )}
            </div>

            {/* Key insights */}
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3">Key Insights</h4>
              <div className="space-y-2 text-sm text-foreground">
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Urgency</span>
                  <span className="font-bold">{d?.urgency || '—'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Vet required</span>
                  <span className="font-bold">{d?.veterinaryRequired ? 'Yes' : 'No'}</span>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <span className="text-muted-foreground">Quarantine</span>
                  <span className="font-bold">{d?.quarantineRecommended ? 'Recommended' : 'Not required'}</span>
                </div>
                {typeof d?.followUpDays === 'number' && (
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-muted-foreground">Follow-up</span>
                    <span className="font-bold">{d.followUpDays} day(s)</span>
                  </div>
                )}
              </div>

              {d?.spreadRisk && (
                <div className="mt-3 text-sm">
                  <div className="font-bold text-foreground">Spread risk</div>
                  <div className="text-muted-foreground mt-1">{d.spreadRisk}</div>
                </div>
              )}
            </div>
          </div>

          {/* Possible conditions */}
          {d?.possibleConditions?.length > 0 && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3">Possible Conditions</h4>
              <div className="space-y-3">
                {d.possibleConditions.map((c, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-3">
                    <div>
                      <div className="font-bold text-foreground">{c.name}</div>
                      {c.description && <div className="text-sm text-muted-foreground">{c.description}</div>}
                    </div>
                    {typeof c.probability === 'number' && (
                      <div className="text-sm font-bold text-foreground whitespace-nowrap">
                        {Math.round(c.probability * 100)}%
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Treatment & prevention */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3">Treatment</h4>
              {d?.treatment?.length ? (
                <ol className="space-y-2 list-decimal list-inside text-sm text-foreground">
                  {d.treatment.map((t, idx) => (
                    <li key={idx} className="leading-relaxed">{t}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No treatment steps available.</p>
              )}
            </div>

            <div className="bg-card border border-border rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-3">Prevention</h4>
              {d?.prevention?.length ? (
                <ul className="space-y-2 text-sm text-foreground">
                  {d.prevention.map((p, idx) => (
                    <li key={idx} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" aria-hidden="true" />
                      <span className="leading-relaxed">{p}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">No prevention advice available.</p>
              )}
            </div>
          </div>

          {/* Treatment checklist */}
          {Array.isArray(d?.treatmentPlan) && d.treatmentPlan.length > 0 && d?.status !== 'processing' && d?.status !== 'failed' && (
            <div className="bg-card border border-border rounded-2xl p-5">
              <div className="flex items-center justify-between gap-3 mb-4">
                <h4 className="font-bold text-foreground">Treatment Checklist</h4>
                <div className="text-xs font-bold text-muted-foreground">
                  {d.treatmentPlan.filter(t => t.isCompleted).length}/{d.treatmentPlan.length} done
                </div>
              </div>

              <div className="space-y-2">
                {d.treatmentPlan.map((step) => (
                  <div
                    key={String(step._id)}
                    className={`flex items-start gap-3 p-3 rounded-xl border ${
                      step.isCompleted ? 'bg-green-50 border-green-100' : 'bg-muted border-border'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => toggleTreatmentTaskMutation.mutate(String(step._id))}
                      disabled={toggleTreatmentTaskMutation.isPending}
                      aria-pressed={step.isCompleted}
                      aria-label={`Mark "${step.task}" as ${step.isCompleted ? 'not completed' : 'completed'}`}
                      className={`mt-0.5 h-6 w-6 rounded-lg border flex items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        step.isCompleted ? 'bg-green-600 border-green-600 text-white' : 'bg-card border-border'
                      }`}
                    >
                      {step.isCompleted ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : null}
                    </button>

                    <div className="flex-1 min-w-0">
                      <div className={`text-sm font-bold ${step.isCompleted ? 'text-green-800 line-through' : 'text-foreground'}`}>
                        {step.task}
                      </div>
                      <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-muted-foreground">
                        {step.timeframe ? <span className="px-2 py-0.5 bg-card rounded-lg border border-border">{step.timeframe}</span> : null}
                        {step.category ? <span className="px-2 py-0.5 bg-card rounded-lg border border-border">{step.category}</span> : null}
                        {step.priority ? <span className="px-2 py-0.5 bg-card rounded-lg border border-border">{step.priority}</span> : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="mt-3 text-xs text-muted-foreground">
                Tip: when all tasks are completed, the case will auto-mark as <span className="font-bold">Treated</span>. Mark <span className="font-bold">Resolved</span> only after the animal fully recovers.
              </p>
            </div>
          )}

          {/* Additional notes */}
          {d?.additionalNotes && (
            <div className="bg-muted rounded-2xl p-5">
              <h4 className="font-bold text-foreground mb-2">Additional Notes</h4>
              <p className="text-sm text-foreground leading-relaxed">{d.additionalNotes}</p>
            </div>
          )}
        </>
      )}
    </ModalShell>
  );
};

const NewDiagnosisModal = ({ isOpen, onClose, farmId, onSuccess }) => {
  const [step, setStep] = React.useState(1);
  const [selectedLivestock, setSelectedLivestock] = React.useState(null);
  const [images, setImages] = React.useState([]);
  const [symptoms, setSymptoms] = React.useState('');
  const [affectedCount, setAffectedCount] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  // Fetch livestock for farm
  const { data: livestock } = useQuery({
    queryKey: ['livestock', farmId],
    queryFn: async () => {
      const response = await api.get(`/livestock/farms/${farmId}`);
      return response.data.data || [];
    },
    enabled: isOpen && !!farmId
  });

  const isBatch = selectedLivestock?.trackingType === 'batch';
  const batchQuantity = selectedLivestock?.quantity || 1;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }))]);
    setError('');
  };

  const removeImage = (idx) => {
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async () => {
    if (!selectedLivestock || images.length === 0) return;
    
    setIsSubmitting(true);
    setError('');

    try {
      const formData = new FormData();
      images.forEach(img => formData.append('images', img.file));
      if (symptoms.trim()) {
        symptoms.split(',').forEach(s => formData.append('symptoms', s.trim()));
      }
      
      // Include affected count for batch livestock
      if (isBatch && affectedCount) {
        const count = parseInt(affectedCount, 10);
        if (count > 0 && count <= batchQuantity) {
          formData.append('affectedCount', count.toString());
        }
      }

      await api.post(`/livestock-diagnosis/${selectedLivestock._id}/diagnose`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSuccess();
      onClose();
      resetForm();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create diagnosis');
    }
    setIsSubmitting(false);
  };

  const resetForm = () => {
    setStep(1);
    setSelectedLivestock(null);
    setImages([]);
    setSymptoms('');
    setAffectedCount('');
    setError('');
  };

  React.useEffect(() => {
    if (!isOpen) resetForm();
  }, [isOpen]);

  const SelectedIcon = selectedLivestock ? (speciesIcons[selectedLivestock.species] || PawPrint) : PawPrint;

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="AI Health Diagnosis"
      description={`Step ${step} of 3`}
      icon={
        <span className="bg-primary/10 p-2 rounded-xl">
          <Stethoscope className="h-6 w-6 text-primary" aria-hidden="true" />
        </span>
      }
      size="lg"
      bodyClassName="space-y-4"
      footer={
        <div className="flex w-full gap-4">
          {step > 1 && (
            <Button
              variant="outline"
              className="flex-1 rounded-xl h-12"
              onClick={() => setStep(step - 1)}
            >
              Back
            </Button>
          )}
          {step < 3 ? (
            <Button
              className="flex-1 rounded-xl h-12"
              disabled={step === 1 && !selectedLivestock}
              onClick={() => setStep(step + 1)}
            >
              Continue
            </Button>
          ) : (
            <Button
              className="flex-1 rounded-xl h-12"
              loading={isSubmitting}
              disabled={images.length === 0}
              onClick={handleSubmit}
            >
              <Stethoscope className="h-4 w-4 mr-2" aria-hidden="true" />
              Start Diagnosis
            </Button>
          )}
        </div>
      }
    >
      {/* Progress Bar */}
      <div className="h-2 bg-muted rounded-full overflow-hidden" role="progressbar" aria-valuenow={step} aria-valuemin={1} aria-valuemax={3} aria-label={`Step ${step} of 3`}>
        <div
          className="h-full bg-primary transition-all"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      {error && (
        <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive p-4 rounded-xl flex items-center gap-2 text-sm font-medium">
          <AlertCircle className="h-5 w-5" aria-hidden="true" />
          {error}
        </div>
      )}

          {/* Step 1: Select Livestock */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Select Animal</h3>
              <p className="text-muted-foreground text-sm">Choose the animal you want to diagnose</p>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {livestock?.map(animal => {
                  const Icon = speciesIcons[animal.species] || PawPrint;
                  const isSelected = selectedLivestock?._id === animal._id;
                  
                  return (
                    <button
                      key={animal._id}
                      type="button"
                      onClick={() => setSelectedLivestock(animal)}
                      aria-pressed={isSelected}
                      className={`p-4 rounded-xl border-2 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-muted'}`}>
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} aria-hidden="true" />
                        </div>
                        <div>
                          <p className="font-bold text-foreground">
                            {animal.name || animal.tagId || `#${animal._id.slice(-4)}`}
                          </p>
                          <p className="text-xs text-muted-foreground capitalize">
                            {animal.breed || animal.species}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step 2: Upload Images */}
          {step === 2 && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Upload Photos</h3>
              <p className="text-muted-foreground text-sm">
                Take clear photos of the affected areas, posture, and visible symptoms
              </p>

              {/* Selected Animal Summary */}
              <div className="bg-muted rounded-xl p-4 flex items-center gap-3">
                <SelectedIcon className="h-8 w-8 text-primary" aria-hidden="true" />
                <div>
                  <p className="font-bold text-foreground">
                    {selectedLivestock?.name || selectedLivestock?.tagId}
                  </p>
                  <p className="text-sm text-muted-foreground capitalize">{selectedLivestock?.species}</p>
                </div>
              </div>

              {/* Upload Area */}
              <div
                role="button"
                tabIndex={0}
                aria-label="Upload diagnosis photos"
                className="border-2 border-dashed border-border rounded-2xl p-6 sm:p-8 text-center cursor-pointer hover:border-primary/50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                onClick={() => document.getElementById('diagnosis-images').click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    document.getElementById('diagnosis-images').click();
                  }
                }}
              >
                <Camera className="h-12 w-12 text-muted-foreground mx-auto mb-3" aria-hidden="true" />
                <p className="font-bold text-foreground">Click to upload photos</p>
                <p className="text-sm text-muted-foreground">Up to 5 images • JPG, PNG</p>
                <input
                  id="diagnosis-images"
                  type="file"
                  multiple
                  accept="image/*"
                  aria-label="Choose diagnosis photos"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* Image Previews */}
              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img 
                        src={img.preview} 
                        alt={`Preview ${idx + 1}`}
                        className="w-full max-w-full aspect-square object-cover rounded-xl"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        aria-label={`Remove photo ${idx + 1}`}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100"
                      >
                        <X className="h-3 w-3" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Step 3: Additional Info */}
          {step === 3 && (
            <div className="space-y-4">
              <h3 className="font-bold text-foreground">Additional Information</h3>
              <p className="text-muted-foreground text-sm">
                Provide more details to help the AI make an accurate diagnosis
              </p>

              {/* Summary */}
              <div className="bg-muted rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <SelectedIcon className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="font-bold text-foreground truncate">
                      {selectedLivestock?.name || selectedLivestock?.tagId}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {images.length} photo(s) uploaded
                      {isBatch && ` • Batch of ${batchQuantity}`}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto py-2">
                  {images.map((img, idx) => (
                    <img
                      key={idx}
                      src={img.preview}
                      alt=""
                      className="w-12 h-12 max-w-full rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Affected count for batch livestock */}
              {isBatch && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <label className="text-sm font-bold text-amber-800 flex items-center gap-2" htmlFor="diagnosis-affected-count">
                    <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    How many animals are affected? *
                  </label>
                  <p className="text-xs text-amber-700 mt-1 mb-2">
                    This batch contains {batchQuantity} animals. Specify how many are showing symptoms.
                  </p>
                  <Input
                    id="diagnosis-affected-count"
                    type="number"
                    min="1"
                    max={batchQuantity}
                    required
                    value={affectedCount}
                    onChange={(e) => setAffectedCount(e.target.value)}
                    placeholder={`Enter number (1 - ${batchQuantity})`}
                    className="bg-card"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-foreground" htmlFor="diagnosis-symptoms">
                  Observed Symptoms (comma separated)
                </label>
                <textarea
                  id="diagnosis-symptoms"
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., loss of appetite, limping, discharge from eyes..."
                  className="mt-2 w-full min-h-[100px] bg-card border border-border rounded-xl p-4 text-base sm:text-sm"
                />
              </div>
            </div>
          )}
    </ModalShell>
  );
};

const LivestockDiagnosisPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();
  const [showNewDiagnosis, setShowNewDiagnosis] = React.useState(false);
  const [selectedDiagnosis, setSelectedDiagnosis] = React.useState(null);

  // Fetch farms
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data || [];
    }
  });

  // Auto-select first farm
  React.useEffect(() => {
    if (farms?.length > 0 && !farmId) {
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farms, farmId, setSearchParams]);

  // Fetch diagnoses
  const { data: diagnoses, isLoading, refetch } = useQuery({
    queryKey: ['livestock-diagnoses', farmId],
    queryFn: async () => {
      const response = await api.get(`/livestock-diagnosis/farms/${farmId}`);
      return response.data.data || [];
    },
    enabled: !!farmId,
    refetchInterval: 10000 // Poll every 10s for processing diagnoses
  });

  // Group by status
  const groupedDiagnoses = React.useMemo(() => {
    if (!diagnoses) return { processing: [], active: [], resolved: [] };
    return {
      processing: diagnoses.filter(d => d.status === 'processing'),
      active: diagnoses.filter(d => ['completed', 'detected', 'treating', 'treated'].includes(d.status)),
      resolved: diagnoses.filter(d => d.status === 'resolved')
    };
  }, [diagnoses]);

  if (!farmId) {
    return (
      <LoadingState label="Loading farms..." className="min-h-[60vh]" />
    );
  }

  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* New Diagnosis Modal */}
      <NewDiagnosisModal
        isOpen={showNewDiagnosis}
        onClose={() => setShowNewDiagnosis(false)}
        farmId={farmId}
        onSuccess={() => {
          queryClient.invalidateQueries(['livestock-diagnoses', farmId]);
          refetch();
        }}
      />

      {/* Diagnosis Details Modal */}
      <DiagnosisDetailsModal
        isOpen={!!selectedDiagnosis}
        onClose={() => setSelectedDiagnosis(null)}
        diagnosisId={selectedDiagnosis?._id}
        initialDiagnosis={selectedDiagnosis}
        farmId={farmId}
      />

      {/* Header */}
      <div className="bg-card rounded-3xl border border-border shadow-sm p-4 sm:p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-black text-foreground flex items-center gap-3">
              <Stethoscope className="h-8 w-8 shrink-0 text-primary" aria-hidden="true" />
              AI Health Diagnosis
            </h1>
            <p className="text-muted-foreground mt-1">
              Upload photos for instant AI-powered health assessment
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:gap-3">
            <select
              value={farmId || ''}
              onChange={(e) => setSearchParams({ farmId: e.target.value })}
              aria-label="Select farm"
              className="h-12 px-4 bg-card border border-border rounded-xl font-medium text-base sm:text-sm"
            >
              {farms?.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.name}</option>
              ))}
            </select>
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="rounded-xl h-12"
              aria-label="Refresh diagnoses"
            >
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </Button>

            <Link to={`/vet-consultation?farmId=${encodeURIComponent(farmId)}`} className="inline-flex">
              <Button variant="outline" className="rounded-xl h-12 px-6">
                <MessageCircle className="h-4 w-4 mr-2" aria-hidden="true" />
                Vet AI
              </Button>
            </Link>

            <Button onClick={() => setShowNewDiagnosis(true)} className="rounded-xl h-12 px-6">
              <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
              New Diagnosis
            </Button>
          </div>
        </div>
      </div>

      {/* Processing Diagnoses */}
      {groupedDiagnoses.processing.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" aria-hidden="true" />
            Processing ({groupedDiagnoses.processing.length})
          </h2>
          <div className="space-y-4">
            {groupedDiagnoses.processing.map(diagnosis => (
              <DiagnosisCard
                key={diagnosis._id}
                diagnosis={diagnosis}
                onClick={() => setSelectedDiagnosis(diagnosis)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Active Diagnoses */}
      {groupedDiagnoses.active.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" aria-hidden="true" />
            Active Issues ({groupedDiagnoses.active.length})
          </h2>
          <div className="space-y-4">
            {groupedDiagnoses.active.map(diagnosis => (
              <DiagnosisCard
                key={diagnosis._id}
                diagnosis={diagnosis}
                onClick={() => setSelectedDiagnosis(diagnosis)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Resolved Diagnoses */}
      {groupedDiagnoses.resolved.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" aria-hidden="true" />
            Resolved ({groupedDiagnoses.resolved.length})
          </h2>
          <div className="space-y-4">
            {groupedDiagnoses.resolved.map(diagnosis => (
              <DiagnosisCard
                key={diagnosis._id}
                diagnosis={diagnosis}
                onClick={() => setSelectedDiagnosis(diagnosis)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {isLoading ? (
        <LoadingState label="Loading diagnoses..." />
      ) : diagnoses?.length === 0 && (
        <EmptyState
          className="bg-card rounded-3xl border border-border"
          icon={<Stethoscope className="h-12 w-12" aria-hidden="true" />}
          title="No diagnoses yet"
          description="Upload photos of your livestock for AI-powered health assessment"
          action={
            <Button onClick={() => setShowNewDiagnosis(true)} className="rounded-xl h-12 px-8">
              <Camera className="h-4 w-4 mr-2" aria-hidden="true" />
              Start First Diagnosis
            </Button>
          }
        />
      )}
    </div>
  );
};

export default LivestockDiagnosisPage;
