import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Save,
  CheckCircle,
} from 'lucide-react';

export default function Settings() {
  const queryClient = useQueryClient();
  const [storeName, setStoreName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [currency, setCurrency] = useState('INR');
  const [footerMsg, setFooterMsg] = useState('');

  // 1. Fetch Store configurations
  const { data, isLoading } = useQuery({
    queryKey: ['storeSettings'],
    queryFn: async () => {
      const res = await api.get('/settings');
      const settings = res.data.settings;
      if (settings) {
        setStoreName(settings.storeName);
        setGstNumber(settings.gstNumber);
        setPhone(settings.phone);
        setEmail(settings.email);
        setAddress(settings.address);
        setCurrency(settings.currency);
        setFooterMsg(settings.invoiceFooter);
      }
      return settings;
    },
  });

  // 2. Mutations (Save configuration, Restore DB)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      return api.put('/settings', payload);
    },
    onSuccess: () => {
      alert('Store settings saved successfully!');
      queryClient.invalidateQueries({ queryKey: ['storeSettings'] });
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to update store metadata');
    },
  });

  const restoreMutation = useMutation({
    mutationFn: async (backupData: any) => {
      return api.post('/settings/restore', { backupData });
    },
    onSuccess: () => {
      alert('Database restored successfully! Re-routing session...');
      window.location.reload();
    },
    onError: (err: any) => {
      alert(err.message || 'Database restore failed. Check JSON backup format.');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      storeName,
      gstNumber,
      phone,
      email,
      address,
      currency,
      invoiceFooter: footerMsg,
    });
  };

  const handleDBBackup = () => {
    // Navigate directly to download link
    const token = localStorage.getItem('token');
    if (!token) return;
    
    // Perform download stream trigger
    const link = document.createElement('a');
    link.href = '/api/settings/backup';
    link.setAttribute('download', 'palmart_backup.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDBRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (confirm('Warning: Restoring the database will overwrite all active transactions, customer records, and product logs. Continue?')) {
          restoreMutation.mutate(parsed);
        }
      } catch (err) {
        alert('Invalid file format. Please select a valid JSON backup file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">System Settings & Controls</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Customize billing headers, invoice footer texts, and run backup logs.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Core Store Profile info */}
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><SettingsIcon size={16} /> Invoice & Billing Metadata</h2>
          
          {isLoading ? (
            <p className="text-xs text-gray-400">Loading configurations...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Store Name</label>
                  <input
                    type="text"
                    value={storeName}
                    onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">GSTIN Tax Registration</label>
                  <input
                    type="text"
                    value={gstNumber}
                    onChange={(e) => setGstNumber(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Corporate Phone</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Corporate Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Store Address</label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Currency Code</label>
                  <input
                    type="text"
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-1">Thermal Receipt Footer Message</label>
                <textarea
                  value={footerMsg}
                  onChange={(e) => setFooterMsg(e.target.value)}
                  className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  rows={2}
                />
              </div>

              <button
                type="submit"
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
              >
                <Save size={14} /> Update Store Profile
              </button>
            </form>
          )}
        </div>

        {/* Database backup restoration sidebar */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><Save size={16} /> Database Backup ledger</h2>
          
          <div className="space-y-3">
            <button
              onClick={handleDBBackup}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-800/40 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-250 dark:border-zinc-800 rounded-2xl text-xs font-semibold"
            >
              <span>Download DB JSON Backup</span>
              <Download size={14} className="text-gray-400" />
            </button>

            <div className="relative">
              <label className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-zinc-800/40 hover:bg-gray-100 dark:hover:bg-zinc-800 border border-gray-250 dark:border-zinc-800 rounded-2xl text-xs font-semibold cursor-pointer">
                <span>Upload & Restore Backup</span>
                <Upload size={14} className="text-gray-400" />
                <input
                  type="file"
                  accept=".json"
                  onChange={handleDBRestore}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
