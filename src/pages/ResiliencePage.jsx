import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams, Link } from 'react-router-dom';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  Info, 
  RefreshCw, 
  MapPin, 
  ArrowLeft,
  Sprout,
  CheckCircle2,
  XCircle,
  Zap,
  Leaf,
  BarChart3,
  HeartPulse,
  CloudSun
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

const MetricCard = ({ label, score, icon: Icon, color }) => (
  <div className="bg-white p-6 rounded-[2rem] border border-gray-100 shadow-sm hover:shadow-md transition-all group">
    <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="h-6 w-6" />
    </div>
    <div className="flex justify-between items-end mb-4">
      <h4 className="font-black text-gray-900 text-sm uppercase tracking-wider">{label}</h4>
      <span className="text-2xl font-black text-gray-900">{score}%</span>
    </div>
    <div className="h-2 w-full bg-gray-100 rounded-full overflow-hidden shadow-inner">
      <div 
        className={`h-full rounded-full transition-all duration-1000 ${score > 70 ? 'bg-green-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
        style={{ width: `${score}%` }} 
      />
    </div>
  </div>
);

const ResiliencePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();

  console.log('ResiliencePage - farmId:', farmId);

  const { data: farms, isLoading: isLoadingFarms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      console.log('ResiliencePage - farms data:', response.data.data);
      return response.data.data;
    }
  });

  const { data: resilienceData, isLoading: isLoadingResilience, error, refetch } = useQuery({
    queryKey: ['resilience', farmId],
    queryFn: async () => {
      console.log('ResiliencePage - fetching resilience for:', farmId);
      const response = await api.get(`/resilience/${farmId}`);
      console.log('ResiliencePage - resilience data:', response.data.data);
      return response.data.data;
    },
    enabled: !!farmId,
    retry: 1
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/resilience/${farmId}/sync`);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['resilience', farmId], data);
    }
  });

  // Auto-select first farm if none is selected
  React.useEffect(() => {
    if (farms?.length > 0 && !farmId) {
      console.log('ResiliencePage - Auto-selecting farm:', farms[0]._id);
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farms, farmId, setSearchParams]);

  if (isLoadingFarms || (farmId && isLoadingResilience) || !farmId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Calculating resilience profile...</p>
      </div>
    );
  }

  if (error) {
    console.error('ResiliencePage - Error:', error);
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="bg-red-500 p-3 rounded-2xl shadow-lg shadow-red-200">
              <AlertCircle className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900">Analysis Failed</h1>
              <p className="text-gray-500 mt-1 font-medium">We couldn't retrieve the resilience profile for this farm.</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button onClick={() => refetch()} className="rounded-2xl h-12 px-8 font-bold">Try Again</Button>
            <Button asChild variant="outline" className="rounded-2xl h-12 px-8 font-bold border-gray-200">
              <Link to="/dashboard">Back to Portfolio</Link>
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const selectedFarm = farms?.find(f => f._id === farmId);
  const profile = resilienceData;
  const metrics = profile?.metrics || {};
  const history = profile?.history || [];
  const recommendations = profile?.recommendations || [];

  console.log('ResiliencePage - Rendering with profile:', profile);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Header & Farm Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-green-600 p-3 rounded-2xl shadow-lg shadow-green-200">
              <ShieldCheck className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Resilience Index</h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.country}` : 'Loading...'}
              </p>
            </div>
          </div>
          
          <div className="h-12 w-px bg-gray-100 hidden sm:block" />

          <div className="relative group w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Sprout className="h-5 w-5 text-green-600" />
            </div>
            <select 
              value={farmId || ''} 
              onChange={(e) => setSearchParams({ farmId: e.target.value })}
              className="block w-full pl-12 pr-10 py-3 text-base font-bold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer transition-all hover:bg-white hover:shadow-md"
            >
              {farms?.map(farm => (
                <option key={farm._id} value={farm._id}>{farm.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button 
            onClick={() => syncMutation.mutate()} 
            disabled={syncMutation.isPending}
            variant="outline" 
            className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200 hover:bg-gray-50"
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            Sync Profile
          </Button>
          <Button asChild variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-gray-200">
             <Link to="/dashboard"><ArrowLeft className="mr-2 h-4 w-4" /> Portfolio</Link>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Overall Score Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white overflow-hidden relative group">
          <div className="absolute -right-8 -top-8 h-48 w-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" />
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-green-100">
              Composite Resilience Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <div className="relative inline-flex items-center justify-center mb-6">
                <svg className="h-48 w-48 transform -rotate-90">
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    className="text-white/10"
                  />
                  <circle
                    cx="96"
                    cy="96"
                    r="88"
                    stroke="currentColor"
                    strokeWidth="12"
                    fill="transparent"
                    strokeDasharray={552.92}
                    strokeDashoffset={552.92 - (552.92 * (profile?.overallScore || 0)) / 100}
                    strokeLinecap="round"
                    className="text-white transition-all duration-1000 ease-out"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-6xl font-black tracking-tighter">
                    {profile?.overallScore || 0}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-100">Index Points</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 inline-flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-green-300" />
                <span className="text-sm font-bold tracking-wide">Stronger than 78% of local farms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Breakdown */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-6">
          <MetricCard 
            label="Management Score" 
            score={metrics.managementScore || 0} 
            icon={Zap} 
            color="bg-amber-100 text-amber-600"
          />
          <MetricCard 
            label="Climate Adaptation" 
            score={metrics.climateAdaptationScore || 0} 
            icon={CloudSun} 
            color="bg-blue-100 text-blue-600"
          />
          <MetricCard 
            label="Diversity Score" 
            score={metrics.diversityScore || 0} 
            icon={Leaf} 
            color="bg-green-100 text-green-600"
          />
          <MetricCard 
            label="Sustainability Index" 
            score={metrics.sustainabilityScore || 0} 
            icon={HeartPulse} 
            color="bg-rose-100 text-rose-600"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Recommendations */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-gray-50 px-8 py-6 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-amber-500" />
              <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Strategic Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-4">
              {profile?.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 p-5 rounded-3xl bg-amber-50/30 border border-amber-100/50 group hover:bg-amber-50 transition-colors">
                  <div className="bg-amber-100 p-2 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                    <Info className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed">{rec}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* History / Trend */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
          <CardHeader className="bg-gray-50 px-8 py-6 border-b border-gray-100">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <span className="font-black text-gray-900 uppercase tracking-wider text-sm">Resilience Trajectory</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-8">
            <div className="space-y-6">
              {profile?.history?.slice().reverse().map((entry, i) => (
                <div key={i} className="flex items-center justify-between p-4 rounded-2xl border border-gray-50">
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-gray-50 flex items-center justify-center font-black text-primary">
                      {entry.score}
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">Index Update</p>
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {i === 0 ? (
                    <span className="text-[10px] font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">Current</span>
                  ) : (
                    <TrendingUp className="h-4 w-4 text-green-500" />
                  )}
                </div>
              ))}
              {!profile?.history?.length && (
                <div className="text-center py-12 text-gray-400 font-medium">No history available yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResiliencePage;
