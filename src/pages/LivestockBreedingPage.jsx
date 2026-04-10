import { useEffect, useState } from 'react';
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
  Loader2,
  Trash2
} from 'lucide-react';
import api from '../lib/axios';

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

  const computeFemaleEligibility = (femaleId) => {
    if (!femaleId) return { eligible: true };

    const COOLDOWN_DAYS = 60;
    const damRecords = (breedingAllRecords || [])
      .filter((r) => (r?.damId?._id || r?.damId) === femaleId)
      .sort((a, b) => new Date(b.breedingDate || b.createdAt) - new Date(a.breedingDate || a.createdAt));

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
      .sort((a, b) => new Date(b.birthDate) - new Date(a.birthDate))[0];

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
  };

  const femaleEligibility = computeFemaleEligibility(selectedFemaleId || prefillFemaleId || '');

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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Please select a farm first</p>
          <Link to="/farms" className="text-green-600 hover:underline">Go to Farms</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Breeding Management</h1>
            <p className="text-gray-500">{selectedFarm.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Breeding Record
        </button>
      </div>

      {(actionError || actionInfo) && (
        <div
          className={`mb-4 rounded-xl border p-3 text-sm ${
            actionError
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-green-50 border-green-200 text-green-700'
          }`}
        >
          {actionError || actionInfo}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-lg">
              <Heart className="w-5 h-5 text-pink-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Breedings</p>
              <p className="text-xl font-bold">{stats.totalBreedings || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Active Pregnancies</p>
              <p className="text-xl font-bold">{activePregnancies.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <Baby className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Births</p>
              <p className="text-xl font-bold">{stats.successfulBirths || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Calendar className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Upcoming (30d)</p>
              <p className="text-xl font-bold">{upcomingBirths.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Upcoming Births Alert */}
      {upcomingBirths.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <h3 className="font-semibold text-amber-800">Upcoming Births</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {upcomingBirths.slice(0, 3).map(b => (
              <div key={b._id} className="bg-white rounded-lg p-3 border border-amber-100">
                <div className="flex items-center gap-2 mb-1">
                  <span>{speciesEmoji[b.damId?.species] || '🐾'}</span>
                  <span className="font-medium">{b.damId?.name || b.damId?.tagId}</span>
                </div>
                <p className="text-sm text-gray-600">
                  Expected: {new Date(b.expectedDueDate).toLocaleDateString()}
                </p>
                <button
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
      <div className="flex gap-2 mb-4">
        {['all', 'pending', 'confirmed', 'successful', 'failed'].map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg text-sm font-medium ${
              activeTab === tab
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Records */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : breedingRecords.length === 0 ? (
          <div className="text-center py-12">
            <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No breeding records yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-green-600 hover:underline"
            >
              Add your first record
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {breedingRecords.map((record) => {
              const uiStatus = toUiBreedingStatus(record.status);
              const canRecordBirth = record.status === 'confirmed_pregnant' || record.isPregnant === true;

              return (
                <div key={record._id} className="p-4 hover:bg-gray-50">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="text-2xl">
                        {speciesEmoji[record.damId?.species] || '🐾'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
                            {record.damId?.name || record.damId?.tagId || 'Dam'}
                          </span>
                          <span className="text-gray-400">×</span>
                          <span className="text-gray-600">
                            {record.sireId?.name || record.sireId?.tagId || 'AI'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-sm text-gray-500 mt-1">
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

                    <div className="flex items-center gap-3">
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
                        onClick={() => deleteBreeding.mutate(record._id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {Array.isArray(record.followUps) && record.followUps.length > 0 && (
                    <div className="mt-3 bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2 text-blue-700">
                          <CheckCircle className="w-4 h-4" />
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
                              <div key={f._id || `${f.type}-${f.dueDate}`} className="bg-white border border-blue-100 rounded-lg p-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-sm font-medium text-gray-800">{f.title}</p>
                                    <p className="text-xs text-gray-500">Due: {new Date(f.dueDate).toLocaleDateString()}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`px-2 py-0.5 rounded-full text-xs ${
                                        f.status === 'done'
                                          ? 'bg-green-100 text-green-700'
                                          : f.status === 'skipped'
                                            ? 'bg-gray-100 text-gray-600'
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
                                      <span className="text-[11px] text-gray-500">Available on due date</span>
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
                                        className="text-xs text-gray-700 hover:underline disabled:opacity-50"
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
                        <Baby className="w-4 h-4" />
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
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Add Breeding Record</h2>

            {actionError && (
              <div className="bg-red-50 border border-red-100 text-red-700 text-sm rounded-lg p-3 mb-3">
                {actionError}
              </div>
            )}

            {!isBreedingAllLoading && !femaleEligibility.eligible && (selectedFemaleId || prefillFemaleId) && (
              <div className="bg-amber-50 border border-amber-100 text-amber-800 text-sm rounded-lg p-3 mb-3">
                {femaleEligibility.reason}
              </div>
            )}
            
            <form onSubmit={handleAddBreeding} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Method *
                  </label>
                  <select name="breedingMethod" required className="w-full border rounded-lg px-3 py-2">
                    <option value="natural">Natural</option>
                    <option value="artificial">Artificial Insemination</option>
                    <option value="embryo_transfer">Embryo Transfer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addBreeding.isPending || isBreedingAllLoading || !femaleEligibility.eligible}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addBreeding.isPending ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Birth Modal */}
      {showBirthModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-4">Record Birth</h2>
            
            <form onSubmit={handleRecordBirth} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  placeholder="Any complications, health observations..."
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowBirthModal(null)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordBirth.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {recordBirth.isPending ? 'Recording...' : 'Record Birth'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
