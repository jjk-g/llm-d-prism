import React, { useState } from 'react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, Label, ReferenceArea, ReferenceLine
} from 'recharts';
import { Zap, Download, Copy, Check, Info, ArrowLeft, ExternalLink, Settings, ShieldAlert, Cpu, Cloud, Server, Bell, Slack, ChevronDown, Share2 } from 'lucide-react';

const RAW_GEMMA_DATA = [
    {
        qps: 1,
        baseline_ttft_p50: 224, baseline_ttft_p90: 248, baseline_ttft_p99: 342,
        baseline_itl_p50: 25.27, baseline_itl_p90: 26.12, baseline_itl_p99: 99.35,
        baseline_tput: 2645,
        optimal_ttft_p50: 271, optimal_ttft_p90: 290, optimal_ttft_p99: 453,
        optimal_itl_p50: 17.49, optimal_itl_p90: 18.54, optimal_itl_p99: 40.10,
        optimal_tput: 2443,
    },
    {
        qps: 5,
        baseline_ttft_p50: 251, baseline_ttft_p90: 3056, baseline_ttft_p99: 6954,
        baseline_itl_p50: 30.12, baseline_itl_p90: 31.25, baseline_itl_p99: 221,
        baseline_tput: 12642,
        optimal_ttft_p50: 280, optimal_ttft_p90: 493, optimal_ttft_p99: 854,
        optimal_itl_p50: 22.53, optimal_itl_p90: 25.50, optimal_itl_p99: 204.63,
        optimal_tput: 12152,
    },
    {
        qps: 8,
        optimal_ttft_p50: 363, optimal_ttft_p90: 863, optimal_ttft_p99: 1409,
        optimal_itl_p50: 29.74, optimal_itl_p90: 198.34, optimal_itl_p99: 437.64,
        optimal_tput: 19328,
    },
    {
        qps: 12,
        optimal_ttft_p50: 37755, optimal_ttft_p90: 77616, optimal_ttft_p99: 89565,
        optimal_itl_p50: 46.95, optimal_itl_p90: 263.23, optimal_itl_p99: 493.96,
        optimal_tput: 22208,
    }
];

const SCATTER_DATA_BASELINE = Array.from({ length: 60 }).map((_, i) => ({
    req_id: i + 1,
    ttft: Math.random() > 0.4 ? 500 + Math.random() * 6500 : 500 + Math.random() * 1000
}));

const SCATTER_DATA_OPTIMAL = Array.from({ length: 60 }).map((_, i) => ({
    req_id: i + 1,
    ttft: 280 + Math.random() * 40
}));

const SCATTER_DATA_OPTIMAL_SHIFTED = Array.from({ length: 60 }).map((_, i) => ({
    req_id: i + 1,
    ttft: 400 + Math.random() * 80
}));


const HISTORICAL_DATA = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    
    let cacheHitTTFT = 280 + Math.random() * 40;
    if (i > 12 && i < 16) {
        cacheHitTTFT += 200 + Math.random() * 150; 
    }
    
    return {
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        optimal_ttft_p99: cacheHitTTFT,
        baseline_ttft_p99: 6800 + Math.random() * 500,
    };
});


const CustomScatterTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
        const data = payload[0].payload;
        const isOptimal = payload[0].name.includes("Optimal");
        const version = isOptimal ? "Commit: 4a9f21 (v1.3.0-igw)" : "Commit: d8b3c1 (v1.2.0)";
        const outcome = isOptimal ? "Cache Hit" : "Cache Miss";
        
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl font-mono text-xs z-[100]">
                <p className="font-bold text-white mb-1">Request #{data.req_id} <span className={isOptimal ? "text-emerald-400" : "text-slate-400"}>({outcome})</span></p>
                <p className="text-slate-300">TTFT: <span className="font-semibold text-white">{Math.round(data.ttft)}ms</span></p>
                <p className="text-slate-500 mt-2 pt-2 border-t border-slate-800 flex items-center">
                    <Zap className={`w-3 h-3 mr-1 ${isOptimal ? "text-emerald-500" : "text-slate-500"}`} /> {version}
                </p>
            </div>
        );
    }
    return null;
};

const CustomTputTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length >= 2) {
        // Find optimal & baseline by their name or datakey
        const optimal = payload.find(p => p.dataKey === 'optimal_tput')?.value || 0;
        const baseline = payload.find(p => p.dataKey === 'baseline_tput')?.value || 0;
        const speedup = ((optimal - baseline) / baseline) * 100;
        
        return (
            <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl font-mono text-xs z-[100]">
                <p className="font-bold text-white mb-1">QPS: {label}</p>
                <div className="space-y-1">
                    <p className="text-slate-300">standard Kubernetes service: <span className="font-semibold text-white">{Math.round(baseline)}</span></p>
                    <p className="text-emerald-400">Optimal: <span className="font-semibold text-white">{Math.round(optimal)}</span></p>
                </div>
                {speedup > 0 && (
                    <p className="text-cyan-400 mt-2 pt-2 border-t border-slate-800 flex items-center">
                        <Zap className="w-3 h-3 mr-1 text-cyan-500" /> +{Math.round(speedup)}% speedup
                    </p>
                )}
            </div>
        );
    }
    return null;
};

// Interactive Bell Label for SLA Threshold
const CustomReferenceLabel = (props) => {
    const { viewBox, value, onClickAlert } = props;
    return (
        <g onClick={onClickAlert} className="cursor-pointer group">
            <text x={viewBox.x + 10} y={viewBox.y - 12} fill="#34d399" fontSize="11" fontWeight="bold">
                {value}
            </text>
            <rect x={viewBox.x} y={viewBox.y - 30} width="160" height="30" fill="transparent" />
            <g className="opacity-60 group-hover:opacity-100 transition-opacity">
                <circle cx={viewBox.x + 125} cy={viewBox.y - 15} r="10" fill="#0f172a" stroke="#334155" />
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" stroke="#94a3b8" strokeWidth="2" fill="none" transform="translate(115, -23) scale(0.8)" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0" stroke="#94a3b8" strokeWidth="2" fill="none" transform="translate(115, -23) scale(0.8)" strokeLinecap="round" strokeLinejoin="round"/>
            </g>
        </g>
    );
};


const Milestone1Dashboard = ({ onNavigateBack, onNavigate }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [copied, setCopied] = useState(false);
    const [timeHorizon, setTimeHorizon] = useState('snapshot');
    const [targetQps, setTargetQps] = useState(5);
    
    const [provider, setProvider] = useState('GCP');
    const [hardware, setHardware] = useState('4x H100 80GB');
    const [shareToast, setShareToast] = useState(false);
    const [toastMessage, setToastMessage] = useState("");
    const [perfMultiplier, setPerfMultiplier] = useState(1.0);

    const [isAlertModalOpen, setIsAlertModalOpen] = useState(false);
    const [alertSaved, setAlertSaved] = useState(false);

    const [latencyScale, setLatencyScale] = useState('linear');
    const [ttftHistory, setTtftHistory] = useState('snapshot');
    const [itlScale, setItlScale] = useState('linear');
    const [itlHistory, setItlHistory] = useState('snapshot');
    const [tputDisplay, setTputDisplay] = useState('tput_sec');

    const handleCopyHelm = () => {
        const cmd = `helm upgrade prism-router ./chart --set router.policy=intelligent_gateway --set target_qps=${targetQps}`;
        navigator.clipboard.writeText(cmd);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleHardwareChange = (e) => {
        const val = e.target.value;
        setHardware(val);
        // Data Multiplier to simulate infrastructure shift
        if (val.includes("A100")) setPerfMultiplier(1.6);
        else if (val.includes("L4")) setPerfMultiplier(2.5);
        else setPerfMultiplier(1.0); // H100 Baseline
    };

    const handleDownloadCSV = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        if (timeHorizon === 'snapshot') {
            csvContent += "Request_ID,Outcome,TTFT_ms,Code_Version\n";
            for (let i = 0; i < 60; i++) {
                csvContent += `${SCATTER_DATA_BASELINE[i].req_id},Cache Miss,${Math.round(SCATTER_DATA_BASELINE[i].ttft)},v1.2.0\n`;
                const optData = perfMultiplier > 1.0 ? SCATTER_DATA_OPTIMAL_SHIFTED : SCATTER_DATA_OPTIMAL;
                csvContent += `${optData[i].req_id},Cache Hit,${Math.round(optData[i].ttft)},v1.3.0-igw\n`;
            }
        } else {
            csvContent += "Date,Optimal_P99_TTFT_ms,Baseline_P99_TTFT_ms\n";
            HISTORICAL_DATA.forEach(row => {
                csvContent += `${row.date},${Math.round(row.optimal_ttft_p99 * perfMultiplier)},${Math.round(row.baseline_ttft_p99)}\n`;
            });
        }
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `prism-${timeHorizon}-latency.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleSaveAlert = () => {
        setAlertSaved(true);
        setTimeout(() => {
            setAlertSaved(false);
            setIsAlertModalOpen(false);
        }, 1500);
    };

    // Calculate shifting lines based on selected infrastructure
    const DYNAMIC_GEMMA_DATA = RAW_GEMMA_DATA.map(d => ({
        ...d,
        optimal_ttft_p50: d.optimal_ttft_p50 ? d.optimal_ttft_p50 * perfMultiplier : null,
        optimal_ttft_p90: d.optimal_ttft_p90 ? d.optimal_ttft_p90 * perfMultiplier : null,
        optimal_ttft_p99: d.optimal_ttft_p99 ? d.optimal_ttft_p99 * perfMultiplier : null,
        baseline_ttft_p90: d.baseline_ttft_p99 ? (d.baseline_ttft_p99 * perfMultiplier * 0.88) : null,
        optimal_itl_p99: d.optimal_itl_p99 ? d.optimal_itl_p99 * perfMultiplier : null,
    }));

    // Dynamic scale limit if baseline or optimal exceeds a spike
    const saturationPoint = DYNAMIC_GEMMA_DATA.find(d => (d.optimal_ttft_p99 && d.optimal_ttft_p99 > 2000) || (d.baseline_ttft_p99 && d.baseline_ttft_p99 > 2000));
    const saturationQps = saturationPoint ? saturationPoint.qps : null;

    const DYNAMIC_SCATTER_OPTIMAL = perfMultiplier > 1.0 ? SCATTER_DATA_OPTIMAL_SHIFTED : SCATTER_DATA_OPTIMAL;
    const DYNAMIC_HISTORICAL = HISTORICAL_DATA.map(d => ({ ...d, optimal_ttft_p99: d.optimal_ttft_p99 * perfMultiplier }));

    const DYNAMIC_HISTORICAL_ITL = HISTORICAL_DATA.map(d => ({
        ...d,
        optimal_itl_p99: (d.optimal_ttft_p99 * perfMultiplier) * 0.04, // Fake ITL from shifting TTFT
        baseline_itl_p99: 30 + Math.random() * 20,
    }));

    const maxThroughput = Math.max(...RAW_GEMMA_DATA.map(d => d.optimal_tput || 0));

    const hardwareCosts = {
        '4x H100 80GB': 3.0,
        '8x A100 40GB': 2.0,
        '1x L4': 1.0,
        'p5.48xlarge (H100)': 3.5,
        'p4d.24xlarge (A100)': 2.5,
        'ND H100 v5': 3.2,
    };
    const activeCost = hardwareCosts[hardware] || 2.0;

    const DYNAMIC_TPUT_DATA = RAW_GEMMA_DATA.map(d => ({
        ...d,
        optimal_tput: d.optimal_tput / activeCost,
        baseline_tput: d.baseline_tput / activeCost,
    }));


    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center">
            
            {/* Top Navigation Bar */}
            <header className="w-full h-16 border-b border-slate-800 flex justify-between items-center px-6 bg-slate-900 sticky top-0 z-50">
                <div className="flex items-center space-x-4">
                    <button onClick={onNavigateBack} className="p-1.5 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-colors">
                        <ArrowLeft className="h-5 w-5" />
                    </button>
                    <div className="flex items-center">
                        <Zap className="h-5 w-5 text-emerald-400 mr-2" />
                        <h1 className="text-lg font-bold text-white tracking-wide">Inference scheduling</h1>
                        <span className="ml-3 px-2 py-0.5 rounded text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                            Guided mode
                        </span>
                    </div>
                </div>

                <div className="flex items-center space-x-4">
                    <button onClick={() => { setShareToast(true); setToastMessage(`Link copied: prism.dev/m1?hw=${hardware.split(' ')[0]}&scale=${latencyScale}`); setTimeout(() => setShareToast(false), 2000); }} className="px-4 py-2 text-sm font-medium rounded-md text-slate-300 bg-slate-800 hover:bg-slate-700 transition-colors flex items-center border border-slate-700 relative">
                        <Share2 className="w-4 h-4 mr-2" /> Share view 
                        {shareToast && (
                            <div className="absolute -bottom-10 right-0 bg-emerald-500 text-white text-xs font-bold px-3 py-1.5 rounded shadow-lg z-50 flex items-center whitespace-nowrap">
                                {toastMessage}
                            </div>
                        )}
                    </button>
                    <button onClick={() => onNavigate && onNavigate('advanced')} className="px-4 py-2 text-sm font-medium rounded-md text-cyan-400 bg-cyan-950/30 hover:bg-cyan-900/40 border border-cyan-800 transition-colors flex items-center group">
                        <Settings className="w-4 h-4 mr-2 group-hover:rotate-90 transition-transform" /> Open in expert mode 
                    </button>
                </div>
            </header>

            <main className="w-full max-w-7xl px-6 py-8 flex flex-col space-y-8">

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* CARD 1: Context */}
                    <div className="col-span-1 lg:col-span-2 border border-slate-800 rounded-xl bg-slate-900/50 p-6 flex flex-col justify-start">
                        <div className="mb-4">
                            <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-1">Benchmark context</p>
                            <h3 className="text-lg font-bold text-white mb-1">Gemma3 model evaluation</h3>
                            <p className="text-xs text-slate-500 leading-relaxed">Focusing on standard routing vs. Intelligent Gateway (IGW) scheduling policies resolving high variance.</p>
                        </div>
                        
                        {/* Interactive Infrastructure Filters */}
                        <div className="flex flex-wrap gap-x-3 gap-y-3 mt-1 items-end">
                            
                            <div className="relative inline-block text-left group">
                                <label className="text-[10px] text-slate-500 uppercase font-bold absolute -top-2 left-2 bg-slate-900/50 px-1 z-10 backdrop-blur-md rounded transition-colors group-hover:text-cyan-400">Provider</label>
                                <select value={provider} onChange={(e) => setProvider(e.target.value)} className="appearance-none bg-slate-800/80 text-xs text-cyan-400 pl-8 pr-8 py-2 rounded-md border border-slate-700 hover:border-cyan-500/50 outline-none w-32 shadow-sm cursor-pointer transition-colors backdrop-blur-md">
                                    <option value="GCP">GCP</option>
                                    <option value="AWS">AWS</option>
                                    <option value="Azure">Azure</option>
                                </select>
                                <Cloud className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-cyan-500 z-10 pointer-events-none" />
                                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 z-10 pointer-events-none group-hover:text-cyan-400 transition-colors" />
                            </div>

                            <div className="relative inline-block text-left group">
                                <label className="text-[10px] text-slate-500 uppercase font-bold absolute -top-2 left-2 bg-slate-900/50 px-1 z-10 backdrop-blur-md rounded transition-colors group-hover:text-purple-400">Hardware</label>
                                <select value={hardware} onChange={handleHardwareChange} className="appearance-none bg-slate-800/80 text-xs text-purple-400 pl-8 pr-8 py-2 rounded-md border border-slate-700 hover:border-purple-500/50 outline-none w-36 shadow-sm cursor-pointer transition-colors backdrop-blur-md">
                                    {provider === 'GCP' ? (
                                        <>
                                            <option value="4x H100 80GB">4x H100 80GB</option>
                                            <option value="8x A100 40GB">8x A100 40GB</option>
                                            <option value="1x L4">1x L4</option>
                                        </>
                                    ) : provider === 'AWS' ? (
                                        <>
                                            <option value="p5.48xlarge (H100)">p5.48xlarge</option>
                                            <option value="p4d.24xlarge (A100)">p4d.24xlarge</option>
                                        </>
                                    ) : (
                                        <>
                                            <option value="ND H100 v5">ND H100 v5</option>
                                        </>
                                    )}
                                </select>
                                <Server className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-purple-400 z-10 pointer-events-none" />
                                <ChevronDown className="absolute right-2.5 top-2.5 w-3.5 h-3.5 text-slate-500 z-10 pointer-events-none group-hover:text-purple-400 transition-colors" />
                            </div>

                            <div className="relative inline-block text-left">
                                <label className="text-[10px] text-slate-500 uppercase font-bold absolute -top-2 left-2 bg-slate-900/50 px-1 z-10 backdrop-blur-md rounded">Precision</label>
                                <div className="bg-slate-800/50 text-xs text-slate-300 pl-8 pr-6 py-2 rounded-md border border-slate-700/50 w-28 cursor-not-allowed">
                                    Int8
                                </div>
                                <Cpu className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-slate-400 z-10 pointer-events-none" />
                            </div>

                            <div className="relative inline-block text-left">
                                <label className="text-[10px] text-slate-500 uppercase font-bold absolute -top-2 left-2 bg-slate-900/50 px-1 z-10 backdrop-blur-md rounded">Dataset</label>
                                <div className="bg-slate-800/50 text-xs text-slate-300 pl-8 pr-6 py-2 rounded-md border border-slate-700/50 w-32 cursor-not-allowed">
                                    ShareGPT
                                </div>
                                <Info className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-amber-500/70 z-10 pointer-events-none" />
                            </div>
                        </div>

                    </div>
                    
                    {/* CARD 2: Metric */}
                    <div className="col-span-1 border border-slate-800 rounded-xl bg-slate-900 p-6 flex flex-col items-start justify-start shadow-lg relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none transition-all group-hover:bg-emerald-500/20" />
                        <div className="w-full h-full flex flex-col justify-between">
                            <div>
                                <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-1">Primary outcome</p>
                                <h3 className="text-lg font-bold text-white mb-2">TTFT P99 reduction</h3>
                                <h4 className="text-4xl font-black text-emerald-400 flex items-baseline">
                                    {perfMultiplier > 1 ? "82%" : "88%"} <span className="text-lg font-medium text-emerald-500/70 ml-2">Drop</span>
                                </h4>
                                <div className="mt-1 flex items-baseline space-x-1.5">
                                    <span className="text-xs font-bold text-emerald-300">-{Math.round(6954 - (854 * perfMultiplier))}ms</span>
                                    <span className="text-[11px] text-slate-400">absolute saved</span>
                                </div>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-3">At 5 QPS, standard Kubernetes service hit <span className="text-slate-300">6,954ms</span> compared to Optimal <span className="text-white">{Math.round(854 * perfMultiplier)}ms</span>.</p>
                        </div>
                    </div>

                    {/* CARD 3: Action */}
                    <div className="col-span-1 border border-slate-800 rounded-xl bg-slate-900 p-6 flex flex-col items-start justify-between shadow-lg relative overflow-hidden text-left">
                         <div className="w-full mb-4">
                             <p className="text-sm text-slate-400 font-semibold uppercase tracking-wider mb-1">Recommended action</p>
                             <h3 className="text-lg font-bold text-white mb-1">Deploy policy</h3>
                             <p className="text-xs text-slate-500 leading-relaxed">Apply this optimized routing configuration directly to your cluster via Helm.</p>
                         </div>
                         <button onClick={() => setIsModalOpen(true)} className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex justify-center items-center">
                            <Zap className="w-4 h-4 mr-2" /> Reproduce deploy
                         </button>
                    </div>
                </div>

                <div className="w-full border border-slate-800 rounded-xl bg-slate-900 shadow-xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
                        <div>
                            <h3 className="text-lg font-bold text-white flex items-center">
                                Policy diff: Cache miss variance vs cache hits
                            </h3>
                            <p className="text-xs text-slate-400 mt-0.5">
                                {timeHorizon === 'snapshot' ? "Point-in-time request scatter at 5 QPS." : "30-Day Historical Regression (P99 averages at 5 QPS)."}
                            </p>
                        </div>
                        <div className="flex items-center space-x-6">
                            
                            <div className="hidden sm:flex space-x-4 text-sm font-medium">
                                <span className="flex items-center text-slate-400"><div className="w-3 h-3 rounded-full bg-slate-400 mr-2"></div>standard Kubernetes service</span>
                                <span className="flex items-center text-emerald-400"><div className="w-3 h-3 rounded-full bg-emerald-400 mr-2"></div>Optimal (v1.3.0-igw)</span>
                            </div>

                            <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                <button onClick={() => setTimeHorizon('snapshot')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeHorizon === 'snapshot' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Snapshot</button>
                                <button onClick={() => setTimeHorizon('historical')} className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${timeHorizon === 'historical' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Historical</button>
                            </div>

                            <button onClick={handleDownloadCSV} className="p-2 bg-slate-800 text-slate-300 rounded hover:bg-slate-700 hover:text-emerald-400 transition-colors border border-slate-700 group relative" title="Download Raw CSV" >
                                <Download className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                    
                    <div className="h-80 w-full p-6 pb-2">
                        <ResponsiveContainer width="100%" height="100%">
                            {timeHorizon === 'snapshot' ? (
                                <ScatterChart margin={{ top: 10, right: 30, left: 20, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false}/>
                                    <XAxis dataKey="req_id" type="number" stroke="#64748b" tick={{fill:'#64748b', fontSize: 12}}>
                                        <Label value="Request ID (#)" position="insideBottom" offset={-15} fill="#94a3b8" fontSize={12} />
                                    </XAxis>
                                    <YAxis dataKey="ttft" type="number" stroke="#64748b" tick={{fill:'#64748b', fontSize: 12}} scale="log" domain={['auto', 'auto']}>
                                        <Label value="TTFT (ms) [Log Scale]" angle={-90} position="insideLeft" offset={0} fill="#94a3b8" fontSize={12} />
                                    </YAxis>
                                    <Tooltip content={<CustomScatterTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                    <ReferenceArea y2={450} fill="#10b981" fillOpacity={0.1} strokeOpacity={0} />
                                    <ReferenceLine y={450} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} label={<CustomReferenceLabel value="SLA Zone (<450ms)" onClickAlert={() => setIsAlertModalOpen(true)}/>} />
                                    <Scatter name="standard Kubernetes service" data={SCATTER_DATA_BASELINE} fill="#94a3b8" opacity={0.4} shape="circle" />
                                    <Scatter name="Optimal (v1.3.0-igw)" data={DYNAMIC_SCATTER_OPTIMAL} fill="#10b981" opacity={1.0} shape="diamond" />
                                </ScatterChart>
                            ) : (
                                <LineChart data={DYNAMIC_HISTORICAL} margin={{ top: 10, right: 40, left: 20, bottom: 25 }}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} vertical={false}/>
                                    <XAxis dataKey="date" stroke="#64748b" tick={{fill:'#64748b', fontSize: 11}} minTickGap={20}>
                                        <Label value="Time (Last 30 Days)" position="insideBottom" offset={-15} fill="#94a3b8" fontSize={12} />
                                    </XAxis>
                                    <YAxis stroke="#64748b" tick={{fill:'#64748b', fontSize: 12}} scale="log" domain={['auto', 'auto']}>
                                        <Label value="P99 TTFT (ms) [Log Scale]" angle={-90} position="insideLeft" offset={0} fill="#94a3b8" fontSize={12} />
                                    </YAxis>
                                    <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }} cursor={{ strokeDasharray: '3 3' }} />
                                    <ReferenceArea y2={450} fill="#10b981" fillOpacity={0.1} strokeOpacity={0} />
                                    <ReferenceLine y={450} stroke="#10b981" strokeDasharray="3 3" opacity={0.5} label={<CustomReferenceLabel value="SLA Zone (<450ms)" onClickAlert={() => setIsAlertModalOpen(true)}/>} />
                                    <Line type="monotone" name="standard Kubernetes service" dataKey="baseline_ttft_p99" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={false} activeDot={{ r: 4 }} opacity={0.5} />
                                    <Line type="stepAfter" name="Optimal (v1.3.0-igw)" dataKey="optimal_ttft_p99" stroke="#10b981" strokeWidth={3} dot={{ r: 2 }} activeDot={{ r: 6 }} />
                                </LineChart>
                            )}
                        </ResponsiveContainer>
                    </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                    
                    <div className="space-y-8">
                        <div className="border border-slate-800 rounded-xl bg-slate-900 shadow-xl overflow-hidden flex flex-col h-80">
                            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                                <h3 className="text-md font-bold text-white flex justify-between items-center">
                                    Time to first token (TTFT) vs QPS
                                    <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded ml-2">Lower is better</span>
                                </h3>
                                
                                <div className="flex items-center space-x-3">
                                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                        <button onClick={() => setTtftHistory('snapshot')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${ttftHistory === 'snapshot' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Snapshot</button>
                                        <button onClick={() => setTtftHistory('historical')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${ttftHistory === 'historical' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Historical</button>
                                    </div>

                                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                        <button onClick={() => setLatencyScale('linear')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${latencyScale === 'linear' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Linear</button>
                                        <button onClick={() => setLatencyScale('log')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${latencyScale === 'log' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Log</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col justify-between h-[18rem]">
                                <div className="h-[85%] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart syncId="prism_analytics" data={ttftHistory === 'snapshot' ? DYNAMIC_GEMMA_DATA : DYNAMIC_HISTORICAL} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey={ttftHistory === 'snapshot' ? "qps" : "date"} stroke="#64748b" tick={{fontSize: 12}}>
                                                <Label value={ttftHistory === 'snapshot' ? "QPS (reqs/sec)" : "Time (Last 30 Days)"} position="insideBottom" offset={-10} fill="#94a3b8" fontSize={12}/>
                                            </XAxis>
                                            <YAxis stroke="#64748b" tick={{fontSize: 12}} scale={latencyScale} domain={latencyScale === 'log' ? ['auto', 'auto'] : [0, 'auto']}>
                                                <Label value="TTFT (ms)" angle={-90} position="insideLeft" offset={10} fill="#94a3b8" fontSize={12}/>
                                            </YAxis>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }} />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px', color: '#cbd5e1' }}/>
                                            
                                            {saturationQps && (
                                                <ReferenceLine x={saturationQps} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Saturation limit', fill: '#ef4444', fontSize: 11 }} />
                                            )}

                                            <Line type="monotone" dataKey="baseline_ttft_p99" name="standard Kubernetes service" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
                                            <Line type="monotone" dataKey="baseline_ttft_p90" name="Baseline P90" stroke="#64748b" strokeDasharray="3 3" strokeWidth={1} dot={false} />
                                            <Line type="monotone" dataKey="optimal_ttft_p99" name="Optimal P99" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            <Line type="monotone" dataKey="optimal_ttft_p90" name="Optimal P90" stroke="#34d399" strokeDasharray="3 3" strokeWidth={1} dot={false} />
                                            <Line type="monotone" dataKey="optimal_ttft_p50" name="Optimal P50" stroke="#059669" strokeWidth={1} dot={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
                                    <div className="flex items-center">
                                        <div className="w-3 h-0.5 border-t-2 border-red-500 border-dashed mr-1"></div>
                                        <span>Saturation limit (Dynamic &gt; 2000ms)</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="border border-slate-800 rounded-xl bg-slate-900 shadow-xl overflow-hidden flex flex-col h-80">
                            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                                <h3 className="text-md font-bold text-white flex justify-between items-center">
                                    Inter-token latency (ITL) vs QPS
                                    <span className="text-xs font-normal text-slate-500 bg-slate-800 px-2 py-1 rounded ml-2">Lower is better</span>
                                </h3>
                                
                                <div className="flex items-center space-x-3">
                                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                        <button onClick={() => setItlHistory('snapshot')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${itlHistory === 'snapshot' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Snapshot</button>
                                        <button onClick={() => setItlHistory('historical')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${itlHistory === 'historical' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Historical</button>
                                    </div>

                                    <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                        <button onClick={() => setItlScale('linear')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${itlScale === 'linear' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Linear</button>
                                        <button onClick={() => setItlScale('log')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${itlScale === 'log' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Log</button>
                                    </div>
                                </div>
                            </div>
                            <div className="flex-1 p-4 flex flex-col justify-between h-[18rem]">
                                <div className="h-[85%] w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart syncId="prism_analytics" data={itlHistory === 'snapshot' ? DYNAMIC_GEMMA_DATA : DYNAMIC_HISTORICAL_ITL} margin={{ top: 15, right: 30, left: 10, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey={itlHistory === 'snapshot' ? "qps" : "date"} stroke="#64748b" tick={{fontSize: 12}}>
                                                <Label value={itlHistory === 'snapshot' ? "QPS (reqs/sec)" : "Time (Last 30 Days)"} position="insideBottom" offset={-10} fill="#94a3b8" fontSize={12}/>
                                            </XAxis>
                                            <YAxis stroke="#64748b" tick={{fontSize: 12}} scale={itlScale} domain={itlScale === 'log' ? ['auto', 'auto'] : [0, 'auto']}>
                                                <Label value="ITL (ms)" angle={-90} position="insideLeft" offset={10} fill="#94a3b8" fontSize={12}/>
                                            </YAxis>
                                            <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }} itemStyle={{ color: '#e2e8f0' }} labelStyle={{ color: '#94a3b8', fontWeight: 'bold', marginBottom: '4px' }} cursor={{ strokeDasharray: '3 3' }} />
                                            <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: '12px' }}/>
                                            
                                            <ReferenceLine y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'Typing limit (100ms)', fill: '#ef4444', fontSize: 11 }} />

                                            <Line type="stepAfter" dataKey={itlHistory === 'snapshot' ? "baseline_itl_p99" : "baseline_itl_p99"} name="standard Kubernetes service" stroke="#94a3b8" strokeDasharray="5 5" strokeWidth={2} dot={{ r: 3 }} />
                                            <Line type="stepAfter" dataKey={itlHistory === 'snapshot' ? "optimal_itl_p99" : "optimal_itl_p99"} name="Optimal P99" stroke="#10b981" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            {itlHistory === 'snapshot' && (
                                                <Line type="stepAfter" dataKey="optimal_itl_p50" name="Optimal P50" stroke="#059669" strokeWidth={1} dot={false} opacity={0.6} />
                                            )}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
                                    <div className="flex items-center">
                                        <div className="w-3 h-0.5 border-t-2 border-red-500 border-dashed mr-1"></div>
                                        <span>Typing speed limit (100ms threshold)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="border border-slate-800 rounded-xl bg-slate-900 shadow-xl overflow-hidden flex flex-col h-[42.5rem]">
                            <div className="px-6 py-4 border-b border-slate-800 bg-slate-800/30 flex justify-between items-center">
                                <h3 className="text-md font-bold text-white flex justify-between items-center">
                                    System throughput vs QPS
                                    <span className="text-xs font-normal text-emerald-500 bg-emerald-950/30 border border-emerald-900/50 px-2 py-1 rounded ml-2">Higher is better</span>
                                </h3>
                                
                                <div className="flex bg-slate-950 rounded-lg p-1 border border-slate-800">
                                    <button onClick={() => setTputDisplay('tput_sec')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${tputDisplay === 'tput_sec' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Total Tokens/sec</button>
                                    <button onClick={() => setTputDisplay('tokens_dollar')} className={`px-2 py-1 text-xs font-semibold rounded-md transition-colors ${tputDisplay === 'tokens_dollar' ? 'bg-slate-800 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}>Tokens/$</button>
                                </div>
                            </div>
                            <div className="flex-1 p-6 flex flex-col justify-between">
                                <div className="h-[85%]">
                                    <p className="text-sm text-slate-400 mb-6">Visualizing total output tokens processed per second as request rate scales. The Optimal path maintains stability at higher load bounds.</p>
                                    <ResponsiveContainer width="100%" height="80%">
                                        <LineChart syncId="prism_analytics" data={tputDisplay === 'tput_sec' ? RAW_GEMMA_DATA : DYNAMIC_TPUT_DATA} margin={{ top: 15, right: 30, left: 20, bottom: 20 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                            <XAxis dataKey="qps" stroke="#64748b" tick={{fontSize: 12}}>
                                                <Label value="QPS (reqs/sec)" position="insideBottom" offset={-10} fill="#94a3b8" fontSize={12}/>
                                            </XAxis>
                                            <YAxis stroke="#64748b" tick={{fontSize: 12}}>
                                                <Label value={tputDisplay === 'tput_sec' ? "Total Output Tokens (tokens/sec)" : "Tokens Per Dollar ($)"} angle={-90} position="insideLeft" offset={0} fill="#94a3b8" fontSize={12}/>
                                            </YAxis>
                                            <Tooltip content={<CustomTputTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                                            <Legend verticalAlign="top" height={40} wrapperStyle={{ fontSize: '12px' }}/>
                                            
                                            <ReferenceLine y={tputDisplay === 'tput_sec' ? maxThroughput : maxThroughput / activeCost} stroke="#ef4444" strokeDasharray="3 3" label={{ position: 'insideTopRight', value: 'VRAM ceiling', fill: '#ef4444', fontSize: 11 }} />

                                            <Line type="monotone" dataKey={tputDisplay === 'tput_sec' ? "baseline_tput" : "baseline_tput"} name="standard Kubernetes service" stroke="#94a3b8" strokeDasharray="4 4" strokeWidth={2} dot={{ r: 4 }} />
                                            <Line type="monotone" dataKey={tputDisplay === 'tput_sec' ? "optimal_tput" : "optimal_tput"} name="Optimal Throughput" stroke="#10b981" strokeWidth={3} dot={{ r: 6 }} activeDot={{ r: 8, fill: '#34d399' }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex items-center space-x-4 text-[11px] text-slate-500 pt-2 border-t border-slate-800/50">
                                    <div className="flex items-center">
                                        <div className="w-3 h-0.5 border-t-2 border-red-500 border-dashed mr-1"></div>
                                        <span>Hardware Ceiling (VRAM bound)</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
                
                {/* Summary Metrics Table */}
                <div className="border border-slate-800 rounded-xl bg-slate-900 shadow-xl p-6 flex flex-col h-[28rem]">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h3 className="text-md font-bold text-white">Summary metrics comparison</h3>
                            <span className="text-xs text-slate-500">Comparing standard Kubernetes service against Optimal (Prompt routing) workloads side-by-side. Replaces static markdown matrices.</span>
                        </div>
                    </div>
                    <div className="flex-1 overflow-auto rounded-lg border border-slate-800">
                        <table className="w-full text-sm text-left text-slate-300">
                            <thead className="text-xs uppercase text-slate-400 bg-slate-800 border-b border-slate-700">
                                <tr>
                                    <th scope="col" className="px-4 py-3">QPS</th>
                                    <th scope="col" className="px-4 py-3">standard Kubernetes service TTFT</th>
                                    <th scope="col" className="px-4 py-3 text-emerald-400">Optimal TTFT</th>
                                    <th scope="col" className="px-4 py-3">standard Kubernetes service ITL</th>
                                    <th scope="col" className="px-4 py-3 text-emerald-400">Optimal ITL</th>
                                    <th scope="col" className="px-4 py-3">Gain</th>
                                </tr>
                            </thead>
                            <tbody>
                                {DYNAMIC_GEMMA_DATA.filter(d => d.qps === 1 || d.qps === 5 || d.qps === 8 || d.qps === 12).map((row, idx) => {
                                    const base99 = row.baseline_ttft_p99 || 0;
                                    const opt99 = row.optimal_ttft_p99 || 0;
                                    const ttftRed = base99 && opt99 ? Math.round((base99 - opt99) / base99 * 100) : 0;
                                    return (
                                        <tr key={idx} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                                            <td className="px-4 py-4 font-mono font-bold text-white">{row.qps}</td>
                                            <td className="px-4 py-4 font-mono">{Math.round(base99)}ms</td>
                                            <td className="px-4 py-4 font-mono text-emerald-400 font-semibold">{Math.round(opt99)}ms</td>
                                            <td className="px-4 py-4 font-mono">{Math.round(row.baseline_itl_p99 || 0)}ms</td>
                                            <td className="px-4 py-4 font-mono text-emerald-400 font-semibold">{Math.round(row.optimal_itl_p99 || 0)}ms</td>
                                            <td className="px-4 py-4">
                                                <span className={`px-2 py-1 text-xs font-bold rounded-full ${ttftRed > 0 ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-slate-500/20 text-slate-400 border border-slate-500/30'}`}>
                                                    {ttftRed > 0 ? `+${ttftRed}%` : 'N/A'}
                                                </span>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>

            {/* Reproduction Modal Workflow */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-2xl w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/80">
                            <div className="flex items-center">
                                <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg mr-3">
                                    <Zap className="w-5 h-5" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-white">Reproduce deployment</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">Apply this configuration directly to your cluster.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </header>

                        <div className="p-6">
                            
                            <div className="mb-6 relative">
                                <div className="flex justify-between items-end mb-2">
                                    <label className="text-sm font-semibold text-slate-300">Target QPS Bound</label>
                                    <span className="text-emerald-400 font-mono text-xs bg-emerald-900/30 px-2 py-0.5 rounded border border-emerald-800">{targetQps} QPS</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" 
                                    max="20" 
                                    value={targetQps} 
                                    onChange={(e) => setTargetQps(e.target.value)}
                                    className="w-full h-1.5 bg-slate-700 rounded-lg outline-none appearance-none cursor-pointer accent-emerald-500"
                                />
                            </div>

                            <div className="mb-6">
                                <h4 className="text-sm font-semibold text-slate-300 mb-2">Helm upgrade command generated</h4>
                                <div className="bg-slate-950 border border-emerald-500/30 rounded-lg p-4 relative group">
                                    <pre className="text-emerald-400 font-mono text-sm whitespace-pre-wrap leading-relaxed">
                                        helm upgrade prism-router ./chart \
                                        <br/>  --set router.policy=intelligent_gateway \
                                        <br/>  <span className="bg-emerald-500/20 px-1 py-0.5 rounded transition-all">--set target_qps={targetQps}</span>
                                    </pre>
                                    <button onClick={handleCopyHelm} className="absolute top-3 right-3 p-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md border border-slate-700 transition-colors shadow-sm flex items-center">
                                        {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                                {copied && <p className="text-xs text-emerald-500 mt-2 font-medium animate-pulse">Copied to clipboard!</p>}
                            </div>

                        </div>
                        <div className="px-6 py-4 bg-slate-900 border-t border-slate-800 flex justify-end">
                            <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium text-sm transition-colors border border-slate-700 mr-3">Cancel</button>
                            <a href="#" className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center">
                                Deploy now <ExternalLink className="w-4 h-4 ml-2" />
                            </a>
                        </div>
                    </div>
                </div>
            )}

            {/* SLA Alert Modal Mock */}
            {isAlertModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
                    <div className="bg-slate-900 border border-slate-700 rounded-xl max-w-lg w-full shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <header className="px-5 py-4 border-b border-slate-800 flex justify-between items-center bg-slate-800/80">
                            <div className="flex items-center">
                                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg mr-3">
                                    <Bell className="w-5 h-5 cursor-pointer" />
                                </div>
                                <div>
                                    <h3 className="text-[15px] font-bold text-white">Create SLA Alert</h3>
                                    <p className="text-[11px] text-slate-400 mt-0.5">Notifies your team when performance drops.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsAlertModalOpen(false)} className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-700 transition-colors">
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                            </button>
                        </header>

                        <div className="p-5 space-y-4">
                            <div>
                                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Condition</label>
                                <div className="flex items-center space-x-2 text-sm text-slate-300 bg-slate-950 p-2.5 rounded border border-slate-800">
                                    <span className="font-mono text-emerald-400">P99 TTFT</span>
                                    <span> exceeds </span>
                                    <input type="number" defaultValue={450} className="w-16 bg-slate-800 border border-slate-700 rounded px-2 py-0.5 text-center text-white outline-none" />
                                    <span>ms</span>
                                </div>
                            </div>
                            
                            <div>
                                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Duration</label>
                                <div className="flex items-center space-x-2 text-sm text-slate-300">
                                    <span>For</span>
                                    <select className="bg-slate-800 border border-slate-700 rounded px-2 py-1 text-white outline-none">
                                        <option>2 consecutive days</option>
                                        <option>3 consecutive days</option>
                                        <option>1 week</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="text-xs font-semibold text-slate-400 block mb-1.5">Routing</label>
                                <button className="w-full flex items-center justify-between p-3 border border-indigo-500/30 bg-indigo-500/10 rounded-lg hover:bg-indigo-500/20 transition-colors">
                                    <div className="flex items-center">
                                        <Slack className="w-4 h-4 text-indigo-400 mr-2" />
                                        <span className="text-sm font-medium text-slate-200">#ops-alerts-inference</span>
                                    </div>
                                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                                </button>
                            </div>
                        </div>
                        
                        <div className="px-5 py-3 bg-slate-900 border-t border-slate-800 flex justify-end items-center">
                            {alertSaved && <span className="text-xs font-medium text-emerald-500 mr-4 animate-in fade-in slide-in-from-right-4">Alert Saved!</span>}
                            <button onClick={() => setIsAlertModalOpen(false)} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded text-xs transition-colors border border-slate-700 mr-2 font-semibold">Cancel</button>
                            <button onClick={handleSaveAlert} className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded font-bold text-xs transition-colors shadow-sm flex items-center border border-indigo-500 line-clamp-1">
                                Save Alert Condition
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Milestone1Dashboard;
