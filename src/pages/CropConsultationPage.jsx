import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Menu,
  Send,
  X,
  MessageCircle,
  Plus,
  Clock,
  Sprout,
  Image as ImageIcon
} from 'lucide-react';
import api from '../lib/axios';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { Button } from '../components/ui/Button';
import { EmptyState, LoadingState } from '../components/ui/States';

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    resolved: 'bg-blue-100 text-blue-700',
    archived: 'bg-muted text-muted-foreground'
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status] || styles.active}`}>
      {status || 'active'}
    </span>
  );
};

const getIssueBadge = (issueType) => {
  if (!issueType) return null;

  const styles = {
    disease: 'bg-red-100 text-red-700',
    pest: 'bg-amber-100 text-amber-700',
    nutrient: 'bg-green-100 text-green-700',
    weather: 'bg-blue-100 text-blue-700',
    general: 'bg-muted text-muted-foreground'
  };

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs ${styles[issueType] || styles.general}`}>
      {issueType}
    </span>
  );
};

export default function CropConsultationPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const goBack = useNavigateBack(`/diagnosis${farmId ? `?farmId=${farmId}` : ''}`);
  const queryClient = useQueryClient();

  const [activeConsultation, setActiveConsultation] = useState(null);
  const [showNewConsultation, setShowNewConsultation] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);

  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);

  const [newConsultationForm, setNewConsultationForm] = useState({
    cropName: '',
    cropId: '',
    seasonId: '',
    message: ''
  });

  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);
  const imagePreviewsRef = useRef([]);

  const clearSelectedImages = useCallback(() => {
    setSelectedImages((prev) => {
      prev.forEach((i) => {
        if (i?.previewUrl) URL.revokeObjectURL(i.previewUrl);
      });
      return [];
    });
  }, []);

  useEffect(() => {
    imagePreviewsRef.current = selectedImages;
  }, [selectedImages]);

  useEffect(() => {
    return () => {
      imagePreviewsRef.current.forEach((i) => {
        if (i?.previewUrl) URL.revokeObjectURL(i.previewUrl);
      });
    };
  }, []);

  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return res.data.data || [];
    }
  });

  useEffect(() => {
    if (!farmId && farms.length > 0) {
      setSearchParams({ farmId: farms[0]._id });
    }
  }, [farmId, farms, setSearchParams]);

  const selectedFarm = farms.find((f) => f._id === farmId) || farms[0];

  useEffect(() => {
    setActiveConsultation(null);
    setShowNewConsultation(false);
    setIsListOpen(false);
    setNewMessage('');
    clearSelectedImages();
  }, [selectedFarm?._id, clearSelectedImages]);

  const { data: farmCrops = [] } = useQuery({
    queryKey: ['farm-crops', selectedFarm?._id],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${selectedFarm._id}/crops`);
      return response.data.data || [];
    },
    enabled: !!selectedFarm?._id
  });

  const { data: farmSeasons = [] } = useQuery({
    queryKey: ['farm-seasons', selectedFarm?._id],
    queryFn: async () => {
      const response = await api.get(`/practices/farms/${selectedFarm._id}/seasons`);
      return response.data.data || [];
    },
    enabled: !!selectedFarm?._id
  });

  const seasonsForSelectedCrop = useMemo(() => {
    const cropId = newConsultationForm.cropId;
    const cropName = String(newConsultationForm.cropName || '').trim().toLowerCase();

    if (cropId) {
      return farmSeasons.filter((s) => {
        const seasonCropId = s.cropId?._id || s.cropId || s.crop?._id || s.crop;
        return String(seasonCropId || '') === String(cropId);
      });
    }

    if (cropName) {
      return farmSeasons.filter((s) => {
        const seasonCropName = String(
          s.cropName || 
          s.crop?.name || 
          (typeof s.cropId === 'object' ? s.cropId?.name : '') || 
          ''
        ).trim().toLowerCase();
        return seasonCropName === cropName;
      });
    }

    // Don't show seasons until user selects/enters a crop
    return [];
  }, [farmSeasons, newConsultationForm.cropId, newConsultationForm.cropName]);

  const { data: consultationsData, isLoading: loadingConsultations } = useQuery({
    queryKey: ['consultations', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/consultations/farm/${selectedFarm._id}`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const consultations = consultationsData?.data || [];

  useEffect(() => {
    if (showNewConsultation) return;
    if (!activeConsultation && consultations.length > 0) {
      setActiveConsultation(consultations[0]._id);
    }
  }, [activeConsultation, consultations, showNewConsultation]);

  const { data: activeConsultationData, isLoading: loadingActive } = useQuery({
    queryKey: ['consultation', activeConsultation],
    queryFn: async () => {
      const res = await api.get(`/consultations/${activeConsultation}`);
      return res.data.data;
    },
    enabled: !!activeConsultation,
    refetchInterval: 5000
  });

  const consultation = activeConsultationData;

  useEffect(() => {
    if (!consultation?.messages) return;
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consultation?.messages?.length]);

  const startConsultation = useMutation({
    mutationFn: async ({ cropName, cropId, seasonId, message, images }) => {
      const res = await api.post('/consultations', {
        farmId: selectedFarm._id,
        cropName,
        cropId: cropId || undefined,
        seasonId: seasonId || undefined,
        initialMessage: true
      });

      const created = res.data?.data;
      if (!created?._id) return created;

      const hasFirstMessage = (message && String(message).trim().length > 0) || (images && images.length > 0);
      if (hasFirstMessage) {
        const formData = new FormData();
        formData.append('message', String(message || 'Please advise'));
        (images || []).forEach((item) => formData.append('images', item.file || item));

        await api.post(`/consultations/${created._id}/message`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
      }

      return created;
    },
    onSuccess: (created) => {
      if (created?._id) {
        setActiveConsultation(created._id);
      }
      setShowNewConsultation(false);
      setIsListOpen(false);
      clearSelectedImages();
      setNewConsultationForm({ cropName: '', cropId: '', seasonId: '', message: '' });
      queryClient.invalidateQueries(['consultations']);
      if (created?._id) queryClient.invalidateQueries(['consultation', created._id]);
    }
  });

  const sendMessage = useMutation({
    mutationFn: async ({ consultationId, message, images }) => {
      const formData = new FormData();
      formData.append('message', message);
      (images || []).forEach((item) => formData.append('images', item.file || item));

      const res = await api.post(`/consultations/${consultationId}/message`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      setNewMessage('');
      clearSelectedImages();
      queryClient.invalidateQueries(['consultations']);
      queryClient.invalidateQueries(['consultation', activeConsultation]);
    }
  });

  const handleSelectConsultation = (id) => {
    setActiveConsultation(id);
    setShowNewConsultation(false);
    setIsListOpen(false);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files || []);
    const next = files.map((file) => ({ file, previewUrl: URL.createObjectURL(file) }));
    setSelectedImages((prev) => [...prev, ...next].slice(0, 5));
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index) => {
    setSelectedImages((prev) => {
      const item = prev[index];
      if (item?.previewUrl) URL.revokeObjectURL(item.previewUrl);
      return prev.filter((_, i) => i !== index);
    });
  };

  const canStart = Boolean(selectedFarm?._id) && Boolean(newConsultationForm.cropName.trim()) && Boolean(newConsultationForm.message.trim());

  if (!selectedFarm) {
    return (
      <EmptyState
        icon={<Sprout className="h-8 w-8" aria-hidden="true" />}
        title="No farm selected"
        description="Please select a farm first"
        action={
          <Button asChild variant="outline" size="sm">
            <Link to="/farms">Go to Farms</Link>
          </Button>
        }
      />
    );
  }

  const consultationList = loadingConsultations ? (
    <LoadingState className="py-8" label="Loading chats..." />
  ) : consultations.length === 0 ? (
    <EmptyState
      className="py-8"
      icon={<MessageCircle className="h-8 w-8" aria-hidden="true" />}
      title="No chats yet"
    />
  ) : (
    <div className="divide-y">
      {consultations.map((c) => (
        <button
          key={c._id}
          type="button"
          onClick={() => handleSelectConsultation(c._id)}
          aria-current={activeConsultation === c._id ? 'true' : undefined}
          className={`w-full p-4 text-left hover:bg-muted ${
            activeConsultation === c._id ? 'bg-primary/10 border-l-4 border-primary' : ''
          }`}
        >
          <div className="flex items-start justify-between mb-1 gap-2">
            <span className="text-lg" aria-hidden="true">🌱</span>
            {getStatusBadge(c.status)}
          </div>
          <p className="font-medium text-sm truncate">{c.title || c.cropName || 'Crop Chat'}</p>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {getIssueBadge(c.issueType)}
            {c.severity && (
              <span className="px-2 py-0.5 rounded-full text-xs bg-muted text-muted-foreground">
                {c.severity}
              </span>
            )}
            <span className="text-xs text-muted-foreground flex items-center gap-1">
              <Clock className="w-3 h-3" aria-hidden="true" />
              {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
            </span>
          </div>
        </button>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border px-4 sm:px-6 py-4 rounded-xl">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button
              type="button"
              onClick={goBack}
              aria-label="Go back"
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
            >
              <ArrowLeft className="w-5 h-5" aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              aria-label="Open chats list"
              className="p-2 hover:bg-muted rounded-lg text-muted-foreground md:hidden"
              title="Consultations"
            >
              <Menu className="w-5 h-5" aria-hidden="true" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">Crop AI Chats</h1>
              <p className="text-sm text-muted-foreground truncate">{selectedFarm.name}</p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => {
              setActiveConsultation(null);
              setShowNewConsultation(true);
              setIsListOpen(false);
            }}
            className="w-full gap-2 rounded-lg sm:w-auto"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </Button>
        </div>
      </div>

      <div className="flex h-[calc(100dvh-17rem)] min-h-[16rem]">
        {/* Sidebar - Consultation List (desktop) */}
        <div className="hidden md:block w-80 shrink-0 bg-card border-r border-border overflow-y-auto">
          <div className="p-4 border-b border-border">
            <h3 className="font-medium text-foreground">All Chats</h3>
          </div>
          {consultationList}
        </div>

        {/* Mobile Consultation List (drawer) */}
        {isListOpen && (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/50 md:hidden"
              onClick={() => setIsListOpen(false)}
              aria-hidden="true"
            />
            <div
              className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-card border-r border-border md:hidden flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-label="Your chats"
            >
              <div className="p-4 border-b border-border flex items-center justify-between gap-2">
                <h3 className="font-medium text-foreground">All Chats</h3>
                <button
                  type="button"
                  onClick={() => setIsListOpen(false)}
                  aria-label="Close chats list"
                  className="p-2 hover:bg-muted rounded-lg text-muted-foreground"
                >
                  <X className="w-5 h-5" aria-hidden="true" />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto">{consultationList}</div>
            </div>
          </>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showNewConsultation ? (
            <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
              <div className="w-full max-w-lg bg-card border border-border rounded-xl shadow-sm p-4 sm:p-6">
                <h2 className="text-lg font-semibold mb-4">Start New Crop Chat</h2>

                <div className="space-y-4">
                  <div>
                    <label htmlFor="crop-farm" className="block text-sm font-medium text-foreground mb-1">Farm</label>
                    <select
                      id="crop-farm"
                      value={selectedFarm?._id || ''}
                      onChange={(e) => setSearchParams({ farmId: e.target.value })}
                      className="w-full border border-border rounded-lg px-3 py-2 bg-background text-base"
                    >
                      {farms.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="crop-crop" className="block text-sm font-medium text-foreground mb-1">Crop</label>
                    <select
                      id="crop-crop"
                      value={newConsultationForm.cropId}
                      onChange={(e) => {
                        const id = e.target.value;
                        const crop = farmCrops.find((c) => c._id === id);
                        setNewConsultationForm((prev) => ({
                          ...prev,
                          cropId: id,
                          cropName: crop?.name || prev.cropName,
                          seasonId: ''
                        }));
                      }}
                      className="w-full border border-border rounded-lg px-3 py-2 bg-background text-base"
                    >
                      <option value="">Select crop (optional)</option>
                      {farmCrops.map((c) => (
                        <option key={c._id} value={c._id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input
                      value={newConsultationForm.cropName}
                      onChange={(e) =>
                        setNewConsultationForm((prev) => ({
                          ...prev,
                          cropName: e.target.value,
                          cropId: '',
                          seasonId: ''
                        }))
                      }
                      placeholder="Crop name (required)"
                      aria-label="Crop name (required)"
                      className="w-full border border-border rounded-lg px-3 py-2 mt-2 bg-background text-base"
                    />
                  </div>

                  <div>
                    <label htmlFor="crop-season" className="block text-sm font-medium text-foreground mb-1">Season (Optional)</label>
                    <select
                      id="crop-season"
                      value={newConsultationForm.seasonId}
                      onChange={(e) => setNewConsultationForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                      className="w-full border border-border rounded-lg px-3 py-2 bg-background text-base"
                      disabled={seasonsForSelectedCrop.length === 0}
                    >
                      <option value="">{seasonsForSelectedCrop.length === 0 ? 'Select crop to load seasons' : 'No season selected'}</option>
                      {seasonsForSelectedCrop.map((s) => (
                        <option key={s._id} value={s._id}>
                          {s.name || `${s.cropId?.name || s.cropName || 'Season'} (${new Date(s.plantedDate).toLocaleDateString()})`}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label htmlFor="crop-message" className="block text-sm font-medium text-foreground mb-1">What’s the issue?</label>
                    <textarea
                      id="crop-message"
                      value={newConsultationForm.message}
                      onChange={(e) => setNewConsultationForm((prev) => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      placeholder="Example: Leaves are turning yellow with brown spots..."
                      className="w-full border border-border rounded-lg px-3 py-2 bg-background text-base"
                    />
                  </div>

                  {startConsultation.isError && (
                    <div role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                      {startConsultation.error?.response?.data?.message || 'Could not start the chat. Please try again.'}
                    </div>
                  )}

                  <Button
                    type="button"
                    onClick={() =>
                      startConsultation.mutate({
                        ...newConsultationForm,
                        images: selectedImages
                      })
                    }
                    disabled={!canStart}
                    loading={startConsultation.isPending}
                    className="w-full gap-2 rounded-lg"
                  >
                    {!startConsultation.isPending && <MessageCircle className="w-4 h-4" aria-hidden="true" />}
                    {startConsultation.isPending ? 'Starting...' : 'Start Chat'}
                  </Button>
                </div>
              </div>
            </div>
          ) : activeConsultation && consultation ? (
            <>
              {/* Chat Header */}
              <div className="bg-card border-b border-border px-4 sm:px-6 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl" aria-hidden="true">🌱</span>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{consultation.title || consultation.cropName || 'Crop Chat'}</h3>
                      <p className="text-xs text-muted-foreground truncate">
                        {consultation.cropName}
                        {consultation.issueType ? ` • ${consultation.issueType}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {getIssueBadge(consultation.issueType)}
                    {getStatusBadge(consultation.status)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div
                className="flex-1 min-h-0 overflow-y-auto overscroll-contain p-4 sm:p-6 space-y-4"
                role="log"
                aria-live="polite"
                aria-label="Chat messages"
              >
                {loadingActive ? (
                  <LoadingState label="Loading messages..." />
                ) : (
                  consultation.messages?.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`min-w-0 max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-3 ${
                          msg.role === 'user' ? 'bg-primary text-white' : 'bg-card border border-border shadow-sm'
                        }`}
                      >
                        {msg.imageUrls?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.imageUrls.map((url, i) => (
                              <img key={i} src={url} alt="Attachment" className="w-20 h-20 object-cover rounded" />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-white/80' : 'text-muted-foreground'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-card border-t border-border p-4">
                {selectedImages.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {selectedImages.map((item, idx) => (
                      <div key={idx} className="relative group">
                        <img src={item.previewUrl} alt="Selected" className="w-16 h-16 object-cover rounded" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          aria-label={`Remove image ${idx + 1}`}
                          className="absolute -top-2 -right-2 bg-destructive text-white rounded-full p-0.5 opacity-100 transition-opacity md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100"
                        >
                          <X className="w-3 h-3" aria-hidden="true" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {sendMessage.isError && (
                  <div role="alert" className="mb-3 rounded-lg bg-destructive/10 px-4 py-3 text-sm font-medium text-destructive">
                    {sendMessage.error?.response?.data?.message || 'Failed to send your message. Please try again.'}
                  </div>
                )}

                <div className="flex items-end gap-2 sm:gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Attach images"
                    title="Attach images"
                    className="shrink-0 text-muted-foreground hover:text-foreground"
                  >
                    <ImageIcon className="w-5 h-5" aria-hidden="true" />
                  </Button>

                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        if (!newMessage.trim() || sendMessage.isPending) return;
                        sendMessage.mutate({ consultationId: activeConsultation, message: newMessage, images: selectedImages });
                      }
                    }}
                    placeholder="Type your message..."
                    aria-label="Type your message"
                    rows={1}
                    className="min-w-0 flex-1 border border-border rounded-lg px-4 py-2 resize-none bg-background text-base"
                  />

                  <Button
                    type="button"
                    size="icon"
                    aria-label="Send message"
                    onClick={() =>
                      sendMessage.mutate({ consultationId: activeConsultation, message: newMessage, images: selectedImages })
                    }
                    disabled={!newMessage.trim()}
                    loading={sendMessage.isPending}
                    className="shrink-0 rounded-lg"
                  >
                    {!sendMessage.isPending && <Send className="w-5 h-5" aria-hidden="true" />}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <EmptyState
              className="flex-1"
              icon={<MessageCircle className="h-8 w-8" aria-hidden="true" />}
              title="Select a chat"
              description="Choose from the list or start a new one"
            />
          )}
        </div>
      </div>
    </div>
  );
}
