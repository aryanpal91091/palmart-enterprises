import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  ClipboardList,
  Plus,
  CheckCircle,
  Clock,
  Trash2,
  DollarSign,
} from 'lucide-react';

export default function Purchases() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [supplierId, setSupplierId] = useState('');
  const [items, setItems] = useState<Array<{ productId: string; quantity: number; costPrice: number }>>([]);
  
  // Quick item entry states
  const [itemProductId, setItemProductId] = useState('');
  const [itemQty, setItemQty] = useState('');
  const [itemCost, setItemCost] = useState('');

  // 1. Queries
  const { data: poData, isLoading } = useQuery({
    queryKey: ['purchasesList'],
    queryFn: async () => {
      const res = await api.get('/purchases');
      return res.data;
    },
  });

  const { data: suppliersData } = useQuery({
    queryKey: ['suppliersListAll'],
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { limit: 100 } });
      return res.data;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['productsListAll'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { limit: 100 } });
      return res.data;
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/purchases', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchasesList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to create purchase order');
    },
  });

  const receiveMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.put(`/purchases/${id}/receive`);
    },
    onSuccess: () => {
      alert('Inventory items received and stock updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['purchasesList'] });
      queryClient.invalidateQueries({ queryKey: ['productsList'] });
    },
  });

  const resetForm = () => {
    setSupplierId('');
    setItems([]);
    setItemProductId('');
    setItemQty('');
    setItemCost('');
  };

  const handleAddItem = () => {
    if (!itemProductId || !itemQty || !itemCost) return;
    setItems([
      ...items,
      {
        productId: itemProductId,
        quantity: parseInt(itemQty, 10),
        costPrice: parseFloat(itemCost),
      },
    ]);
    setItemProductId('');
    setItemQty('');
    setItemCost('');
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (items.length === 0) {
      alert('Please add at least one item to the order');
      return;
    }
    createMutation.mutate({
      supplierId,
      items,
    });
  };

  // Find product detail for labels
  const getProductLabel = (id: string) => {
    const found = productsData?.products.find((p: any) => p.id === id);
    return found ? `${found.name} (SKU: ${found.sku})` : 'Product';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Supplier Purchases</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Issue purchase orders and track wholesale intake deliveries.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
        >
          <Plus size={14} /> New Purchase Order
        </button>
      </div>

      {/* Main Grid table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                <th className="py-4 px-6">Purchase Order ID</th>
                <th className="py-4 px-6">Wholesaler</th>
                <th className="py-4 px-6 text-right">Total Invoice Cost</th>
                <th className="py-4 px-6">Status</th>
                <th className="py-4 px-6">Delivery Date</th>
                <th className="py-4 px-6 text-center">Fulfill</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-150 animate-pulse">
                    <td colSpan={6} className="py-6 bg-gray-100/10" />
                  </tr>
                ))
              ) : poData?.orders.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <ClipboardList size={32} className="mx-auto mb-2 stroke-1" />
                    No wholesale purchase records created.
                  </td>
                </tr>
              ) : (
                poData?.orders.map((po: any) => (
                  <tr key={po.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 text-xs">
                    <td className="py-4 px-6 font-semibold">{po.id.slice(0, 16)}...</td>
                    <td className="py-4 px-6 font-semibold text-gray-700 dark:text-gray-300">{po.supplier.name}</td>
                    <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-gray-100">₹{po.totalAmount.toFixed(2)}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                        po.status === 'RECEIVED'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                          : 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-400">
                      {po.receivedAt ? new Date(po.receivedAt).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      {po.status === 'PENDING' ? (
                        <button
                          onClick={() => {
                            if (confirm('Fulfill order? This will increase stock counts.')) {
                              receiveMutation.mutate(po.id);
                            }
                          }}
                          className="flex items-center gap-1 mx-auto px-2 py-1 border border-brand-500 hover:bg-brand-500 hover:text-white rounded-lg text-[10px] font-bold text-brand-600 dark:text-brand-400 transition-colors"
                        >
                          <CheckCircle size={12} /> Receive Stock
                        </button>
                      ) : (
                        <span className="text-[10px] text-gray-400 font-semibold italic flex items-center justify-center gap-1">
                          <CheckCircle size={12} className="text-emerald-500" /> Complete
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-lg overflow-y-auto max-h-[85vh]">
            <h3 className="text-base font-bold mb-4">New Wholesale Purchase Order</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Select Supplier</label>
                <select
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  required
                >
                  <option value="">Select partner</option>
                  {suppliersData?.suppliers.map((s: any) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              {/* Add Purchase Order Item section */}
              <div className="bg-gray-50 dark:bg-zinc-850 p-4 rounded-2xl space-y-3 border border-gray-200/50 dark:border-zinc-800">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Add Item To Order List</p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <select
                      value={itemProductId}
                      onChange={(e) => setItemProductId(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                    >
                      <option value="">Select product</option>
                      {productsData?.products.map((p: any) => (
                        <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Intake Qty"
                      value={itemQty}
                      onChange={(e) => setItemQty(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                    />
                  </div>
                  <div>
                    <input
                      type="number"
                      placeholder="Cost Price (₹)"
                      value={itemCost}
                      onChange={(e) => setItemCost(e.target.value)}
                      className="w-full bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg p-2 text-xs"
                    />
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleAddItem}
                  className="w-full py-1.5 bg-zinc-800 hover:bg-zinc-700 text-white rounded-lg text-xs font-semibold"
                >
                  Add Item to PO
                </button>
              </div>

              {/* Selected items array display */}
              <div className="space-y-2">
                <p className="text-[10px] font-bold text-gray-400 uppercase">Items Queue ({items.length})</p>
                {items.length === 0 ? (
                  <p className="text-[10px] text-gray-500 italic">No items added to queue yet</p>
                ) : (
                  <div className="max-h-36 overflow-y-auto space-y-2">
                    {items.map((item, idx) => (
                      <div key={idx} className="flex justify-between items-center text-xs p-2 bg-gray-100/50 dark:bg-zinc-800 rounded-xl">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold truncate">{getProductLabel(item.productId)}</p>
                          <p className="text-[10px] text-gray-400">Qty: {item.quantity} • Cost: ₹{item.costPrice.toFixed(2)}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="text-red-500 hover:underline flex-shrink-0"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-zinc-800/50">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-2.5 bg-gray-100 dark:bg-zinc-800 rounded-xl text-xs font-semibold text-gray-600"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  {createMutation.isPending ? 'Issuing...' : 'Create Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
