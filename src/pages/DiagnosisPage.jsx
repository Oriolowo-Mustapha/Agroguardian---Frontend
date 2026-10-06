// Build: 2026-04-01-1800
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { 
  Stethoscope,
  RefreshCw,
  MapPin,
  ArrowLeft,
  Sprout,
  AlertCircle,
  CheckCircle2,
  Clock,
  ChevronRight,
  MessageSquare,
  AlertTriangle,
  Info,
  Camera,
  Zap,
  ShieldCheck,
  Image as ImageIcon,
  Plus,
  ClipboardCheck,
  Leaf,
  Bug,
  FlaskConical,
  Bot
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from '../components/ui/ModalShell';
import { LoadingState, ErrorState, EmptyState } from '../components/ui/States';
import ConsultationChat from '../components/ConsultationChat';

const SeverityBadge = ({ level }) => {
  const colors = {
    low: "bg-blue-100 text-blue-700 border-blue-200",
    medium: "bg-amber-100 text-amber-700 border-amber-200",
    high: "bg-orange-100 text-orange-700 border-orange-200",
    critical: "bg-red-100 text-red-700 border-red-200"
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${colors[level || 'low']}`}>
      {level || 'low'}
    </span>
  );
};

const StatusBadge = ({ status }) => {
  const configs = {
    processing: { label: 'Analyzing', icon: RefreshCw, className: 'bg-blue-50 text-blue-600 animate-spin' },
    detected: { label: 'Detected', icon: AlertTriangle, className: 'bg-amber-50 text-amber-600' },
    treating: { label: 'Treating', icon: Clock, className: 'bg-indigo-50 text-indigo-600' },
    resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-green-50 text-green-600' },
    failed: { label: 'Failed', icon: AlertTriangle, className: 'bg-red-50 text-red-600' },
  };
  const config = configs[status] || configs.processing;
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${config.className}`}>
      <Icon className="h-3 w-3" aria-hidden="true" />
      {config.label}
    </div>
  );
};

const CategoryBadge = ({ category }) => {
  const configs = {
    'Cultural': { icon: Leaf, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    'Biological': { icon: Bug, color: 'text-amber-600', bg: 'bg-amber-50' },
    'Chemical': { icon: FlaskConical, color: 'text-rose-600', bg: 'bg-rose-50' }
  };
  const config = configs[category] || { icon: Info, color: 'text-muted-foreground', bg: 'bg-muted' };
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-tighter ${config.bg} ${config.color}`}>
      <config.icon className="h-2 w-2" aria-hidden="true" /> {category || 'General'}
    </div>
  );
};

const DiagnosisPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const [isScannerOpen, setIsScannerOpen] = React.useState(false);
  const [selectedCrop, setSelectedCrop] = React.useState('');
  const [imageFiles, setImageFiles] = React.useState([]);
  const [previews, setPreviews] = React.useState([]);
  
  const [selectedReport, setSelectedReport] = React.useState(null);
  const [treatmentReport, setTreatmentReport] = React.useState(null);
  const [isChatOpen, setIsChatOpen] = React.useState(false);
  const [chatMessage, setChatMessage] = React.useState('');
  
  // Consultation state
  const [isConsultationOpen, setIsConsultationOpen] = React.useState(false);
  const [selectedConsultationId, setSelectedConsultationId] = React.useState(null);
  
  const queryClient = useQueryClient();
  const goBack = useNavigateBack('/dashboard');
  const navigate = useNavigate();

  const { data: farms, isLoading: isLoadingFarms } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data || [];
    }
  });

  // Fetch crops for the selected farm
  const { data: farmCrops = [] } = useQuery({
    queryKey: ['farm-crops', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/crops`);
      return response.data.data || [];
    },
    enabled: !!farmId
  });

  // Fetch seasons for the selected farm
  const { data: farmSeasons = [] } = useQuery({
    queryKey: ['farm-seasons', farmId],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${farmId}/seasons`);
      return response.data.data || [];
    },
    enabled: !!farmId
  });

  // Fetch past consultations for the farm
  const { data: consultations = [] } = useQuery({
    queryKey: ['consultations', farmId],
    queryFn: async () => {
      const response = await api.get(`/consultations/farm/${farmId}`);
      return response.data.data || [];
    },
    enabled: !!farmId
  });

  const { data: diagnoses, isLoading: isLoadingDiagnoses, isError: isErrorDiagnoses, refetch: refetchDiagnoses } = useQuery({
    queryKey: ['diagnoses', farmId],
    queryFn: async () => {
      const response = await api.get(`/diagnosis/farm/${farmId}`);
      return response.data.data || [];
    },
    enabled: !!farmId,
    refetchInterval: (data) => {
      if (data && Array.isArray(data)) {
        return data.some(d => d.status === 'processing') ? 3000 : false;
      }
      return false;
    },
    retry: 1
  });

  const { data: chatHistory } = useQuery({
    queryKey: ['chat', selectedReport?._id || treatmentReport?._id],
    queryFn: async () => {
      const reportId = selectedReport?._id || treatmentReport?._id;
      const response = await api.get(`/diagnosis/${reportId}/chat`);
      return response.data.data;
    },
    enabled: (!!selectedReport || !!treatmentReport) && isChatOpen,
  });

  const diagnoseMutation = useMutation({
    mutationFn: async (formData) => {
      const response = await api.post('/diagnosis', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['diagnoses', farmId]);
      setIsScannerOpen(false);
      setImageFiles([]);
      setPreviews([]);
      setSelectedCrop('');
    }
  });

  const sendChatMutation = useMutation({
    mutationFn: async (message) => {
      const reportId = selectedReport?._id || treatmentReport?._id;
      const response = await api.post(`/diagnosis/${reportId}/chat`, { message });
      return response.data.data;
    },
    onSuccess: () => {
      const reportId = selectedReport?._id || treatmentReport?._id;
      queryClient.invalidateQueries(['chat', reportId]);
      setChatMessage('');
    }
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const reportId = selectedReport?._id || treatmentReport?._id;
      const response = await api.patch(`/diagnosis/${reportId}/status`, { status });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['diagnoses', farmId]);
      if (selectedReport) setSelectedReport(data);
      if (treatmentReport) setTreatmentReport(data);
    }
  });

  const toggleTaskMutation = useMutation({
    mutationFn: async (taskId) => {
      const response = await api.patch(`/diagnosis/${treatmentReport._id}/task/${taskId}/toggle`);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['diagnoses', farmId]);
      setTreatmentReport(data);
    }
  });

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + imageFiles.length > 5) {
      alert('Maximum 5 images allowed per diagnosis');
      return;
    }
    setImageFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(prev => [...prev, ...newPreviews]);
  };

  const removeImage = (index) => {
    setImageFiles(prev => prev.filter((_, i) => i !== index));
    setPreviews(prev => prev.filter((_, i) => i !== index));
  };

  const handleStartScan = async () => {
    if (imageFiles.length === 0 || !selectedCrop || !farmId) return;
    const formData = new FormData();
    imageFiles.forEach(file => formData.append('images', file));
    formData.append('farmId', farmId);
    formData.append('cropType', selectedCrop);
    diagnoseMutation.mutate(formData);
  };

  const handleOpenChat = (report) => {
    if (selectedReport) setSelectedReport(report);
    if (treatmentReport) setTreatmentReport(report);
    setIsChatOpen(true);
  };

  const handleSendMessage = (e) => {
    e.preventDefault();
    if (!chatMessage.trim() || sendChatMutation.isPending) return;
    sendChatMutation.mutate(chatMessage);
  };

  React.useEffect(() => {
    if (farms?.length > 0 && !farmId) {
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farms, farmId, setSearchParams]);

  React.useEffect(() => {
    if (!isChatOpen) return;
    const handleEsc = (event) => {
      if (event.key === 'Escape') setIsChatOpen(false);
    };
    document.addEventListener('keydown', handleEsc);
    return () => document.removeEventListener('keydown', handleEsc);
  }, [isChatOpen]);

  if (isLoadingFarms || (farmId && isLoadingDiagnoses)) {
    return <LoadingState label="Analyzing field history..." className="min-h-[60vh]" />;
  }

  if (isErrorDiagnoses) {
    return (
      <ErrorState
        className="min-h-[60vh]"
        title="Couldn't load your scan history"
        message="Something went wrong while fetching diagnosis reports. Please try again."
        onRetry={() => refetchDiagnoses()}
      />
    );
  }

  const reports = diagnoses || [];
  const selectedFarm = (farms || []).find(f => f._id === farmId);
  const cureProgress =
    Math.round(
      ((treatmentReport?.treatmentPlan?.filter((t) => t.isCompleted).length || 0) /
        (treatmentReport?.treatmentPlan?.length || 1)) *
        100
    ) || 0;

  return (
    <div className="space-y-8 pb-12 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-card p-5 sm:p-8 rounded-[2.5rem] border border-border shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4 min-w-0">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200 shrink-0">
              <Stethoscope className="text-white h-8 w-8" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-2xl sm:text-3xl font-black text-foreground tracking-tighter break-words">AI Crop Surgeon</h1>
              <p className="text-muted-foreground mt-1 flex items-center gap-2 font-medium text-sm">
                <MapPin className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
                <span className="min-w-0 break-words">{selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.country}` : 'Select a farm...'}</span>
              </p>
            </div>
          </div>
          <div className="h-12 w-px bg-border hidden sm:block" />
          <div className="relative group w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
              <Sprout className="h-5 w-5 text-green-600" aria-hidden="true" />
            </div>
            <select 
              value={farmId || ''} 
              onChange={(e) => setSearchParams({ farmId: e.target.value })}
              aria-label="Select farm"
              className="block w-full pl-12 pr-10 py-3 text-base font-bold text-foreground bg-muted border border-border rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer transition-all hover:bg-card hover:shadow-md"
            >
              {!farmId && <option value="" disabled>Choose an asset...</option>}
              {farms?.map(farm => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 sm:gap-3 w-full lg:w-auto">
          <Button onClick={() => setIsScannerOpen(true)} className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-black shadow-lg bg-primary hover:scale-105 transition-transform">
            <Camera className="mr-2 h-5 w-5" aria-hidden="true" /> Scan Crop
          </Button>
          <Button onClick={() => setIsConsultationOpen(true)} disabled={!farmId} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:scale-105 transition-transform">
            <Bot className="mr-2 h-5 w-5" aria-hidden="true" /> Ask AI
          </Button>
          <Button
            onClick={() => navigate(farmId ? `/crop-consultation?farmId=${farmId}` : '/crop-consultation')}
            variant="outline"
            aria-label="View all consultations"
            className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:scale-105 transition-transform"
          >
            <MessageSquare className="mr-2 h-5 w-5" aria-hidden="true" /> Consultations
          </Button>
          <Button onClick={goBack} variant="outline" aria-label="Back to portfolio" className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-bold border-border hover:bg-muted">
             <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" /> Portfolio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-foreground uppercase tracking-tight">Intelligence History</h3>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report._id} className="border-none shadow-sm hover:shadow-xl transition-all rounded-[2.5rem] overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-48 h-48 md:h-auto relative bg-muted">
                        <img src={report.imageUrls?.[0] || report.imageUrl} alt={report.cropType} className="w-full h-full object-cover" />
                        {report.imageUrls?.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" aria-hidden="true" /> +{report.imageUrls.length - 1}
                          </div>
                        )}
                        <div className="absolute top-4 left-4"><SeverityBadge level={report.severity} /></div>
                      </div>
                      <div className="flex-1 p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{report.cropType}</span>
                              {report.urgency && report.status !== 'resolved' && (
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  report.urgency === 'immediate' ? 'bg-red-100 text-red-700 animate-pulse' :
                                  report.urgency === 'within_24h' ? 'bg-amber-100 text-amber-700' :
                                  report.urgency === 'within_week' ? 'bg-blue-100 text-blue-700' : 'bg-muted text-muted-foreground'
                                }`}>{report.urgency?.replace('_', ' ')}</span>
                              )}
                            </div>
                            <h4 className="text-xl sm:text-2xl font-black text-foreground tracking-tight mb-2 break-words">{report.diagnosis}</h4>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={report.status} />
                              {report.spreadRisk === 'high' && report.status !== 'resolved' && (
                                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">⚠️ High Spread Risk</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span
                              className="text-2xl font-black text-foreground"
                              role="progressbar"
                              aria-label={`Confidence ${report.confidence}%`}
                              aria-valuenow={report.confidence}
                              aria-valuemin={0}
                              aria-valuemax={100}
                            >
                              {report.confidence}%
                            </span>
                            <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Confidence</span>
                            {report.totalEstimatedCost && (
                              <span className="block text-[10px] font-bold text-green-600 mt-1">
                                💰 {report.totalEstimatedCost.currency} {report.totalEstimatedCost.min?.toLocaleString()}-{report.totalEstimatedCost.max?.toLocaleString()}
                              </span>
                            )}
                          </div>
                        </div>
                        {/* Warnings Banner */}
                        {(report.lowConfidenceWarning || report.criticalWarning) && (
                          <div className="mb-3 space-y-1">
                            {report.criticalWarning && (
                              <div role="alert" className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-start gap-2">
                                <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <p className="text-[10px] font-bold text-red-700 break-words">{report.criticalWarning}</p>
                              </div>
                            )}
                            {report.lowConfidenceWarning && (
                              <div role="status" className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-start gap-2">
                                <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                                <p className="text-[10px] font-bold text-amber-700 break-words">{report.lowConfidenceWarning}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-border">
                          <Button onClick={() => setSelectedReport(report)} variant="ghost" size="sm" className="rounded-xl font-bold text-muted-foreground hover:text-indigo-600">
                            <Info className="h-4 w-4 mr-2" aria-hidden="true" /> Details
                          </Button>
                          <Button onClick={() => setTreatmentReport(report)} variant="ghost" size="sm" className="rounded-xl font-bold text-muted-foreground hover:text-indigo-600">
                            <ClipboardCheck className="h-4 w-4 mr-2" aria-hidden="true" /> Treatment Plan
                          </Button>
                          <Button onClick={() => { setSelectedReport(report); setIsChatOpen(true); }} variant="ghost" size="sm" className="rounded-xl font-bold text-muted-foreground hover:text-indigo-600">
                            <MessageSquare className="h-4 w-4 mr-2" aria-hidden="true" /> Consult AI
                          </Button>
                          <div className="flex-1" />
                          <Button onClick={() => setSelectedReport(report)} variant="outline" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest border-border group-hover:bg-primary group-hover:text-white">
                            Full Report <ChevronRight className="h-3 w-3 ml-1" aria-hidden="true" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              className="py-24"
              icon={<Stethoscope className="h-8 w-8" aria-hidden="true" />}
              title="No Reports Found"
              description="Scan a crop photo to get your first AI diagnosis."
              action={
                <Button onClick={() => setIsScannerOpen(true)} className="rounded-2xl h-14 px-8 font-black mt-2">
                  Launch Scanner
                </Button>
              }
            />
          )}
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-600 text-white overflow-hidden p-8">
            <CardHeader className="p-0 mb-6"><CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-100">AI Surgeon Stats</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-6">
              <div><span className="block text-3xl font-black">{reports.length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Total Scans</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.status === 'resolved').length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Resolved</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.status !== 'resolved' && (d.urgency === 'immediate' || d.urgency === 'within_24h')).length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Urgent</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.status !== 'resolved' && (d.severity === 'critical' || d.severity === 'high')).length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">High Risk</span></div>
            </div>
          </Card>
          
          {/* Urgency Overview */}
          {reports.some(r => r.status !== 'resolved' && r.urgency === 'immediate') && (
            <Card className="border-none shadow-sm rounded-[2.5rem] bg-red-50 border-2 border-red-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" aria-hidden="true" />
                </div>
                <h4 className="text-xs font-black text-red-800 uppercase tracking-widest">Immediate Attention</h4>
              </div>
              <div className="space-y-2">
                {reports.filter(r => r.status !== 'resolved' && r.urgency === 'immediate').slice(0, 3).map(r => (
                  <button
                    key={r._id}
                    type="button"
                    onClick={() => setSelectedReport(r)}
                    className="w-full text-left bg-card p-3 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <p className="text-sm font-bold text-foreground break-words">{r.diagnosis}</p>
                    <p className="text-[10px] text-muted-foreground">{r.cropType}</p>
                  </button>
                ))}
              </div>
            </Card>
          )}

          {/* Quick AI Consultation Card */}
          <Card className="border-none shadow-sm rounded-[2.5rem] bg-gradient-to-br from-purple-50 to-indigo-50 border border-indigo-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-100">
                <Bot className="h-5 w-5 text-indigo-600" aria-hidden="true" />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest">AI Agronomist</h4>
                <p className="text-[10px] text-indigo-600 mt-0.5">24/7 Crop Consultation</p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Have a concern? Chat with our AI and share images for instant advice on diseases, pests, nutrients, and more.
            </p>
            <Button 
              onClick={() => {
                setSelectedConsultationId(null);
                setIsConsultationOpen(true);
              }} 
              disabled={!farmId}
              className="w-full rounded-xl h-12 font-black bg-indigo-600 hover:bg-indigo-700"
            >
              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" /> New Consultation
            </Button>

            <Button
              onClick={() => navigate(farmId ? `/crop-consultation?farmId=${farmId}` : '/crop-consultation')}
              variant="outline"
              className="w-full rounded-xl h-12 font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 mt-3"
            >
              <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" /> View All Chats
            </Button>
          </Card>

          {/* Past Consultations */}
          {consultations.length > 0 && (
            <Card className="border-none shadow-sm rounded-[2.5rem] p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest">Past Consultations</h4>
                <div className="flex items-center gap-2">
                  <Link
                    to={farmId ? `/crop-consultation?farmId=${farmId}` : '/crop-consultation'}
                    className="text-[10px] font-bold text-indigo-600 hover:underline"
                  >
                    View all
                  </Link>
                  <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                    {consultations.length}
                  </span>
                </div>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {consultations.slice(0, 10).map((consultation) => (
                  <button 
                    type="button"
                    key={consultation._id}
                    onClick={() => {
                      setSelectedConsultationId(consultation._id);
                      setIsConsultationOpen(true);
                    }}
                    className="w-full text-left p-3 bg-muted hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-foreground break-words">
                          {consultation.title || consultation.cropName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-muted-foreground">
                            {consultation.cropName}
                          </span>
                          {consultation.issueType && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              consultation.issueType === 'disease' ? 'bg-red-100 text-red-600' :
                              consultation.issueType === 'pest' ? 'bg-amber-100 text-amber-600' :
                              consultation.issueType === 'nutrient' ? 'bg-green-100 text-green-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {consultation.issueType}
                            </span>
                          )}
                          {consultation.severity && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                              consultation.severity === 'critical' ? 'bg-red-500 text-white' :
                              consultation.severity === 'high' ? 'bg-orange-500 text-white' :
                              consultation.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                              'bg-muted text-muted-foreground'
                            }`}>
                              {consultation.severity}
                            </span>
                          )}
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            consultation.status === 'resolved' ? 'bg-green-100 text-green-600' :
                            consultation.status === 'archived' ? 'bg-muted text-muted-foreground' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {consultation.status === 'resolved' ? '✓ Resolved' : 
                             consultation.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-border group-hover:text-indigo-500 flex-shrink-0 mt-1" aria-hidden="true" />
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {new Date(consultation.updatedAt).toLocaleDateString()} • {consultation.messages?.length || 0} messages
                    </p>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Intelligence Details Modal */}
      {selectedReport && !isChatOpen && (
        <ModalShell
          open={true}
          onClose={() => setSelectedReport(null)}
          size="xl"
          title={selectedReport.diagnosis}
          description={`${selectedReport.confidence}% confidence • ${selectedReport.cropType}`}
          footer={
            <>
              <Button onClick={() => { setSelectedReport(null); setTreatmentReport(selectedReport); }} className="w-full sm:flex-1 rounded-2xl h-12 font-black shadow-lg">Open Treatment Checklist</Button>
              <Button onClick={() => { setSelectedReport(null); setIsChatOpen(true); setTreatmentReport(selectedReport); }} variant="outline" className="w-full sm:flex-1 rounded-2xl h-12 font-black">Ask AI Advisor</Button>
              <Button onClick={() => setSelectedReport(null)} variant="ghost" className="px-6 rounded-2xl h-12 font-black">Close</Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="relative h-64 flex-shrink-0 bg-gray-900 rounded-3xl overflow-hidden">
              <div className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {(selectedReport.imageUrls || [selectedReport.imageUrl]).map((url, i) => (
                  <img key={i} src={url} alt={`Scan ${i+1}`} className="h-full w-full object-cover flex-shrink-0 snap-center" />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-6 pointer-events-none">
                <div className="flex items-center gap-3"><SeverityBadge level={selectedReport.severity} /><StatusBadge status={selectedReport.status} /></div>
              </div>
            </div>
            <div className="space-y-6">
              {/* Warnings Section */}
              {(selectedReport.lowConfidenceWarning || selectedReport.criticalWarning) && (
                <div className="space-y-2">
                  {selectedReport.criticalWarning && (
                    <div role="alert" className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm font-bold text-red-800 break-words">{selectedReport.criticalWarning}</p>
                    </div>
                  )}
                  {selectedReport.lowConfidenceWarning && (
                    <div role="status" className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <p className="text-sm font-bold text-amber-800 break-words">{selectedReport.lowConfidenceWarning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedReport.urgency && (
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Urgency</p>
                    <p className={`text-sm font-black break-words ${
                      selectedReport.urgency === 'immediate' ? 'text-red-600' :
                      selectedReport.urgency === 'within_24h' ? 'text-amber-600' : 'text-green-600'
                    }`}>{selectedReport.urgency?.replace('_', ' ')}</p>
                  </div>
                )}
                {selectedReport.spreadRisk && (
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Spread Risk</p>
                    <p className={`text-sm font-black break-words ${
                      selectedReport.spreadRisk === 'high' ? 'text-red-600' :
                      selectedReport.spreadRisk === 'medium' ? 'text-amber-600' : 'text-green-600'
                    }`}>{selectedReport.spreadRisk}</p>
                  </div>
                )}
                {selectedReport.affectedArea && (
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Affected</p>
                    <p className="text-sm font-black text-foreground break-words">{selectedReport.affectedArea}</p>
                  </div>
                )}
                {selectedReport.imageQuality && (
                  <div className="bg-muted rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Image Quality</p>
                    <p className={`text-sm font-black break-words ${
                      selectedReport.imageQuality === 'good' ? 'text-green-600' :
                      selectedReport.imageQuality === 'fair' ? 'text-amber-600' : 'text-red-600'
                    }`}>{selectedReport.imageQuality}</p>
                  </div>
                )}
              </div>

              {/* Cost & Impact Section */}
              {(selectedReport.totalEstimatedCost || selectedReport.yieldImpact) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedReport.totalEstimatedCost && (
                    <div className="bg-green-50 rounded-2xl p-5 border border-green-100">
                      <h4 className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        💰 Estimated Treatment Cost
                      </h4>
                      <p className="text-2xl font-black text-green-800">
                        {selectedReport.totalEstimatedCost.currency} {selectedReport.totalEstimatedCost.min?.toLocaleString()} - {selectedReport.totalEstimatedCost.max?.toLocaleString()}
                      </p>
                      {selectedReport.totalEstimatedCost.notes && (
                        <p className="text-xs text-green-600 mt-2">{selectedReport.totalEstimatedCost.notes}</p>
                      )}
                    </div>
                  )}
                  {selectedReport.yieldImpact && (
                    <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100">
                      <h4 className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                        📊 Yield Impact
                      </h4>
                      <div className="space-y-1">
                        <p className="text-xs break-words"><span className="font-black text-red-600">Without treatment:</span> <span className="text-foreground">{selectedReport.yieldImpact.withoutTreatment}</span></p>
                        <p className="text-xs break-words"><span className="font-black text-green-600">With treatment:</span> <span className="text-foreground">{selectedReport.yieldImpact.withTreatment}</span></p>
                        {selectedReport.yieldImpact.economicBenefit && (
                          <p className="text-xs font-bold text-blue-700 mt-2 break-words">💡 {selectedReport.yieldImpact.economicBenefit}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Weather Considerations */}
              {selectedReport.weatherConsiderations && (
                <div className="bg-sky-50 rounded-2xl p-5 border border-sky-100">
                  <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    🌤️ Weather Considerations for Treatment
                  </h4>
                  <div className="space-y-2">
                    {selectedReport.weatherConsiderations.optimalSprayConditions && (
                      <p className="text-xs text-foreground break-words"><span className="font-black">Best conditions:</span> {selectedReport.weatherConsiderations.optimalSprayConditions}</p>
                    )}
                    {selectedReport.weatherConsiderations.rainWarning && (
                      <p className="text-xs text-amber-700 font-bold break-words">⚠️ {selectedReport.weatherConsiderations.rainWarning}</p>
                    )}
                    {selectedReport.weatherConsiderations.temperatureRange && (
                      <p className="text-xs text-foreground break-words"><span className="font-black">Temperature:</span> {selectedReport.weatherConsiderations.temperatureRange}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" aria-hidden="true" /> Key Observations</h4>
                    <ul className="space-y-2">{selectedReport.symptoms?.map((s, i) => <li key={i} className="text-sm font-bold text-foreground bg-muted p-3 rounded-xl border border-border break-words">{s}</li>)}</ul>
                  </div>
                  <div><h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" aria-hidden="true" /> Treatment Advice</h4>
                    <ul className="space-y-2">{selectedReport.treatment?.map((t, i) => <li key={i} className="text-sm font-bold text-foreground bg-green-50/50 p-3 rounded-xl border border-green-100/50 break-words">{t}</li>)}</ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div><h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" aria-hidden="true" /> Prevention Tips</h4>
                    <ul className="space-y-2">{selectedReport.prevention?.map((p, i) => <li key={i} className="text-sm font-bold text-foreground bg-green-50/30 p-3 rounded-xl border border-green-100/50 break-words">{p}</li>)}</ul>
                  </div>
                  {/* Local Remedies */}
                  {selectedReport.localRemedies?.length > 0 && (
                    <div><h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-3 flex items-center gap-2">🌿 Local/Traditional Remedies</h4>
                      <ul className="space-y-2">{selectedReport.localRemedies.map((r, i) => <li key={i} className="text-sm font-bold text-foreground bg-amber-50/50 p-3 rounded-xl border border-amber-100/50 break-words">{r}</li>)}</ul>
                    </div>
                  )}
                  {/* Similar Cases */}
                  {selectedReport.similarCases && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">📊 Similar Cases</h4>
                      <p className="text-sm text-indigo-800 break-words">{selectedReport.similarCases}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </ModalShell>
      )}

      {/* Actionable Treatment Hub Modal */}
      {treatmentReport && (
        <ModalShell
          open={true}
          onClose={() => setTreatmentReport(null)}
          size="lg"
          title="Interactive Recovery Hub"
          description={`${treatmentReport.diagnosis} Protocol`}
          footer={
            <>
              <Button onClick={() => handleOpenChat(treatmentReport)} className="w-full sm:flex-1 rounded-2xl h-14 font-black shadow-lg">
                <MessageSquare className="mr-2" aria-hidden="true" /> Follow-up Consultation
              </Button>
              <Button onClick={() => setTreatmentReport(null)} variant="outline" className="w-full sm:px-8 sm:w-auto rounded-2xl h-14 font-black">Close Hub</Button>
            </>
          }
        >
          <div className="space-y-6">
            <div className="bg-indigo-600/10 rounded-2xl p-4 flex items-center justify-between border border-indigo-200/50">
              <div className="flex items-center gap-3">
                <StatusBadge status={treatmentReport.status} />
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Cure Progress</span>
              </div>
              <div className="text-right">
                <span
                  className="block text-xl font-black"
                  role="progressbar"
                  aria-label="Cure progress"
                  aria-valuenow={cureProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {cureProgress}%
                </span>
              </div>
            </div>
            </div>

            <div className="space-y-6">
              {/* Weather Considerations Banner */}
              {treatmentReport.weatherConsiderations && (
                <div className="bg-sky-50 p-5 rounded-2xl border border-sky-100">
                  <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    🌤️ Weather Advisory for Treatment
                  </h4>
                  <div className="space-y-2 text-sm">
                    {treatmentReport.weatherConsiderations.optimalSprayConditions && (
                      <p className="text-muted-foreground break-words"><span className="font-bold text-sky-700">Best conditions:</span> {treatmentReport.weatherConsiderations.optimalSprayConditions}</p>
                    )}
                    {treatmentReport.weatherConsiderations.rainWarning && (
                      <p className="text-amber-700 font-bold">⚠️ {treatmentReport.weatherConsiderations.rainWarning}</p>
                    )}
                    {treatmentReport.weatherConsiderations.temperatureRange && (
                      <p className="text-muted-foreground break-words"><span className="font-bold text-sky-700">Temperature:</span> {treatmentReport.weatherConsiderations.temperatureRange}</p>
                    )}
                  </div>
                </div>
              )}

              {/* Cost & Yield Quick Stats */}
              {(treatmentReport.totalEstimatedCost || treatmentReport.yieldImpact) && (
                <div className="grid grid-cols-2 gap-3">
                  {treatmentReport.totalEstimatedCost && (
                    <div className="bg-green-50 p-4 rounded-2xl border border-green-100 text-center">
                      <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-1">Est. Cost</p>
                      <p className="text-lg font-black text-green-800">
                        {treatmentReport.totalEstimatedCost.currency} {treatmentReport.totalEstimatedCost.min?.toLocaleString()}-{treatmentReport.totalEstimatedCost.max?.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {treatmentReport.yieldImpact?.economicBenefit && (
                    <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100 text-center">
                      <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-1">Benefit</p>
                      <p className="text-xs font-bold text-blue-800">{treatmentReport.yieldImpact.economicBenefit}</p>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-3">
                <h4 className="text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Zap className="h-3 w-3" aria-hidden="true" /> Integrated Control Checklist
                </h4>
                {treatmentReport.treatmentPlan?.map((step, i) => (
                  <div key={i} className={`flex flex-wrap items-center gap-4 p-5 rounded-[2rem] border transition-all ${step.isCompleted ? 'bg-green-50/50 border-green-100 opacity-75' : 'bg-muted/50 border-border'}`}>
                    <button 
                      type="button"
                      onClick={() => toggleTaskMutation.mutate(step._id)}
                      disabled={toggleTaskMutation.isPending || treatmentReport.status === 'resolved'}
                      aria-pressed={step.isCompleted}
                      aria-label={`${step.isCompleted ? 'Mark incomplete' : 'Mark complete'}: ${step.task}`}
                      className={`h-8 w-8 rounded-xl border-2 flex items-center justify-center transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${step.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-card border-border hover:border-primary'}`}
                    >
                      {step.isCompleted && <CheckCircle2 className="h-5 w-5" aria-hidden="true" />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                        <p className={`text-sm font-black break-words ${step.isCompleted ? 'text-green-800 line-through' : 'text-foreground'}`}>{step.task}</p>
                        {step.category && <CategoryBadge category={step.category} />}
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${step.isCompleted ? 'text-green-700' : 'text-muted-foreground'}`}>{step.timeframe}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Local Remedies Section */}
              {treatmentReport.localRemedies?.length > 0 && (
                <div className="bg-amber-50/50 p-5 rounded-2xl border border-amber-100">
                  <h4 className="text-[10px] font-black text-amber-600 uppercase tracking-widest mb-3">🌿 Local/Traditional Alternatives</h4>
                  <ul className="space-y-2">
                    {treatmentReport.localRemedies.map((remedy, i) => (
                      <li key={i} className="text-sm text-amber-900 bg-card p-3 rounded-xl border border-amber-100 break-words">{remedy}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">Case Status</h4>
                <p className="text-xs font-bold text-indigo-700 mb-4 break-words">
                  Status updates automatically: <span className="font-black">Detected</span> → <span className="font-black">Treating</span> when you tick any checklist item. Mark as resolved only when the crop has fully recovered.
                </p>

                {treatmentReport.status !== 'resolved' ? (
                  <Button
                    onClick={() => updateStatusMutation.mutate('resolved')}
                    disabled={updateStatusMutation.isPending || treatmentReport.status === 'processing'}
                    loading={updateStatusMutation.isPending}
                    className="w-full rounded-2xl text-xs font-black uppercase h-12"
                  >
                    Mark as resolved
                  </Button>
                ) : (
                  <div role="status" className="text-xs font-black text-green-700 bg-green-50 border border-green-100 rounded-2xl p-3 text-center">
                    ✓ This case is resolved
                  </div>
                )}
              </div>
            </div>
        </ModalShell>
      )}

      {/* AI Chat Sidebar */}
      {isChatOpen && (selectedReport || treatmentReport) && (
        <div role="dialog" aria-modal="true" aria-label="AI Agronomist chat" className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-card shadow-2xl flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:fade-in motion-safe:duration-300">
          <div className="bg-primary p-6 text-primary-foreground flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><MessageSquare aria-hidden="true" /></div><div><h3 className="font-black tracking-tight">Agronomist AI</h3><p className="text-[10px] text-primary-foreground/80 uppercase tracking-widest break-words">Case: {(selectedReport || treatmentReport).diagnosis}</p></div></div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full" aria-label="Close chat"><span aria-hidden="true">✕</span></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-muted/50">
            <div className="bg-card border border-indigo-100 p-4 rounded-3xl text-sm font-bold text-indigo-900 shadow-sm break-words mb-6">Hello! I'm your AI Agronomist. Based on your current farm weather and soil, how can I help you implement the cure?</div>
            {chatHistory?.messages?.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold break-words whitespace-pre-wrap ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-card border border-border text-foreground rounded-tl-none shadow-sm'}`}>{msg.content}</div></div>)}
            {sendChatMutation.isPending && <div role="status" className="flex justify-start"><div className="bg-card border border-border p-4 rounded-3xl rounded-tl-none animate-pulse flex items-center gap-2"><RefreshCw className="h-3 w-3 animate-spin text-indigo-600" aria-hidden="true" /><span className="text-[10px] font-black text-muted-foreground uppercase">AI is typing...</span></div></div>}
          </div>
          <form onSubmit={handleSendMessage} className="p-6 border-t border-border bg-card flex-shrink-0">
            <div className="flex gap-2">
              <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Ask about dosages..." aria-label="Message the AI Agronomist" className="flex-1 h-12 rounded-xl bg-muted" />
              <Button type="submit" disabled={!chatMessage.trim() || sendChatMutation.isPending} loading={sendChatMutation.isPending} aria-label="Send message" className="h-12 w-12 rounded-xl bg-indigo-600 shadow-lg"><Zap className="h-5 w-5 fill-current" aria-hidden="true" /></Button>
            </div>
          </form>
        </div>
      )}

      <ModalShell
        open={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        size="lg"
        title="Intelligence Multi-Scanner"
        description="Upload up to 5 clear photos for maximum precision."
        icon={<Camera className="h-6 w-6 text-primary" />}
        footer={
          <>
            <Button onClick={() => setIsScannerOpen(false)} variant="outline" className="w-full sm:w-auto flex-1 rounded-2xl h-14 font-black">Cancel</Button>
            <Button onClick={handleStartScan} disabled={imageFiles.length === 0 || !selectedCrop || diagnoseMutation.isPending} loading={diagnoseMutation.isPending} className="w-full sm:w-auto flex-1 rounded-2xl h-14 font-black shadow-lg">
              <Zap className="mr-2 h-5 w-5 fill-current" aria-hidden="true" /> Analyze Health
            </Button>
          </>
        }
      >
        <div className="space-y-8">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {previews.map((url, i) => (
              <div key={i} className="relative h-24 rounded-2xl overflow-hidden border border-border group">
                <img src={url} alt={`Preview ${i+1}`} className="w-full h-full object-cover" />
                <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" aria-label="Remove image">
                  <span aria-hidden="true">✕</span>
                </button>
              </div>
            ))}
            {previews.length < 5 && (
              <label className="h-24 rounded-2xl border-2 border-dashed border-border bg-muted flex flex-col items-center justify-center cursor-pointer hover:bg-muted/80">
                <Plus className="h-6 w-6 text-muted-foreground" aria-hidden="true" /><span className="text-[10px] font-black text-muted-foreground uppercase mt-1">Add Image</span>
                <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} aria-label="Add images" />
              </label>
            )}
          </div>
          <div className="space-y-4">
            <div className="space-y-2"><label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-2" htmlFor="crop-variety">Crop Variety</label>
              <select id="crop-variety" value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)} className="w-full h-14 rounded-2xl border-border bg-muted px-6 font-bold text-foreground focus:ring-2 focus:ring-primary outline-none appearance-none text-base">
                <option value="" disabled>Select from collection...</option>
                {selectedFarm?.crops?.map(crop => {
                  const cropName = typeof crop === 'string' ? crop : crop.name;
                  const cropKey = typeof crop === 'string' ? crop : crop._id;
                  return <option key={cropKey} value={cropName}>{cropName}</option>;
                })}
                <option value="Other">Other Pathogen/Crop</option>
              </select>
            </div>
          </div>
        </div>
      </ModalShell>

      {/* AI Consultation Chat */}
      <ConsultationChat
        farmId={farmId}
        crops={farmCrops}
        seasons={farmSeasons}
        isOpen={isConsultationOpen}
        onClose={() => {
          setIsConsultationOpen(false);
          setSelectedConsultationId(null);
        }}
        existingConsultationId={selectedConsultationId}
      />
    </div>
  );
};

export default DiagnosisPage;
