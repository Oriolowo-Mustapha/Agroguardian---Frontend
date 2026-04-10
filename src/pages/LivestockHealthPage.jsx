import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useParams, Link, useLocation } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import {
  ArrowLeft,
  Heart,
  Plus,
  Syringe,
  Pill,
  Stethoscope,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  Search,
  Filter,
  Bug,
  Activity,
  FileText,
  RefreshCw,
  ChevronRight,
  X,
  Upload,
  Loader2,
  Camera
} from 'lucide-react';
import api from '../lib/axios';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';

const RECORD_TYPES = [
  { id: 'all', label: 'All Records', icon: FileText },
  { id: 'vaccination', label: 'Vaccinations', icon: Syringe, color: 'text-blue-500' },
  { id: 'treatment', label: 'Treatments', icon: Pill, color: 'text-amber-500' },
  { id: 'illness', label: 'Illnesses', icon: Bug, color: 'text-red-500' },
  { id: 'checkup', label: 'Checkups', icon: Stethoscope, color: 'text-green-500' },
  { id: 'deworming', label: 'Deworming', icon: Activity, color: 'text-purple-500' }
];

const StatusBadge = ({ status }) => {
  const configs = {
    ongoing: { label: 'Ongoing', color: 'bg-amber-100 text-amber-700' },
    completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
    active: { label: 'Active', color: 'bg-red-100 text-red-700' },
    resolved: { label: 'Resolved', color: 'bg-green-100 text-green-700' },
    under_treatment: { label: 'Under Treatment', color: 'bg-blue-100 text-blue-700' },
    discontinued: { label: 'Discontinued', color: 'bg-gray-100 text-gray-700' }
  };
  const config = configs[status] || { label: status, color: 'bg-gray-100 text-gray-700' };
  
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-bold ${config.color}`}>
      {config.label}
    </span>
  );
};

const HealthRecordCard = ({ record, type, onClick }) => {
  const getIcon = () => {
    switch (type) {
      case 'vaccination': return <Syringe className="h-5 w-5 text-blue-500" />;
      case 'treatment': return <Pill className="h-5 w-5 text-amber-500" />;
      case 'illness': return <Bug className="h-5 w-5 text-red-500" />;
      case 'checkup': return <Stethoscope className="h-5 w-5 text-green-500" />;
      case 'deworming': return <Activity className="h-5 w-5 text-purple-500" />;
      default: return <FileText className="h-5 w-5 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (type) {
      case 'vaccination': return record.vaccineName;
      case 'treatment': return record.condition;
      case 'illness': return record.condition;
      case 'checkup': return `${record.checkupType?.replace('_', ' ')} Checkup`;
      case 'deworming': return record.productName;
      default: return 'Health Record';
    }
  };

  const getDate = () => {
    switch (type) {
      case 'vaccination': return record.dateAdministered;
      case 'treatment': return record.startDate;
      case 'illness': return record.dateIdentified;
      case 'checkup': return record.checkupDate;
      case 'deworming': return record.dateAdministered;
      default: return record.createdAt;
    }
  };

  const hasImages = type === 'illness' && record.imageUrls?.length > 0;

  return (
    <div 
      className="bg-white rounded-2xl border border-gray-100 p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={onClick}
    >
      <div className="flex items-start gap-4">
        {/* Show thumbnail image for illness records with images */}
        {hasImages ? (
          <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0">
            <img 
              src={record.imageUrls[0]} 
              alt="Illness" 
              className="w-full h-full object-cover"
            />
          </div>
        ) : (
          <div className="bg-gray-50 p-3 rounded-xl">
            {getIcon()}
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <h4 className="font-bold text-gray-900 truncate group-hover:text-primary transition-colors">
              {getTitle()}
            </h4>
            <div className="flex items-center gap-2 flex-shrink-0">
              {type === 'illness' && record.severity && (
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                  record.severity === 'critical' ? 'bg-red-100 text-red-700' :
                  record.severity === 'severe' ? 'bg-orange-100 text-orange-700' :
                  record.severity === 'moderate' ? 'bg-amber-100 text-amber-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {record.severity}
                </span>
              )}
              {record.status && <StatusBadge status={record.status} />}
            </div>
          </div>
          <div className="flex items-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1">
              <Calendar className="h-3.5 w-3.5" />
              {new Date(getDate()).toLocaleDateString()}
            </span>
            {record.cost && (
              <span>₦{record.cost.toLocaleString()}</span>
            )}
            {type === 'illness' && record.affectedCount && (
              <span className="flex items-center gap-1 text-red-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {record.affectedCount} affected
              </span>
            )}
            {hasImages && (
              <span className="flex items-center gap-1">
                <Camera className="h-3.5 w-3.5" />
                {record.imageUrls.length} photo{record.imageUrls.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          {/* Show description for illness records */}
          {type === 'illness' && record.description && (
            <p className="text-sm text-gray-600 mt-2 line-clamp-2">{record.description}</p>
          )}
          {record.notes && !record.description && (
            <p className="text-sm text-gray-500 mt-2 line-clamp-2">{record.notes}</p>
          )}
        </div>
        <button
          type="button"
          className="p-2 -m-2 rounded-full hover:bg-gray-50"
          aria-label="View record"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
        >
          <ChevronRight className="h-5 w-5 text-gray-300 group-hover:text-primary transition-colors flex-shrink-0" />
        </button>
      </div>
    </div>
  );
};

const ViewHealthRecordModal = ({ isOpen, onClose, record, type }) => {
  if (!isOpen || !record) return null;

  const asDate = (d) => {
    if (!d) return '—';
    const dt = new Date(d);
    return Number.isNaN(dt.getTime()) ? '—' : dt.toLocaleDateString();
  };

  const title =
    type === 'vaccination'
      ? record.vaccineName
      : type === 'deworming'
        ? record.productName
        : type === 'checkup'
          ? `${record.checkupType?.replace('_', ' ')} Checkup`
          : record.condition || 'Health Record';

  const baseFields = [
    { label: 'Date', value: asDate(record.dateAdministered || record.checkupDate || record.dateIdentified || record.startDate || record.createdAt) },
    record.status ? { label: 'Status', value: record.status } : null,
    record.cost != null && record.cost !== '' ? { label: 'Cost', value: `₦${Number(record.cost).toLocaleString()}` } : null,
  ].filter(Boolean);

  const typeFields = (() => {
    if (type === 'vaccination') {
      return [
        { label: 'Vaccine', value: record.vaccineName },
        record.vaccineType ? { label: 'Type', value: record.vaccineType } : null,
        record.dosage ? { label: 'Dosage', value: record.dosage } : null,
         record.nextDueDate ? { label: 'Next Due', value: asDate(record.nextDueDate) } : null,
      ].filter(Boolean);
    }

    if (type === 'deworming') {
      const parasites = Array.isArray(record.targetParasites)
        ? record.targetParasites.join(', ')
        : record.targetParasites;

      return [
        { label: 'Product', value: record.productName },
        record.activeIngredient ? { label: 'Active Ingredient', value: record.activeIngredient } : null,
        record.dosage ? { label: 'Dosage', value: record.dosage } : null,
        record.nextDueDate ? { label: 'Next Due', value: asDate(record.nextDueDate) } : null,
        parasites ? { label: 'Target Parasites', value: parasites } : null,
      ].filter(Boolean);
    }

    if (type === 'illness') {
      return [
        record.condition ? { label: 'Condition', value: record.condition } : null,
        record.severity ? { label: 'Severity', value: record.severity } : null,
        record.affectedCount ? { label: 'Affected', value: String(record.affectedCount) } : null,
      ].filter(Boolean);
    }

    if (type === 'treatment') {
      return [
        record.condition ? { label: 'Condition', value: record.condition } : null,
        record.startDate ? { label: 'Start', value: asDate(record.startDate) } : null,
        record.endDate ? { label: 'End', value: asDate(record.endDate) } : null,
      ].filter(Boolean);
    }

    if (type === 'checkup') {
      return [
        record.checkupType ? { label: 'Type', value: record.checkupType.replace('_', ' ') } : null,
        record.findings ? { label: 'Findings', value: record.findings } : null,
        record.recommendations ? { label: 'Recommendations', value: record.recommendations } : null,
      ].filter(Boolean);
    }

    return [];
  })();

  const fields = [...typeFields, ...baseFields];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <button type="button" className="absolute inset-0" aria-label="Close" onClick={onClose} />
      <div className="relative bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4 rounded-t-3xl">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{title || 'Health Record'}</h2>
            <p className="text-sm text-gray-500 mt-1 capitalize">{type}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {fields.map((f) => (
              <div key={f.label} className="bg-gray-50 border border-gray-100 rounded-2xl p-4">
                <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">{f.label}</p>
                <p className="text-sm text-gray-900 font-semibold mt-1 break-words">{f.value || '—'}</p>
              </div>
            ))}
          </div>

          {(record.description || record.notes) && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider">Notes</p>
              <p className="text-sm text-gray-700 mt-2 whitespace-pre-wrap">
                {record.description || record.notes}
              </p>
            </div>
          )}

          {Array.isArray(record.imageUrls) && record.imageUrls.length > 0 && (
            <div className="bg-white border border-gray-100 rounded-2xl p-4">
              <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mb-3">Photos</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {record.imageUrls.map((url, idx) => (
                  <a
                    key={idx}
                    href={url}
                    target="_blank"
                    rel="noreferrer"
                    className="block rounded-xl overflow-hidden border border-gray-100"
                  >
                    <img src={url} alt={`record-${idx}`} className="w-full h-24 object-cover" />
                  </a>
                ))}
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button type="button" variant="outline" className="rounded-xl" onClick={onClose}>
              Close
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AddVaccinationModal = ({ isOpen, onClose, livestockId, onSuccess, disabled }) => {
  const [formData, setFormData] = React.useState({
    vaccineName: '',
    vaccineType: '',
    dosage: '',
    dateAdministered: new Date().toISOString().split('T')[0],
    nextDueDate: '',
    cost: '',
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsSubmitting(true);
    try {
      await api.post(`/livestock-health/${livestockId}/vaccinations`, formData);
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Failed to add vaccination', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-xl">
              <Syringe className="h-5 w-5 text-blue-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Add Vaccination</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Vaccine Name *</label>
              <Input
                required
                value={formData.vaccineName}
                onChange={(e) => setFormData({ ...formData, vaccineName: e.target.value })}
                placeholder="e.g., Foot and Mouth Disease"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Vaccine Type</label>
              <Input
                value={formData.vaccineType}
                onChange={(e) => setFormData({ ...formData, vaccineType: e.target.value })}
                placeholder="e.g., Live attenuated"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Dosage *</label>
              <Input
                required
                value={formData.dosage}
                onChange={(e) => setFormData({ ...formData, dosage: e.target.value })}
                placeholder="e.g., 2ml IM"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Date Administered *</label>
              <Input
                type="date"
                required
                value={formData.dateAdministered}
                onChange={(e) => setFormData({ ...formData, dateAdministered: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Next Due Date</label>
              <Input
                type="date"
                value={formData.nextDueDate}
                onChange={(e) => setFormData({ ...formData, nextDueDate: e.target.value })}
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-bold text-gray-700">Cost (₦)</label>
              <Input
                type="number"
                value={formData.cost}
                onChange={(e) => setFormData({ ...formData, cost: e.target.value })}
                placeholder="0"
                className="mt-1"
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional notes..."
                className="mt-1 w-full min-h-[80px] bg-white border border-gray-200 rounded-lg p-3 text-sm"
              />
            </div>
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={disabled || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Add Vaccination
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddDewormingModal = ({ isOpen, onClose, livestockId, onSuccess, disabled }) => {
  const [productName, setProductName] = React.useState('');
  const [activeIngredient, setActiveIngredient] = React.useState('');
  const [dosage, setDosage] = React.useState('');
  const [dateAdministered, setDateAdministered] = React.useState(new Date().toISOString().split('T')[0]);
  const [nextDueDate, setNextDueDate] = React.useState('');
  const [targetParasitesRaw, setTargetParasitesRaw] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [formError, setFormError] = React.useState('');

  React.useEffect(() => {
    if (!isOpen) return;
    setProductName('');
    setActiveIngredient('');
    setDosage('');
    setDateAdministered(new Date().toISOString().split('T')[0]);
    setNextDueDate('');
    setTargetParasitesRaw('');
    setCost('');
    setNotes('');
    setFormError('');
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsSubmitting(true);
    setFormError('');

    try {
      const pName = productName.trim();
      const dsg = dosage.trim();
      if (!pName) throw new Error('Product name is required');
      if (!dsg) throw new Error('Dosage is required');
      if (!dateAdministered) throw new Error('Date administered is required');

      const targetParasites = targetParasitesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        productName: pName,
        activeIngredient: activeIngredient.trim() || undefined,
        dosage: dsg,
        dateAdministered: new Date(dateAdministered).toISOString(),
        nextDueDate: nextDueDate ? new Date(nextDueDate).toISOString() : undefined,
        targetParasites: targetParasites.length ? targetParasites : undefined,
        cost: cost !== '' ? Number(cost) : undefined,
        notes: notes.trim() || undefined
      };

      await api.post(`/livestock-health/${livestockId}/dewormings`, payload);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      const msg =
        error?.response?.data?.message ||
        error?.message ||
        'Failed to add deworming record';
      setFormError(msg);
      // eslint-disable-next-line no-console
      console.error('Failed to add deworming record', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-purple-100 p-2 rounded-xl">
              <Activity className="h-5 w-5 text-purple-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Log Deworming</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {formError && (
            <div className="p-3 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700 font-medium">
              {formError}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Product Name *</label>
              <Input
                required
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Albendazole"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Active Ingredient</label>
              <Input
                value={activeIngredient}
                onChange={(e) => setActiveIngredient(e.target.value)}
                placeholder="Optional"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Dosage *</label>
              <Input
                required
                value={dosage}
                onChange={(e) => setDosage(e.target.value)}
                placeholder="e.g., 10ml oral"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date Administered *</label>
              <Input
                type="date"
                required
                value={dateAdministered}
                onChange={(e) => setDateAdministered(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Next Due Date</label>
              <Input
                type="date"
                value={nextDueDate}
                onChange={(e) => setNextDueDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Target Parasites</label>
              <Input
                value={targetParasitesRaw}
                onChange={(e) => setTargetParasitesRaw(e.target.value)}
                placeholder="Comma-separated (e.g., roundworms, tapeworms)"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Cost (₦)</label>
              <Input
                type="number"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="0"
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes..."
                className="mt-1 w-full min-h-[80px] bg-white border border-gray-200 rounded-lg p-3 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={disabled || isSubmitting}>
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Plus className="h-4 w-4 mr-2" />
              )}
              Log Deworming
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AddIllnessModal = ({ isOpen, onClose, livestockId, livestock, onSuccess, disabled }) => {
  const [formData, setFormData] = React.useState({
    condition: '',
    description: '',
    symptoms: '',
    severity: 'moderate',
    dateIdentified: new Date().toISOString().split('T')[0],
    affectedCount: '',
    notes: ''
  });
  const [images, setImages] = React.useState([]);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState('');

  const isBatch = livestock?.trackingType === 'batch';
  const batchQuantity = livestock?.quantity || 1;

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (files.length + images.length > 5) {
      setError('Maximum 5 images allowed');
      return;
    }
    setImages([...images, ...files.map(f => ({
      file: f,
      preview: URL.createObjectURL(f)
    }))]);
    setError('');
  };

  const removeImage = (idx) => {
    URL.revokeObjectURL(images[idx].preview);
    setImages(images.filter((_, i) => i !== idx));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (disabled) return;
    setIsSubmitting(true);
    setError('');

    try {
      const submitData = new FormData();
      submitData.append('condition', formData.condition);
      submitData.append('description', formData.description);
      submitData.append('severity', formData.severity);
      submitData.append('dateIdentified', formData.dateIdentified);
      if (formData.notes) submitData.append('notes', formData.notes);

      // Parse symptoms as comma-separated
      if (formData.symptoms.trim()) {
        const symptomsArr = formData.symptoms.split(',').map(s => s.trim()).filter(Boolean);
        submitData.append('symptoms', JSON.stringify(symptomsArr));
      }

      // For batch livestock, include affected count
      if (isBatch && formData.affectedCount) {
        const count = parseInt(formData.affectedCount, 10);
        if (count > 0 && count <= batchQuantity) {
          submitData.append('affectedCount', count.toString());
        }
      }

      // Append images
      images.forEach(img => submitData.append('images', img.file));

      await api.post(`/livestock-health/${livestockId}/illnesses`, submitData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      onSuccess();
      onClose();
      // Reset form
      setFormData({
        condition: '',
        description: '',
        symptoms: '',
        severity: 'moderate',
        dateIdentified: new Date().toISOString().split('T')[0],
        affectedCount: '',
        notes: ''
      });
      setImages([]);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to report illness');
    }
    setIsSubmitting(false);
  };

  React.useEffect(() => {
    if (!isOpen) {
      setError('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 flex flex-wrap items-center justify-between gap-4 rounded-t-3xl">
          <div className="flex items-center gap-3">
            <div className="bg-red-100 p-2 rounded-xl">
              <Bug className="h-5 w-5 text-red-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900">Report Illness</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
            <X className="h-5 w-5 text-gray-400" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Condition/Disease Name *</label>
              <Input
                required
                value={formData.condition}
                onChange={(e) => setFormData({ ...formData, condition: e.target.value })}
                placeholder="e.g., Avian Influenza, Mastitis"
                className="mt-1"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Description *</label>
              <textarea
                required
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the illness in detail - visible symptoms, behavior changes, when it started..."
                className="mt-1 w-full min-h-[100px] bg-white border border-gray-200 rounded-lg p-3 text-sm"
              />
            </div>

            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Symptoms (comma separated)</label>
              <Input
                value={formData.symptoms}
                onChange={(e) => setFormData({ ...formData, symptoms: e.target.value })}
                placeholder="e.g., loss of appetite, lethargy, discharge"
                className="mt-1"
              />
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Severity *</label>
              <select
                required
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="mt-1 w-full h-10 bg-white border border-gray-200 rounded-lg px-3 text-sm"
              >
                <option value="mild">Mild</option>
                <option value="moderate">Moderate</option>
                <option value="severe">Severe</option>
                <option value="critical">Critical</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Date Identified *</label>
              <Input
                type="date"
                required
                value={formData.dateIdentified}
                onChange={(e) => setFormData({ ...formData, dateIdentified: e.target.value })}
                className="mt-1"
              />
            </div>

            {isBatch && (
              <div className="col-span-2">
                <label className="text-sm font-bold text-gray-700">
                  How many animals affected? (out of {batchQuantity})
                </label>
                <Input
                  type="number"
                  min="1"
                  max={batchQuantity}
                  value={formData.affectedCount}
                  onChange={(e) => setFormData({ ...formData, affectedCount: e.target.value })}
                  placeholder={`1 - ${batchQuantity}`}
                  className="mt-1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Specify how many animals in this batch are showing symptoms
                </p>
              </div>
            )}

            {/* Image Upload */}
            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Photos (optional)</label>
              <p className="text-xs text-gray-500 mb-2">
                Upload photos of affected areas, symptoms, or overall condition for better tracking
              </p>
              <div
                onClick={() => document.getElementById('illness-images').click()}
                className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-primary/50 transition-colors"
              >
                <Camera className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-600">Click to upload photos</p>
                <p className="text-xs text-gray-400">Up to 5 images • JPG, PNG</p>
                <input
                  id="illness-images"
                  type="file"
                  multiple
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {images.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mt-3">
                  {images.map((img, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={img.preview}
                        alt={`Preview ${idx + 1}`}
                        className="w-full aspect-square object-cover rounded-lg"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(idx)}
                        className="absolute -top-1 -right-1 bg-red-500 text-white p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="col-span-2">
              <label className="text-sm font-bold text-gray-700">Notes</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Any additional observations..."
                className="mt-1 w-full min-h-[60px] bg-white border border-gray-200 rounded-lg p-3 text-sm"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-red-500 hover:bg-red-600" disabled={disabled || isSubmitting}>
              {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Report Illness
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

const LivestockHealthPage = () => {
  const { livestockId } = useParams();
  const location = useLocation();
  const goBack = useNavigateBack(`/livestock/${livestockId}`);
  const queryClient = useQueryClient();
  const [activeType, setActiveType] = React.useState('all');
  const [searchQuery, setSearchQuery] = React.useState('');
  const [showVaccinationModal, setShowVaccinationModal] = React.useState(false);
  const [showIllnessModal, setShowIllnessModal] = React.useState(false);
  const [showDewormingModal, setShowDewormingModal] = React.useState(false);
  const [showAddMenu, setShowAddMenu] = React.useState(false);
  const [selectedRecord, setSelectedRecord] = React.useState(null);

  React.useEffect(() => {
    const open = location.state?.openAddModal;
    if (open === true || open === 'vaccination') {
      setShowVaccinationModal(true);
    }
    if (open === 'deworming') {
      setShowDewormingModal(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fetch livestock details
  const { data: livestock } = useQuery({
    queryKey: ['livestock-details', livestockId],
    queryFn: async () => {
      const response = await api.get(`/livestock/${livestockId}`);
      const data = response.data?.data ?? response.data;
      // Handle both shapes: direct livestock object or { livestock, healthRecords }
      return data?.livestock ?? data;
    }
  });

  // Fetch all health records
  const { data: healthRecords, isLoading, refetch } = useQuery({
    queryKey: ['livestock-health', livestockId],
    queryFn: async () => {
      const response = await api.get(`/livestock-health/${livestockId}/all`);
      return response.data.data;
    }
  });

  // Combine and flatten all records
  const allRecords = React.useMemo(() => {
    if (!healthRecords) return [];
    
    const records = [];
    
    healthRecords.vaccinations?.forEach(r => records.push({ ...r, _type: 'vaccination' }));
    healthRecords.treatments?.forEach(r => records.push({ ...r, _type: 'treatment' }));
    healthRecords.illnesses?.forEach(r => records.push({ ...r, _type: 'illness' }));
    healthRecords.checkups?.forEach(r => records.push({ ...r, _type: 'checkup' }));
    healthRecords.dewormings?.forEach(r => records.push({ ...r, _type: 'deworming' }));
    
    // Sort by date
    return records.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }, [healthRecords]);

  // Filter records
  const filteredRecords = React.useMemo(() => {
    let filtered = allRecords;
    
    if (activeType !== 'all') {
      filtered = filtered.filter(r => r._type === activeType);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(r => 
        r.vaccineName?.toLowerCase().includes(query) ||
        r.condition?.toLowerCase().includes(query) ||
        r.productName?.toLowerCase().includes(query) ||
        r.notes?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [allRecords, activeType, searchQuery]);

  // Count by type
  const typeCounts = React.useMemo(() => ({
    all: allRecords.length,
    vaccination: healthRecords?.vaccinations?.length || 0,
    treatment: healthRecords?.treatments?.length || 0,
    illness: healthRecords?.illnesses?.length || 0,
    checkup: healthRecords?.checkups?.length || 0,
    deworming: healthRecords?.dewormings?.length || 0
  }), [allRecords, healthRecords]);

  const farmId = livestock?.farmId?._id || livestock?.farmId;
  const vetAiHref = farmId
    ? `/vet-consultation?farmId=${encodeURIComponent(farmId)}&livestockId=${encodeURIComponent(livestockId)}`
    : `/vet-consultation?livestockId=${encodeURIComponent(livestockId)}`;

  const isBatchDepleted = livestock?.trackingType === 'batch' && Number(livestock?.quantity || 0) <= 0;
  const isActionLocked = livestock?.status === 'deceased' || isBatchDepleted || livestock?.status === 'sold';

  React.useEffect(() => {
    if (!isActionLocked) return;
    setShowAddMenu(false);
    setShowVaccinationModal(false);
    setShowDewormingModal(false);
    setShowIllnessModal(false);
  }, [isActionLocked]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Modals */}
      <AddVaccinationModal
        isOpen={showVaccinationModal}
        onClose={() => setShowVaccinationModal(false)}
        livestockId={livestockId}
        disabled={isActionLocked}
        onSuccess={() => {
          queryClient.invalidateQueries(['livestock-health', livestockId]);
          refetch();
        }}
      />
      <AddDewormingModal
        isOpen={showDewormingModal}
        onClose={() => setShowDewormingModal(false)}
        livestockId={livestockId}
        disabled={isActionLocked}
        onSuccess={() => {
          queryClient.invalidateQueries(['livestock-health', livestockId]);
          queryClient.invalidateQueries(['livestock-details', livestockId]);
          refetch();
        }}
      />

      <ViewHealthRecordModal
        isOpen={!!selectedRecord}
        onClose={() => setSelectedRecord(null)}
        record={selectedRecord?.record}
        type={selectedRecord?.type}
      />
      <AddIllnessModal
        isOpen={showIllnessModal}
        onClose={() => setShowIllnessModal(false)}
        livestockId={livestockId}
        livestock={livestock}
        disabled={isActionLocked}
        onSuccess={() => {
          queryClient.invalidateQueries(['livestock-health', livestockId]);
          queryClient.invalidateQueries(['livestock-details', livestockId]);
          refetch();
        }}
      />

      {/* Back Navigation */}
      <button
        type="button"
        onClick={goBack}
        className="inline-flex items-center text-gray-500 hover:text-gray-900 transition-colors"
      >
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back
      </button>

      {/* Header */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-8">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black text-gray-900 flex items-center gap-3">
              <Heart className="h-8 w-8 text-red-500" />
              Health Records
            </h1>
            <p className="text-gray-500 mt-1">
              {livestock?.name || livestock?.tagId || 'Livestock'} • {livestock?.species}
            </p>
          </div>
          
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => refetch()} className="rounded-xl">
              <RefreshCw className="h-4 w-4" />
            </Button>

            <Link to={vetAiHref} className="inline-flex">
              <Button variant="outline" className="rounded-xl">
                <Stethoscope className="h-4 w-4 mr-2" />
                Vet AI
              </Button>
            </Link>

            <div className="relative">
              <Button
                onClick={() => {
                  if (isActionLocked) return;
                  setShowAddMenu(!showAddMenu);
                }}
                className="rounded-xl"
                disabled={isActionLocked}
                title={isActionLocked ? 'This livestock is no longer active.' : undefined}
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Record
              </Button>
              {showAddMenu && !isActionLocked && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowAddMenu(false)} 
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                    <button
                      onClick={() => {
                        setShowVaccinationModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <Syringe className="h-4 w-4 text-blue-500" />
                      <span className="font-medium">Vaccination</span>
                    </button>
                    <button
                      onClick={() => setShowAddMenu(false)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Bug className="h-4 w-4 text-red-500" />
                      <span className="font-medium">Illness</span>
                      <span className="text-xs text-gray-400 ml-auto">Soon</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowDewormingModal(true);
                        setShowAddMenu(false);
                      }}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3"
                    >
                      <Activity className="h-4 w-4 text-purple-500" />
                      <span className="font-medium">Deworming</span>
                    </button>
                    <button
                      onClick={() => setShowAddMenu(false)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Pill className="h-4 w-4 text-amber-500" />
                      <span className="font-medium">Treatment</span>
                      <span className="text-xs text-gray-400 ml-auto">Soon</span>
                    </button>
                    <button
                      onClick={() => setShowAddMenu(false)}
                      className="w-full px-4 py-2.5 text-left hover:bg-gray-50 flex items-center gap-3 opacity-50 cursor-not-allowed"
                      disabled
                    >
                      <Stethoscope className="h-4 w-4 text-green-500" />
                      <span className="font-medium">Checkup</span>
                      <span className="text-xs text-gray-400 ml-auto">Soon</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {RECORD_TYPES.filter(t => t.id !== 'all').map(type => {
          const Icon = type.icon;
          return (
            <Card 
              key={type.id} 
              className={`border-none shadow-sm cursor-pointer transition-all hover:shadow-md ${activeType === type.id ? 'ring-2 ring-primary' : ''}`}
              onClick={() => setActiveType(type.id)}
            >
              <CardContent className="p-4 flex items-center gap-3">
                <div className="bg-gray-50 p-2 rounded-lg">
                  <Icon className={`h-5 w-5 ${type.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-black text-gray-900">{typeCounts[type.id]}</p>
                  <p className="text-xs text-gray-500">{type.label}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {RECORD_TYPES.map(type => {
          const Icon = type.icon;
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all ${
                activeType === type.id
                  ? 'bg-primary text-white'
                  : 'bg-white text-gray-600 border border-gray-200 hover:border-primary'
              }`}
            >
              <Icon className={`h-4 w-4 ${activeType === type.id ? '' : type.color || ''}`} />
              {type.label}
              <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                activeType === type.id ? 'bg-white/20' : 'bg-gray-100'
              }`}>
                {typeCounts[type.id]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative w-full lg:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
        <Input
          placeholder="Search health records..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-12 h-12 rounded-xl"
        />
      </div>

      {/* Records List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="h-24 bg-white rounded-2xl animate-pulse" />
          ))}
        </div>
      ) : filteredRecords.length > 0 ? (
        <div className="space-y-4">
          {filteredRecords.map((record, idx) => (
            <HealthRecordCard
              key={`${record._type}-${record._id || idx}`}
              record={record}
              type={record._type}
              onClick={() => setSelectedRecord({ record, type: record._type })}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-24 bg-white rounded-3xl border border-gray-100">
          <div className="bg-gray-100 h-20 w-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <FileText className="h-10 w-10 text-gray-400" />
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">No health records yet</h3>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Start tracking vaccinations, treatments, and checkups for this animal
          </p>
          <div className="flex gap-3 justify-center">
            <Button onClick={() => setShowVaccinationModal(true)} className="rounded-xl" disabled={isActionLocked}>
              <Syringe className="h-4 w-4 mr-2" />
              Add Vaccination
            </Button>
            <Button variant="outline" className="rounded-xl" disabled>
              <Bug className="h-4 w-4 mr-2" />
              Illness
              <span className="text-xs text-gray-400 ml-2">Soon</span>
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LivestockHealthPage;
