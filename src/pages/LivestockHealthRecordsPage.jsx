import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Heart,
  PawPrint,
  Search,
  ChevronRight,
  RefreshCw,
  AlertCircle
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';
import { useNavigateBack } from '../hooks/useNavigateBack';

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
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <div className="flex items-start gap-3">
          <button
            type="button"
            onClick={navigateBack}
            className="h-11 w-11 rounded-2xl border border-gray-200 bg-white flex items-center justify-center text-gray-700 hover:border-primary/30 hover:text-primary transition-colors"
            aria-label="Back"
            title="Back"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>

          <div>
            <h1 className="text-2xl font-black text-gray-900">Health Records</h1>
            <p className="text-sm text-gray-600">
              Select a livestock to view and manage vaccinations, treatments, illnesses, checkups, and deworming.
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <select
            value={selectedFarm?._id || ''}
            onChange={(e) => setSearchParams({ farmId: e.target.value })}
            disabled={farmsLoading || farms.length === 0}
            className="h-11 rounded-xl border border-gray-200 bg-white px-3 text-sm font-semibold text-gray-700"
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
            disabled={!selectedFarm?._id || livestockFetching}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${livestockFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      <div className="mb-5">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by tag, name, or species..."
            className="pl-12 h-12 rounded-2xl"
          />
        </div>
      </div>

      {livestockLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="rounded-3xl border border-gray-100">
              <CardContent className="p-6">
                <div className="h-5 w-40 bg-gray-100 rounded mb-3" />
                <div className="h-4 w-56 bg-gray-100 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : isEmpty ? (
        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100">
          <div className="bg-primary/10 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-5">
            <Heart className="h-10 w-10 text-primary/50" />
          </div>
          <h3 className="text-xl font-black text-gray-900 mb-2">No livestock found</h3>
          <p className="text-gray-600 mb-6 max-w-md mx-auto">
            Add livestock first, then come back here to log vaccinations, treatments, illnesses, checkups, and deworming.
          </p>
          <Link to={selectedFarm?._id ? `/livestock?farmId=${encodeURIComponent(selectedFarm._id)}` : '/livestock'}>
            <Button className="rounded-2xl h-11 px-6">Go to Livestock</Button>
          </Link>
        </div>
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
                <Card className="rounded-3xl border border-gray-100 hover:shadow-md transition-all">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <div className="bg-primary/10 h-10 w-10 rounded-2xl flex items-center justify-center">
                            <PawPrint className="h-5 w-5 text-primary" />
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 truncate">{name}</p>
                            <p className="text-xs text-gray-500 truncate">
                              {species} • {trackingType}
                              {trackingType === 'batch' && Number.isFinite(Number(l.quantity)) ? ` • Qty: ${Number(l.quantity)}` : ''}
                            </p>
                          </div>
                        </div>

                        {isDeceased ? (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 text-gray-700 text-xs font-bold">
                            <AlertCircle className="h-4 w-4" />
                            Deceased
                          </div>
                        ) : (
                          <div className="mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                            <Heart className="h-4 w-4" />
                            Active
                          </div>
                        )}
                      </div>

                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}

      {!livestockLoading && !isEmpty && filtered.length === 0 && (
        <div className="text-center py-12 text-gray-600">No matches found for “{searchQuery}”.</div>
      )}

      {!livestockLoading && livestock?.length > 0 && (
        <div className="mt-6 text-xs text-gray-500">
          Tip: Deceased livestock will still show here so you can review historical health records.
        </div>
      )}
    </div>
  );
};

export default LivestockHealthRecordsPage;
