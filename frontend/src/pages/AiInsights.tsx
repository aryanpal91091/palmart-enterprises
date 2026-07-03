import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import api from '../services/api.js';
import {
  Sparkles,
  TrendingUp,
  PackageCheck,
  Users,
  AlertTriangle,
  Send,
  Loader2,
  Brain,
} from 'lucide-react';

export default function AiInsights() {
  const [activeTab, setActiveTab] = useState<'FORECAST' | 'BASKET' | 'SEGMENT' | 'ANOMALY' | 'CHAT'>('FORECAST');
  
  // Chat state
  const [chatMsg, setChatMsg] = useState('');
  const [chatLog, setChatLog] = useState<Array<{ sender: 'USER' | 'AI'; text: string }>>([
    { sender: 'AI', text: 'Hello! I am your PalMart AI Consultant. Ask me about store revenues, low stock counts, or basket recommendations.' },
  ]);

  // 1. Queries
  const { data: forecastData, isLoading: forecastLoading } = useQuery({
    queryKey: ['aiForecasts'],
    queryFn: async () => {
      const res = await api.get('/ai/forecasts');
      return res.data;
    },
  });

  const { data: basketData, isLoading: basketLoading } = useQuery({
    queryKey: ['aiRecommendations'],
    queryFn: async () => {
      const res = await api.get('/ai/recommendations');
      return res.data;
    },
  });

  const { data: segmentData, isLoading: segmentLoading } = useQuery({
    queryKey: ['aiSegmentation'],
    queryFn: async () => {
      const res = await api.get('/ai/segmentation');
      return res.data;
    },
  });

  const { data: anomalyData, isLoading: anomalyLoading } = useQuery({
    queryKey: ['aiAnomalies'],
    queryFn: async () => {
      const res = await api.get('/ai/anomalies');
      return res.data;
    },
  });

  // 2. Chat Mutation
  const chatMutation = useMutation({
    mutationFn: async (message: string) => {
      const res = await api.post('/ai/chat', { message });
      return res.data;
    },
    onSuccess: (data) => {
      setChatLog((prev) => [...prev, { sender: 'AI', text: data.reply }]);
    },
    onError: () => {
      setChatLog((prev) => [...prev, { sender: 'AI', text: 'Apologies, I encountered an issue accessing store statistics.' }]);
    },
  });

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatMsg.trim()) return;

    const userText = chatMsg.trim();
    setChatLog((prev) => [...prev, { sender: 'USER', text: userText }]);
    setChatMsg('');
    chatMutation.mutate(userText);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-3 bg-brand-500 text-white rounded-2xl shadow-lg shadow-brand-500/20">
          <Brain size={24} />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI & Business Intelligence</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 font-medium">Predictive forecasts, shopper clustering, transaction anomaly triggers, and conversational reporting.</p>
        </div>
      </div>

      {/* Tabs list */}
      <div className="flex border-b border-gray-200 dark:border-zinc-800 space-x-6 text-sm font-semibold overflow-x-auto pb-1 scrollbar-thin">
        <button
          onClick={() => setActiveTab('FORECAST')}
          className={`pb-3 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'FORECAST' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500'
          }`}
        >
          <TrendingUp size={16} /> Demand Forecasting
        </button>
        <button
          onClick={() => setActiveTab('BASKET')}
          className={`pb-3 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'BASKET' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500'
          }`}
        >
          <PackageCheck size={16} /> Recommendations & Bundling
        </button>
        <button
          onClick={() => setActiveTab('SEGMENT')}
          className={`pb-3 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'SEGMENT' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500'
          }`}
        >
          <Users size={16} /> Customer Segmentation
        </button>
        <button
          onClick={() => setActiveTab('ANOMALY')}
          className={`pb-3 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'ANOMALY' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500'
          }`}
        >
          <AlertTriangle size={16} /> Fraud & Anomaly Audit
        </button>
        <button
          onClick={() => setActiveTab('CHAT')}
          className={`pb-3 flex items-center gap-1.5 whitespace-nowrap ${
            activeTab === 'CHAT' ? 'border-b-2 border-brand-500 text-brand-500' : 'text-gray-500'
          }`}
        >
          <Sparkles size={16} /> AI Store Assistant
        </button>
      </div>

      {/* Tab views */}
      {activeTab === 'FORECAST' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                  <th className="py-4 px-6">Product Details</th>
                  <th className="py-4 px-6 text-center">Current Stock</th>
                  <th className="py-4 px-6 text-center">Daily Sale Speed</th>
                  <th className="py-4 px-6 text-center">Projected 30-Day Demand</th>
                  <th className="py-4 px-6 text-center">Auto-Restock Recommendation</th>
                </tr>
              </thead>
              <tbody>
                {forecastLoading ? (
                  [...Array(3)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-150 animate-pulse">
                      <td colSpan={5} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : forecastData?.forecasts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No sales forecasts calculated yet. Complete POS checkouts to run stats.
                    </td>
                  </tr>
                ) : (
                  forecastData?.forecasts.map((f: any) => (
                    <tr key={f.productId} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 text-xs">
                      <td className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300">
                        {f.name} <span className="text-[10px] text-gray-400 font-mono">({f.sku})</span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold">{f.currentStock} units</td>
                      <td className="py-4 px-6 text-center text-gray-600 dark:text-gray-400 font-semibold">{f.dailyVelocity} units / day</td>
                      <td className="py-4 px-6 text-center text-gray-800 dark:text-gray-200 font-semibold">{f.predicted30DaysDemand} units</td>
                      <td className="py-4 px-6 text-center">
                        {f.suggestedRestock > 0 ? (
                          <span className="px-2.5 py-1 rounded bg-red-500/10 text-red-500 font-bold">
                            Suggest restock (+{f.suggestedRestock})
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-500 font-bold">
                            Stock Level Adequate
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
      )}

      {activeTab === 'BASKET' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="mb-4">
            <h2 className="text-sm font-bold">Market Basket Co-occurrence Mining</h2>
            <p className="text-xs text-gray-400 mt-0.5">Discovers products frequently purchased together. Use these insights to build promo packages or check layouts.</p>
          </div>

          {basketLoading ? (
            <p className="text-xs text-gray-400">Analyzing transactions...</p>
          ) : basketData?.associations.length === 0 ? (
            <p className="text-xs text-gray-400">Basket analysis needs checkouts containing multiple items to map rules.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {basketData?.associations.map((rule: any, idx: number) => (
                <div key={idx} className="p-4 bg-gray-50 dark:bg-zinc-800/30 rounded-2xl border border-gray-200/50 dark:border-zinc-800 space-y-2">
                  <div className="flex justify-between font-bold text-xs">
                    <span className="text-brand-500">{rule.productA?.name}</span>
                    <span className="text-gray-400">&amp;</span>
                    <span className="text-brand-500">{rule.productB?.name}</span>
                  </div>
                  <div className="text-[10px] text-gray-400 flex justify-between">
                    <span>Co-occurrence: {rule.coOccurrence} times</span>
                    <span>Confidence: {rule.confidenceAtoB}%</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'SEGMENT' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-200 dark:border-zinc-800 text-gray-400 font-semibold bg-gray-50/50 dark:bg-zinc-800/20 font-sans">
                  <th className="py-4 px-6">Customer Details</th>
                  <th className="py-4 px-6">RFM Segment Tier</th>
                  <th className="py-4 px-6 text-center">Frequencies</th>
                  <th className="py-4 px-6 text-right">Recency (Days)</th>
                  <th className="py-4 px-6 text-right">Total Revenue Volume</th>
                </tr>
              </thead>
              <tbody>
                {segmentLoading ? (
                  [...Array(2)].map((_, i) => (
                    <tr key={i} className="border-b border-gray-150 animate-pulse">
                      <td colSpan={5} className="py-6 px-6 bg-gray-100/10" />
                    </tr>
                  ))
                ) : segmentData?.segmented.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-12 text-gray-400">
                      No customer loyalty segmentation logs.
                    </td>
                  </tr>
                ) : (
                  segmentData?.segmented.map((seg: any) => (
                    <tr key={seg.id} className="border-b border-gray-100 dark:border-zinc-800/50 hover:bg-gray-50/50 dark:hover:bg-zinc-800/30 text-xs">
                      <td className="py-4 px-6 font-bold text-gray-700 dark:text-gray-300">
                        {seg.name} <span className="text-[10px] text-gray-400">({seg.phone})</span>
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          seg.segment.includes('VIP')
                            ? 'bg-yellow-500/10 text-yellow-600 dark:text-yellow-400'
                            : seg.segment.includes('LOYAL')
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-zinc-500/10 text-zinc-500'
                        }`}>
                          {seg.segment}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-center font-bold text-gray-600 dark:text-gray-300">{seg.frequency} checkout orders</td>
                      <td className="py-4 px-6 text-right font-medium text-gray-500">{seg.recencyDays !== null ? `${seg.recencyDays} days ago` : 'Never'}</td>
                      <td className="py-4 px-6 text-right font-bold text-gray-900 dark:text-gray-100">₹{seg.totalSpent.toFixed(2)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'ANOMALY' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl p-6 shadow-sm space-y-4">
          <div className="mb-4">
            <h2 className="text-sm font-bold flex items-center gap-1.5"><AlertTriangle size={16} className="text-red-500" /> Billing Fraud & Anomaly Audit flags</h2>
            <p className="text-xs text-gray-400 mt-0.5">Automated screening mapping outliers (e.g. discount amounts &gt;30%, or checking cashier logins completing off-hours POS checkout).</p>
          </div>

          {anomalyLoading ? (
            <p className="text-xs text-gray-400">Screening database logs...</p>
          ) : anomalyData?.anomalies.length === 0 ? (
            <div className="p-4 bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 rounded-2xl text-xs font-semibold">
              No anomalies triggered. Cashier billing profiles are within normal parameters.
            </div>
          ) : (
            <div className="space-y-3">
              {anomalyData?.anomalies.map((item: any) => (
                <div key={item.saleId} className="p-4 bg-red-500/5 dark:bg-red-950/10 border border-red-500/20 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-gray-800 dark:text-gray-200">Invoice: {item.saleId.slice(0, 16)}...</p>
                    <p className="text-[10px] text-gray-400 font-semibold">Cashier: {item.cashierName} | Shopper: {item.customerName}</p>
                    <ul className="list-disc pl-4 text-[10px] text-red-500 font-semibold space-y-0.5 mt-1.5">
                      {item.alerts.map((alert: string, idx: number) => (
                        <li key={idx}>{alert}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="text-right">
                    <span className="px-2.5 py-1 rounded bg-red-500 text-white text-[10px] font-bold">
                      Risk: {item.score}%
                    </span>
                    <p className="text-[10px] text-gray-400 mt-1 font-bold">Total Bill: ₹{item.totalAmount.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'CHAT' && (
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800/50 rounded-3xl flex flex-col h-[450px] shadow-sm">
          {/* Chat log body */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {chatLog.map((log, idx) => (
              <div
                key={idx}
                className={`flex gap-3 max-w-[75%] ${
                  log.sender === 'USER' ? 'ml-auto flex-row-reverse' : 'mr-auto'
                }`}
              >
                <div className={`p-2.5 rounded-2xl text-xs leading-relaxed ${
                  log.sender === 'USER'
                    ? 'bg-brand-500 text-white rounded-tr-none'
                    : 'bg-gray-100 dark:bg-zinc-800 text-gray-800 dark:text-gray-200 rounded-tl-none'
                }`}>
                  {log.text}
                </div>
              </div>
            ))}
            {chatMutation.isPending && (
              <div className="flex gap-2 items-center text-xs text-gray-400 italic">
                <Loader2 className="animate-spin" size={14} /> AI is searching database statistics...
              </div>
            )}
          </div>

          {/* Form input */}
          <form onSubmit={handleSendChat} className="p-4 border-t border-gray-100 dark:border-zinc-800 flex gap-2">
            <input
              type="text"
              placeholder="Ask AI: What is today's sales? | Which products are low in stock?"
              value={chatMsg}
              onChange={(e) => setChatMsg(e.target.value)}
              className="flex-1 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-xs outline-none focus:border-brand-500"
            />
            <button
              type="submit"
              disabled={chatMutation.isPending || !chatMsg.trim()}
              className="p-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl shadow-lg transition-transform active:scale-95 disabled:opacity-50"
            >
              <Send size={16} />
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
