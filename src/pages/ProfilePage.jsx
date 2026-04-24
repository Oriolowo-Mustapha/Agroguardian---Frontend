import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { User, Phone, Mail, Camera, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import api from '../lib/axios';
import useAuthStore from '../store/authStore';

const profileSchema = z.object({
  firstName: z.string().min(2, 'First name must be at least 2 characters'),
  lastName: z.string().min(2, 'Last name must be at least 2 characters'),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (e.g. +234...)').optional().or(z.literal('')),
});

const ProfilePage = () => {
  const { user, updateUser } = useAuthStore();
  const [error, setError] = React.useState('');
  const [success, setSuccess] = React.useState('');
  const [isLoading, setIsLoading] = React.useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      phoneNumber: user?.phoneNumber || '',
    },
  });

  // Update form if user data changes (e.g. after initial load)
  React.useEffect(() => {
    if (user) {
      reset({
        firstName: user.firstName,
        lastName: user.lastName,
        phoneNumber: user.phoneNumber || '',
      });
    }
  }, [user, reset]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    setSuccess('');
    try {
      const response = await api.patch('/auth/profile', data);
      updateUser(response.data.data);
      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
        <div className="h-20 w-20 rounded-3xl bg-primary/10 flex items-center justify-center border-2 border-primary/20 text-primary relative group overflow-hidden">
          {user?.profilePicture ? (
            <img src={user.profilePicture} alt="Profile" className="h-full w-full object-cover" />
          ) : (
            <User className="h-10 w-10" />
          )}
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
            <Camera className="text-white h-6 w-6" />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter">Account Profile</h1>
          <p className="text-gray-500 font-medium">Manage your personal information and preferences</p>
        </div>
      </div>

      <Card className="border-none shadow-sm rounded-[2.5rem] overflow-hidden">
        <CardHeader className="p-8 border-b border-gray-50 bg-gray-50/30">
          <CardTitle className="text-xl font-bold">Personal Information</CardTitle>
          <CardDescription>Update your details to stay connected and receive alerts.</CardDescription>
        </CardHeader>
        <CardContent className="p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-2xl text-sm font-bold border border-red-100 flex items-center gap-3">
                <AlertCircle className="h-5 w-5" /> {error}
              </div>
            )}
            {success && (
              <div className="bg-green-50 text-green-600 p-4 rounded-2xl text-sm font-bold border border-green-100 flex items-center gap-3">
                <CheckCircle2 className="h-5 w-5" /> {success}
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">First Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    {...register('firstName')}
                    placeholder="First Name"
                    className={`pl-12 h-14 rounded-2xl ${errors.firstName ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                  />
                </div>
                {errors.firstName && <p className="text-xs text-red-500 ml-2 font-bold">{errors.firstName.message}</p>}
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Last Name</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    {...register('lastName')}
                    placeholder="Last Name"
                    className={`pl-12 h-14 rounded-2xl ${errors.lastName ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                  />
                </div>
                {errors.lastName && <p className="text-xs text-red-500 ml-2 font-bold">{errors.lastName.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  value={user?.email || ''}
                  disabled
                  className="pl-12 h-14 rounded-2xl border-gray-100 bg-gray-100/50 text-gray-500 cursor-not-allowed"
                />
              </div>
              <p className="text-[10px] text-gray-400 ml-2 font-medium italic">Email cannot be changed as it is linked to your account identity.</p>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Phone Number (For SMS Alerts)</label>
              <div className="relative">
                <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  {...register('phoneNumber')}
                  placeholder="+234..."
                  className={`pl-12 h-14 rounded-2xl ${errors.phoneNumber ? 'border-red-500' : 'border-gray-100 bg-gray-50/50'}`}
                />
              </div>
              {errors.phoneNumber && <p className="text-xs text-red-500 ml-2 font-bold">{errors.phoneNumber.message}</p>}
              <p className="text-[10px] text-gray-400 ml-2 font-medium">Adding your phone number enables critical SMS alerts for weather risks and disease outbreaks.</p>
            </div>

            <div className="pt-4">
              <Button type="submit" disabled={isLoading} className="w-full h-14 rounded-2xl font-black shadow-lg shadow-primary/20 text-lg">
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Saving Changes...
                  </>
                ) : (
                  'Save Profile'
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProfilePage;
