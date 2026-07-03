import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  Download,
  Upload,
  Filter,
  Package,
} from 'lucide-react';

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('');
  const [stockStatus, setStockStatus] = useState('');
  const [expiryStatus, setExpiryStatus] = useState('');
  const [page, setPage] = useState(1);

  // Edit / Create Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);

  // Form Fields
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [costPrice, setCostPrice] = useState('');
  const [currentStock, setCurrentStock] = useState('');
  const [minStock, setMinStock] = useState('');
  const [unit, setUnit] = useState('pcs');
  const [categoryId, setCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [mfgDate, setMfgDate] = useState('');
  const [expDate, setExpDate] = useState('');

  // 1. Fetch Products
  const { data: prodData, isLoading } = useQuery({
    queryKey: ['productsList', search, selectedCat, stockStatus, expiryStatus, page],
    queryFn: async () => {
      const res = await api.get('/products', {
        params: {
          search,
          categoryId: selectedCat || undefined,
          stockStatus: stockStatus || undefined,
          expiryStatus: expiryStatus || undefined,
          page,
          limit: 10,
        },
      });
      return res.data;
    },
  });

  const { data: catData } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const res = await api.get('/products/categories');
      return res.data;
    },
  });

  const { data: brandData } = useQuery({
    queryKey: ['brands'],
    queryFn: async () => {
      const res = await api.get('/products/brands');
      return res.data;
    },
  });

  // 2. Mutations (Create, Update, Delete)
  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editingProduct) {
        return api.put(`/products/${editingProduct.id}`, payload);
      } else {
        return api.post('/products', payload);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productsList'] });
      setShowModal(false);
      resetForm();
    },
    onError: (err: any) => {
      alert(err.message || 'Failed to save product');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['productsList'] });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (csvString: string) => {
      return api.post('/products/import-csv', { csvString });
    },
    onSuccess: (res) => {
      alert(res.data.message);
      queryClient.invalidateQueries({ queryKey: ['productsList'] });
    },
  });

  const resetForm = () => {
    setEditingProduct(null);
    setName('');
    setSku('');
    setBarcode('');
    setSellingPrice('');
    setCostPrice('');
    setCurrentStock('');
    setMinStock('');
    setUnit('pcs');
    setCategoryId('');
    setBrandId('');
    setMfgDate('');
    setExpDate('');
  };

  const handleEdit = (prod: any) => {
    setEditingProduct(prod);
    setName(prod.name);
    setSku(prod.sku);
    setBarcode(prod.barcode || '');
    setSellingPrice(prod.sellingPrice.toString());
    setCostPrice(prod.costPrice.toString());
    setCurrentStock(prod.currentStock.toString());
    setMinStock(prod.minStockLevel.toString());
    setUnit(prod.unit);
    setCategoryId(prod.categoryId);
    setBrandId(prod.brandId);
    setMfgDate(prod.mfgDate ? new Date(prod.mfgDate).toISOString().split('T')[0] : '');
    setExpDate(prod.expDate ? new Date(prod.expDate).toISOString().split('T')[0] : '');
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name,
      sku,
      barcode: barcode || null,
      sellingPrice,
      costPrice,
      currentStock,
      minStockLevel: minStock,
      unit,
      categoryId,
      brandId,
      mfgDate: mfgDate || null,
      expDate: expDate || null,
    };
    saveMutation.mutate(payload);
  };

  const handleCSVImport = () => {
    const csvData = prompt("Paste CSV data below (Format: name,sku,sellingPrice,costPrice,currentStock,barcode):");
    if (csvData) {
      const formattedCSV = `name,sku,sellingPrice,costPrice,currentStock,barcode\n${csvData}`;
      importMutation.mutate(formattedCSV);
    }
  };

  // Simple CSV Export Trigger
  const handleExportCSV = () => {
    if (!prodData?.products) return;
    const header = 'Name,SKU,Barcode,CostPrice,SellingPrice,Stock,Unit\n';
    const rows = prodData.products.map((p: any) => 
      `"${p.name}","${p.sku}","${p.barcode || ''}",${p.costPrice},${p.sellingPrice},${p.currentStock},"${p.unit}"`
    ).join('\n');
    
    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", "products_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header View */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Products Catalogue</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Manage stock items, tags, costs, and brands.</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleCSVImport}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-zinc-700 hover:border-brand-500 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900 shadow-sm"
          >
            <Upload size={14} /> Import CSV
          </button>
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 dark:border-zinc-700 hover:border-brand-500 rounded-xl text-xs font-semibold text-gray-600 dark:text-gray-400 bg-white dark:bg-zinc-900 shadow-sm"
          >
            <Download size={14} /> Export CSV
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowModal(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
          >
            <Plus size={14} /> Add Product
          </button>
        </div>
      </div>

      {/* Query Filters row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-2xl">
        <div className="relative">
          <Search size={16} className="absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            placeholder="Search SKU/name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 pl-9 pr-3 outline-none focus:border-brand-500 text-xs"
          />
        </div>

        <select
          value={selectedCat}
          onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs text-gray-500"
        >
          <option value="">All Categories</option>
          {catData?.categories.map((c: any) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <select
          value={stockStatus}
          onChange={(e) => setStockStatus(e.target.value)}
          className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs text-gray-500"
        >
          <option value="">Stock Status</option>
          <option value="low">Low Stock Alerts</option>
          <option value="out">Out of Stock</option>
        </select>

        <select
          value={expiryStatus}
          onChange={(e) => setExpiryStatus(e.target.value)}
          className="bg-gray-50 dark:bg-zinc-800/50 border border-gray-200 dark:border-zinc-700/50 rounded-xl py-2 px-3 outline-none focus:border-brand-500 text-xs text-gray-500"
        >
          <option value="">Expiry Status</option>
          <option value="expired">Expired Products</option>
          <option value="near">Near Expiry (&lt;30 days)</option>
        </select>
      </div>

      {/* Main Table panel */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20">
                <th className="py-4 px-6">Product Details</th>
                <th className="py-4 px-6">SKU / Barcode</th>
                <th className="py-4 px-6">Category</th>
                <th className="py-4 px-6 text-right">Cost Price</th>
                <th className="py-4 px-6 text-right">Selling Price</th>
                <th className="py-4 px-6 text-center">Stock Level</th>
                <th className="py-4 px-6 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} className="border-b border-gray-100 dark:border-zinc-800 animate-pulse">
                    <td colSpan={7} className="py-6 px-6 bg-gray-50/10 dark:bg-zinc-800/5" />
                  </tr>
                ))
              ) : prodData?.products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-400">
                    <Package size={36} className="mx-auto mb-2 stroke-1" />
                    No products matching filter criteria.
                  </td>
                </tr>
              ) : (
                prodData?.products.map((prod: any) => (
                  <tr key={prod.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                    <td className="py-4 px-6">
                      <div className="font-semibold text-gray-800 dark:text-gray-200">{prod.name}</div>
                      <div className="text-[10px] text-gray-400 font-medium">Brand: {prod.brand?.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-xs font-mono font-semibold text-gray-600 dark:text-gray-300">{prod.sku}</div>
                      <div className="text-[10px] text-gray-400 font-mono mt-0.5">{prod.barcode || '-'}</div>
                    </td>
                    <td className="py-4 px-6">
                      <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-gray-400">
                        {prod.category?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right font-semibold text-gray-500">₹{prod.costPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-right font-bold text-gray-800 dark:text-gray-200">₹{prod.sellingPrice.toFixed(2)}</td>
                    <td className="py-4 px-6 text-center">
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        prod.currentStock <= prod.minStockLevel
                          ? 'bg-red-500/10 text-red-500'
                          : 'bg-brand-500/10 text-brand-500'
                      }`}>
                        {prod.currentStock} {prod.unit}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleEdit(prod)}
                          className="p-1.5 border border-gray-200 dark:border-zinc-700 hover:border-brand-500 hover:text-brand-500 rounded-lg text-gray-500"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm('Are you sure you want to delete this product?')) {
                              deleteMutation.mutate(prod.id);
                            }
                          }}
                          className="p-1.5 border border-gray-200 dark:border-zinc-700 hover:border-red-500 hover:text-red-500 rounded-lg text-gray-500"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Simple pagination footer */}
        <div className="p-4 border-t border-gray-100 dark:border-zinc-800 flex justify-between items-center">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-xs font-semibold rounded-lg disabled:opacity-50"
          >
            Prev
          </button>
          <span className="text-xs font-bold text-gray-400">Page {page} of {prodData?.meta.totalPages || 1}</span>
          <button
            onClick={() => setPage((p) => Math.min(prodData?.meta.totalPages || 1, p + 1))}
            disabled={page === (prodData?.meta.totalPages || 1)}
            className="px-3 py-1 bg-gray-100 dark:bg-zinc-800 text-xs font-semibold rounded-lg disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Editor Modal Window */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 p-6 rounded-3xl w-full max-w-lg overflow-y-auto max-h-[90vh]">
            <h3 className="text-base font-bold mb-4">{editingProduct ? 'Edit Catalogue Item' : 'New Stock Item'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">SKU identifier</label>
                  <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Barcode Code</label>
                  <input
                    type="text"
                    value={barcode}
                    onChange={(e) => setBarcode(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Stock Unit</label>
                  <input
                    type="text"
                    value={unit}
                    onChange={(e) => setUnit(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={costPrice}
                    onChange={(e) => setCostPrice(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Current Stock Quantity</label>
                  <input
                    type="number"
                    value={currentStock}
                    onChange={(e) => setCurrentStock(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Min Alert Stock Threshold</label>
                  <input
                    type="number"
                    value={minStock}
                    onChange={(e) => setMinStock(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none focus:border-brand-500"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    required
                  >
                    <option value="">Select Category</option>
                    {catData?.categories.map((c: any) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Brand</label>
                  <select
                    value={brandId}
                    onChange={(e) => setBrandId(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                    required
                  >
                    <option value="">Select Brand</option>
                    {brandData?.brands.map((b: any) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Manufacturing Date</label>
                  <input
                    type="date"
                    value={mfgDate}
                    onChange={(e) => setMfgDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={expDate}
                    onChange={(e) => setExpDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
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
                  disabled={saveMutation.isPending}
                  className="flex-1 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold shadow-lg"
                >
                  {saveMutation.isPending ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
