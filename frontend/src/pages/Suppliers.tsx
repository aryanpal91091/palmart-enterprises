import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Truck,
  Search,
  Plus,
  Trash2,
  Phone,
  MapPin,
  Mail,
} from 'lucide-react';

export default function Suppliers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [contactName, setContactName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [balance, setBalance] = useState('');

  // 1. Fetch Suppliers
  const { data, isLoading } = useQuery({
    queryKey: ['suppliersList', search],
    queryFn: async () => {
      const res = await api.get('/suppliers', { params: { search } });
      return res.data;
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/suppliers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliersList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to add supplier');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['suppliersList'] });
    },
  });

  const resetForm = () => {
    setName('');
    setContactName('');
    setEmail('');
    setPhone('');
    setAddress('');
    setBalance('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      contactName,
      email,
      phone,
      address,
      outstandingBalance: balance || '0',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Suppliers Ledger</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage supply partnerships, contact details, and wholesale debts.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
        >
          <Plus size={14} /> Add Supplier
        </button>
      </div>

      {/* Search Bar */}
      <div className="flex gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-2xl max-w-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 pl-9 pr-3 outline-none focus:border-brand-500 text-xs"
          />
        </div>
      </div>

      {/* Main Table Grid */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                <th className="py-4 px-6">Company / Representative</th>
                <th className="py-4 px-6">Contact Info</th>
                <th className="py-4 px-6">Wholesale Address</th>
                <th className="py-4 px-6 text-right">Outstanding Debt Balance</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(2)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-zinc-800 animate-pulse">
                    <td colSpan={5} className="py-6 px-6 bg-gray-150/10" />
                  </tr>
                ))
              ) : data?.suppliers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-gray-400">
                    <Truck size={32} className="mx-auto mb-2 stroke-1" />
                    No wholesale supplier partnerships logged yet.
                  </td>
                </tr>
              ) : (
                data?.suppliers.map((sup: any) => (
                  <tr key={sup.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{sup.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Rep: {sup.contactName || '-'}</div>
                    </td>
                    <td className="py-4 px-6 space-y-0.5 text-xs text-gray-600 dark:text-gray-400 font-medium">
                      <div className="flex items-center gap-1">
                        <Phone size={11} className="text-gray-400" /> {sup.phone}
                      </div>
                      {sup.email && (
                        <div className="flex items-center gap-1">
                          <Mail size={11} className="text-gray-400" /> {sup.email}
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-6 text-xs text-gray-500 font-medium flex items-center gap-1 mt-3">
                      <MapPin size={12} className="text-gray-400 flex-shrink-0" />
                      {sup.address || 'Default Area'}
                    </td>
                    <td className={`py-4 px-6 text-right font-bold ${
                      sup.outstandingBalance > 0 ? 'text-red-500' : 'text-gray-400'
                    }`}>
                      ₹{sup.outstandingBalance.toLocaleString()}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this supplier?')) {
                            deleteMutation.mutate(sup.id);
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

      {/* Add Modal Form */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-md">
            <h3 className="text-base font-bold mb-4">New Wholesale Supplier</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Company Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Contact Rep Name</label>
                  <input
                    type="text"
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Opening Debt (₹)</label>
                  <input
                    type="number"
                    value={balance}
                    onChange={(e) => setBalance(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Office Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
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
                  {createMutation.isPending ? 'Saving...' : 'Add Supplier'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
