import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { 
  CloudSun, 
  Wind, 
  Droplets, 
  Thermometer, 
  AlertTriangle,
  Calendar,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Info,
  MapPin,
  ArrowLeft,
  Sprout,
  AlertCircle,
  Clock,
  Scissors,
  Pipette,
  X,
  Eye
} from 'lucide-react';
import api from '../lib/axios';
import WeatherDetailsPanel from '../components/WeatherDetailsPanel';
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
  const queryClient = useQueryClient();
  const goBack = useNavigateBack('/farms');
  const [syncStatus, setSyncStatus] = React.useState(null); // 'success', 'error', or null
  const [selectedRiskModal, setSelectedRiskModal] = React.useState(null); // { label, level, details }

  // Fetch all farms to allow switching
  const { data: farms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data || [];
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

  // Mutation for manual weather sync
  const syncWeatherMutation = useMutation({
    mutationFn: async (farmId) => {
      const response = await api.post('/weather/sync', {}, { params: { farmId } });
      return response.data;
    },
    onSuccess: () => {
      setSyncStatus('success');
      // Auto-hide success message after 4 seconds
      setTimeout(() => setSyncStatus(null), 4000);
      // Refetch weather data after a short delay to get the updated data
      setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: ['weather-current', farmId] });
        queryClient.invalidateQueries({ queryKey: ['weather-risk', farmId] });
      }, 3000);
    },
    onError: () => {
      setSyncStatus('error');
      // Auto-hide error message after 4 seconds
      setTimeout(() => setSyncStatus(null), 4000);
    },
  });

  const handleSyncWeather = () => {
    syncWeatherMutation.mutate(farmId);
  };

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
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full">
            <div className="bg-primary/10 p-2 rounded-xl">
              <MapPin className="h-5 w-5 text-primary" />
            </div>
            <span className="font-bold text-gray-700">Select Farm:</span>
            <select 
              value={farmId || ''} 
              onChange={handleFarmChange}
              className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-2 font-medium focus:ring-2 focus:ring-primary outline-none w-full sm:w-auto sm:min-w-[200px]"
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
            <Button variant="outline" onClick={goBack} className="rounded-xl">
              Go to Farms
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const current = weather?.current;
  const currentRaw = weather?.currentRaw;

  const currentDisplay = (() => {
    if (current && (current.temperature != null || current.humidity != null || current.weatherDescription)) {
      return current;
    }

    // Fallback: if backend returns OpenWeather raw payload instead of the simplified `current` shape
    if (currentRaw?.main && Array.isArray(currentRaw?.weather)) {
      const speedMs = Number(currentRaw?.wind?.speed);
      const windKmh = Number.isFinite(speedMs) ? Math.round(speedMs * 3.6) : null;
      return {
        temperature: currentRaw?.main?.temp,
        humidity: currentRaw?.main?.humidity,
        windSpeed: windKmh,
        icon: currentRaw?.weather?.[0]?.icon,
        weatherDescription: currentRaw?.weather?.[0]?.description,
      };
    }

    return current;
  })();

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

  // Include dates from plantingWindow (daily recommendations) to ensure the "best day" appears
  const plantingWindowDates = (plantingWindow || [])
    .map((pw) => {
      const d = new Date(pw?.date);
      if (Number.isNaN(d.getTime())) return null;
      return d.toISOString().split('T')[0];
    })
    .filter(Boolean);

  const allDates = Array.from(new Set([
    ...Object.keys(groupedPlanting),
    ...Object.keys(groupedHarvesting),
    ...Object.keys(groupedSpraying),
    ...plantingWindowDates // Include daily planting window dates
  ])).sort().slice(0, 7); // Increased to 7 days to capture more context

  // Find selected farm name
  const selectedFarm = farms?.find(f => f._id === farmId);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Success/Error Notification Banner */}
      {syncStatus === 'success' && (
        <div className="bg-green-50 border border-green-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <CheckCircle2 className="h-5 w-5 text-green-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-green-900">Weather sync triggered successfully! 🌤️</p>
            <p className="text-xs text-green-700 mt-0.5">Fresh data will be available in a few seconds.</p>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-green-600 hover:text-green-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}
      
      {syncStatus === 'error' && (
        <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-center gap-3 animate-in slide-in-from-top duration-300">
          <XCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-bold text-red-900">Failed to sync weather data</p>
            <p className="text-xs text-red-700 mt-0.5">Please try again in a moment.</p>
          </div>
          <button onClick={() => setSyncStatus(null)} className="text-red-600 hover:text-red-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Risk Details Modal */}
      {selectedRiskModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                {React.createElement(selectedRiskModal.icon, {
                  className: `h-6 w-6 ${
                    selectedRiskModal.level === 'high' ? 'text-red-600' :
                    selectedRiskModal.level === 'medium' ? 'text-amber-600' : 'text-green-600'
                  }`
                })}
                <div>
                  <h2 className="text-xl font-black text-gray-900">{selectedRiskModal.label}</h2>
                  <p className="text-xs text-gray-500 font-medium mt-0.5">{selectedRiskModal.desc}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRiskModal(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            {/* Modal Content - Scrollable */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Risk Level Badge */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-gray-500 uppercase">Risk Level</span>
                <RiskBadge level={selectedRiskModal.level} />
              </div>

              {/* Risk Score */}
              {selectedRiskModal.details?.score !== undefined && (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-bold text-gray-500 uppercase">Risk Score</span>
                    <span className="text-2xl font-black text-gray-900">{selectedRiskModal.details.score}/100</span>
                  </div>
                  <div className="h-4 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        selectedRiskModal.details.score >= 60 ? 'bg-red-500' :
                        selectedRiskModal.details.score >= 30 ? 'bg-amber-500' : 'bg-green-500'
                      }`}
                      style={{ width: `${Math.min(selectedRiskModal.details.score, 100)}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-2 text-xs font-bold text-gray-400">
                    <span>0</span>
                    <span>50</span>
                    <span>100</span>
                  </div>
                </div>
              )}

              {/* Contributing Factors */}
              {selectedRiskModal.details?.factors?.length > 0 && (
                <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase mb-3">
                    Contributing Factors ({selectedRiskModal.details.factors.length})
                  </h3>
                  <div className="space-y-3">
                    {selectedRiskModal.details.factors.map((factor, idx) => (
                      <div
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-gray-50 rounded-xl border border-gray-100"
                      >
                        <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold ${
                          selectedRiskModal.level === 'high' ? 'bg-red-500' :
                          selectedRiskModal.level === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                        }`}>
                          {idx + 1}
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed flex-1">{factor}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Factors Message */}
              {(!selectedRiskModal.details?.factors || selectedRiskModal.details.factors.length === 0) && (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-12 w-12 text-green-500 mx-auto mb-3" />
                  <p className="text-sm text-gray-600 font-medium">
                    No significant risk factors detected. Conditions are favorable!
                  </p>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100">
              <Button
                onClick={() => setSelectedRiskModal(null)}
                className="w-full rounded-2xl h-12 font-bold"
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Header & Farm Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200">
              <CloudSun className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Climate Intelligence</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-500 flex items-center gap-2 font-medium">
                  <MapPin className="h-4 w-4 text-primary" />
                  {selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.state}` : 'Select a farm to begin'}
                </p>
                {weather?.timestamp && (
                  <>
                    <span className="text-gray-300">•</span>
                    <p className="text-gray-400 flex items-center gap-1.5 text-sm">
                      <Clock className="h-3.5 w-3.5" />
                      Updated {(() => {
                        const d = new Date(weather.timestamp);
                        if (Number.isNaN(d.getTime())) return '—';
                        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                      })()}
                    </p>
                  </>
                )}
              </div>
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
          <Button 
            onClick={handleSyncWeather} 
            disabled={syncWeatherMutation.isPending}
            variant="outline" 
            className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncWeatherMutation.isPending ? 'animate-spin' : ''}`} />
            {syncWeatherMutation.isPending ? 'Updating...' : 'Sync Weather'}
          </Button>
          <Button onClick={goBack} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200 hover:bg-gray-50 transition-colors">
             <ArrowLeft className="mr-2 h-4 w-4" /> Farms
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Current Conditions Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white overflow-hidden relative group h-fit lg:self-start">
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
                {currentDisplay?.icon ? (
                  <img 
                    src={`https://openweathermap.org/img/wn/${currentDisplay.icon}@4x.png`} 
                    alt="Weather icon" 
                    className="h-32 w-32 drop-shadow-2xl animate-pulse" 
                  />
                ) : (
                  <CloudSun className="h-24 w-24 text-white/50 mb-4" />
                )}
                <h2 className="text-7xl font-black tracking-tighter drop-shadow-sm">
                  {currentDisplay?.temperature != null ? Math.round(Number(currentDisplay.temperature)) : '--'}°
                </h2>
                <p className="text-xl font-bold text-blue-100 capitalize mt-2 tracking-wide">
                  {currentDisplay?.weatherDescription || 'N/A'}
                </p>
              </div>
              
              <div className="grid grid-cols-2 gap-4 mt-8">
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-blue-200 mb-2">
                    <Droplets className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Humidity</span>
                  </div>
                  <p className="text-2xl font-black">{currentDisplay?.humidity ?? '--'}%</p>
                </div>
                <div className="bg-white/10 backdrop-blur-xl p-4 rounded-3xl border border-white/20 shadow-inner">
                  <div className="flex items-center gap-2 text-blue-200 mb-2">
                    <Wind className="h-4 w-4" />
                    <span className="text-[10px] font-black uppercase tracking-widest">Wind</span>
                  </div>
                  <p className="text-2xl font-black">{currentDisplay?.windSpeed ?? '--'} <span className="text-xs">km/h</span></p>
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
              {/* Farm Context: Soil & Irrigation */}
              {selectedFarm && (
                <div className="flex items-center gap-3">
                  {selectedFarm.soilType?.length > 0 && (
                    <span className="text-[10px] font-bold text-gray-500 uppercase bg-gray-100 px-2 py-1 rounded-lg">
                      🪨 {selectedFarm.soilType.join(', ')}
                    </span>
                  )}
                  {selectedFarm.irrigationType && (
                    <span className="text-[10px] font-bold text-gray-500 uppercase bg-blue-50 px-2 py-1 rounded-lg">
                      💧 {selectedFarm.irrigationType}
                    </span>
                  )}
                </div>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                { label: 'Drought Risk', key: 'droughtRisk', detailsKey: 'droughtRiskDetails', icon: CloudSun, color: 'orange', desc: 'Soil moisture levels' },
                { label: 'Flood Risk', key: 'floodRisk', detailsKey: 'floodRiskDetails', icon: Droplets, color: 'blue', desc: 'Precipitation volume' },
                { label: 'Heat Stress', key: 'heatRisk', detailsKey: 'heatRiskDetails', icon: Thermometer, color: 'red', desc: 'Thermal impact' },
                { label: 'Pest Risk', key: 'pestRisk', detailsKey: 'pestRiskDetails', icon: Sprout, color: 'green', desc: 'Infestation likelihood' },
                { label: 'Disease Risk', key: 'diseaseRisk', detailsKey: 'diseaseRiskDetails', icon: AlertCircle, color: 'amber', desc: 'Pathogen development' }
              ].map((risk) => {
                const colorMap = {
                  orange: "bg-orange-100 text-orange-600",
                  blue: "bg-blue-100 text-blue-600",
                  red: "bg-red-100 text-red-600",
                  green: "bg-green-100 text-green-600",
                  amber: "bg-amber-100 text-amber-600"
                };
                const riskLevel = risks?.[risk.key] || 'low';
                const riskDetails = risks?.[risk.detailsKey];
                const hasFactors = riskDetails?.factors?.length > 0;
                
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
                    
                    {/* Risk Score Bar */}
                    {riskDetails?.score !== undefined && (
                      <div className="mt-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Risk Score</span>
                          <span className="text-xs font-black text-gray-600">{riskDetails.score}/100</span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              riskDetails.score >= 60 ? 'bg-red-500' : 
                              riskDetails.score >= 30 ? 'bg-amber-500' : 'bg-green-500'
                            }`}
                            style={{ width: `${Math.min(riskDetails.score, 100)}%` }}
                          />
                        </div>
                      </div>
                    )}
                    
                    {/* Risk Factors Preview */}
                    {hasFactors && (
                      <div className="mt-3 space-y-1.5">
                        <span className="text-[10px] font-bold text-gray-400 uppercase">Contributing Factors</span>
                        {riskDetails.factors.slice(0, 2).map((factor, idx) => (
                          <div key={idx} className="flex items-start gap-1.5">
                            <div className={`h-1.5 w-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                              riskLevel === 'high' ? 'bg-red-500' : 
                              riskLevel === 'medium' ? 'bg-amber-500' : 'bg-green-500'
                            }`} />
                            <p className="text-[11px] text-gray-600 leading-tight">{factor}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* View Details Button */}
                    {(hasFactors || riskDetails?.score !== undefined) && (
                      <button
                        onClick={() => setSelectedRiskModal({
                          ...risk,
                          level: riskLevel,
                          details: riskDetails
                        })}
                        className="mt-4 w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-colors group/btn"
                      >
                        <Eye className="h-4 w-4 text-gray-600 group-hover/btn:text-primary transition-colors" />
                        <span className="text-xs font-bold text-gray-700 group-hover/btn:text-primary transition-colors">
                          View Full Details
                          {riskDetails?.factors?.length > 2 && ` (${riskDetails.factors.length} factors)`}
                        </span>
                      </button>
                    )}
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

      {/* Full OpenWeather Details (raw payload) */}
      <WeatherDetailsPanel weather={weather} riskReport={riskReport} />

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
