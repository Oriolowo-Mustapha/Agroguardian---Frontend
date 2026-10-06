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
import ModalShell from './ui/ModalShell';
import { LoadingState } from './ui/States';

const issueTypeConfig = {
  disease: { icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50', label: 'Disease' },
  pest: { icon: Bug, color: 'text-amber-600', bg: 'bg-amber-50', label: 'Pest' },
  nutrient: { icon: Leaf, color: 'text-green-600', bg: 'bg-green-50', label: 'Nutrient' },
  weather: { icon: CloudRain, color: 'text-blue-600', bg: 'bg-blue-50', label: 'Weather' },
  general: { icon: HelpCircle, color: 'text-muted-foreground', bg: 'bg-muted', label: 'General' },
};

const ChatMessage = ({ message }) => {
  const isUser = message.role === 'user';
  
  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2`}>
      <div className={`min-w-0 max-w-[85%] ${isUser ? 'order-2' : 'order-1'}`}>
        <div className={`p-4 rounded-2xl ${
          isUser
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-card border border-border text-foreground rounded-bl-md shadow-sm'
        }`}>
          {/* Message images */}
          {message.imageUrls && message.imageUrls.length > 0 && (
            <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
              {message.imageUrls.map((url, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => window.open(url, '_blank')}
                  aria-label={`Open attached image ${i + 1} in a new tab`}
                  className="flex-shrink-0 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <img
                    src={url}
                    alt={`Attached ${i + 1}`}
                    className="h-24 w-24 object-cover rounded-xl hover:opacity-80 transition-opacity"
                  />
                </button>
              ))}
            </div>
          )}
          <p className={`text-sm whitespace-pre-wrap break-words ${isUser ? 'text-white' : 'text-foreground'}`}>
            {message.content}
          </p>
        </div>
        <p className={`text-[10px] mt-1 ${isUser ? 'text-right' : 'text-left'} text-muted-foreground`}>
          {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </p>
      </div>
    </div>
  );
};

const ImagePreview = ({ images, onRemove }) => {
  if (images.length === 0) return null;
  
  return (
    <div className="flex gap-2 p-3 bg-muted rounded-xl overflow-x-auto">
      {images.map((img, i) => (
        <div key={i} className="relative flex-shrink-0 group">
          <img
            src={URL.createObjectURL(img)}
            alt={`Preview ${i + 1}`}
            className="h-16 w-16 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={() => onRemove(i)}
            aria-label={`Remove image ${i + 1}`}
            className="absolute -top-1 -right-1 p-1 bg-destructive text-white rounded-full opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100"
          >
            <X className="h-3 w-3" aria-hidden="true" />
          </button>
        </div>
      ))}
      <div className="flex items-center justify-center h-16 w-16 bg-background rounded-lg text-xs text-muted-foreground">
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
      queryClient.invalidateQueries(['consultations']);
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
      <ModalShell
        open={isOpen}
        onClose={handleClose}
        title="AI Crop Consultation"
        description="Get expert advice for your crops"
        icon={
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/20">
            <MessageSquare className="h-6 w-6 text-white" aria-hidden="true" />
          </span>
        }
        size="md"
        headerClassName="border-b-0 bg-gradient-to-r from-primary to-emerald-600 text-white [&_h2]:text-white [&_p]:text-white/90 [&_button:hover]:bg-white/20"
        bodyClassName="space-y-6"
        footer={
          <Button
            onClick={handleStartConsultation}
            disabled={!selectedCrop}
            loading={createMutation.isPending}
            className="w-full rounded-2xl text-base font-bold sm:w-auto sm:px-10"
          >
            {createMutation.isPending ? 'Starting...' : 'Start Consultation'}
          </Button>
        }
      >
        {createMutation.isError && (
          <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
            {createMutation.error?.response?.data?.message || 'Could not start the consultation. Please try again.'}
          </div>
        )}

        <div>
          <label htmlFor="consultation-chat-crop" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
            Select Crop *
          </label>
          <select
            id="consultation-chat-crop"
            value={typeof selectedCrop === 'object' ? selectedCrop._id : selectedCrop}
            onChange={(e) => {
              const crop = crops.find(c => (c._id || c) === e.target.value);
              setSelectedCrop(crop || e.target.value);
              setSelectedSeason(''); // Reset season when crop changes
            }}
            className="w-full h-12 px-4 rounded-xl bg-background border border-border text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
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
          const filteredSeasons = seasons.filter(s => {
            const seasonCropId = s.cropId?._id || s.cropId || s.crop?._id || s.crop;
            if (selectedCropId && String(seasonCropId || '') === String(selectedCropId)) return true;
            
            const seasonCropName = String(
              s.cropName || 
              s.crop?.name || 
              (typeof s.cropId === 'object' ? s.cropId?.name : '') || 
              ''
            ).trim().toLowerCase();
            
            return selectedCropName && seasonCropName === selectedCropName.toLowerCase();
          });
          
          return filteredSeasons.length > 0 && selectedCrop && (
            <div>
              <label htmlFor="consultation-chat-season" className="block text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2">
                Season (Optional)
              </label>
              <select
                id="consultation-chat-season"
                value={selectedSeason}
                onChange={(e) => setSelectedSeason(e.target.value)}
                className="w-full h-12 px-4 rounded-xl bg-background border border-border text-base font-medium focus:outline-none focus:ring-2 focus:ring-ring"
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

        <div className="bg-primary/10 p-4 rounded-xl border border-primary/20">
          <h4 className="text-xs font-bold text-primary uppercase tracking-widest mb-2">What you can ask about:</h4>
          <div className="flex flex-wrap gap-2">
            {['Diseases', 'Pests', 'Nutrients', 'Weather impacts', 'Growth issues'].map(topic => (
              <span key={topic} className="px-3 py-1 bg-card rounded-full text-xs font-bold text-primary border border-primary/20">
                {topic}
              </span>
            ))}
          </div>
        </div>
      </ModalShell>
    );
  }

  // Chat interface
  return (
    <div className="fixed inset-y-0 right-0 z-[110] w-full max-w-lg bg-card shadow-2xl flex flex-col motion-safe:animate-in motion-safe:slide-in-from-right motion-safe:duration-300">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-emerald-600 text-white flex-shrink-0">
        <div className="p-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <button type="button" onClick={handleClose} aria-label="Back" className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
              <ChevronLeft className="h-5 w-5" aria-hidden="true" />
            </button>
            <div className="bg-white/20 p-2 rounded-xl shrink-0">
              <MessageSquare className="h-5 w-5" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h3 className="font-black tracking-tight truncate">AI Agronomist</h3>
              <div className="flex flex-wrap items-center gap-2 text-xs text-white/80">
                <span className="truncate">{consultation?.cropName || 'Loading...'}</span>
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
                    'bg-muted text-muted-foreground'
                  }`}>
                    {consultation.severity}
                  </span>
                )}
              </div>
            </div>
          </div>
          <button type="button" onClick={handleClose} aria-label="Close chat" className="p-2 hover:bg-white/10 rounded-full transition-colors shrink-0">
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
        
        {/* Status Control Bar */}
        {consultation && (
          <div className="px-4 pb-3 flex flex-wrap items-center gap-2 sm:gap-3">
            <span className="text-[10px] font-bold text-white/70 uppercase tracking-widest">Status:</span>
            {['active', 'resolved', 'archived'].map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => updateStatusMutation.mutate(status)}
                disabled={updateStatusMutation.isPending || consultation.status === status}
                aria-pressed={consultation.status === status}
                className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wide transition-all ${
                  consultation.status === status
                    ? status === 'resolved' 
                      ? 'bg-green-500 text-white'
                      : status === 'archived'
                        ? 'bg-muted text-muted-foreground'
                        : 'bg-white text-primary'
                    : 'bg-white/10 text-white hover:bg-white/20'
                } disabled:opacity-50`}
              >
                {status === 'resolved' && <CheckCircle2 className="h-3 w-3 inline mr-1" aria-hidden="true" />}
                {status}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Resolved/Archived Banner */}
      {consultation?.status === 'resolved' && (
        <div role="status" className="bg-green-50 border-b border-green-100 px-4 py-2 flex flex-wrap items-center gap-2">
          <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-green-700">Issue Resolved</span>
          <span className="text-xs text-green-600">• This consultation has been marked as resolved</span>
        </div>
      )}
      {consultation?.status === 'archived' && (
        <div className="bg-muted border-b border-border px-4 py-2 flex flex-wrap items-center gap-2">
          <AlertCircle className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <span className="text-sm font-bold text-foreground">Archived</span>
          <span className="text-xs text-muted-foreground">• This consultation has been archived</span>
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 space-y-4 bg-muted/30"
        role="log"
        aria-live="polite"
        aria-label="Chat messages"
      >
        {isLoadingConsultation ? (
          <LoadingState label="Loading conversation..." />
        ) : (
          <>
            {consultation?.messages?.map((msg, i) => (
              <ChatMessage key={i} message={msg} />
            ))}
            {sendMutation.isPending && (
              <div className="flex justify-start">
                <div className="bg-card p-4 rounded-2xl border border-border shadow-sm" role="status">
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-primary" aria-hidden="true" />
                    <span className="text-sm text-muted-foreground">Analyzing...</span>
                  </div>
                </div>
              </div>
            )}
            {sendMutation.isError && (
              <div role="alert" className="rounded-xl bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                {sendMutation.error?.response?.data?.message || 'Failed to send your message. Please try again.'}
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input area */}
      <div className="p-4 border-t border-border bg-card space-y-3 flex-shrink-0">
        <ImagePreview images={images} onRemove={handleRemoveImage} />
        
        <form onSubmit={handleSend} className="flex gap-2">
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
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Attach images"
            className="h-12 w-12 shrink-0 rounded-xl bg-muted hover:bg-muted/70 flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
          </button>
          <input
            type="text"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your concern or ask a question..."
            aria-label="Message"
            className="min-w-0 flex-1 h-12 rounded-xl bg-muted px-4 focus:outline-none focus:ring-2 focus:ring-ring text-base"
          />
          <button
            type="submit"
            aria-label="Send message"
            aria-disabled={(!message.trim() && images.length === 0) || sendMutation.isPending}
            disabled={(!message.trim() && images.length === 0) || sendMutation.isPending}
            className="h-12 w-12 shrink-0 rounded-xl bg-primary text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {sendMutation.isPending ? (
              <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
            ) : (
              <Send className="h-5 w-5" aria-hidden="true" />
            )}
          </button>
        </form>

        <p className="text-[10px] text-muted-foreground text-center">
          📷 Attach images of affected crops for better diagnosis
        </p>
      </div>
    </div>
  );
}
