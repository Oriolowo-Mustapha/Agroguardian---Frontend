import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, Mail, Camera, Loader2, CheckCircle2, AlertCircle, Save } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';

const nameSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
});

const contactSchema = z.object({
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (e.g. +234...)').optional().or(z.literal('')),
});

const ProfileSection = ({ title, description, children, onSubmit, isLoading, isSuccess, error }) => (
  <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
    <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <CardTitle className="text-xl font-black text-gray-900 uppercase tracking-tight">{title}</CardTitle>
          <CardDescription className="font-medium">{description}</CardDescription>
        </div>
        <Button 
          onClick={onSubmit} 
          disabled={isLoading} 
          className="rounded-2xl h-12 px-6 font-black shadow-lg shadow-primary/20"
        >
          {isLoading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Update {title.split(' ')[0]}
        </Button>
      </div>
    </CardHeader>
    <CardContent className="p-8">
      {error && (
        <div className="mb-6 bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
          <AlertCircle className="h-5 w-5" /> {error}
        </div>
      )}
      {isSuccess && (
        <div className="mb-6 bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-bold border border-green-100 flex items-center gap-3">
          <CheckCircle2 className="h-5 w-5" /> Updated successfully!
        </div>
      )}
      {children}
    </CardContent>
  </Card>
);

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const [activeSection, setActiveSection] = React.useState(null); // 'names', 'contact'
  const [successSection, setSuccessSection] = React.useState(null);
  const [error, setError] = React.useState('');

  const nameForm = useForm({
    resolver: zodResolver(nameSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
    },
  });

  const contactForm = useForm({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Sync with store
  React.useEffect(() => {
    if (user) {
      nameForm.reset({ firstName: user.firstName, lastName: user.lastName });
      contactForm.reset({ phoneNumber: user.phoneNumber || '' });
    }
  }, [user, nameForm, contactForm]);

  const onUpdateNames = async (data) => {
    setActiveSection('names');
    setError('');
    try {
      const response = await api.patch('/auth/profile', data);
      updateUser(response.data.data);
      setSuccessSection('names');
      setTimeout(() => setSuccessSection(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update names');
    } finally {
      setActiveSection(null);
    }
  };

  const onUpdateContact = async (data) => {
    setActiveSection('contact');
    setError('');
    try {
      const response = await api.patch('/auth/profile', data);
      updateUser(response.data.data);
      setSuccessSection('contact');
      setTimeout(() => setSuccessSection(null), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update contact info');
    } finally {
      setActiveSection(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      {/* Profile Header */}
      <div className="flex flex-col md:flex-row items-center gap-6 bg-white p-8 rounded-[3rem] border border-gray-100 shadow-sm">
        <div className="h-28 w-28 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center border-4 border-white shadow-xl text-indigo-600 relative group overflow-hidden shrink-0">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-12 w-12" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Camera className="text-white h-6 w-6" />
          </div>
        </div>
        <div className="text-center md:text-left">
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter">Account Center</h1>
          <p className="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest flex items-center justify-center md:justify-start gap-2">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            Active Session: {user?.email}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Names Section */}
        <ProfileSection 
          title="Identity Details" 
          description="Your legal names used for certificates and reports."
          onSubmit={nameForm.handleSubmit(onUpdateNames)}
          isLoading={activeSection === 'names'}
          isSuccess={successSection === 'names'}
          error={activeSection === 'names' ? error : ''}
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">First Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  {...nameForm.register('firstName')}
                  className={`pl-12 h-14 rounded-2xl font-bold ${nameForm.formState.errors.firstName ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                />
              </div>
              {nameForm.formState.errors.firstName && <p className="text-xs text-red-500 ml-2 font-bold">{nameForm.formState.errors.firstName.message}</p>}
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Last Name</label>
              <div className="relative">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  {...nameForm.register('lastName')}
                  className={`pl-12 h-14 rounded-2xl font-bold ${nameForm.formState.errors.lastName ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                />
              </div>
              {nameForm.formState.errors.lastName && <p className="text-xs text-red-500 ml-2 font-bold">{nameForm.formState.errors.lastName.message}</p>}
            </div>
          </div>
        </ProfileSection>

        {/* Contact Section */}
        <ProfileSection 
          title="Communication" 
          description="Manage how we reach you for critical intelligence alerts."
          onSubmit={contactForm.handleSubmit(onUpdateContact)}
          isLoading={activeSection === 'contact'}
          isSuccess={successSection === 'contact'}
          error={activeSection === 'contact' ? error : ''}
        >
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Primary Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={user?.email || ''}
                  disabled
                  className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-100/50 text-gray-500 cursor-not-allowed font-bold"
                />
              </div>
              <p className="text-[10px] text-gray-400 ml-2 font-black uppercase tracking-tighter italic">LOCKED: Account Identity</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] ml-2">Phone (SMS Integration)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  {...contactForm.register('phoneNumber')}
                  placeholder="+234..."
                  className={`pl-12 h-14 rounded-2xl font-bold ${contactForm.formState.errors.phoneNumber ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                />
              </div>
              {contactForm.formState.errors.phoneNumber && <p className="text-xs text-red-500 ml-2 font-bold">{contactForm.formState.errors.phoneNumber.message}</p>}
              <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100">
                 <p className="text-xs text-amber-700 font-bold leading-relaxed flex items-start gap-2">
                   <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                   Add your mobile number to enable real-time SMS alerts for severe weather events and livestock health outbreaks in your region.
                 </p>
              </div>
            </div>
          </div>
        </ProfileSection>

        {/* Security Info Card */}
        <Card className="border-none shadow-sm rounded-[2.5rem] bg-indigo-600 text-white p-8">
          <div className="flex items-center gap-4">
            <div className="bg-white/20 p-3 rounded-2xl">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <h4 className="text-xl font-black tracking-tight uppercase">Security & Privacy</h4>
              <p className="text-indigo-100 text-sm font-medium">Your data is encrypted and used only for agricultural intelligence.</p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default ProfilePage;
