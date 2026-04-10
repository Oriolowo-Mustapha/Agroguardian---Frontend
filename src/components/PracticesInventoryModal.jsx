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
  Filter,
  ArrowLeft,
  FileText,
  MapPin,
  Leaf,
  AlertCircle
} from 'lucide-react';
import { Button } from './ui/Button';
import CompleteActivityModal from './CompleteActivityModal';

const PracticesInventoryModal = ({ isOpen, onClose, activities, farm, farmId }) => {
  const [isCompleteOpen, setIsCompleteOpen] = React.useState(false);
  const [activityToComplete, setActivityToComplete] = React.useState(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterCategory, setFilterCategory] = React.useState('all');
  const [selectedActivity, setSelectedActivity] = React.useState(null);

  if (!isOpen) return null;

  const filteredActivities = (activities || []).filter((activity) => {
    const practiceName = (activity.practiceId?.name || '').toLowerCase();
    const matchesSearch = practiceName.includes((searchTerm || '').toLowerCase());
    const matchesCategory = filterCategory === 'all' || activity.practiceId?.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = ['all', 'soil', 'crop', 'water', 'agroforestry'];

  const handleClose = () => {
    setSelectedActivity(null);
    onClose();
  };

  // Detail view for selected activity
  if (selectedActivity) {
    return (
      <>
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-[2.5rem] w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
          {/* Header */}
          <div className="p-8 bg-indigo-600 text-white shrink-0">
            <button 
              onClick={() => setSelectedActivity(null)} 
              className="flex items-center gap-2 text-indigo-100 hover:text-white mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-xs font-bold uppercase tracking-widest">Back to Registry</span>
            </button>
            <div className="flex items-center gap-4">
              <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="px-2 py-0.5 rounded-md bg-white/20 text-white text-[8px] font-black uppercase tracking-widest">
                  {selectedActivity.practiceId?.category}
                </span>
                <h2 className="text-2xl font-black tracking-tight leading-tight mt-1">{selectedActivity.practiceId?.name}</h2>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-8 space-y-6">
            {/* Status Card */}
            {(() => {
              const status = selectedActivity.status;
              const isCompleted = status === 'completed';
              const isFailed = status === 'failed';
              const isVerifying = status === 'pending_end';
              const showComplete = status === 'active' || status === 'pending_start';
              const statusLabel = status === 'pending_start' ? 'in progress' : status === 'pending_end' ? 'verifying' : status;

              const gate = selectedActivity?.completionEligibility;
              const tooEarly = gate && gate.isMatured === false;
              const disableReason = tooEarly
                ? (gate.blockedReason || `Too early: wait ~${gate.remainingDaysToMin} more day(s) for crop maturity.`)
                : '';

              const statusStyles = isCompleted
                ? { wrap: 'bg-green-50 border-green-100', iconWrap: 'bg-green-100', icon: <CheckCircle2 className="h-5 w-5 text-green-600" />, label: 'Completed' }
                : isFailed
                  ? { wrap: 'bg-red-50 border-red-100', iconWrap: 'bg-red-100', icon: <AlertCircle className="h-5 w-5 text-red-600" />, label: 'Failed' }
                  : isVerifying
                    ? { wrap: 'bg-amber-50 border-amber-100', iconWrap: 'bg-amber-100', icon: <Clock className="h-5 w-5 text-amber-600" />, label: 'Verifying' }
                    : { wrap: 'bg-gray-50 border-gray-100', iconWrap: 'bg-gray-100', icon: <Clock className="h-5 w-5 text-gray-600" />, label: 'In progress' };

              return (
                <div className={`p-5 ${statusStyles.wrap} border rounded-2xl flex items-center justify-between gap-4`}>
                  <div className="flex items-center gap-4">
                    <div className={`${statusStyles.iconWrap} p-2 rounded-xl`}>{statusStyles.icon}</div>
                    <div>
                      <p className="text-xs font-black uppercase tracking-widest text-gray-500">Status</p>
                      <p className="text-lg font-black text-gray-900">{statusLabel}</p>
                    </div>
                  </div>

                  {showComplete && (
                    <Button
                      onClick={() => {
                        setActivityToComplete(selectedActivity);
                        setIsCompleteOpen(true);
                      }}
                      disabled={tooEarly}
                      title={disableReason}
                      className="h-10 rounded-xl font-black uppercase text-[10px] tracking-widest bg-indigo-600"
                    >
                      Upload Evidence
                    </Button>
                  )}
                </div>
              );
            })()}

            {/* Details Grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-5 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Scaling className="h-4 w-4 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Area Size</p>
                </div>
                <p className="text-xl font-black text-gray-900">{selectedActivity.size} {selectedActivity.sizeUnit || farm?.sizeUnit}</p>
              </div>
              <div className="p-5 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date</p>
                </div>
                <p className="text-xl font-black text-gray-900">
                  {new Date(selectedActivity.startDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
              </div>
              {selectedActivity.endDate && (
                <div className="p-5 bg-gray-50 rounded-2xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Clock className="h-4 w-4 text-gray-400" />
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date</p>
                  </div>
                  <p className="text-xl font-black text-gray-900">
                    {new Date(selectedActivity.endDate).toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })}
                  </p>
                </div>
              )}
              <div className="p-5 bg-gray-50 rounded-2xl">
                <div className="flex items-center gap-2 mb-2">
                  <MapPin className="h-4 w-4 text-gray-400" />
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Farm</p>
                </div>
                <p className="text-xl font-black text-gray-900">{farm?.name}</p>
              </div>
            </div>

            {/* Description */}
            {selectedActivity.practiceId?.description && (
              <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-indigo-500" />
                  <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">Practice Description</p>
                </div>
                <p className="text-sm font-medium text-indigo-900 leading-relaxed">{selectedActivity.practiceId?.description}</p>
              </div>
            )}

            {/* Carbon Impact */}
            {selectedActivity.practiceId?.carbonMultiplier && (
              <div className="p-5 bg-green-50 border border-green-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <Leaf className="h-4 w-4 text-green-500" />
                  <p className="text-[10px] font-black text-green-500 uppercase tracking-widest">Carbon Impact</p>
                </div>
                <p className="text-2xl font-black text-green-900">{selectedActivity.practiceId?.carbonMultiplier}x <span className="text-sm font-bold text-green-600">multiplier</span></p>
              </div>
            )}

            {/* Notes */}
            {selectedActivity.notes && (
              <div className="p-5 bg-amber-50 border border-amber-100 rounded-2xl">
                <div className="flex items-center gap-2 mb-3">
                  <FileText className="h-4 w-4 text-amber-500" />
                  <p className="text-[10px] font-black text-amber-500 uppercase tracking-widest">Notes</p>
                </div>
                <p className="text-sm font-medium text-amber-900 leading-relaxed">{selectedActivity.notes}</p>
              </div>
            )}
          </div>

          {/* Footer */}
            <div className="p-6 bg-gray-50 border-t border-gray-100 shrink-0">
              <Button onClick={() => setSelectedActivity(null)} className="w-full h-12 rounded-2xl font-black">
                Back to Registry
              </Button>
            </div>
          </div>
        </div>

        <CompleteActivityModal
          isOpen={isCompleteOpen}
          onClose={() => {
            setIsCompleteOpen(false);
            setActivityToComplete(null);
          }}
          activity={activityToComplete}
          farmId={farmId || farm?._id}
        />
      </>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="bg-white rounded-[2.5rem] w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col h-[85vh]">
        {/* Header */}
        <div className="p-8 bg-indigo-600 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black tracking-tight leading-none">Practice Logs</h2>
              <p className="text-indigo-100 text-xs font-bold uppercase tracking-widest mt-1">
                {activities?.length || 0} Total Implementations for {farm?.name}
              </p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
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
            filteredActivities.map((activity) => {
              const status = activity.status;
              const isCompleted = status === 'completed';
              const isFailed = status === 'failed';
              const isVerifying = status === 'pending_end';

              const statusLabel = status === 'pending_start' ? 'in progress' : status === 'pending_end' ? 'verifying' : status;
              const showComplete = status === 'active' || status === 'pending_start';

              const gate = activity?.completionEligibility;
              const tooEarly = gate && gate.isMatured === false;
              const disableReason = tooEarly
                ? (gate.blockedReason || `Too early: wait ~${gate.remainingDaysToMin} more day(s) for crop maturity.`)
                : '';

              return (
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
                      {(() => {
                        if (isCompleted) {
                          return (
                            <span className="flex items-center gap-1.5 text-green-600 text-[8px] font-black uppercase tracking-widest">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified
                            </span>
                          );
                        }

                        if (isFailed) {
                          return (
                            <span className="flex items-center gap-1.5 text-red-600 text-[8px] font-black uppercase tracking-widest">
                              <AlertCircle className="h-3 w-3" />
                              Failed
                            </span>
                          );
                        }

                        if (isVerifying) {
                          return (
                            <span className="flex items-center gap-1.5 text-amber-600 text-[8px] font-black uppercase tracking-widest">
                              <Clock className="h-3 w-3" />
                              Verifying
                            </span>
                          );
                        }

                        return (
                          <span className="flex items-center gap-1.5 text-gray-500 text-[8px] font-black uppercase tracking-widest">
                            <Clock className="h-3 w-3" />
                            {statusLabel}
                          </span>
                        );
                      })()}
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
                        {statusLabel}
                      </div>
                      {tooEarly && (
                        <div
                          className="flex items-center gap-1.5 text-[10px] font-black text-red-600 uppercase tracking-widest"
                          title={gate?.blockedReason || ''}
                        >
                          <AlertCircle className="h-3 w-3" />
                          {gate?.blockedReason ? 'Locked' : `Locked (~${gate.remainingDaysToMin}d)`}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 w-full md:w-auto shrink-0">
                    <Button 
                      variant="outline" 
                      onClick={() => setSelectedActivity(activity)}
                      className="flex-1 md:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest border-gray-100 hover:bg-gray-50"
                    >
                      Details
                    </Button>

                    {showComplete && (
                      <Button
                        onClick={() => {
                          setActivityToComplete(activity);
                          setIsCompleteOpen(true);
                        }}
                        disabled={tooEarly}
                        title={disableReason}
                        className="flex-1 md:flex-none h-10 rounded-xl font-black uppercase text-[10px] tracking-widest bg-indigo-600"
                      >
                        Complete
                      </Button>
                    )}

                    {(activity.startEvidenceId || activity.endEvidenceId) && (
                      <Button variant="ghost" className="h-10 w-10 p-0 rounded-xl text-indigo-600 hover:bg-indigo-50" title="Evidence exists">
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
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

      <CompleteActivityModal
        isOpen={isCompleteOpen}
        onClose={() => {
          setIsCompleteOpen(false);
          setActivityToComplete(null);
        }}
        activity={activityToComplete}
        farmId={farmId || farm?._id}
      />
    </>
  );
};

export default PracticesInventoryModal;
