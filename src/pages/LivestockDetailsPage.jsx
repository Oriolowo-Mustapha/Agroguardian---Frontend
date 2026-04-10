import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  PawPrint,
  Heart,
  Scale,
  Calendar,
  Trash2,
  Plus,
  ChevronRight,
  Activity,
  Bug,
  Syringe,
  Pill,
  Stethoscope,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  LineChart,
  Beef,
  Bird,
  Fish,
  Rabbit,
  Baby,
  FileText,
  History,
  MapPin,
  X,
  Loader2,
  Skull
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

const speciesColors = {
  cattle: 'bg-amber-500',
  goat: 'bg-emerald-500',
  sheep: 'bg-blue-500',
  pig: 'bg-pink-500',
  poultry: 'bg-orange-500',
  fish: 'bg-cyan-500'
};

const HealthStatusBadge = ({ status }) => {
  const configs = {
    healthy: { label: 'Healthy', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
    sick: { label: 'Sick', color: 'bg-red-100 text-red-700', icon: AlertTriangle },
    recovering: { label: 'Recovering', color: 'bg-blue-100 text-blue-700', icon: Activity },
    under_treatment: { label: 'Under Treatment', color: 'bg-amber-100 text-amber-700', icon: Syringe },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-700 animate-pulse', icon: AlertTriangle },
    deceased: { label: 'Deceased', color: 'bg-gray-200 text-gray-700', icon: Skull }
  };
  const config = configs[status] || configs.healthy;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold ${config.color}`}>
      <Icon className="h-4 w-4" />
      {config.label}
    </span>
  );
};

const InfoItem = ({ icon, label, value, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="bg-gray-100 p-2 rounded-lg">
      {icon ? React.createElement(icon, { className: 'h-4 w-4 text-gray-600' }) : null}
    </div>
    <div>
      <p className="text-xs text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="font-bold text-gray-900">{value || '-'}</p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label, count }) => (
  <button
    onClick={onClick}
    className={`flex items-center gap-2 px-5 py-3 rounded-xl font-bold transition-all ${
      active 
        ? 'bg-primary text-white shadow-lg shadow-primary/20' 
        : 'bg-white text-gray-600 hover:bg-gray-50 border border-gray-100'
    }`}
  >
    {icon ? React.createElement(icon, { className: 'h-4 w-4' }) : null}
    {label}
    {count > 0 && (
      <span className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
        active ? 'bg-white/20' : 'bg-primary/10 text-primary'
      }`}>
        {count}
      </span>
    )}
  </button>
);

const LivestockDetailsPage = () => {
  const { livestockId } = useParams();
  const navigate = useNavigate();
  const goBack = useNavigateBack('/livestock');
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState('overview');
  const [showDeleteConfirm, setShowDeleteConfirm] = React.useState(false);
  const [showHealthAddMenu, setShowHealthAddMenu] = React.useState(false);

  const [showAddWeightModal, setShowAddWeightModal] = React.useState(false);
  const [weightFormError, setWeightFormError] = React.useState(null);
  const [weightForm, setWeightForm] = React.useState({
    weight: '',
    unit: 'kg',
    notes: ''
  });

  const [showDeathModal, setShowDeathModal] = React.useState(false);
  const [deathFormError, setDeathFormError] = React.useState(null);
  const [deathForm, setDeathForm] = React.useState({
    quantity: 1,
    unitPrice: '',
    causeOfDeath: 'disease',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  React.useEffect(() => {
    setShowHealthAddMenu(false);
  }, [activeTab]);

  const looksLikeLivestock = (obj) =>
    !!obj && typeof obj === 'object' && 'species' in obj;

  const formatDate = (value) => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d.toLocaleDateString();
  };

  const getApiErrorMessage = (err) => {
    // Axios-ish error shape
    const messageFromServer = err?.response?.data?.message;
    const status = err?.response?.status;
    const base = messageFromServer || err?.message || 'Request failed';
    return status ? `${base} (HTTP ${status})` : base;
  };

  // Fetch livestock details
  const { data: livestock, isLoading, error: livestockError } = useQuery({
    queryKey: ['livestock-details', livestockId],
    enabled: !!livestockId,
    queryFn: async () => {
      const response = await api.get(`/livestock/${livestockId}`);

      // Backend returns: { success, message, data: { livestock, healthRecords } }
      const data = response.data?.data ?? response.data;
      const livestockObj = data?.livestock ?? data;
      const healthRecords = data?.healthRecords;

      if (!looksLikeLivestock(livestockObj)) {
        throw new Error('Unexpected livestock details response shape');
      }

      return {
        ...livestockObj,
        healthRecords: Array.isArray(healthRecords) ? healthRecords : []
      };
    }
  });

  // Fetch full health records (same source as /livestock/:id/health page)
  const {
    data: fullHealthRecords,
    isLoading: isFullHealthRecordsLoading
  } = useQuery({
    queryKey: ['livestock-health', livestockId],
    enabled: !!livestockId,
    queryFn: async () => {
      const response = await api.get(`/livestock-health/${livestockId}/all`);
      return response.data?.data ?? null;
    }
  });

  const farmId = livestock?.farmId?._id || livestock?.farmId;

  // Fetch breeding records for this farm, then filter down to this livestock.
  const {
    data: farmBreedingData,
    isLoading: isFarmBreedingLoading
  } = useQuery({
    queryKey: ['breeding-records-farm', farmId],
    enabled: !!farmId,
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${farmId}/breeding`);
      return res.data;
    }
  });

  // Fetch latest health-check report
  const {
    data: healthCheckReport,
    isLoading: isHealthCheckLoading,
    isFetching: isHealthCheckFetching,
    isError: isHealthCheckError,
    error: healthCheckError,
    refetch: refetchHealthCheck
  } = useQuery({
    queryKey: ['livestock-healthcheck', livestockId],
    enabled: !!livestockId,
    queryFn: async () => {
      const response = await api.get(`/livestock/${livestockId}/health-check`);
      return response.data?.data ?? null;
    }
  });

  const recomputeHealthCheckMutation = useMutation({
    mutationFn: () => api.post(`/livestock/${livestockId}/health-check/recompute`),
    onSuccess: () => {
      // Immediately mark the cached report stale, then refresh.
      queryClient.invalidateQueries({ queryKey: ['livestock-healthcheck', livestockId] });

      // Background job: best-effort refresh after a short delay.
      setTimeout(() => {
        refetchHealthCheck();
      }, 1200);
    }
  });

  const addWeightMutation = useMutation({
    mutationFn: (payload) => api.post(`/livestock/${livestockId}/weight`, payload),
    onSuccess: () => {
      setShowAddWeightModal(false);
      setWeightFormError(null);
      setWeightForm({ weight: '', unit: 'kg', notes: '' });

      queryClient.invalidateQueries({ queryKey: ['livestock-details', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['livestock-healthcheck', livestockId] });
    }
  });

  const logDeathMutation = useMutation({
    mutationFn: async (payload) => {
      if (!farmId) throw new Error('Farm not found for this livestock');
      const res = await api.post(`/livestock-inventory/farms/${farmId}/transactions`, payload);
      return res.data;
    },
    onSuccess: () => {
      setShowDeathModal(false);
      setDeathFormError(null);

      queryClient.invalidateQueries({ queryKey: ['livestock-details', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['livestock-healthcheck', livestockId] });
      queryClient.invalidateQueries({ queryKey: ['inventory-transactions'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['financial-summary'] });
      queryClient.invalidateQueries({ queryKey: ['mortality-report'] });
      queryClient.invalidateQueries({ queryKey: ['livestock'] });
    }
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: () => api.delete(`/livestock/${livestockId}`),
    onSuccess: () => {
      navigate('/livestock');
      queryClient.invalidateQueries(['livestock']);
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-64 bg-white rounded-3xl" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-white rounded-3xl lg:col-span-2" />
          <div className="h-48 bg-white rounded-3xl" />
        </div>
      </div>
    );
  }

  if (livestockError || !livestock) {
    return (
      <div className="text-center py-24 bg-white rounded-3xl">
        <AlertTriangle className="h-16 w-16 text-red-400 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Livestock not found</h3>
        <p className="text-gray-500 mb-6">The animal you're looking for doesn't exist.</p>
        <Button onClick={goBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
      </div>
    );
  }

  const SpeciesIcon = speciesIcons[livestock.species] || PawPrint;
  const speciesColor = speciesColors[livestock.species] || 'bg-gray-500';

  const livestockIdRaw = livestock._id ?? livestock.id;
  const livestockIdSuffix = typeof livestockIdRaw === 'string'
    ? livestockIdRaw.slice(-4)
    : livestockIdRaw?.toString?.().slice(-4);

  const healthRecordsFromDetails = Array.isArray(livestock.healthRecords) ? livestock.healthRecords : [];
  const weightHistory = Array.isArray(livestock.weightHistory) ? livestock.weightHistory : [];
  const recentWeightHistory = weightHistory.slice(-5).reverse();

  const flattenedHealthRecordsAll = (() => {
    if (!fullHealthRecords) return healthRecordsFromDetails;

    const records = [];
    fullHealthRecords.vaccinations?.forEach((r) =>
      records.push({ ...r, type: 'vaccination', date: r.dateAdministered || r.createdAt })
    );
    fullHealthRecords.treatments?.forEach((r) =>
      records.push({ ...r, type: 'treatment', date: r.startDate || r.createdAt })
    );
    fullHealthRecords.illnesses?.forEach((r) =>
      records.push({ ...r, type: 'illness', date: r.dateIdentified || r.createdAt })
    );
    fullHealthRecords.checkups?.forEach((r) =>
      records.push({ ...r, type: 'checkup', date: r.checkupDate || r.createdAt })
    );
    fullHealthRecords.dewormings?.forEach((r) =>
      records.push({ ...r, type: 'deworming', date: r.dateAdministered || r.createdAt })
    );

    return records.sort((a, b) => new Date(b.date || b.createdAt) - new Date(a.date || a.createdAt));
  })();

  const healthRecordsCount = !fullHealthRecords
    ? flattenedHealthRecordsAll.length
    : (
        (fullHealthRecords.vaccinations?.length || 0) +
        (fullHealthRecords.treatments?.length || 0) +
        (fullHealthRecords.illnesses?.length || 0) +
        (fullHealthRecords.checkups?.length || 0) +
        (fullHealthRecords.dewormings?.length || 0)
      );

  const healthRecords = flattenedHealthRecordsAll.slice(0, 30);

  // Calculate age
  const parseDateInput = (value) => {
    if (!value) return null;

    // If we get a plain date (YYYY-MM-DD), treat it as a local calendar date (avoids timezone surprises).
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map((v) => Number(v));
        return new Date(y, m - 1, d);
      }

      return new Date(trimmed);
    }

    return new Date(value);
  };

  const getAge = () => {
    if (!livestock.dateOfBirth) return null;

    const dob = parseDateInput(livestock.dateOfBirth);
    if (!dob || Number.isNaN(dob.getTime())) return null;

    const now = new Date();
    const msPerDay = 24 * 60 * 60 * 1000;

    // Use calendar-day difference for plain date inputs (DST-safe via Math.round).
    const isPlainDate =
      typeof livestock.dateOfBirth === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(livestock.dateOfBirth.trim());

    const days = isPlainDate
      ? Math.max(
          0,
          Math.round(
            (new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime() -
              new Date(dob.getFullYear(), dob.getMonth(), dob.getDate()).getTime()) /
              msPerDay
          )
        )
      : Math.max(0, Math.floor((now.getTime() - dob.getTime()) / msPerDay));

    if (days === 0) return 'Today';

    if (livestock.species === 'poultry') {
      const weeks = Math.floor(days / 7);
      const remDays = days % 7;
      if (weeks <= 0) return `${days} day${days === 1 ? '' : 's'}`;
      return `${weeks} week${weeks === 1 ? '' : 's'}${remDays ? ` ${remDays} day${remDays === 1 ? '' : 's'}` : ''}`;
    }

    const years = Math.floor(days / 365.25);
    const months = Math.floor((days % 365.25) / 30.44);

    if (years > 0) return `${years} year${years > 1 ? 's' : ''}${months > 0 ? ` ${months} mo` : ''}`;
    if (months > 0) return `${months} month${months !== 1 ? 's' : ''}`;

    return `${days} day${days === 1 ? '' : 's'}`;
  };

  const isBatchDepleted = livestock.trackingType === 'batch' && Number(livestock.quantity || 0) <= 0;
  const isDeceased = livestock.status === 'deceased' || isBatchDepleted;
  const isSold = livestock.status === 'sold';
  const isActionLocked = isDeceased || isSold;

  const displayHealthStatus = isDeceased ? 'deceased' : livestock.healthStatus;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
            <div className="bg-red-100 h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-6">
              <Trash2 className="h-8 w-8 text-red-500" />
            </div>
            <h3 className="text-2xl font-bold text-center text-gray-900 mb-2">Delete Livestock?</h3>
            <p className="text-center text-gray-500 mb-8">
              This will permanently delete {livestock.tagId || 'this livestock'} and all related records.
            </p>
            <div className="flex gap-4">
              <Button 
                variant="outline" 
                className="flex-1 h-12 rounded-xl"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </Button>
              <Button 
                variant="destructive"
                className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending || isActionLocked}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Add Weight Modal */}
      {showAddWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-primary/10 p-2 rounded-xl">
                  <Scale className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">Add Weight</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowAddWeightModal(false);
                  setWeightFormError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setWeightFormError(null);

                const weight = Number.parseFloat(weightForm.weight);
                if (!Number.isFinite(weight) || weight <= 0) {
                  setWeightFormError('Please enter a valid weight.');
                  return;
                }

                if (isActionLocked) {
                  setWeightFormError('This livestock is deceased. Actions are disabled.');
                  return;
                }

                addWeightMutation.mutate({
                  weight,
                  unit: weightForm.unit,
                  notes: weightForm.notes || undefined
                });
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-sm font-bold text-gray-700">
                  {livestock.trackingType === 'batch' ? 'Average weight (per animal)' : 'Weight'}
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={weightForm.weight}
                  onChange={(e) => setWeightForm({ ...weightForm, weight: e.target.value })}
                  placeholder="e.g., 2.5"
                  className="mt-1 rounded-xl h-12"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Unit</label>
                <select
                  value={weightForm.unit}
                  onChange={(e) => setWeightForm({ ...weightForm, unit: e.target.value })}
                  className="mt-1 w-full h-12 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="kg">kg</option>
                  <option value="lbs">lbs</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Notes</label>
                <textarea
                  value={weightForm.notes}
                  onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
                  placeholder="Optional"
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-gray-200 p-3 text-sm"
                />
              </div>

              {weightFormError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">{weightFormError}</p>
                </div>
              ) : null}

              {addWeightMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">Failed to record weight</p>
                  <p className="text-sm text-red-700/90">{getApiErrorMessage(addWeightMutation.error)}</p>
                  <p className="text-xs text-red-700/80 mt-1">
                    Endpoint: <span className="font-mono">POST /livestock/{livestockId}/weight</span>
                  </p>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => {
                    setShowAddWeightModal(false);
                    setWeightFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 h-12 rounded-xl"
                  disabled={addWeightMutation.isPending}
                >
                  {addWeightMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Log Death Modal */}
      {showDeathModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="bg-red-500/10 p-2 rounded-xl">
                  <Skull className="h-5 w-5 text-red-600" />
                </div>
                <h3 className="text-xl font-bold text-gray-900">
                  {livestock.trackingType === 'batch' ? 'Log Deaths' : 'Mark as Deceased'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowDeathModal(false);
                  setDeathFormError(null);
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 mb-4">
              <p className="text-sm font-bold text-amber-800">This action updates inventory & profit</p>
              <p className="text-xs text-amber-800/90">
                It will reduce batch quantity (or mark the animal as deceased) and record a financial loss so other features stay consistent.
              </p>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setDeathFormError(null);

                const isBatch = livestock.trackingType === 'batch';
                const maxQty = isBatch ? Number(livestock.quantity || 0) : 1;

                const qty = isBatch ? Number.parseInt(String(deathForm.quantity || 1), 10) : 1;
                if (!Number.isFinite(qty) || qty <= 0) {
                  setDeathFormError('Please enter a valid quantity.');
                  return;
                }
                if (isBatch && Number.isFinite(maxQty) && maxQty > 0 && qty > maxQty) {
                  setDeathFormError(`Death quantity (${qty}) cannot exceed batch quantity (${maxQty}).`);
                  return;
                }

                const unitPriceRaw = String(deathForm.unitPrice ?? '').trim();
                const unitPrice = unitPriceRaw === '' ? undefined : Number(unitPriceRaw);
                if (unitPriceRaw !== '' && (!Number.isFinite(unitPrice) || unitPrice < 0)) {
                  setDeathFormError('Estimated value per animal must be a valid number.');
                  return;
                }

                logDeathMutation.mutate({
                  transactionType: 'death',
                  livestockId,
                  species: livestock.species,
                  quantity: qty,
                  transactionDate: deathForm.date,
                  unitPrice,
                  causeOfDeath: deathForm.causeOfDeath || undefined,
                  notes: deathForm.notes || undefined
                });
              }}
              className="space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-bold text-gray-700">Quantity</label>
                  <Input
                    type="number"
                    min="1"
                    max={livestock.trackingType === 'batch' ? String(livestock.quantity || '') : '1'}
                    value={livestock.trackingType === 'batch' ? deathForm.quantity : 1}
                    disabled={livestock.trackingType !== 'batch'}
                    onChange={(e) => setDeathForm({ ...deathForm, quantity: e.target.value })}
                    className="mt-1 rounded-xl h-12 disabled:bg-gray-50"
                  />
                  {livestock.trackingType === 'batch' && (
                    <p className="text-xs text-gray-500 mt-1">Available in batch: {Number(livestock.quantity || 0)}</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-bold text-gray-700">Date</label>
                  <Input
                    type="date"
                    value={deathForm.date}
                    onChange={(e) => setDeathForm({ ...deathForm, date: e.target.value })}
                    className="mt-1 rounded-xl h-12"
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Estimated value per animal (₦)</label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={deathForm.unitPrice}
                  onChange={(e) => setDeathForm({ ...deathForm, unitPrice: e.target.value })}
                  placeholder="Auto-filled from selling value"
                  className="mt-1 rounded-xl h-12"
                />
                <p className="text-xs text-gray-500 mt-1">Leave empty to auto-calculate from the livestock selling value.</p>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Cause of death</label>
                <select
                  value={deathForm.causeOfDeath}
                  onChange={(e) => setDeathForm({ ...deathForm, causeOfDeath: e.target.value })}
                  className="mt-1 w-full h-12 rounded-xl border border-gray-200 bg-white px-3 text-sm"
                >
                  <option value="disease">Disease</option>
                  <option value="accident">Accident</option>
                  <option value="predator">Predator</option>
                  <option value="old_age">Old Age</option>
                  <option value="unknown">Unknown</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">Notes</label>
                <textarea
                  value={deathForm.notes}
                  onChange={(e) => setDeathForm({ ...deathForm, notes: e.target.value })}
                  placeholder="Optional"
                  className="mt-1 w-full min-h-[90px] rounded-xl border border-gray-200 p-3 text-sm"
                />
              </div>

              {deathFormError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">{deathFormError}</p>
                </div>
              ) : null}

              {logDeathMutation.isError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                  <p className="text-sm font-bold text-red-700">Failed to log death</p>
                  <p className="text-sm text-red-700/90">{getApiErrorMessage(logDeathMutation.error)}</p>
                </div>
              ) : null}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 h-12 rounded-xl"
                  onClick={() => {
                    setShowDeathModal(false);
                    setDeathFormError(null);
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="destructive"
                  className="flex-1 h-12 rounded-xl bg-red-500 hover:bg-red-600"
                  disabled={logDeathMutation.isPending}
                >
                  {logDeathMutation.isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Saving…
                    </>
                  ) : (
                    <>
                      <Skull className="h-4 w-4 mr-2" />
                      Confirm
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={goBack}
        className="text-gray-500 hover:text-gray-900 -ml-2"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Livestock
      </Button>

      {/* Header Card */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="relative">
          {/* Cover Image/Color */}
          <div className={`h-48 ${livestock.imageUrls?.[0] ? '' : speciesColor}`}>
            {livestock.imageUrls?.[0] && (
              <img 
                src={livestock.imageUrls[0]} 
                alt={livestock.tagId || livestock.species} 
                className="w-full h-full object-cover"
              />
            )}
          </div>

          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-8">
            <div className={`h-28 w-28 rounded-3xl border-4 border-white shadow-lg overflow-hidden ${speciesColor}`}>
              {livestock.imageUrls?.[0] ? (
                <img 
                  src={livestock.imageUrls[0]} 
                  alt={livestock.tagId || livestock.species} 
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <SpeciesIcon className="h-12 w-12 text-white/80" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button 
              variant="outline" 
              className="bg-white/90 backdrop-blur rounded-xl text-red-500 hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isActionLocked}
              title={isActionLocked ? 'This livestock is no longer active.' : undefined}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="pt-16 pb-8 px-8">
          <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-black text-gray-900">
                  {livestock.tagId || `${livestock.species || 'Livestock'} #${livestockIdSuffix || '----'}`}
                </h1>
                <HealthStatusBadge status={displayHealthStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-4 text-gray-500">
                <span className="capitalize font-medium">{livestock.breed || livestock.species || '-'}</span>
                {livestock.tagId && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" />
                    {livestock.tagId}
                  </span>
                )}
                {livestock.gender && livestock.gender !== 'unknown' && (
                  <span className="capitalize">{livestock.gender}</span>
                )}
                {livestock.trackingType === 'batch' && (
                  <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-bold">
                    Batch: {livestock.quantity} animals
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="flex gap-6">
              {livestock.weight && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{livestock.weight} kg</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Weight</p>
                </div>
              )}
              {getAge() && (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">{getAge()}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Age</p>
                </div>
              )}
              {(livestock.cost ?? livestock.acquisitionCost) ? (
                <div className="text-center">
                  <p className="text-2xl font-black text-gray-900">₦{(livestock.cost ?? livestock.acquisitionCost).toLocaleString()}</p>
                  <p className="text-xs text-gray-500 uppercase tracking-wider">Value</p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-3">
        <TabButton 
          active={activeTab === 'overview'} 
          onClick={() => setActiveTab('overview')}
          icon={Activity}
          label="Overview"
        />
        <TabButton 
          active={activeTab === 'health'} 
          onClick={() => setActiveTab('health')}
          icon={Heart}
          label="Health Records"
          count={healthRecordsCount || 0}
        />
        <TabButton 
          active={activeTab === 'weight'} 
          onClick={() => setActiveTab('weight')}
          icon={TrendingUp}
          label="Growth"
          count={livestock.weightHistory?.length || 0}
        />
        <TabButton 
          active={activeTab === 'breeding'} 
          onClick={() => setActiveTab('breeding')}
          icon={Baby}
          label="Breeding"
        />
        <TabButton 
          active={activeTab === 'history'} 
          onClick={() => setActiveTab('history')}
          icon={History}
          label="Activity"
        />
      </div>

      {/* Tab Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {activeTab === 'overview' && (
            <>
              {/* Basic Information */}
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader>
                  <CardTitle className="text-xl font-bold">Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  <InfoItem icon={PawPrint} label="Species" value={livestock.species?.charAt(0).toUpperCase() + livestock.species?.slice(1)} />
                  <InfoItem icon={FileText} label="Breed" value={livestock.breed} />
                  <InfoItem
                    icon={Calendar}
                    label={livestock.species === 'poultry' && livestock.trackingType === 'batch' ? 'Hatch Date' : 'Date of Birth'}
                    value={formatDate(livestock.dateOfBirth)}
                  />
                  <InfoItem icon={Scale} label="Current Weight" value={livestock.weight ? `${livestock.weight} kg` : null} />
                  <InfoItem icon={Calendar} label="Acquired" value={formatDate(livestock.acquisitionDate)} />
                  <InfoItem icon={Activity} label="Acquisition Method" value={livestock.acquisitionMethod?.charAt(0).toUpperCase() + livestock.acquisitionMethod?.slice(1)} />
                  {livestock.color && (
                    <InfoItem icon={PawPrint} label="Color/Markings" value={livestock.color} />
                  )}
                  {livestock.housingUnit && (
                    <InfoItem icon={MapPin} label="Housing Unit" value={livestock.housingUnit} />
                  )}
                </CardContent>
              </Card>

              {/* Health Check */}
              <Card className="border-none shadow-sm rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-xl font-bold">Health Check</CardTitle>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => refetchHealthCheck()}
                      disabled={isActionLocked || isHealthCheckFetching}
                    >
                      {isHealthCheckFetching ? 'Refreshing…' : 'Refresh'}
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => recomputeHealthCheckMutation.mutate()}
                      disabled={isActionLocked || recomputeHealthCheckMutation.isPending}
                    >
                      {recomputeHealthCheckMutation.isPending ? 'Recomputing…' : 'Recompute'}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isHealthCheckLoading ? (
                    <p className="text-gray-500">Loading health check…</p>
                  ) : isHealthCheckError ? (
                    <div className="space-y-3">
                      <p className="text-sm font-bold text-red-600">Health check request failed</p>
                      <p className="text-sm text-gray-600">{getApiErrorMessage(healthCheckError)}</p>
                      <p className="text-xs text-gray-500">
                        Endpoint: <span className="font-mono">GET /livestock/{livestockId}/health-check</span>
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {recomputeHealthCheckMutation.isError ? (
                        <div className="rounded-2xl border border-red-200 bg-red-50 p-3">
                          <p className="text-sm font-bold text-red-700">Recompute failed</p>
                          <p className="text-sm text-red-700/90">{getApiErrorMessage(recomputeHealthCheckMutation.error)}</p>
                          <p className="text-xs text-red-700/80 mt-1">
                            Endpoint: <span className="font-mono">POST /livestock/{livestockId}/health-check/recompute</span>
                          </p>
                        </div>
                      ) : null}

                      {healthCheckReport ? (
                        <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <p className="font-bold text-gray-900">Overall</p>
                        <span
                          className={`px-3 py-1 rounded-full text-sm font-bold ${
                            healthCheckReport.overallStatus === 'critical'
                              ? 'bg-red-100 text-red-700'
                              : healthCheckReport.overallStatus === 'warning'
                              ? 'bg-amber-100 text-amber-700'
                              : healthCheckReport.overallStatus === 'ok'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {healthCheckReport.overallStatus || 'unknown'}
                        </span>
                      </div>

                      {Array.isArray(healthCheckReport.checks) && healthCheckReport.checks.length > 0 ? (
                        <div className="space-y-3">
                          <p className="text-xs text-gray-500">
                            Generated: {healthCheckReport.generatedAt ? new Date(healthCheckReport.generatedAt).toLocaleString() : '—'}
                            {healthCheckReport.ai?.used ? ` • AI enhanced${healthCheckReport.ai?.model ? ` (${healthCheckReport.ai.model})` : ''}` : ''}
                          </p>

                          {healthCheckReport.ai?.summary ? (
                            <div className="rounded-2xl border border-gray-200 bg-white p-3">
                              <p className="text-xs font-bold text-gray-700">AI Summary</p>
                              <p className="mt-1 text-sm text-gray-700">{healthCheckReport.ai.summary}</p>
                            </div>
                          ) : null}

                          {healthCheckReport.checks.map((check) => {
                            const findings = Array.isArray(check.findings) ? check.findings : [];
                            const recs = Array.isArray(check.recommendations) ? check.recommendations : [];

                            return (
                              <div
                                key={check.key}
                                className={`p-3 rounded-2xl ${
                                  check.key === 'ai_diagnosis_alert'
                                    ? 'border border-amber-200 bg-amber-50'
                                    : 'bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between">
                                  <p className="font-bold text-gray-900">{check.title || check.key}</p>
                                  <span
                                    className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                      check.status === 'critical'
                                        ? 'bg-red-100 text-red-700'
                                        : check.status === 'warning'
                                        ? 'bg-amber-100 text-amber-700'
                                        : check.status === 'ok'
                                        ? 'bg-green-100 text-green-700'
                                        : 'bg-gray-100 text-gray-700'
                                    }`}
                                  >
                                    {check.status}
                                  </span>
                                </div>

                                {findings.length > 0 ? (
                                  <ul className="mt-2 list-disc list-inside text-sm text-gray-600 space-y-1">
                                    {findings.map((f, idx) => (
                                      <li key={idx}>{f}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  <p className="mt-2 text-sm text-gray-500">No findings.</p>
                                )}

                                {recs.length > 0 ? (
                                  <>
                                    <p className="mt-3 text-xs font-bold text-gray-700">Recommendations</p>
                                    <ul className="mt-1 list-disc list-inside text-sm text-gray-600 space-y-1">
                                      {recs.map((r, idx) => (
                                        <li key={idx}>{r}</li>
                                      ))}
                                    </ul>
                                  </>
                                ) : null}


                              </div>
                            );
                          })}

                          <p className="text-xs text-gray-500">
                            Note: for batch registrations, weight is treated as average weight per animal.
                          </p>
                        </div>
                      ) : (
                        <p className="text-gray-500">No checks available yet.</p>
                      )}
                    </div>
                      ) : (
                        <p className="text-gray-500">No health-check report yet. Click “Recompute”.</p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Weight History */}
              {livestock.weightHistory?.length > 0 && (
                <Card className="border-none shadow-sm rounded-3xl">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-xl font-bold">Weight History</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('weight')}>
                      View All <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentWeightHistory.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-3">
                            <div className="bg-primary/10 p-2 rounded-lg">
                              <Scale className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-bold text-gray-900">{entry.weight} kg</p>
                              <p className="text-xs text-gray-500">
                                {formatDate(entry.recordedAt)}
                              </p>
                            </div>
                          </div>
                          {idx < recentWeightHistory.length - 1 && recentWeightHistory[idx + 1] && (
                            <span className={`text-sm font-bold ${
                              entry.weight > recentWeightHistory[idx + 1].weight 
                                ? 'text-green-600' 
                                : 'text-red-600'
                            }`}>
                              {entry.weight > recentWeightHistory[idx + 1].weight ? '+' : ''}
                              {(entry.weight - recentWeightHistory[idx + 1].weight).toFixed(1)} kg
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notes */}
              {livestock.notes && (
                <Card className="border-none shadow-sm rounded-3xl">
                  <CardHeader>
                    <CardTitle className="text-xl font-bold">Notes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-600 whitespace-pre-wrap">{livestock.notes}</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}

          {activeTab === 'health' && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">Health Records</CardTitle>
                <div className="relative">
                  <Button
                    className="rounded-xl"
                    onClick={() => {
                      if (isActionLocked) return;
                      setShowHealthAddMenu(!showHealthAddMenu);
                    }}
                    disabled={isActionLocked}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Record
                  </Button>

                  {showHealthAddMenu && !isActionLocked && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowHealthAddMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                        <button
                          onClick={() => {
                            setShowHealthAddMenu(false);
                            navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } });
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Syringe className="h-4 w-4 text-blue-500" />
                          <span className="font-medium">Vaccination</span>
                        </button>

                        <button
                          onClick={() => {
                            setShowHealthAddMenu(false);
                            navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'deworming' } });
                          }}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                        >
                          <Activity className="h-4 w-4 text-purple-500" />
                          <span className="font-medium">Deworming</span>
                        </button>

                        <button
                          onClick={() => setShowHealthAddMenu(false)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <Bug className="h-4 w-4 text-red-500" />
                          <span className="font-medium">Illness</span>
                          <span className="text-xs text-gray-400 ml-auto">Soon</span>
                        </button>

                        <button
                          onClick={() => setShowHealthAddMenu(false)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <Pill className="h-4 w-4 text-amber-500" />
                          <span className="font-medium">Treatment</span>
                          <span className="text-xs text-gray-400 ml-auto">Soon</span>
                        </button>

                        <button
                          onClick={() => setShowHealthAddMenu(false)}
                          className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                          disabled
                        >
                          <Stethoscope className="h-4 w-4 text-green-500" />
                          <span className="font-medium">Checkup</span>
                          <span className="text-xs text-gray-400 ml-auto">Soon</span>
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {isFullHealthRecordsLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">Loading health records…</p>
                  </div>
                ) : healthRecords.length > 0 ? (
                  <div className="space-y-4">
                    {healthRecords.map((record, idx) => (
                      <div key={idx} className="p-4 border border-gray-100 rounded-2xl">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            {record.type === 'vaccination' && <Syringe className="h-5 w-5 text-blue-500" />}
                            {record.type === 'treatment' && <Pill className="h-5 w-5 text-amber-500" />}
                            {record.type === 'checkup' && <Stethoscope className="h-5 w-5 text-green-500" />}
                            {record.type === 'deworming' && <Activity className="h-5 w-5 text-purple-500" />}
                            {record.type === 'illness' && <AlertTriangle className="h-5 w-5 text-red-500" />}
                            <div>
                              <h4 className="font-bold text-gray-900 capitalize">{record.type}</h4>
                              <p className="text-sm text-gray-500">
                                {formatDate(
                                  record.date ||
                                    record.dateAdministered ||
                                    record.dateIdentified ||
                                    record.startDate ||
                                    record.checkupDate ||
                                    record.createdAt
                                )}
                              </p>
                            </div>
                          </div>
                        </div>
                        {(record.description || record.notes) && (
                          <p className="text-gray-600 text-sm">{record.description || record.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Heart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">No health records yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Start tracking vaccinations, treatments, and checkups</p>
                    <Button
                      className="rounded-xl"
                      onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } })}
                      disabled={isActionLocked}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Record
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'weight' && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle className="text-xl font-bold">Growth Tracking</CardTitle>
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setWeightFormError(null);
                    setShowAddWeightModal(true);
                  }}
                  disabled={isActionLocked}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Weight
                </Button>
              </CardHeader>
              <CardContent>
                {weightHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* Weight Chart Placeholder */}
                    <div className="bg-gray-50 rounded-2xl p-6 text-center">
                      <LineChart className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Weight chart coming soon</p>
                    </div>
                    
                    {/* Weight History List */}
                    <div className="space-y-3">
                      {weightHistory.slice().reverse().map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="bg-primary/10 p-3 rounded-xl">
                              <Scale className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="text-2xl font-black text-gray-900">{entry.weight} kg</p>
                              <p className="text-sm text-gray-500">
                                {formatDate(entry.recordedAt)}
                              </p>
                            </div>
                          </div>
                          {entry.notes && (
                            <p className="text-sm text-gray-500 max-w-xs text-right">{entry.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Scale className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="font-bold text-gray-900 mb-2">No weight records yet</h3>
                    <p className="text-gray-500 text-sm mb-4">Track growth over time by adding weight measurements</p>
                    <Button
                      className="rounded-xl"
                      onClick={() => {
                        setWeightFormError(null);
                        setShowAddWeightModal(true);
                      }}
                      disabled={isActionLocked}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add First Weight
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {activeTab === 'breeding' && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Breeding Information</CardTitle>
              </CardHeader>
              <CardContent>
                {isFarmBreedingLoading ? (
                  <div className="text-center py-12">
                    <p className="text-gray-500 text-sm">Loading breeding records…</p>
                  </div>
                ) : (() => {
                  const all = farmBreedingData?.data || [];
                  const records = all
                    .filter((r) => {
                      const dam = r?.damId?._id || r?.damId;
                      const sire = r?.sireId?._id || r?.sireId;
                      return dam === livestockId || sire === livestockId;
                    })
                    .sort((a, b) => new Date(b.breedingDate || b.createdAt) - new Date(a.breedingDate || a.createdAt));

                  const latest = records[0];
                  const qs = farmId ? `?farmId=${farmId}` : '';

                  const COOLDOWN_DAYS = 60;
                  const isFemale = livestock?.gender === 'female';
                  const damRecords = isFemale
                    ? records.filter((r) => (r?.damId?._id || r?.damId) === livestockId)
                    : [];

                  const activeDamRecord = isFemale
                    ? damRecords.find(
                        (r) => r?.status === 'bred' || r?.status === 'confirmed_pregnant' || r?.isPregnant === true
                      )
                    : null;

                  const lastDelivered = isFemale
                    ? damRecords
                        .filter((r) => r?.status === 'delivered' && r?.birthDate)
                        .sort((a, b) => new Date(b.birthDate) - new Date(a.birthDate))[0]
                    : null;

                  let breedingLockReason = null;
                  if (activeDamRecord) {
                    breedingLockReason = 'Breeding locked: this female is currently in a breeding cycle.';
                  } else if (lastDelivered?.birthDate) {
                    const birth = new Date(lastDelivered.birthDate);
                    const nextEligible = new Date(birth);
                    nextEligible.setDate(nextEligible.getDate() + COOLDOWN_DAYS);
                    if (new Date().getTime() < nextEligible.getTime()) {
                      breedingLockReason = `Breeding cooldown: eligible again on ${nextEligible.toLocaleDateString()} (60 days after birth).`;
                    }
                  }

                  const canAddBreeding = !breedingLockReason;

                  if (!latest) {
                    return (
                      <div className="text-center py-12">
                        <Baby className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                        <h3 className="font-bold text-gray-900 mb-2">No breeding records yet</h3>
                        <p className="text-gray-500 text-sm mb-4">Track breeding cycles, pregnancies, and offspring</p>
                        <Button
                          className="rounded-xl"
                          onClick={() => {
                            const state = {
                              openAddModal: true,
                              prefillFemaleId: livestock.gender === 'female' ? livestockId : undefined,
                              prefillMaleId: livestock.gender === 'male' ? livestockId : undefined
                            };

                            navigate(`/livestock-breeding${qs}`, { state });
                          }}
                          disabled={isActionLocked}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Breeding Record
                        </Button>
                      </div>
                    );
                  }

                  const isPregnant = latest?.isPregnant === true || latest?.status === 'confirmed_pregnant';
                  const partner = livestock.gender === 'female'
                    ? (latest?.sireId?.name || latest?.sireId?.tagId || 'Male')
                    : (latest?.damId?.name || latest?.damId?.tagId || 'Female');

                  return (
                    <div className="space-y-4">
                      <div className="p-4 bg-gray-50 rounded-2xl border border-gray-100">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <p className="text-xs text-gray-500 uppercase tracking-wider">Latest record</p>
                            <h3 className="text-lg font-black text-gray-900 mt-1">
                              {livestock.gender === 'female' ? 'Bred with ' : 'Sired with '}
                              <span className="text-gray-700">{partner}</span>
                            </h3>
                            <div className="flex flex-wrap gap-3 text-sm text-gray-600 mt-2">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4" />
                                {latest.breedingDate ? new Date(latest.breedingDate).toLocaleDateString() : '—'}
                              </span>
                              {latest.expectedDueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4" />
                                  Due: {new Date(latest.expectedDueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isPregnant ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isPregnant ? 'Pregnant' : (latest.status || 'bred')}
                            </span>
                            {latest.breedingMethod && (
                              <span className="text-xs text-gray-500 capitalize">{latest.breedingMethod}</span>
                            )}
                          </div>
                        </div>

                        {(latest.notes || latest.observations) && (
                          <p className="text-sm text-gray-600 mt-3">{latest.notes || latest.observations}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => navigate(`/livestock-breeding${qs}`)}
                        >
                          View Breeding Records <ChevronRight className="h-4 w-4 ml-1" />
                        </Button>
                        <Button
                          className="rounded-xl"
                          disabled={!canAddBreeding}
                          onClick={() => {
                            if (!canAddBreeding) return;

                            const state = {
                              openAddModal: true,
                              prefillFemaleId: livestock.gender === 'female' ? livestockId : undefined,
                              prefillMaleId: livestock.gender === 'male' ? livestockId : undefined
                            };

                            navigate(`/livestock-breeding${qs}`, { state });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Breeding Record
                        </Button>
                      </div>

                      {!canAddBreeding && (
                        <p className="text-xs text-amber-700">{breedingLockReason}</p>
                      )}
                    </div>
                  );
                })()}
              </CardContent>
            </Card>
          )}

          {activeTab === 'history' && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-xl font-bold">Activity History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                  <h3 className="font-bold text-gray-900 mb-2">Activity log coming soon</h3>
                  <p className="text-gray-500 text-sm">All changes and events will be tracked here</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card className="border-none shadow-sm rounded-3xl">
            <CardHeader>
              <CardTitle className="text-lg font-bold">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => {
                  setActiveTab('overview');
                  recomputeHealthCheckMutation.mutate();
                }}
                disabled={isActionLocked || recomputeHealthCheckMutation.isPending}
              >
                <Stethoscope className="h-4 w-4 mr-3 text-primary" />
                {recomputeHealthCheckMutation.isPending ? 'Running…' : 'AI Health Check'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } })}
                disabled={isActionLocked}
              >
                <Syringe className="h-4 w-4 mr-3 text-blue-500" />
                Log Vaccination
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'deworming' } })}
                disabled={isActionLocked}
              >
                <Activity className="h-4 w-4 mr-3 text-purple-500" />
                Log Deworming
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => {
                  setActiveTab('weight');
                  setWeightFormError(null);
                  setShowAddWeightModal(true);
                }}
                disabled={isActionLocked}
              >
                <Scale className="h-4 w-4 mr-3 text-green-500" />
                Record Weight
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`)}
                disabled={isActionLocked}
              >
                <Pill className="h-4 w-4 mr-3 text-amber-500" />
                Add Treatment
              </Button>

              <Button
                variant="destructive"
                className="w-full justify-start rounded-xl h-12 bg-red-500 hover:bg-red-600"
                disabled={isActionLocked || !farmId}
                onClick={() => {
                  setDeathFormError(null);

                  const isBatch = livestock.trackingType === 'batch';
                  const qty = isBatch ? 1 : 1;

                  const cost = Number(livestock.cost);
                  const currentQty = Number(livestock.quantity || 0);
                  const inferredUnitPrice =
                    isBatch && Number.isFinite(cost) && Number.isFinite(currentQty) && currentQty > 0
                      ? cost / currentQty
                      : (Number.isFinite(cost) ? cost : '');

                  setDeathForm({
                    quantity: qty,
                    unitPrice: inferredUnitPrice === '' ? '' : String(inferredUnitPrice),
                    causeOfDeath: 'disease',
                    notes: '',
                    date: new Date().toISOString().split('T')[0]
                  });

                  setShowDeathModal(true);
                }}
              >
                <Skull className="h-4 w-4 mr-3" />
                {livestock.trackingType === 'batch' ? 'Log Deaths' : 'Mark as Deceased'}
              </Button>
            </CardContent>
          </Card>

          {/* Lineage */}
          {(livestock.sireId || livestock.damId) && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Lineage</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {livestock.sireId && (
                  <Link to={`/livestock/${livestock.sireId._id || livestock.sireId}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="bg-blue-100 p-2 rounded-lg">
                      <PawPrint className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Sire (Father)</p>
                      <p className="font-bold text-gray-900">
                        {livestock.sireId?.name || livestock.sireId?.tagId || 'View'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                )}
                {livestock.damId && (
                  <Link to={`/livestock/${livestock.damId._id || livestock.damId}`} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                    <div className="bg-pink-100 p-2 rounded-lg">
                      <PawPrint className="h-4 w-4 text-pink-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-xs text-gray-500">Dam (Mother)</p>
                      <p className="font-bold text-gray-900">
                        {livestock.damId?.name || livestock.damId?.tagId || 'View'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  </Link>
                )}
              </CardContent>
            </Card>
          )}

          {/* Farm Info */}
          {livestock.farmId && (
            <Card className="border-none shadow-sm rounded-3xl">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Farm</CardTitle>
              </CardHeader>
              <CardContent>
                <Link 
                  to={`/farms/${livestock.farmId._id || livestock.farmId}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <div className="bg-green-100 p-2 rounded-lg">
                    <MapPin className="h-4 w-4 text-green-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-gray-900">
                      {livestock.farmId?.name || 'View Farm'}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export { LivestockDetailsPage };
export default LivestockDetailsPage;
