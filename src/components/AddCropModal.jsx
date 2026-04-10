import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  X,
  Plus,
  Loader2,
  Sprout,
  ChevronDown,
  Search,
  Check
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';

const CATEGORIES = [
  { id: 'cereal', label: 'Cereals (Grains)' },
  { id: 'legume', label: 'Legumes (Pulses)' },
  { id: 'tuber', label: 'Roots & Tubers' },
  { id: 'vegetable', label: 'Vegetables' },
  { id: 'fruit', label: 'Fruits' },
  { id: 'beverage', label: 'Beverage Crops' },
  { id: 'oil', label: 'Oil Crops' },
  { id: 'fiber', label: 'Fiber Crops' },
  { id: 'spice', label: 'Spices' },
  { id: 'latex', label: 'Latex Crops' },
  { id: 'forage', label: 'Forage/Feed' },
];

const AddCropModal = ({ isOpen, onClose, farmId }) => {
  const queryClient = useQueryClient();
  const [selectedCategory, setSelectedCategory] = React.useState('');
  const [selectedCrop, setSelectedCrop] = React.useState('');
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: referenceCrops, isLoading: isLoadingRef } = useQuery({
    queryKey: ['reference-crops', selectedCategory],
    queryFn: async () => {
      const response = await api.get('/practices/reference/crops', {
        params: { category: selectedCategory }
      });
      return response.data.data;
    },
    enabled: !!selectedCategory
  });

  const addCropMutation = useMutation({
    mutationFn: async (cropData) => {
      return await api.post(`/practices/farms/${farmId}/crops`, cropData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['farm', farmId]);
      queryClient.invalidateQueries(['farm-crops', farmId]);
      onClose();
      resetForm();
    }
  });

  const resetForm = () => {
    setSelectedCategory('');
    setSelectedCrop('');
    setSearchQuery('');
  };

  const filteredCrops = React.useMemo(() => {
    if (!referenceCrops) return [];
    return referenceCrops.filter(crop => 
      crop.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [referenceCrops, searchQuery]);

  const handleAdd = () => {
    if (!selectedCategory || !selectedCrop) return;
    addCropMutation.mutate({
      name: selectedCrop,
      category: selectedCategory,
      farmId
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-8 bg-primary text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl backdrop-blur-md">
              <Sprout className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Register Crop</h2>
              <p className="text-white/70 text-xs font-bold uppercase tracking-widest mt-1">Inventory Management</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          {/* Step 1: Category Selection */}
          <div className="space-y-4">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">1. Select Crop Category</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => {
                    setSelectedCategory(cat.id);
                    setSelectedCrop('');
                  }}
                  className={`p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                    selectedCategory === cat.id
                      ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]'
                      : 'bg-gray-50 text-gray-500 border-gray-100 hover:border-primary/30'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: Specific Crop Selection */}
          {selectedCategory && (
            <div className="space-y-4 animate-in slide-in-from-top-4 duration-300">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-1">2. Identify Specific Crop</label>
                {isLoadingRef && <Loader2 className="h-3 w-3 animate-spin text-primary" />}
              </div>
              
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 group-focus-within:text-primary transition-colors" />
                <input 
                  type="text" 
                  placeholder={`Search ${selectedCategory} varieties...`}
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
                {filteredCrops.map((crop) => (
                  <button
                    key={crop}
                    onClick={() => setSelectedCrop(crop)}
                    className={`flex items-center justify-between p-4 rounded-2xl text-xs font-bold transition-all border ${
                      selectedCrop === crop
                        ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-100 hover:bg-gray-50'
                    }`}
                  >
                    {crop}
                    {selectedCrop === crop && <Check className="h-4 w-4 text-green-600" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 flex gap-3">
          <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={onClose}>
            Discard
          </Button>
          <Button 
            disabled={!selectedCrop || addCropMutation.isPending}
            onClick={handleAdd}
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
          >
            {addCropMutation.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Confirm Registration'}
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AddCropModal;
