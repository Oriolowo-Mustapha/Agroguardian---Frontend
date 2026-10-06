import { useEffect, useState, useMemo, useCallback } from 'react';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Baby,
  Heart,
  AlertCircle,
  CheckCircle,
  Clock,
  Trash2
} from 'lucide-react';
import api from '../lib/axios';
import ModalShell from '../components/ui/ModalShell';
import { Button } from '../components/ui/Button';
import { LoadingState, EmptyState } from '../components/ui/States';

const statusColors = {
  pending: 'bg-yellow-100 text-yellow-700',
  confirmed: 'bg-blue-100 text-blue-700',
  successful: 'bg-green-100 text-green-700',
  failed: 'bg-red-100 text-red-700'
};

const toUiBreedingStatus = (status) => {
  switch (status) {
    case 'bred':
      return 'pending';
    case 'confirmed_pregnant':
      return 'confirmed';
    case 'delivered':
      return 'successful';
    case 'failed':
    case 'aborted':
      return 'failed';
    default:
      return status || 'pending';
  }
};

const speciesEmoji = {
  cattle: '🐄',
  goat: '🐐',
  sheep: '🐑',
  rabbit: '🐇',
  pig: '🐷',
  poultry: '🐔',
  fish: '🐟'
};

export default function LivestockBreedingPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const goBack = useNavigateBack('/livestock');
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [prefillFemaleId, setPrefillFemaleId] = useState(undefined);
  const [prefillMaleId, setPrefillMaleId] = useState(undefined);
  const [selectedFemaleId, setSelectedFemaleId] = useState('');
  const [showBirthModal, setShowBirthModal] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [actionError, setActionError] = useState(null);
  const [actionInfo, setActionInfo] = useState(null);
  const [confirmingId, setConfirmingId] = useState(null);

  const closeAddModal = useCallback(() => setShowAddModal(false), []);
  const closeBirthModal = useCallback(() => setShowBirthModal(null), []);

  useEffect(() => {
    if (location.state?.openAddModal) {
      setShowAddModal(true);
      setPrefillFemaleId(location.state?.prefillFemaleId);
      setPrefillMaleId(location.state?.prefillMaleId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (showAddModal) {
      setSelectedFemaleId(prefillFemaleId || '');
      setActionError(null);
      setActionInfo(null);
    }
  }, [showAddModal, prefillFemaleId]);

  // Fetch farms
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return res.data.data || [];
    }
  });

  const selectedFarm = farms.find(f => f._id === farmId) || farms[0];

  // Fetch livestock
  const { data: livestock = [] } = useQuery({
    queryKey: ['livestock', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${selectedFarm._id}`);
      return res.data.data || [];
    },
    enabled: !!selectedFarm?._id
  });
  const females = livestock.filter(l => l.gender === 'female');
  const males = livestock.filter(l => l.gender === 'male');

  // Fetch breeding records
  const { data: breedingData, isLoading } = useQuery({
    queryKey: ['breeding-records', selectedFarm?._id, activeTab],
    queryFn: async () => {
      const statusParam =
        activeTab === 'pending'
          ? 'bred'
          : activeTab === 'confirmed'
            ? 'confirmed_pregnant'
            : activeTab === 'successful'
              ? 'delivered'
              : activeTab === 'failed'
                ? 'failed'
                : undefined;

      const params = statusParam ? { status: statusParam } : {};
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/breeding`, { params });
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const breedingRecords = breedingData?.data || [];

  // Unfiltered list used for eligibility checks (don’t depend on the active tab filter)
  const { data: breedingAllData, isLoading: isBreedingAllLoading } = useQuery({
    queryKey: ['breeding-records-all', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/breeding`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const breedingAllRecords = breedingAllData?.data || [];

  // Fetch active pregnancies
  const { data: pregnanciesData } = useQuery({
    queryKey: ['active-pregnancies', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/breeding/pregnancies`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const activePregnancies = pregnanciesData?.data || [];

  // Fetch upcoming births
  const { data: upcomingData } = useQuery({
    queryKey: ['upcoming-births', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/breeding/upcoming-births`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const upcomingBirths = upcomingData?.data || [];

  // Fetch breeding stats
  const { data: statsData } = useQuery({
    queryKey: ['breeding-stats', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/breeding/stats`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const stats = statsData?.data || {};

  // Add breeding record
  const addBreeding = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/livestock-management/farms/${selectedFarm._id}/breeding`, data);
      return res.data;
    },
    onSuccess: () => {
      setActionError(null);
      queryClient.invalidateQueries(['breeding-records']);
      queryClient.invalidateQueries(['breeding-records-all']);
      queryClient.invalidateQueries(['breeding-stats']);
      setShowAddModal(false);
    },
    onError: (error) => {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add breeding record';
      setActionError(msg);
    }
  });

  // Confirm pregnancy
  const confirmPregnancy = useMutation({
    mutationFn: async (breedingId) => {
      const res = await api.post(`/livestock-management/breeding/${breedingId}/confirm-pregnancy`, {});
      return res.data;
    },
    onMutate: (breedingId) => {
      setActionError(null);
      setActionInfo(null);
      setConfirmingId(breedingId);
    },
    onSuccess: () => {
      setActionInfo('Pregnancy confirmed');
      queryClient.invalidateQueries(['breeding-records']);
      queryClient.invalidateQueries(['active-pregnancies']);
      queryClient.invalidateQueries(['upcoming-births']);
      queryClient.invalidateQueries(['breeding-stats']);
    },
    onError: (error) => {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || 'Failed to confirm pregnancy';
      setActionError(status ? `${status}: ${msg}` : msg);
      // Helps when users report "button not working"
      console.error('Confirm pregnancy failed:', error);
    },
    onSettled: () => {
      setConfirmingId(null);
    }
  });

  const updateFollowUp = useMutation({
    mutationFn: async ({ breedingId, followUpId, patch }) => {
      const res = await api.patch(
        `/livestock-management/breeding/${breedingId}/follow-ups/${followUpId}`,
        patch
      );
      return res.data;
    },
    onMutate: () => {
      setActionError(null);
      setActionInfo(null);
    },
    onSuccess: () => {
      setActionInfo('Follow-up updated');
      queryClient.invalidateQueries(['breeding-records']);
    },
    onError: (error) => {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || error?.message || 'Failed to update follow-up';
      setActionError(status ? `${status}: ${msg}` : msg);
      console.error('Update follow-up failed:', error);
    }
  });

  // Record birth
  const recordBirth = useMutation({
    mutationFn: async ({ breedingId, data }) => {
      const res = await api.post(`/livestock-management/breeding/${breedingId}/birth`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['breeding-records']);
      queryClient.invalidateQueries(['active-pregnancies']);
      queryClient.invalidateQueries(['breeding-stats']);
      setShowBirthModal(null);
    }
  });

  // Delete breeding record
  const deleteBreeding = useMutation({
    mutationFn: async (breedingId) => {
      await api.delete(`/livestock-management/breeding/${breedingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['breeding-records']);
      queryClient.invalidateQueries(['breeding-stats']);
    }
  });

  const computeFemaleEligibility = useCallback((femaleId) => {
    if (!femaleId) return { eligible: true };

    const COOLDOWN_DAYS = 60;
    const damRecords = (breedingAllRecords || [])
      .filter((r) => (r?.damId?._id || r?.damId) === femaleId)
      .sort((a, b) => new Date(b.breedingDate || b.createdAt).getTime() - new Date(a.breedingDate || a.createdAt).getTime());

    const active = damRecords.find(
      (r) => r?.status === 'bred' || r?.status === 'confirmed_pregnant' || r?.isPregnant === true
    );
    if (active) {
      return {
        eligible: false,
        reason: 'This female is currently in a breeding cycle. Record the outcome (birth/failed) before adding a new record.'
      };
    }

    const lastDelivered = damRecords
      .filter((r) => r?.status === 'delivered' && r?.birthDate)
      .sort((a, b) => new Date(b.birthDate).getTime() - new Date(a.birthDate).getTime())[0];

    if (lastDelivered?.birthDate) {
      const birth = new Date(lastDelivered.birthDate);
      const nextEligible = new Date(birth);
      nextEligible.setDate(nextEligible.getDate() + COOLDOWN_DAYS);

      if (Date.now() < nextEligible.getTime()) {
        return {
          eligible: false,
          reason: `Post-birth rest period (60 days). Eligible again on ${nextEligible.toLocaleDateString()}.`,
          nextEligibleDate: nextEligible
        };
      }
    }

    return { eligible: true };
  }, [breedingAllRecords]);

  const femaleEligibility = useMemo(
    () => computeFemaleEligibility(selectedFemaleId || prefillFemaleId || ''),
    [computeFemaleEligibility, selectedFemaleId, prefillFemaleId]
  );

  const handleAddBreeding = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const femaleId = formData.get('femaleId');
    const eligibility = computeFemaleEligibility(femaleId);
    if (!eligibility.eligible) {
      setActionError(eligibility.reason);
      return;
    }

    const data = {
      femaleId,
      maleId: formData.get('maleId') || undefined,
      breedingMethod: formData.get('breedingMethod'),
      breedingDate: formData.get('breedingDate'),
      notes: formData.get('notes') || undefined
    };
    addBreeding.mutate(data);
  };

  const handleRecordBirth = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = {
      birthDate: formData.get('birthDate'),
      numberOfOffspring: parseInt(formData.get('numberOfOffspring')),
      maleCount: parseInt(formData.get('maleCount') || 0),
      femaleCount: parseInt(formData.get('femaleCount') || 0),
      stillborn: parseInt(formData.get('stillborn') || 0),
      birthWeight: formData.get('birthWeight') ? parseFloat(formData.get('birthWeight')) : undefined,
      notes: formData.get('notes') || undefined
    };
    recordBirth.mutate({ breedingId: showBirthModal, data });
  };

  if (!selectedFarm) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
          <p className="text-muted-foreground">Please select a farm first</p>
          <Link to="/farms" className="text-green-600 hover:underline">Go to Farms</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={goBack}
            aria-label="Go back"
            className="p-2 hover:bg-muted rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Breeding Management</h1>
            <p className="text-muted-foreground">{selectedFarm.name}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Add Breeding Record
        </button>
      </div>

      {(actionError || actionInfo) && (
        <div
          role={actionError ? 'alert' : 'status'}
          className={`rounded-xl border p-3 text-sm ${
            actionError
              ? 'bg-destructive/10 border-destructive/20 text-destructive'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {actionError || actionInfo}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="w-5 h-5 text-pink-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Breedings</p>
              <p className="text-xl font-bold">{stats.totalBreedings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Active Pregnancies</p>
              <p className="text-xl font-bold">{activePregnancies.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Baby className="w-5 h-5 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Births</p>
              <p className="text-xl font-bold">{stats.successfulBirths || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Upcoming (30d)</p>
              <p className="text-xl font-bold">{upcomingBirths.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Births Alert */}
      {upcomingBirths.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" aria-hidden="true" />
            <h3 className="font-semibold text-amber-800">Upcoming Births</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingBirths.slice(0, 3).map(b => (
              <div key={b._id} className="bg-card rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <span aria-hidden="true">{speciesEmoji[b.damId?.species] || '🐾'}</span>
                  <span className="font-medium">{b.damId?.name || b.damId?.tagId}</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Expected: {new Date(b.expectedDueDate).toLocaleDateString()}
                </p>
                <button
                  type="button"
                  onClick={() => setShowBirthModal(b._id)}
                  className="mt-2 text-sm text-green-600 hover:underline"
                >
                  Record Birth
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'confirmed', 'successful', 'failed'].map(tab => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            aria-pressed={activeTab === tab}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingState label="Loading breeding records..." />
        ) : breedingRecords.length === 0 ? (
          <EmptyState
            icon={<Heart className="h-8 w-8" aria-hidden="true" />}
            title="No breeding records yet"
            action={
              <Button type="button" variant="link" onClick={() => setShowAddModal(true)}>
                Add your first record
              </Button>
            }
          />
        ) : (
          <div className="divide-y">
            {breedingRecords.map((record) => {
              const uiStatus = toUiBreedingStatus(record.status);
              const canRecordBirth = record.status === 'confirmed_pregnant' || record.isPregnant === true;

              return (
                <div key={record._id} className="p-4 hover:bg-muted/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl" aria-hidden="true">
                        {speciesEmoji[record.damId?.species] || '🐾'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {record.damId?.name || record.damId?.tagId || 'Dam'}
                          </span>
                          <span className="text-muted-foreground" aria-hidden="true">×</span>
                          <span className="text-muted-foreground">
                            {record.sireId?.name || record.sireId?.tagId || 'AI'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                          <span>{record.breedingMethod || 'natural'}</span>
                          <span>•</span>
                          <span>{new Date(record.breedingDate).toLocaleDateString()}</span>
                          {record.expectedDueDate && (
                            <>
                              <span>•</span>
                              <span>Due: {new Date(record.expectedDueDate).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className={`px-3 py-1 rounded-full text-xs ${statusColors[uiStatus] || ''}`}>
                        {uiStatus}
                      </span>

                      {uiStatus === 'pending' && (
                        <button
                          type="button"
                          onClick={() => confirmPregnancy.mutate(record._id)}
                          disabled={confirmPregnancy.isPending && confirmingId === record._id}
                          className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded-lg text-sm disabled:opacity-50"
                        >
                          {confirmPregnancy.isPending && confirmingId === record._id
                            ? 'Confirming...'
                            : 'Confirm Pregnancy'}
                        </button>
                      )}

                      {canRecordBirth && (
                        <button
                          type="button"
                          onClick={() => setShowBirthModal(record._id)}
                          className="text-green-600 hover:bg-green-50 px-3 py-1 rounded-lg text-sm"
                        >
                          Record Birth
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => deleteBreeding.mutate(record._id)}
                        aria-label="Delete breeding record"
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>

                  {Array.isArray(record.followUps) && record.followUps.length > 0 && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-blue-700">
                          <CheckCircle className="w-4 h-4" aria-hidden="true" />
                          <span className="font-medium">Pregnancy Follow-ups</span>
                        </div>
                        <span className="text-xs text-blue-700">
                          {record.followUps.filter((f) => f.status === 'done').length}/{record.followUps.length} done
                        </span>
                      </div>

                      <div className="mt-2 space-y-2">
                        {record.followUps
                          .slice()
                          .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
                          .map((f) => {
                            const nowDay = new Date();
                            nowDay.setHours(0, 0, 0, 0);
                            const dueDay = new Date(f.dueDate);
                            dueDay.setHours(0, 0, 0, 0);
                            const canMarkDone = nowDay.getTime() >= dueDay.getTime();

                            return (
                              <div key={f._id || `${f.type}-${f.dueDate}`} className="bg-card border border-blue-100 rounded-lg p-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-foreground">{f.title}</p>
                                    <p className="text-xs text-muted-foreground">Due: {new Date(f.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs ${
                                        f.status === 'done'
                                          ? 'bg-green-100 text-green-700'
                                          : f.status === 'skipped'
                                            ? 'bg-muted text-muted-foreground'
                                            : 'bg-yellow-100 text-yellow-700'
                                      }`}
                                    >
                                      {f.status}
                                    </span>

                                    {f._id && f.status !== 'done' && canMarkDone && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateFollowUp.mutate({
                                            breedingId: record._id,
                                            followUpId: f._id,
                                            patch: { status: 'done' }
                                          })
                                        }
                                        disabled={updateFollowUp.isPending}
                                        className="text-xs text-green-700 hover:underline disabled:opacity-50"
                                      >
                                        Mark done
                                      </button>
                                    )}

                                    {f._id && f.status !== 'done' && !canMarkDone && (
                                      <span className="text-[11px] text-muted-foreground">Available on due date</span>
                                    )}

                                    {f._id && f.status === 'pending' && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          updateFollowUp.mutate({
                                            breedingId: record._id,
                                            followUpId: f._id,
                                            patch: { status: 'skipped' }
                                          })
                                        }
                                        disabled={updateFollowUp.isPending}
                                        className="text-xs text-muted-foreground hover:underline disabled:opacity-50"
                                      >
                                        Skip
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    </div>
                  )}

                  {record.birthOutcome && (
                    <div className="mt-3 bg-green-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-green-700">
                        <Baby className="w-4 h-4" aria-hidden="true" />
                        <span className="font-medium">Birth Recorded</span>
                      </div>
                      <p className="text-sm text-green-600 mt-1">
                        {record.birthOutcome.numberOfOffspring} offspring ({record.birthOutcome.maleCount} male, {record.birthOutcome.femaleCount} female)
                        {record.birthOutcome.stillborn > 0 && `, ${record.birthOutcome.stillborn} stillborn`}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Breeding Modal */}
      <ModalShell
        open={showAddModal}
        onClose={closeAddModal}
        title="Add Breeding Record"
        size="sm"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="add-breeding-form"
              loading={addBreeding.isPending}
              disabled={isBreedingAllLoading || !femaleEligibility.eligible}
            >
              {addBreeding.isPending ? 'Adding...' : 'Add Record'}
            </Button>
          </>
        }
      >
        {actionError && (
          <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3">
            {actionError}
          </div>
        )}

        {!isBreedingAllLoading && !femaleEligibility.eligible && (selectedFemaleId || prefillFemaleId) && (
          <div role="status" className="bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-lg p-3">
            {femaleEligibility.reason}
          </div>
        )}

        <form id="add-breeding-form" onSubmit={handleAddBreeding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Female (Dam) *
                </label>
                <select
                  name="femaleId"
                  required
                  defaultValue={prefillFemaleId || ''}
                  onChange={(e) => setSelectedFemaleId(e.target.value)}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">Select female</option>
                  {females.map(l => (
                    <option key={l._id} value={l._id}>
                      {speciesEmoji[l.species]} {l.name || l.tagId} ({l.species})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Male (Sire)
                </label>
                <select
                  name="maleId"
                  defaultValue={prefillMaleId || ''}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="">AI / External</option>
                  {males.map(l => (
                    <option key={l._id} value={l._id}>
                      {speciesEmoji[l.species]} {l.name || l.tagId} ({l.species})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Method *
                  </label>
                  <select name="breedingMethod" required className="w-full border rounded-lg px-3 py-2">
                    <option value="natural">Natural</option>
                    <option value="artificial">Artificial Insemination</option>
                    <option value="embryo_transfer">Embryo Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="breedingDate"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

        </form>
      </ModalShell>

      {/* Record Birth Modal */}
      <ModalShell
        open={!!showBirthModal}
        onClose={closeBirthModal}
        title="Record Birth"
        size="sm"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeBirthModal}>
              Cancel
            </Button>
            <Button
              type="submit"
              form="record-birth-form"
              loading={recordBirth.isPending}
            >
              {recordBirth.isPending ? 'Recording...' : 'Record Birth'}
            </Button>
          </>
        }
      >
        <form id="record-birth-form" onSubmit={handleRecordBirth} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Birth Date *
                  </label>
                  <input
                    type="date"
                    name="birthDate"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Total Offspring *
                  </label>
                  <input
                    type="number"
                    name="numberOfOffspring"
                    min="1"
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Males
                  </label>
                  <input
                    type="number"
                    name="maleCount"
                    min="0"
                    defaultValue="0"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Females
                  </label>
                  <input
                    type="number"
                    name="femaleCount"
                    min="0"
                    defaultValue="0"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Stillborn
                  </label>
                  <input
                    type="number"
                    name="stillborn"
                    min="0"
                    defaultValue="0"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Average Birth Weight (kg)
                </label>
                <input
                  type="number"
                  name="birthWeight"
                  step="0.1"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Any complications, health observations..."
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

        </form>
      </ModalShell>
    </div>
  );
}
