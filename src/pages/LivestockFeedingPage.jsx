import { useEffect, useMemo, useState, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  Calendar,
  Clock,
  Utensils,
  TrendingUp,
  Filter,
  Trash2
} from 'lucide-react';
import api from '../lib/axios';
import ModalShell from '../components/ui/ModalShell';
import { Button } from '../components/ui/Button';
import { LoadingState, EmptyState } from '../components/ui/States';

const feedTypeColors = {
  grain: 'bg-amber-100 text-amber-700',
  hay: 'bg-green-100 text-green-700',
  silage: 'bg-lime-100 text-lime-700',
  concentrate: 'bg-orange-100 text-orange-700',
  supplement: 'bg-purple-100 text-purple-700',
  water: 'bg-blue-100 text-blue-700',
  mixed: 'bg-muted text-muted-foreground'
};

export default function LivestockFeedingPage() {
  const [searchParams] = useSearchParams();
  const goBack = useNavigateBack('/livestock');
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [showSchedulesModal, setShowSchedulesModal] = useState(false);
  const [filterDays, setFilterDays] = useState(30);

  const [scheduleLivestockId, setScheduleLivestockId] = useState('');
  const [selectedFeedingRecordId, setSelectedFeedingRecordId] = useState('');
  const [scheduleTimeInput, setScheduleTimeInput] = useState('');
  const [scheduleTimes, setScheduleTimes] = useState([]);
  const [scheduleDays, setScheduleDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [scheduleTimezone, setScheduleTimezone] = useState('Africa/Lagos');

  const closeAddModal = useCallback(() => setShowAddModal(false), []);
  const closeSchedulesModal = useCallback(() => setShowSchedulesModal(false), []);

  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const formatDays = (days) => (Array.isArray(days) && days.length ? days.map((d) => dayLabels[d] ?? d).join(', ') : 'Daily');

  // Fetch farms
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return res.data.data || [];
    }
  });

  const selectedFarm = farms.find(f => f._id === farmId) || farms[0];

  // Fetch livestock for farm
  const { data: livestock = [] } = useQuery({
    queryKey: ['livestock', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${selectedFarm._id}`);
      return res.data.data || [];
    },
    enabled: !!selectedFarm?._id
  });

  // Fetch feeding records
  const { data: feedingData, isLoading } = useQuery({
    queryKey: ['feeding-records', selectedFarm?._id, filterDays],
    queryFn: async () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - filterDays);
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/feeding`, {
        params: { startDate: startDate.toISOString() }
      });
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const feedingRecords = feedingData?.data || [];

  const [nowMs, setNowMs] = useState(null);
  useEffect(() => {
    const update = () => setNowMs(Date.now());

    const timeoutId = setTimeout(update, 0);
    const intervalId = setInterval(update, 60 * 1000);

    return () => {
      clearTimeout(timeoutId);
      clearInterval(intervalId);
    };
  }, []);

  const openSchedulesModal = () => {
    setScheduleTimeInput(new Date().toTimeString().slice(0, 5));
    setShowSchedulesModal(true);
  };

  // Helper to find active stock
  const activeRecords = useMemo(() => {
    if (nowMs == null) return [];

    return feedingRecords.filter(r => {
      const start = new Date(r.feedingTime).getTime();
      const durationMs = (r.intendedDurationDays || 1) * 24 * 60 * 60 * 1000;
      return nowMs < (start + durationMs);
    });
  }, [feedingRecords, nowMs]);

  // Fetch consumption stats
  const { data: statsData } = useQuery({
    queryKey: ['feeding-stats', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/feeding/stats`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const stats = statsData?.data || {};

  // Fetch feeding schedules (used for dashboard counts + modal)
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['feeding-schedules', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/feeding/schedules`);
      return res.data;
    },
    enabled: !!selectedFarm?._id,
  });

  const feedingSchedules = schedulesData?.data || [];

  const scheduleCounts = useMemo(() => {
    const total = Array.isArray(feedingSchedules) ? feedingSchedules.length : 0;
    const active = Array.isArray(feedingSchedules)
      ? feedingSchedules.filter((s) => Boolean(s?.enabled)).length
      : 0;

    return {
      total,
      active,
      disabled: Math.max(0, total - active),
    };
  }, [feedingSchedules]);

  const addSchedule = useMutation({
    mutationFn: async (payload) => {
      const res = await api.post(`/livestock-management/farms/${selectedFarm._id}/feeding/schedules`, payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feeding-schedules']);
      setScheduleTimes([]);
      setScheduleDays([0, 1, 2, 3, 4, 5, 6]);
      setScheduleLivestockId('');
    },
  });

  const updateSchedule = useMutation({
    mutationFn: async ({ scheduleId, patch }) => {
      const res = await api.put(`/livestock-management/feeding-schedules/${scheduleId}`, patch);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feeding-schedules']);
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: async (scheduleId) => {
      await api.delete(`/livestock-management/feeding-schedules/${scheduleId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feeding-schedules']);
    },
  });

  // Add feeding record
  const addFeeding = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/livestock-management/farms/${selectedFarm._id}/feeding`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feeding-records']);
      queryClient.invalidateQueries(['feeding-stats']);
      setShowAddModal(false);
    }
  });

  // Delete feeding record
  const deleteFeeding = useMutation({
    mutationFn: async (feedingId) => {
      await api.delete(`/livestock-management/feeding/${feedingId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['feeding-records']);
      queryClient.invalidateQueries(['feeding-stats']);
    }
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    const livestockId = formData.get('livestockId') || undefined;
    const intendedDurationDays = parseInt(formData.get('duration') || '1', 10);

    const totalCostRaw = formData.get('cost');
    const totalCost = typeof totalCostRaw === 'string' && totalCostRaw.trim().length
      ? parseFloat(totalCostRaw)
      : undefined;

    const data = {
      livestockId,
      feedType: formData.get('feedType'),
      // Backend uses feedBrand; keep UI label as “Feed Name”
      feedBrand: formData.get('feedName'),
      quantity: parseFloat(formData.get('quantity')),
      unit: formData.get('unit'),
      totalCost,
      notes: formData.get('notes') || undefined,
      intendedDurationDays,
    };

    addFeeding.mutate(data);
  };

  if (!selectedFarm) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <Utensils className="w-12 h-12 text-muted-foreground/50 mx-auto mb-4" aria-hidden="true" />
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
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} aria-label="Go back" className="p-2 hover:bg-muted rounded-lg">
            <ArrowLeft className="w-5 h-5" aria-hidden="true" />
          </button>
          <div>
            <h1 className="text-2xl font-bold sm:text-3xl">Feeding Management</h1>
            <p className="text-muted-foreground">{selectedFarm.name}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={openSchedulesModal}
            className="flex items-center gap-2"
          >
            <Clock className="w-4 h-4" aria-hidden="true" />
            Schedules
          </Button>
          <Button
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            Add Feeding Record
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Utensils className="w-5 h-5 text-amber-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Feed (30d)</p>
              <p className="text-xl font-bold">{stats.totalQuantity?.toFixed(1) || 0} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Daily Avg</p>
              <p className="text-xl font-bold">{stats.dailyAverage?.toFixed(1) || 0} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Records (30d)</p>
              <p className="text-xl font-bold">{stats.totalRecords || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" aria-hidden="true" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Cost</p>
              <p className="text-xl font-bold">₦{stats.totalCost?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-card rounded-xl p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-muted rounded-lg">
              <Clock className="w-5 h-5 text-muted-foreground" aria-hidden="true" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">Feeding Schedules</p>
              <div className="mt-1 grid grid-cols-3 gap-3">
                <div>
                  <p className="text-[11px] text-muted-foreground">Available</p>
                  <p className="text-lg font-bold">
                    {schedulesLoading && feedingSchedules.length === 0 ? '—' : scheduleCounts.total}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Active</p>
                  <p className="text-lg font-bold text-green-700">
                    {schedulesLoading && feedingSchedules.length === 0 ? '—' : scheduleCounts.active}
                  </p>
                </div>
                <div>
                  <p className="text-[11px] text-muted-foreground">Disabled</p>
                  <p className="text-lg font-bold text-foreground">
                    {schedulesLoading && feedingSchedules.length === 0 ? '—' : scheduleCounts.disabled}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-muted-foreground" aria-hidden="true" />
          <span className="text-sm text-muted-foreground">Show last:</span>
        </div>
        {[7, 14, 30, 90].map(days => (
          <button
            key={days}
            type="button"
            onClick={() => setFilterDays(days)}
            aria-pressed={filterDays === days}
            className={`px-3 py-1 rounded-full text-sm ${
              filterDays === days
                ? 'bg-green-600 text-white'
                : 'bg-muted text-muted-foreground hover:bg-muted/80'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-card rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <LoadingState label="Loading feeding records..." />
        ) : feedingRecords.length === 0 ? (
          <EmptyState
            icon={<Utensils className="h-8 w-8" aria-hidden="true" />}
            title="No feeding records yet"
            action={
              <Button type="button" variant="link" onClick={() => setShowAddModal(true)}>
                Add your first record
              </Button>
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-muted border-b">
                <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Date/Time</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Feed Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Feed Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Quantity</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Cost</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-muted-foreground">Animals</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {feedingRecords.map(record => (
                <tr key={record._id} className="hover:bg-muted/40">
                  <td className="px-6 py-4 text-sm">
                    {new Date(record.feedingTime).toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded-full text-xs ${feedTypeColors[record.feedType] || feedTypeColors.mixed}`}>
                      {record.feedType}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium">{record.feedBrand || record.feedName || '-'}</td>
                  <td className="px-6 py-4 text-sm">{record.quantity} {record.unit}</td>
                  <td className="px-6 py-4 text-sm">
                    {record.totalCost ? `₦${record.totalCost.toLocaleString()}` : (record.cost ? `₦${record.cost.toLocaleString()}` : '-')}
                  </td>
                  <td className="px-6 py-4 text-sm text-muted-foreground">
                    {record.animalsCount || (record.livestockId ? 1 : 'All')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      type="button"
                      onClick={() => deleteFeeding.mutate(record._id)}
                      aria-label="Delete feeding record"
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden="true" />
                    </button>
                  </td>
                </tr>
              ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Schedules Modal */}
      <ModalShell
        open={showSchedulesModal}
        onClose={closeSchedulesModal}
        title="Feeding Schedules"
        size="lg"
        bodyClassName="space-y-6"
        footer={
          <Button type="button" variant="outline" onClick={closeSchedulesModal}>
            Close
          </Button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Create schedule</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Animal (Optional)</label>
                    <select
                      value={scheduleLivestockId}
                      onChange={(e) => setScheduleLivestockId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">All animals</option>
                      {livestock.map((l) => (
                        <option key={l._id} value={l._id}>
                          {l.name || l.tagId} ({l.species})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Active Feed Stock (Optional)</label>
                    <select
                      value={selectedFeedingRecordId}
                      onChange={(e) => setSelectedFeedingRecordId(e.target.value)}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">Manual feed details</option>
                      {activeRecords.map((r) => (
                        <option key={r._id} value={r._id}>
                          {r.feedBrand || r.feedType} ({r.quantity}{r.unit}) - Logged {new Date(r.feedingTime).toLocaleDateString()}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Timezone</label>
                    <input
                      value={scheduleTimezone}
                      onChange={(e) => setScheduleTimezone(e.target.value)}
                      placeholder="Africa/Lagos"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Reminder times</label>
                    <div className="flex gap-2">
                      <input
                        type="time"
                        value={scheduleTimeInput}
                        onChange={(e) => setScheduleTimeInput(e.target.value)}
                        className="w-full border rounded-lg px-3 py-2"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          const t = scheduleTimeInput;
                          if (!t) return;
                          setScheduleTimes((prev) => (prev.includes(t) ? prev : [...prev, t].sort()));
                        }}
                        className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
                      >
                        Add
                      </button>
                    </div>

                    {scheduleTimes.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-2">
                        {scheduleTimes.map((t) => (
                          <button
                            key={t}
                            type="button"
                            onClick={() => setScheduleTimes((prev) => prev.filter((x) => x !== t))}
                            className="px-2 py-1 rounded-full text-xs bg-muted hover:bg-muted/80"
                            title="Remove"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">Days</label>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((label, idx) => {
                        const checked = scheduleDays.includes(idx);
                        return (
                          <label key={label} className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setScheduleDays((prev) =>
                                  e.target.checked ? [...prev, idx].sort() : prev.filter((d) => d !== idx)
                                );
                              }}
                            />
                            {label}
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={addSchedule.isPending || scheduleTimes.length === 0 || scheduleDays.length === 0}
                    onClick={() => {
                      const payload = {
                        livestockId: scheduleLivestockId || undefined,
                        feedingRecordId: selectedFeedingRecordId || undefined,
                        timesOfDay: scheduleTimes,
                        daysOfWeek: scheduleDays.length === 7 ? undefined : scheduleDays,
                        timezone: scheduleTimezone || undefined,
                      };
                      addSchedule.mutate(payload);
                    }}
                    className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {addSchedule.isPending ? 'Saving…' : 'Save schedule'}
                  </button>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-semibold text-foreground mb-2">Existing schedules</h3>

                {schedulesLoading ? (
                  <LoadingState label="Loading schedules..." />
                ) : feedingSchedules.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No schedules yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                    {feedingSchedules.map((s) => (
                      <div key={s._id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {(s.timesOfDay || []).join(', ')}{' '}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-muted text-muted-foreground'}`}>
                                {s.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Days: {formatDays(s.daysOfWeek)}
                              {s.timezone ? ` • TZ: ${s.timezone}` : ''}
                              {s.livestockId ? ` • Animal: ${s.livestockId?.name || s.livestockId?.tagId}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSchedule.mutate({ scheduleId: s._id, patch: { enabled: !s.enabled } })}
                              className="px-2 py-1 text-xs rounded-lg border hover:bg-muted"
                            >
                              {s.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSchedule.mutate(s._id)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete"
                              aria-label="Delete schedule"
                            >
                              <Trash2 className="w-4 h-4" aria-hidden="true" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
      </ModalShell>

      {/* Add Modal */}
      <ModalShell
        open={showAddModal}
        onClose={closeAddModal}
        title="Add Feeding Record"
        size="sm"
        bodyClassName="space-y-4"
        footer={
          <>
            <Button type="button" variant="outline" onClick={closeAddModal}>
              Cancel
            </Button>
            <Button type="submit" form="add-feeding-form" loading={addFeeding.isPending}>
              {addFeeding.isPending ? 'Adding...' : 'Add Record'}
            </Button>
          </>
        }
      >
        <p className="text-sm text-muted-foreground">
          Note: your feeding insights on this page are summarized over the last <span className="font-semibold">30 days</span>.
        </p>

        <form id="add-feeding-form" onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Animal (Optional)
                </label>
                <select name="livestockId" className="w-full border rounded-lg px-3 py-2">
                  <option value="">All animals</option>
                  {livestock.map(l => (
                    <option key={l._id} value={l._id}>
                      {l.name || l.tagId} ({l.species})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Feed Type *
                  </label>
                  <select name="feedType" required className="w-full border rounded-lg px-3 py-2">
                    <option value="grain">Grain</option>
                    <option value="hay">Hay</option>
                    <option value="silage">Silage</option>
                    <option value="concentrate">Concentrate</option>
                    <option value="supplement">Supplement</option>
                    <option value="water">Water</option>
                    <option value="mixed">Mixed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Feed Name *
                  </label>
                  <input
                    type="text"
                    name="feedName"
                    required
                    placeholder="e.g., Maize"
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    step="0.1"
                    required
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-foreground mb-1">
                    Unit
                  </label>
                  <select name="unit" className="w-full border rounded-lg px-3 py-2">
                    <option value="kg">kg</option>
                    <option value="lbs">lbs</option>
                    <option value="liters">liters</option>
                    <option value="bags">bags</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Cost (₦)
                </label>
                <input
                  type="number"
                  name="cost"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Time of Day
                </label>
                <select name="scheduleType" className="w-full border rounded-lg px-3 py-2">
                  <option value="">Specific occurrence</option>
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="ad_libitum">Ad libitum</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-1">
                  Intended For (Duration)
                </label>
                <select name="duration" className="w-full border rounded-lg px-3 py-2">
                  <option value="1">Today only</option>
                  <option value="7">A week</option>
                  <option value="14">2 weeks</option>
                  <option value="30">30 days</option>
                  <option value="90">90 days</option>
                </select>
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
    </div>
  );
}
