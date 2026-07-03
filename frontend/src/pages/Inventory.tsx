import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Layers,
  History,
  AlertTriangle,
  RefreshCcw,
  ArrowRightLeft,
  Settings,
} from 'lucide-react';

export default function Inventory() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'ADJUST' | 'TRANSFER' | 'HISTORY'>('ALERTS');
  const [historyPage, setHistoryPage] = useState(1);

  // Forms states
  const [selectedProduct, setSelectedProduct] = useState('');
  const [qtyChange, setQtyChange] = useState('');
  const [adjType, setAdjType] = useState('STOCK_IN');
  const [reason, setReason] = useState('');

  const [transProduct, setTransProduct] = useState('');
  const [transQty, setTransQty] = useState('');
  const [fromLoc, setFromLoc] = useState('Main Warehouse');
  const [toLoc, setToLoc] = useState('Aisle A');
  const [transReason, setTransReason] = useState('');

  // 1. Queries
  const { data: alertsData, isLoading: alertsLoading } = useQuery({
    queryKey: ['inventoryAlerts'],
    queryFn: async () => {
      const res = await api.get('/inventory/alerts');
      return res.data;
    },
  });

  const { data: historyData, isLoading: historyLoading } = useQuery({
    queryKey: ['inventoryHistory', historyPage],
    queryFn: async () => {
      const res = await api.get('/inventory/logs', { params: { page: historyPage } });
      return res.data;
    },
  });

  const { data: productsData } = useQuery({
    queryKey: ['posProductsSimple'],
    queryFn: async () => {
      const res = await api.get('/products', { params: { limit: 100 } });
      return res.data;
    },
  });

  // 2. Mutations
  const adjustMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inventory/adjust', payload);
    },
    onSuccess: () => {
      alert('Stock adjusted successfully');
      queryClient.invalidateQueries({ queryKey: ['inventoryAlerts'] });
      queryClient.invalidateQueries({ queryKey: ['inventoryHistory'] });
      setSelectedProduct('');
      setQtyChange('');
      setReason('');
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to adjust stock');
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/inventory/transfer', payload);
    },
    onSuccess: () => {
      alert('Stock transfer completed');
      queryClient.invalidateQueries({ queryKey: ['inventoryHistory'] });
      setTransProduct('');
      setTransQty('');
      setTransReason('');
    },
    onError: (err: any) => {
      alert(err.message || 'Transfer failed');
    },
  });

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    adjustMutation.mutate({
      productId: selectedProduct,
      quantityChange: qtyChange,
      type: adjType,
      reason,
    });
  };

  const handleTransferSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    transferMutation.mutate({
      productId: transProduct,
      quantity: transQty,
      fromLocation: fromLoc,
      toLocation: toLoc,
      reason: transReason,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Inventory & Stock Logs</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Control warehouse transfers, manual reconciliations, and low stock warnings.</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 space-x-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('ALERTS')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'ALERTS'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <AlertTriangle size={16} /> Alerts & Safety levels
        </button>
        <button
          onClick={() => setActiveTab('ADJUST')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'ADJUST'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <RefreshCcw size={16} /> Adjust Stock
        </button>
        <button
          onClick={() => setActiveTab('TRANSFER')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'TRANSFER'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <ArrowRightLeft size={16} /> Virtual Transfers
        </button>
        <button
          onClick={() => setActiveTab('HISTORY')}
          className={`pb-3 flex items-center gap-1.5 ${
            activeTab === 'HISTORY'
              ? 'border-b-2 border-brand-500 text-brand-500'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <History size={16} /> Transaction History
        </button>
      </div>

      {/* Tab Panels */}
      {activeTab === 'ALERTS' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Low stock alerts */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-yellow-600 dark:text-yellow-400 mb-4 flex items-center gap-1">
              <AlertTriangle size={16} /> Low Stock Warnings
            </h3>
            {alertsLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : alertsData?.lowStock.length === 0 ? (
              <p className="text-xs text-gray-400">No items below safety limits.</p>
            ) : (
              <div className="space-y-3">
                {alertsData?.lowStock.map((prod: any) => (
                  <div key={prod.id} className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl flex justify-between text-xs">
                    <div>
                      <p className="font-bold">{prod.name}</p>
                      <p className="text-gray-400 mt-0.5">SKU: {prod.sku}</p>
                    </div>
                    <span className="font-bold text-red-500">{prod.currentStock} left (Min: {prod.minStockLevel})</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Near Expiry */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-blue-500 mb-4 flex items-center gap-1">
              <AlertTriangle size={16} /> Near Expiry (&lt;30 days)
            </h3>
            {alertsLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : alertsData?.nearExpiry.length === 0 ? (
              <p className="text-xs text-gray-400">No items near expiry.</p>
            ) : (
              <div className="space-y-3">
                {alertsData?.nearExpiry.map((prod: any) => (
                  <div key={prod.id} className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl flex justify-between text-xs">
                    <div>
                      <p className="font-bold">{prod.name}</p>
                      <p className="text-gray-400 mt-0.5">Exp Date: {new Date(prod.expDate).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-blue-500">{prod.currentStock} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Expired */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl">
            <h3 className="text-sm font-bold text-red-500 mb-4 flex items-center gap-1">
              <AlertTriangle size={16} /> Expired Inventory
            </h3>
            {alertsLoading ? (
              <p className="text-xs text-gray-400">Loading...</p>
            ) : alertsData?.expired.length === 0 ? (
              <p className="text-xs text-gray-400">No expired items found.</p>
            ) : (
              <div className="space-y-3">
                {alertsData?.expired.map((prod: any) => (
                  <div key={prod.id} className="p-3 bg-gray-50 dark:bg-zinc-800/30 rounded-xl flex justify-between text-xs border border-red-500/20">
                    <div>
                      <p className="font-bold text-red-500">{prod.name}</p>
                      <p className="text-gray-400 mt-0.5">Expired on: {new Date(prod.expDate).toLocaleDateString()}</p>
                    </div>
                    <span className="font-bold text-red-500">{prod.currentStock} units</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'ADJUST' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl max-w-md">
          <h3 className="text-sm font-bold mb-4">Stock Level Manual Correction</h3>
          <form onSubmit={handleAdjustSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Product</label>
              <select
                value={selectedProduct}
                onChange={(e) => setSelectedProduct(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                required
              >
                <option value="">Select product to correct</option>
                {productsData?.products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.currentStock} {p.unit})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Quantity Change</label>
              <input
                type="number"
                placeholder="e.g. +10 or -5"
                value={qtyChange}
                onChange={(e) => setQtyChange(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Adjustment Type</label>
              <select
                value={adjType}
                onChange={(e) => setAdjType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
              >
                <option value="STOCK_IN">Stock In (Purchase/Replenish)</option>
                <option value="STOCK_OUT">Stock Out (POS Offline Checkouts)</option>
                <option value="DAMAGE">Damaged Goods Write-off</option>
                <option value="ADJUSTMENT">Stocktaking Discrepancies Correction</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Reason / Notes</label>
              <textarea
                placeholder="Write reason for auditing logs..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                rows={3}
                required
              />
            </div>

            <button
              type="submit"
              disabled={adjustMutation.isPending}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-lg shadow-brand-500/20"
            >
              {adjustMutation.isPending ? 'Saving...' : 'Apply Correction'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'TRANSFER' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl max-w-md">
          <h3 className="text-sm font-bold mb-4">Internal Location Stock Transfer</h3>
          <form onSubmit={handleTransferSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Product</label>
              <select
                value={transProduct}
                onChange={(e) => setTransProduct(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                required
              >
                <option value="">Select product to transfer</option>
                {productsData?.products.map((p: any) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (Stock: {p.currentStock})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Quantity</label>
              <input
                type="number"
                placeholder="Quantity to transfer"
                value={transQty}
                onChange={(e) => setTransQty(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">From Location</label>
                <input
                  type="text"
                  value={fromLoc}
                  onChange={(e) => setFromLoc(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">To Location</label>
                <input
                  type="text"
                  value={toLoc}
                  onChange={(e) => setToLoc(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Transfer Reason</label>
              <textarea
                placeholder="Reason for stock movement..."
                value={transReason}
                onChange={(e) => setTransReason(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                rows={3}
              />
            </div>

            <button
              type="submit"
              disabled={transferMutation.isPending}
              className="w-full bg-brand-500 hover:bg-brand-600 text-white rounded-xl py-3 text-xs font-bold transition-all shadow-lg"
            >
              {transferMutation.isPending ? 'Saving...' : 'Execute Stock Transfer'}
            </button>
          </form>
        </div>
      )}

      {activeTab === 'HISTORY' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/25 font-sans">
                  <th className="py-4 px-6">Product</th>
                  <th className="py-4 px-6 text-center">Qty Change</th>
                  <th className="py-4 px-6">Transaction Type</th>
                  <th className="py-4 px-6">Location</th>
                  <th className="py-4 px-6">Reason / Notes</th>
                  <th className="py-4 px-6">Date</th>
                </tr>
              </thead>
              <tbody>
                {historyLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-100 dark:border-zinc-850 animate-pulse">
                      <td colSpan={6} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : historyData?.logs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-12 text-gray-400">
                      No stock history recorded.
                    </td>
                  </tr>
                ) : (
                  historyData?.logs.map((log: any) => (
                    <tr key={log.id} className="border-b border-gray-100 dark:border-zinc-800/50 text-xs">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-gray-800 dark:text-gray-200">{log.product.name}</div>
                        <div className="text-[10px] text-gray-400 font-mono mt-0.5">{log.product.sku}</div>
                      </td>
                      <td className={`py-4 px-6 text-center font-bold ${
                        log.quantityChange > 0 ? 'text-emerald-500' : 'text-red-500'
                      }`}>
                        {log.quantityChange > 0 ? `+${log.quantityChange}` : log.quantityChange}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                          log.type.startsWith('STOCK_IN') || log.type.startsWith('TRANSFER_IN')
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                            : 'bg-red-500/10 text-red-600 dark:text-red-400'
                        }`}>
                          {log.type}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-gray-500 font-medium">{log.location || 'Default Store'}</td>
                      <td className="py-4 px-6 text-gray-600 dark:text-gray-400 font-medium italic">{log.reason || '-'}</td>
                      <td className="py-4 px-6 text-gray-400">{new Date(log.createdAt).toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
