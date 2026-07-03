import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Receipt,
  Plus,
  Trash2,
  DollarSign,
  TrendingDown,
} from 'lucide-react';

export default function Expenses() {
  const queryClient = useQueryClient();
  const [category, setCategory] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [title, setTitle] = useState('');
  const [expCategory, setExpCategory] = useState('RENT');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  // 1. Fetch Expenses
  const { data, isLoading } = useQuery({
    queryKey: ['expensesList', category],
    queryFn: async () => {
      const res = await api.get('/expenses', { params: { category: category || undefined } });
      return res.data;
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/expenses', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensesList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to record expense');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/expenses/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expensesList'] });
    },
  });

  const resetForm = () => {
    setTitle('');
    setExpCategory('RENT');
    setAmount('');
    setDescription('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      title,
      category: expCategory,
      amount,
      description,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Expense Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track rent, utility bills, maintenance fees, and miscellaneous costs.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
        >
          <Plus size={14} /> Record Expense
        </button>
      </div>

      {/* Filter Category & Total summary card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 flex gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-2xl">
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs text-gray-500"
          >
            <option value="">All Categories</option>
            <option value="RENT">Rent & Lease</option>
            <option value="ELECTRICITY">Electricity & Power</option>
            <option value="SALARY">Staff Salaries</option>
            <option value="INTERNET">Internet & Communications</option>
            <option value="MAINTENANCE">Store Maintenance</option>
            <option value="TRANSPORT">Logistics & Transport</option>
            <option value="MISC">Miscellaneous</option>
          </select>
        </div>

        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-4 rounded-2xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-gray-400">Total Summed Expenses</p>
            <p className="text-xl font-bold mt-1">₹{data?.total.toLocaleString() || 0}</p>
          </div>
          <div className="p-3 bg-red-500/10 text-red-500 rounded-xl">
            <TrendingDown size={20} />
          </div>
        </div>
      </div>

      {/* Main Expenses Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                <th className="py-4 px-6">Expense Title</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6">Details / Notes</th>
                <th className="py-4 px-6 text-right">Cost (₹)</th>
                <th className="py-4 px-6">Date logged</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-150 animate-pulse">
                    <td colSpan={6} className="py-6 px-6 bg-gray-100/10" />
                  </tr>
                ))
              ) : data?.expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Receipt size={32} className="mx-auto mb-2 stroke-1" />
                    No expense records matching query filters.
                  </td>
                </tr>
              ) : (
                data?.expenses.map((exp: any) => (
                  <tr key={exp.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 text-xs">
                    <td className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300">{exp.title}</td>
                    <td className="py-4 px-6">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-red-500/10 text-red-600 dark:text-red-400">
                        {exp.category}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-gray-500 italic max-w-xs truncate">{exp.description || '-'}</td>
                    <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-gray-100">₹{exp.amount.toFixed(2)}</td>
                    <td className="py-4 px-6 text-gray-400">{new Date(exp.date).toLocaleDateString()}</td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this expense record?')) {
                            deleteMutation.mutate(exp.id);
                          }
                        }}
                        className="p-1.5 border border-gray-200 dark:border-zinc-700 hover:border-red-500 hover:text-red-500 rounded-lg text-gray-500"
                      >
                        <Trash2 size={13} />
                      </button>
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
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-sm">
            <h3 className="text-base font-bold mb-4">Record Store Expense</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Expense Title</label>
                <input
                  type="text"
                  placeholder="e.g. June Electricity Bill"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Category</label>
                  <select
                    value={expCategory}
                    onChange={(e) => setExpCategory(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  >
                    <option value="RENT">Rent & Lease</option>
                    <option value="ELECTRICITY">Electricity & Power</option>
                    <option value="SALARY">Staff Salaries</option>
                    <option value="INTERNET">Internet & Communications</option>
                    <option value="MAINTENANCE">Store Maintenance</option>
                    <option value="TRANSPORT">Logistics & Transport</option>
                    <option value="MISC">Miscellaneous</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Amount (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Description / Billing Details</label>
                <textarea
                  placeholder="Record vendor details or bill numbers..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  rows={3}
                />
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
                  {createMutation.isPending ? 'Saving...' : 'Track Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
