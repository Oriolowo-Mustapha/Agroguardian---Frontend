import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  PawPrint,
  Search,
  ChevronRight,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { LoadingState, EmptyState } from '../components/ui/States';

const normalizeArray = (maybeArray) => {
  if (Array.isArray(maybeArray)) return maybeArray;
  if (Array.isArray(maybeArray?.data)) return maybeArray.data;
  if (Array.isArray(maybeArray?.items)) return maybeArray.items;
  if (Array.isArray(maybeArray?.livestock)) return maybeArray.livestock;
  return [];
};

const LivestockHealthRecordsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId') || '';
  const [searchQuery, setSearchQuery] = React.useState('');

  const {
    data: farms = [],
    isLoading: farmsLoading
  } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return normalizeArray(res.data?.data ?? res.data);
    }
  });

  const selectedFarm = farms.find((f) => f?._id === farmId) || farms[0];

  const fallbackFarmId = selectedFarm?._id || farmId;
  const navigateBack = useNavigateBack(
    fallbackFarmId ? `/livestock?farmId=${encodeURIComponent(fallbackFarmId)}` : '/livestock'
  );

  React.useEffect(() => {
    if (farmId || !selectedFarm?._id) return;
    setSearchParams({ farmId: selectedFarm._id });
  }, [farmId, selectedFarm?._id, setSearchParams]);

  const {
    data: livestock = [],
    isLoading: livestockLoading,
    refetch: refetchLivestock,
    isFetching: livestockFetching
  } = useQuery({
    queryKey: ['livestock', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${selectedFarm._id}`);
      return normalizeArray(res.data?.data ?? res.data);
    },
    enabled: !!selectedFarm?._id
  });

  const filtered = React.useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (livestock || []).filter((l) => {
      if (!l) return false;
      const label = `${l.tagNumber || ''} ${l.name || ''} ${l.species || ''}`.toLowerCase();
      return !q || label.includes(q);
    });
  }, [livestock, searchQuery]);

  const isEmpty = !livestockLoading && (livestock || []).length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={navigateBack}
            className="h-11 w-11 rounded-2xl border border-border bg-card flex items-center justify-center text-foreground hover:border-primary/30 hover:text-primary transition-colors"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" aria-hidden="true" />
          </button>

          <div className="min-w-0">
            <h1 className="text-2xl font-black text-foreground">Health Records</h1>
            <p className="text-sm text-muted-foreground">
              Select a livestock to view and manage vaccinations, treatments, illnesses, checkups, and deworming.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={selectedFarm?._id || ''}
            onChange={(e) => setSearchParams({ farmId: e.target.value })}
            disabled={farmsLoading || farms.length === 0}
            aria-label="Select farm"
            className="h-11 rounded-xl border border-border bg-card px-3 font-semibold text-foreground text-base sm:text-sm"
          >
            {farms.length === 0 ? (
              <option value="">No farms</option>
            ) : (
              farms.map((f) => (
                <option key={f._id} value={f._id}>
                  {f.name || 'Unnamed Farm'}
                </option>
              ))
            )}
          </select>

          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl"
            onClick={() => refetchLivestock()}
            loading={livestockFetching}
            disabled={!selectedFarm?._id}
          >
            Refresh
          </Button>
        </div>
      </div>

      <div>
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" aria-hidden="true" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tag, name, or species..."
            aria-label="Search livestock"
            className="pl-12 h-12 rounded-2xl"
          />
        </div>
      </div>

      {livestockLoading ? (
        <LoadingState label="Loading livestock..." />
      ) : isEmpty ? (
        <EmptyState
          icon={<Heart className="h-10 w-10 text-primary/50" aria-hidden="true" />}
          title="No livestock found"
          description="Add livestock first, then come back here to log vaccinations, treatments, illnesses, checkups, and deworming."
          action={
            <Link to={selectedFarm?._id ? `/livestock?farmId=${encodeURIComponent(selectedFarm._id)}` : '/livestock'}>
              <Button className="rounded-2xl h-11 px-6">Go to Livestock</Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((l) => {
            const id = l?._id;
            if (!id) return null;

            const name = l.name || l.tagNumber || 'Livestock';
            const species = l.species || 'Unknown';
            const trackingType = l.trackingType || 'individual';
            const isDeceased = l.status === 'deceased' || (trackingType === 'batch' && Number(l.quantity) <= 0);

            return (
              <Link
                key={id}
                to={`/livestock/${encodeURIComponent(id)}/health`}
                className="group"
              >
                <Card className="rounded-3xl border border-border hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 h-10 w-10 rounded-2xl flex items-center justify-center">
                            <PawPrint className="h-5 w-5 text-primary" aria-hidden="true" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-foreground truncate">{name}</p>
                            <p className="text-xs text-muted-foreground truncate">
                              {species} • {trackingType}
                              {trackingType === 'batch' && Number.isFinite(Number(l.quantity)) ? ` • Qty: ${Number(l.quantity)}` : ''}
                            </p>
                          </div>
                        </div>

                        {isDeceased ? (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-muted text-foreground text-xs font-bold">
                            <AlertCircle className="h-4 w-4" aria-hidden="true" />
                            Deceased
                          </div>
                        ) : (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            <Heart className="h-4 w-4" aria-hidden="true" />
                            Active
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-muted-foreground/60 group-hover:text-primary group-hover:translate-x-1 transition-all" aria-hidden="true" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!livestockLoading && !isEmpty && filtered.length === 0 && (
        <div role="status" className="text-center py-12 text-muted-foreground">No matches found for “{searchQuery}”.</div>
      )}

      {!livestockLoading && livestock?.length > 0 && (
        <div className="text-xs text-muted-foreground">
          Tip: Deceased livestock will still show here so you can review historical health records.
        </div>
      )}
    </div>
  );
};

export default LivestockHealthRecordsPage;
