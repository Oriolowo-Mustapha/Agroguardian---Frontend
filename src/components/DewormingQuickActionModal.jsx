import React from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Loader2, Search, Activity } from 'lucide-react';
import api from '../lib/axios';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const toDateInputValue = (d) => {
  if (!d) return '';
  const dt = typeof d === 'string' ? new Date(d) : d;
  if (Number.isNaN(dt.getTime())) return '';
  return dt.toISOString().slice(0, 10);
};

const sumAnimals = (items) =>
  (items || []).reduce((sum, item) => sum + (item?.trackingType === 'batch' ? (item?.quantity || 1) : 1), 0);

const livestockLabel = (item) => {
  const base = item?.name || item?.tagId || `${item?.species || 'livestock'} #${String(item?._id || '').slice(-4)}`;
  if (item?.trackingType === 'batch') return `${base} (batch ×${item?.quantity || 1})`;
  return base;
};

export default function DewormingQuickActionModal({
  isOpen,
  onClose,
  farmId,
  livestock = [],
  onSuccess
}) {
  const [scope, setScope] = React.useState('all');
  const [selectedSpecies, setSelectedSpecies] = React.useState([]);
  const [selectedIds, setSelectedIds] = React.useState([]);
  const [pickSearch, setPickSearch] = React.useState('');

  const [productName, setProductName] = React.useState('');
  const [activeIngredient, setActiveIngredient] = React.useState('');
  const [dosage, setDosage] = React.useState('');
  const [dateAdministered, setDateAdministered] = React.useState(toDateInputValue(new Date()));
  const [nextDueDate, setNextDueDate] = React.useState('');
  const [targetParasitesRaw, setTargetParasitesRaw] = React.useState('');
  const [cost, setCost] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [formError, setFormError] = React.useState('');

  const eligibleLivestock = React.useMemo(() => {
    // Match backend: default to active only
    return (livestock || []).filter((l) => !l?.status || l.status === 'active' || l.status === 'breeding');
  }, [livestock]);

  const speciesOptions = React.useMemo(() => {
    const set = new Set(eligibleLivestock.map((l) => l?.species).filter(Boolean));
    return Array.from(set).sort();
  }, [eligibleLivestock]);

  const pickedLivestock = React.useMemo(() => {
    const q = pickSearch.trim().toLowerCase();
    let list = eligibleLivestock;
    if (q) {
      list = list.filter((l) =>
        (l?.name || '').toLowerCase().includes(q) ||
        (l?.tagId || '').toLowerCase().includes(q) ||
        (l?.breed || '').toLowerCase().includes(q) ||
        (l?.species || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [eligibleLivestock, pickSearch]);

  const targetLivestock = React.useMemo(() => {
    if (scope === 'all') return eligibleLivestock;
    if (scope === 'species') {
      return eligibleLivestock.filter((l) => selectedSpecies.includes(l.species));
    }
    if (scope === 'selected') {
      const set = new Set(selectedIds);
      return eligibleLivestock.filter((l) => set.has(l._id));
    }
    return eligibleLivestock;
  }, [eligibleLivestock, scope, selectedSpecies, selectedIds]);

  const targetedLivestockCount = targetLivestock.length;
  const targetedAnimalsCount = sumAnimals(targetLivestock);

  const mutation = useMutation({
    mutationFn: async () => {
      setFormError('');

      const pName = productName.trim();
      const dsg = dosage.trim();
      if (!farmId) throw new Error('farmId is required');
      if (!pName) throw new Error('Product name is required');
      if (!dsg) throw new Error('Dosage is required');
      if (!dateAdministered) throw new Error('Date administered is required');

      if (scope === 'species' && selectedSpecies.length === 0) {
        throw new Error('Select at least one species');
      }
      if (scope === 'selected' && selectedIds.length === 0) {
        throw new Error('Select at least one livestock');
      }

      const targetParasites = targetParasitesRaw
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const payload = {
        scope,
        species: scope === 'species' ? selectedSpecies : undefined,
        livestockIds: scope === 'selected' ? selectedIds : undefined,
        productName: pName,
        activeIngredient: activeIngredient.trim() || undefined,
        dosage: dsg,
        dateAdministered: new Date(dateAdministered).toISOString(),
        nextDueDate: nextDueDate ? new Date(nextDueDate).toISOString() : undefined,
        targetParasites: targetParasites.length ? targetParasites : undefined,
        cost: cost !== '' ? Number(cost) : undefined,
        notes: notes.trim() || undefined
      };

      const res = await api.post(`/livestock-health/farms/${farmId}/dewormings/bulk`, payload);
      return res.data?.data ?? res.data;
    },
    onSuccess: (data) => {
      onSuccess?.(data);
      onClose?.();
    },
    onError: (err) => {
      setFormError(err?.message || 'Failed to save deworming records');
    }
  });

  React.useEffect(() => {
    if (!isOpen) return;
    setFormError('');
    setScope('all');
    setSelectedSpecies([]);
    setSelectedIds([]);
    setPickSearch('');
    setProductName('');
    setActiveIngredient('');
    setDosage('');
    setDateAdministered(toDateInputValue(new Date()));
    setNextDueDate('');
    setTargetParasitesRaw('');
    setCost('');
    setNotes('');
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="sticky top-0 bg-white border-b border-gray-100 p-6 rounded-t-3xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-xl">
                <Activity className="h-5 w-5 text-purple-600" />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900">Log Deworming</h2>
                <p className="text-sm text-gray-500">Record preventive care for your farm</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-xl transition-colors">
              <X className="h-5 w-5 text-gray-500" />
            </button>
          </div>
        </div>

        <form
          className="p-6 space-y-6"
          onSubmit={(e) => {
            e.preventDefault();
            mutation.mutate();
          }}
        >
          {/* Scope */}
          <div className="space-y-2">
            <label className="block text-sm font-bold text-gray-700">Apply to</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { id: 'all', label: 'All active' },
                { id: 'species', label: 'By species' },
                { id: 'selected', label: 'Select livestock' }
              ].map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setScope(opt.id)}
                  className={`px-4 py-3 rounded-xl text-sm font-bold border transition-all ${
                    scope === opt.id
                      ? 'bg-primary text-white border-primary'
                      : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500">
              Targeting: <span className="font-bold text-gray-800">{targetedLivestockCount}</span> livestock records (~{targetedAnimalsCount} animals)
            </p>
          </div>

          {scope === 'species' && (
            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Species</label>
              <div className="flex flex-wrap gap-2">
                {speciesOptions.length === 0 ? (
                  <p className="text-sm text-gray-500">No active livestock found.</p>
                ) : (
                  speciesOptions.map((sp) => {
                    const selected = selectedSpecies.includes(sp);
                    return (
                      <button
                        key={sp}
                        type="button"
                        onClick={() => {
                          setSelectedSpecies((prev) =>
                            selected ? prev.filter((x) => x !== sp) : [...prev, sp]
                          );
                        }}
                        className={`px-3 py-2 rounded-xl text-sm font-bold border transition-all capitalize ${
                          selected
                            ? 'bg-primary text-white border-primary'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-primary/40'
                        }`}
                      >
                        {sp}
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {scope === 'selected' && (
            <div className="space-y-3">
              <label className="block text-sm font-bold text-gray-700">Select livestock</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={pickSearch}
                  onChange={(e) => setPickSearch(e.target.value)}
                  placeholder="Search by name, tag, breed, species..."
                  className="pl-11 h-11 rounded-xl"
                />
              </div>

              <div className="max-h-56 overflow-y-auto border border-gray-200 rounded-2xl divide-y">
                {pickedLivestock.length === 0 ? (
                  <div className="p-4 text-sm text-gray-500">No matching active livestock.</div>
                ) : (
                  pickedLivestock.map((l) => {
                    const checked = selectedIds.includes(l._id);
                    return (
                      <label key={l._id} className="flex items-center justify-between gap-3 p-3 cursor-pointer hover:bg-gray-50">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 truncate">{livestockLabel(l)}</p>
                          <p className="text-xs text-gray-500 capitalize">{l.species}{l.breed ? ` • ${l.breed}` : ''}</p>
                        </div>
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const on = e.target.checked;
                            setSelectedIds((prev) => (on ? [...prev, l._id] : prev.filter((id) => id !== l._id)));
                          }}
                          className="h-5 w-5"
                        />
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Deworming details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-bold text-gray-700">Product name *</label>
              <Input value={productName} onChange={(e) => setProductName(e.target.value)} placeholder="e.g., Albendazole" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Active ingredient</label>
              <Input value={activeIngredient} onChange={(e) => setActiveIngredient(e.target.value)} placeholder="Optional" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Dosage *</label>
              <Input value={dosage} onChange={(e) => setDosage(e.target.value)} placeholder="e.g., 10mg/kg" className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Date administered *</label>
              <Input type="date" value={dateAdministered} onChange={(e) => setDateAdministered(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Next due date</label>
              <Input type="date" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-bold text-gray-700">Target parasites</label>
              <Input
                value={targetParasitesRaw}
                onChange={(e) => setTargetParasitesRaw(e.target.value)}
                placeholder="Comma-separated (e.g., roundworms, tapeworms)"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-bold text-gray-700">Cost (₦)</label>
              <Input type="number" min="0" step="1" value={cost} onChange={(e) => setCost(e.target.value)} className="h-11 rounded-xl" />
            </div>

            <div className="space-y-2 sm:col-span-2">
              <label className="block text-sm font-bold text-gray-700">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary outline-none"
                placeholder="Optional"
              />
            </div>
          </div>

          {formError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm font-medium rounded-xl p-3">
              {formError}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={mutation.isPending}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-primary hover:bg-primary/90" disabled={mutation.isPending}>
              {mutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                'Save Deworming'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
