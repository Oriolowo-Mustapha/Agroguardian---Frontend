import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { 
  ShieldCheck, 
  TrendingUp, 
  AlertCircle, 
  Info, 
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
import { LoadingState } from '../components/ui/States';

const MetricCard = ({ label, score, icon: Icon, color }) => (
  <div className="bg-card p-6 rounded-[2rem] border border-border shadow-sm hover:shadow-md transition-all group">
    <div className={`h-12 w-12 rounded-2xl ${color} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
      <Icon className="h-6 w-6" aria-hidden="true" />
    </div>
    <div className="flex justify-between items-end gap-3 mb-4">
      <h4 className="font-black text-foreground text-sm uppercase tracking-wider min-w-0">{label}</h4>
      <span className="text-2xl font-black text-foreground shrink-0">{score}%</span>
    </div>
    <div className="h-2 w-full bg-muted rounded-full overflow-hidden shadow-inner">
      <div 
        className={`h-full rounded-full transition-all duration-1000 ${score > 70 ? 'bg-green-500' : score > 40 ? 'bg-amber-500' : 'bg-red-500'}`} 
        style={{ width: `${score}%` }} 
        role="progressbar"
        aria-label={label}
        aria-valuenow={score}
        aria-valuemin={0}
        aria-valuemax={100}
      />
    </div>
  </div>
);

const ResiliencePage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();
  const goBack = useNavigateBack('/dashboard');

  console.log('ResiliencePage - farmId:', farmId);

  const { data: farms, isLoading: isLoadingFarms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      console.log('ResiliencePage - farms data:', response.data.data);
      return response.data.data || [];
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
    return <LoadingState label="Calculating resilience profile..." className="min-h-[60vh]" />;
  }

  if (error) {
    console.error('ResiliencePage - Error:', error);
    return (
      <div className="space-y-8 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
        <div role="alert" className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-red-500 p-3 shrink-0 rounded-2xl shadow-lg shadow-red-200" aria-hidden="true">
              <AlertCircle className="text-white h-8 w-8" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground">Analysis Failed</h1>
              <p className="text-muted-foreground mt-1 font-medium">We couldn't retrieve the resilience profile for this farm.</p>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <Button onClick={() => refetch()} className="rounded-2xl h-12 px-8 font-bold">Try Again</Button>
            <Button onClick={goBack} variant="outline" className="rounded-2xl h-12 px-8 font-bold border-border">
              Back to Portfolio
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
    <div className="space-y-8 pb-12 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Header & Farm Selector */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 sm:gap-6 bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto min-w-0">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-green-600 p-3 shrink-0 rounded-2xl shadow-lg shadow-green-200" aria-hidden="true">
              <ShieldCheck className="text-white h-8 w-8" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter">Resilience Index</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium min-w-0">
                <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                <span className="truncate">{selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.country}` : 'Loading...'}</span>
              </p>
            </div>
          </div>
          
          <div className="h-12 w-px bg-border hidden sm:block" aria-hidden="true" />

          <div className="relative group w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none" aria-hidden="true">
              <Sprout className="h-5 w-5 text-green-600" aria-hidden="true" />
            </div>
            <label htmlFor="resilience-farm-select" className="sr-only">Select farm</label>
            <select 
              id="resilience-farm-select"
              value={farmId || ''} 
              onChange={(e) => setSearchParams({ farmId: e.target.value })}
              className="block w-full pl-12 pr-10 py-3 text-base font-bold text-foreground bg-muted border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent appearance-none cursor-pointer transition-all hover:bg-card hover:shadow-md"
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
            loading={syncMutation.isPending}
            variant="outline" 
            className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-border"
          >
            Sync Profile
          </Button>
          <Button onClick={goBack} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-12 font-bold border-border">
             <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Portfolio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 sm:gap-8">
        {/* Overall Score Card */}
        <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 via-green-700 to-emerald-800 text-white overflow-hidden relative group">
          <div className="absolute -right-8 -top-8 h-48 w-48 bg-white/10 rounded-full blur-3xl group-hover:scale-110 transition-transform duration-700" aria-hidden="true" />
          <CardHeader>
            <CardTitle className="text-[10px] font-black uppercase tracking-[0.2em] text-green-100">
              Composite Resilience Score
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5 sm:p-6 md:p-8">
            <div className="text-center py-8">
              <div className="relative inline-flex items-center justify-center mb-6">
                <svg className="h-48 w-48 transform -rotate-90" aria-hidden="true">
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
                  <span className="text-5xl sm:text-6xl font-black tracking-tighter">
                    {profile?.overallScore || 0}
                  </span>
                  <span className="text-[10px] font-black uppercase tracking-widest text-green-100">Index Points</span>
                </div>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-3xl border border-white/20 inline-flex flex-wrap items-center justify-center gap-3 max-w-full">
                <TrendingUp className="h-5 w-5 shrink-0 text-green-300" aria-hidden="true" />
                <span className="text-sm font-bold tracking-wide">Stronger than 78% of local farms</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Metrics Breakdown */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8">
        {/* Recommendations */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="bg-muted px-4 py-4 sm:px-8 sm:py-6 border-b border-border flex-shrink-0">
            <CardTitle className="flex items-center gap-2 min-w-0">
              <Zap className="h-5 w-5 shrink-0 text-amber-500" aria-hidden="true" />
              <span className="font-black text-foreground uppercase tracking-wider text-sm truncate">Strategic Recommendations</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
            <div className="space-y-4">
              {profile?.recommendations?.map((rec, i) => (
                <div key={i} className="flex items-start gap-4 p-4 sm:p-5 rounded-3xl bg-amber-50/30 border border-amber-100/50 group hover:bg-amber-50 transition-colors">
                  <div className="bg-amber-100 p-2 shrink-0 rounded-xl text-amber-600 group-hover:scale-110 transition-transform" aria-hidden="true">
                    <Info className="h-5 w-5" aria-hidden="true" />
                  </div>
                  <p className="text-sm font-bold text-amber-900 leading-relaxed min-w-0">{rec}</p>
                </div>
              ))}
              {!profile?.recommendations?.length && (
                <div className="text-center py-12 text-muted-foreground font-medium">No recommendations available yet.</div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* History / Trend */}
        <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col h-[400px]">
          <CardHeader className="bg-muted px-4 py-4 sm:px-8 sm:py-6 border-b border-border flex-shrink-0">
            <CardTitle className="flex items-center gap-2 min-w-0">
              <BarChart3 className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
              <span className="font-black text-foreground uppercase tracking-wider text-sm truncate">Resilience Trajectory</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 sm:p-6 md:p-8 overflow-y-auto flex-1">
            <div className="space-y-6">
              {profile?.history?.slice().reverse().map((entry, i) => (
                <div key={i} className="flex items-center justify-between gap-3 p-4 rounded-2xl border border-border">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="h-10 w-10 shrink-0 rounded-xl bg-muted flex items-center justify-center font-black text-primary">
                      {entry.score}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-black text-foreground">Index Update</p>
                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                        {new Date(entry.timestamp).toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                  {i === 0 ? (
                    <span className="text-[10px] shrink-0 font-black bg-primary/10 text-primary px-3 py-1 rounded-full uppercase">Current</span>
                  ) : (
                    <TrendingUp className="h-4 w-4 shrink-0 text-green-500" aria-hidden="true" />
                  )}
                </div>
              ))}
              {!profile?.history?.length && (
                <div className="text-center py-12 text-muted-foreground font-medium">No history available yet.</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResiliencePage;
