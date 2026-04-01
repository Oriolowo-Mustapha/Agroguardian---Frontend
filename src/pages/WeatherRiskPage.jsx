import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  TrendingUp,
  RefreshCw,
  Info,
  MapPin,
  ArrowLeft,
  Sprout,
  AlertCircle,
  Clock,
  Scissors,
  Pipette
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const RiskBadge = ({ level }) => {
  const colors = {
    low: "bg-green-100 text-green-700 border-green-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-red-100 text-red-700 border-red-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[level || 'low']}`}>
      {level || 'low'}
    </span>
  );
};

const WeatherRiskPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');

  // Fetch all farms to allow switching
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data;
    }
  });

  const { data: weather, isLoading: isLoadingWeather, error: weatherError, refetch: refetchWeather } = useQuery({
    queryKey: ['weather-current', farmId],
    queryFn: async () => {
      const response = await api.get('/weather/current', { params: { farmId } });
      return response.data.data;
    },
    enabled: !!farms, // Wait for farms to load to potentially auto-select one
    retry: 1,
    staleTime: 300000 // Cache weather for 5 minutes
  });

  const { data: riskReport, isLoading: isLoadingRisk, error: riskError } = useQuery({
    queryKey: ['weather-risk', farmId],
    queryFn: async () => {
      const response = await api.get('/weather/risk', { params: { farmId } });
      return response.data.data;
    },
    enabled: !!farms,
    retry: 1,
    staleTime: 300000 // Cache risk for 5 minutes
  });

  // Auto-select first farm if none is selected
  React.useEffect(() => {
    if (farms?.length > 0 && !farmId) {
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farms, farmId, setSearchParams]);

  const handleFarmChange = (e) => {
    setSearchParams({ farmId: e.target.value });
  };

  if (isLoadingWeather || isLoadingRisk) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Analyzing climate data...</p>
      </div>
    );
  }

  if (weatherError || riskError) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-primary/10 p-2 rounded-xl">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-gray-700">Select Farm:</span>
            <select 
              value={farmId || ''} 
              onChange={handleFarmChange}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none min-w-[200px]"
            >
              {farms?.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-500 mb-8 px-8">
            {weatherError?.response?.data?.message || riskError?.response?.data?.message || "We couldn't retrieve weather data for this farm. Please ensure your farm location is valid."}
          </p>
          <div className="flex gap-4 justify-center">
            <Button onClick={() => { refetchWeather(); }} className="rounded-xl">Try Again</Button>
            <Button variant="outline" asChild className="rounded-xl">
              <Link to="/farms">Go to Farms</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const current = weather?.current;
  const risks = riskReport?.risk;
  const plantingWindow = riskReport?.plantingWindow;
  const precisionWindows = riskReport?.precisionWindows;

  // Helper to group hourly windows by date
  const groupWindowsByDate = (windows) => {
    if (!windows || !Array.isArray(windows)) return {};
    return windows.reduce((acc, item) => {
      if (!acc[item.date]) acc[item.date] = [];
      acc[item.date].push(item);
      return acc;
    }, {});
  };

  const groupedPlanting = groupWindowsByDate(precisionWindows?.planting);
  const groupedHarvesting = groupWindowsByDate(precisionWindows?.harvesting);
  const groupedSpraying = groupWindowsByDate(precisionWindows?.spraying);

  const allDates = Array.from(new Set([
    ...Object.keys(groupedPlanting),
    ...Object.keys(groupedHarvesting),
    ...Object.keys(groupedSpraying)
  ])).sort().slice(0, 5);

  // Find selected farm name
  const selectedFarm = farms?.find(f => f._id === farmId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header & Farm Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <CloudSun className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Climate Intelligence</h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.state}` : 'Select a farm to begin'}
              </p>
            </div>
          </div>
          
          <div className="h-12 w-px bg-gray-100 hidden sm:block" />

          <div className="relative group w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Sprout className="h-5 w-5 text-green-600" />
            </div>
            <select 
              value={farmId || ''} 
              onChange={handleFarmChange}
              className="block w-full pl-10 pr-10 py-3 text-base font-bold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer transition-all hover:bg-white hover:shadow-md"
            >
              {!farmId && <option value="" disabled>Choose a farm...</option>}
              {farms?.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.name}</option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-gray-400">
              <RefreshCw className="h-4 w-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button onClick={() => refetchWeather()} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200 hover:bg-gray-50 transition-colors">
            <RefreshCw className="mr-2 h-4 w-4" />
            Sync Data
          </Button>
          <Button asChild variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200 hover:bg-gray-50 transition-colors">
             <Link to="/farms"><ArrowLeft className="mr-2 h-4 w-4" /> Farms</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Conditions Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative group">
          <div className="absolute -right-8 -top-8 h-48 w-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <div className="absolute -left-8 -bottom-8 h-32 w-32 bg-indigo-500/20 rounded-full blur-2xl" />
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-100 font-bold tracking-wider uppercase text-xs">
              <Thermometer className="h-4 w-4" />
              Real-time Conditions
            </CardTitle>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-center py-6">
              <div className="flex flex-col items-center justify-center mb-6">
                {current?.icon ? (
                  <img 
                    src={`https://openweathermap.org/img/wn/${current.icon}@4x.png`} 
                    alt="Weather icon" 
                    className="h-32 w-32 drop-shadow-2xl animate-pulse" 
                  />
                ) : (
                  <CloudSun className="h-24 w-24 text-white/50 mb-4" />
                )}
                <h2 className="text-7xl font-black tracking-tighter drop-shadow-sm">
                  {current?.temperature ? Math.round(current.temperature) : '--'}°
                </h2>
                <p className="text-xl font-bold text-blue-100 capitalize mt-2 tracking-wide">
                  {current?.weatherDescription || 'N/A'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-blue-200 mb-2">
                    <Droplets className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Humidity</span>
                  </div>
                  <p className="text-2xl font-black">{current?.humidity || '--'}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-blue-200 mb-2">
                    <Wind className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
                  </div>
                  <p className="text-2xl font-black">{current?.windSpeed || '--'} <span className="text-xs">km/h</span></p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Climate Risks Card */}
        <Card className="lg:col-span-2 border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-gray-50/50 border-b border-gray-100 px-8 py-6">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                <span className="font-black text-gray-900 uppercase tracking-wider text-sm">7-Day Risk Analysis</span>
              </div>
              <TrendingUp className="h-4 w-4 text-gray-400" />
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Drought Risk', key: 'droughtRisk', icon: CloudSun, color: 'orange', desc: 'Soil moisture levels' },
                { label: 'Flood Risk', key: 'floodRisk', icon: Droplets, color: 'blue', desc: 'Precipitation volume' },
                { label: 'Heat Stress', key: 'heatRisk', icon: Thermometer, color: 'red', desc: 'Thermal impact' },
                { label: 'Pest Risk', key: 'pestRisk', icon: Sprout, color: 'green', desc: 'Infestation likelihood' },
                { label: 'Disease Risk', key: 'diseaseRisk', icon: AlertCircle, color: 'amber', desc: 'Pathogen development' }
              ].map((risk) => {
                const colorMap = {
                  orange: "bg-orange-100 text-orange-600",
                  blue: "bg-blue-100 text-blue-600",
                  red: "bg-red-100 text-red-600",
                  green: "bg-green-100 text-green-600",
                  amber: "bg-amber-100 text-amber-600"
                };
                const riskLevel = risks?.[risk.key] || 'low';
                return (
                  <div key={risk.key} className="p-5 rounded-3xl border border-gray-100 bg-white hover:border-primary/20 hover:shadow-xl hover:shadow-primary/5 transition-all duration-300 group">
                    <div className={`h-12 w-12 rounded-2xl ${colorMap[risk.color]} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-300`}>
                      <risk.icon className="h-6 w-6" />
                    </div>
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-900">{risk.label}</h4>
                        <p className="text-[10px] text-gray-400 font-medium">{risk.desc}</p>
                      </div>
                      <RiskBadge level={riskLevel} />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-8 p-6 bg-blue-50/50 rounded-3xl border border-blue-100/50 flex items-start gap-4">
              <div className="bg-blue-600 p-2.5 rounded-2xl shadow-lg shadow-blue-200">
                <Info className="h-5 w-5 text-white" />
              </div>
              <div>
                <h4 className="font-black text-blue-900 mb-1 text-sm uppercase tracking-wide">Agronomist AI Intelligence</h4>
                <p className="text-sm text-blue-800 leading-relaxed font-medium">
                  {risks?.notes || "No critical climate events detected for the upcoming week. Conditions remain stable for your primary crops."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Precision Intelligence Timeline */}
      {allDates.length > 0 && (
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-indigo-50/50 border-b border-indigo-100 px-8 py-6">
            <CardTitle className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-indigo-600" />
                <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Hourly Precision Intelligence</span>
              </div>
              <div className="flex gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Planting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-orange-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Harvesting</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="h-2 w-2 rounded-full bg-blue-500" />
                  <span className="text-[10px] font-bold text-gray-500 uppercase">Spraying</span>
                </div>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-10">
              {allDates.map(date => (
                <div key={date} className="relative pl-8 border-l-2 border-dashed border-gray-100 last:border-0 pb-2">
                  <div className="absolute -left-[9px] top-0 h-4 w-4 rounded-full bg-white border-2 border-indigo-200" />
                  <h4 className="text-sm font-black text-gray-900 mb-4 bg-gray-50 w-fit px-3 py-1 rounded-lg">
                    {new Date(date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}
                  </h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Planting Windows */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-green-600 mb-2">
                        <Sprout className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Planting Slots</span>
                      </div>
                      {groupedPlanting[date]?.length > 0 ? groupedPlanting[date].map((w, i) => (
                        <div key={i} className="bg-green-50/50 border border-green-100 p-3 rounded-2xl flex items-center justify-between group hover:bg-green-50 transition-colors">
                          <span className="text-sm font-black text-green-900">{w.time}</span>
                          <span className="text-[9px] font-bold text-green-600 bg-white px-2 py-0.5 rounded-full border border-green-50">{w.reason}</span>
                        </div>
                      )) : <p className="text-[10px] text-gray-400 font-medium italic pl-2">No optimal windows</p>}
                    </div>

                    {/* Harvesting Windows */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-orange-600 mb-2">
                        <Scissors className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Harvesting Slots</span>
                      </div>
                      {groupedHarvesting[date]?.length > 0 ? groupedHarvesting[date].map((w, i) => (
                        <div key={i} className="bg-orange-50/50 border border-orange-100 p-3 rounded-2xl flex items-center justify-between group hover:bg-orange-50 transition-colors">
                          <span className="text-sm font-black text-orange-900">{w.time}</span>
                          <span className="text-[9px] font-bold text-orange-600 bg-white px-2 py-0.5 rounded-full border border-orange-50">{w.reason}</span>
                        </div>
                      )) : <p className="text-[10px] text-gray-400 font-medium italic pl-2">No optimal windows</p>}
                    </div>

                    {/* Spraying Windows */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-blue-600 mb-2">
                        <Pipette className="h-4 w-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest">Spraying Slots</span>
                      </div>
                      {groupedSpraying[date]?.length > 0 ? groupedSpraying[date].map((w, i) => (
                        <div key={i} className="bg-blue-50/50 border border-blue-100 p-3 rounded-2xl flex items-center justify-between group hover:bg-blue-50 transition-colors">
                          <span className="text-sm font-black text-blue-900">{w.time}</span>
                          <span className="text-[9px] font-bold text-blue-600 bg-white px-2 py-0.5 rounded-full border border-blue-50">{w.reason}</span>
                        </div>
                      )) : <p className="text-[10px] text-gray-400 font-medium italic pl-2">No optimal windows</p>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Planting Window */}
      {plantingWindow && (
        <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
          <CardHeader className="bg-green-50/50 border-b border-green-100 px-8 py-6">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-green-600" />
              <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Optimal Planting Windows</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {plantingWindow.map((day, i) => (
                <div key={i} className={`p-6 rounded-[2rem] border-2 transition-all duration-300 relative group ${day.isViable ? 'border-green-100 bg-green-50/30 hover:shadow-lg hover:shadow-green-100' : 'border-gray-50 bg-gray-50/30 opacity-60'}`}>
                  <div className="absolute top-4 right-4">
                    {day.isViable ? <CheckCircle2 className="h-5 w-5 text-green-500" /> : <XCircle className="h-5 w-5 text-gray-300" />}
                  </div>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">
                    {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </p>
                  <div className="flex flex-col mb-4">
                    <span className="text-4xl font-black text-gray-900 group-hover:scale-110 transition-transform origin-left inline-block">
                      {day.score}%
                    </span>
                    <span className="text-[10px] font-bold text-gray-500 uppercase tracking-tighter">Success Score</span>
                  </div>
                  <div className={`h-2 w-full rounded-full bg-gray-200 overflow-hidden mb-4 shadow-inner`}>
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ${day.score > 75 ? 'bg-green-500' : day.score > 50 ? 'bg-amber-500' : 'bg-red-400'}`} 
                      style={{ width: `${day.score}%` }} 
                    />
                  </div>
                  <p className="text-xs font-bold text-gray-600 leading-tight bg-white/50 p-2 rounded-xl border border-white/50">
                    {day.reason}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default WeatherRiskPage;
