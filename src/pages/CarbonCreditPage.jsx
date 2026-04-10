import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  TrendingUp,
  ShieldCheck,
  Clock,
  Download,
  Search,
  ChevronRight,
  AlertCircle,
  Plus,
  X,
  RefreshCw
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const CarbonCreditPage = () => {
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [selectedFarm, setSelectedFarm] = React.useState('');
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCredit, setSelectedCredit] = React.useState(null);
  const queryClient = useQueryClient();

  const { data: credits, isLoading, error } = useQuery({
    queryKey: ['carbon-credits'],
    queryFn: async () => {
      const response = await api.get('/credits/history');
      return response.data.data;
    }
  });

  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data || [];
    }
  });

  const generateMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/credits/generate', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['carbon-credits'] });
      setShowGenerateModal(false);
      setSelectedFarm('');
      setPeriodStart('');
      setPeriodEnd('');
    }
  });

  const stats = React.useMemo(() => {
    if (!credits) return { total: 0, verified: 0, pending: 0 };
    return credits.reduce(
      (acc, curr) => {
        acc.total += curr.creditsEarned;
        if (curr.status === 'verified' || curr.status === 'issued') acc.verified += curr.creditsEarned;
        if (curr.status === 'pending-verification') acc.pending += curr.creditsEarned;
        return acc;
      },
      { total: 0, verified: 0, pending: 0 }
    );
  }, [credits]);

  const filteredCredits = React.useMemo(() => {
    const term = (searchTerm || '').trim().toLowerCase();
    if (!term) return credits || [];
    return (credits || []).filter((c) => {
      const farmName = String(c.farmId?.name || '').toLowerCase();
      const city = String(c.farmId?.location?.city || '').toLowerCase();
      const country = String(c.farmId?.location?.country || '').toLowerCase();
      return farmName.includes(term) || city.includes(term) || country.includes(term);
    });
  }, [credits, searchTerm]);

  const exportCreditsCsv = () => {
    const rows = filteredCredits.map((c) => ({
      farm: c.farmId?.name || 'Unknown Farm',
      city: c.farmId?.location?.city || '',
      country: c.farmId?.location?.country || '',
      periodStart: c.periodStart ? new Date(c.periodStart).toISOString() : '',
      periodEnd: c.periodEnd ? new Date(c.periodEnd).toISOString() : '',
      creditsEarned: Number(c.creditsEarned || 0),
      status: c.isEstimated ? 'estimated' : (c.status || ''),
      creditType: c.creditType || '',
      monthKey: c.monthKey || ''
    }));

    const header = Object.keys(rows[0] || {
      farm: '',
      city: '',
      country: '',
      periodStart: '',
      periodEnd: '',
      creditsEarned: 0,
      status: '',
      creditType: '',
      monthKey: ''
    });

    const escape = (v) => {
      const s = String(v ?? '');
      const needsQuotes = /[\n\r,\"]/g.test(s);
      const escaped = s.replace(/\"/g, '""');
      return needsQuotes ? `"${escaped}"` : escaped;
    };

    const csv = [header.join(','), ...rows.map((r) => header.map((k) => escape(r[k])).join(','))].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `carbon-credits-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'verified':
      case 'issued':
        return 'bg-green-100 text-green-700 border-green-200';
      case 'pending-verification':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'retired':
        return 'bg-gray-100 text-gray-700 border-gray-200';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Credit Details Modal */}
      {selectedCredit && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-lg p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h2 className="text-xl font-black text-gray-900">Credit Details</h2>
                <p className="text-sm text-gray-500 font-medium mt-1">
                  {selectedCredit.farmId?.name || 'Unknown Farm'}
                </p>
              </div>
              <button
                onClick={() => setSelectedCredit(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Period</p>
                <p className="mt-1 font-bold text-gray-800 text-sm">
                  {selectedCredit.periodStart ? new Date(selectedCredit.periodStart).toLocaleDateString() : '—'}
                  {' '}–{' '}
                  {selectedCredit.periodEnd ? new Date(selectedCredit.periodEnd).toLocaleDateString() : '—'}
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Credits</p>
                <p className="mt-1 font-black text-gray-900 text-lg">
                  {Number(selectedCredit.creditsEarned || 0).toFixed(2)} <span className="text-xs font-bold text-gray-400">MT</span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                <p className="mt-2">
                  <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedCredit.status)}`}>
                    {selectedCredit.isEstimated ? 'estimated' : selectedCredit.status?.replace('-', ' ')}
                  </span>
                </p>
              </div>
              <div className="bg-gray-50 rounded-2xl p-4">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Type</p>
                <p className="mt-1 font-bold text-gray-800 text-sm">
                  {selectedCredit.creditType || 'final'}{selectedCredit.monthKey ? ` • ${selectedCredit.monthKey}` : ''}
                </p>
              </div>
            </div>

            <div className="mt-6 flex justify-end">
              <Button variant="outline" className="rounded-2xl" onClick={() => setSelectedCredit(null)}>
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Generate Credits Modal */}
      {showGenerateModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md p-8 animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-black text-gray-900">Generate Carbon Credits</h2>
              <button
                onClick={() => setShowGenerateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Select Farm</label>
                <select
                  value={selectedFarm}
                  onChange={(e) => setSelectedFarm(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                >
                  <option value="">Choose a farm...</option>
                  {farms?.map((farm) => (
                    <option key={farm._id} value={farm._id}>
                      {farm.name} - {farm.location?.city}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Period Start</label>
                <input
                  type="date"
                  value={periodStart}
                  onChange={(e) => setPeriodStart(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-600 mb-2">Period End</label>
                <input
                  type="date"
                  value={periodEnd}
                  onChange={(e) => setPeriodEnd(e.target.value)}
                  className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
                />
              </div>

              {generateMutation.isError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm font-medium">
                  {generateMutation.error?.response?.data?.message || 'Failed to generate credits'}
                </div>
              )}

              <Button
                onClick={() => generateMutation.mutate({ farmId: selectedFarm, periodStart, periodEnd })}
                disabled={!selectedFarm || !periodStart || !periodEnd || generateMutation.isPending}
                className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 mt-4"
              >
                {generateMutation.isPending ? (
                  <>
                    <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Plus className="mr-2 h-5 w-5" />
                    Generate Credits
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Carbon Credits</h1>
          <p className="text-gray-500 mt-1 font-medium">Monetize your farm's sustainable practices.</p>
        </div>
        <div className="flex gap-3">
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" />
            Generate Credits
          </Button>
          <Button
            variant="outline"
            onClick={exportCreditsCsv}
            disabled={!filteredCredits?.length}
            className="rounded-2xl h-12 px-6 font-bold border-gray-200"
          >
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-primary to-green-600 text-white p-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <TrendingUp className="h-6 w-6 text-white" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 bg-white/10 px-2 py-1 rounded-full">Lifetime Total</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black">{stats.total.toFixed(2)}</h3>
              <p className="text-white/80 font-bold text-sm uppercase tracking-tighter">Metric Tons CO2e</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-green-50 p-3 rounded-2xl">
                <ShieldCheck className="h-6 w-6 text-green-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified Assets</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black text-gray-900">{stats.verified.toFixed(2)}</h3>
              <p className="text-gray-400 font-bold text-sm uppercase tracking-tighter">Available for Trade</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-white p-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-start mb-4">
              <div className="bg-amber-50 p-3 rounded-2xl">
                <Clock className="h-6 w-6 text-amber-600" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-full">In Verification</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-4xl font-black text-gray-900">{stats.pending.toFixed(2)}</h3>
              <p className="text-gray-400 font-bold text-sm uppercase tracking-tighter">Processing Units</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
        <div className="p-8 border-b border-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Credit History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by farm..."
                className="w-full h-10 pl-10 pr-4 bg-gray-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-16 bg-gray-50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : filteredCredits?.length > 0 ? (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/50">
                  <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Farm Asset</th>
                  <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Period</th>
                  <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Credits Earned</th>
                  <th className="text-left py-4 px-8 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                  <th className="py-4 px-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredCredits.map((credit) => (
                  <tr key={credit._id} className="hover:bg-gray-50/50 transition-colors group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {credit.farmId?.name?.charAt(0) || 'F'}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">{credit.farmId?.name || 'Unknown Farm'}</p>
                          <p className="text-xs text-gray-400 font-medium">{credit.farmId?.location?.city}, {credit.farmId?.location?.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-sm font-bold text-gray-600">
                        {new Date(credit.periodStart).toLocaleDateString()} - {new Date(credit.periodEnd).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-tighter">Calculation Period</p>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-gray-900">{credit.creditsEarned.toFixed(2)}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">MT</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(credit.status)}`}>
                        {credit.isEstimated ? 'estimated' : credit.status?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCredit(credit)}
                        className="p-2 text-gray-300 group-hover:text-primary transition-colors"
                        aria-label="View credit details"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-24 text-center">
              <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="h-10 w-10 text-gray-300" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No credits found</h3>
              <p className="text-gray-500 max-w-sm mx-auto font-medium">
                Start logging sustainable practices for your farms to begin earning carbon credits.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CarbonCreditPage;
