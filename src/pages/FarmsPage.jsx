import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  Plus, 
  MapPin, 
  MoreVertical, 
  Trash2, 
  Edit2, 
  Search,
  Loader2,
  X,
  Upload,
  ExternalLink,
  Droplets,
  Sprout,
  CloudSun
} from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState, EmptyState } from '../components/ui/States';
import CreateFarmModal from '../components/CreateFarmModal';

const FarmsPage = () => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  const { data: farms, isLoading } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const response = await api.get('/farms');
      return response.data.data || [];
    }
  });

  const filteredFarms = farms?.filter(farm => 
    farm.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    farm.crops?.some(crop => (typeof crop === 'string' ? crop : crop.name).toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-6 bg-card p-6 sm:p-8 rounded-3xl border border-border shadow-sm">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">My Farms</h1>
          <p className="text-muted-foreground mt-1">Manage and monitor all your agricultural assets.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto shrink-0">
          <Plus className="mr-2 h-5 w-5" aria-hidden="true" />
          Add Farm
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="relative flex-1 min-w-0">
          <Search aria-hidden="true" className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground h-5 w-5" />
          <input 
            type="text" 
            aria-label="Search farms by name or crop"
            placeholder="Search by name or crop..."
            className="w-full bg-muted border-none rounded-xl py-3 pl-12 pr-4 text-base focus:ring-2 focus:ring-primary transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Farm Grid */}
      {isLoading ? (
        <LoadingState label="Loading farms..." />
      ) : filteredFarms?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {filteredFarms.map((farm) => (
            <Card key={farm._id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col">
              <div className="relative h-56 overflow-hidden">
                {farm.imageUrl && farm.imageUrl.length > 0 ? (
                  <img src={farm.imageUrl[0]} alt={farm.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center" aria-hidden="true">
                    <MapPin className="h-16 w-16 text-primary/10" aria-hidden="true" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm border border-primary/10">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse" aria-hidden="true" />
                    {farm.status?.charAt(0).toUpperCase() + farm.status?.slice(1) || 'Active'}
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                    {farm.size} {farm.sizeUnit}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-5 sm:p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start gap-2 mb-4 min-w-0">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground truncate group-hover:text-primary transition-colors">{farm.name}</h3>
                    <div className="flex items-center gap-1 text-muted-foreground text-sm min-w-0">
                      <MapPin className="h-4 w-4 shrink-0 text-primary/60" aria-hidden="true" />
                      <span className="truncate">{farm.location.city}, {farm.location.country}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    aria-label="Farm options"
                    aria-haspopup="menu"
                    aria-expanded="false"
                    className="p-2 shrink-0 hover:bg-muted rounded-full text-muted-foreground transition-colors"
                  >
                    <MoreVertical className="h-5 w-5" aria-hidden="true" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-muted/60 p-3 rounded-2xl border border-border min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sprout className="h-3.5 w-3.5 shrink-0 text-green-600" aria-hidden="true" />
                      <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">Main Crops</p>
                    </div>
                    <p className="font-bold text-foreground truncate">{farm.crops?.map(c => (typeof c === 'string' ? c : c.name)).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="bg-muted/60 p-3 rounded-2xl border border-border min-w-0">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Droplets className="h-3.5 w-3.5 shrink-0 text-blue-500" aria-hidden="true" />
                      <p className="text-[10px] uppercase font-bold text-muted-foreground truncate">Irrigation</p>
                    </div>
                    <p className="font-bold text-foreground truncate capitalize">{farm.irrigationType}</p>
                  </div>
                </div>

                <div className="mt-auto flex flex-col sm:flex-row gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold group border-border" asChild>
                    <Link to={`/farms/${farm._id}`}>
                      View Details
                      <ExternalLink className="ml-2 h-4 w-4 opacity-100 transition-all md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 md:translate-x-[-10px] md:group-hover:translate-x-0" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    className="flex-1 rounded-xl h-12 font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                    asChild
                  >
                    <Link to={`/weather?farmId=${encodeURIComponent(farm._id)}`}>
                      View Weather Risk
                      <CloudSun className="ml-2 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          className="py-24"
          icon={<MapPin className="h-8 w-8" aria-hidden="true" />}
          title="Your Farm Portfolio is Empty"
          description={
            searchQuery
              ? "No farms matched your current search criteria."
              : "Register your first farm to unlock AI-powered insights, weather risks, and carbon credit tracking."
          }
          action={
            <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-10 h-14 text-lg font-bold shadow-xl shadow-primary/20">
              Get Started: Add Farm
            </Button>
          }
        />
      )}

      <CreateFarmModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default FarmsPage;
