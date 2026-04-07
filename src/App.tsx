import React, { useState, useEffect, useMemo } from "react";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart, 
  Area 
} from "recharts";
import { 
  TrendingUp, 
  TrendingDown, 
  Bitcoin, 
  BarChart3, 
  BrainCircuit, 
  Info, 
  RefreshCw,
  Wallet,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import Markdown from "react-markdown";
import { HISTORICAL_DATA } from "./constants";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface FinancialData {
  btcPrice: number;
  mstrPrice: number;
  mstrHoldings: number;
  sharesOutstanding: number;
  historicalPrices: { date: string; mstrPrice: number; btcPrice?: number }[];
  lastUpdated: string;
}

export default function App() {
  const [data, setData] = useState<FinancialData | null>(null);
  const [loading, setLoading] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiAdvice, setAiAdvice] = useState<string | null>(null);
  const [range, setRange] = useState(30); // Default 30 days

  const fetchData = async (selectedRange?: number) => {
    setLoading(true);
    try {
      const r = selectedRange || range;
      const response = await fetch(`/api/data?range=${r}`);
      const result = await response.json();
      setData(result);
    } catch (error) {
      console.error("Error fetching data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData(range);
  }, [range]);

  const mNAV = useMemo(() => {
    if (!data || !data.btcPrice || !data.sharesOutstanding) return 0;
    // mNAV = (Total BTC * BTC Price) / Shares Outstanding
    const val = (data.mstrHoldings * data.btcPrice) / (data.sharesOutstanding);
    return isNaN(val) ? 0 : val;
  }, [data]);

  const mNavRatio = useMemo(() => {
    if (!data || !mNAV || mNAV === 0) return 0;
    const val = data.mstrPrice / mNAV;
    return isNaN(val) ? 0 : val;
  }, [data, mNAV]);

  const premium = useMemo(() => {
    if (!mNavRatio) return 0;
    return mNavRatio - 1;
  }, [mNavRatio]);

  const chartData = useMemo(() => {
    if (!data || !data.historicalPrices) return [];
    
    // Sort historical data by date
    const sortedHistory = [...HISTORICAL_DATA].sort((a, b) => 
      new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    // Use real historical prices from Yahoo Finance
    const realPrices = data.historicalPrices;

    return realPrices.map((p) => {
      const targetTime = new Date(p.date).getTime();

      // Find the most recent historical data point BEFORE or ON this date
      // This implements step-wise holdings (holdings only change on purchase dates)
      let currentHoldings = sortedHistory[0];
      for (let j = 0; j < sortedHistory.length; j++) {
        const pointTime = new Date(sortedHistory[j].date).getTime();
        if (pointTime <= targetTime) {
          currentHoldings = sortedHistory[j];
        } else {
          break;
        }
      }

      // Use actual historical BTC price if available, otherwise fallback to current
      const btcPriceAtDate = p.btcPrice || data.btcPrice;
      
      const pointmNAV = (currentHoldings.totalBtc * btcPriceAtDate) / currentHoldings.sharesOutstanding;
      const ratio = p.mstrPrice / pointmNAV;

      return {
        date: p.date,
        mNAV: parseFloat(pointmNAV.toFixed(2)),
        mstrPrice: parseFloat(p.mstrPrice.toFixed(2)),
        btcPrice: parseFloat(btcPriceAtDate.toFixed(0)),
        ratio: parseFloat(ratio.toFixed(2)),
        btcHoldings: currentHoldings.totalBtc
      };
    });
  }, [data]);

  const formatDate = (dateStr: string, allData: any[]) => {
    if (!allData || allData.length === 0) return "";
    const date = new Date(dateStr);
    const monthNames = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
    
    // Find the actual index in the data array to determine if it's a new month
    const dataIndex = allData.findIndex(d => d.date === dateStr);
    if (dataIndex === -1) return date.getDate().toString();

    const isNewMonth = dataIndex === 0 || (dataIndex > 0 && new Date(allData[dataIndex-1].date).getMonth() !== date.getMonth());
    
    if (isNewMonth) {
      return monthNames[date.getMonth()];
    }
    return date.getDate().toString();
  };

  const getAiAdvice = async () => {
    if (!data) return;
    setAiLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: `
          As a specialized financial analyst for Digital Asset Treasury (DAT) companies, provide a concise investment summary for MicroStrategy (MSTR) based on:
          - Current BTC Price: $${(data?.btcPrice || 0).toLocaleString()}
          - MSTR Stock Price: $${(data?.mstrPrice || 0).toLocaleString()}
          - Calculated mNAV (Modified Net Asset Value): $${(mNAV || 0).toFixed(2)}
          - mNAV Ratio: ${(mNavRatio || 0).toFixed(2)}x
          - Premium to mNAV: ${((premium || 0) * 100).toFixed(2)}%
          
          Requirements:
          1. Provide ONLY a clean, professional investment summary.
          2. Use standard Markdown for formatting (e.g., **bold** for emphasis).
          3. DO NOT include any command-like prefixes, system status messages, or headers like "**DAT PROTOCOL INITIALIZED**".
          4. Analyze the "MSTR Premium" and "mNAV Ratio" clearly.
          5. Explain if the current market price is overextended or if the leverage on BTC justifies the premium.
          6. Keep the tone professional, clear, and informative.
        `,
      });
      setAiAdvice(response.text || "Unable to generate advice at this time.");
    } catch (error) {
      console.error("AI Advice Error:", error);
      setAiAdvice("Error connecting to AI advisor. Please check your API key.");
    } finally {
      setAiLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
          <p className="text-slate-500 font-medium">Loading Financial Data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-slate-200 font-sans p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative">
            <div className="absolute -left-4 top-1/2 -translate-y-1/2 w-1 h-12 bg-blue-600 rounded-full shadow-[0_0_10px_rgba(37,99,235,0.5)]"></div>
            <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
              <BarChart3 className="text-blue-500 w-8 h-8" />
              <span className="text-blue-400">DAT.co</span>
              <span className="text-slate-500">TERMINAL</span>
            </h1>
            <p className="text-slate-500 mt-1 font-mono text-sm tracking-wider uppercase">MicroStrategy (MSTR) // mNAV Protocol v2.1</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block font-mono">
              <p className="text-[10px] text-slate-500 uppercase font-bold tracking-[0.2em]">System Status: Online</p>
              <p className="text-xs text-blue-400 font-medium">{new Date(data?.lastUpdated || "").toLocaleString()}</p>
            </div>
            <button 
              onClick={() => fetchData()}
              className="p-3 bg-slate-800/50 hover:bg-blue-600/20 rounded-xl transition-all border border-slate-700 hover:border-blue-500/50 group"
            >
              <RefreshCw className="w-5 h-5 text-slate-400 group-hover:text-blue-400 group-hover:rotate-180 transition-transform duration-500" />
            </button>
          </div>
        </header>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <StatCard 
            title="BTC / USD" 
            value={`$${data?.btcPrice?.toLocaleString() || "---"}`} 
            icon={<Bitcoin className="text-orange-500" />}
            trend="+2.4%"
            isPositive={true}
            color="orange"
          />
          <StatCard 
            title="MSTR STOCK" 
            value={`$${data?.mstrPrice?.toLocaleString() || "---"}`} 
            icon={<TrendingUp className="text-blue-500" />}
            trend="+1.8%"
            isPositive={true}
            color="blue"
          />
          <StatCard 
            title="mNAV / SHARE" 
            value={`$${mNAV.toFixed(2)}`} 
            icon={<TrendingUp className="text-emerald-500" />}
            subValue="Intrinsic BTC Value"
            color="emerald"
          />
          <StatCard 
            title="mNAV RATIO" 
            value={`${mNavRatio.toFixed(2)}x`} 
            icon={<BarChart3 className="text-blue-400" />}
            isPositive={mNavRatio < 1.5}
            trend={mNavRatio > 2.0 ? "HIGH" : "NORMAL"}
            color="blue"
          />
          <StatCard 
            title="PREMIUM" 
            value={`${(premium * 100).toFixed(2)}%`} 
            icon={<Info className="text-purple-500" />}
            isPositive={premium < 0.5}
            trend={premium > 1.0 ? "CRITICAL" : "STABLE"}
            color="purple"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Charts Section */}
          <div className="lg:col-span-2 space-y-8">
            {/* Range Selector */}
            <div className="flex items-center justify-between bg-slate-900/50 p-2 rounded-2xl border border-slate-800/50">
              <div className="flex items-center gap-2 px-4">
                <RefreshCw className="w-4 h-4 text-blue-500" />
                <span className="text-[10px] font-bold font-mono text-slate-500 uppercase tracking-widest">Time Horizon</span>
              </div>
              <div className="flex gap-1">
                {[7, 15, 30, 60, 90].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRange(r)}
                    className={cn(
                      "px-4 py-1.5 rounded-xl text-[10px] font-bold font-mono transition-all uppercase tracking-widest",
                      range === r 
                        ? "bg-blue-600 text-white shadow-[0_0_15px_rgba(37,99,235,0.4)]" 
                        : "text-slate-500 hover:text-slate-300 hover:bg-slate-800"
                    )}
                  >
                    {r}D
                  </button>
                ))}
              </div>
            </div>

            {/* Performance Matrix Chart */}
            <div className="cyber-card p-6 border-slate-800/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-bold tracking-wide text-white">Performance Matrix</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">MSTR Stock vs. mNAV Baseline ({range}D)</p>
                </div>
                <div className="flex items-center gap-6 text-[10px] font-bold font-mono tracking-widest uppercase">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                    <span className="text-blue-400">MSTR Price</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"></div>
                    <span className="text-emerald-400">mNAV</span>
                  </div>
                </div>
              </div>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorMstr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2}/>
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                      </linearGradient>
                      <linearGradient id="colorMnav" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 600}}
                      dy={10}
                      minTickGap={40}
                      tickFormatter={(val) => formatDate(val, chartData)}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 600}}
                      tickFormatter={(val) => `$${val}`}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#12121a', 
                        borderRadius: '12px', 
                        border: '1px solid #1e293b',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' 
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mNAV" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      fillOpacity={1} 
                      fill="url(#colorMnav)" 
                    />
                    <Area 
                      type="monotone" 
                      dataKey="mstrPrice" 
                      stroke="#3b82f6" 
                      strokeWidth={3}
                      fillOpacity={1} 
                      fill="url(#colorMstr)" 
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* mNAV Ratio Trend Chart */}
            <div className="cyber-card p-6 border-slate-800/50">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-lg font-bold tracking-wide text-white">mNAV Ratio Trend</h2>
                  <p className="text-xs text-slate-500 font-mono mt-1">Historical Premium/Discount Multiplier ({range}D)</p>
                </div>
                <div className="flex items-center gap-2 text-[10px] font-bold font-mono tracking-widest uppercase">
                  <div className="w-2 h-2 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.5)]"></div>
                  <span className="text-purple-400">Ratio Multiplier</span>
                </div>
              </div>
              <div className="h-[200px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#1e293b" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 600}}
                      dy={10}
                      minTickGap={40}
                      tickFormatter={(val) => formatDate(val, chartData)}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{fill: '#475569', fontSize: 10, fontWeight: 600}}
                      tickFormatter={(val) => `${val}x`}
                      domain={['auto', 'auto']}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: '#12121a', 
                        borderRadius: '12px', 
                        border: '1px solid #1e293b',
                        boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.5)' 
                      }}
                      itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(val: number) => [`${val}x`, "mNAV Ratio"]}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="ratio" 
                      stroke="#a855f7" 
                      strokeWidth={3}
                      dot={false}
                      activeDot={{ r: 6, stroke: '#a855f7', strokeWidth: 2, fill: '#12121a' }}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* AI Insights Section */}
          <div className="cyber-card p-6 border-slate-800/50 flex flex-col">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <BrainCircuit className="text-blue-500 w-6 h-6" />
              </div>
              <h2 className="text-lg font-bold text-white">Neural Advisor</h2>
            </div>
            
            <div className="flex-grow space-y-4 overflow-y-auto max-h-[400px] pr-2">
              {aiAdvice ? (
                <div className="markdown-body">
                  <div className="text-slate-100 leading-relaxed text-[15px] font-sans prose-styles">
                    <Markdown>{aiAdvice}</Markdown>
                  </div>
                </div>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-8 border border-slate-800/50 rounded-2xl bg-slate-900/20">
                  <div className="bg-blue-500/5 p-4 rounded-full mb-4 animate-pulse">
                    <BrainCircuit className="w-10 h-10 text-blue-500/40" />
                  </div>
                  <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Awaiting Input Signal...</p>
                </div>
              )}
            </div>

            <button 
              onClick={getAiAdvice}
              disabled={aiLoading}
              className={cn(
                "mt-6 w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-3 text-sm tracking-widest uppercase",
                aiLoading 
                  ? "bg-slate-800 text-slate-500 cursor-not-allowed" 
                  : "bg-blue-600 text-white hover:bg-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)] active:scale-[0.98]"
              )}
            >
              {aiLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <BrainCircuit className="w-4 h-4" />
                  Execute Analysis
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer Info */}
        <footer className="p-6 text-center border-t border-slate-800/50 mt-8">
          <p className="text-slate-600 text-[10px] font-mono tracking-[0.3em] uppercase">
            &copy; 2026 DAT.co // SECURE TERMINAL // ENCRYPTED DATA STREAM
          </p>
        </footer>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, subValue, trend, isPositive, color }: { 
  title: string; 
  value: string; 
  icon: React.ReactNode; 
  subValue?: string;
  trend?: string;
  isPositive?: boolean;
  color: 'blue' | 'emerald' | 'purple' | 'orange';
}) {
  const colorMap = {
    blue: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    emerald: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20',
    purple: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    orange: 'text-orange-500 bg-orange-500/10 border-orange-500/20',
  };

  return (
    <div className="cyber-card p-6 group hover:border-slate-700 transition-all duration-300">
      <div className="flex items-center justify-between mb-4">
        <div className={cn("p-2.5 rounded-xl border", colorMap[color])}>
          {icon}
        </div>
        {trend && (
          <div className={cn(
            "flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md font-mono tracking-tighter",
            isPositive ? "bg-emerald-500/10 text-emerald-500" : "bg-rose-500/10 text-rose-500"
          )}>
            {isPositive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
            {trend}
          </div>
        )}
      </div>
      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] font-mono">{title}</p>
      <h3 className="text-2xl font-bold mt-2 text-white tracking-tight group-hover:text-blue-400 transition-all">{value}</h3>
      {subValue && <p className="text-[10px] text-slate-500 mt-2 font-mono uppercase tracking-wider">{subValue}</p>}
    </div>
  );
}
