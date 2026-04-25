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
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import api from '../lib/axios';
import { useNavigateBack } from '../hooks/useNavigateBack';

const getStatusBadge = (status) => {
  const styles = {
    active: 'bg-green-100 text-green-700',
    resolved: 'bg-blue-100 text-blue-700',
    archived: 'bg-gray-100 text-gray-700'
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
    general: 'bg-gray-100 text-gray-700'
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Sprout className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Please select a farm first</p>
          <Link to="/farms" className="text-green-600 hover:underline">
            Go to Farms
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b px-4 sm:px-6 py-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-2 sm:gap-4 min-w-0">
            <button type="button" onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={() => setIsListOpen(true)}
              className="p-2 hover:bg-gray-100 rounded-lg md:hidden"
              title="Consultations"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold truncate">Crop AI Chats</h1>
              <p className="text-sm text-gray-500 truncate">{selectedFarm.name}</p>
            </div>
          </div>

          <button
            onClick={() => {
              setActiveConsultation(null);
              setShowNewConsultation(true);
              setIsListOpen(false);
            }}
            className="flex items-center justify-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Chat</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100dvh-130px)] md:h-[calc(100vh-130px)] min-h-0">
        {/* Sidebar - Consultation List (desktop) */}
        <div className="hidden md:block w-80 shrink-0 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-700">All Chats</h3>
          </div>

          {loadingConsultations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No chats yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {consultations.map((c) => (
                <button
                  key={c._id}
                  onClick={() => handleSelectConsultation(c._id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 ${
                    activeConsultation === c._id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1 gap-2">
                    <span className="text-lg">🌱</span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p className="font-medium text-sm truncate">{c.title || c.cropName || 'Crop Chat'}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {getIssueBadge(c.issueType)}
                    {c.severity && (
                      <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                        {c.severity}
                      </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Mobile Consultation List (drawer) */}
        {isListOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setIsListOpen(false)} />
            <div className="fixed inset-y-0 left-0 z-50 w-full max-w-sm bg-white md:hidden flex flex-col">
              <div className="p-4 border-b flex items-center justify-between">
                <h3 className="font-medium text-gray-700">All Chats</h3>
                <button type="button" onClick={() => setIsListOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingConsultations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                </div>
              ) : consultations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No chats yet</p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto">
                  {consultations.map((c) => (
                    <button
                      key={c._id}
                      onClick={() => handleSelectConsultation(c._id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        activeConsultation === c._id ? 'bg-indigo-50 border-l-4 border-indigo-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1 gap-2">
                        <span className="text-lg">🌱</span>
                        {getStatusBadge(c.status)}
                      </div>
                      <p className="font-medium text-sm truncate">{c.title || c.cropName || 'Crop Chat'}</p>
                      <div className="flex items-center gap-2 mt-2 flex-wrap">
                        {getIssueBadge(c.issueType)}
                        {c.severity && (
                          <span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
                            {c.severity}
                          </span>
                        )}
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(c.updatedAt || c.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col min-w-0">
          {showNewConsultation ? (
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Start New Crop Chat</h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Farm</label>
                    <select
                      value={selectedFarm?._id || ''}
                      onChange={(e) => setSearchParams({ farmId: e.target.value })}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {farms.map((f) => (
                        <option key={f._id} value={f._id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Crop</label>
                    <select
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
                      className="w-full border rounded-lg px-3 py-2"
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
                      className="w-full border rounded-lg px-3 py-2 mt-2"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Season (Optional)</label>
                    <select
                      value={newConsultationForm.seasonId}
                      onChange={(e) => setNewConsultationForm((prev) => ({ ...prev, seasonId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">What’s the issue?</label>
                    <textarea
                      value={newConsultationForm.message}
                      onChange={(e) => setNewConsultationForm((prev) => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      placeholder="Example: Leaves are turning yellow with brown spots..."
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <button
                    onClick={() =>
                      startConsultation.mutate({
                        ...newConsultationForm,
                        images: selectedImages
                      })
                    }
                    disabled={!canStart || startConsultation.isPending}
                    className="w-full bg-indigo-600 text-white py-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {startConsultation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        Start Chat
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : activeConsultation && consultation ? (
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="text-2xl">🌱</span>
                    <div className="min-w-0">
                      <h3 className="font-medium truncate">{consultation.title || consultation.cropName || 'Crop Chat'}</h3>
                      <p className="text-xs text-gray-500 truncate">
                        {consultation.cropName}
                        {consultation.issueType ? ` • ${consultation.issueType}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getIssueBadge(consultation.issueType)}
                    {getStatusBadge(consultation.status)}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingActive ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
                  </div>
                ) : (
                  consultation.messages?.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-3 ${
                          msg.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border shadow-sm'
                        }`}
                      >
                        {msg.imageUrls?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.imageUrls.map((url, i) => (
                              <img key={i} src={url} alt="Attachment" className="w-20 h-20 object-cover rounded" />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-100' : 'text-gray-400'}`}>
                          {new Date(msg.timestamp).toLocaleTimeString()}
                        </p>
                      </div>
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div className="bg-white border-t p-4">
                {selectedImages.length > 0 && (
                  <div className="flex gap-2 mb-3 flex-wrap">
                    {selectedImages.map((item, idx) => (
                      <div key={idx} className="relative">
                        <img src={item.previewUrl} alt="Selected" className="w-16 h-16 object-cover rounded" />
                        <button
                          onClick={() => removeImage(idx)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-3">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageSelect}
                    accept="image/*"
                    multiple
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                    title="Attach images"
                  >
                    <ImageIcon className="w-5 h-5" />
                  </button>

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
                    rows={1}
                    className="flex-1 border rounded-lg px-4 py-2 resize-none"
                  />

                  <button
                    onClick={() =>
                      sendMessage.mutate({ consultationId: activeConsultation, message: newMessage, images: selectedImages })
                    }
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {sendMessage.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">Select a chat</h3>
                <p className="text-gray-500 mt-1">Choose from the list or start a new one</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
