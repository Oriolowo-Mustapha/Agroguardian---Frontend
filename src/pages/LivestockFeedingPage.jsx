import { useState } from 'react';
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
  Trash2,
  Loader2
} from 'lucide-react';
import api from '../lib/axios';

const feedTypeColors = {
  grain: 'bg-amber-100 text-amber-700',
  hay: 'bg-green-100 text-green-700',
  silage: 'bg-lime-100 text-lime-700',
  concentrate: 'bg-orange-100 text-orange-700',
  supplement: 'bg-purple-100 text-purple-700',
  water: 'bg-blue-100 text-blue-700',
  mixed: 'bg-gray-100 text-gray-700'
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
  const [scheduleTimeInput, setScheduleTimeInput] = useState(new Date().toTimeString().slice(0, 5));
  const [scheduleTimes, setScheduleTimes] = useState([]);
  const [scheduleDays, setScheduleDays] = useState([0, 1, 2, 3, 4, 5, 6]);
  const [scheduleTimezone, setScheduleTimezone] = useState('Africa/Lagos');

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

  // Fetch feeding schedules (load when modal opens)
  const { data: schedulesData, isLoading: schedulesLoading } = useQuery({
    queryKey: ['feeding-schedules', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-management/farms/${selectedFarm._id}/feeding/schedules`);
      return res.data;
    },
    enabled: !!selectedFarm?._id && showSchedulesModal,
  });

  const feedingSchedules = schedulesData?.data || [];

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
    const feedingTimeInput = formData.get('feedingTime');

    // UI collects time-only (HH:mm). Backend expects a Date/ISO string.
    let feedingTime = new Date().toISOString();
    if (typeof feedingTimeInput === 'string' && /^\d{2}:\d{2}$/.test(feedingTimeInput)) {
      const now = new Date();
      const [hh, mm] = feedingTimeInput.split(':').map(Number);
      const dt = new Date(now);
      dt.setHours(hh, mm, 0, 0);
      feedingTime = dt.toISOString();
    } else if (typeof feedingTimeInput === 'string' && feedingTimeInput.trim()) {
      feedingTime = feedingTimeInput;
    }

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
      feedingTime,
    };

    addFeeding.mutate(data);
  };

  if (!selectedFarm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
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
            <h1 className="text-2xl font-bold">Feeding Management</h1>
            <p className="text-gray-500">{selectedFarm.name}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowSchedulesModal(true)}
            className="flex items-center gap-2 bg-white text-gray-700 border px-4 py-2 rounded-lg hover:bg-gray-50"
          >
            <Clock className="w-4 h-4" />
            Schedules
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Plus className="w-4 h-4" />
            Add Feeding Record
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-lg">
              <Utensils className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Feed (30d)</p>
              <p className="text-xl font-bold">{stats.totalQuantity?.toFixed(1) || 0} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Daily Avg</p>
              <p className="text-xl font-bold">{stats.dailyAverage?.toFixed(1) || 0} kg</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Records (30d)</p>
              <p className="text-xl font-bold">{stats.totalRecords || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <Clock className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Cost</p>
              <p className="text-xl font-bold">₦{stats.totalCost?.toLocaleString() || 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Show last:</span>
        </div>
        {[7, 14, 30, 90].map(days => (
          <button
            key={days}
            onClick={() => setFilterDays(days)}
            className={`px-3 py-1 rounded-full text-sm ${
              filterDays === days
                ? 'bg-green-600 text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {days} days
          </button>
        ))}
      </div>

      {/* Records Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : feedingRecords.length === 0 ? (
          <div className="text-center py-12">
            <Utensils className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No feeding records yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-green-600 hover:underline"
            >
              Add your first record
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date/Time</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Feed Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Feed Name</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Quantity</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Cost</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Animals</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {feedingRecords.map(record => (
                <tr key={record._id} className="hover:bg-gray-50">
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
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {record.animalsCount || (record.livestockId ? 1 : 'All')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => deleteFeeding.mutate(record._id)}
                      className="text-red-500 hover:text-red-700 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
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
      {showSchedulesModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Feeding Schedules</h2>
              <button
                type="button"
                onClick={() => setShowSchedulesModal(false)}
                className="px-3 py-1 rounded-lg text-gray-600 hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Create schedule</h3>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Animal (Optional)</label>
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Timezone</label>
                    <input
                      value={scheduleTimezone}
                      onChange={(e) => setScheduleTimezone(e.target.value)}
                      placeholder="Africa/Lagos"
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Reminder times</label>
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
                        className="px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
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
                            className="px-2 py-1 rounded-full text-xs bg-gray-100 hover:bg-gray-200"
                            title="Remove"
                          >
                            {t}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Days</label>
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
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Existing schedules</h3>

                {schedulesLoading ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : feedingSchedules.length === 0 ? (
                  <p className="text-sm text-gray-500">No schedules yet.</p>
                ) : (
                  <div className="space-y-3 max-h-[420px] overflow-auto pr-1">
                    {feedingSchedules.map((s) => (
                      <div key={s._id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold">
                              {(s.timesOfDay || []).join(', ')}{' '}
                              <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${s.enabled ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                                {s.enabled ? 'Enabled' : 'Disabled'}
                              </span>
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              Days: {formatDays(s.daysOfWeek)}
                              {s.timezone ? ` • TZ: ${s.timezone}` : ''}
                              {s.livestockId ? ` • Animal: ${s.livestockId?.name || s.livestockId?.tagId}` : ''}
                            </p>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => updateSchedule.mutate({ scheduleId: s._id, patch: { enabled: !s.enabled } })}
                              className="px-2 py-1 text-xs rounded-lg border hover:bg-gray-50"
                            >
                              {s.enabled ? 'Disable' : 'Enable'}
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteSchedule.mutate(s._id)}
                              className="p-1 text-red-500 hover:text-red-700"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6">
            <h2 className="text-lg font-semibold mb-2">Add Feeding Record</h2>
            <p className="text-sm text-gray-600 mb-4">
              Note: your feeding insights on this page are summarized over the last <span className="font-semibold">30 days</span>.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Cost (₦)
                </label>
                <input
                  type="number"
                  name="cost"
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Feeding Time
                </label>
                <input
                  type="time"
                  name="feedingTime"
                  defaultValue={new Date().toTimeString().slice(0, 5)}
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
                  disabled={addFeeding.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addFeeding.isPending ? 'Adding...' : 'Add Record'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
