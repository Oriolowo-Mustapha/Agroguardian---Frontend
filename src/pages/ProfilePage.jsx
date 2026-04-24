import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { 
  User, 
  Phone, 
  Mail, 
  Camera, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  X,
  ChevronRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters').optional(),
  lastName: z.string().min(2, 'Last name must be at least 2 characters').optional(),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format').optional().or(z.literal('')),
});

const EditProfileModal = ({ isOpen, onClose, field, initialValue, label }) => {
  const queryClient = useQueryClient();
  const { updateUser } = useAuthStore();
  const [error, setError] = React.useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: { [field]: initialValue || '' },
  });

  React.useEffect(() => {
    if (isOpen) reset({ [field]: initialValue || '' });
  }, [isOpen, field, initialValue, reset]);

  const mutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.patch('/auth/profile', data);
      return response.data.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries(['profile']);
      updateUser(data);
      onClose();
    },
    onError: (err) => {
      setError(err.response?.data?.message || 'Failed to update field');
    },
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <Card className="w-full max-w-md bg-white rounded-[2.5rem] border-none shadow-2xl overflow-hidden animate-in zoom-in-95">
        <CardHeader className="p-8 bg-gray-50/50 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-black text-gray-900 uppercase">Update {label}</CardTitle>
            <CardDescription className="font-bold">Modify your account information below.</CardDescription>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors"><X className="h-5 w-5 text-gray-500" /></button>
        </CardHeader>
        <form onSubmit={handleSubmit((data) => mutation.mutate(data))} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-xs font-bold border border-red-100 flex items-center gap-3">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">{label}</label>
            <Input
              {...register(field)}
              autoFocus
              placeholder={`Enter your ${label.toLowerCase()}`}
              className={`h-14 rounded-2xl font-bold px-6 ${errors[field] ? 'border-red-500' : 'border-gray-100 bg-gray-50'}`}
            />
            {errors[field] && <p className="text-xs text-red-500 ml-2 font-bold">{errors[field].message}</p>}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold border-gray-200">Cancel</Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
              {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

const InfoRow = ({ label, value, icon: Icon, onEdit, isLocked }) => (
  <div className="flex items-center justify-between p-6 rounded-[2rem] bg-gray-50/50 border border-gray-100 group hover:bg-white hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-2xl bg-white shadow-sm text-gray-400 group-hover:text-primary transition-colors">
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-sm font-black ${isLocked ? 'text-gray-500' : 'text-gray-900'}`}>{value || 'Not provided'}</p>
      </div>
    </div>
    {!isLocked && (
      <button 
        onClick={onEdit}
        className="p-2 rounded-xl text-gray-400 hover:text-primary hover:bg-primary/5 transition-all opacity-0 group-hover:opacity-100"
      >
        <Edit3 className="h-5 w-5" />
      </button>
    )}
    {isLocked && <div className="px-3 py-1 rounded-lg bg-gray-100 text-[8px] font-black text-gray-400 uppercase tracking-tighter">Verified</div>}
  </div>
);

const ProfilePage = () => {
  const { user: storeUser, updateUser: updateStoreUser } = useAuthStore();
  const [modalConfig, setModalConfig] = React.useState({ isOpen: false, field: '', label: '', initialValue: '' });

  const { data: user, isLoading, isError } = useQuery({
    queryKey: ['profile'],
    queryFn: async () => {
      const response = await api.get('/auth/profile');
      return response.data.data;
    },
    // Sync store with fresh DB data
    onSuccess: (data) => {
        if (JSON.stringify(data) !== JSON.stringify(storeUser)) {
            updateStoreUser(data);
        }
    }
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-10 w-10 text-primary animate-spin" />
        <p className="text-gray-500 font-black uppercase tracking-widest text-xs">Accessing Database...</p>
      </div>
    );
  }

  if (isError) {
    return (
        <div className="text-center py-20 bg-red-50 rounded-[3rem] border border-red-100 p-8">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-black text-gray-900 uppercase">Sync Failed</h3>
            <p className="text-red-600 font-bold mt-2">Could not retrieve your profile from the server.</p>
            <Button onClick={() => window.location.reload()} className="mt-6 rounded-2xl h-12 px-8 font-black">Retry Connection</Button>
        </div>
    )
  }

  const openModal = (field, label, initialValue) => {
    setModalConfig({ isOpen: true, field, label, initialValue });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-8 bg-white p-10 rounded-[3.5rem] border border-gray-100 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
            <User className="h-32 w-32" />
        </div>
        
        <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-primary p-1 shadow-2xl relative group cursor-pointer">
          <div className="bg-white h-full w-full rounded-[2.25rem] flex items-center justify-center overflow-hidden">
            {user?.profilePicture ? (
                <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
            ) : (
                <span className="text-4xl font-black text-primary">{user?.firstName?.charAt(0)}</span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-[2.25rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <Camera className="text-white h-8 w-8" />
          </div>
        </div>
        
        <div className="text-center md:text-left space-y-2">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h1 className="text-4xl font-black text-gray-900 tracking-tighter capitalize">{user?.firstName} {user?.lastName}</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-3 w-3" /> Verified Farmer
            </div>
          </div>
          <p className="text-gray-500 font-bold flex items-center justify-center md:justify-start gap-2">
            <Mail className="h-4 w-4 text-primary" />
            {user?.email}
          </p>
          <div className="flex items-center justify-center md:justify-start gap-4 pt-2">
              <div className="text-center md:text-left">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Member Since</span>
                  <span className="text-sm font-bold text-gray-700">{new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="h-8 w-px bg-gray-100 mx-2" />
              <div className="text-center md:text-left">
                  <span className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Access Role</span>
                  <span className="text-sm font-bold text-primary uppercase">{user?.role || 'Farmer'}</span>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-6 flex items-center gap-3">
                <span className="h-px w-8 bg-gray-200" /> Identity Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <InfoRow 
                    label="First Name" 
                    value={user?.firstName} 
                    icon={User} 
                    onEdit={() => openModal('firstName', 'First Name', user.firstName)} 
                />
                <InfoRow 
                    label="Last Name" 
                    value={user?.lastName} 
                    icon={User} 
                    onEdit={() => openModal('lastName', 'Last Name', user.lastName)} 
                />
            </div>
        </section>

        <section className="space-y-4">
            <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.3em] ml-6 flex items-center gap-3">
                <span className="h-px w-8 bg-gray-200" /> Communication Channels
            </h3>
            <div className="space-y-4">
                <InfoRow 
                    label="Email Address" 
                    value={user?.email} 
                    icon={Mail} 
                    isLocked 
                />
                <InfoRow 
                    label="Mobile Number" 
                    value={user?.phoneNumber} 
                    icon={Phone} 
                    onEdit={() => openModal('phoneNumber', 'Phone Number', user.phoneNumber)} 
                />
            </div>
            <div className="bg-amber-50 p-6 rounded-[2.5rem] border border-amber-100 flex items-start gap-4 mx-2">
                <div className="p-3 rounded-2xl bg-amber-100 shrink-0">
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                </div>
                <div>
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-tight">SMS Alert Integration</h4>
                    <p className="text-xs text-amber-700 font-bold mt-1 leading-relaxed">
                        Adding your mobile number enables critical real-time SMS alerts for severe weather events and disease outbreaks in your local region.
                    </p>
                </div>
            </div>
        </section>
      </div>

      <EditProfileModal 
        isOpen={modalConfig.isOpen}
        onClose={() => setModalConfig({ ...modalConfig, isOpen: false })}
        field={modalConfig.field}
        label={modalConfig.label}
        initialValue={modalConfig.initialValue}
      />
    </div>
  );
};

export default ProfilePage;
