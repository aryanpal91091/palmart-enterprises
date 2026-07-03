import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  FileBarChart2,
  Download,
  Calendar,
  Layers,
  TrendingUp,
  Receipt,
} from 'lucide-react';

export default function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reportType, setReportType] = useState('SALES');

  const { data: statsData } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: async () => {
      const res = await api.get('/reports/dashboard-stats');
      return res.data;
    },
  });

  const handleDownloadReport = () => {
    // Standard mock export CSV mapping
    let headers = '';
    let rows = '';
    let filename = '';

    if (reportType === 'SALES') {
      filename = 'sales_report.csv';
      headers = 'Category,TotalRevenue,GSTCalculated\n';
      headers += `"Grocery & Staples",${(statsData?.kpis.totalRevenue * 0.4 || 0).toFixed(2)},5%\n`;
      headers += `"Beverages",${(statsData?.kpis.totalRevenue * 0.25 || 0).toFixed(2)},28%\n`;
      headers += `"Dairy & Eggs",${(statsData?.kpis.totalRevenue * 0.2 || 0).toFixed(2)},0%\n`;
      headers += `"Snacks & Personal",${(statsData?.kpis.totalRevenue * 0.15 || 0).toFixed(2)},18%\n`;
    } else if (reportType === 'TAX') {
      filename = 'tax_report.csv';
      headers = 'TaxBracket,TaxableValue,CGST,SGST,TotalTax\n';
      headers += `5% GST,${(statsData?.kpis.totalRevenue * 0.35 || 0).toFixed(2)},2.5%,2.5%,${(statsData?.kpis.totalRevenue * 0.0175 || 0).toFixed(2)}\n`;
      headers += `18% GST,${(statsData?.kpis.totalRevenue * 0.2 || 0).toFixed(2)},9%,9%,${(statsData?.kpis.totalRevenue * 0.036 || 0).toFixed(2)}\n`;
      headers += `28% GST,${(statsData?.kpis.totalRevenue * 0.15 || 0).toFixed(2)},14%,14%,${(statsData?.kpis.totalRevenue * 0.042 || 0).toFixed(2)}\n`;
    } else {
      filename = 'expense_report.csv';
      headers = 'ExpenseCategory,TotalSpent\n';
      headers += `Rent & Utilities,${(statsData?.kpis.expenses * 0.5 || 0).toFixed(2)}\n`;
      headers += `Staff Salaries,${(statsData?.kpis.expenses * 0.35 || 0).toFixed(2)}\n`;
      headers += `Maintenance,${(statsData?.kpis.expenses * 0.15 || 0).toFixed(2)}\n`;
    }

    const blob = new Blob([headers], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports Generation Panel</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">Generate daily checkout balance reports, GST filings, and expense sheets.</p>
      </div>

      {/* Reports Configurator card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="md:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><FileBarChart2 size={16} /> Configure Report Download</h2>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Report Category</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs"
              >
                <option value="SALES">Product Sales Summary</option>
                <option value="TAX">GST Tax Ledger</option>
                <option value="EXPENSES">Operational Expenses Breakdown</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs"
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl p-2 text-xs"
              />
            </div>
          </div>

          <button
            onClick={handleDownloadReport}
            className="flex items-center justify-center gap-2 px-5 py-3 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-bold transition-all shadow-lg"
          >
            <Download size={14} /> Download Compiled CSV Report
          </button>
        </div>

        {/* Quick Report Summaries stats */}
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 p-6 rounded-3xl space-y-4">
          <h2 className="text-sm font-bold flex items-center gap-1.5"><Layers size={16} /> Audit Summaries</h2>

          <div className="space-y-3">
            <div className="flex justify-between text-xs border-b border-gray-100 dark:border-zinc-800 pb-2">
              <span className="text-gray-400 font-medium">All Time Sales</span>
              <span className="font-bold text-gray-700 dark:text-gray-300">₹{statsData?.kpis.totalRevenue.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-xs border-b border-gray-100 dark:border-zinc-800 pb-2">
              <span className="text-gray-400 font-medium">Accumulated Profit</span>
              <span className="font-bold text-emerald-500">₹{statsData?.kpis.profit.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-400 font-medium">Total Utility Costs</span>
              <span className="font-bold text-red-500">₹{statsData?.kpis.expenses.toLocaleString() || 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
