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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">My Farms</h1>
          <p className="text-gray-500 mt-1">Manage and monitor all your agricultural assets.</p>
        </div>
        <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-8 h-12 text-lg font-bold shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 w-full sm:w-auto">
          <Plus className="mr-2 h-5 w-5" />
          Add Farm
        </Button>
      </div>

      {/* Search & Filter */}
      <div className="flex items-center gap-4 bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 h-5 w-5" />
          <input 
            type="text" 
            placeholder="Search by name or crop..."
            className="w-full bg-gray-50 border-none rounded-xl py-3 pl-12 pr-4 text-sm focus:ring-2 focus:ring-primary transition-all outline-none"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Farm Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-[450px] bg-white rounded-3xl border border-gray-100 animate-pulse" />
          ))}
        </div>
      ) : filteredFarms?.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filteredFarms.map((farm) => (
            <Card key={farm._id} className="group overflow-hidden border-none shadow-sm hover:shadow-xl transition-all duration-300 rounded-3xl flex flex-col">
              <div className="relative h-56 overflow-hidden">
                {farm.imageUrl && farm.imageUrl.length > 0 ? (
                  <img src={farm.imageUrl[0]} alt={farm.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                ) : (
                  <div className="w-full h-full bg-primary/5 flex items-center justify-center">
                    <MapPin className="h-16 w-16 text-primary/10" />
                  </div>
                )}
                <div className="absolute top-4 right-4">
                  <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-bold text-primary flex items-center gap-1.5 shadow-sm border border-primary/10">
                    <span className="h-2 w-2 bg-primary rounded-full animate-pulse" />
                    {farm.status?.charAt(0).toUpperCase() + farm.status?.slice(1) || 'Active'}
                  </div>
                </div>
                <div className="absolute bottom-4 left-4 flex gap-2">
                  <div className="bg-black/40 backdrop-blur-md px-3 py-1 rounded-lg text-[10px] font-bold text-white uppercase tracking-wider border border-white/20">
                    {farm.size} {farm.sizeUnit}
                  </div>
                </div>
              </div>
              
              <CardContent className="p-6 flex-1 flex flex-col">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-gray-900 group-hover:text-primary transition-colors">{farm.name}</h3>
                    <div className="flex items-center gap-1 text-gray-500 text-sm">
                      <MapPin className="h-4 w-4 text-primary/60" />
                      {farm.location.city}, {farm.location.country}
                    </div>
                  </div>
                  <button className="p-2 hover:bg-gray-100 rounded-full text-gray-400 transition-colors">
                    <MoreVertical className="h-5 w-5" />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-6">
                  <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Sprout className="h-3.5 w-3.5 text-green-600" />
                      <p className="text-[10px] uppercase font-bold text-gray-400">Main Crops</p>
                    </div>
                    <p className="font-bold text-gray-700 truncate">{farm.crops?.map(c => (typeof c === 'string' ? c : c.name)).join(', ') || 'N/A'}</p>
                  </div>
                  <div className="bg-gray-50/80 p-3 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <Droplets className="h-3.5 w-3.5 text-blue-500" />
                      <p className="text-[10px] uppercase font-bold text-gray-400">Irrigation</p>
                    </div>
                    <p className="font-bold text-gray-700 capitalize">{farm.irrigationType}</p>
                  </div>
                </div>

                <div className="mt-auto flex gap-3">
                  <Button variant="outline" className="flex-1 rounded-xl h-12 font-bold group border-gray-200" asChild>
                    <Link to={`/farms/${farm._id}`}>
                      View Details
                      <ExternalLink className="ml-2 h-4 w-4 opacity-0 group-hover:opacity-100 transition-all translate-x-[-10px] group-hover:translate-x-0" />
                    </Link>
                  </Button>
                  <Button
                    className="flex-1 rounded-xl h-12 font-bold bg-primary text-white hover:bg-primary/90 shadow-lg shadow-primary/20"
                    asChild
                  >
                    <Link to={`/weather?farmId=${encodeURIComponent(farm._id)}`}>
                      View Weather Risk
                      <CloudSun className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100 shadow-sm">
          <div className="bg-primary/5 h-28 w-28 rounded-full flex items-center justify-center mx-auto mb-8 animate-bounce-slow">
            <MapPin className="h-14 w-14 text-primary/30" />
          </div>
          <h3 className="text-3xl font-bold text-gray-900 mb-3">Your Farm Portfolio is Empty</h3>
          <p className="text-gray-500 mb-10 max-w-md mx-auto text-lg">
            {searchQuery ? "No farms matched your current search criteria." : "Register your first farm to unlock AI-powered insights, weather risks, and carbon credit tracking."}
          </p>
          <Button onClick={() => setIsModalOpen(true)} className="rounded-full px-10 h-14 text-lg font-bold shadow-xl shadow-primary/20">
            Get Started: Add Farm
          </Button>
        </div>
      )}

      <CreateFarmModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
      />
    </div>
  );
};

export default FarmsPage;
