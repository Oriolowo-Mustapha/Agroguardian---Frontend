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
  Skull
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from '../components/ui/ModalShell';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import { SectionCard, MiniStat } from '../components/ui/SectionCard';
import { cn } from '../lib/utils';

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
    deceased: { label: 'Deceased', color: 'bg-muted text-muted-foreground', icon: Skull }
  };
  const config = configs[status] || configs.healthy;
  const Icon = config.icon;
  
  return (
    <span className={`inline-flex items-center gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-sm font-bold ${config.color}`}>
      <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
      {config.label}
    </span>
  );
};

const InfoItem = ({ icon, label, value, className = '' }) => (
  <div className={`flex items-center gap-3 ${className}`}>
    <div className="shrink-0 bg-muted p-2 rounded-lg" aria-hidden="true">
      {icon ? React.createElement(icon, { className: 'h-4 w-4 text-muted-foreground' }) : null}
    </div>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
      <p className="font-bold text-foreground break-words">{value || '-'}</p>
    </div>
  </div>
);

const TabButton = ({ active, onClick, icon, label, count }) => (
  <button
    type="button"
    onClick={onClick}
    aria-pressed={active}
    className={cn(
      'flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all sm:px-5 sm:py-3 sm:text-base',
      active
        ? 'bg-primary text-primary-foreground shadow-lg shadow-primary/20'
        : 'border border-border bg-card text-muted-foreground hover:bg-muted'
    )}
  >
    {icon ? React.createElement(icon, { className: 'h-4 w-4 shrink-0', 'aria-hidden': true }) : null}
    <span className="truncate">{label}</span>
    {count > 0 && (
      <span
        className={`ml-1 px-2 py-0.5 rounded-full text-xs ${
          active ? 'bg-white/20' : 'bg-primary/10 text-primary'
        }`}
      >
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

  const healthAddMenuRef = React.useRef(null);

  React.useEffect(() => {
    setShowHealthAddMenu(false);
  }, [activeTab]);

  React.useEffect(() => {
    if (!showHealthAddMenu) return;

    const handlePointerDown = (event) => {
      if (healthAddMenuRef.current && !healthAddMenuRef.current.contains(event.target)) {
        setShowHealthAddMenu(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setShowHealthAddMenu(false);
    };

    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showHealthAddMenu]);

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
      <div className="rounded-3xl border border-border bg-card">
        <LoadingState label="Loading livestock details…" />
      </div>
    );
  }

  if (livestockError || !livestock) {
    return (
      <div className="rounded-3xl border border-border bg-card">
        <ErrorState
          title="Livestock not found"
          message="The animal you're looking for doesn't exist."
        />
        <div className="flex justify-center pb-16 -mt-10">
          <Button onClick={goBack}>
            <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
            Back
          </Button>
        </div>
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
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Delete Confirmation Modal */}
      <ModalShell
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Livestock?"
        size="sm"
        icon={
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
            <Trash2 className="h-6 w-6 text-destructive" aria-hidden="true" />
          </span>
        }
        footer={
          <>
            <Button
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => setShowDeleteConfirm(false)}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              className="flex-1 sm:flex-none"
              loading={deleteMutation.isPending}
              disabled={isActionLocked}
              onClick={() => deleteMutation.mutate()}
            >
              Delete
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          This will permanently delete{' '}
          <span className="font-bold text-foreground">{livestock.tagId || 'this livestock'}</span> and
          all related records.
        </p>
      </ModalShell>

      {/* Add Weight Modal */}
      <ModalShell
        open={showAddWeightModal}
        onClose={() => {
          setShowAddWeightModal(false);
          setWeightFormError(null);
        }}
        title="Add Weight"
        size="sm"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
            <Scale className="h-5 w-5 text-primary" aria-hidden="true" />
          </span>
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setShowAddWeightModal(false);
                setWeightFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-weight-form"
              className="flex-1 sm:flex-none"
              loading={addWeightMutation.isPending}
            >
              {addWeightMutation.isPending ? (
                'Saving…'
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Save
                </>
              )}
            </Button>
          </>
        }
      >
        <form
          id="add-weight-form"
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
            <label htmlFor="weight-amount" className="text-sm font-bold text-foreground">
              {livestock.trackingType === 'batch' ? 'Average weight (per animal)' : 'Weight'}
            </label>
            <Input
              id="weight-amount"
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
            <label htmlFor="weight-unit" className="text-sm font-bold text-foreground">Unit</label>
            <select
              id="weight-unit"
              value={weightForm.unit}
              onChange={(e) => setWeightForm({ ...weightForm, unit: e.target.value })}
              className="mt-1 w-full h-12 rounded-xl border border-border bg-background px-3 text-base sm:text-sm text-foreground"
            >
              <option value="kg">kg</option>
              <option value="lbs">lbs</option>
            </select>
          </div>

          <div>
            <label htmlFor="weight-notes" className="text-sm font-bold text-foreground">Notes</label>
            <textarea
              id="weight-notes"
              value={weightForm.notes}
              onChange={(e) => setWeightForm({ ...weightForm, notes: e.target.value })}
              placeholder="Optional"
              className="mt-1 w-full min-h-[90px] rounded-xl border border-border bg-background p-3 text-base sm:text-sm text-foreground"
            />
          </div>

          {weightFormError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-bold text-destructive">{weightFormError}</p>
            </div>
          ) : null}

          {addWeightMutation.isError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-bold text-destructive">Failed to record weight</p>
              <p className="text-sm text-destructive/90">{getApiErrorMessage(addWeightMutation.error)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                Endpoint: <span className="font-mono">POST /livestock/{livestockId}/weight</span>
              </p>
            </div>
          ) : null}
        </form>
      </ModalShell>

      {/* Log Death Modal */}
      <ModalShell
        open={showDeathModal}
        onClose={() => {
          setShowDeathModal(false);
          setDeathFormError(null);
        }}
        title={livestock.trackingType === 'batch' ? 'Log Deaths' : 'Mark as Deceased'}
        size="sm"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-destructive/10">
            <Skull className="h-5 w-5 text-destructive" aria-hidden="true" />
          </span>
        }
        footer={
          <>
            <Button
              type="button"
              variant="outline"
              className="flex-1 sm:flex-none"
              onClick={() => {
                setShowDeathModal(false);
                setDeathFormError(null);
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              form="log-death-form"
              variant="destructive"
              className="flex-1 sm:flex-none"
              loading={logDeathMutation.isPending}
            >
              {logDeathMutation.isPending ? (
                'Saving…'
              ) : (
                <>
                  <Skull className="h-4 w-4 mr-2" aria-hidden="true" />
                  Confirm
                </>
              )}
            </Button>
          </>
        }
      >
        <div
          role="note"
          className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-3"
        >
          <p className="text-sm font-bold text-amber-800">This action updates inventory &amp; profit</p>
          <p className="text-xs text-amber-800/90">
            It will reduce batch quantity (or mark the animal as deceased) and record a financial
            loss so other features stay consistent.
          </p>
        </div>

        <form
          id="log-death-form"
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
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="death-quantity" className="text-sm font-bold text-foreground">
                Quantity
              </label>
              <Input
                id="death-quantity"
                type="number"
                min="1"
                max={livestock.trackingType === 'batch' ? String(livestock.quantity || '') : '1'}
                value={livestock.trackingType === 'batch' ? deathForm.quantity : 1}
                disabled={livestock.trackingType !== 'batch'}
                onChange={(e) => setDeathForm({ ...deathForm, quantity: e.target.value })}
                className="mt-1 rounded-xl h-12"
              />
              {livestock.trackingType === 'batch' && (
                <p className="text-xs text-muted-foreground mt-1">
                  Available in batch: {Number(livestock.quantity || 0)}
                </p>
              )}
            </div>
            <div>
              <label htmlFor="death-date" className="text-sm font-bold text-foreground">
                Date
              </label>
              <Input
                id="death-date"
                type="date"
                value={deathForm.date}
                onChange={(e) => setDeathForm({ ...deathForm, date: e.target.value })}
                className="mt-1 rounded-xl h-12"
              />
            </div>
          </div>

          <div>
            <label htmlFor="death-unit-price" className="text-sm font-bold text-foreground">
              Estimated value per animal (₦)
            </label>
            <Input
              id="death-unit-price"
              type="number"
              min="0"
              step="0.01"
              value={deathForm.unitPrice}
              onChange={(e) => setDeathForm({ ...deathForm, unitPrice: e.target.value })}
              placeholder="Auto-filled from selling value"
              className="mt-1 rounded-xl h-12"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Leave empty to auto-calculate from the livestock selling value.
            </p>
          </div>

          <div>
            <label htmlFor="death-cause" className="text-sm font-bold text-foreground">
              Cause of death
            </label>
            <select
              id="death-cause"
              value={deathForm.causeOfDeath}
              onChange={(e) => setDeathForm({ ...deathForm, causeOfDeath: e.target.value })}
              className="mt-1 w-full h-12 rounded-xl border border-border bg-background px-3 text-base sm:text-sm text-foreground"
            >
              <option value="disease">Disease</option>
              <option value="accident">Accident</option>
              <option value="predator">Predator</option>
              <option value="old_age">Old Age</option>
              <option value="unknown">Unknown</option>
            </select>
          </div>

          <div>
            <label htmlFor="death-notes" className="text-sm font-bold text-foreground">
              Notes
            </label>
            <textarea
              id="death-notes"
              value={deathForm.notes}
              onChange={(e) => setDeathForm({ ...deathForm, notes: e.target.value })}
              placeholder="Optional"
              className="mt-1 w-full min-h-[90px] rounded-xl border border-border bg-background p-3 text-base sm:text-sm text-foreground"
            />
          </div>

          {deathFormError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-bold text-destructive">{deathFormError}</p>
            </div>
          ) : null}

          {logDeathMutation.isError ? (
            <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3">
              <p className="text-sm font-bold text-destructive">Failed to log death</p>
              <p className="text-sm text-destructive/90">{getApiErrorMessage(logDeathMutation.error)}</p>
            </div>
          ) : null}
        </form>
      </ModalShell>

      {/* Back Navigation */}
      <Button
        variant="ghost"
        onClick={goBack}
        className="-ml-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        Back to Livestock
      </Button>

      {/* Header Card */}
      <div className="overflow-hidden rounded-[2.5rem] border border-border bg-card shadow-sm">
        <div className="relative">
          {/* Cover Image/Color */}
          <div className={`h-44 sm:h-48 ${livestock.imageUrls?.[0] ? '' : speciesColor}`}>
            {livestock.imageUrls?.[0] && (
              <img
                src={livestock.imageUrls[0]}
                alt={livestock.tagId || livestock.species}
                className="h-full w-full object-cover"
              />
            )}
          </div>

          {/* Profile Picture */}
          <div className="absolute -bottom-12 left-4 sm:left-8">
            <div className={`h-24 w-24 sm:h-28 sm:w-28 rounded-3xl border-4 border-white shadow-lg overflow-hidden ${speciesColor}`}>
              {livestock.imageUrls?.[0] ? (
                <img
                  src={livestock.imageUrls[0]}
                  alt={livestock.tagId || livestock.species}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center" aria-hidden="true">
                  <SpeciesIcon className="h-12 w-12 text-white/80" />
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="absolute bottom-4 right-4 flex gap-2">
            <Button
              variant="outline"
              aria-label="Delete livestock"
              title={isActionLocked ? 'This livestock is no longer active.' : 'Delete livestock'}
              className="rounded-xl bg-card/90 text-red-500 backdrop-blur hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isActionLocked}
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </Button>
          </div>
        </div>

        {/* Details */}
        <div className="px-4 pb-6 pt-16 sm:px-8 sm:pb-8">
          <div className="flex flex-col justify-between gap-6 lg:flex-row lg:items-end">
            <div className="min-w-0">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="min-w-0 break-words text-2xl font-black text-foreground sm:text-3xl">
                  {livestock.tagId || `${livestock.species || 'Livestock'} #${livestockIdSuffix || '----'}`}
                </h1>
                <HealthStatusBadge status={displayHealthStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-muted-foreground">
                <span className="capitalize font-medium">{livestock.breed || livestock.species || '-'}</span>
                {livestock.tagId && (
                  <span className="flex items-center gap-1">
                    <FileText className="h-4 w-4" aria-hidden="true" />
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
            <div className="flex flex-wrap gap-3 sm:gap-4">
              {livestock.weight && (
                <MiniStat
                  label="Weight"
                  value={`${livestock.weight} kg`}
                  className="min-w-[8rem] flex-1"
                />
              )}
              {getAge() && (
                <MiniStat label="Age" value={getAge()} className="min-w-[8rem] flex-1" />
              )}
              {(livestock.cost ?? livestock.acquisitionCost) ? (
                <MiniStat
                  label="Value"
                  value={`₦${(livestock.cost ?? livestock.acquisitionCost).toLocaleString()}`}
                  className="min-w-[8rem] flex-1"
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 sm:gap-3" role="group" aria-label="Livestock detail sections">
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
              <SectionCard
                title="Basic Information"
                className="rounded-3xl"
                contentClassName="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-6 md:grid-cols-3"
              >
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
              </SectionCard>

              {/* Health Check */}
              <SectionCard
                title="Health Check"
                className="rounded-3xl"
                action={
                  <div className="flex flex-wrap gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-xl"
                      onClick={() => refetchHealthCheck()}
                      loading={isHealthCheckFetching}
                      disabled={isActionLocked || isHealthCheckFetching}
                    >
                      {isHealthCheckFetching ? 'Refreshing…' : 'Refresh'}
                    </Button>
                    <Button
                      size="sm"
                      className="rounded-xl"
                      onClick={() => recomputeHealthCheckMutation.mutate()}
                      loading={recomputeHealthCheckMutation.isPending}
                      disabled={isActionLocked || recomputeHealthCheckMutation.isPending}
                    >
                      {recomputeHealthCheckMutation.isPending ? 'Recomputing…' : 'Recompute'}
                    </Button>
                  </div>
                }
              >
                {isHealthCheckLoading ? (
                  <LoadingState label="Loading health check…" className="py-8" />
                ) : isHealthCheckError ? (
                  <div role="alert" className="space-y-3 rounded-2xl border border-destructive/30 bg-destructive/10 p-4">
                    <p className="text-sm font-bold text-destructive">Health check request failed</p>
                    <p className="text-sm text-destructive/90">{getApiErrorMessage(healthCheckError)}</p>
                    <p className="text-xs text-muted-foreground">
                      Endpoint: <span className="font-mono">GET /livestock/{livestockId}/health-check</span>
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {recomputeHealthCheckMutation.isError ? (
                      <div role="alert" className="rounded-2xl border border-destructive/30 bg-destructive/10 p-3">
                        <p className="text-sm font-bold text-destructive">Recompute failed</p>
                        <p className="text-sm text-destructive/90">{getApiErrorMessage(recomputeHealthCheckMutation.error)}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Endpoint: <span className="font-mono">POST /livestock/{livestockId}/health-check/recompute</span>
                        </p>
                      </div>
                    ) : null}

                    {healthCheckReport ? (
                      <div className="space-y-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="font-bold text-foreground">Overall</p>
                          <span
                            className={`px-3 py-1 rounded-full text-sm font-bold ${
                              healthCheckReport.overallStatus === 'critical'
                                ? 'bg-red-100 text-red-700'
                                : healthCheckReport.overallStatus === 'warning'
                                ? 'bg-amber-100 text-amber-700'
                                : healthCheckReport.overallStatus === 'ok'
                                ? 'bg-green-100 text-green-700'
                                : 'bg-muted text-muted-foreground'
                            }`}
                          >
                            {healthCheckReport.overallStatus || 'unknown'}
                          </span>
                        </div>

                        {Array.isArray(healthCheckReport.checks) && healthCheckReport.checks.length > 0 ? (
                          <div className="space-y-3">
                            <p className="text-xs text-muted-foreground">
                              Generated: {healthCheckReport.generatedAt ? new Date(healthCheckReport.generatedAt).toLocaleString() : '—'}
                              {healthCheckReport.ai?.used ? ` • AI enhanced${healthCheckReport.ai?.model ? ` (${healthCheckReport.ai.model})` : ''}` : ''}
                            </p>

                            {healthCheckReport.ai?.summary ? (
                              <div className="rounded-2xl border border-border bg-card p-3">
                                <p className="text-xs font-bold text-foreground">AI Summary</p>
                                <p className="mt-1 text-sm text-muted-foreground">{healthCheckReport.ai.summary}</p>
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
                                      : 'bg-muted'
                                  }`}
                                >
                                  <div className="flex flex-wrap items-center justify-between gap-2">
                                    <p className="min-w-0 break-words font-bold text-foreground">{check.title || check.key}</p>
                                    <span
                                      className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-bold ${
                                        check.status === 'critical'
                                          ? 'bg-red-100 text-red-700'
                                          : check.status === 'warning'
                                          ? 'bg-amber-100 text-amber-700'
                                          : check.status === 'ok'
                                          ? 'bg-green-100 text-green-700'
                                          : 'bg-muted text-muted-foreground'
                                      }`}
                                    >
                                      {check.status}
                                    </span>
                                  </div>

                                  {findings.length > 0 ? (
                                    <ul className="mt-2 list-disc list-inside text-sm text-muted-foreground space-y-1">
                                      {findings.map((f, idx) => (
                                        <li key={idx}>{f}</li>
                                      ))}
                                    </ul>
                                  ) : (
                                    <p className="mt-2 text-sm text-muted-foreground">No findings.</p>
                                  )}

                                  {recs.length > 0 ? (
                                    <>
                                      <p className="mt-3 text-xs font-bold text-foreground">Recommendations</p>
                                      <ul className="mt-1 list-disc list-inside text-sm text-muted-foreground space-y-1">
                                        {recs.map((r, idx) => (
                                          <li key={idx}>{r}</li>
                                        ))}
                                      </ul>
                                    </>
                                  ) : null}


                                </div>
                              );
                            })}

                            <p className="text-xs text-muted-foreground">
                              Note: for batch registrations, weight is treated as average weight per animal.
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground">No checks available yet.</p>
                        )}
                      </div>
                    ) : (
                      <p className="text-muted-foreground">No health-check report yet. Click “Recompute”.</p>
                    )}
                  </div>
                )}
              </SectionCard>

              {/* Recent Weight History */}
              {livestock.weightHistory?.length > 0 && (
                <SectionCard
                  title="Weight History"
                  className="rounded-3xl"
                  action={
                    <Button variant="ghost" size="sm" onClick={() => setActiveTab('weight')}>
                      View All <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
                    </Button>
                  }
                >
                  <div className="space-y-3">
                    {recentWeightHistory.map((entry, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted rounded-xl">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="shrink-0 bg-primary/10 p-2 rounded-lg" aria-hidden="true">
                            <Scale className="h-4 w-4 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-foreground">{entry.weight} kg</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(entry.recordedAt)}
                            </p>
                          </div>
                        </div>
                        {idx < recentWeightHistory.length - 1 && recentWeightHistory[idx + 1] && (
                          <span className={`shrink-0 text-sm font-bold ${
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
                </SectionCard>
              )}

              {/* Notes */}
              {livestock.notes && (
                <SectionCard title="Notes" className="rounded-3xl">
                  <p className="text-muted-foreground whitespace-pre-wrap">{livestock.notes}</p>
                </SectionCard>
              )}
            </>
          )}

          {activeTab === 'health' && (
            <SectionCard
              title="Health Records"
              className="rounded-3xl"
              action={
                <div className="relative" ref={healthAddMenuRef}>
                  <Button
                    className="rounded-xl"
                    aria-haspopup="true"
                    aria-expanded={showHealthAddMenu}
                    onClick={() => {
                      if (isActionLocked) return;
                      setShowHealthAddMenu(!showHealthAddMenu);
                    }}
                    disabled={isActionLocked}
                  >
                    <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                    Add Record
                  </Button>

                  {showHealthAddMenu && !isActionLocked && (
                    <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-border bg-card py-2 shadow-lg">
                        <button
                          type="button"
                          onClick={() => {
                            setShowHealthAddMenu(false);
                            navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } });
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                        >
                          <Syringe className="h-4 w-4 shrink-0 text-blue-500" aria-hidden="true" />
                          <span className="font-medium">Vaccination</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => {
                            setShowHealthAddMenu(false);
                            navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'deworming' } });
                          }}
                          className="flex w-full items-center gap-3 px-4 py-2.5 text-left hover:bg-muted"
                        >
                          <Activity className="h-4 w-4 shrink-0 text-purple-500" aria-hidden="true" />
                          <span className="font-medium">Deworming</span>
                        </button>

                        <button
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left opacity-50"
                        >
                          <Bug className="h-4 w-4 shrink-0 text-red-500" aria-hidden="true" />
                          <span className="font-medium">Illness</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        </button>

                        <button
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left opacity-50"
                        >
                          <Pill className="h-4 w-4 shrink-0 text-amber-500" aria-hidden="true" />
                          <span className="font-medium">Treatment</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        </button>

                        <button
                          type="button"
                          disabled
                          className="flex w-full cursor-not-allowed items-center gap-3 px-4 py-2.5 text-left opacity-50"
                        >
                          <Stethoscope className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                          <span className="font-medium">Checkup</span>
                          <span className="ml-auto text-[10px] text-muted-foreground">Soon</span>
                        </button>
                      </div>
                  )}
                </div>
              }
            >
                {isFullHealthRecordsLoading ? (
                  <LoadingState label="Loading health records…" className="py-12" />
                ) : healthRecords.length > 0 ? (
                  <div className="space-y-4">
                    {healthRecords.map((record, idx) => (
                      <div key={idx} className="p-4 border border-border rounded-2xl">
                        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-3">
                            {record.type === 'vaccination' && <Syringe className="h-5 w-5 shrink-0 text-blue-500" aria-hidden="true" />}
                            {record.type === 'treatment' && <Pill className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />}
                            {record.type === 'checkup' && <Stethoscope className="h-5 w-5 shrink-0 text-green-500" aria-hidden="true" />}
                            {record.type === 'deworming' && <Activity className="h-5 w-5 shrink-0 text-purple-500" aria-hidden="true" />}
                            {record.type === 'illness' && <AlertTriangle className="h-5 w-5 shrink-0 text-red-500" aria-hidden="true" />}
                            <div className="min-w-0">
                              <h4 className="font-bold text-foreground capitalize">{record.type}</h4>
                              <p className="text-sm text-muted-foreground">
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
                          <p className="text-sm text-muted-foreground">{record.description || record.notes}</p>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={<Heart className="h-8 w-8" aria-hidden="true" />}
                    title="No health records yet"
                    description="Start tracking vaccinations, treatments, and checkups"
                    action={
                      <Button
                        className="rounded-xl"
                        onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } })}
                        disabled={isActionLocked}
                      >
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                        Add First Record
                      </Button>
                    }
                  />
                )}
            </SectionCard>
          )}

          {activeTab === 'weight' && (
            <SectionCard
              title="Growth Tracking"
              className="rounded-3xl"
              action={
                <Button
                  className="rounded-xl"
                  onClick={() => {
                    setWeightFormError(null);
                    setShowAddWeightModal(true);
                  }}
                  disabled={isActionLocked}
                >
                  <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                  Add Weight
                </Button>
              }
            >
                {weightHistory.length > 0 ? (
                  <div className="space-y-4">
                    {/* Weight Chart Placeholder */}
                    <div className="rounded-2xl bg-muted p-6 text-center">
                      <LineChart className="mx-auto mb-3 h-12 w-12 text-muted-foreground" aria-hidden="true" />
                      <p className="text-sm text-muted-foreground">Weight chart coming soon</p>
                    </div>
                    
                    {/* Weight History List */}
                    <div className="space-y-3">
                      {weightHistory.slice().reverse().map((entry, idx) => (
                        <div key={idx} className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted p-4">
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="shrink-0 rounded-xl bg-primary/10 p-3" aria-hidden="true">
                              <Scale className="h-5 w-5 text-primary" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-2xl font-black text-foreground">{entry.weight} kg</p>
                              <p className="text-sm text-muted-foreground">
                                {formatDate(entry.recordedAt)}
                              </p>
                            </div>
                          </div>
                          {entry.notes && (
                            <p className="max-w-xs break-words text-right text-sm text-muted-foreground">{entry.notes}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={<Scale className="h-8 w-8" aria-hidden="true" />}
                    title="No weight records yet"
                    description="Track growth over time by adding weight measurements"
                    action={
                      <Button
                        className="rounded-xl"
                        onClick={() => {
                          setWeightFormError(null);
                          setShowAddWeightModal(true);
                        }}
                        disabled={isActionLocked}
                      >
                        <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                        Add First Weight
                      </Button>
                    }
                  />
                )}
            </SectionCard>
          )}

          {activeTab === 'breeding' && (
            <SectionCard
              title="Breeding Information"
              className="rounded-3xl"
            >
                {isFarmBreedingLoading ? (
                  <LoadingState label="Loading breeding records…" className="py-12" />
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
                      <EmptyState
                        icon={<Baby className="h-8 w-8" aria-hidden="true" />}
                        title="No breeding records yet"
                        description="Track breeding cycles, pregnancies, and offspring"
                        action={
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
                            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                            Add Breeding Record
                          </Button>
                        }
                      />
                    );
                  }

                  const isPregnant = latest?.isPregnant === true || latest?.status === 'confirmed_pregnant';
                  const partner = livestock.gender === 'female'
                    ? (latest?.sireId?.name || latest?.sireId?.tagId || 'Male')
                    : (latest?.damId?.name || latest?.damId?.tagId || 'Female');

                  return (
                    <div className="space-y-4">
                      <div className="rounded-2xl border border-border bg-muted p-4">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-xs uppercase tracking-wider text-muted-foreground">Latest record</p>
                            <h3 className="mt-1 break-words text-lg font-black text-foreground">
                              {livestock.gender === 'female' ? 'Bred with ' : 'Sired with '}
                              <span className="text-foreground">{partner}</span>
                            </h3>
                            <div className="mt-2 flex flex-wrap gap-3 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Calendar className="h-4 w-4 shrink-0" aria-hidden="true" />
                                {latest.breedingDate ? new Date(latest.breedingDate).toLocaleDateString() : '—'}
                              </span>
                              {latest.expectedDueDate && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-4 w-4 shrink-0" aria-hidden="true" />
                                  Due: {new Date(latest.expectedDueDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
                            <span
                              className={`px-3 py-1 rounded-full text-xs font-bold ${
                                isPregnant ? 'bg-pink-100 text-pink-700' : 'bg-amber-100 text-amber-700'
                              }`}
                            >
                              {isPregnant ? 'Pregnant' : (latest.status || 'bred')}
                            </span>
                            {latest.breedingMethod && (
                              <span className="text-xs capitalize text-muted-foreground">{latest.breedingMethod}</span>
                            )}
                          </div>
                        </div>

                        {(latest.notes || latest.observations) && (
                          <p className="mt-3 break-words text-sm text-muted-foreground">{latest.notes || latest.observations}</p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <Button
                          variant="outline"
                          className="rounded-xl"
                          onClick={() => navigate(`/livestock-breeding${qs}`)}
                        >
                          View Breeding Records <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
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
                          <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
                          Add Breeding Record
                        </Button>
                      </div>

                      {!canAddBreeding && (
                        <p className="text-xs text-amber-700">{breedingLockReason}</p>
                      )}
                    </div>
                  );
                })()}
            </SectionCard>
          )}

          {activeTab === 'history' && (
            <SectionCard title="Activity History" className="rounded-3xl">
              <EmptyState
                icon={<History className="h-8 w-8" aria-hidden="true" />}
                title="Activity log coming soon"
                description="All changes and events will be tracked here"
              />
            </SectionCard>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <SectionCard
            title="Quick Actions"
            className="rounded-3xl"
            contentClassName="space-y-3"
          >
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => {
                  setActiveTab('overview');
                  recomputeHealthCheckMutation.mutate();
                }}
                loading={recomputeHealthCheckMutation.isPending}
                disabled={isActionLocked || recomputeHealthCheckMutation.isPending}
              >
                <Stethoscope className="h-4 w-4 mr-3 text-primary" aria-hidden="true" />
                {recomputeHealthCheckMutation.isPending ? 'Running…' : 'AI Health Check'}
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'vaccination' } })}
                disabled={isActionLocked}
              >
                <Syringe className="h-4 w-4 mr-3 text-blue-500" aria-hidden="true" />
                Log Vaccination
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`, { state: { openAddModal: 'deworming' } })}
                disabled={isActionLocked}
              >
                <Activity className="h-4 w-4 mr-3 text-purple-500" aria-hidden="true" />
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
                <Scale className="h-4 w-4 mr-3 text-green-500" aria-hidden="true" />
                Record Weight
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start rounded-xl h-12"
                onClick={() => navigate(`/livestock/${livestockId}/health`)}
                disabled={isActionLocked}
              >
                <Pill className="h-4 w-4 mr-3 text-amber-500" aria-hidden="true" />
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
                <Skull className="h-4 w-4 mr-3" aria-hidden="true" />
                {livestock.trackingType === 'batch' ? 'Log Deaths' : 'Mark as Deceased'}
              </Button>
          </SectionCard>

          {/* Lineage */}
          {(livestock.sireId || livestock.damId) && (
            <SectionCard
              title="Lineage"
              className="rounded-3xl"
              contentClassName="space-y-3"
            >
                {livestock.sireId && (
                  <Link
                    to={`/livestock/${livestock.sireId._id || livestock.sireId}`}
                    className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-3 transition-colors hover:bg-primary/5"
                  >
                    <div className="shrink-0 rounded-lg bg-blue-100 p-2" aria-hidden="true">
                      <PawPrint className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Sire (Father)</p>
                      <p className="break-words font-bold text-foreground">
                        {livestock.sireId?.name || livestock.sireId?.tagId || 'View'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                )}
                {livestock.damId && (
                  <Link
                    to={`/livestock/${livestock.damId._id || livestock.damId}`}
                    className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-3 transition-colors hover:bg-primary/5"
                  >
                    <div className="shrink-0 rounded-lg bg-pink-100 p-2" aria-hidden="true">
                      <PawPrint className="h-4 w-4 text-pink-600" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs text-muted-foreground">Dam (Mother)</p>
                      <p className="break-words font-bold text-foreground">
                        {livestock.damId?.name || livestock.damId?.tagId || 'View'}
                      </p>
                    </div>
                    <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                  </Link>
                )}
            </SectionCard>
          )}

          {/* Farm Info */}
          {livestock.farmId && (
            <SectionCard title="Farm" className="rounded-3xl">
              <Link
                to={`/farms/${livestock.farmId._id || livestock.farmId}`}
                className="flex min-w-0 items-center gap-3 rounded-xl bg-muted p-3 transition-colors hover:bg-primary/5"
              >
                <div className="shrink-0 rounded-lg bg-green-100 p-2" aria-hidden="true">
                  <MapPin className="h-4 w-4 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="break-words font-bold text-foreground">
                    {livestock.farmId?.name || 'View Farm'}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </SectionCard>
          )}
        </div>
      </div>
    </div>
  );
};

export { LivestockDetailsPage };
export default LivestockDetailsPage;
