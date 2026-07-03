import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Gift,
  Coins,
} from 'lucide-react';

export default function Customers() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [tier, setTier] = useState('REGULAR');
  const [birthday, setBirthday] = useState('');
  const [notes, setNotes] = useState('');

  // 1. Fetch Customers
  const { data, isLoading } = useQuery({
    queryKey: ['customersList', search],
    queryFn: async () => {
      const res = await api.get('/customers', { params: { search } });
      return res.data;
    },
  });

  // 2. Mutations
  const createMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.post('/customers', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customersList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to create customer profile');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/customers/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customersList'] });
    },
  });

  const resetForm = () => {
    setName('');
    setPhone('');
    setEmail('');
    setAddress('');
    setTier('REGULAR');
    setBirthday('');
    setNotes('');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate({
      name,
      phone,
      email,
      address,
      membershipLevel: tier,
      birthday: birthday || null,
      notes,
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Customer Profiles & Loyalty</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Track shopper history, membership tiers, and loyalty ledger points.</p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
        >
          <Plus size={14} /> Add Customer
        </button>
      </div>

      {/* Search Filter Row */}
      <div className="flex gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-2xl max-w-sm">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search by phone/name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 pl-9 pr-3 outline-none focus:border-brand-500 text-xs"
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                <th className="py-4 px-6">Customer Details</th>
                <th className="py-4 px-6">Phone Number</th>
                <th className="py-4 px-6">Membership Tier</th>
                <th className="py-4 px-6 text-center">Loyalty Points</th>
                <th className="py-4 px-6">Birthday</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-zinc-800 animate-pulse">
                    <td colSpan={6} className="py-6 px-6 bg-gray-150/10" />
                  </tr>
                ))
              ) : data?.customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-gray-400">
                    <Users size={32} className="mx-auto mb-2 stroke-1" />
                    No customer profile records found.
                  </td>
                </tr>
              ) : (
                data?.customers.map((cust: any) => (
                  <tr key={cust.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{cust.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">{cust.email || 'No email provided'}</div>
                    </td>
                    <td className="py-4 px-6 text-gray-600 dark:text-gray-300 font-semibold">{cust.phone}</td>
                    <td className="py-4 px-6">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${
                        cust.membershipLevel === 'GOLD' || cust.membershipLevel === 'PLATINUM'
                          ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                          : 'bg-zinc-500/10 text-zinc-500'
                      }`}>
                        {cust.membershipLevel}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center font-bold text-brand-600 dark:text-brand-400 flex items-center justify-center gap-1">
                      <Coins size={14} />
                      {cust.loyaltyPoints}
                    </td>
                    <td className="py-4 px-6 text-gray-500 flex items-center gap-1 mt-1">
                      <Gift size={13} className="text-gray-400" />
                      {cust.birthday ? new Date(cust.birthday).toLocaleDateString() : '-'}
                    </td>
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => {
                          if (confirm('Are you sure you want to delete this customer profile?')) {
                            deleteMutation.mutate(cust.id);
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
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-md">
            <h3 className="text-base font-bold mb-4">New Shopper Profile</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Shopper Name</label>
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
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Membership Tiers</label>
                  <select
                    value={tier}
                    onChange={(e) => setTier(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  >
                    <option value="REGULAR">Regular Member</option>
                    <option value="SILVER">Silver VIP</option>
                    <option value="GOLD">Gold VIP</option>
                    <option value="PLATINUM">Platinum VIP</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Birthday</label>
                  <input
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Customer Notes / Preferences</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  rows={2}
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
                  {createMutation.isPending ? 'Saving...' : 'Add Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
