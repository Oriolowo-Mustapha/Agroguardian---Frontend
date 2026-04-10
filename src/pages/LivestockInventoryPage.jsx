import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useNavigateBack } from '../hooks/useNavigateBack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Plus,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Package,
  Filter,
  Loader2,
  Trash2,
  ShoppingCart,
  Tag,
  Baby,
  Skull
} from 'lucide-react';
import api from '../lib/axios';

const transactionTypes = {
  purchase: { icon: ShoppingCart, color: 'text-blue-600', bg: 'bg-blue-100', label: 'Purchase' },
  sale: { icon: Tag, color: 'text-green-600', bg: 'bg-green-100', label: 'Sale' },
  birth: { icon: Baby, color: 'text-pink-600', bg: 'bg-pink-100', label: 'Birth' },
  death: { icon: Skull, color: 'text-gray-600', bg: 'bg-gray-100', label: 'Death' },
  transfer_in: { icon: TrendingUp, color: 'text-purple-600', bg: 'bg-purple-100', label: 'Transfer In' },
  transfer_out: { icon: TrendingDown, color: 'text-orange-600', bg: 'bg-orange-100', label: 'Transfer Out' }
};

const speciesEmoji = {
  cattle: '🐄',
  goat: '🐐',
  sheep: '🐑',
  rabbit: '🐇',
  pig: '🐷',
  poultry: '🐔',
  fish: '🐟'
};

const safeNumber = (v, fallback = 0) => {
  const n = typeof v === 'string' ? Number(v) : v;
  return Number.isFinite(n) ? n : fallback;
};

const formatDateSafe = (value) => {
  if (!value) return '-';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '-';
  return d.toLocaleDateString();
};

const normalizeTransaction = (t) => {
  const type = t?.transactionType ?? t?.type;
  const date = t?.transactionDate ?? t?.date;
  const totalAmount = t?.totalAmount ?? t?.totalValue ?? t?.total;
  const causeOfDeath = t?.causeOfDeath ?? t?.deathCause;

  return {
    ...t,
    type,
    date,
    totalAmount: safeNumber(totalAmount, undefined),
    causeOfDeath
  };
};

export default function LivestockInventoryPage() {
  const [searchParams] = useSearchParams();
  const goBack = useNavigateBack('/livestock');
  const farmId = searchParams.get('farmId');
  const queryClient = useQueryClient();

  const [showAddModal, setShowAddModal] = useState(false);
  const [filterType, setFilterType] = useState('all');
  const [filterSpecies, setFilterSpecies] = useState('all');

  // Add Transaction modal state (kept separate from filters)
  const [txType, setTxType] = useState('purchase');
  const [txLivestockId, setTxLivestockId] = useState('');
  const [txSpecies, setTxSpecies] = useState('cattle');
  const [txQty, setTxQty] = useState(1);
  const [txUnitPrice, setTxUnitPrice] = useState('');
  const [addError, setAddError] = useState('');

  useEffect(() => {
    if (!showAddModal) return;
    setTxType('purchase');
    setTxLivestockId('');
    setTxSpecies('cattle');
    setTxQty(1);
    setTxUnitPrice('');
    setAddError('');
  }, [showAddModal]);

  // Fetch farms
  const { data: farms = [] } = useQuery({
    queryKey: ['farms'],
    queryFn: async () => {
      const res = await api.get('/farms');
      return res.data.data || [];
    }
  });

  const selectedFarm = farms.find(f => f._id === farmId) || farms[0];

  // Fetch livestock
  const { data: livestock = [] } = useQuery({
    queryKey: ['livestock', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock/farms/${selectedFarm._id}`);
      return res.data.data || [];
    },
    enabled: !!selectedFarm?._id
  });

  useEffect(() => {
    if (!showAddModal) return;

    const selected = txLivestockId ? livestock.find(l => l._id === txLivestockId) : null;
    if (selected?.species) setTxSpecies(selected.species);

    // Prefill estimated value for death from Livestock.cost when available
    if (txType === 'death') {
      const cost = Number(selected?.cost);
      const inferred =
        selected?.trackingType === 'batch'
          ? (Number.isFinite(cost) && safeNumber(selected?.quantity, 0) > 0 ? cost / safeNumber(selected?.quantity, 0) : NaN)
          : cost;

      if ((txUnitPrice === '' || txUnitPrice == null) && Number.isFinite(inferred)) {
        setTxUnitPrice(String(inferred));
      }
    }

    if (txType !== 'purchase' && txType !== 'sale' && txType !== 'death') {
      setTxUnitPrice('');
    }
  }, [txType, txLivestockId, showAddModal, livestock, txUnitPrice]);

  // Fetch transactions
  const { data: transactionsData, isLoading } = useQuery({
    queryKey: ['inventory-transactions', selectedFarm?._id, filterType, filterSpecies],
    queryFn: async () => {
      const params = {};
      if (filterType !== 'all') params.type = filterType;
      if (filterSpecies !== 'all') params.species = filterSpecies;
      const res = await api.get(`/livestock-inventory/farms/${selectedFarm._id}/transactions`, { params });
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const transactionsRaw = transactionsData?.data;
  const transactions = Array.isArray(transactionsRaw) ? transactionsRaw.map(normalizeTransaction) : [];

  // Fetch inventory summary
  const { data: summaryData } = useQuery({
    queryKey: ['inventory-summary', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-inventory/farms/${selectedFarm._id}/summary`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const summaryRaw = summaryData?.data || {};
  const bySpeciesArray = Array.isArray(summaryRaw.bySpecies) ? summaryRaw.bySpecies : [];
  const summary = {
    ...summaryRaw,
    totalCount: bySpeciesArray.reduce((sum, s) => sum + safeNumber(s.current, 0), 0),
    bySpecies: Object.fromEntries(bySpeciesArray.map(s => [s.species, safeNumber(s.current, 0)]))
  };

  // Fetch financial summary
  const { data: financialData } = useQuery({
    queryKey: ['financial-summary', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-inventory/farms/${selectedFarm._id}/financial`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const financialRaw = financialData?.data || {};
  const financial = {
    ...financialRaw,
    totalSales: safeNumber(financialRaw.totalRevenue ?? financialRaw.totalSales, 0),
    totalPurchases: safeNumber(financialRaw.totalExpenses ?? financialRaw.totalPurchases, 0),
    netProfit: safeNumber(financialRaw.netProfit ?? financialRaw.netProfitLoss ?? (financialRaw.totalRevenue - financialRaw.totalExpenses), 0)
  };

  // Fetch mortality report
  const { data: mortalityData } = useQuery({
    queryKey: ['mortality-report', selectedFarm?._id],
    queryFn: async () => {
      const res = await api.get(`/livestock-inventory/farms/${selectedFarm._id}/mortality`);
      return res.data;
    },
    enabled: !!selectedFarm?._id
  });

  const mortalityRaw = mortalityData?.data || {};
  const mortalityBySpecies = Array.isArray(mortalityRaw.bySpecies)
    ? Object.fromEntries(mortalityRaw.bySpecies.map(s => [s.species, safeNumber(s.deaths, 0)]))
    : (mortalityRaw.bySpecies || {});
  const mortality = { ...mortalityRaw, bySpecies: mortalityBySpecies };
  const mortalityRate = safeNumber(mortality?.mortalityRate, 0);

  const selectedTxLivestock = txLivestockId ? livestock.find(l => l._id === txLivestockId) : null;
  const maxDeathQty =
    txType === 'death' && selectedTxLivestock?.trackingType === 'batch'
      ? safeNumber(selectedTxLivestock.quantity, 0)
      : null;

  const qtyNum = safeNumber(txQty, 0);
  const unitPriceNum = txUnitPrice === '' ? NaN : Number(txUnitPrice);
  const previewTotal = Number.isFinite(unitPriceNum) && qtyNum > 0 ? unitPriceNum * qtyNum : null;

  // Add transaction
  const addTransaction = useMutation({
    mutationFn: async (data) => {
      const res = await api.post(`/livestock-inventory/farms/${selectedFarm._id}/transactions`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory-transactions']);
      queryClient.invalidateQueries(['inventory-summary']);
      queryClient.invalidateQueries(['financial-summary']);
      queryClient.invalidateQueries(['mortality-report']);
      setShowAddModal(false);
    }
  });

  // Delete transaction
  const deleteTransaction = useMutation({
    mutationFn: async (transactionId) => {
      await api.delete(`/livestock-inventory/transactions/${transactionId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['inventory-transactions']);
      queryClient.invalidateQueries(['inventory-summary']);
      queryClient.invalidateQueries(['financial-summary']);
    }
  });

  const handleAddTransaction = (e) => {
    e.preventDefault();
    setAddError('');

    const formData = new FormData(e.target);

    const quantity = Number(txQty);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      setAddError('Quantity must be a positive number.');
      return;
    }

    if (txType === 'death') {
      if (!txLivestockId) {
        setAddError('Please select the livestock/batch for a Death transaction.');
        return;
      }

      if (maxDeathQty != null && quantity > maxDeathQty) {
        setAddError(`Death quantity (${quantity}) cannot exceed batch quantity (${maxDeathQty}).`);
        return;
      }
    }

    const data = {
      transactionType: txType,
      livestockId: txLivestockId || undefined,
      species: txSpecies,
      quantity,
      transactionDate: formData.get('date'),
      notes: formData.get('notes') || undefined
    };

    if (txType === 'purchase' || txType === 'sale') {
      const unitPrice = Number(txUnitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setAddError('Price per unit is required for purchases and sales.');
        return;
      }
      data.unitPrice = unitPrice;
      data.totalAmount = quantity * unitPrice;
    }

    if (txType === 'death') {
      const unitPrice = Number(txUnitPrice);
      if (!Number.isFinite(unitPrice) || unitPrice < 0) {
        setAddError('Estimated value per animal is required for Death loss tracking.');
        return;
      }
      data.unitPrice = unitPrice;
      data.totalAmount = quantity * unitPrice;
      data.causeOfDeath = formData.get('deathCause') || undefined;
    }

    addTransaction.mutate(data);
  };

  if (!selectedFarm) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Please select a farm first</p>
          <Link to="/farms" className="text-green-600 hover:underline">Go to Farms</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <button type="button" onClick={goBack} className="p-2 hover:bg-gray-100 rounded-lg">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold">Inventory & Finance</h1>
            <p className="text-gray-500">{selectedFarm.name}</p>
          </div>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <Plus className="w-4 h-4" />
          Add Transaction
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Package className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Livestock</p>
              <p className="text-xl font-bold">{summary.totalCount || 0}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Sales</p>
              <p className="text-xl font-bold">₦{(financial.totalSales || 0).toLocaleString()}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingDown className="w-5 h-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Expenses</p>
              <p className="text-xl font-bold">₦{(financial.totalPurchases || 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400">Includes purchases + death losses</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${(financial.netProfit || 0) >= 0 ? 'bg-green-100' : 'bg-red-100'}`}>
              <DollarSign className={`w-5 h-5 ${(financial.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`} />
            </div>
            <div>
              <p className="text-sm text-gray-500">Net Profit</p>
              <p className={`text-xl font-bold ${(financial.netProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                ₦{Math.abs(financial.netProfit || 0).toLocaleString()}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Inventory by Species */}
      {summary.bySpecies && Object.keys(summary.bySpecies).length > 0 && (
        <div className="bg-white rounded-xl p-4 shadow-sm mb-6">
          <h3 className="font-semibold mb-3">Inventory by Species</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            {Object.entries(summary.bySpecies).map(([species, count]) => (
              <div key={species} className="text-center p-3 bg-gray-50 rounded-lg">
                <span className="text-2xl">{speciesEmoji[species] || '🐾'}</span>
                <p className="text-sm text-gray-500 capitalize mt-1">{species}</p>
                <p className="font-bold">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Mortality Alert */}
      {mortality.totalDeaths > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <h3 className="font-semibold text-red-800">Mortality Report (90 days)</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-red-600">Total Deaths</p>
              <p className="text-xl font-bold text-red-700">{mortality.totalDeaths}</p>
            </div>
            <div>
              <p className="text-sm text-red-600">Mortality Rate</p>
              <p className="text-xl font-bold text-red-700">
                {Number.isFinite(mortalityRate) ? mortalityRate.toFixed(1) : '0.0'}%
              </p>
            </div>
            {mortality.bySpecies && Object.entries(mortality.bySpecies).slice(0, 2).map(([species, count]) => (
              <div key={species}>
                <p className="text-sm text-red-600 capitalize">{species}</p>
                <p className="text-xl font-bold text-red-700">{count}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">Type:</span>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="purchase">Purchase</option>
            <option value="sale">Sale</option>
            <option value="birth">Birth</option>
            <option value="death">Death</option>
            <option value="transfer_in">Transfer In</option>
            <option value="transfer_out">Transfer Out</option>
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Species:</span>
          <select
            value={filterSpecies}
            onChange={e => setFilterSpecies(e.target.value)}
            className="border rounded-lg px-3 py-1 text-sm"
          >
            <option value="all">All</option>
            <option value="cattle">Cattle</option>
            <option value="goat">Goat</option>
            <option value="sheep">Sheep</option>
            <option value="rabbit">Rabbit</option>
            <option value="pig">Pig</option>
            <option value="poultry">Poultry</option>
            <option value="fish">Fish</option>
          </select>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-green-600" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No transactions yet</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-4 text-green-600 hover:underline"
            >
              Add your first transaction
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Date</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Type</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Species</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Qty</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Amount</th>
                <th className="text-left px-6 py-3 text-sm font-medium text-gray-500">Notes</th>
                <th className="text-right px-6 py-3 text-sm font-medium text-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {transactions.map(t => {
                const typeConfig = transactionTypes[t.type] || transactionTypes.purchase;
                const TypeIcon = typeConfig.icon;
                return (
                  <tr key={t._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 text-sm">
                      {formatDateSafe(t.date)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className={`p-1 rounded ${typeConfig.bg}`}>
                          <TypeIcon className={`w-4 h-4 ${typeConfig.color}`} />
                        </div>
                        <span className="text-sm font-medium">{typeConfig.label}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span>{speciesEmoji[t.species] || '🐾'} {t.species || '-'}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium">{t.quantity}</td>
                    <td className="px-6 py-4 text-sm">
                      {t.totalAmount != null ? (
                        <span className={t.type === 'sale' ? 'text-green-600' : 'text-red-600'}>
                          {t.type === 'sale' ? '+' : '-'}₦{t.totalAmount.toLocaleString()}
                        </span>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                      {t.notes || t.causeOfDeath || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => deleteTransaction.mutate(t._id)}
                        className="text-red-500 hover:text-red-700 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">Add Transaction</h2>
            
            <form onSubmit={handleAddTransaction} className="space-y-4">
              {addError && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg p-3 text-sm">
                  {addError}
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Transaction Type *
                </label>
                <select
                  name="type"
                  required
                  value={txType}
                  onChange={(e) => {
                    setTxType(e.target.value);
                    setAddError('');
                  }}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="purchase">Purchase</option>
                  <option value="sale">Sale</option>
                  <option value="birth">Birth</option>
                  <option value="death">Death</option>
                  <option value="transfer_in">Transfer In</option>
                  <option value="transfer_out">Transfer Out</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Species *
                </label>
                <select
                  name="species"
                  required
                  value={txSpecies}
                  onChange={(e) => {
                    setTxSpecies(e.target.value);
                    setAddError('');
                  }}
                  disabled={!!txLivestockId}
                  className="w-full border rounded-lg px-3 py-2 disabled:bg-gray-50"
                >
                  <option value="cattle">🐄 Cattle</option>
                  <option value="goat">🐐 Goat</option>
                  <option value="sheep">🐑 Sheep</option>
                  <option value="rabbit">🐇 Rabbit</option>
                  <option value="pig">🐷 Pig</option>
                  <option value="poultry">🐔 Poultry</option>
                  <option value="fish">🐟 Fish</option>
                </select>
                {txLivestockId && (
                  <p className="text-xs text-gray-500 mt-1">Species is set from the selected livestock.</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Livestock / Batch {txType === 'death' ? '*' : '(Optional)'}
                </label>
                <select
                  name="livestockId"
                  value={txLivestockId}
                  onChange={(e) => {
                    setTxLivestockId(e.target.value);
                    setAddError('');
                  }}
                  required={txType === 'death'}
                  className="w-full border rounded-lg px-3 py-2"
                >
                  <option value="" disabled={txType === 'death'}>
                    General transaction
                  </option>
                  {livestock.map(l => (
                    <option key={l._id} value={l._id}>
                      {speciesEmoji[l.species]} {l.name || l.tagId} {l.trackingType === 'batch' ? `(Batch: ${safeNumber(l.quantity, 0)})` : ''}
                    </option>
                  ))}
                </select>
                {txType === 'death' && (
                  <p className="text-xs text-gray-500 mt-1">Death transactions must be tied to a specific livestock/batch so we can reduce the live count and track loss.</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Quantity *
                  </label>
                  <input
                    type="number"
                    name="quantity"
                    min="1"
                    max={maxDeathQty != null ? String(maxDeathQty) : undefined}
                    required
                    value={txQty}
                    onChange={(e) => {
                      setTxQty(e.target.value === '' ? '' : Number(e.target.value));
                      setAddError('');
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {maxDeathQty != null && (
                    <p className="text-xs text-gray-500 mt-1">Available in batch: {maxDeathQty}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Date *
                  </label>
                  <input
                    type="date"
                    name="date"
                    required
                    defaultValue={new Date().toISOString().split('T')[0]}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              {(txType === 'purchase' || txType === 'sale' || txType === 'death') && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {txType === 'death' ? 'Estimated value per animal (₦) *' : 'Price per Unit (₦) *'}
                  </label>
                  <input
                    type="number"
                    name="pricePerUnit"
                    step="0.01"
                    required
                    value={txUnitPrice}
                    onChange={(e) => {
                      setTxUnitPrice(e.target.value);
                      setAddError('');
                    }}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                  {txType === 'death' && (
                    <p className="text-xs text-gray-500 mt-1">Default is taken from the livestock “cost” (estimated selling value). You can override it if needed.</p>
                  )}
                  {previewTotal != null && (
                    <p className="text-sm text-gray-600 mt-2">
                      {txType === 'sale' ? 'Total revenue:' : txType === 'death' ? 'Total loss:' : 'Total expense:'} ₦{previewTotal.toLocaleString()}
                    </p>
                  )}
                </div>
              )}

              {txType === 'death' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cause of Death
                  </label>
                  <select name="deathCause" className="w-full border rounded-lg px-3 py-2">
                    <option value="">Select cause</option>
                    <option value="disease">Disease</option>
                    <option value="accident">Accident</option>
                    <option value="predator">Predator</option>
                    <option value="old_age">Old Age</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  name="notes"
                  rows={2}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addTransaction.isPending}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                >
                  {addTransaction.isPending ? 'Adding...' : 'Add Transaction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
