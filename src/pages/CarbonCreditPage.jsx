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
  Plus
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import ModalShell from '../components/ui/ModalShell';
import { LoadingState, EmptyState } from '../components/ui/States';

const CarbonCreditPage = () => {
  const [showGenerateModal, setShowGenerateModal] = React.useState(false);
  const [selectedFarm, setSelectedFarm] = React.useState('');
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedCredit, setSelectedCredit] = React.useState(null);
  const queryClient = useQueryClient();

  const formatCredits = (num) => {
    const val = Number(num || 0);
    // If it's a very small number, show more precision (up to 6 decimal places)
    // otherwise show 4 decimal places for accuracy as requested by user.
    if (val > 0 && val < 0.1) return val.toFixed(6);
    return val.toFixed(4);
  };

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
        return 'bg-muted text-muted-foreground border-border';
      default:
        return 'bg-blue-100 text-blue-700 border-blue-200';
    }
  };

  return (
    <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Credit Details Modal */}
      <ModalShell
        open={!!selectedCredit}
        onClose={() => setSelectedCredit(null)}
        title="Credit Details"
        description={selectedCredit?.farmId?.name || 'Unknown Farm'}
        size="md"
        footer={
          <Button type="button" variant="outline" onClick={() => setSelectedCredit(null)}>
            Close
          </Button>
        }
      >
        {selectedCredit && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-muted rounded-2xl p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Period</p>
              <p className="mt-1 font-bold text-foreground text-sm">
                {selectedCredit.periodStart ? new Date(selectedCredit.periodStart).toLocaleDateString() : '—'}
                {' '}–{' '}
                {selectedCredit.periodEnd ? new Date(selectedCredit.periodEnd).toLocaleDateString() : '—'}
              </p>
            </div>
            <div className="bg-muted rounded-2xl p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Credits</p>
              <p className="mt-1 font-black text-foreground text-lg">
                {formatCredits(selectedCredit.creditsEarned)} <span className="text-xs font-bold text-muted-foreground">MT</span>
              </p>
            </div>
            <div className="bg-muted rounded-2xl p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</p>
              <p className="mt-2">
                <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${getStatusColor(selectedCredit.status)}`}>
                  {selectedCredit.isEstimated ? 'estimated' : selectedCredit.status?.replace('-', ' ')}
                </span>
              </p>
            </div>
            <div className="bg-muted rounded-2xl p-4">
              <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Type</p>
              <p className="mt-1 font-bold text-foreground text-sm">
                {selectedCredit.creditType || 'final'}{selectedCredit.monthKey ? ` • ${selectedCredit.monthKey}` : ''}
              </p>
            </div>
          </div>
        )}
      </ModalShell>

      {/* Generate Credits Modal */}
      <ModalShell
        open={showGenerateModal}
        onClose={() => setShowGenerateModal(false)}
        title="Generate Carbon Credits"
        size="sm"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowGenerateModal(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={() => generateMutation.mutate({ farmId: selectedFarm, periodStart, periodEnd })}
              disabled={!selectedFarm || !periodStart || !periodEnd || generateMutation.isPending}
              loading={generateMutation.isPending}
              className="h-14 rounded-2xl font-black shadow-lg shadow-primary/20"
            >
              {!generateMutation.isPending && <Plus className="mr-2 h-5 w-5" aria-hidden="true" />}
              {generateMutation.isPending ? 'Generating...' : 'Generate Credits'}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label htmlFor="cc-farm" className="block text-sm font-bold text-muted-foreground mb-2">Select Farm</label>
            <select
              id="cc-farm"
              value={selectedFarm}
              onChange={(e) => setSelectedFarm(e.target.value)}
              className="w-full h-12 px-4 bg-muted border border-border rounded-xl font-medium text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
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
            <label htmlFor="cc-period-start" className="block text-sm font-bold text-muted-foreground mb-2">Period Start</label>
            <input
              id="cc-period-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-full h-12 px-4 bg-muted border border-border rounded-xl font-medium text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          <div>
            <label htmlFor="cc-period-end" className="block text-sm font-bold text-muted-foreground mb-2">Period End</label>
            <input
              id="cc-period-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-full h-12 px-4 bg-muted border border-border rounded-xl font-medium text-base focus:ring-2 focus:ring-primary focus:border-transparent outline-none"
            />
          </div>

          {generateMutation.isError && (
            <div role="alert" className="bg-destructive/10 border border-destructive/20 text-destructive px-4 py-3 rounded-xl text-sm font-medium">
              {generateMutation.error?.response?.data?.message || 'Failed to generate credits'}
            </div>
          )}
        </div>
      </ModalShell>

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tight">Carbon Credits</h1>
          <p className="text-muted-foreground mt-1 font-medium">Monetize your farm's sustainable practices.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 w-full sm:w-auto">
          <Button
            onClick={() => setShowGenerateModal(true)}
            className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20 bg-primary text-white hover:bg-primary/90"
          >
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Generate Credits
          </Button>
          <Button
            variant="outline"
            onClick={exportCreditsCsv}
            disabled={!filteredCredits?.length}
            className="rounded-2xl h-12 px-6 font-bold border-border"
          >
            <Download className="mr-2 h-4 w-4" aria-hidden="true" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        <Card className="rounded-[2rem] border-none shadow-sm bg-gradient-to-br from-primary to-green-600 text-white p-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="bg-white/20 p-3 shrink-0 rounded-2xl backdrop-blur-md" aria-hidden="true">
                <TrendingUp className="h-6 w-6 text-white" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest opacity-80 bg-white/10 px-2 py-1 rounded-full">Lifetime Total</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl sm:text-4xl font-black">{formatCredits(stats.total)}</h3>
              <p className="text-white/80 font-bold text-sm uppercase tracking-tighter">Metric Tons CO2e</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-card p-2">
          <CardContent className="p-6">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="bg-green-50 p-3 shrink-0 rounded-2xl" aria-hidden="true">
                <ShieldCheck className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-green-600 bg-green-50 px-2 py-1 rounded-full">Verified Assets</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl sm:text-4xl font-black text-foreground">{formatCredits(stats.verified)}</h3>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-tighter">Available for Trade</p>
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-[2rem] border-none shadow-sm bg-card p-2 sm:col-span-2 lg:col-span-1">
          <CardContent className="p-6">
            <div className="flex justify-between items-start gap-3 mb-4">
              <div className="bg-amber-50 p-3 shrink-0 rounded-2xl" aria-hidden="true">
                <Clock className="h-6 w-6 text-amber-600" aria-hidden="true" />
              </div>
              <span className="text-[10px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 px-2 py-1 rounded-full">In Verification</span>
            </div>
            <div className="space-y-1">
              <h3 className="text-3xl sm:text-4xl font-black text-foreground">{formatCredits(stats.pending)}</h3>
              <p className="text-muted-foreground font-bold text-sm uppercase tracking-tighter">Processing Units</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* History Table */}
      <div className="bg-card rounded-[2.5rem] border border-border shadow-sm overflow-hidden">
        <div className="p-4 sm:p-8 border-b border-border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h2 className="text-lg sm:text-xl font-black text-foreground tracking-tight">Credit History</h2>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64 min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" aria-hidden="true" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search credits by farm"
                placeholder="Search by farm..."
                className="w-full h-11 pl-10 pr-4 bg-muted border-none rounded-xl text-base font-medium focus:ring-2 focus:ring-primary outline-none"
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          {isLoading ? (
            <LoadingState label="Loading credits..." />
          ) : filteredCredits?.length > 0 ? (
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="bg-muted/50">
                  <th scope="col" className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Farm Asset</th>
                  <th scope="col" className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Period</th>
                  <th scope="col" className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Credits Earned</th>
                  <th scope="col" className="text-left py-4 px-8 text-[10px] font-black text-muted-foreground uppercase tracking-widest">Status</th>
                  <th scope="col" className="py-4 px-8"><span className="sr-only">Details</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredCredits.map((credit) => (
                  <tr key={credit._id} className="hover:bg-muted/40 transition-colors group">
                    <td className="py-6 px-8">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold" aria-hidden="true">
                          {credit.farmId?.name?.charAt(0) || 'F'}
                        </div>
                        <div className="min-w-0">
                          <p className="font-bold text-foreground truncate">{credit.farmId?.name || 'Unknown Farm'}</p>
                          <p className="text-xs text-muted-foreground font-medium truncate">{credit.farmId?.location?.city}, {credit.farmId?.location?.country}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <p className="text-sm font-bold text-muted-foreground whitespace-nowrap">
                        {new Date(credit.periodStart).toLocaleDateString()} - {new Date(credit.periodEnd).toLocaleDateString()}
                      </p>
                      <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-tighter">Calculation Period</p>
                    </td>
                    <td className="py-6 px-8">
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-foreground">{formatCredits(credit.creditsEarned)}</span>
                        <span className="text-[10px] font-bold text-muted-foreground uppercase">MT</span>
                      </div>
                    </td>
                    <td className="py-6 px-8">
                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border whitespace-nowrap ${getStatusColor(credit.status)}`}>
                        {credit.isEstimated ? 'estimated' : credit.status?.replace('-', ' ')}
                      </span>
                    </td>
                    <td className="py-6 px-8 text-right">
                      <button
                        type="button"
                        onClick={() => setSelectedCredit(credit)}
                        className="p-2 text-muted-foreground group-hover:text-primary transition-colors"
                        aria-label="View credit details"
                      >
                        <ChevronRight className="h-5 w-5" aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <EmptyState
              className="py-24"
              icon={<AlertCircle className="h-8 w-8" aria-hidden="true" />}
              title="No credits found"
              description="Start logging sustainable practices for your farms to begin earning carbon credits."
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default CarbonCreditPage;
