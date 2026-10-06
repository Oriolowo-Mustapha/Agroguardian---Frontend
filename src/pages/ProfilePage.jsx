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
  CheckCircle2, 
  AlertCircle, 
  Edit3, 
  ChevronRight,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { LoadingState } from '../components/ui/States';
import ModalShell from '../components/ui/ModalShell';
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

  return (
    <ModalShell
      open={isOpen}
      onClose={onClose}
      size="sm"
      title={`Update ${label}`}
      description="Modify your account information below."
      headerClassName="bg-muted/50"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} className="flex-1 h-12 rounded-2xl font-bold">
            Cancel
          </Button>
          <Button type="submit" form="edit-profile-form" loading={mutation.isPending} className="flex-1 h-12 rounded-2xl font-black shadow-lg shadow-primary/20">
            Save Changes
          </Button>
        </>
      }
    >
      <form id="edit-profile-form" onSubmit={handleSubmit((data) => mutation.mutate(data))} className="space-y-6">
        {error && (
          <div role="alert" className="bg-destructive/10 text-destructive p-4 rounded-2xl text-xs font-bold border border-destructive/20 flex items-center gap-3">
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" /> {error}
          </div>
        )}
        <div className="space-y-2">
          <label htmlFor="edit-profile-input" className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-2">
            {label}
          </label>
          <Input
            id="edit-profile-input"
            {...register(field)}
            autoFocus
            placeholder={`Enter your ${label.toLowerCase()}`}
            aria-invalid={errors[field] ? true : undefined}
            className={`h-14 rounded-2xl font-bold px-6 ${errors[field] ? 'border-destructive' : ''}`}
          />
          {errors[field] && <p role="alert" className="text-xs text-destructive ml-2 font-bold">{errors[field].message}</p>}
        </div>
      </form>
    </ModalShell>
  );
};

const InfoRow = ({ label, value, icon: Icon, onEdit, isLocked }) => (
  <div className="flex items-center justify-between gap-3 p-5 sm:p-6 rounded-[2rem] bg-muted/50 border border-border group hover:bg-card hover:shadow-md transition-all duration-300">
    <div className="flex items-center gap-4 min-w-0">
      <div className="p-3 rounded-2xl bg-card shadow-sm text-muted-foreground group-hover:text-primary transition-colors shrink-0" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-0.5">{label}</p>
        <p className={`text-sm font-black truncate ${isLocked ? 'text-muted-foreground' : 'text-foreground'}`}>{value || 'Not provided'}</p>
      </div>
    </div>
    {!isLocked && (
      <button 
        type="button"
        onClick={onEdit}
        aria-label={`Edit ${label}`}
        className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/5 transition-all shrink-0 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Edit3 className="h-5 w-5" aria-hidden="true" />
      </button>
    )}
    {isLocked && <div className="px-3 py-1 rounded-lg bg-muted text-[10px] font-black text-muted-foreground uppercase tracking-tighter shrink-0">Verified</div>}
  </div>
);

const ProfilePage = () => {
  const { user: storeUser, updateUser: updateStoreUser } = useAuthStore();
  const [modalConfig, setModalConfig] = React.useState({ isOpen: false, field: '', label: '', initialValue: '' });
  const [avatarImgError, setAvatarImgError] = React.useState(false);

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
    return <LoadingState label="Accessing Database..." className="min-h-[60vh]" />;
  }

  if (isError) {
    return (
        <div role="alert" className="text-center py-16 sm:py-20 px-6 bg-destructive/10 rounded-[3rem] border border-destructive/20">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" aria-hidden="true" />
            <h3 className="text-xl font-black text-foreground uppercase">Sync Failed</h3>
            <p className="text-destructive font-bold mt-2">Could not retrieve your profile from the server.</p>
            <Button onClick={() => window.location.reload()} className="mt-6 rounded-2xl h-12 px-8 font-black">Retry Connection</Button>
        </div>
    )
  }

  const openModal = (field, label, initialValue) => {
    setModalConfig({ isOpen: true, field, label, initialValue });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-16 motion-safe:animate-in motion-safe:fade-in motion-safe:duration-500">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 sm:gap-8 bg-card p-6 sm:p-10 rounded-[2.5rem] sm:rounded-[3.5rem] border border-border shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5" aria-hidden="true">
            <User className="h-32 w-32" />
        </div>
        
        <div className="h-32 w-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500 to-primary p-1 shadow-2xl relative group shrink-0">
          <div className="bg-card h-full w-full rounded-[2.25rem] flex items-center justify-center overflow-hidden">
            {user?.profilePicture && !avatarImgError ? (
                <img
                  src={user.profilePicture}
                  alt={`${user?.firstName || 'User'} ${user?.lastName || ''}`.trim()}
                  className="h-full w-full object-cover"
                  onError={() => setAvatarImgError(true)}
                />
            ) : (
                <span className="text-4xl font-black text-primary">{(user?.firstName || user?.lastName || user?.email || 'U')?.toString?.().charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div className="absolute inset-0 bg-black/40 rounded-[2.25rem] opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" aria-hidden="true">
            <Camera className="text-white h-8 w-8" />
          </div>
        </div>
        
        <div className="text-center md:text-left space-y-2 min-w-0">
          <div className="flex flex-col md:flex-row items-center gap-3">
            <h1 className="text-3xl sm:text-4xl font-black text-foreground tracking-tighter capitalize break-words">{user?.firstName} {user?.lastName}</h1>
            <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-50 text-green-600 border border-green-100 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-3 w-3" aria-hidden="true" /> Verified Farmer
            </div>
          </div>
          <p className="text-muted-foreground font-bold flex items-center justify-center md:justify-start gap-2 min-w-0">
            <Mail className="h-4 w-4 text-primary shrink-0" aria-hidden="true" />
            <span className="truncate">{user?.email}</span>
          </p>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-4 gap-y-2 pt-2">
              <div className="text-center md:text-left">
                  <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Member Since</span>
                  <span className="text-sm font-bold text-foreground">{new Date(user?.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
              </div>
              <div className="h-8 w-px bg-border mx-2" aria-hidden="true" />
              <div className="text-center md:text-left">
                  <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest">Access Role</span>
                  <span className="text-sm font-bold text-primary uppercase">{user?.role || 'Farmer'}</span>
              </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        <section className="space-y-4">
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] ml-6 flex items-center gap-3">
                <span className="h-px w-8 bg-border" aria-hidden="true" /> Identity Information
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
            <h3 className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] ml-6 flex items-center gap-3">
                <span className="h-px w-8 bg-border" aria-hidden="true" /> Communication Channels
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
            <div className="bg-amber-50 p-5 sm:p-6 rounded-[2rem] sm:rounded-[2.5rem] border border-amber-100 flex items-start gap-4">
                <div className="p-3 rounded-2xl bg-amber-100 shrink-0" aria-hidden="true">
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
