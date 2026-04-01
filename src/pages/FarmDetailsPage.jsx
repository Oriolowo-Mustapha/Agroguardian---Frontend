import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  MapPin, 
  Droplets, 
  Sprout, 
  Calendar, 
  ArrowLeft,
  Settings,
  Edit2,
  Trash2,
  AlertCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  X,
  Clock,
  Zap,
  Scaling,
  ChevronRight,
  ClipboardList
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import AddCropModal from '../components/AddCropModal';
import CreateSeasonModal from '../components/CreateSeasonModal';
import LogActivityModal from '../components/LogActivityModal';
import PracticesInventoryModal from '../components/PracticesInventoryModal';

const FarmDetailsPage = () => {
  const { farmId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Modal states
  const [isAddCropOpen, setIsAddCropOpen] = React.useState(false);
  const [isCreateSeasonOpen, setIsCreateSeasonOpen] = React.useState(false);
  const [isLogActivityOpen, setIsLogActivityOpen] = React.useState(false);
  const [isPracticesInventoryOpen, setIsPracticesInventoryOpen] = React.useState(false);

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

  const deleteFarmMutation = useMutation({
    mutationFn: async () => {
      await api.delete(`/farms/${farmId}`);
    },
    onSuccess: () => {
      navigate('/farms');
    }
  });

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this farm? This action cannot be undone.')) {
      deleteFarmMutation.mutate();
    }
  };

  if (isLoadingFarm) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <RefreshCw className="h-12 w-12 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Retrieving farm records...</p>
      </div>
    );
  }

  if (farmError || !farm) {
    return (
      <div className="text-center py-20 bg-white rounded-3xl border border-gray-100 shadow-sm max-w-2xl mx-auto mt-12">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
        <h3 className="text-2xl font-bold text-gray-900 mb-2">Record Not Found</h3>
        <p className="text-gray-500 mb-8">This farm asset may have been moved or deleted.</p>
        <Button asChild className="rounded-2xl h-12 px-8 font-bold">
          <Link to="/farms">Return to Portfolio</Link>
        </Button>
      </div>
    );
  }

  const risks = riskReport?.risk;
  const resilienceScore = resilience?.overallScore || 0;

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Navigation & Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" asChild className="pl-0 hover:bg-transparent text-gray-500 hover:text-primary group">
          <Link to="/farms" className="flex items-center gap-2 font-bold">
            <ArrowLeft className="h-5 w-5 group-hover:-translate-x-1 transition-transform" />
            Back to Portfolio
          </Link>
        </Button>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => setIsLogActivityOpen(true)} className="rounded-xl font-black bg-indigo-600 shadow-lg shadow-indigo-100 h-12 px-6">
            <Zap className="h-4 w-4 mr-2 fill-current" />
            Log Practice
          </Button>
          <Button variant="outline" className="rounded-xl border-gray-200 font-bold hover:bg-gray-50 h-12 px-6">
            <Edit2 className="h-4 w-4 mr-2 text-primary" />
            Edit Profile
          </Button>
          <Button 
            onClick={handleDelete}
            disabled={deleteFarmMutation.isPending}
            variant="outline" 
            className="rounded-xl border-gray-200 text-red-500 hover:bg-red-50 hover:text-red-600 font-bold h-12 px-6"
          >
            {deleteFarmMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 mr-2" />}
            Decommission
          </Button>
        </div>
      </div>

      {/* Hero Header */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden relative group">
            <div className="flex flex-col md:flex-row gap-8 items-start">
              <div className="h-56 w-full md:w-64 rounded-3xl bg-gray-50 overflow-hidden flex-shrink-0 ring-8 ring-gray-50/50">
                {farm.imageUrl && farm.imageUrl.length > 0 ? (
                  <img src={farm.imageUrl[0]} alt={farm.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-primary/5">
                    <Sprout className="h-16 w-16 text-primary/20" />
                  </div>
                )}
              </div>
              <div className="flex-1 space-y-6">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="bg-green-100 text-green-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-green-200 flex items-center gap-1.5">
                      <div className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                      Active Asset
                    </span>
                    <span className="text-sm text-gray-400 font-bold flex items-center gap-1.5">
                      <Calendar className="h-4 w-4" />
                      {farm.establishedDate ? new Date(farm.establishedDate).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : 'N/A'}
                    </span>
                    <span className="bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-full border border-indigo-100">
                        {farm.climateZone || 'Detecting...'}
                    </span>
                  </div>
                  <h1 className="text-4xl font-black text-gray-900 tracking-tighter mb-3">{farm.name}</h1>
                  <p className="text-gray-500 font-medium leading-relaxed text-lg">{farm.description || 'Strategically managed agricultural asset under AgroGuardian AI oversight.'}</p>
                </div>
                
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 text-sm font-bold text-gray-700 bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100">
                    <MapPin className="h-4 w-4 text-primary" />
                    {farm.location.city}, {farm.location.state}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Collection & Inventory Section */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                        <Sprout className="h-4 w-4 text-green-500" />
                        Registered Crops
                    </CardTitle>
                    <button 
                        onClick={() => setIsAddCropOpen(true)}
                        className="h-8 w-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center hover:bg-primary transition-colors hover:text-white"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </CardHeader>
                <CardContent className="p-8">
                    {farmCrops?.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                            {farmCrops.map((crop) => (
                                <div key={crop._id} className="bg-green-50/50 border border-green-100 px-4 py-2 rounded-2xl flex items-center gap-2 group">
                                    <span className="text-xs font-black text-green-700">{crop.name}</span>
                                    <span className="text-[8px] font-black bg-white px-2 py-0.5 rounded-full text-green-400 uppercase tracking-tighter border border-green-50">
                                        {crop.category}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-gray-400">No crops registered yet.</p>
                            <Button variant="link" onClick={() => setIsAddCropOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto">
                                Add First Crop
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
                <CardHeader className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-blue-500" />
                        Active Seasons
                    </CardTitle>
                    <button 
                        onClick={() => setIsCreateSeasonOpen(true)}
                        className="h-8 w-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 transition-colors hover:text-white"
                    >
                        <Plus className="h-4 w-4" />
                    </button>
                </CardHeader>
                <CardContent className="p-8">
                    {seasons?.filter(s => s.status === 'active').length > 0 ? (
                        <div className="space-y-4">
                            {seasons.filter(s => s.status === 'active').map((season) => (
                                <div key={season._id} className="flex items-center justify-between p-4 bg-blue-50/30 rounded-2xl border border-blue-100/50">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-blue-600 shadow-sm">
                                            <Sprout className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="text-sm font-black text-gray-900">{season.cropId?.name}</p>
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                                {season.area} {season.areaUnit} • Planted {new Date(season.plantedDate).toLocaleDateString()}
                                            </p>
                                        </div>
                                    </div>
                                    <Link to={`/weather?farmId=${farmId}`} className="text-blue-600 hover:text-blue-700">
                                        <ChevronRight className="h-5 w-5" />
                                    </Link>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-6">
                            <p className="text-xs font-bold text-gray-400">No active seasons found.</p>
                            <Button variant="link" onClick={() => setIsCreateSeasonOpen(true)} className="text-[10px] font-black uppercase tracking-widest text-primary p-0 h-auto">
                                Initiate Season
                            </Button>
                        </div>
                    )}
                </CardContent>
            </Card>
          </div>

          {/* Infrastructure & Activity Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] p-8">
              <CardHeader className="p-0 mb-6">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                  <Droplets className="h-4 w-4 text-blue-500" />
                  Technical Infrastructure
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 space-y-5">
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-bold text-gray-500">Irrigation System</span>
                  <span className="text-sm font-black text-gray-900 uppercase tracking-wide">{farm.irrigationType}</span>
                </div>
                <div className="flex justify-between items-center py-3 border-b border-gray-50">
                  <span className="text-sm font-bold text-gray-500">Soil Segment(s)</span>
                  <div className="flex flex-wrap justify-end gap-1">
                    {farm.soilType?.map(s => (
                        <span key={s} className="text-[10px] font-black bg-gray-50 px-2 py-1 rounded-lg uppercase border border-gray-100">{s}</span>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between items-center py-3">
                  <span className="text-sm font-bold text-gray-500">Managed Area</span>
                  <span className="text-sm font-black text-gray-900 uppercase tracking-wide">{farm.size} {farm.sizeUnit}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-[2.5rem] p-8">
                <CardHeader className="p-0 mb-6">
                    <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center gap-2">
                    <ClipboardList className="h-4 w-4 text-indigo-500" />
                    Recent Activity
                    </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                    <div className="space-y-4">
                        {activities?.slice(0, 3).map((activity) => (
                            <div key={activity._id} className="flex gap-4 items-center">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                                    <Zap className="h-5 w-5 fill-current" />
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-black text-gray-900 truncate">{activity.practiceId?.name}</p>
                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                        {new Date(activity.startDate).toLocaleDateString()} • {activity.size} {farm.sizeUnit}
                                    </p>
                                </div>
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                            </div>
                        ))}
                        {(!activities || activities.length === 0) && (
                            <div className="text-center py-4">
                                <p className="text-[10px] font-bold text-gray-400 uppercase">No recent activity</p>
                            </div>
                        )}
                        <Button 
                            onClick={() => setIsPracticesInventoryOpen(true)}
                            variant="link" 
                            className="w-full text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline pt-2"
                        >
                            View Implementation Registry <ArrowLeft className="h-3 w-3 ml-1 rotate-180" />
                        </Button>
                    </div>
                </CardContent>
            </Card>
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-8">
            <Card className="border-none shadow-sm rounded-[2.5rem] p-8 flex flex-col items-center justify-center text-center">
              <CardHeader className="p-0 mb-6 w-full">
                <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-gray-400 flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-green-500" />
                  Resilience Index
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <div className="relative inline-flex items-center justify-center mb-4">
                  <svg className="h-32 w-32 transform -rotate-90">
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-gray-100" />
                    <circle cx="64" cy="64" r="58" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={364.42} strokeDashoffset={364.42 - (364.42 * resilienceScore) / 100} strokeLinecap="round" className="text-green-500 transition-all duration-1000 ease-out" />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-3xl font-black text-gray-900">{resilienceScore}%</span>
                  </div>
                </div>
                <Button asChild variant="link" className="text-[10px] font-black uppercase tracking-widest text-primary hover:no-underline">
                  <Link to={`/resilience?farmId=${farmId}`}>View Full Audit <ArrowLeft className="h-3 w-3 ml-1 rotate-180" /></Link>
                </Button>
              </CardContent>
            </Card>

          <Card className="border-none shadow-xl bg-gradient-to-br from-green-600 to-green-800 text-white rounded-[2.5rem] p-8 relative overflow-hidden">
            <div className="absolute top-0 right-0 p-8 opacity-10">
              <AlertCircle className="h-32 w-32 rotate-12" />
            </div>
            <CardHeader className="p-0 mb-6">
              <CardTitle className="text-xs font-black uppercase tracking-[0.2em] text-green-100">Climate Monitoring</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-8 relative z-10">
              <div className="bg-white/10 backdrop-blur-md p-6 rounded-3xl border border-white/20">
                <p className="text-[10px] font-black text-green-200 uppercase tracking-widest mb-2">Live Severity</p>
                <div className="flex items-center gap-3">
                  <p className="text-3xl font-black tracking-tight capitalize">{risks?.notes ? 'Alert Active' : 'Low Risk'}</p>
                  <div className={`h-3 w-3 rounded-full ${risks?.notes ? 'bg-amber-400 animate-pulse' : 'bg-green-400'}`} />
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
      />
      <LogActivityModal 
        isOpen={isLogActivityOpen} 
        onClose={() => setIsLogActivityOpen(false)} 
        farmId={farmId} 
        farm={farm}
      />
      <PracticesInventoryModal 
        isOpen={isPracticesInventoryOpen} 
        onClose={() => setIsPracticesInventoryOpen(false)} 
        activities={activities} 
        farm={farm}
      />
    </div>
  );
};

export default FarmDetailsPage;
