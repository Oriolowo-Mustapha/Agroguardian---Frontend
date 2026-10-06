import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Loader2,
  Sprout,
  Search,
  Check
} from 'lucide-react';
import api from '../lib/axios';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import ModalShell from './ui/ModalShell';

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

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      title="Register Crop"
      description={<span className="text-xs font-bold uppercase tracking-widest">Inventory Management</span>}
      icon={
        <span className="rounded-xl bg-white/20 p-2 backdrop-blur-md">
          <Sprout className="h-6 w-6" aria-hidden="true" />
        </span>
      }
      size="md"
      headerClassName="bg-primary text-white border-none"
      footer={
        <>
          <Button variant="outline" className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs" onClick={onClose}>
            Discard
          </Button>
          <Button 
            loading={addCropMutation.isPending}
            disabled={!selectedCrop}
            onClick={handleAdd}
            className="flex-1 h-14 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-primary/20"
          >
            Confirm Registration
          </Button>
        </>
      }
    >
      <div className="space-y-8">
        {/* Step 1: Category Selection */}
        <div className="space-y-4">
          <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1">1. Select Crop Category</label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                type="button"
                aria-pressed={selectedCategory === cat.id}
                onClick={() => {
                  setSelectedCategory(cat.id);
                  setSelectedCrop('');
                }}
                className={`p-3 rounded-2xl text-[10px] font-black uppercase tracking-tight transition-all border ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]'
                    : 'bg-muted text-muted-foreground border-border hover:border-primary/30'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: Specific Crop Selection */}
        {selectedCategory && (
          <div className="space-y-4 motion-safe:animate-in motion-safe:slide-in-from-top-4 motion-safe:duration-300">
            <div className="flex justify-between items-center gap-3">
              <label className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] ml-1 min-w-0">2. Identify Specific Crop</label>
              {isLoadingRef && <Loader2 className="h-3 w-3 animate-spin text-primary shrink-0" aria-hidden="true" />}
            </div>
            
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" aria-hidden="true" />
              <Input 
                type="text" 
                aria-label="Search crop varieties"
                placeholder={`Search ${selectedCategory} varieties...`}
                className="h-12 pl-12 pr-4 rounded-2xl bg-muted border-border font-bold"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[200px] overflow-y-auto pr-2 scrollbar-thin scrollbar-thumb-gray-200">
              {filteredCrops.map((crop) => (
                <button
                  key={crop}
                  type="button"
                  aria-pressed={selectedCrop === crop}
                  onClick={() => setSelectedCrop(crop)}
                  className={`flex items-center justify-between gap-2 p-4 rounded-2xl text-xs font-bold transition-all border ${
                    selectedCrop === crop
                      ? 'bg-green-50 text-green-700 border-green-200 shadow-sm'
                      : 'bg-card text-foreground border-border hover:bg-muted'
                  }`}
                >
                  <span className="min-w-0 truncate">{crop}</span>
                  {selectedCrop === crop && <Check className="h-4 w-4 text-green-600 shrink-0" aria-hidden="true" />}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </ModalShell>
  );
};

export default AddCropModal;
