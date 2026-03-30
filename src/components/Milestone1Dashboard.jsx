import React, { useState, useEffect, useMemo } from 'react';
import { useDashboardData } from '../hooks/useDashboardData';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    ScatterChart, Scatter, ZAxis, Label
} from 'recharts';
import { Filter, Zap, Table, Download, Copy, Check, Info, RefreshCw, X, ArrowLeft } from 'lucide-react';

const MOCK_FALLBACK_DATA = [
    {
        run_id: "Run-1",
        model_name: "Llama-3-70B",
        hardware: "NVIDIA H100",
        chip_count: 8,
        scenario_config: "Standard TCP",
        metrics: { qps: 50, ttft_mean: 120, throughput: 2500, itl: 15 }
    },
    {
        run_id: "Run-2",
        model_name: "Llama-3-70B",
        hardware: "NVIDIA H100",
        chip_count: 8,
        scenario_config: "Standard TCP",
        metrics: { qps: 100, ttft_mean: 140, throughput: 5000, itl: 18 }
    },
    {
        run_id: "Run-3",
        model_name: "Gemma-2-27B",
        hardware: "NVIDIA A100",
        chip_count: 4,
        scenario_config: "Low Latency",
        metrics: { qps: 200, ttft_mean: 80, throughput: 8000, itl: 12 }
    },
    {
        run_id: "Run-4",
        model_name: "Gemma-2-27B",
        hardware: "NVIDIA A100",
        chip_count: 4,
        scenario_config: "Low Latency",
        metrics: { qps: 400, ttft_mean: 95, throughput: 16000, itl: 14 }
    }
];

const Milestone1Dashboard = ({ onNavigateBack, onNavigate }) => {
    const { data: rawData, loading, error, loadAllData } = useDashboardData({}, { selectedBenchmarks: new Set(), setSelectedBenchmarks: () => {}, xAxisMax: Infinity, setXAxisMax: () => {} });
    const [lastRefresh] = useState(new Date().toLocaleTimeString());

    useEffect(() => {
        loadAllData();
    }, []); // Fetch on mount

    // Filter States
    const [selectedModels, setSelectedModels] = useState(new Set());
    const [selectedAccelerators, setSelectedAccelerators] = useState(new Set());
    const [selectedChips, setSelectedChips] = useState(new Set());
    const [selectedScenarios, setSelectedScenarios] = useState(new Set());

    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const [activeTab, setActiveTab] = useState('charts'); // 'charts' | 'table'
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedBenchmarkForModal, setSelectedBenchmarkForModal] = useState(null);
    const [copied, setCopied] = useState(false);

    // 1. URL State Coupling (Deep Linking)
    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        if (params.has('models')) setSelectedModels(new Set(params.get('models').split(',')));
        if (params.has('accelerators')) setSelectedAccelerators(new Set(params.get('accelerators').split(',')));
        if (params.has('chips')) setSelectedChips(new Set(params.get('chips').split(',').map(Number)));
        if (params.has('scenarios')) setSelectedScenarios(new Set(params.get('scenarios').split(',')));
    }, []);

    useEffect(() => {
        const params = new URLSearchParams();
        if (selectedModels.size > 0) params.set('models', Array.from(selectedModels).join(','));
        if (selectedAccelerators.size > 0) params.set('accelerators', Array.from(selectedAccelerators).join(','));
        if (selectedChips.size > 0) params.set('chips', Array.from(selectedChips).join(','));
        if (selectedScenarios.size > 0) params.set('scenarios', Array.from(selectedScenarios).join(','));

        const newUrl = `${window.location.pathname}?${params.toString()}`;
        window.history.pushState({}, '', newUrl);
    }, [selectedModels, selectedAccelerators, selectedChips, selectedScenarios]);

    const data = useMemo(() => {
        if (!rawData || rawData.length === 0) return MOCK_FALLBACK_DATA;
        return rawData.map(d => ({
            ...d,
            model_name: d.model_name || d.model_id || d.model || 'Unknown',
            hardware: d.hardware || d.accelerator_type || 'Unknown',
            chip_count: parseInt(d.accelerator_count || d.chip_count || 1),
            scenario_config: d.architecture || d.scenario_config || 'Standard',
            metrics: {
                qps: d.metrics?.request_rate || d.metrics?.qps || d.qps || 0,
                ttft_mean: d.metrics?.ttft?.mean || d.metrics?.ttft_ms || d.metrics?.mean_ttft_ms || 0,
                throughput: d.metrics?.throughput || d.metrics?.total_token_throughput || d.throughput || 0,
                itl: d.metrics?.itl_ms || d.metrics?.itl || 0
            }
        }));
    }, [rawData]);

    // 3. Compute Filter Options
    const filterOptions = useMemo(() => {
        const models = new Set();
        const accs = new Set();
        const chips = new Set();
        const scenarios = new Set();

        data.forEach(d => {
            if (d.model_name) models.add(d.model_name);
            if (d.hardware) accs.add(d.hardware);
            if (d.chip_count) chips.add(d.chip_count);
            if (d.scenario_config) scenarios.add(d.scenario_config);
        });

        return {
            models: Array.from(models).sort(),
            accelerators: Array.from(accs).sort(),
            chips: Array.from(chips).sort((a, b) => a - b),
            scenarios: Array.from(scenarios).sort()
        };
    }, [data]);

    // 4. Filter Data
    const filteredData = useMemo(() => {
        return data.filter(d => {
            if (selectedModels.size > 0 && !selectedModels.has(d.model_name)) return false;
            if (selectedAccelerators.size > 0 && !selectedAccelerators.has(d.hardware)) return false;
            if (selectedChips.size > 0 && !selectedChips.has(d.chip_count)) return false;
            if (selectedScenarios.size > 0 && !selectedScenarios.has(d.scenario_config)) return false;
            return true;
        });
    }, [data, selectedModels, selectedAccelerators, selectedChips, selectedScenarios]);

    // Ensure data is sorted by QPS for accurate line charts (prevent zig-zag)
    const sortedData = useMemo(() => {
        return [...filteredData].sort((a, b) => a.metrics.qps - b.metrics.qps);
    }, [filteredData]);


    // Dynamic Toggles for sets
    const toggleFilter = (set, value, setter) => {
        const next = new Set(set);
        if (next.has(value)) next.delete(value);
        else next.add(value);
        setter(next);
    };

    const handleOpenModal = (benchmark) => {
        setSelectedBenchmarkForModal(benchmark);
        setIsModalOpen(true);
        setCopied(false);
    };

    const getHelmCommand = () => {
        if (!selectedBenchmarkForModal) return '';
        const { reproduction } = selectedBenchmarkForModal;
        const recipe = reproduction.recipeUrl || 'gs://recipes/intelligent-router-v1.yaml';
        const overrides = Object.entries(reproduction.configOverrides || {})
            .map(([k, v]) => `--set ${k}=${v}`)
            .join(' ');
        
        return `helm upgrade --install intelligent-router llm-d/intelligent-router -f ${recipe} ${overrides}`;
    };

    const getInferencePerfCommand = () => {
        // Fallback to selections if benchmark context is empty
        const model = selectedBenchmarkForModal?.model_name || Array.from(selectedModels)[0] || 'Llama-3-70B';
        const scenario = selectedBenchmarkForModal?.scenario_config || Array.from(selectedScenarios)[0] || 'Standard';
        
        return `inference-perf run --model ${model} --scenario ${scenario} --output-dir gs://shared-results/`;
    };

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex h-screen overflow-hidden">
            {/* Sidebar (Filtering) */}
            {/* Sidebar removed to maximize chart real estate */}

            {/* Main Content Pane */}
            <div className="flex-1 flex flex-col h-full relative overflow-hidden">
                {/* Top Nav */}
                <header className="h-16 border-b border-slate-800 flex justify-between items-center px-6 bg-slate-900 z-10">
                    <div className="flex items-center">
                        <button 
                            onClick={onNavigateBack} 
                            className="mr-4 p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </button>
                        <h1 className="text-xl font-bold text-white">Prism UI</h1>
                    </div>

                    {/* Visible Path Tabs */}
                    <div className="flex items-center space-x-2 bg-slate-900 rounded-lg p-1 border border-slate-800 shadow-xl">
                        <span className="text-xs font-semibold text-slate-400 mr-2 self-center uppercase tracking-wider pl-2">
                             Well-lit paths:
                        </span>
                        <button 
                            onClick={() => onNavigate && onNavigate('inference-scheduling')} 
                            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                        >
                            Inference Scheduling
                        </button>
                        <button 
                            onClick={() => onNavigate && onNavigate('pd-disaggregation')} 
                            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            P/D Split
                        </button>
                        <button 
                            onClick={() => onNavigate && onNavigate('wide-ep')} 
                            className="px-4 py-1.5 text-sm font-medium rounded-md transition-all duration-300 text-slate-400 hover:text-white hover:bg-slate-800"
                        >
                            Wide-EP
                        </button>
                    </div>

                    <div className="flex items-center space-x-4">
                        <span className="text-xs text-zinc-500 flex items-center">
                            Last synced: {lastRefresh || '-'} 
                        </span>
                        <button 
                            onClick={() => setIsSidebarOpen(!isSidebarOpen)} 
                            className="p-2 mr-2 rounded-lg bg-white hover:bg-zinc-50 text-[#111827] border border-[#E5E7EB]"
                        >
                            <Filter className="h-4 w-4" />
                        </button>
                        
                        <div className="flex bg-slate-800 rounded-lg p-1 border border-slate-700 shadow-md">
                            <button 
                                onClick={() => setActiveTab('charts')} 
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'charts' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Zap className="h-4 w-4 mr-1.5" /> Charts
                            </button>
                            <button 
                                onClick={() => setActiveTab('table')} 
                                className={`px-3 py-1.5 text-sm font-medium rounded-md transition-all flex items-center ${activeTab === 'table' ? 'bg-gradient-to-r from-cyan-500 to-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                            >
                                <Table className="h-4 w-4 mr-1.5" /> Data
                            </button>
                        </div>
                    </div>
                </header>

                {/* Horizontal Filters Bar (Collapsible) */}
                <div className={`${isSidebarOpen ? 'max-h-[500px] opacity-100 p-6 border-b' : 'max-h-0 opacity-0 overflow-hidden p-0'} bg-slate-900 border-slate-800 transition-all duration-300 z-10`}>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        {/* Model Name */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-slate-400">Model Name</h3>
                                <div className="flex space-x-2 text-xs">
                                    <button onClick={() => setSelectedModels(new Set(filterOptions.models))} className="text-blue-400 hover:text-blue-300">All</button>
                                    <span className="text-slate-600">|</span>
                                    <button onClick={() => setSelectedModels(new Set())} className="text-slate-400 hover:text-white">Clear</button>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {filterOptions.models.map(m => (
                                    <label key={m} className="flex items-center text-sm p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-200">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedModels.has(m)} 
                                            onChange={() => toggleFilter(selectedModels, m, setSelectedModels)}
                                            className="rounded border-slate-700 bg-slate-800 text-blue-500 mr-2"
                                        />
                                        {m}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Accelerator */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-slate-400">Accelerator</h3>
                                <div className="flex space-x-2 text-xs">
                                    <button onClick={() => setSelectedAccelerators(new Set(filterOptions.accelerators))} className="text-blue-400 hover:text-blue-300">All</button>
                                    <span className="text-slate-600">|</span>
                                    <button onClick={() => setSelectedAccelerators(new Set())} className="text-slate-400 hover:text-white">Clear</button>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {filterOptions.accelerators.map(a => (
                                    <label key={a} className="flex items-center text-sm p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-200">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedAccelerators.has(a)} 
                                            onChange={() => toggleFilter(selectedAccelerators, a, setSelectedAccelerators)}
                                            className="rounded border-slate-700 bg-slate-800 text-blue-500 mr-2"
                                        />
                                        {a}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Chip Count */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-slate-400">Chip Count</h3>
                                <div className="flex space-x-2 text-xs">
                                    <button onClick={() => setSelectedChips(new Set(filterOptions.chips))} className="text-blue-400 hover:text-blue-300">All</button>
                                    <span className="text-slate-600">|</span>
                                    <button onClick={() => setSelectedChips(new Set())} className="text-slate-400 hover:text-white">Clear</button>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {filterOptions.chips.map(c => (
                                    <label key={c} className="flex items-center text-sm p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-200">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedChips.has(c)} 
                                            onChange={() => toggleFilter(selectedChips, c, setSelectedChips)}
                                            className="rounded border-slate-700 bg-slate-800 text-blue-500 mr-2"
                                        />
                                        x{c}
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* Scenario */}
                        <div>
                            <div className="flex justify-between items-center mb-2">
                                <h3 className="text-xs font-semibold uppercase text-slate-400">Scenario Config</h3>
                                <div className="flex space-x-2 text-xs">
                                    <button onClick={() => setSelectedScenarios(new Set(filterOptions.scenarios))} className="text-blue-400 hover:text-blue-300">All</button>
                                    <span className="text-slate-600">|</span>
                                    <button onClick={() => setSelectedScenarios(new Set())} className="text-slate-400 hover:text-white">Clear</button>
                                </div>
                            </div>
                            <div className="space-y-1 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                                {filterOptions.scenarios.map(s => (
                                    <label key={s} className="flex items-center text-sm p-1 hover:bg-slate-800 rounded cursor-pointer text-slate-200">
                                        <input 
                                            type="checkbox" 
                                            checked={selectedScenarios.has(s)} 
                                            onChange={() => toggleFilter(selectedScenarios, s, setSelectedScenarios)}
                                            className="rounded border-slate-700 bg-slate-800 text-blue-500 mr-2"
                                        />
                                        {s}
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>



                {loading ? (
                    <div className="flex-1 flex flex-col items-center justify-center">
                        <RefreshCw className="h-10 w-10 text-blue-400 animate-spin mb-4" />
                        <span className="text-slate-400">Scanning GCS Bucket...</span>
                    </div>
                ) : (
                    <div className="flex-1 overflow-y-auto p-6 relative">
                        {/* Active filter mini-chips (Visible when collapsed) */}
                        {(!isSidebarOpen && (selectedModels.size > 0 || selectedAccelerators.size > 0 || selectedChips.size > 0 || selectedScenarios.size > 0)) && (
                            <div className="mb-6 flex flex-wrap gap-2 items-center bg-slate-900/80 p-3 rounded-lg border border-slate-800 shadow-lg">
                                <span className="text-xs text-slate-400 uppercase font-semibold mr-1">Filtered by:</span>
                                {Array.from(selectedModels).map(m => (
                                    <span key={m} className="px-2 py-1 text-xs bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-md flex items-center">
                                        {m}
                                        <button onClick={() => toggleFilter(selectedModels, m, setSelectedModels)} className="ml-1.5 text-cyan-400 hover:text-white"><X size={12} /></button>
                                    </span>
                                ))}
                                {Array.from(selectedAccelerators).map(a => (
                                    <span key={a} className="px-2 py-1 text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 rounded-md flex items-center">
                                        {a}
                                        <button onClick={() => toggleFilter(selectedAccelerators, a, setSelectedAccelerators)} className="ml-1.5 text-purple-400 hover:text-white"><X size={12} /></button>
                                    </span>
                                ))}
                                {Array.from(selectedChips).map(c => (
                                    <span key={c} className="px-2 py-1 text-xs bg-pink-500/20 text-pink-300 border border-pink-500/30 rounded-md flex items-center">
                                        {c} chips
                                        <button onClick={() => toggleFilter(selectedChips, c, setSelectedChips)} className="ml-1.5 text-pink-400 hover:text-white"><X size={12} /></button>
                                    </span>
                                ))}
                                {Array.from(selectedScenarios).map(s => (
                                    <span key={s} className="px-2 py-1 text-xs bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-md flex items-center">
                                        {s}
                                        <button onClick={() => toggleFilter(selectedScenarios, s, setSelectedScenarios)} className="ml-1.5 text-amber-400 hover:text-white"><X size={12} /></button>
                                    </span>
                                ))}
                                <button onClick={() => { setSelectedModels(new Set()); setSelectedAccelerators(new Set()); setSelectedChips(new Set()); setSelectedScenarios(new Set()); }} className="text-xs text-slate-400 hover:text-white underline ml-auto flex items-center">
                                    <RefreshCw className="h-3 w-3 mr-1" /> Clear All
                                </button>
                            </div>
                        )}
                        {/* Background Glows (Inner) */}
                        <div className="absolute top-1/4 -right-1/4 w-1/2 h-1/2 bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

                        {activeTab === 'charts' ? (
                            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 pb-12">
                                {/* TTFT vs QPS */}
                                <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-6 h-[400px] flex flex-col">
                                    <h3 className="text-md font-bold mb-4 flex justify-between items-center text-white">
                                        Time to First Token (TTFT) vs QPS
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`![TTFT vs QPS Chart](http://localhost:3000/embed/ttft_qps?models=${Array.from(selectedModels).join(',')})`);
                                                    // Trigger notification if possible
                                                }} 
                                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" 
                                                title="Copy Markdown Embed"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setSelectedBenchmarkForModal(sortedData[0] || null);
                                                    setIsModalOpen(true);
                                                }} 
                                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" 
                                                title="Reproduce This"
                                            >
                                                <Zap className="h-4 w-4" />
                                            </button>
                                            <div className="text-xs font-normal text-slate-400">Lower is better</div>
                                        </div>
                                    </h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={sortedData} margin={{ top: 20, right: 40, left: 60, bottom: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="metrics.qps" stroke="#64748b" height={60}>
                                                    <Label value="QPS" position="insideBottom" offset={-10} fill="#94a3b8" />
                                                </XAxis>
                                                <YAxis width={100} label={{ value: 'TTFT (ms)', angle: -90, position: 'insideLeft', offset: -45, fill: '#94a3b8' }} stroke="#64748b" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 20 }} />
                                                <Line type="monotone" dataKey="metrics.ttft_mean" name="Mean TTFT" stroke="#3b82f6" strokeWidth={2} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Throughput vs QPS */}
                                <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-6 h-[400px] flex flex-col">
                                    <h3 className="text-md font-bold mb-4 flex justify-between items-center text-white">
                                        Throughput vs QPS
                                        <div className="flex items-center space-x-2">
                                            <button 
                                                onClick={() => {
                                                    navigator.clipboard.writeText(`![Throughput vs QPS Chart](http://localhost:3000/embed/tput_qps?models=${Array.from(selectedModels).join(',')})`);
                                                }} 
                                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" 
                                                title="Copy Markdown Embed"
                                            >
                                                <Download className="h-4 w-4" />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setSelectedBenchmarkForModal(sortedData[0] || null);
                                                    setIsModalOpen(true);
                                                }} 
                                                className="p-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white" 
                                                title="Reproduce This"
                                            >
                                                <Zap className="h-4 w-4" />
                                            </button>
                                            <div className="text-xs font-normal text-slate-400">Higher is better</div>
                                        </div>
                                    </h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={sortedData} margin={{ top: 20, right: 40, left: 60, bottom: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="metrics.qps" stroke="#64748b" height={60}>
                                                    <Label value="QPS" position="insideBottom" offset={-10} fill="#94a3b8" />
                                                </XAxis>
                                                <YAxis width={100} label={{ value: 'Throughput (tok/s)', angle: -90, position: 'insideLeft', offset: -45, fill: '#94a3b8' }} stroke="#64748b" />
                                                <Tooltip content={<CustomTooltip />} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 20 }} />
                                                <Line type="monotone" dataKey="metrics.throughput" name="Out Throughput" stroke="#10b981" strokeWidth={2} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* Scatter Plot: TTFT vs Request ID */}
                                <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl p-6 h-[400px] flex flex-col col-span-1 xl:col-span-2">
                                    <h3 className="text-md font-bold mb-4 flex justify-between text-white">
                                        TTFT Variance Per Request (Cache Hit Visualization)
                                        <div className="text-xs font-normal text-slate-400">Flatlines show cache hits vs routing variance</div>
                                    </h3>
                                    <div className="flex-1 min-h-0">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <ScatterChart margin={{ top: 20, right: 40, left: 60, bottom: 90 }}>
                                                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                                                <XAxis dataKey="run_id" name="Run/Request ID" stroke="#64748b" height={60}>
                                                    <Label value="Run Request ID" position="insideBottom" offset={-10} fill="#94a3b8" />
                                                </XAxis>
                                                <YAxis width={100} dataKey="metrics.ttft_mean" name="TTFT (ms)" stroke="#64748b" label={{ value: 'TTFT (ms)', angle: -90, position: 'insideLeft', offset: -45, fill: '#94a3b8' }} />
                                                <ZAxis range={[20, 20]} />
                                                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                                <Legend verticalAlign="bottom" height={36} wrapperStyle={{ paddingTop: 20 }} />
                                                <Scatter name="Benchmarks" data={filteredData} fill="#ec4899" />
                                            </ScatterChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="pb-12 h-full flex flex-col">
                                <div className="bg-slate-900 border border-slate-800 shadow-xl rounded-xl overflow-hidden flex-1 m-min-h-0 flex flex-col">
                                    <h3 className="text-md font-bold p-6 border-b border-slate-800 text-white">Summary Comparison Table</h3>
                                    <div className="flex-1 overflow-auto">
                                        <table className="w-full text-sm text-left border-collapse">
                                            <thead className="text-xs uppercase bg-slate-800 text-slate-300 sticky top-0 z-10">
                                                <tr>
                                                    <th className="px-6 py-3">Model & Scenario</th>
                                                    <th className="px-6 py-3">Accelerator</th>
                                                    <th className="px-6 py-3">Req/sec (QPS)</th>
                                                    <th className="px-6 py-3">Mean TTFT</th>
                                                    <th className="px-6 py-3">ITL</th>
                                                    <th className="px-6 py-3">Action</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-800">
                                                {filteredData.map((d, idx) => (
                                                    <tr key={d.id || idx} className="hover:bg-slate-800 transition-colors">
                                                        <td className="px-6 py-4 font-medium max-w-xs truncate text-white">
                                                            {d.model_name}
                                                            <div className="text-xs text-slate-400">{d.scenario_config}</div>
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-300">
                                                            {d.hardware} (x{d.chip_count})
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-300">{Number(d.metrics.qps || 0).toFixed(2)}</td>
                                                        <td className="px-6 py-4 text-slate-300">{Number(d.metrics.ttft_mean || 0).toFixed(1)} ms</td>
                                                        <td className="px-6 py-4 text-slate-300">{Number(d.metrics.itl || 0).toFixed(1)} ms</td>
                                                        <td className="px-6 py-4">
                                                            <button 
                                                                onClick={() => handleOpenModal(d)}
                                                                className="px-3 py-1.5 text-xs font-medium rounded-md bg-slate-800 hover:bg-slate-700 text-blue-400 border border-blue-500/30 hover:border-blue-500 transition-all flex items-center"
                                                            >
                                                                <Download className="h-3 w-3 mr-1.5" /> Reproduce
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Reproduction Modal */}
            {isModalOpen && selectedBenchmarkForModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
                    <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-2xl w-full shadow-2xl flex flex-col overflow-hidden max-h-[80vh]">
                        <header className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800">
                            <div>
                                <h3 className="text-lg font-bold text-white">Reproduce Report</h3>
                                <p className="text-xs text-slate-400 mt-1">
                                    {selectedBenchmarkForModal.model_name} - {selectedBenchmarkForModal.hardware}
                                </p>
                            </div>
                            <button 
                                onClick={() => setIsModalOpen(false)} 
                                className="text-slate-400 hover:text-slate-100 p-1 rounded-full hover:bg-slate-700"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </header>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div className="bg-slate-950 border border-slate-800 rounded-lg p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-slate-300">Inference Perf CLI Flags</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(getInferencePerfCommand());
                                        }}
                                        className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center"
                                    >
                                        <Copy className="h-3 w-3 mr-1" />
                                        Copy
                                    </button>
                                </div>
                                <pre className="bg-slate-900 p-3 rounded-md font-mono text-xs text-blue-400 border border-slate-800 whitespace-pre-wrap overflow-x-auto">
                                     {getInferencePerfCommand()}
                                </pre>
                            </div>

                            <div className="bg-slate-950 border border-slate-850 rounded-lg p-5">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold text-slate-300">Helm Upgrade Snippet</span>
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(getHelmCommand());
                                            setCopied(true);
                                            setTimeout(() => setCopied(false), 2000);
                                        }}
                                        className="text-xs px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center"
                                    >
                                        {copied ? <Check className="h-3 w-3 mr-1 text-green-500" /> : <Copy className="h-3 w-3 mr-1" />}
                                        {copied ? 'Copied' : 'Copy'}
                                    </button>
                                </div>
                                <pre className="text-xs bg-slate-950 text-slate-200 font-mono p-4 rounded-md overflow-x-auto whitespace-pre-wrap break-all border border-slate-800 leading-relaxed max-h-48">
                                    <code>{getHelmCommand()}</code>
                                </pre>
                            </div>

                            <div>
                                <h4 className="flex items-center text-sm font-semibold mb-3">
                                    <Info className="h-4 w-4 mr-1.5 text-blue-400" /> Derived Configuration Overrides
                                </h4>
                                <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                                    <ul className="text-xs font-mono space-y-2 text-slate-300">
                                        <li> well_lit_path: {selectedBenchmarkForModal.well_lit_path || 'inference-scheduling'}</li>
                                        <li> scn_config: {selectedBenchmarkForModal.scenario_config}</li>
                                        <li> chip_count: {selectedBenchmarkForModal.chip_count}</li>
                                        <li> hardware: {selectedBenchmarkForModal.hardware}</li>
                                        {Object.entries(selectedBenchmarkForModal.reproduction?.configOverrides || {}).map(([k, v]) => (
                                            <li key={k}>{k}: {v}</li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper Custom Tooltip for Recharts
const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
        return (
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-lg p-3 shadow-xl max-w-xs text-xs">
                <p className="font-bold mb-1.5 text-slate-200">{payload[0].payload.model_name}</p>
                <div className="space-y-1">
                    {payload.map((entry, idx) => (
                        <p key={idx} style={{ color: entry.stroke }}>
                            {entry.name}: {Number(entry.value).toFixed(2)}
                        </p>
                    ))}
                    <p className="text-slate-400 pt-1 mt-1 border-t border-slate-800">Hardware: {payload[0].payload.hardware} (x{payload[0].payload.chip_count})</p>
                    <p className="text-slate-400">QPS: {Number(payload[0].payload.metrics.qps).toFixed(2)}</p>
                </div>
            </div>
        );
    }
    return null;
};

// Helper for Mock Data
const getMockData = () => {
    return [
        {
            id: 'mock-1',
            model_name: 'Qwen3-32B',
            hardware: 'NVIDIA H100',
            chip_count: 8,
            scenario_config: 'Challenger (Intelligent Routing)',
            well_lit_path: 'inference-scheduling',
            run_id: 'run-1',
            metrics: { qps: 0.5, ttft_mean: 120, throughput: 15.2, itl: 25 },
            reproduction: { recipeUrl: 'gs://recipes/intel-router-v0.2.yaml', configOverrides: { 'route.policy': 'smart-cost' } }
        },
        {
            id: 'mock-2',
            model_name: 'Qwen3-32B',
            hardware: 'NVIDIA H100',
            chip_count: 8,
            scenario_config: 'Baseline (Standard Routing)',
            well_lit_path: 'inference-scheduling',
            run_id: 'run-2',
            metrics: { qps: 0.5, ttft_mean: 1100, throughput: 12.1, itl: 35 },
            reproduction: { recipeUrl: 'gs://recipes/std-router-v0.2.yaml', configOverrides: { 'route.policy': 'standard' } }
        },
        {
            id: 'mock-3',
            model_name: 'Llama-3-70B',
            hardware: 'NVIDIA H100',
            chip_count: 8,
            scenario_config: 'Challenger (Intelligent Routing)',
            well_lit_path: 'inference-scheduling',
            run_id: 'run-3',
            metrics: { qps: 1.0, ttft_mean: 250, throughput: 30.5, itl: 22 },
            reproduction: { recipeUrl: 'gs://recipes/intel-router-v0.2.yaml', configOverrides: { 'route.policy': 'smart-cost' } }
        },
        {
            id: 'mock-4',
            model_name: 'Llama-3-70B',
            hardware: 'NVIDIA H100',
            chip_count: 8,
            scenario_config: 'Baseline (Standard Routing)',
            well_lit_path: 'inference-scheduling',
            run_id: 'run-4',
            metrics: { qps: 1.0, ttft_mean: 1200, throughput: 28.1, itl: 28 },
            reproduction: { recipeUrl: 'gs://recipes/std-router-v0.2.yaml', configOverrides: { 'route.policy': 'standard' } }
        }
    ];
};

export default Milestone1Dashboard;

