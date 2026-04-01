import React from 'react';
import { 
  X, 
  Zap, 
  CheckCircle2, 
  Clock, 
  Scaling, 
  Calendar,
  ExternalLink,
  Search,
  Filter
} from 'lucide-react';
import { Button } from './ui/Button';

const PracticesInventoryModal = ({ isOpen, onClose, activities, farm }) => {
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('all');

  if (!isOpen) return null;

  const filteredActivities = activities?.filter(activity => {
    const matchesSearch = activity.practiceId?.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = filterCategory === 'all' || activity.practiceId?.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'soil', 'crop', 'water', 'agroforestry'];

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Practice Registry</h2>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
                {activities?.length || 0} Total Implementations for {farm?.name}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Filters */}
        <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row gap-4 bg-gray-50/50 shrink-0">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input 
              type="text" 
              placeholder="Search practices..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-white border border-gray-200 rounded-xl text-sm font-bold focus:ring-2 focus:ring-indigo-600 outline-none transition-all"
            />
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0 scrollbar-hide">
            {categories.map(cat => (
              <button
                key={cat}
                onClick={() => setFilterCategory(cat)}
                className={`px-4 h-12 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all whitespace-nowrap ${
                  filterCategory === cat 
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' 
                    : 'bg-white border-gray-100 text-gray-400 hover:border-indigo-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-8 space-y-4">
          {filteredActivities?.length > 0 ? (
            filteredActivities.map((activity) => (
              <div 
                key={activity._id} 
                className="group p-6 bg-white border border-gray-100 rounded-[2rem] hover:border-indigo-200 transition-all hover:shadow-xl hover:shadow-indigo-50/50 flex flex-col md:flex-row gap-6 items-start md:items-center"
              >
                <div className="h-16 w-16 rounded-[1.25rem] bg-indigo-50 flex items-center justify-center text-indigo-600 shrink-0 group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 fill-current" />
                </div>
                
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 text-[8px] font-black uppercase tracking-widest border border-indigo-100">
                      {activity.practiceId?.category}
                    </span>
                    <span className="flex items-center gap-1.5 text-green-600 text-[8px] font-black uppercase tracking-widest">
                      <CheckCircle2 className="h-3 w-3" />
                      Verified
                    </span>
                  </div>
                  <h3 className="text-lg font-black text-gray-900 truncate">{activity.practiceId?.name}</h3>
                  <div className="flex flex-wrap gap-x-4 gap-y-1">
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Scaling className="h-3 w-3" />
                      {activity.size} {activity.sizeUnit || farm?.sizeUnit}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Calendar className="h-3 w-3" />
                      {new Date(activity.startDate).toLocaleDateString()}
                    </div>
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      <Clock className="h-3 w-3" />
                      {activity.status}
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 w-full md:w-auto shrink-0">
                  <Button variant="outline" className="flex-1 md:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest border-gray-100 hover:bg-gray-50">
                    Details
                  </Button>
                  {activity.evidenceId && (
                    <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-indigo-600 hover:bg-indigo-50">
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-20">
              <div className="bg-gray-50 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-gray-300" />
              </div>
              <h4 className="text-xl font-black text-gray-900 mb-2">No practices found</h4>
              <p className="text-gray-500 font-medium">Try adjusting your filters or search terms.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-8 bg-gray-50 border-t border-gray-100 text-center shrink-0">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.2em]">
            Sustainable agricultural management powered by AgroGuardian AI
          </p>
        </div>
      </div>
    </div>
  );
};

export default PracticesInventoryModal;
