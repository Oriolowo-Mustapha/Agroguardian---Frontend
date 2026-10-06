import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, 
  Droplets, 
  Sprout, 
  Calendar, 
  ArrowLeft,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Zap,
  ChevronRight,
  ClipboardList,
  PawPrint,
  Syringe,
  Heart,
  Scale,
  Timer,
  Skull
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { LoadingState } from '../components/ui/States';
import { MiniStat } from '../components/ui/SectionCard';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import AddCropModal from '../components/AddCropModal';
import CreateSeasonModal from '../components/CreateSeasonModal';
import EditSeasonModal from '../components/EditSeasonModal';
import LogActivityModal from '../components/LogActivityModal';
import EditFarmModal from '../components/EditFarmModal';
import PracticesInventoryModal from '../components/PracticesInventoryModal';
import CompleteActivityModal from '../components/CompleteActivityModal';

const FarmDetailsPage = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const goBack = useNavigateBack('/farms');
  const queryClient = useQueryClient();
  
  // Modal states
  const [isAddCropOpen, setIsAddCropOpen] = React.useState(false);
  const [isCreateSeasonOpen, setIsCreateSeasonOpen] = React.useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = React.useState(false);
  const [isEditFarmOpen, setIsEditFarmOpen] = React.useState(false);
  const [isPracticesInventoryOpen, setIsPracticesInventoryOpen] = React.useState(false);
  const [isCompleteActivityOpen, setIsCompleteActivityOpen] = React.useState(false);
  const [activityToComplete, setActivityToComplete] = React.useState(null);

  const [isEditSeasonOpen, setIsEditSeasonOpen] = React.useState(false);
  const [seasonToEdit, setSeasonToEdit] = React.useState(null);

  // Fetch Farm Details
  const { data: farm, isLoading: isLoadingFarm, error: farmError } = useQuery({
    queryKey: ['farm', farmId],
    queryFn: async () => {
      const response = await api.get(`/farms/${farmId}`);
      return response.data.data;
    }
  });

  // Fetch Crops Registered to this Farm
  const { data: farmCrops } = useQuery({
    queryKey: ['farm-crops', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/crops`);
      return response.data.data;
    },
    enabled: !!farmId
  });

  // Fetch Seasons
  const { data: seasons } = useQuery({
    queryKey: ['farm-seasons', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/seasons`);
      return response.data.data;
    },
    enabled: !!farmId
  });

  // Livestock stats for this farm (backend insights: weighing/vaccines, etc.)
  const {
    data: livestockStats,
    isLoading: isLoadingLivestockStats,
    error: livestockStatsError
  } = useQuery({
    queryKey: ['livestock-stats', farmId],
    queryFn: async () => {
      const response = await api.get(`/livestock/farms/${farmId}/stats`);
      return response.data?.data ?? response.data;
    },
    enabled: !!farmId
  });

  // Livestock list for this farm (source of truth for live counts/value)
  const {
    data: farmLivestock,
    isLoading: isLoadingFarmLivestock,
    error: farmLivestockError
  } = useQuery({
    queryKey: ['livestock', farmId],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${farmId}`);
      const data = res.data?.data ?? res.data;

      if (Array.isArray(data)) return data;
      if (Array.isArray(data?.livestock)) return data.livestock;
      if (Array.isArray(data?.items)) return data.items;

      return [];
    },
    enabled: !!farmId
  });

  // Mortality (for deaths)
  const { data: mortality } = useQuery({
    queryKey: ['mortality-report', farmId],
    queryFn: async () => {
      const res = await api.get(`/livestock-inventory/farms/${farmId}/mortality`);
      const data = res.data?.data ?? res.data;
      return data && typeof data === 'object' ? data : {};
    },
    enabled: !!farmId
  });

  const isInactiveLivestock = React.useCallback((item) => {
    if (!item) return true;
    if (item?.status === 'deceased' || item?.status === 'sold') return true;
    if (item?.trackingType === 'batch' && (item?.quantity ?? 1) <= 0) return true;
    return false;
  }, []);

  const countAnimals = React.useCallback((item) => {
    if (!item) return 0;
    return item?.trackingType === 'batch' ? (Number(item?.quantity) || 0) : 1;
  }, []);

  const activeFarmLivestock = React.useMemo(() => {
    const list = Array.isArray(farmLivestock) ? farmLivestock : [];
    return list.filter((l) => l && !isInactiveLivestock(l));
  }, [farmLivestock, isInactiveLivestock]);

  const totalAnimalsComputed = React.useMemo(
    () => activeFarmLivestock.reduce((sum, item) => sum + countAnimals(item), 0),
    [activeFarmLivestock, countAnimals]
  );

  const totalSickComputed = React.useMemo(() => {
    return activeFarmLivestock.reduce((sum, item) => {
      const hs = item?.healthStatus;
      const sick = hs && hs !== 'healthy';
      return sum + (sick ? countAnimals(item) : 0);
    }, 0);
  }, [activeFarmLivestock, countAnimals]);

  const estimatedValueComputed = React.useMemo(() => {
    return activeFarmLivestock.reduce((sum, item) => {
      const raw = item?.cost ?? item?.acquisitionCost;
      const val = Number(raw);
      return sum + (Number.isFinite(val) ? val : 0);
    }, 0);
  }, [activeFarmLivestock]);

  const bySpeciesComputed = React.useMemo(() => {
    const map = activeFarmLivestock.reduce((acc, item) => {
      const key = item?.species || 'unknown';
      acc[key] = (acc[key] || 0) + countAnimals(item);
      return acc;
    }, {});

    return Object.entries(map).map(([species, totalCount]) => ({
      _id: species,
      totalCount
    }));
  }, [activeFarmLivestock, countAnimals]);

  const deathsComputed = React.useMemo(() => {
    const raw = mortality?.totalDeaths ?? mortality?.deaths ?? 0;
    const n = Number(raw);
    return Number.isFinite(n) ? n : 0;
  }, [mortality]);

  const livestockListLoaded = !isLoadingFarmLivestock && !farmLivestockError;
  const totalAnimalsDisplay = livestockListLoaded
    ? totalAnimalsComputed
    : Number(livestockStats?.totalAnimals || 0);
  const totalSickDisplay = livestockListLoaded
    ? totalSickComputed
    : Number(livestockStats?.totalSick || 0);
  const estimatedValueDisplay = livestockListLoaded
    ? estimatedValueComputed
    : Number(livestockStats?.estimatedValue || 0);
  const bySpeciesDisplay = livestockListLoaded
    ? bySpeciesComputed
    : (Array.isArray(livestockStats?.bySpecies) ? livestockStats.bySpecies : []);


  const activeSeasons = React.useMemo(
    () => (seasons || []).filter((s) => s.status === 'active'),
    [seasons]
  );

  const usedActiveArea = React.useMemo(
    () => activeSeasons.reduce((sum, s) => sum + (Number(s.area) || 0), 0),
    [activeSeasons]
  );

  const remainingArea = React.useMemo(() => {
    if (!farm) return null;
    return Math.max(0, (Number(farm.size) || 0) - usedActiveArea);
  }, [farm, usedActiveArea]);

  const deleteCropMutation = useMutation({
    mutationFn: async (cropId) => {
      return await api.delete(`/practices/farms/${farmId}/crops/${cropId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm-crops', farmId]);
    },
  });

  const deleteSeasonMutation = useMutation({
    mutationFn: async (seasonId) => {
      return await api.delete(`/practices/farms/${farmId}/seasons/${seasonId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm-seasons', farmId]);
    },
  });

  // Fetch Activities
  const { data: activities } = useQuery({
    queryKey: ['farm-activities', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/activities`);
      return response.data.data;
    },
    enabled: !!farmId
  });

  // Fetch Resilience Profile
  const { data: resilience } = useQuery({
    queryKey: ['resilience', farmId],
    queryFn: async () => {
      const response = await api.get(`/resilience/${farmId}`);
      return response.data.data;
    },
    enabled: !!farmId
  });

  // Fetch Climate Risk
  const { data: riskReport } = useQuery({
    queryKey: ['weather-risk', farmId],
    queryFn: async () => {
      const response = await api.get('/weather/risk', { params: { farmId } });
      return response.data.data;
    },
    enabled: !!farmId
  });

  const decommissionFarmMutation = useMutation({
    mutationFn: async () => {
      await api.patch(`/farms/${farmId}/decommission`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farms']);
      navigate('/farms');
    }
  });

  const handleDecommission = () => {
    if (window.confirm('Decommission this farm? It will be marked as inactive and won\'t be treated as an active asset.')) {
      decommissionFarmMutation.mutate();
    }
  };

  if (isLoadingFarm) {
    return <LoadingState label="Retrieving farm records..." className="min-h-[60vh]" />;
  }

  if (farmError || !farm) {
    return (
      <div role="alert" className="text-center py-16 sm:py-20 px-6 bg-card rounded-3xl border border-border shadow-sm max-w-2xl mx-auto mt-12">
        <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" aria-hidden="true" />
        <h3 className="text-2xl font-bold text-foreground mb-2">Record Not Found</h3>
        <p className="text-muted-foreground mb-8">This farm asset may have been moved or deleted.</p>
        <Button onClick={goBack} className="rounded-2xl h-12 px-8 font-bold">
          Return to Portfolio
        </Button>
      </div>
    );
  }

  const risks = riskReport?.risk;
  const resilienceScore = resilience?.overallScore || 0;

  return (
    <div className="space-y-8 pb-12 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button type="button" variant="ghost" onClick={goBack} className="pl-0 hover:bg-transparent text-muted-foreground hover:text-primary group">
          <span className="flex items-center gap-2 font-bold">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" aria-hidden="true" />
            Back to Portfolio
          </span>
        </Button>
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <Button onClick={() => setIsLogActivityOpen(true)} className="rounded-xl font-black bg-indigo-600 shadow-lg shadow-indigo-100 h-12 px-6">
            <Zap className="h-4 w-4 mr-2 fill-current" aria-hidden="true" />
            Log Practice
          </Button>
          <Button
            type="button"
            onClick={() => setIsEditFarmOpen(true)}
            variant="outline"
            className="rounded-xl border-border font-bold hover:bg-muted h-12 px-6"
          >
            <Edit2 className="h-4 w-4 mr-2 text-primary" aria-hidden="true" />
            Edit Profile
          </Button>
          <Button 
            onClick={handleDecommission}
            loading={decommissionFarmMutation.isPending}
            variant="outline" 
            className="rounded-xl border-border text-destructive hover:bg-destructive/10 hover:text-destructive font-bold h-12 px-6"
          >
            {!decommissionFarmMutation.isPending && <Trash2 className="h-4 w-4 mr-2" aria-hidden="true" />}
            Decommission
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-card p-6 sm:p-8 rounded-[2.5rem] border border-border shadow-sm overflow-hidden relative group">
            <div className="flex flex-col md:flex-row gap-6 md:gap-8 items-start">
              <div className="h-56 w-full md:w-64 rounded-3xl bg-muted overflow-hidden flex-shrink-0 ring-8 ring-muted/50">
                {farm.imageUrl && farm.imageUrl.length > 0 ? (
                  <img src={farm.imageUrl[0]} alt={farm.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5" aria-hidden="true">
                    <Sprout className="h-16 w-16 text-primary/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 space-y-6">
                <div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-3">
                    <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-green-200 flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                      Active Asset
                    </span>
                    <span className="text-sm text-muted-foreground font-bold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" aria-hidden="true" />
                      {farm.establishedDate ? new Date(farm.establishedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-indigo-100">
                        {farm.climateZone || 'Detecting...'}
                    </span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter mb-3 break-words">{farm.name}</h1>
                  <p className="text-muted-foreground font-medium leading-relaxed text-lg">{farm.description || 'Strategically managed agricultural asset under AgroGuardian AI oversight.'}</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-foreground bg-muted px-4 py-2 rounded-2xl border border-border max-w-full min-w-0">
                    <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                    <span className="truncate">{farm.location?.city}{farm.location?.city && farm.location?.state ? ', ' : ''}{farm.location?.state}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collection & Inventory Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col h-auto md:h-[280px]">
                <CardHeader className="bg-muted px-6 sm:px-8 py-5 sm:py-6 border-b border-border flex justify-between items-center flex-shrink-0">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-green-500" aria-hidden="true" />
                        Registered Crops
                    </CardTitle>
                    <button 
                        type="button"
                        onClick={() => setIsAddCropOpen(true)}
                        aria-label="Add crop"
                        className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary transition-colors hover:text-white"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 overflow-visible md:overflow-y-auto flex-1">
                    {farmCrops?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {farmCrops.map((crop) => (
                                <div key={crop._id} className="bg-green-50/50 border border-green-100 px-4 py-2 rounded-2xl flex items-center gap-2 group">
                                    <span className="text-xs font-black text-green-700">{crop.name}</span>
                                    <span className="text-[10px] font-black bg-card px-2 py-0.5 rounded-full text-green-600 uppercase tracking-tighter border border-green-100">
                                        {crop.category}
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => {
                                        if (deleteCropMutation.isPending) return;
                                        if (!window.confirm(`Delete crop "${crop.name}"?`)) return;
                                        deleteCropMutation.mutate(crop._id);
                                      }}
                                      aria-label={`Delete crop ${crop.name}`}
                                      title="Delete crop"
                                      className="ml-1 rounded transition-opacity text-green-700/70 hover:text-destructive opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                    >
                                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-muted-foreground">No crops registered yet.</p>
                            <Button variant="link" onClick={() => setIsAddCropOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto">
                                Add First Crop
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col h-auto md:h-[280px]">
                <CardHeader className="bg-muted px-6 sm:px-8 py-5 sm:py-6 border-b border-border flex justify-between items-center flex-shrink-0">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" aria-hidden="true" />
                        Active Seasons
                    </CardTitle>
                    <button 
                        type="button"
                        onClick={() => setIsCreateSeasonOpen(true)}
                        aria-label="Create season"
                        className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 transition-colors hover:text-white"
                    >
                        <Plus className="h-4 w-4" aria-hidden="true" />
                    </button>
                </CardHeader>
                <CardContent className="p-6 sm:p-8 overflow-visible md:overflow-y-auto flex-1">
                    {activeSeasons.length > 0 ? (
                        <div className="space-y-4">
                            {activeSeasons.map((season) => (
                                <div key={season._id} className="flex items-center justify-between gap-2 p-3 sm:p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                    <div className="flex items-center gap-3 min-w-0">
                                        <div className="h-10 w-10 rounded-xl bg-card flex items-center justify-center text-blue-600 shadow-sm flex-shrink-0" aria-hidden="true">
                                            <Sprout className="h-5 w-5" />
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-black text-foreground truncate">{season.cropId?.name}</p>
                                            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                                {season.area} {season.areaUnit} • Planted {new Date(season.plantedDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSeasonToEdit(season);
                                          setIsEditSeasonOpen(true);
                                        }}
                                        aria-label={`Edit season for ${season.cropId?.name || 'crop'}`}
                                        title="Edit season"
                                        className="h-9 w-9 rounded-xl bg-card border border-blue-100 text-blue-600 hover:bg-blue-600 hover:text-white transition-colors flex items-center justify-center"
                                      >
                                        <Edit2 className="h-4 w-4" aria-hidden="true" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          if (deleteSeasonMutation.isPending) return;
                                          if (!window.confirm('Delete this season?')) return;
                                          deleteSeasonMutation.mutate(season._id);
                                        }}
                                        aria-label={`Delete season for ${season.cropId?.name || 'crop'}`}
                                        title="Delete season"
                                        className="h-9 w-9 rounded-xl bg-card border border-blue-100 text-blue-600 hover:bg-red-600 hover:text-white transition-colors flex items-center justify-center"
                                      >
                                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                                      </button>
                                      <Link to={`/weather?farmId=${farmId}`} className="h-9 w-9 rounded-xl bg-card border border-blue-100 text-blue-600 hover:bg-blue-50 transition-colors flex items-center justify-center" aria-label="View weather" title="View weather">
                                          <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                      </Link>
                                    </div>
                                </div>
                            ))}

                            {(seasons || []).filter((s) => s.status !== 'active').length > 0 && (
                              <div className="pt-2">
                                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">Past Seasons</p>
                                <div className="space-y-2">
                                  {(seasons || [])
                                    .filter((s) => s.status !== 'active')
                                    .slice(0, 3)
                                    .map((s) => (
                                      <div key={s._id} className="flex items-center justify-between gap-2 px-4 py-3 rounded-2xl bg-muted border border-border">
                                        <div className="min-w-0">
                                          <p className="text-xs font-black text-foreground truncate">{s.cropId?.name}</p>
                                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest truncate">
                                            {s.area} {s.areaUnit} • {s.status}
                                          </p>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setSeasonToEdit(s);
                                            setIsEditSeasonOpen(true);
                                          }}
                                          aria-label={`Edit past season for ${s.cropId?.name || 'crop'}`}
                                          title="Edit season"
                                          className="h-8 w-8 rounded-xl bg-card border border-border text-muted-foreground hover:bg-foreground hover:text-background transition-colors flex items-center justify-center shrink-0"
                                        >
                                          <Edit2 className="h-4 w-4" aria-hidden="true" />
                                        </button>
                                      </div>
                                    ))}
                                </div>
                              </div>
                            )}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-muted-foreground">No active seasons found.</p>
                            <Button variant="link" onClick={() => setIsCreateSeasonOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto">
                                Initiate Season
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden flex flex-col h-auto md:h-[280px]">
              <CardHeader className="bg-muted px-6 sm:px-8 py-5 sm:py-6 border-b border-border flex justify-between items-center flex-shrink-0">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <PawPrint className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  Livestock
                </CardTitle>
                <Link
                  to={`/livestock?farmId=${farmId}`}
                  className="h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center hover:bg-amber-700 transition-colors hover:text-white"
                  aria-label="Open livestock"
                  title="Open livestock"
                >
                  <ChevronRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 overflow-visible md:overflow-y-auto flex-1">
                {isLoadingFarmLivestock && !farmLivestockError ? (
                  <div role="status" className="flex items-center gap-2 text-xs font-bold text-muted-foreground">
                    <RefreshCw className="h-4 w-4 animate-spin" aria-hidden="true" />
                    Loading livestock...
                  </div>
                ) : farmLivestockError && livestockStatsError ? (
                  <div role="alert" className="text-xs font-bold text-destructive">Failed to load livestock stats.</div>
                ) : (totalAnimalsDisplay || 0) > 0 ? (
                  <div className="space-y-5">
                    <div className="flex flex-wrap items-end justify-between gap-3">
                      <div>
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Active Animals</p>
                        <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
                          {Number(totalAnimalsDisplay || 0).toLocaleString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Health</p>
                        <div className="inline-flex items-center gap-1.5">
                          <Heart className={`h-4 w-4 ${(totalSickDisplay || 0) > 0 ? 'text-red-500' : 'text-green-600'}`} aria-hidden="true" />
                          <span className={`text-sm font-black ${(totalSickDisplay || 0) > 0 ? 'text-red-600' : 'text-green-700'}`}>
                            {(totalSickDisplay || 0) > 0 ? `${Number(totalSickDisplay || 0).toLocaleString()} sick` : 'All good'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <MiniStat
                        label="Weigh-ins (30d)"
                        icon={<Scale className="h-4 w-4" aria-hidden="true" />}
                        value={Number(livestockStats?.weighing?.weighInsLast30Days || 0).toLocaleString()}
                        helper={livestockStats?.weighing?.avgDaysBetweenWeighIns
                          ? `Avg every ${Math.round(livestockStats?.weighing?.avgDaysBetweenWeighIns)}d`
                          : 'No interval data yet'}
                      />
                      <MiniStat
                        label="Animals weighed (30d)"
                        icon={<Timer className="h-4 w-4" aria-hidden="true" />}
                        value={Number(livestockStats?.weighing?.animalsWeighedLast30Days || 0).toLocaleString()}
                        helper={livestockStats?.weighing?.daysSinceLastWeighIn != null
                          ? `Last weigh-in ${livestockStats?.weighing?.daysSinceLastWeighIn}d ago`
                          : 'No weigh-ins yet'}
                      />
                      <MiniStat
                        label="Upcoming Vaccines"
                        icon={<Syringe className="h-4 w-4" aria-hidden="true" />}
                        value={Number(livestockStats?.upcomingVaccinations?.length || 0).toLocaleString()}
                      />
                      <MiniStat
                        label="Deaths (90d)"
                        icon={<Skull className="h-4 w-4" aria-hidden="true" />}
                        value={Number(deathsComputed || 0).toLocaleString()}
                      />
                      <MiniStat
                        label="Estimated Value"
                        value={`₦${Number(estimatedValueDisplay || 0).toLocaleString()}`}
                      />
                    </div>

                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-2">By Species</p>
                      <div className="flex flex-wrap gap-2">
                        {(bySpeciesDisplay || [])
                          .slice()
                          .sort((a, b) => (b.totalCount || 0) - (a.totalCount || 0))
                          .slice(0, 6)
                          .map((s) => (
                            <span
                              key={s._id}
                              className="bg-amber-50/60 border border-amber-100 px-3 py-1.5 rounded-2xl text-[10px] font-black text-amber-800 uppercase tracking-widest"
                              title={`Animals: ${Number(s.totalCount || 0).toLocaleString()}`}
                            >
                              {String(s._id || 'unknown')} • {Number(s.totalCount || 0).toLocaleString()}
                            </span>
                          ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-xs font-bold text-muted-foreground">No livestock registered yet.</p>
                    <Button asChild variant="link" className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto">
                      <Link to={`/livestock?farmId=${farmId}`}>Manage Livestock</Link>
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Infrastructure & Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] p-6 sm:p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" aria-hidden="true" />
                  Technical Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="flex justify-between items-center gap-4 py-3 border-b border-border/50">
                  <span className="text-sm font-bold text-muted-foreground">Irrigation System</span>
                  <span className="text-sm font-black text-foreground uppercase tracking-wide text-right">{farm.irrigationType}</span>
                </div>
                <div className="flex justify-between items-center gap-4 py-3 border-b border-border/50">
                  <span className="text-sm font-bold text-muted-foreground shrink-0">Soil Segment(s)</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {farm.soilType?.map(s => (
                        <span key={s} className="text-[10px] font-black bg-muted px-2 py-1 rounded-lg uppercase border border-border">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center gap-4 py-3">
                  <span className="text-sm font-bold text-muted-foreground">Managed Area</span>
                  <span className="text-sm font-black text-foreground uppercase tracking-wide text-right">{farm.size} {farm.sizeUnit}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem] p-6 sm:p-8">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-indigo-500" aria-hidden="true" />
                    Practice Logs
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-4">
                        {activities?.slice(0, 3).map((activity) => {
                            const status = activity.status;
                            const isCompleted = status === 'completed';
                            const isFailed = status === 'failed';
                            const isVerifying = status === 'pending_end';
                            const showComplete = status === 'active' || status === 'pending_start';

                            const statusLabel =
                              status === 'pending_start' ? 'in progress' : status === 'pending_end' ? 'verifying' : status;

                            const gate = activity?.completionEligibility;
                            const tooEarly = gate && gate.isMatured === false;
                            const disableReason = tooEarly
                              ? (gate.blockedReason || `Too early: wait ~${gate.remainingDaysToMin} more day(s) for crop maturity.`)
                              : '';

                            return (
                              <div key={activity._id} className="flex gap-3 sm:gap-4 items-start sm:items-center">
                                  <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0" aria-hidden="true">
                                      <Zap className="h-5 w-5 fill-current" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                      <p className="text-sm font-black text-foreground truncate">{activity.practiceId?.name}</p>
                                      <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                                          {new Date(activity.startDate).toLocaleDateString()} • {activity.size} {farm.sizeUnit} • {statusLabel}
                                      </p>
                                      {tooEarly && (
                                        <p className="text-[10px] font-black text-destructive uppercase tracking-widest mt-0.5" title={gate?.blockedReason || ''}>
                                          {gate?.blockedReason
                                            ? 'Locked (season/maturity rule)'
                                            : `Locked (~${gate.remainingDaysToMin}d to maturity)`}
                                        </p>
                                      )}
                                  </div>
                                  <div className="flex flex-col items-end gap-2 shrink-0">
                                    {isCompleted ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500" aria-hidden="true" />
                                    ) : isFailed ? (
                                      <AlertCircle className="h-4 w-4 text-destructive" aria-hidden="true" />
                                    ) : isVerifying ? (
                                      <Clock className="h-4 w-4 text-amber-500" aria-hidden="true" />
                                    ) : (
                                      <Clock className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                                    )}

                                    {showComplete && (
                                      <Button
                                        variant="outline"
                                        className="h-7 px-3 rounded-xl text-[10px] font-black uppercase tracking-widest border-border"
                                        disabled={tooEarly}
                                        title={disableReason}
                                        onClick={() => {
                                          setActivityToComplete(activity);
                                          setIsCompleteActivityOpen(true);
                                        }}
                                      >
                                        Upload Evidence
                                      </Button>
                                    )}
                                  </div>
                              </div>
                            );
                        })}
                        {(!activities || activities.length === 0) && (
                            <div className="text-center py-4">
                                <p className="text-[10px] font-bold text-muted-foreground uppercase">No recent activity</p>
                            </div>
                        )}
                        <Button 
                            onClick={() => setIsPracticesInventoryOpen(true)}
                            variant="link" 
                            className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline pt-2"
                        >
                            View Practice Logs <ArrowLeft className="h-3 w-3 ml-1 rotate-180" aria-hidden="true" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] p-6 sm:p-8 flex flex-col items-center justify-center text-center">
              <CardHeader className="p-0 mb-6 w-full">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" aria-hidden="true" />
                  Resilience Index
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="h-32 w-32 transform -rotate-90" aria-hidden="true">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-border" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.42} strokeDashoffset={364.42 - (364.42 * resilienceScore) / 100} strokeLinecap="round" className="text-green-500 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-foreground">{resilienceScore}%</span>
                  </div>
                </div>
                <Button asChild variant="link" className="text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline">
                  <Link to={`/resilience?farmId=${farmId}`}>View Full Audit <ArrowLeft className="h-3 w-3 ml-1 rotate-180" aria-hidden="true" /></Link>
                </Button>
              </CardContent>
            </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 to-green-800 text-white rounded-[2.5rem] p-6 sm:p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10" aria-hidden="true">
              <AlertCircle className="h-32 w-32 rotate-12" />
            </div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-green-100">Climate Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-8 relative z-10">
              <div className="bg-white/10 backdrop-blur-md p-5 sm:p-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black text-green-200 uppercase tracking-widest mb-2">Live Severity</p>
                <div className="flex items-center gap-3">
                  <p className="text-2xl sm:text-3xl font-black tracking-tight capitalize">{risks?.notes ? 'Alert Active' : 'Low Risk'}</p>
                  <div className={`h-3 w-3 rounded-full ${risks?.notes ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} aria-hidden="true" />
                </div>
              </div>
              
              <p className="text-sm font-bold text-green-50 leading-relaxed">
                {risks?.notes || `The environment is currently stable for your primary crops. No immediate action required.`}
              </p>
              
              <Button asChild className="w-full bg-white text-green-700 hover:bg-green-50 font-black h-14 rounded-2xl shadow-lg border-none">
                <Link to={`/weather?farmId=${farmId}`}>Launch Intel Dashboard</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dynamic Modals */}
      <AddCropModal 
        isOpen={isAddCropOpen} 
        onClose={() => setIsAddCropOpen(false)} 
        farmId={farmId} 
      />
      <CreateSeasonModal 
        isOpen={isCreateSeasonOpen} 
        onClose={() => setIsCreateSeasonOpen(false)} 
        farmId={farmId} 
        farm={farm}
        remainingArea={remainingArea}
        usedArea={usedActiveArea}
      />

      <EditSeasonModal
        isOpen={isEditSeasonOpen}
        onClose={() => {
          setIsEditSeasonOpen(false);
          setSeasonToEdit(null);
        }}
        farmId={farmId}
        farm={farm}
        season={seasonToEdit}
        maxArea={(() => {
          if (!farm || !seasonToEdit) return null;
          const usedExceptThis = usedActiveArea - (seasonToEdit.status === 'active' ? (Number(seasonToEdit.area) || 0) : 0);
          return Math.max(0, (Number(farm.size) || 0) - usedExceptThis);
        })()}
      />
      <LogActivityModal 
        isOpen={isLogActivityOpen} 
        onClose={() => setIsLogActivityOpen(false)} 
        farmId={farmId} 
        farm={farm}
      />

      <EditFarmModal
        isOpen={isEditFarmOpen}
        onClose={() => setIsEditFarmOpen(false)}
        farm={farm}
      />

      <PracticesInventoryModal 
        isOpen={isPracticesInventoryOpen} 
        onClose={() => setIsPracticesInventoryOpen(false)} 
        activities={activities} 
        farm={farm}
        farmId={farmId}
      />

      <CompleteActivityModal
        isOpen={isCompleteActivityOpen}
        onClose={() => {
          setIsCompleteActivityOpen(false);
          setActivityToComplete(null);
        }}
        activity={activityToComplete}
        farmId={farmId}
      />
    </div>
  );
};

export default FarmDetailsPage;
