import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  X,
  Send,
  Upload,
  Loader2,
  MessageSquare,
  Image as ImageIcon,
  ChevronLeft,
  AlertCircle,
  Leaf,
  Bug,
  Droplets,
  CloudRain,
  HelpCircle,
  CheckCircle2,
  Trash2
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from './ui/Button';

const issueTypeConfig = {
  disease: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Disease' },
  pest: { icon: Bug, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pest' },
  nutrient: { icon: Leaf, color: 'text-green-600', bg: 'bg-green-50', label: 'Nutrient' },
  weather: { icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Weather' },
  general: { icon: HelpCircle, color: 'text-gray-600', bg: 'bg-gray-50', label: 'General' },
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2`}>
      <div className={`max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`p-4 rounded-2xl ${
          isUser 
            ? 'bg-indigo-600 text-white rounded-br-md' 
            : 'bg-white border border-gray-100 text-gray-800 rounded-bl-md shadow-sm'
        }`}>
          {/* Message images */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {message.imageUrls.map((url, i) => (
                <img
                  key={i}
                  src={url}
                  alt={`Attached ${i + 1}`}
                  className="h-24 w-24 object-cover rounded-xl flex-shrink-0 cursor-pointer hover:opacity-80 transition-opacity"
                  onClick={() => window.open(url, '_blank')}
                />
              ))}
            </div>
          )}
          <p className={`text-sm whitespace-pre-wrap ${isUser ? 'text-white' : 'text-gray-800'}`}>
            {message.content}
          </p>
        </div>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'} text-gray-400`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

const ImagePreview = ({ images, onRemove }) => {
  if (images.length === 0) return null;
  
  return (
    <div className="flex gap-2 p-3 bg-gray-50 rounded-xl overflow-x-auto">
      {images.map((img, i) => (
        <div key={i} className="relative flex-shrink-0 group">
          <img
            src={URL.createObjectURL(img)}
            alt={`Preview ${i + 1}`}
            className="h-16 w-16 object-cover rounded-lg"
          />
          <button
            onClick={() => onRemove(i)}
            className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-center h-16 w-16 bg-gray-100 rounded-lg text-xs text-gray-500">
        {images.length}/5
      </div>
    </div>
  );
};

export default function ConsultationChat({
  farmId,
  crops = [],
  seasons = [],
  isOpen,
  onClose,
  existingConsultationId = null,
}) {
  const [selectedCrop, setSelectedCrop] = useState('');
  const [selectedSeason, setSelectedSeason] = useState('');
  const [consultationId, setConsultationId] = useState(existingConsultationId);
  const [message, setMessage] = useState('');
  const [images, setImages] = useState([]);
  const [isStarted, setIsStarted] = useState(!!existingConsultationId);
  
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const queryClient = useQueryClient();
  const prevExistingIdRef = useRef(existingConsultationId);

  // Sync state when existingConsultationId prop changes
  if (existingConsultationId !== prevExistingIdRef.current) {
    prevExistingIdRef.current = existingConsultationId;
    if (existingConsultationId) {
      setConsultationId(existingConsultationId);
      setIsStarted(true);
    } else if (isOpen) {
      // New consultation - reset to crop selection
      setConsultationId(null);
      setIsStarted(false);
    }
  }

  // Fetch existing consultation if ID provided
  const { data: consultation, isLoading: isLoadingConsultation } = useQuery({
    queryKey: ['consultation', consultationId],
    queryFn: async () => {
      const response = await api.get(`/consultations/${consultationId}`);
      return response.data.data;
    },
    enabled: !!consultationId && isOpen,
  });

  // Create consultation mutation
  const createMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post('/consultations', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      setConsultationId(data._id);
      setIsStarted(true);
      queryClient.invalidateQueries(['consultations']);
    },
  });

  // Send message mutation
  const sendMutation = useMutation({
    mutationFn: async (data) => {
      const formData = new FormData();
      formData.append('message', data.message);
      
      if (data.images?.length > 0) {
        data.images.forEach(img => {
          formData.append('images', img);
        });
      }

      const response = await api.post(
        `/consultations/${consultationId}/message`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );
      return response.data.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['consultation', consultationId]);
      setMessage('');
      setImages([]);
    },
  });

  // Update status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async (status) => {
      const response = await api.patch(`/consultations/${consultationId}/status`, { status });
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['consultation', consultationId]);
      queryClient.invalidateQueries(['consultations']);
    },
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    if (consultation?.messages?.length) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [consultation?.messages?.length]);

  // Reset state when modal closes
  const handleClose = () => {
    // Invalidate consultations list to show any updates
    queryClient.invalidateQueries(['consultations']);
    onClose();
    // Reset state after close animation
    setTimeout(() => {
      setConsultationId(null);
      setIsStarted(false);
      setSelectedCrop('');
      setSelectedSeason('');
      setMessage('');
      setImages([]);
    }, 300);
  };

  const handleStartConsultation = () => {
    if (!selectedCrop) return;
    
    const cropName = typeof selectedCrop === 'object' ? selectedCrop.name : selectedCrop;
    const cropId = typeof selectedCrop === 'object' ? selectedCrop._id : undefined;
    
    createMutation.mutate({
      farmId,
      cropName,
      cropId,
      seasonId: selectedSeason || undefined,
      initialMessage: true,
    });
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!message.trim() && images.length === 0) return;
    
    sendMutation.mutate({ message: message.trim() || 'Please analyze these images', images });
  };

  const handleImageSelect = (files) => {
    const newFiles = Array.from(files).filter(f => {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
        alert(`${f.name} - Only JPG, PNG, WebP allowed`);
        return false;
      }
      if (f.size > 5 * 1024 * 1024) {
        alert(`${f.name} - Max 5MB per image`);
        return false;
      }
      return true;
    });

    if (images.length + newFiles.length > 5) {
      alert('Maximum 5 images per message');
      return;
    }

    setImages(prev => [...prev, ...newFiles]);
  };

  const handleRemoveImage = (index) => {
    setImages(prev => prev.filter((_, i) => i !== index));
  };

  if (!isOpen) return null;

  // Crop selection screen
  if (!isStarted) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/80 backdrop-blur-md animate-in fade-in">
        <div className="w-full max-w-lg bg-white rounded-[2rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="bg-white/20 p-2.5 rounded-xl">
                  <MessageSquare className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">AI Crop Consultation</h3>
                  <p className="text-sm text-indigo-100">Get expert advice for your crops</p>
                </div>
              </div>
              <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="p-6 space-y-6">
            <div>
              <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                Select Crop *
              </label>
              <select
                value={typeof selectedCrop === 'object' ? selectedCrop._id : selectedCrop}
                onChange={(e) => {
                  const crop = crops.find(c => (c._id || c) === e.target.value);
                  setSelectedCrop(crop || e.target.value);
                  setSelectedSeason(''); // Reset season when crop changes
                }}
                className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
              >
                <option value="">Choose a crop from your farm...</option>
                {crops.map((crop, i) => (
                  <option key={crop._id || crop || i} value={crop._id || crop}>
                    {typeof crop === 'object' ? crop.name : crop}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter seasons by selected crop */}
            {(() => {
              const selectedCropName = typeof selectedCrop === 'object' ? selectedCrop.name : selectedCrop;
              const selectedCropId = typeof selectedCrop === 'object' ? selectedCrop._id : null;
              const filteredSeasons = seasons.filter(s => 
                s.cropId === selectedCropId || 
                s.crop?._id === selectedCropId ||
                s.cropName === selectedCropName ||
                s.crop?.name === selectedCropName
              );
              
              return filteredSeasons.length > 0 && selectedCrop && (
                <div>
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Season (Optional)
                  </label>
                  <select
                    value={selectedSeason}
                    onChange={(e) => setSelectedSeason(e.target.value)}
                    className="w-full h-12 px-4 rounded-xl bg-gray-50 border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  >
                    <option value="">All seasons for this crop</option>
                    {filteredSeasons.map((season) => (
                      <option key={season._id} value={season._id}>
                        Planted {new Date(season.plantedDate).toLocaleDateString()} • {season.area} {season.areaUnit}
                      </option>
                    ))}
                  </select>
                </div>
              );
            })()}

            <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
              <h4 className="text-xs font-black text-indigo-600 uppercase tracking-widest mb-2">What you can ask about:</h4>
              <div className="flex flex-wrap gap-2">
                {['Diseases', 'Pests', 'Nutrients', 'Weather impacts', 'Growth issues'].map(topic => (
                  <span key={topic} className="px-3 py-1 bg-white rounded-full text-xs font-bold text-indigo-700 border border-indigo-100">
                    {topic}
                  </span>
                ))}
              </div>
            </div>

            <Button
              onClick={handleStartConsultation}
              disabled={!selectedCrop || createMutation.isPending}
              className="w-full h-14 rounded-2xl font-black text-lg"
            >
              {createMutation.isPending ? (
                <><Loader2 className="h-5 w-5 animate-spin mr-2" /> Starting...</>
              ) : (
                <>Start Consultation</>
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chat interface
  return (
    <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-white shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white flex-shrink-0">
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
              <ChevronLeft className="h-5 w-5" />
            </button>
            <div className="bg-white/20 p-2 rounded-xl">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-black tracking-tight">AI Agronomist</h3>
              <div className="flex items-center gap-2 text-xs text-indigo-100">
                <span>{consultation?.cropName || 'Loading...'}</span>
                {consultation?.issueType && (
                  <span className={`px-2 py-0.5 rounded-full ${issueTypeConfig[consultation.issueType]?.bg} ${issueTypeConfig[consultation.issueType]?.color} text-[10px] font-bold`}>
                    {issueTypeConfig[consultation.issueType]?.label}
                  </span>
                )}
                {consultation?.severity && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                    consultation.severity === 'critical' ? 'bg-red-500 text-white' :
                    consultation.severity === 'high' ? 'bg-orange-500 text-white' :
                    consultation.severity === 'medium' ? 'bg-amber-500 text-white' :
                    'bg-gray-200 text-gray-600'
                  }`}>
                    {consultation.severity}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>
        
        {/* Status Control Bar */}
        {consultation && (
          <div className="px-4 pb-3 flex items-center gap-2">
            <span className="text-[10px] font-bold text-indigo-200 uppercase tracking-widest mr-2">Status:</span>
            {['active', 'resolved', 'archived'].map((status) => (
              <button
                key={status}
                onClick={() => updateStatusMutation.mutate(status)}
                disabled={updateStatusMutation.isPending || consultation.status === status}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${
                  consultation.status === status
                    ? status === 'resolved' 
                      ? 'bg-green-500 text-white'
                      : status === 'archived'
                        ? 'bg-gray-500 text-white'
                        : 'bg-white text-indigo-600'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50`}
              >
                {status === 'resolved' && <CheckCircle2 className="h-3 w-3 inline mr-1" />}
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resolved/Archived Banner */}
      {consultation?.status === 'resolved' && (
        <div className="bg-green-50 border-b border-green-100 px-4 py-2 flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600" />
          <span className="text-sm font-bold text-green-700">Issue Resolved</span>
          <span className="text-xs text-green-600">• This consultation has been marked as resolved</span>
        </div>
      )}
      {consultation?.status === 'archived' && (
        <div className="bg-gray-50 border-b border-gray-200 px-4 py-2 flex items-center gap-2">
          <AlertCircle className="h-4 w-4 text-gray-500" />
          <span className="text-sm font-bold text-gray-600">Archived</span>
          <span className="text-xs text-gray-500">• This consultation has been archived</span>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50">
        {isLoadingConsultation ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : (
          <>
            {consultation?.messages?.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                    <span className="text-sm text-gray-500">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-gray-100 bg-white space-y-3 flex-shrink-0">
        <ImagePreview images={images} onRemove={handleRemoveImage} />
        
        <form onSubmit={handleSend} className="flex gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="h-12 w-12 rounded-xl bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors flex-shrink-0"
          >
            <Upload className="h-5 w-5 text-gray-600" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              handleImageSelect(e.target.files);
              e.target.value = '';
            }}
          />
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your concern or ask a question..."
            className="flex-1 h-12 rounded-xl bg-gray-100 px-4 focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
          />
          <button
            type="submit"
            disabled={(!message.trim() && images.length === 0) || sendMutation.isPending}
            className="h-12 w-12 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors flex-shrink-0"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Send className="h-5 w-5" />
            )}
          </button>
        </form>

        <p className="text-[10px] text-gray-400 text-center">
          📷 Attach images of affected crops for better diagnosis
        </p>
      </div>
    </div>
  );
}
