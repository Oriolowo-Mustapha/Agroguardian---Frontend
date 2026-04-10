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
  RefreshCw,
  PawPrint,
  Heart
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const StatCard = ({ title, value, icon: Icon, trend, color, description }) => (
  <Card className="border-none shadow-sm hover:shadow-md transition-all duration-300 group">
    <CardContent className="p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-1">{title}</p>
          <h3 className="text-3xl font-black text-gray-900 tracking-tight">{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs font-bold text-green-600 bg-green-50 w-fit px-2 py-1 rounded-full">
              <TrendingUp className="h-3 w-3" />
              <span>{trend}</span>
            </div>
          )}
          {description && <p className="text-[10px] text-gray-500 mt-2 font-medium">{description}</p>}
        </div>
        <div className={`p-4 rounded-2xl shadow-lg transition-transform group-hover:scale-110 duration-300 ${color || 'bg-primary'}`}>
          {Icon && <Icon className="h-6 w-6 text-white" />}
        </div>
      </div>
    </CardContent>
  </Card>
);

const RiskIndicator = ({ risks }) => {
  if (!risks || typeof risks !== 'object') return <span className="text-gray-400 text-[10px]">No data</span>;
  
  const riskValues = Object.entries(risks).filter(([key]) => key !== 'notes');
  const highRisks = riskValues.filter(([_, val]) => val === 'high').length;
  const mediumRisks = riskValues.filter(([_, val]) => val === 'medium').length;

  if (highRisks > 0) return (
    <div className="flex items-center gap-1.5 text-red-600 bg-red-50 px-2 py-1 rounded-lg border border-red-100 animate-pulse">
      <AlertTriangle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase">Critical Risk</span>
    </div>
  );

  if (mediumRisks > 0) return (
    <div className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">
      <AlertCircle className="h-3 w-3" />
      <span className="text-[10px] font-black uppercase">Monitoring</span>
    </div>
  );

  return (
    <div className="flex items-center gap-1.5 text-green-600 bg-green-50 px-2 py-1 rounded-lg border border-green-100">
      <ShieldCheck className="h-3 w-3" />
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
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Loading your portfolio...</p>
      </div>
    );
  }

  if (farmsError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center p-8">
        <div className="bg-red-50 p-6 rounded-full">
            <AlertCircle className="h-12 w-12 text-red-500" />
        </div>
        <h3 className="text-2xl font-black text-gray-900">Sync Interrupted</h3>
        <p className="text-gray-500 max-w-sm font-medium">
          We encountered a connection error while retrieving your farm portfolio.
        </p>
        <Button onClick={() => window.location.reload()} className="rounded-2xl h-14 px-8 font-black shadow-lg shadow-primary/20 mt-4">
          <RefreshCw className="h-5 w-5 mr-2" />
          Retry Connection
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Global Portfolio</h1>
          <p className="text-gray-500 mt-1 font-medium flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-primary" />
            Managing {farms?.length || 0} agricultural assets across multiple regions
          </p>
        </div>
        <div className="flex items-center gap-3 w-full md:w-auto">
          <Button asChild className="flex-1 md:flex-none rounded-2xl h-14 px-8 font-black shadow-lg shadow-primary/20 hover:scale-105 transition-transform">
            <Link to="/farms" className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Register Asset
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Portfolio Summary */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-black text-gray-900 tracking-tight">Livestock Snapshot</h2>
              <p className="text-gray-500 mt-1 font-medium">Across all farms</p>
            </div>
            <Button asChild className="rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20">
              <Link to="/livestock">Manage Livestock</Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
        <div className="relative w-full lg:w-96 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Search assets by name or city..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 h-14 rounded-2xl border-gray-100 bg-white shadow-sm focus:ring-2 focus:ring-primary transition-all font-medium"
          />
        </div>

        <div className="flex items-center gap-4 w-full lg:w-auto overflow-x-auto pb-2 lg:pb-0">
          <div className="flex bg-white p-1 rounded-2xl border border-gray-100 shadow-sm">
            <button 
              onClick={() => setViewMode('grid')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <LayoutGrid className="h-5 w-5" />
            </button>
            <button 
              onClick={() => setViewMode('list')}
              className={`p-2.5 rounded-xl transition-all ${viewMode === 'list' ? 'bg-primary text-white shadow-md' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>

          <div className="h-8 w-px bg-gray-200" />

          <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-2xl border border-gray-100 shadow-sm font-bold text-sm text-gray-700">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Sort by:
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="bg-transparent border-none p-0 focus:ring-0 cursor-pointer text-primary"
            >
              <option value="name">Asset Name</option>
              <option value="risk">Risk Level</option>
            </select>
          </div>
        </div>
      </div>

      {/* Asset Grid/List View */}
      {filteredFarms.length > 0 ? (
        <div className={viewMode === 'grid' ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8" : "space-y-4"}>
          {filteredFarms.map((farm) => (
            <Link 
              key={farm._id} 
              to={`/farms/${farm._id}`}
              className={`block bg-white transition-all duration-300 group ${
                viewMode === 'grid' 
                ? "rounded-[2.5rem] border border-gray-100 shadow-sm hover:shadow-2xl hover:border-primary/20 p-8" 
                : "rounded-3xl border border-gray-50 p-6 flex items-center justify-between hover:bg-gray-50"
              }`}
            >
              <div className={viewMode === 'grid' ? "space-y-6" : "flex items-center gap-6 flex-1"}>
                {/* Asset Identity */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 rounded-[1.25rem] bg-gray-50 overflow-hidden ring-4 ring-gray-50 group-hover:ring-primary/10 transition-all">
                      {farm.imageUrl && farm.imageUrl[0] ? (
                        <img src={farm.imageUrl[0]} alt={farm.name} className="h-full w-full object-cover group-hover:scale-110 transition-transform duration-500" />
                      ) : (
                        <div className="h-full w-full flex items-center justify-center bg-primary/10 text-primary font-black text-xl">
                          {farm.name ? farm.name.charAt(0) : 'F'}
                        </div>
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 text-xl tracking-tight group-hover:text-primary transition-colors">{farm.name || 'Unnamed Farm'}</h4>
                      <p className="text-sm font-bold text-gray-400 flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {farm.location?.city || 'Unknown'}, {farm.location?.country || ''}
                      </p>
                    </div>
                  </div>
                  {viewMode === 'grid' && <RiskIndicator risks={farm.latestRisk} />}
                </div>

                {/* Weather Quick Glance */}
                {viewMode === 'grid' && (
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <div className="bg-blue-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center">
                      <Thermometer className="h-4 w-4 text-blue-600 mb-1" />
                      <span className="text-base sm:text-lg font-black text-gray-900">{farm.latestWeather?.current?.temperature ?? '--'}°</span>
                    </div>
                    <div className="bg-indigo-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center">
                      <Droplets className="h-4 w-4 text-indigo-600 mb-1" />
                      <span className="text-base sm:text-lg font-black text-gray-900">{farm.latestWeather?.current?.humidity ?? '--'}%</span>
                    </div>
                    <div className="bg-sky-50/50 p-2.5 sm:p-3 rounded-2xl flex flex-col items-center justify-center">
                      <Wind className="h-4 w-4 text-sky-600 mb-1" />
                      <span className="text-base sm:text-lg font-black text-gray-900">{farm.latestWeather?.current?.windSpeed ?? '--'}</span>
                    </div>
                  </div>
                )}

                {/* Footer Meta */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Crop Inventory</span>
                      <div className="flex gap-1 mt-1">
                        {Array.isArray(farm.crops) && farm.crops.length > 0 ? (
                            <>
                                {farm.crops.slice(0, 2).map((crop, i) => (
                                    <span key={i} className="text-[10px] font-bold bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                                        {typeof crop === 'string' ? crop : crop.name}
                                    </span>
                                ))}
                                {farm.crops.length > 2 && <span className="text-[10px] font-bold text-gray-400">+{farm.crops.length - 2}</span>}
                            </>
                        ) : (
                            <span className="text-[10px] font-bold text-gray-300 italic">No crops</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 font-bold text-xs text-primary group-hover:translate-x-1 transition-transform">
                    View Intelligence
                    <ArrowUpRight className="h-4 w-4" />
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100 flex flex-col items-center">
          <div className="bg-gray-50 p-8 rounded-full mb-6">
            <Search className="h-16 w-16 text-gray-200" />
          </div>
          <h3 className="text-2xl font-black text-gray-900 mb-2">No Assets Found</h3>
          <p className="text-gray-500 font-medium mb-8 max-w-sm">
            We couldn't find any farms matching "{searchQuery}". Try a different search term or register a new asset.
          </p>
          <Button onClick={() => setSearchQuery('')} variant="outline" className="rounded-2xl h-12 px-8 font-bold border-gray-200">
            Clear Search
          </Button>
        </div>
      )}
    </div>
  );
};

export default DashboardOverview;
