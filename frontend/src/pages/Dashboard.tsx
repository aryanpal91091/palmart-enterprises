import { useQuery } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  AlertTriangle,
  Users,
  Briefcase,
  Layers,
  ArrowRight,
  TrendingDown,
  Percent,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';

const COLORS = ['#22c55e', '#eab308', '#ef4444'];

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard-stats');
      return res.data;
    },
    refetchInterval: 15000, // Refresh statistics every 15s for hot POS environments
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-8 w-48 bg-gray-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-32 bg-gray-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
          <div className="h-96 bg-gray-200 dark:bg-zinc-800 rounded-3xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center py-12">
        <p className="text-red-500 font-semibold">Failed to load dashboard metrics. Check backend connection.</p>
      </div>
    );
  }

  const { kpis, charts, recentTransactions } = data;

  return (
    <div className="space-y-8">
      {/* Header and Summary banner */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Overview Dashboard</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Real-time statistics and sales indicators.</p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Today's Sales */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl flex items-center justify-between hover-scale shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Today's Sales</p>
            <p className="text-2xl font-bold">₹{(kpis.todaySales).toLocaleString()}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 font-semibold">
              <TrendingUp size={14} />
              {kpis.todaySalesCount} Checkouts
            </p>
          </div>
          <div className="p-4 bg-brand-500/10 text-brand-500 rounded-2xl">
            <ShoppingBag size={24} />
          </div>
        </div>

        {/* Total Profit */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl flex items-center justify-between hover-scale shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Total Profit</p>
            <p className="text-2xl font-bold">₹{kpis.profit.toLocaleString()}</p>
            <p className="text-xs text-brand-600 dark:text-brand-400 flex items-center gap-1 font-semibold">
              <Percent size={14} />
              Net Margin Active
            </p>
          </div>
          <div className="p-4 bg-emerald-500/10 text-emerald-500 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        {/* Expenses */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl flex items-center justify-between hover-scale shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Monthly Expenses</p>
            <p className="text-2xl font-bold">₹{kpis.expenses.toLocaleString()}</p>
            <p className="text-xs text-red-500 flex items-center gap-1 font-semibold">
              <TrendingDown size={14} />
              Bills & Utilities
            </p>
          </div>
          <div className="p-4 bg-red-500/10 text-red-500 rounded-2xl">
            <TrendingDown size={24} />
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl flex items-center justify-between hover-scale shadow-sm">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-400">Low Stock Alert</p>
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{kpis.lowStockCount}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Require immediate restock</p>
          </div>
          <div className="p-4 bg-yellow-500/10 text-yellow-500 rounded-2xl">
            <AlertTriangle size={24} />
          </div>
        </div>
      </div>

      {/* Auxiliary counts summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-2xl">
        <div className="text-center border-r border-gray-200 dark:border-zinc-800 last:border-none">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Products</p>
          <p className="text-lg font-bold mt-1 text-gray-700 dark:text-gray-300">{kpis.productsCount}</p>
        </div>
        <div className="text-center border-r border-gray-200 dark:border-zinc-800 last:border-none">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Shoppers List</p>
          <p className="text-lg font-bold mt-1 text-gray-700 dark:text-gray-300">{kpis.customersCount}</p>
        </div>
        <div className="text-center border-r border-gray-200 dark:border-zinc-800 last:border-none">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Suppliers</p>
          <p className="text-lg font-bold mt-1 text-gray-700 dark:text-gray-300">{kpis.suppliersCount}</p>
        </div>
        <div className="text-center last:border-none">
          <p className="text-xs text-gray-400 uppercase font-bold tracking-wider">Active Staff</p>
          <p className="text-lg font-bold mt-1 text-gray-700 dark:text-gray-300">{kpis.employeesCount}</p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sales & Profit Trend */}
        <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-base font-bold">Revenue & Expense Breakdown</h2>
            <span className="text-xs text-gray-400 font-semibold uppercase">Projected last 6 months</span>
          </div>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.monthlyProfitGraph}>
                <defs>
                  <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={12} tickLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="sales" stroke="#22c55e" fillOpacity={1} fill="url(#colorSales)" name="Sales Vol" strokeWidth={2} />
                <Area type="monotone" dataKey="expenses" stroke="#ef4444" fillOpacity={1} fill="url(#colorExpenses)" name="Expenses" strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Inventory Status pie */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl shadow-sm flex flex-col justify-between">
          <div className="mb-6">
            <h2 className="text-base font-bold">Stock Safety Proportions</h2>
            <p className="text-xs text-gray-400 mt-0.5">Categorized current stock levels</p>
          </div>
          <div className="h-64 relative flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.inventoryGraph}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={4}
                  dataKey="value"
                >
                  {charts.inventoryGraph.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '12px' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Sales Trend & Category Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Bar */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl shadow-sm">
          <h2 className="text-base font-bold mb-4">Daily Sales Velocity (Last 7 Days)</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.salesGraph}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#27272a" className="hidden dark:block" />
                <XAxis dataKey="name" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <Tooltip />
                <Bar dataKey="amount" fill="#22c55e" radius={[8, 8, 0, 0]} name="Sales (₹)" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category distribution bar */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl shadow-sm">
          <h2 className="text-base font-bold mb-4">Products Per Category</h2>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.categoryGraph} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" className="dark:hidden" />
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#27272a" className="hidden dark:block" />
                <XAxis type="number" stroke="#9CA3AF" fontSize={11} tickLine={false} />
                <YAxis dataKey="name" type="category" stroke="#9CA3AF" fontSize={11} tickLine={false} width={120} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" radius={[0, 8, 8, 0]} name="Product Count" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions Table */}
      <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl shadow-sm">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-base font-bold">Recent Checkout Transactions</h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Most recent sales across POS terminals.</p>
          </div>
          <Link
            to="/pos"
            className="flex items-center gap-1.5 text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold"
          >
            Go to POS Terminal
            <ArrowRight size={14} />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold">
                <th className="py-3">Invoice ID</th>
                <th className="py-3">Shopper</th>
                <th className="py-3">Cashier</th>
                <th className="py-3">Payment</th>
                <th className="py-3">Created</th>
                <th className="py-3 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody>
              {recentTransactions.map((sale: any) => (
                <tr key={sale.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30">
                  <td className="py-3 font-semibold text-gray-800 dark:text-gray-200">{sale.id.slice(0, 8)}...</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{sale.customer?.name || 'Walk-in'}</td>
                  <td className="py-3 text-gray-600 dark:text-gray-400">{sale.cashier.name}</td>
                  <td className="py-3">
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 uppercase">
                      {sale.paymentMethod}
                    </span>
                  </td>
                  <td className="py-3 text-gray-500">{new Date(sale.createdAt).toLocaleDateString()}</td>
                  <td className="py-3 text-right font-bold text-gray-900 dark:text-gray-100">₹{sale.totalAmount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
