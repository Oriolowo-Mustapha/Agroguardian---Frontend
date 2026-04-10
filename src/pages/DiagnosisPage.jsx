// Build: 2026-04-01-1800
import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
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
  X,
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
    resolved: { label: 'Resolved', icon: CheckCircle2, className: 'bg-green-50 text-green-600' }
  };
  const config = configs[status] || configs.processing;
  const Icon = config.icon;
  return (
    <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase ${config.className}`}>
      <Icon className="h-3 w-3" />
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
  const config = configs[category] || { icon: Info, color: 'text-gray-600', bg: 'bg-gray-50' };
  return (
    <div className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-tighter ${config.bg} ${config.color}`}>
      <config.icon className="h-2 w-2" /> {category || 'General'}
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

  const { data: diagnoses, isLoading: isLoadingDiagnoses } = useQuery({
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

  if (isLoadingFarms || (farmId && isLoadingDiagnoses)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 text-center">
        <RefreshCw className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-medium">Analyzing field history...</p>
      </div>
    );
  }

  const reports = diagnoses || [];
  const selectedFarm = (farms || []).find(f => f._id === farmId);

  return (
    <div className="space-y-8 pb-12 animate-in fade-in duration-500">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 w-full lg:w-auto">
          <div className="flex items-center gap-4">
            <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
              <Stethoscope className="text-white h-8 w-8" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-gray-900 tracking-tighter">AI Crop Surgeon</h1>
              <p className="text-gray-500 mt-1 flex items-center gap-2 font-medium">
                <MapPin className="h-4 w-4 text-primary" />
                {selectedFarm ? `${selectedFarm.location.city}, ${selectedFarm.location.country}` : 'Select a farm...'}
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
              className="block w-full pl-12 pr-10 py-3 text-base font-bold text-gray-900 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:ring-2 focus:ring-primary appearance-none cursor-pointer transition-all hover:bg-white hover:shadow-md"
            >
              {!farmId && <option value="" disabled>Choose an asset...</option>}
              {farms?.map(farm => <option key={farm._id} value={farm._id}>{farm.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          <Button onClick={() => setIsScannerOpen(true)} className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-black shadow-lg bg-primary hover:scale-105 transition-transform">
            <Camera className="mr-2 h-5 w-5" /> Scan Crop
          </Button>
          <Button onClick={() => setIsConsultationOpen(true)} disabled={!farmId} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-black border-indigo-200 text-indigo-600 hover:bg-indigo-50 hover:scale-105 transition-transform">
            <Bot className="mr-2 h-5 w-5" /> Ask AI
          </Button>
          <Button onClick={goBack} variant="outline" className="flex-1 lg:flex-none rounded-2xl px-6 h-14 font-bold border-gray-200 hover:bg-gray-50">
             <ArrowLeft className="mr-2 h-4 w-4" /> Portfolio
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">Intelligence History</h3>
          {reports.length > 0 ? (
            <div className="space-y-4">
              {reports.map((report) => (
                <Card key={report._id} className="border-none shadow-sm hover:shadow-xl transition-all rounded-[2.5rem] overflow-hidden group">
                  <CardContent className="p-0">
                    <div className="flex flex-col md:flex-row">
                      <div className="w-full md:w-48 h-48 md:h-auto relative bg-gray-100">
                        <img src={report.imageUrls?.[0] || report.imageUrl} alt={report.cropType} className="w-full h-full object-cover" />
                        {report.imageUrls?.length > 1 && (
                          <div className="absolute bottom-2 right-2 bg-black/60 backdrop-blur-md px-2 py-1 rounded-lg text-[10px] font-black text-white flex items-center gap-1">
                            <ImageIcon className="h-3 w-3" /> +{report.imageUrls.length - 1}
                          </div>
                        )}
                        <div className="absolute top-4 left-4"><SeverityBadge level={report.severity} /></div>
                      </div>
                      <div className="flex-1 p-6 md:p-8">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">{report.cropType}</span>
                              {report.urgency && (
                                <span className={`px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider ${
                                  report.urgency === 'immediate' ? 'bg-red-100 text-red-700 animate-pulse' :
                                  report.urgency === 'within_24h' ? 'bg-amber-100 text-amber-700' :
                                  report.urgency === 'within_week' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                                }`}>{report.urgency?.replace('_', ' ')}</span>
                              )}
                            </div>
                            <h4 className="text-2xl font-black text-gray-900 tracking-tight mb-2">{report.diagnosis}</h4>
                            <div className="flex items-center gap-2">
                              <StatusBadge status={report.status} />
                              {report.spreadRisk === 'high' && (
                                <span className="px-2 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wider bg-rose-100 text-rose-700">⚠️ High Spread Risk</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-2xl font-black text-gray-900">{report.confidence}%</span>
                            <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Confidence</span>
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
                              <div className="bg-red-50 border border-red-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                <AlertCircle className="h-3 w-3 text-red-600 flex-shrink-0" />
                                <p className="text-[10px] font-bold text-red-700 truncate">{report.criticalWarning}</p>
                              </div>
                            )}
                            {report.lowConfidenceWarning && (
                              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 flex items-center gap-2">
                                <AlertTriangle className="h-3 w-3 text-amber-600 flex-shrink-0" />
                                <p className="text-[10px] font-bold text-amber-700 truncate">{report.lowConfidenceWarning}</p>
                              </div>
                            )}
                          </div>
                        )}
                        <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50">
                          <Button onClick={() => setSelectedReport(report)} variant="ghost" size="sm" className="rounded-xl font-bold text-gray-500 hover:text-indigo-600">
                            <Info className="h-4 w-4 mr-2" /> Details
                          </Button>
                          <Button onClick={() => setTreatmentReport(report)} variant="ghost" size="sm" className="rounded-xl font-bold text-gray-500 hover:text-indigo-600">
                            <ClipboardCheck className="h-4 w-4 mr-2" /> Treatment Plan
                          </Button>
                          <Button onClick={() => { setSelectedReport(report); setIsChatOpen(true); }} variant="ghost" size="sm" className="rounded-xl font-bold text-gray-500 hover:text-indigo-600">
                            <MessageSquare className="h-4 w-4 mr-2" /> Consult AI
                          </Button>
                          <div className="flex-1" />
                          <Button onClick={() => setSelectedReport(report)} variant="outline" size="sm" className="rounded-xl font-black uppercase text-[10px] tracking-widest border-gray-100 group-hover:bg-primary group-hover:text-white">
                            Full Report <ChevronRight className="h-3 w-3 ml-1" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-gray-100">
              <Stethoscope className="h-16 w-16 text-gray-200 mx-auto mb-6" />
              <h3 className="text-2xl font-black text-gray-900 mb-2">No Reports Found</h3>
              <Button onClick={() => setIsScannerOpen(true)} className="rounded-2xl h-14 px-8 font-black mt-4">Launch Scanner</Button>
            </div>
          )}
        </div>

        <div className="space-y-8">
          <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-600 text-white overflow-hidden p-8">
            <CardHeader className="p-0 mb-6"><CardTitle className="text-xs font-black uppercase tracking-widest text-indigo-100">AI Surgeon Stats</CardTitle></CardHeader>
            <div className="grid grid-cols-2 gap-6">
              <div><span className="block text-3xl font-black">{reports.length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Total Scans</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.status === 'resolved').length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Resolved</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.urgency === 'immediate' || d.urgency === 'within_24h').length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">Urgent</span></div>
              <div><span className="block text-3xl font-black">{reports.filter(d => d.severity === 'critical' || d.severity === 'high').length}</span><span className="text-[10px] font-bold text-indigo-100 uppercase tracking-wider">High Risk</span></div>
            </div>
          </Card>
          
          {/* Urgency Overview */}
          {reports.some(r => r.urgency === 'immediate') && (
            <Card className="border-none shadow-sm rounded-[2.5rem] bg-red-50 border-2 border-red-200 p-6">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 rounded-xl bg-red-100">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <h4 className="text-xs font-black text-red-800 uppercase tracking-widest">Immediate Attention</h4>
              </div>
              <div className="space-y-2">
                {reports.filter(r => r.urgency === 'immediate').slice(0, 3).map(r => (
                  <div key={r._id} onClick={() => setSelectedReport(r)} className="bg-white p-3 rounded-xl border border-red-100 cursor-pointer hover:bg-red-50 transition-colors">
                    <p className="text-sm font-bold text-gray-900">{r.diagnosis}</p>
                    <p className="text-[10px] text-gray-500">{r.cropType}</p>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Quick AI Consultation Card */}
          <Card className="border-none shadow-sm rounded-[2.5rem] bg-gradient-to-br from-purple-50 to-indigo-50 border border-indigo-100 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-indigo-100">
                <Bot className="h-5 w-5 text-indigo-600" />
              </div>
              <div>
                <h4 className="text-xs font-black text-indigo-800 uppercase tracking-widest">AI Agronomist</h4>
                <p className="text-[10px] text-indigo-600 mt-0.5">24/7 Crop Consultation</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 mb-4">
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
              <MessageSquare className="mr-2 h-4 w-4" /> New Consultation
            </Button>
          </Card>

          {/* Past Consultations */}
          {consultations.length > 0 && (
            <Card className="border-none shadow-sm rounded-[2.5rem] p-6">
              <div className="flex items-center justify-between mb-4">
                <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Past Consultations</h4>
                <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
                  {consultations.length}
                </span>
              </div>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {consultations.slice(0, 10).map((consultation) => (
                  <div 
                    key={consultation._id}
                    onClick={() => {
                      setSelectedConsultationId(consultation._id);
                      setIsConsultationOpen(true);
                    }}
                    className="p-3 bg-gray-50 hover:bg-indigo-50 rounded-xl cursor-pointer transition-colors group border border-transparent hover:border-indigo-100"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-900 truncate">
                          {consultation.title || consultation.cropName}
                        </p>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[10px] text-gray-500">
                            {consultation.cropName}
                          </span>
                          {consultation.issueType && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              consultation.issueType === 'disease' ? 'bg-red-100 text-red-600' :
                              consultation.issueType === 'pest' ? 'bg-amber-100 text-amber-600' :
                              consultation.issueType === 'nutrient' ? 'bg-green-100 text-green-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {consultation.issueType}
                            </span>
                          )}
                          {consultation.severity && (
                            <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                              consultation.severity === 'critical' ? 'bg-red-500 text-white' :
                              consultation.severity === 'high' ? 'bg-orange-500 text-white' :
                              consultation.severity === 'medium' ? 'bg-amber-100 text-amber-600' :
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {consultation.severity}
                            </span>
                          )}
                          <span className={`text-[8px] font-bold px-1.5 py-0.5 rounded-full ${
                            consultation.status === 'resolved' ? 'bg-green-100 text-green-600' :
                            consultation.status === 'archived' ? 'bg-gray-200 text-gray-500' :
                            'bg-blue-100 text-blue-600'
                          }`}>
                            {consultation.status === 'resolved' ? '✓ Resolved' : 
                             consultation.status === 'archived' ? 'Archived' : 'Active'}
                          </span>
                        </div>
                      </div>
                      <ChevronRight className="h-4 w-4 text-gray-300 group-hover:text-indigo-500 flex-shrink-0 mt-1" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(consultation.updatedAt).toLocaleDateString()} • {consultation.messages?.length || 0} messages
                    </p>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>

      {/* Intelligence Details Modal */}
      {selectedReport && !isChatOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-4xl bg-white rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 max-h-[90vh] flex flex-col">
            <div className="relative h-64 flex-shrink-0 bg-gray-900">
              <div className="flex h-full overflow-x-auto snap-x snap-mandatory hide-scrollbar">
                {(selectedReport.imageUrls || [selectedReport.imageUrl]).map((url, i) => (
                  <img key={i} src={url} alt={`Scan ${i+1}`} className="h-full w-full object-cover flex-shrink-0 snap-center" />
                ))}
              </div>
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex items-end p-8 pointer-events-none">
                <div>
                  <div className="flex items-center gap-3 mb-2"><SeverityBadge level={selectedReport.severity} /><StatusBadge status={selectedReport.status} /></div>
                  <h2 className="text-3xl font-black text-white tracking-tight">{selectedReport.diagnosis}</h2>
                  <p className="text-white/70 text-sm font-bold mt-1">{selectedReport.confidence}% confidence • {selectedReport.cropType}</p>
                </div>
              </div>
              <button onClick={() => setSelectedReport(null)} className="absolute top-6 right-6 p-2 rounded-full bg-black/40 hover:bg-black/60 text-white pointer-events-auto"><X /></button>
            </div>
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Warnings Section */}
              {(selectedReport.lowConfidenceWarning || selectedReport.criticalWarning) && (
                <div className="space-y-2">
                  {selectedReport.criticalWarning && (
                    <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-red-800">{selectedReport.criticalWarning}</p>
                    </div>
                  )}
                  {selectedReport.lowConfidenceWarning && (
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
                      <p className="text-sm font-bold text-amber-800">{selectedReport.lowConfidenceWarning}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Quick Stats Row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {selectedReport.urgency && (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Urgency</p>
                    <p className={`text-sm font-black ${
                      selectedReport.urgency === 'immediate' ? 'text-red-600' :
                      selectedReport.urgency === 'within_24h' ? 'text-amber-600' : 'text-green-600'
                    }`}>{selectedReport.urgency?.replace('_', ' ')}</p>
                  </div>
                )}
                {selectedReport.spreadRisk && (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Spread Risk</p>
                    <p className={`text-sm font-black ${
                      selectedReport.spreadRisk === 'high' ? 'text-red-600' :
                      selectedReport.spreadRisk === 'medium' ? 'text-amber-600' : 'text-green-600'
                    }`}>{selectedReport.spreadRisk}</p>
                  </div>
                )}
                {selectedReport.affectedArea && (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Affected</p>
                    <p className="text-sm font-black text-gray-700">{selectedReport.affectedArea}</p>
                  </div>
                )}
                {selectedReport.imageQuality && (
                  <div className="bg-gray-50 rounded-2xl p-4 text-center">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Image Quality</p>
                    <p className={`text-sm font-black ${
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
                        <p className="text-xs"><span className="font-black text-red-600">Without treatment:</span> <span className="text-gray-700">{selectedReport.yieldImpact.withoutTreatment}</span></p>
                        <p className="text-xs"><span className="font-black text-green-600">With treatment:</span> <span className="text-gray-700">{selectedReport.yieldImpact.withTreatment}</span></p>
                        {selectedReport.yieldImpact.economicBenefit && (
                          <p className="text-xs font-bold text-blue-700 mt-2">💡 {selectedReport.yieldImpact.economicBenefit}</p>
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
                      <p className="text-xs text-gray-700"><span className="font-black">Best conditions:</span> {selectedReport.weatherConsiderations.optimalSprayConditions}</p>
                    )}
                    {selectedReport.weatherConsiderations.rainWarning && (
                      <p className="text-xs text-amber-700 font-bold">⚠️ {selectedReport.weatherConsiderations.rainWarning}</p>
                    )}
                    {selectedReport.weatherConsiderations.temperatureRange && (
                      <p className="text-xs text-gray-700"><span className="font-black">Temperature:</span> {selectedReport.weatherConsiderations.temperatureRange}</p>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><AlertCircle className="h-4 w-4 text-amber-500" /> Key Observations</h4>
                    <ul className="space-y-2">{selectedReport.symptoms?.map((s, i) => <li key={i} className="text-sm font-bold text-gray-700 bg-gray-50 p-3 rounded-xl border border-gray-100">{s}</li>)}</ul>
                  </div>
                  <div><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" /> Treatment Advice</h4>
                    <ul className="space-y-2">{selectedReport.treatment?.map((t, i) => <li key={i} className="text-sm font-bold text-gray-800 bg-green-50/50 p-3 rounded-xl border border-green-100/50">{t}</li>)}</ul>
                  </div>
                </div>
                <div className="space-y-4">
                  <div><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-green-500" /> Prevention Tips</h4>
                    <ul className="space-y-2">{selectedReport.prevention?.map((p, i) => <li key={i} className="text-sm font-bold text-gray-700 bg-green-50/30 p-3 rounded-xl border border-green-100/50">{p}</li>)}</ul>
                  </div>
                  {/* Local Remedies */}
                  {selectedReport.localRemedies?.length > 0 && (
                    <div><h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3 flex items-center gap-2">🌿 Local/Traditional Remedies</h4>
                      <ul className="space-y-2">{selectedReport.localRemedies.map((r, i) => <li key={i} className="text-sm font-bold text-gray-700 bg-amber-50/50 p-3 rounded-xl border border-amber-100/50">{r}</li>)}</ul>
                    </div>
                  )}
                  {/* Similar Cases */}
                  {selectedReport.similarCases && (
                    <div className="bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                      <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-2">📊 Similar Cases</h4>
                      <p className="text-sm text-indigo-800">{selectedReport.similarCases}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex gap-4">
              <Button onClick={() => { setSelectedReport(null); setTreatmentReport(selectedReport); }} className="flex-1 rounded-2xl h-12 font-black shadow-lg">Open Treatment Checklist</Button>
              <Button onClick={() => { setSelectedReport(null); setIsChatOpen(true); setTreatmentReport(selectedReport); }} variant="outline" className="flex-1 rounded-2xl h-12 font-black">Ask AI Advisor</Button>
              <Button onClick={() => setSelectedReport(null)} variant="ghost" className="px-6 rounded-2xl h-12 font-black">Close</Button>
            </div>
          </Card>
        </div>
      )}

      {/* Actionable Treatment Hub Modal */}
      {treatmentReport && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-indigo-600 p-8 text-white relative">
              <button onClick={() => setTreatmentReport(null)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20"><X /></button>
              <div className="flex items-center gap-4 mb-4">
                <div className="bg-white/20 p-2.5 rounded-xl"><ClipboardCheck className="h-6 w-6" /></div>
                <div>
                  <h3 className="text-2xl font-black tracking-tight">Interactive Recovery Hub</h3>
                  <p className="text-indigo-100 text-sm font-medium">{treatmentReport.diagnosis} Protocol</p>
                </div>
              </div>
              
              <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <StatusBadge status={treatmentReport.status} />
                  <span className="text-[10px] font-black uppercase tracking-widest text-indigo-100">Cure Progress</span>
                </div>
                <div className="text-right">
                  <span className="block text-xl font-black">
                    {Math.round((treatmentReport.treatmentPlan?.filter(t => t.isCompleted).length / treatmentReport.treatmentPlan?.length) * 100) || 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="p-8 overflow-y-auto max-h-[50vh] space-y-6">
              {/* Weather Considerations Banner */}
              {treatmentReport.weatherConsiderations && (
                <div className="bg-sky-50 p-5 rounded-2xl border border-sky-100">
                  <h4 className="text-[10px] font-black text-sky-600 uppercase tracking-widest mb-3 flex items-center gap-2">
                    🌤️ Weather Advisory for Treatment
                  </h4>
                  <div className="space-y-2 text-sm">
                    {treatmentReport.weatherConsiderations.optimalSprayConditions && (
                      <p className="text-gray-700"><span className="font-bold text-sky-700">Best conditions:</span> {treatmentReport.weatherConsiderations.optimalSprayConditions}</p>
                    )}
                    {treatmentReport.weatherConsiderations.rainWarning && (
                      <p className="text-amber-700 font-bold">⚠️ {treatmentReport.weatherConsiderations.rainWarning}</p>
                    )}
                    {treatmentReport.weatherConsiderations.temperatureRange && (
                      <p className="text-gray-700"><span className="font-bold text-sky-700">Temperature:</span> {treatmentReport.weatherConsiderations.temperatureRange}</p>
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
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2 flex items-center gap-2">
                  <Zap className="h-3 w-3" /> Integrated Control Checklist
                </h4>
                {treatmentReport.treatmentPlan?.map((step, i) => (
                  <div key={i} className={`flex items-center gap-4 p-5 rounded-[2rem] border transition-all ${step.isCompleted ? 'bg-green-50/50 border-green-100 opacity-75' : 'bg-gray-50/50 border-gray-100'}`}>
                    <button 
                      onClick={() => toggleTaskMutation.mutate(step._id)}
                      disabled={toggleTaskMutation.isPending}
                      className={`h-8 w-8 rounded-xl border-2 flex items-center justify-center transition-all ${step.isCompleted ? 'bg-green-500 border-green-500 text-white' : 'bg-white border-gray-200 hover:border-primary'}`}
                    >
                      {step.isCompleted && <CheckCircle2 className="h-5 w-5" />}
                    </button>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-black ${step.isCompleted ? 'text-green-800 line-through' : 'text-gray-900'}`}>{step.task}</p>
                        {step.category && <CategoryBadge category={step.category} />}
                      </div>
                      <p className={`text-[10px] font-bold uppercase tracking-widest ${step.isCompleted ? 'text-green-400' : 'text-gray-400'}`}>{step.timeframe}</p>
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
                      <li key={i} className="text-sm text-amber-900 bg-white p-3 rounded-xl border border-amber-100">{remedy}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="bg-indigo-50 p-6 rounded-3xl border border-indigo-100">
                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-4">Official Case Status</h4>
                <div className="flex gap-2">
                  {['detected', 'treating', 'resolved'].map((s) => (
                    <Button 
                      key={s}
                      onClick={() => updateStatusMutation.mutate(s)}
                      disabled={updateStatusMutation.isPending || treatmentReport.status === s}
                      variant={treatmentReport.status === s ? 'default' : 'outline'}
                      className="flex-1 rounded-2xl text-[10px] font-black uppercase h-12"
                    >
                      Mark as {s}
                    </Button>
                  ))}
                </div>
              </div>
            </div>

            <div className="p-8 border-t border-gray-100 bg-gray-50/50 flex gap-4">
              <Button onClick={() => handleOpenChat(treatmentReport)} className="flex-1 rounded-2xl h-14 font-black shadow-lg">
                <MessageSquare className="mr-2" /> Follow-up Consultation
              </Button>
              <Button onClick={() => setTreatmentReport(null)} variant="outline" className="px-8 rounded-2xl h-14 font-black text-gray-500">Close Hub</Button>
            </div>
          </Card>
        </div>
      )}

      {/* AI Chat Sidebar */}
      {isChatOpen && (selectedReport || treatmentReport) && (
        <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-md bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
          <div className="bg-indigo-600 p-6 text-white flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-3"><div className="bg-white/20 p-2 rounded-xl"><MessageSquare /></div><div><h3 className="font-black tracking-tight">Agronomist AI</h3><p className="text-[10px] text-indigo-100 uppercase tracking-widest">Case: {(selectedReport || treatmentReport).diagnosis}</p></div></div>
            <button onClick={() => setIsChatOpen(false)} className="p-2 hover:bg-white/10 rounded-full"><X /></button>
          </div>
          <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-gray-50/50">
            <div className="bg-white border border-indigo-100 p-4 rounded-3xl text-sm font-bold text-indigo-900 shadow-sm mb-6">Hello! I'm your AI Agronomist. Based on your current farm weather and soil, how can I help you implement the cure?</div>
            {chatHistory?.messages?.map((msg, i) => <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}><div className={`max-w-[85%] p-4 rounded-3xl text-sm font-bold ${msg.role === 'user' ? 'bg-indigo-600 text-white rounded-tr-none' : 'bg-white border border-gray-100 text-gray-800 rounded-tl-none shadow-sm'}`}>{msg.content}</div></div>)}
            {sendChatMutation.isPending && <div className="flex justify-start"><div className="bg-white border border-gray-100 p-4 rounded-3xl rounded-tl-none animate-pulse flex items-center gap-2"><RefreshCw className="h-3 w-3 animate-spin text-indigo-600" /><span className="text-[10px] font-black text-gray-400 uppercase">AI is typing...</span></div></div>}
          </div>
          <form onSubmit={handleSendMessage} className="p-6 border-t border-gray-100 bg-white flex-shrink-0">
            <div className="flex gap-2">
              <Input value={chatMessage} onChange={(e) => setChatMessage(e.target.value)} placeholder="Ask about dosages..." className="flex-1 h-12 rounded-xl bg-gray-50" />
              <Button disabled={!chatMessage.trim() || sendChatMutation.isPending} className="h-12 w-12 rounded-xl bg-indigo-600 shadow-lg"><Zap className="h-5 w-5 fill-current" /></Button>
            </div>
          </form>
        </div>
      )}

      {isScannerOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-gray-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-2xl bg-white rounded-[3rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="bg-indigo-600 p-8 text-white relative">
              <button onClick={() => setIsScannerOpen(false)} className="absolute top-6 right-6 p-2 rounded-full bg-white/10 hover:bg-white/20"><X /></button>
              <div className="flex items-center gap-4 mb-2"><div className="bg-white/20 p-2.5 rounded-xl"><Camera className="h-6 w-6" /></div><h3 className="text-2xl font-black tracking-tight">Intelligence Multi-Scanner</h3></div>
              <p className="text-indigo-100 font-medium">Upload up to 5 clear photos for maximum precision.</p>
            </div>
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {previews.map((url, i) => (
                  <div key={i} className="relative h-24 rounded-2xl overflow-hidden border border-gray-100 group">
                    <img src={url} alt="Preview" className="w-full h-full object-cover" />
                    <button onClick={() => removeImage(i)} className="absolute top-1 right-1 p-1 rounded-full bg-black/50 text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="h-3 w-3" /></button>
                  </div>
                ))}
                {previews.length < 5 && (
                  <label className="h-24 rounded-2xl border-2 border-dashed border-gray-200 bg-gray-50 flex flex-col items-center justify-center cursor-pointer hover:bg-gray-100">
                    <Plus className="h-6 w-6 text-indigo-400" /><span className="text-[10px] font-black text-gray-400 uppercase mt-1">Add Image</span>
                    <input type="file" className="hidden" accept="image/*" multiple onChange={handleImageChange} />
                  </label>
                )}
              </div>
              <div className="space-y-4">
                <div className="space-y-2"><label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Crop Variety</label>
                  <select value={selectedCrop} onChange={(e) => setSelectedCrop(e.target.value)} className="w-full h-14 rounded-2xl border-gray-100 bg-gray-50 px-6 font-bold text-gray-900 focus:ring-2 focus:ring-primary outline-none appearance-none">
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
              <div className="flex gap-4 pt-4">
                <Button onClick={() => setIsScannerOpen(false)} variant="outline" className="flex-1 rounded-2xl h-14 font-black">Cancel</Button>
                <Button onClick={handleStartScan} disabled={imageFiles.length === 0 || !selectedCrop || diagnoseMutation.isPending} className="flex-1 rounded-2xl h-14 font-black shadow-lg">
                  {diagnoseMutation.isPending ? <><RefreshCw className="mr-2 h-5 w-5 animate-spin" /> Initiating...</> : <><Zap className="mr-2 h-5 w-5 fill-current" /> Analyze Health</>}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}

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
