import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  PawPrint,
  Plus,
  Search,
  RefreshCw,
  AlertCircle,
  Heart,
  Scale,
  Calendar,
  ChevronRight,
  LayoutGrid,
  List,
  Beef,
  Bird,
  Fish,
  Rabbit,
  Activity,
  Syringe,
  AlertTriangle,
  CheckCircle2,
  Skull
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import AddLivestockModal from '../components/AddLivestockModal';


// Species icons mapping
const speciesIcons = {
  cattle: Beef,
  goat: Rabbit,
  sheep: Rabbit,
  rabbit: Rabbit,
  pig: PawPrint,
  poultry: Bird,
  fish: Fish
};

const speciesColors = {
  cattle: 'bg-amber-500',
  goat: 'bg-emerald-500',
  sheep: 'bg-blue-500',
  rabbit: 'bg-purple-500',
  pig: 'bg-pink-500',
  poultry: 'bg-orange-500',
  fish: 'bg-cyan-500'
};

const formatAgeShort = (dateOfBirth, species) => {
  if (!dateOfBirth) return null;
  const now = new Date().getTime();
  const days = Math.max(
    0,
    Math.floor((now - new Date(dateOfBirth).getTime()) / (24 * 60 * 60 * 1000))
  );

  if (species === 'poultry') {
    const weeks = Math.floor(days / 7);
    const remDays = days % 7;
    if (weeks <= 0) return `${days}d`;
    return remDays ? `${weeks}w ${remDays}d` : `${weeks}w`;
  }

  const years = Math.floor(days / 365.25);
  if (years >= 1) return `${years}y`;

  const months = Math.floor(days / 30.44);
  if (months >= 1) return `${months}mo`;

  return `${days}d`;
};

const HealthBadge = ({ status }) => {
  const configs = {
    healthy: { label: 'Healthy', color: 'bg-green-100 text-green-700 border-green-200', icon: CheckCircle2 },
    sick: { label: 'Sick', color: 'bg-red-100 text-red-700 border-red-200', icon: AlertTriangle },
    recovering: { label: 'Recovering', color: 'bg-blue-100 text-blue-700 border-blue-200', icon: Activity },
    under_treatment: { label: 'Treatment', color: 'bg-amber-100 text-amber-700 border-amber-200', icon: Syringe },
    critical: { label: 'Critical', color: 'bg-red-100 text-red-700 border-red-200 animate-pulse', icon: AlertCircle },
    deceased: { label: 'Deceased', color: 'bg-gray-200 text-gray-700 border-gray-300', icon: Skull }
  };
  const config = configs[status] || configs.healthy;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border ${config.color}`}>
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
};

const StatCard = ({ title, value, icon, color, subtitle }) => (
  <Card className="border-none shadow-sm">
    <CardContent className="p-6">
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1 truncate">{title}</p>
          <h3 className="text-2xl sm:text-3xl font-black text-gray-900 truncate">{value}</h3>
          {subtitle && <p className="text-xs text-gray-500 mt-1 truncate">{subtitle}</p>}
        </div>
        <div className={`p-4 rounded-2xl ${color} shrink-0`}>
          {icon ? React.createElement(icon, { className: 'h-6 w-6 text-white' }) : null}
        </div>
      </div>
    </CardContent>
  </Card>
);

const LivestockPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState('grid');
  const [speciesFilter, setSpeciesFilter] = React.useState('all');

  // Fetch farms for dropdown
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      const data = response.data?.data ?? response.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.farms)) return data.farms;
      if (Array.isArray(data?.items)) return data.items;

      return [];
    }
  });

  // Auto-select first farm
  React.useEffect(() => {
    if (farms?.length > 0 && !farmId) {
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farms, farmId, setSearchParams]);

  // Fetch livestock for selected farm
  const { data: livestock, isLoading, error, refetch } = useQuery({
    queryKey: ['livestock', farmId],
    queryFn: async () => {
      const response = await api.get(`/livestock/farms/${farmId}`);
      const data = response.data?.data ?? response.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.livestock)) return data.livestock;
      if (Array.isArray(data?.items)) return data.items;

      return [];
    },
    enabled: !!farmId
  });

  // Fetch statistics
  const { data: stats } = useQuery({
    queryKey: ['livestock-stats', farmId],
    queryFn: async () => {
      const response = await api.get(`/livestock/farms/${farmId}/stats`);
      const data = response.data?.data ?? response.data;
      return data && typeof data === 'object' ? data : {};
    },
    enabled: !!farmId
  });

  // Fetch mortality report (used for Deaths stat card)
  const { data: mortality } = useQuery({
    queryKey: ['mortality-report', farmId],
    queryFn: async () => {
      const res = await api.get(`/livestock-inventory/farms/${farmId}/mortality`);
      const data = res.data?.data ?? res.data;
      return data && typeof data === 'object' ? data : {};
    },
    enabled: !!farmId
  });

  // Filter and search livestock
  const filteredLivestock = React.useMemo(() => {
    if (!Array.isArray(livestock)) return [];
    return livestock.filter((item) => {
      if (!item) return false;
      const matchesSearch =
        (item?.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item?.tagId || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item?.breed || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesSpecies = speciesFilter === 'all' || item?.species === speciesFilter;
      return matchesSearch && matchesSpecies;
    });
  }, [livestock, searchQuery, speciesFilter]);

  const upcomingVaccinations = React.useMemo(
    () => (Array.isArray(stats?.upcomingVaccinations) ? stats.upcomingVaccinations : []),
    [stats]
  );

  const isInactiveLivestock = React.useCallback((item) => {
    if (!item) return true;
    if (item?.status === 'deceased' || item?.status === 'sold') return true;
    if (item?.trackingType === 'batch' && (item?.quantity ?? 1) <= 0) return true;
    return false;
  }, []);

  const countAnimals = React.useCallback((item) => {
    if (!item) return 0;
    return item?.trackingType === 'batch' ? (item?.quantity || 1) : 1;
  }, []);

  const activeLivestock = React.useMemo(() => {
    if (!Array.isArray(livestock)) return [];
    return livestock.filter((l) => l && !isInactiveLivestock(l));
  }, [livestock, isInactiveLivestock]);

  const totalAnimalsComputed = React.useMemo(
    () => activeLivestock.reduce((sum, item) => sum + countAnimals(item), 0),
    [activeLivestock, countAnimals]
  );

  const needsAttentionComputed = React.useMemo(() => {
    return activeLivestock.reduce((sum, item) => {
      const hs = item?.healthStatus;
      const needsAttention = hs && hs !== 'healthy';
      return sum + (needsAttention ? countAnimals(item) : 0);
    }, 0);
  }, [activeLivestock, countAnimals]);

  const healthyComputed = Math.max(0, totalAnimalsComputed - needsAttentionComputed);

  const estimatedValueComputed = React.useMemo(() => {
    return activeLivestock.reduce((sum, item) => {
      const raw = item?.cost ?? item?.acquisitionCost;
      const val = Number(raw);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [activeLivestock]);

  const deathsComputed = React.useMemo(() => {
    const raw = mortality?.totalDeaths ?? mortality?.deaths ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [mortality]);

  // Group by species for stats (active only)
  const speciesCounts = React.useMemo(() => {
    return activeLivestock.reduce((acc, item) => {
      const count = countAnimals(item);
      const key = item?.species || 'unknown';
      acc[key] = (acc[key] || 0) + count;
      return acc;
    }, {});
  }, [activeLivestock, countAnimals]);

  if (!farmId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Loading farms...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight flex items-center gap-3">
            <PawPrint className="h-8 w-8 text-primary" />
            Livestock Management
          </h1>
          <p className="text-gray-500 mt-1 font-medium">
            Monitor health, track growth, and manage your farm animals
          </p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full lg:w-auto">
          {/* Farm Selector */}
          <select
            value={farmId || ''}
            onChange={(e) => setSearchParams({ farmId: e.target.value })}
            className="h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl font-medium focus:ring-2 focus:ring-primary outline-none"
          >
            {farms?.map((farm) => (
              <option key={farm._id} value={farm._id}>
                {farm.name}
              </option>
            ))}
          </select>
          <Button 
            onClick={() => setIsModalOpen(true)}
            className="rounded-2xl h-12 px-6 font-bold shadow-lg shadow-primary/20"
          >
            <Plus className="mr-2 h-5 w-5" />
            Add Livestock
          </Button>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-6">
        <StatCard
          title="Total Animals"
          value={totalAnimalsComputed}
          icon={PawPrint}
          color="bg-primary"
          subtitle={`${Object.keys(speciesCounts).length} species`}
        />
        <StatCard
          title="Healthy"
          value={healthyComputed}
          icon={Heart}
          color="bg-green-500"
        />
        <StatCard
          title="Needs Attention"
          value={needsAttentionComputed}
          icon={AlertTriangle}
          color={needsAttentionComputed > 0 ? "bg-red-500" : "bg-gray-400"}
        />
        <StatCard
          title="Deaths"
          value={deathsComputed}
          icon={Skull}
          color={deathsComputed > 0 ? "bg-gray-700" : "bg-gray-400"}
          subtitle="Last 90 days"
        />
        <StatCard
          title="Est. Value"
          value={`₦${Number(estimatedValueComputed || 0).toLocaleString()}`}
          icon={Scale}
          color="bg-blue-500"
        />
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
        <Link 
          to={`/livestock-feeding?farmId=${farmId}`}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-100 rounded-xl group-hover:bg-amber-200 transition-colors">
              <Scale className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Feeding</p>
              <p className="text-xs text-gray-500">Manage feed records</p>
            </div>
          </div>
        </Link>
        <Link 
          to={`/livestock-breeding?farmId=${farmId}`}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-pink-100 rounded-xl group-hover:bg-pink-200 transition-colors">
              <Heart className="h-5 w-5 text-pink-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Breeding</p>
              <p className="text-xs text-gray-500">Track pregnancies</p>
            </div>
          </div>
        </Link>
        <Link 
          to={`/livestock-inventory?farmId=${farmId}`}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
              <Activity className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Inventory</p>
              <p className="text-xs text-gray-500">Sales & purchases</p>
            </div>
          </div>
        </Link>
        <Link 
          to={`/vet-consultation?farmId=${farmId}`}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
              <Syringe className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Vet AI</p>
              <p className="text-xs text-gray-500">Consult AI vet</p>
            </div>
          </div>
        </Link>

        <Link
          to={`/livestock-health?farmId=${encodeURIComponent(farmId)}`}
          className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm hover:shadow-md hover:border-primary/20 transition-all group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-xl group-hover:bg-purple-200 transition-colors">
              <Heart className="h-5 w-5 text-purple-600" />
            </div>
            <div>
              <p className="font-bold text-gray-900">Health Records</p>
              <p className="text-xs text-gray-500">View & add records</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Vaccination Alerts */}
      {upcomingVaccinations.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <Syringe className="h-5 w-5 text-amber-600" />
            <h3 className="font-bold text-amber-900">Upcoming Vaccinations</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {upcomingVaccinations.map((vax, idx) => (
              <div key={vax?._id || idx} className="bg-white rounded-xl p-4 border border-amber-100">
                <p className="font-bold text-gray-900">{vax?.vaccineName || 'Vaccination'}</p>
                <p className="text-sm text-gray-500">
                  {vax?.livestockId?.name || vax?.livestockId?.tagId || 'Animal'} - Due:{' '}
                  {vax?.nextDueDate ? new Date(vax.nextDueDate).toLocaleDateString() : '—'}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Species Quick Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setSpeciesFilter('all')}
          className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
            speciesFilter === 'all' 
              ? 'bg-primary text-white' 
              : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
          }`}
        >
          All Species
        </button>
        {Object.entries(speciesCounts).map(([species, count]) => {
          const Icon = speciesIcons[species] || PawPrint;
          return (
            <button
              key={species}
              onClick={() => setSpeciesFilter(species)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${
                speciesFilter === species 
                  ? 'bg-primary text-white' 
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              <Icon className="h-4 w-4" />
              {species.charAt(0).toUpperCase() + species.slice(1)} ({count})
            </button>
          );
        })}
      </div>

      {/* Search & View Controls */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
        <div className="relative w-full lg:w-96">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            placeholder="Search by name, tag ID, or breed..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-12 rounded-xl"
          />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-white p-1 rounded-xl border border-gray-100">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-primary text-white' : 'text-gray-400'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-lg transition-all ${viewMode === 'list' ? 'bg-primary text-white' : 'text-gray-400'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
          <Button variant="outline" onClick={() => refetch()} className="h-10 rounded-xl">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Livestock Grid/List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-white rounded-3xl animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <div className="text-center py-16 bg-white rounded-3xl">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to load livestock</h3>
          <p className="text-gray-500 mb-4">{error.message}</p>
          <Button onClick={() => refetch()}>Retry</Button>
        </div>
      ) : filteredLivestock.length > 0 ? (
        <div className={viewMode === 'grid' 
          ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" 
          : "space-y-4"
        }>
          {filteredLivestock.map((item, idx) => {
            if (!item) return null;
            const Icon = speciesIcons[item?.species] || PawPrint;
            const color = speciesColors[item?.species] || 'bg-gray-500';
            const itemId = item?._id || item?.id;
            
            return (
              <Link
                key={itemId || idx}
                to={itemId ? `/livestock/${itemId}` : '#'}
                onClick={(e) => {
                  if (!itemId) e.preventDefault();
                }}
                className={`block bg-white rounded-3xl border border-gray-100 shadow-sm hover:shadow-lg transition-all group ${
                  viewMode === 'list' ? 'p-4' : 'p-6'
                }`}
              >
                <div className={viewMode === 'list' ? 'flex items-center gap-4' : 'space-y-4'}>
                  {/* Image/Avatar */}
                  <div className={`relative ${viewMode === 'list' ? 'w-16 h-16' : 'h-40 w-full'} rounded-2xl overflow-hidden bg-gray-100`}>
                    {item.imageUrls?.[0] ? (
                      <img 
                        src={item.imageUrls[0]} 
                        alt={item.name || item.tagId} 
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                    ) : (
                      <div className={`w-full h-full ${color} flex items-center justify-center`}>
                        <Icon className="h-12 w-12 text-white/80" />
                      </div>
                    )}
                    {item.trackingType === 'batch' && (
                      <div className="absolute top-2 right-2 bg-black/60 text-white px-2 py-1 rounded-lg text-xs font-bold">
                        x{item.quantity}
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-bold text-gray-900 group-hover:text-primary transition-colors">
                          {item?.name || item?.tagId || `${item?.species || 'livestock'} #${String(itemId || '').slice(-4)}`}
                        </h3>
                        <p className="text-sm text-gray-500 capitalize">
                          {item.breed || item.species} {item.gender && `• ${item.gender}`}
                        </p>
                      </div>
                      <HealthBadge
                        status={
                          item?.status === 'deceased' ||
                          (item?.trackingType === 'batch' && (item?.quantity ?? 1) <= 0)
                            ? 'deceased'
                            : item?.healthStatus
                        }
                      />
                    </div>

                    {viewMode === 'grid' && (
                      <div className="grid grid-cols-2 gap-2 mt-4">
                        {item.weight && (
                          <div className="bg-gray-50 rounded-xl p-2 text-center">
                            <Scale className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-bold text-gray-900">{item.weight} kg</p>
                          </div>
                        )}
                        {item.dateOfBirth && (
                          <div className="bg-gray-50 rounded-xl p-2 text-center">
                            <Calendar className="h-4 w-4 text-gray-400 mx-auto mb-1" />
                            <p className="text-sm font-bold text-gray-900">
                              {formatAgeShort(item.dateOfBirth, item.species)}
                            </p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-50">
                      <span className={`px-2 py-1 rounded-lg text-xs font-bold ${color} text-white capitalize`}>
                        {item.species}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary group-hover:translate-x-1 transition-all" />
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
          <div className="bg-primary/10 h-24 w-24 rounded-full flex items-center justify-center mx-auto mb-6">
            <PawPrint className="h-12 w-12 text-primary/50" />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">
            {searchQuery || speciesFilter !== 'all' ? 'No matches found' : 'No livestock registered'}
          </h3>
          <p className="text-gray-500 mb-8 max-w-sm mx-auto">
            {searchQuery || speciesFilter !== 'all' 
              ? 'Try adjusting your search or filters'
              : 'Start by adding your first animal to track health, growth, and breeding'
            }
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-2xl h-12 px-8">
            <Plus className="mr-2 h-5 w-5" />
            Add Livestock
          </Button>
        </div>
      )}

      {/* Modals */}
      <AddLivestockModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        farmId={farmId}
      />
    </div>
  );
};

export default LivestockPage;
