import { useState, useRef, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Menu,
  Send,
  X,
  MessageCircle,
  Plus,
  Clock,
  PawPrint,
  Image as ImageIcon,
  Loader2
} from 'lucide-react';
import api from '../lib/axios';

const speciesOptions = [
  { value: 'cattle', label: 'Cattle', emoji: '🐄' },
  { value: 'goat', label: 'Goat', emoji: '🐐' },
  { value: 'sheep', label: 'Sheep', emoji: '🐑' },
  { value: 'rabbit', label: 'Rabbit', emoji: '🐇' },
  { value: 'pig', label: 'Pig', emoji: '🐷' },
  { value: 'poultry', label: 'Poultry', emoji: '🐔' },
  { value: 'fish', label: 'Fish', emoji: '🐟' }
];

export default function VetConsultationPage() {
  const [searchParams] = useSearchParams();
  const farmId = searchParams.get('farmId');
  const goBack = useNavigateBack('/livestock');
  const livestockIdParam = searchParams.get('livestockId');
  const queryClient = useQueryClient();
  
  const [activeConsultation, setActiveConsultation] = useState(null);
  const [showNewConsultation, setShowNewConsultation] = useState(!!livestockIdParam);
  const [isListOpen, setIsListOpen] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedImages, setSelectedImages] = useState([]);
  const [newConsultationForm, setNewConsultationForm] = useState({
    species: 'cattle',
    livestockId: livestockIdParam || '',
    message: ''
  });
  
  const messagesEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Fetch farms for dropdown
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return res.data.data || [];
    }
  });

  const selectedFarm = farms.find(f => f._id === farmId) || farms[0];

  // Fetch livestock for selected farm
  const { data: livestock = [] } = useQuery({
    queryKey: ['livestock', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${selectedFarm._id}`);
      return res.data.data || [];
    },
    enabled: !!selectedFarm?._id,
    onSuccess: (data) => {
      if (!livestockIdParam) return;

      const match = data.find(l => l._id === livestockIdParam);
      if (!match) return;

      setNewConsultationForm(prev => {
        const shouldSetSpecies =
          (prev.livestockId === '' || prev.livestockId === livestockIdParam) &&
          (prev.species === 'cattle' || !prev.species) &&
          !!match.species;

        return {
          ...prev,
          livestockId: prev.livestockId || match._id,
          species: shouldSetSpecies ? match.species : prev.species
        };
      });
    }
  });

  // Fetch consultations
  const { data: consultationsData, isLoading: loadingConsultations } = useQuery({
    queryKey: ['vet-consultations', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/vet-consultations/farms/${selectedFarm._id}`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const consultations = consultationsData?.data || [];

  // Fetch active consultation details
  const { data: activeConsultationData, isLoading: loadingActive } = useQuery({
    queryKey: ['vet-consultation', activeConsultation],
    queryFn: async () => {
      const res = await api.get(`/vet-consultations/${activeConsultation}`);
      return res.data;
    },
    enabled: !!activeConsultation,
    refetchInterval: 5000 // Refresh every 5s for real-time feel
  });

  const consultation = activeConsultationData?.data;

  // Start consultation mutation
  const startConsultation = useMutation({
    mutationFn: async (formData) => {
      const res = await api.post('/vet-consultations', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: (data) => {
      setActiveConsultation(data.data._id);
      setShowNewConsultation(false);
      setNewConsultationForm({ species: 'cattle', livestockId: '', message: '' });
      queryClient.invalidateQueries(['vet-consultations']);
    }
  });

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ consultationId, formData }) => {
      const res = await api.post(`/vet-consultations/${consultationId}/messages`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    onSuccess: () => {
      setNewMessage('');
      setSelectedImages([]);
      queryClient.invalidateQueries(['vet-consultation', activeConsultation]);
    }
  });

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consultation?.messages]);

  const handleStartConsultation = () => {
    if (!newConsultationForm.message.trim()) return;

    const formData = new FormData();
    formData.append('farmId', selectedFarm._id);
    formData.append('species', newConsultationForm.species);
    formData.append('message', newConsultationForm.message);
    if (newConsultationForm.livestockId) {
      formData.append('livestockId', newConsultationForm.livestockId);
    }

    startConsultation.mutate(formData);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !activeConsultation) return;

    const formData = new FormData();
    formData.append('message', newMessage);
    selectedImages.forEach(file => {
      formData.append('images', file);
    });

    sendMessage.mutate({ consultationId: activeConsultation, formData });
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    setSelectedImages(prev => [...prev, ...files].slice(0, 5));
  };

  const removeImage = (index) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: 'bg-green-100 text-green-700',
      resolved: 'bg-blue-100 text-blue-700',
      closed: 'bg-gray-100 text-gray-700'
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs ${styles[status] || styles.active}`}>
        {status}
      </span>
    );
  };

  const handleSelectConsultation = (id) => {
    setActiveConsultation(id);
    setShowNewConsultation(false);
    setIsListOpen(false);
  };

  if (!selectedFarm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <PawPrint className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Please select a farm first</p>
          <Link to="/farms" className="text-green-600 hover:underline">Go to Farms</Link>
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
              <h1 className="text-lg sm:text-xl font-semibold truncate">Vet AI Consultation</h1>
              <p className="text-sm text-gray-500 truncate">{selectedFarm.name}</p>
            </div>
          </div>
          <button
            onClick={() => {
              setActiveConsultation(null);
              setShowNewConsultation(true);
              setIsListOpen(false);
            }}
            className="flex items-center justify-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 w-full sm:w-auto"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">New Consultation</span>
            <span className="sm:hidden">New</span>
          </button>
        </div>
      </div>

      <div className="flex h-[calc(100dvh-130px)] md:h-[calc(100vh-130px)] min-h-0">
        {/* Sidebar - Consultation List (desktop) */}
        <div className="hidden md:block w-80 shrink-0 bg-white border-r overflow-y-auto">
          <div className="p-4 border-b">
            <h3 className="font-medium text-gray-700">Your Consultations</h3>
          </div>
          
          {loadingConsultations ? (
            <div className="flex justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-green-600" />
            </div>
          ) : consultations.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No consultations yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {consultations.map(c => (
                <button
                  key={c._id}
                  onClick={() => handleSelectConsultation(c._id)}
                  className={`w-full p-4 text-left hover:bg-gray-50 ${
                    activeConsultation === c._id ? 'bg-green-50 border-l-4 border-green-600' : ''
                  }`}
                >
                  <div className="flex items-start justify-between mb-1">
                    <span className="text-lg">
                      {speciesOptions.find(s => s.value === c.species)?.emoji || '🐾'}
                    </span>
                    {getStatusBadge(c.status)}
                  </div>
                  <p className="font-medium text-sm truncate">
                    {c.title || c.messages?.[0]?.content?.slice(0, 50) || 'New Consultation'}
                  </p>
                  <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                    <Clock className="w-3 h-3" />
                    {new Date(c.createdAt).toLocaleDateString()}
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
                <h3 className="font-medium text-gray-700">Your Consultations</h3>
                <button type="button" onClick={() => setIsListOpen(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>

              {loadingConsultations ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                </div>
              ) : consultations.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <MessageCircle className="w-10 h-10 mx-auto mb-2 text-gray-300" />
                  <p className="text-sm">No consultations yet</p>
                </div>
              ) : (
                <div className="divide-y overflow-y-auto">
                  {consultations.map(c => (
                    <button
                      key={c._id}
                      onClick={() => handleSelectConsultation(c._id)}
                      className={`w-full p-4 text-left hover:bg-gray-50 ${
                        activeConsultation === c._id ? 'bg-green-50 border-l-4 border-green-600' : ''
                      }`}
                    >
                      <div className="flex items-start justify-between mb-1">
                        <span className="text-lg">
                          {speciesOptions.find(s => s.value === c.species)?.emoji || '🐾'}
                        </span>
                        {getStatusBadge(c.status)}
                      </div>
                      <p className="font-medium text-sm truncate">
                        {c.title || c.messages?.[0]?.content?.slice(0, 50) || 'New Consultation'}
                      </p>
                      <div className="flex items-center gap-2 mt-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {new Date(c.createdAt).toLocaleDateString()}
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
            // New Consultation Form
            <div className="flex-1 flex items-center justify-center p-8">
              <div className="w-full max-w-lg bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-lg font-semibold mb-4">Start New Consultation</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Animal Type
                    </label>
                    <select
                      value={newConsultationForm.species}
                      onChange={e => setNewConsultationForm(prev => ({ ...prev, species: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      {speciesOptions.map(s => (
                        <option key={s.value} value={s.value}>
                          {s.emoji} {s.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Specific Animal (Optional)
                    </label>
                    <select
                      value={newConsultationForm.livestockId}
                      onChange={e => setNewConsultationForm(prev => ({ ...prev, livestockId: e.target.value }))}
                      className="w-full border rounded-lg px-3 py-2"
                    >
                      <option value="">General question (no specific animal)</option>
                      {livestock
                        .filter(
                          l =>
                            l.species === newConsultationForm.species ||
                            l._id === newConsultationForm.livestockId
                        )
                        .map(l => (
                          <option key={l._id} value={l._id}>
                            {l.name || l.tagId}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Describe the issue or question
                    </label>
                    <textarea
                      value={newConsultationForm.message}
                      onChange={e => setNewConsultationForm(prev => ({ ...prev, message: e.target.value }))}
                      rows={4}
                      placeholder="Example: My cow has been refusing to eat for 2 days and seems lethargic..."
                      className="w-full border rounded-lg px-3 py-2"
                    />
                  </div>

                  <button
                    onClick={handleStartConsultation}
                    disabled={!newConsultationForm.message.trim() || startConsultation.isPending}
                    className="w-full bg-green-600 text-white py-2 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {startConsultation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Starting...
                      </>
                    ) : (
                      <>
                        <MessageCircle className="w-4 h-4" />
                        Start Consultation
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          ) : activeConsultation && consultation ? (
            // Active Chat
            <>
              {/* Chat Header */}
              <div className="bg-white border-b px-6 py-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">
                      {speciesOptions.find(s => s.value === consultation.species)?.emoji}
                    </span>
                    <div>
                      <h3 className="font-medium">
                        {consultation.title || 'Consultation'}
                      </h3>
                      <p className="text-xs text-gray-500">
                        {consultation.livestock?.name || consultation.livestock?.tagId || 'General'}
                      </p>
                    </div>
                  </div>
                  {getStatusBadge(consultation.status)}
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
                {loadingActive ? (
                  <div className="flex justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin text-green-600" />
                  </div>
                ) : (
                  consultation.messages?.map((msg, idx) => (
                    <div
                      key={idx}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] md:max-w-[70%] rounded-xl px-4 py-3 ${
                          msg.role === 'user'
                            ? 'bg-green-600 text-white'
                            : 'bg-white border shadow-sm'
                        }`}
                      >
                        {msg.imageUrls?.length > 0 && (
                          <div className="flex flex-wrap gap-2 mb-2">
                            {msg.imageUrls.map((url, i) => (
                              <img
                                key={i}
                                src={url}
                                alt="Attachment"
                                className="w-20 h-20 object-cover rounded"
                              />
                            ))}
                          </div>
                        )}
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                        <p className={`text-xs mt-1 ${msg.role === 'user' ? 'text-green-100' : 'text-gray-400'}`}>
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
                    {selectedImages.map((file, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={URL.createObjectURL(file)}
                          alt="Selected"
                          className="w-16 h-16 object-cover rounded"
                        />
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
                    onChange={e => setNewMessage(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                    placeholder="Type your message..."
                    rows={1}
                    className="flex-1 border rounded-lg px-4 py-2 resize-none"
                  />
                  
                  <button
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim() || sendMessage.isPending}
                    className="bg-green-600 text-white p-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {sendMessage.isPending ? (
                      <Loader2 className="w-5 h-5 animate-spin" />
                    ) : (
                      <Send className="w-5 h-5" />
                    )}
                  </button>
                </div>
              </div>
            </>
          ) : (
            // Empty State
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-700">Select a consultation</h3>
                <p className="text-gray-500 mt-1">
                  Choose from the list or start a new one
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
