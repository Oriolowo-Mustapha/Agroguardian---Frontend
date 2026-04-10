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
      <Icon className="h-3 w-3" />
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
      <Icon className={`h-3 w-3 ${status === 'processing' ? 'animate-spin' : ''}`} />
      {config.label}
    </span>
  );
};

const DiagnosisCard = ({ diagnosis, onClick }) => {
  const SpeciesIcon = speciesIcons[diagnosis.livestockId?.species] || PawPrint;
  
  return (
    <div
      onClick={onClick}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-lg transition-all cursor-pointer group p-6"
    >
      <div className="flex items-start gap-4">
        {/* Thumbnail */}
        <div className="w-20 h-20 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
          {diagnosis.imageUrls?.[0] ? (
            <img 
              src={diagnosis.imageUrls[0]} 
              alt="Diagnosis" 
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <SpeciesIcon className="h-8 w-8 text-gray-400" />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div>
              <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-1">
                {diagnosis.diagnosis}
              </h3>
              <p className="text-sm text-gray-500">
                {diagnosis.livestockId?.name || diagnosis.livestockId?.tagId || 'Unknown'} • {diagnosis.livestockId?.species}
              </p>
            </div>
            <div className="flex flex-col gap-1 items-end">
              <StatusBadge status={diagnosis.status} />
              {diagnosis.status !== 'processing' && (
                <SeverityBadge severity={diagnosis.severity} />
              )}
            </div>
          </div>

          {diagnosis.symptoms?.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {diagnosis.symptoms.slice(0, 3).map((symptom, idx) => (
                <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-lg text-xs">
                  {symptom}
                </span>
              ))}
              {diagnosis.symptoms.length > 3 && (
                <span className="px-2 py-0.5 bg-gray-100 text-gray-500 rounded-lg text-xs">
                  +{diagnosis.symptoms.length - 3} more
                </span>
              )}
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {new Date(diagnosis.createdAt).toLocaleDateString()}
              </span>
              {diagnosis.confidence > 0 && (
                <span className="flex items-center gap-1">
                  <Activity className="h-4 w-4" />
                  {Math.round(diagnosis.confidence * 100)}% confidence
                </span>
              )}
            </div>
            <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors" />
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl w-full max-w-4xl shadow-2xl max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="border-b border-gray-100 p-6 flex justify-between items-start gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <div className="bg-primary/10 p-2 rounded-xl mt-0.5">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-gray-900 truncate">Diagnosis Details</h2>
              <p className="text-sm text-gray-500 truncate">
                {d?.livestockId?.name || d?.livestockId?.tagId || 'Unknown'} • {d?.livestockId?.species || d?.species || 'Unknown'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {d?.status && <StatusBadge status={d.status} />}
            {d?.severity && d?.status !== 'processing' && <SeverityBadge severity={d.severity} />}
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
              <X className="h-5 w-5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading && !d ? (
            <div className="space-y-3">
              <div className="h-6 bg-gray-100 rounded animate-pulse" />
              <div className="h-40 bg-gray-100 rounded-2xl animate-pulse" />
              <div className="h-24 bg-gray-100 rounded-2xl animate-pulse" />
            </div>
          ) : (
            <>
              {/* Title */}
              <div className="bg-gray-50 rounded-2xl p-5">
                <div className="flex items-start gap-4">
                  <div className="w-16 h-16 rounded-xl overflow-hidden bg-white border border-gray-100 flex items-center justify-center flex-shrink-0">
                    {d?.imageUrls?.[0] ? (
                      <img src={d.imageUrls[0]} alt="Diagnosis" className="w-full h-full object-cover" />
                    ) : (
                      <SpeciesIcon className="h-8 w-8 text-gray-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg font-black text-gray-900 leading-tight">
                      {d?.diagnosis || 'Diagnosis'}
                    </h3>
                    <div className="flex flex-wrap gap-3 mt-2 text-sm text-gray-600">
                      <span className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {d?.createdAt ? new Date(d.createdAt).toLocaleString() : '—'}
                      </span>
                      {typeof d?.confidence === 'number' && (
                        <span className="flex items-center gap-1">
                          <Activity className="h-4 w-4" />
                          {Math.round(d.confidence * 100)}% confidence
                        </span>
                      )}
                    </div>

                    {isBatch && (
                      <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm">
                        <div className="font-bold text-amber-900 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4" />
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
                  <h4 className="font-bold text-gray-900 mb-3">Submitted Photos</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {d.imageUrls.map((url, idx) => (
                      <a
                        key={idx}
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-2xl overflow-hidden border border-gray-100 hover:shadow-md transition"
                        title="Open image"
                      >
                        <img src={url} alt={`Diagnosis ${idx + 1}`} className="w-full aspect-square object-cover" />
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {/* Symptoms */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-3">Symptoms</h4>
                  {d?.symptoms?.length ? (
                    <div className="flex flex-wrap gap-2">
                      {d.symptoms.map((s, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">
                          {s}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-500">No symptoms provided.</p>
                  )}
                </div>

                {/* Key insights */}
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-3">Key Insights</h4>
                  <div className="space-y-2 text-sm text-gray-700">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Urgency</span>
                      <span className="font-bold">{d?.urgency || '—'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Vet required</span>
                      <span className="font-bold">{d?.veterinaryRequired ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-gray-500">Quarantine</span>
                      <span className="font-bold">{d?.quarantineRecommended ? 'Recommended' : 'Not required'}</span>
                    </div>
                    {typeof d?.followUpDays === 'number' && (
                      <div className="flex items-start justify-between gap-3">
                        <span className="text-gray-500">Follow-up</span>
                        <span className="font-bold">{d.followUpDays} day(s)</span>
                      </div>
                    )}
                  </div>

                  {d?.spreadRisk && (
                    <div className="mt-3 text-sm">
                      <div className="font-bold text-gray-900">Spread risk</div>
                      <div className="text-gray-600 mt-1">{d.spreadRisk}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Possible conditions */}
              {d?.possibleConditions?.length > 0 && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-3">Possible Conditions</h4>
                  <div className="space-y-3">
                    {d.possibleConditions.map((c, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-3">
                        <div>
                          <div className="font-bold text-gray-900">{c.name}</div>
                          {c.description && <div className="text-sm text-gray-600">{c.description}</div>}
                        </div>
                        {typeof c.probability === 'number' && (
                          <div className="text-sm font-bold text-gray-700 whitespace-nowrap">
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
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-3">Treatment</h4>
                  {d?.treatment?.length ? (
                    <ol className="space-y-2 list-decimal list-inside text-sm text-gray-700">
                      {d.treatment.map((t, idx) => (
                        <li key={idx} className="leading-relaxed">{t}</li>
                      ))}
                    </ol>
                  ) : (
                    <p className="text-sm text-gray-500">No treatment steps available.</p>
                  )}
                </div>

                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-3">Prevention</h4>
                  {d?.prevention?.length ? (
                    <ul className="space-y-2 text-sm text-gray-700">
                      {d.prevention.map((p, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5" />
                          <span className="leading-relaxed">{p}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500">No prevention advice available.</p>
                  )}
                </div>
              </div>

              {/* Treatment checklist */}
              {Array.isArray(d?.treatmentPlan) && d.treatmentPlan.length > 0 && d?.status !== 'processing' && d?.status !== 'failed' && (
                <div className="bg-white border border-gray-100 rounded-2xl p-5">
                  <div className="flex items-center justify-between gap-3 mb-4">
                    <h4 className="font-bold text-gray-900">Treatment Checklist</h4>
                    <div className="text-xs font-bold text-gray-600">
                      {d.treatmentPlan.filter(t => t.isCompleted).length}/{d.treatmentPlan.length} done
                    </div>
                  </div>

                  <div className="space-y-2">
                    {d.treatmentPlan.map((step) => (
                      <div
                        key={String(step._id)}
                        className={`flex items-start gap-3 p-3 rounded-xl border ${
                          step.isCompleted ? 'bg-green-50 border-green-100' : 'bg-gray-50 border-gray-100'
                        }`}
                      >
                        <button
                          onClick={() => toggleTreatmentTaskMutation.mutate(String(step._id))}
                          disabled={toggleTreatmentTaskMutation.isPending}
                          className={`mt-0.5 h-6 w-6 rounded-lg border flex items-center justify-center ${
                            step.isCompleted ? 'bg-green-600 border-green-600 text-white' : 'bg-white border-gray-200'
                          }`}
                          title="Toggle task"
                        >
                          {step.isCompleted ? <CheckCircle2 className="h-4 w-4" /> : null}
                        </button>

                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-bold ${step.isCompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}>
                            {step.task}
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] font-bold text-gray-500">
                            {step.timeframe ? <span className="px-2 py-0.5 bg-white rounded-lg border border-gray-200">{step.timeframe}</span> : null}
                            {step.category ? <span className="px-2 py-0.5 bg-white rounded-lg border border-gray-200">{step.category}</span> : null}
                            {step.priority ? <span className="px-2 py-0.5 bg-white rounded-lg border border-gray-200">{step.priority}</span> : null}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <p className="mt-3 text-xs text-gray-500">
                    Tip: when all tasks are completed, the case will auto-mark as <span className="font-bold">Treated</span>. Mark <span className="font-bold">Resolved</span> only after the animal fully recovers.
                  </p>
                </div>
              )}

              {/* Additional notes */}
              {d?.additionalNotes && (
                <div className="bg-gray-50 rounded-2xl p-5">
                  <h4 className="font-bold text-gray-900 mb-2">Additional Notes</h4>
                  <p className="text-sm text-gray-700 leading-relaxed">{d.additionalNotes}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={updateStatusMutation.isPending || d?.status === 'detected'}
              onClick={() => updateStatusMutation.mutate('detected')}
            >
              Mark Detected
            </Button>
            <Button
              variant="outline"
              className="rounded-xl"
              disabled={updateStatusMutation.isPending || d?.status === 'treating'}
              onClick={() => updateStatusMutation.mutate('treating')}
            >
              Mark Treating
            </Button>
            <Button
              className="rounded-xl"
              disabled={updateStatusMutation.isPending || d?.status === 'resolved'}
              onClick={() => updateStatusMutation.mutate('resolved')}
            >
              Mark Resolved
            </Button>
          </div>
          <Button variant="outline" className="rounded-xl" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    </div>
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

  if (!isOpen) return null;

  const SelectedIcon = selectedLivestock ? (speciesIcons[selectedLivestock.species] || PawPrint) : PawPrint;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-2xl shadow-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-100 p-6 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <Stethoscope className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">AI Health Diagnosis</h2>
              <p className="text-sm text-gray-500">Step {step} of 3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="px-6 py-2">
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all" 
              style={{ width: `${(step / 3) * 100}%` }}
            />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-4 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
          )}

          {/* Step 1: Select Livestock */}
          {step === 1 && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-900">Select Animal</h3>
              <p className="text-gray-500 text-sm">Choose the animal you want to diagnose</p>
              
              <div className="grid grid-cols-2 gap-3 max-h-[400px] overflow-y-auto">
                {livestock?.map(animal => {
                  const Icon = speciesIcons[animal.species] || PawPrint;
                  const isSelected = selectedLivestock?._id === animal._id;
                  
                  return (
                    <button
                      key={animal._id}
                      onClick={() => setSelectedLivestock(animal)}
                      className={`p-4 rounded-xl border-2 text-left transition-all ${
                        isSelected 
                          ? 'border-primary bg-primary/10' 
                          : 'border-gray-200 hover:border-primary/50'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isSelected ? 'bg-primary/20' : 'bg-gray-100'}`}>
                          <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-gray-500'}`} />
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">
                            {animal.name || animal.tagId || `#${animal._id.slice(-4)}`}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
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
              <h3 className="font-bold text-gray-900">Upload Photos</h3>
              <p className="text-gray-500 text-sm">
                Take clear photos of the affected areas, posture, and visible symptoms
              </p>

              {/* Selected Animal Summary */}
              <div className="bg-gray-50 rounded-xl p-4 flex items-center gap-3">
                <SelectedIcon className="h-8 w-8 text-primary" />
                <div>
                  <p className="font-bold text-gray-900">
                    {selectedLivestock?.name || selectedLivestock?.tagId}
                  </p>
                  <p className="text-sm text-gray-500 capitalize">{selectedLivestock?.species}</p>
                </div>
              </div>

              {/* Upload Area */}
              <div
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center cursor-pointer hover:border-primary/50 transition-colors"
                onClick={() => document.getElementById('diagnosis-images').click()}
              >
                <Camera className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <p className="font-bold text-gray-900">Click to upload photos</p>
                <p className="text-sm text-gray-500">Up to 5 images • JPG, PNG</p>
                <input
                  id="diagnosis-images"
                  type="file"
                  multiple
                  accept="image/*"
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
                        className="w-full aspect-square object-cover rounded-xl"
                      />
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
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
              <h3 className="font-bold text-gray-900">Additional Information</h3>
              <p className="text-gray-500 text-sm">
                Provide more details to help the AI make an accurate diagnosis
              </p>

              {/* Summary */}
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <SelectedIcon className="h-8 w-8 text-primary" />
                  <div>
                    <p className="font-bold text-gray-900">
                      {selectedLivestock?.name || selectedLivestock?.tagId}
                    </p>
                    <p className="text-sm text-gray-500">
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
                      className="w-12 h-12 rounded-lg object-cover flex-shrink-0"
                    />
                  ))}
                </div>
              </div>

              {/* Affected count for batch livestock */}
              {isBatch && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <label className="text-sm font-bold text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    How many animals are affected? *
                  </label>
                  <p className="text-xs text-amber-700 mt-1 mb-2">
                    This batch contains {batchQuantity} animals. Specify how many are showing symptoms.
                  </p>
                  <Input
                    type="number"
                    min="1"
                    max={batchQuantity}
                    required
                    value={affectedCount}
                    onChange={(e) => setAffectedCount(e.target.value)}
                    placeholder={`Enter number (1 - ${batchQuantity})`}
                    className="bg-white"
                  />
                </div>
              )}

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Observed Symptoms (comma separated)
                </label>
                <textarea
                  value={symptoms}
                  onChange={(e) => setSymptoms(e.target.value)}
                  placeholder="e.g., loss of appetite, limping, discharge from eyes..."
                  className="mt-2 w-full min-h-[100px] bg-white border border-gray-200 rounded-xl p-4 text-sm"
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-100 p-6 flex gap-4">
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
              disabled={isSubmitting || images.length === 0}
              onClick={handleSubmit}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Start Diagnosis
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    </div>
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Loading farms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
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
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Stethoscope className="h-8 w-8 text-primary" />
              AI Health Diagnosis
            </h1>
            <p className="text-gray-500 mt-1">
              Upload photos for instant AI-powered health assessment
            </p>
          </div>
          
          <div className="flex gap-3">
            <select
              value={farmId || ''}
              onChange={(e) => setSearchParams({ farmId: e.target.value })}
              className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-medium"
            >
              {farms?.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.name}</option>
              ))}
            </select>
            <Button onClick={() => refetch()} variant="outline" className="rounded-xl h-12">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Link to={`/vet-consultation?farmId=${encodeURIComponent(farmId)}`} className="inline-flex">
              <Button variant="outline" className="rounded-xl h-12 px-6">
                <MessageCircle className="h-4 w-4 mr-2" />
                Vet AI
              </Button>
            </Link>

            <Button onClick={() => setShowNewDiagnosis(true)} className="rounded-xl h-12 px-6">
              <Camera className="h-4 w-4 mr-2" />
              New Diagnosis
            </Button>
          </div>
        </div>
      </div>

      {/* Processing Diagnoses */}
      {groupedDiagnoses.processing.length > 0 && (
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
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
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
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
          <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-500" />
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
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-32 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : diagnoses?.length === 0 && (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
          <div className="bg-primary/10 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <Stethoscope className="h-12 w-12 text-primary/50" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">No diagnoses yet</h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            Upload photos of your livestock for AI-powered health assessment
          </p>
          <Button onClick={() => setShowNewDiagnosis(true)} className="rounded-xl h-12 px-8">
            <Camera className="h-4 w-4 mr-2" />
            Start First Diagnosis
          </Button>
        </div>
      )}
    </div>
  );
};

export default LivestockDiagnosisPage;
