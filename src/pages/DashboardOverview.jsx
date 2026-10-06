import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, 
  MapPin, 
  CloudRain, 
  AlertTriangle,
  ArrowUpRight,
  Plus,
  Search,
  SlidersHorizontal,
  CloudSun,
  Droplets,
  Wind,
  Thermometer,
  ShieldCheck,
  LayoutGrid,
  List,
  Calendar,
  Sprout,
  AlertCircle,
  PawPrint,
  Heart
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';

const StatCard = ({ title, value, icon: Icon, trend, color, description }) => (
  <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
    <CardContent className="p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-black text-foreground tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3 shrink-0" aria-hidden="true" />
              <span>{trend}</span>
            </div>
          )}
          {description && <p className="text-[10px] text-muted-foreground mt-2 font-medium">{description}</p>}
        </div>
        <div className={`p-4 shrink-0 rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300 ${color || 'bg-primary'}`}>
          {Icon && <Icon className="h-6 w-6 text-white" aria-hidden="true" />}
        </div>
      </div>
    </CardContent>
  </Card>
);

const RiskIndicator = ({ risks }) => {
  if (!risks || typeof risks !== 'object') return <span className="text-muted-foreground text-[10px]">No data</span>;
  
  const riskValues = Object.entries(risks).filter(([key]) => key !== 'notes');
  const highRisks = riskValues.filter(([_, val]) => val === 'high').length;
  const mediumRisks = riskValues.filter(([_, val]) => val === 'medium').length;

  if (highRisks > 0) return (
    <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse">
      <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-black uppercase">Critical Risk</span>
    </div>
  );

  if (mediumRisks > 0) return (
    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
      <AlertCircle className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-black uppercase">Monitoring</span>
    </div>
  );

  return (
    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
      <ShieldCheck className="h-3 w-3 shrink-0" aria-hidden="true" />
      <span className="text-[10px] font-black uppercase">Stable</span>
    </div>
  );
};

const DashboardOverview = () => {
  const [searchQuery, setSearchQuery] = React.useState('');
  const [viewMode, setViewMode] = React.useState('grid'); 
  const [sortBy, setSortBy] = React.useState('name');

  const { data: farms, isLoading: isLoadingFarms, error: farmsError } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      try {
        const response = await api.get('/farms');
        return Array.isArray(response.data.data) ? response.data.data : [];
      } catch (err) {
        console.error("Dashboard Fetch Error:", err);
        throw err;
      }
    }
  });

  const { data: livestockSummary } = useQuery({
    queryKey: ['livestock-dashboard-summary'],
    queryFn: async () => {
      const res = await api.get('/livestock/dashboard-summary');
      return res.data.data;
    },
  });

  const filteredFarms = React.useMemo(() => {
    if (!Array.isArray(farms)) return [];
    return [...farms]
      .filter(f => {
        const nameMatch = (f?.name || '').toLowerCase().includes(searchQuery.toLowerCase());
        const cityMatch = (f?.location?.city || '').toLowerCase().includes(searchQuery.toLowerCase());
        return nameMatch || cityMatch;
      })
      .sort((a, b) => {
        if (sortBy === 'name') return (a.name || '').localeCompare(b.name || '');
        if (sortBy === 'risk') {
          const getRiskScore = (f) => {
            if (!f?.latestRisk || typeof f.latestRisk !== 'object') return 0;
            const values = Object.values(f.latestRisk);
            return values.filter(v => v === 'high').length * 10 + 
                   values.filter(v => v === 'medium').length;
          };
          return getRiskScore(b) - getRiskScore(a);
        }
        return 0;
      });
  }, [farms, searchQuery, sortBy]);

  const stats = React.useMemo(() => {
    if (!Array.isArray(farms) || farms.length === 0) return {
      totalSize: '0.0',
      avgResilience: 0,
      totalAlerts: 0,
      totalCrops: 0
    };
    
    try {
      const farmsWithResilience = farms.filter(f => f?.latestResilience?.overallScore !== undefined);
      const avgResilience = farmsWithResilience.length > 0 
        ? Math.round(farmsWithResilience.reduce((acc, f) => acc + (f.latestResilience.overallScore || 0), 0) / farmsWithResilience.length)
        : 0;

      const totalSizeValue = farms.reduce((acc, f) => {
        const size = Number(f?.size) || 0;
        return acc + (f?.sizeUnit === 'hectares' ? size * 2.47 : size);
      }, 0);

      const totalAlerts = farms.reduce((acc, f) => {
        if (!f?.latestRisk || typeof f.latestRisk !== 'object') return acc;
        return acc + Object.values(f.latestRisk).filter(v => v === 'high').length;
      }, 0);

      const allCrops = farms.flatMap(f => {
        if (!Array.isArray(f?.crops)) return [];
        return f.crops.map(c => {
          if (typeof c === 'string') return c;
          return c?.name || null;
        }).filter(Boolean);
      });

      return {
        totalSize: totalSizeValue.toFixed(1),
        avgResilience,
        totalAlerts,
        totalCrops: new Set(allCrops).size
      };
    } catch (err) {
      console.error("Stats Calculation Error:", err);
      return { totalSize: '0.0', avgResilience: 0, totalAlerts: 0, totalCrops: 0 };
    }
  }, [farms]);

  if (isLoadingFarms) {
    return <LoadingState label="Loading your portfolio..." className="min-h-[60vh]" />;
  }

  if (farmsError) {
    return (
      <ErrorState
        title="Sync Interrupted"
        message="We encountered a connection error while retrieving your farm portfolio."
        onRetry={() => window.location.reload()}
        className="min-h-[60vh]"
      />
    );
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Header Section */}
      <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4 sm:gap-6">
        <div className="min-w-0">
          <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter">Global Portfolio</h1>
          <p className="text-muted-foreground mt-1 font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <span className="min-w-0 truncate">Managing {farms?.length || 0} agricultural assets across multiple regions</span>
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button asChild className="flex-1 md:flex-none rounded-2xl h-14 px-8 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            <Link to="/farms" className="flex items-center gap-2">
              <Plus className="h-5 w-5" aria-hidden="true" />
              Register Asset
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Portfolio Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <StatCard 
          title="Total Acreage" 
          value={`${stats.totalSize}`} 
          description="Total land area managed (Acres)"
          icon={MapPin} 
          color="bg-primary shadow-primary/30"
        />
        <StatCard 
          title="Portfolio Resilience" 
          value={`${stats.avgResilience}%`} 
          description="Average climate adaptation score"
          icon={ShieldCheck} 
          color="bg-blue-600 shadow-blue-300"
          trend="Stable"
        />
        <StatCard 
          title="Critical Alerts" 
          value={stats.totalAlerts} 
          description="Weather events requiring action"
          icon={AlertTriangle} 
          color={stats.totalAlerts > 0 ? "bg-red-500 shadow-red-300" : "bg-gray-400"}
        />
        <StatCard 
          title="Crop Diversity" 
          value={stats.totalCrops} 
          description="Unique crop types in production"
          icon={Sprout} 
          color="bg-green-600 shadow-green-300"
        />
      </div>

      {/* Livestock Snapshot */}
      {livestockSummary?.overall && (
        <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div className="min-w-0">
              <h2 className="text-xl sm:text-2xl font-black text-foreground tracking-tight">Livestock Snapshot</h2>
              <p className="text-muted-foreground mt-1 font-medium">Across all farms</p>
            </div>
            <Button asChild className="rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20 shrink-0">
              <Link to="/livestock">Manage Livestock</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            <StatCard
              title="Total Livestock"
              value={livestockSummary.overall.totalAnimals || 0}
              description="Active animals (batch counts included)"
              icon={PawPrint}
              color="bg-primary shadow-primary/30"
            />
            <StatCard
              title="Sick / Treatment"
              value={livestockSummary.overall.sickCount || 0}
              description="Sick, critical, or under treatment"
              icon={Heart}
              color={(livestockSummary.overall.sickCount || 0) > 0 ? "bg-amber-600 shadow-amber-300" : "bg-gray-400"}
            />
            <StatCard
              title="Critical"
              value={livestockSummary.overall.criticalCount || 0}
              description="Requires urgent attention"
              icon={AlertTriangle}
              color={(livestockSummary.overall.criticalCount || 0) > 0 ? "bg-red-500 shadow-red-300" : "bg-gray-400"}
            />
          </div>
        </div>
      )}

      {/* Portfolio Browser Header */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
          <Input 
            aria-label="Search assets by name or city"
            placeholder="Search assets by name or city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-border bg-card shadow-sm focus:ring-2 focus:ring-primary transition-all font-medium"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:gap-4 w-full lg:w-auto">
          <div className="flex bg-card p-1 rounded-2xl border border-border shadow-sm" role="group" aria-label="View mode">
            <button 
              type="button"
              onClick={() => setViewMode('grid')}
              aria-label="Grid view"
              aria-pressed={viewMode === 'grid'}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <LayoutGrid className="h-5 w-5" aria-hidden="true" />
            </button>
            <button 
              type="button"
              onClick={() => setViewMode('list')}
              aria-label="List view"
              aria-pressed={viewMode === 'list'}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground'}`}
            >
              <List className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>

          <div className="hidden sm:block h-8 w-px bg-border" aria-hidden="true" />

          <div className="flex min-w-0 flex-wrap items-center gap-2 bg-card px-4 py-2 rounded-2xl border border-border shadow-sm font-bold text-sm text-foreground">
            <SlidersHorizontal className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
            <label htmlFor="dashboard-sort" className="shrink-0">Sort by:</label>
            <select 
              id="dashboard-sort"
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-primary min-w-0"
            >
              <option value="name">Asset Name</option>
              <option value="risk">Risk Level</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Grid/List View */}
      {filteredFarms.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8" : "space-y-4"}>
          {filteredFarms.map((farm) => (
            <Link 
              key={farm._id} 
              to={`/farms/${farm._id}`}
              className={`block bg-card transition-all duration-300 group ${
                viewMode === 'grid' 
                ? "rounded-[2.5rem] border border-border shadow-sm hover:shadow-2xl hover:border-primary/20 p-6 sm:p-8" 
                : "rounded-3xl border border-border p-5 sm:p-6 flex items-center justify-between gap-4 hover:bg-muted"
              }`}
            >
              <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-4 sm:gap-6 flex-1 min-w-0"}>
                {/* Asset Identity */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3 sm:gap-4 min-w-0">
                    <div className="h-16 w-16 shrink-0 rounded-[1.25rem] bg-muted overflow-hidden ring-4 ring-muted group-hover:ring-primary/10 transition-all">
                      {farm.imageUrl && farm.imageUrl[0] ? (
                        <img src={farm.imageUrl[0]} alt={farm.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-black text-xl" aria-hidden="true">
                          {farm.name ? farm.name.charAt(0) : 'F'}
                        </div>
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-black text-foreground text-lg sm:text-xl tracking-tight truncate group-hover:text-primary transition-colors">{farm.name || 'Unnamed Farm'}</h4>
                      <p className="text-sm font-bold text-muted-foreground flex items-center gap-1 min-w-0">
                        <MapPin className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{farm.location?.city || 'Unknown'}, {farm.location?.country || ''}</span>
                      </p>
                    </div>
                  </div>
                  {viewMode === 'grid' && <RiskIndicator risks={farm.latestRisk} />}
                </div>

                {/* Weather Quick Glance */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-blue-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center min-w-0">
                      <Thermometer className="h-4 w-4 text-blue-600 mb-1" aria-hidden="true" />
                      <span className="text-base sm:text-lg font-black text-foreground">{farm.latestWeather?.current?.temperature ?? '--'}°</span>
                    </div>
                    <div className="bg-indigo-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center min-w-0">
                      <Droplets className="h-4 w-4 text-indigo-600 mb-1" aria-hidden="true" />
                      <span className="text-base sm:text-lg font-black text-foreground">{farm.latestWeather?.current?.humidity ?? '--'}%</span>
                    </div>
                    <div className="bg-sky-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center min-w-0">
                      <Wind className="h-4 w-4 text-sky-600 mb-1" aria-hidden="true" />
                      <span className="text-base sm:text-lg font-black text-foreground">{farm.latestWeather?.current?.windSpeed ?? '--'}</span>
                    </div>
                  </div>
                )}

                {/* Footer Meta */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-border">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="flex flex-col min-w-0">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Crop Inventory</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {Array.isArray(farm.crops) && farm.crops.length > 0 ? (
                            <>
                                {farm.crops.slice(0, 2).map((crop, i) => (
                                    <span key={i} className="text-[10px] font-bold bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                                        {typeof crop === 'string' ? crop : crop.name}
                                    </span>
                                ))}
                                {farm.crops.length > 2 && <span className="text-[10px] font-bold text-muted-foreground">+{farm.crops.length - 2}</span>}
                            </>
                        ) : (
                            <span className="text-[10px] font-bold text-muted-foreground italic">No crops</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 font-bold text-xs text-primary group-hover:translate-x-1 transition-transform">
                    View Intelligence
                    <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          className="py-24"
          icon={<Search className="h-8 w-8" aria-hidden="true" />}
          title="No Assets Found"
          description={`We couldn't find any farms matching "${searchQuery}". Try a different search term or register a new asset.`}
          action={
            <Button onClick={() => setSearchQuery('')} variant="outline" className="rounded-2xl h-12 px-8 font-bold">
              Clear Search
            </Button>
          }
        />
      )}
    </div>
  );
};

export default DashboardOverview;
