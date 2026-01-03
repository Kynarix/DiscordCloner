"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import {
    Copy, Check, ChevronRight, Hash, Shield, Mic, Settings,
    ArrowRight, Server as ServerIcon, Play, AlertCircle, RefreshCw,
    Folder, FolderOpen, FileCode, Bot
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

// Mock Data Types
interface GuildPreview {
    channels: { name: string, type: 'text' | 'voice' | 'category', children?: string[] }[];
    roles: { name: string, color: string }[];
    emojis: { name: string, url: string }[];
    bots: { id: string, username: string, avatar: string }[];
}

interface Guild {
    id: string;
    name: string;
    icon: string;
}

export default function ClonerPage() {
    const params = useParams()
    const sourceGuildId = params.id as string
    const router = useRouter()

    const [step, setStep] = useState(1) // 1: Config & Preview, 2: Cloning, 3: Done
    const [loading, setLoading] = useState(false)
    const [analyzing, setAnalyzing] = useState(true)
    const [logs, setLogs] = useState<{ msg: string, type: string, timestamp: string }[]>([])

    // Data
    const [sourceGuild, setSourceGuild] = useState<Guild | null>(null)
    const [targetGuild, setTargetGuild] = useState<Guild | null>(null)
    const [userGuilds, setUserGuilds] = useState<Guild[]>([])
    const [previewData, setPreviewData] = useState<GuildPreview | null>(null)
    const [isTargetSelectorOpen, setIsTargetSelectorOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

    // Bot Selection
    const [selectedBots, setSelectedBots] = useState<string[]>([])

    // Delete Options (Specifics)
    const [deleteOptions, setDeleteOptions] = useState({
        channels: true,
        roles: true,
        emojis: true
    })

    // Options
    const [options, setOptions] = useState({
        channels: true,
        roles: true,
        categories: true,
        emojis: true,
        bots: true,
        deleteExisting: false
    })

    // Initial Fetch
    useEffect(() => {

        const init = async () => {
            setAnalyzing(true)

            try {
                // 1. Fetch Source Guild Preview Data (Real)
                const previewRes = await fetch(`/api/guilds/${sourceGuildId}/preview`);
                const previewJson = await previewRes.json();

                if (previewRes.ok) {
                    setSourceGuild(previewJson.guild);
                    setPreviewData(previewJson.preview);
                } else {
                    addLog("Sunucu verileri çekilemedi: " + previewJson.error, "error");
                }

                // 2. Fetch User Guilds for Target Selection (Reuse existing API)
                const guildsRes = await fetch('/api/guilds');
                const guildsJson = await guildsRes.json();

                if (guildsRes.ok) {
                    setUserGuilds(guildsJson.guilds);
                }

            } catch (err) {
                console.error(err);
                addLog("Bağlantı hatası oluştu.", "error");
            } finally {
                setAnalyzing(false)
            }
        }

        init()
    }, [sourceGuildId])

    const toggleOption = (key: keyof typeof options) => {
        setOptions(prev => ({ ...prev, [key]: !prev[key] }))
    }

    const startCloning = async () => {
        if (!targetGuild) return alert("Lütfen hedef bir sunucu seçin.")

        setStep(2)
        setLoading(true)
        setLogs([]) // Clear old logs

        try {
            const response = await fetch('/api/clone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sourceId: sourceGuildId,
                    targetId: targetGuild.id,

                    options: {
                        ...options,
                        deleteSpecifics: deleteOptions
                    },
                    selectedBots: options.bots ? selectedBots : []
                })
            });

            if (!response.body) throw new Error("Stream not supported");

            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split('\n\n');

                for (const line of lines) {
                    if (line.startsWith('data: ')) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'finish') {
                                addLog(data.msg, 'success');
                                setLoading(false);
                                setStep(3);
                            } else {
                                addLog(data.msg, data.type);
                            }
                        } catch (e) {
                            // Ignore parse errors from partial chunks
                        }
                    }
                }
            }

        } catch (error) {
            console.error(error);
            addLog("Kritik bağlantı hatası oluştu.", "error");
            setLoading(false);
        }
    }

    // Removed simulateProcess as it is no longer needed

    const addLog = (msg: string, type: "info" | "success" | "warning" | "error" | "process") => {
        const time = new Date().toLocaleTimeString('tr-TR', { hour12: false })
        setLogs(prev => [...prev, { msg, type, timestamp: time }])
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 pb-20">

            {/* Header */}
            <div className="flex items-center space-x-4">
                <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => router.push('/dashboard')}
                    className="hover:bg-gray-100 dark:hover:bg-white/10 rounded-full w-10 h-10 transition-colors"
                >
                    <ArrowRight className="rotate-180 text-gray-600 dark:text-gray-400" size={24} />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Kopyalama Merkezi</h1>
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Sunucuyu analiz et, hedefi seç ve kopyala.</p>
                </div>
            </div>

            {/* --- STEP 1: Configuration & Preview --- */}
            {step === 1 && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

                    {/* LEFT: Configuration Panel */}
                    <div className="lg:col-span-4 space-y-6">
                        {/* Source -> Target Selection Card */}
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm relative z-10">
                            <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 font-medium text-gray-700 dark:text-gray-200 flex items-center">
                                <RefreshCw size={16} className="mr-2 text-red-500 dark:text-red-400" /> Transfer Rotası
                            </div>
                            <div className="p-5 space-y-6 relative">
                                {/* Source */}
                                <div className="flex items-center space-x-3 p-3 rounded-lg border border-red-100 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/10">
                                    <div className="w-10 h-10 rounded-lg bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400">
                                        {sourceGuild ? (sourceGuild.icon ? <img src={sourceGuild.icon} /> : <ServerIcon size={20} />) : <div className="animate-pulse w-full h-full bg-red-200 dark:bg-red-500/30 rounded-lg" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-xs text-red-500 dark:text-red-400 font-semibold uppercase tracking-wider">KAYNAK</div>
                                        <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{sourceGuild?.name || "Yükleniyor..."}</div>
                                    </div>
                                </div>

                                {/* Arrow Connector */}
                                <div className="absolute left-9 top-[4.5rem] w-0.5 h-6 bg-gray-200 dark:bg-gray-700 z-0"></div>
                                <div className="absolute left-7 top-[5.5rem] z-10 bg-white dark:bg-[#111] p-1 rounded-full border border-gray-200 dark:border-gray-700 text-gray-400">
                                    <ArrowRight size={14} />
                                </div>

                                {/* Target Selector */}
                                <div
                                    onClick={() => setIsTargetSelectorOpen(!isTargetSelectorOpen)}
                                    className={`flex items-center space-x-3 p-3 rounded-lg border cursor-pointer transition-all hover:shadow-md ${targetGuild ? 'border-emerald-200 dark:border-emerald-500/20 bg-emerald-50/30 dark:bg-emerald-500/10' : 'border-dashed border-gray-300 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-500/50 bg-gray-50 dark:bg-white/5'}`}
                                >
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${targetGuild ? 'bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400' : 'bg-gray-200 dark:bg-white/10 text-gray-400 dark:text-gray-500'}`}>
                                        {targetGuild ? <ServerIcon size={20} /> : <AlertCircle size={20} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-xs font-semibold uppercase tracking-wider ${targetGuild ? 'text-emerald-500 dark:text-emerald-400' : 'text-gray-400 dark:text-gray-500'}`}>HEDEF</div>
                                        {targetGuild ? (
                                            <div className="text-sm font-medium text-gray-900 dark:text-white truncate">{targetGuild.name}</div>
                                        ) : (
                                            <div className="text-sm text-gray-500 dark:text-gray-400">Hedef Sunucuyu Seçin</div>
                                        )}
                                    </div>
                                    <ChevronRight size={16} className="text-gray-400" />
                                </div>

                                {/* Target Selection Dropdown */}
                                <AnimatePresence>
                                    {isTargetSelectorOpen && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1a1a1a] rounded-xl border border-gray-200 dark:border-white/10 shadow-xl z-20 max-h-60 overflow-y-auto"
                                        >
                                            <div className="p-2 sticky top-0 bg-white dark:bg-[#1a1a1a] border-b border-gray-100 dark:border-white/5">
                                                <Input
                                                    placeholder="Sunucu ara..."
                                                    className="h-8 text-xs bg-gray-50 dark:bg-white/5 border-gray-200 dark:border-white/10 text-black dark:text-white"
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                />
                                            </div>
                                            <div className="p-4 bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/5 text-center">
                                                <p className="text-xs text-gray-500">
                                                    Seçili Botlar: <span className="font-bold text-red-500">{selectedBots.length}</span>
                                                </p>
                                            </div>
                                            <div className="p-1">
                                                {userGuilds
                                                    .filter(g => g.id !== sourceGuildId)
                                                    .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                                    .map(guild => (
                                                        <div
                                                            key={guild.id}
                                                            onClick={() => { setTargetGuild(guild); setIsTargetSelectorOpen(false); }}
                                                            className="flex items-center space-x-2 p-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors"
                                                        >
                                                            <div className="w-8 h-8 rounded bg-gray-200 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 overflow-hidden shrink-0">
                                                                {guild.icon ? (
                                                                    <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} alt={guild.name} className="w-full h-full object-cover" />
                                                                ) : (
                                                                    <span className="text-xs font-bold">{guild.name.substring(0, 2)}</span>
                                                                )}
                                                            </div>
                                                            <span className="text-sm text-gray-700 dark:text-gray-200 truncate">{guild.name}</span>
                                                        </div>
                                                    ))}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Options Card */}
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden">
                            <div className="p-4 bg-gray-50 dark:bg-white/5 border-b border-gray-100 dark:border-white/5 font-medium text-gray-700 dark:text-gray-200 flex items-center justify-between">
                                <div className="flex items-center"><Settings size={16} className="mr-2 text-red-500 dark:text-red-400" /> Kopyalama Ayarları</div>
                            </div>
                            <div className="p-2">
                                <OptionItem icon={<Hash size={16} />} label="Kanallar" desc="Metin ve ses kanalları" checked={options.channels} onClick={() => toggleOption('channels')} />
                                <OptionItem icon={<Shield size={16} />} label="Roller" desc="İsimler, renkler ve izinler" checked={options.roles} onClick={() => toggleOption('roles')} />
                                <OptionItem icon={<Folder size={16} />} label="Kategoriler" desc="Kanal düzeni ve yapısı" checked={options.categories} onClick={() => toggleOption('categories')} />
                                <OptionItem icon={<Mic size={16} />} label="Emojiler" desc="Sunucu emojileri" checked={options.emojis} onClick={() => toggleOption('emojis')} />
                                <div className="my-1 h-px bg-gray-100 dark:bg-white/10" />
                                <OptionItem icon={<Bot size={16} />} label="Botlar" desc="Bot davet linklerini oluştur" checked={options.bots} onClick={() => toggleOption('bots')} />
                                <div className="my-1 h-px bg-gray-100 dark:bg-white/10" />
                                <OptionItem icon={<AlertCircle size={16} />} label="Temizle" desc="Hedefteki her şeyi sil" checked={options.deleteExisting} onClick={() => toggleOption('deleteExisting')} danger />

                                <AnimatePresence>
                                    {options.deleteExisting && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="overflow-hidden ml-8 border-l-2 border-red-200 dark:border-red-900/50 pl-4 space-y-2 my-2"
                                        >
                                            <div className="text-xs text-red-500 font-medium mb-1 uppercase tracking-wider">Silinecekler:</div>
                                            <div
                                                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-red-500"
                                                onClick={() => setDeleteOptions(p => ({ ...p, channels: !p.channels }))}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${deleteOptions.channels ? 'bg-red-500 border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {deleteOptions.channels && <Check size={10} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span>Kanallar</span>
                                            </div>
                                            <div
                                                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-red-500"
                                                onClick={() => setDeleteOptions(p => ({ ...p, roles: !p.roles }))}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${deleteOptions.roles ? 'bg-red-500 border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {deleteOptions.roles && <Check size={10} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span>Roller</span>
                                            </div>
                                            <div
                                                className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400 cursor-pointer hover:text-red-500"
                                                onClick={() => setDeleteOptions(p => ({ ...p, emojis: !p.emojis }))}
                                            >
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${deleteOptions.emojis ? 'bg-red-500 border-red-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                                    {deleteOptions.emojis && <Check size={10} className="text-white" strokeWidth={4} />}
                                                </div>
                                                <span>Emojiler</span>
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <Button
                            size="lg"
                            className="w-full bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-500 shadow-lg shadow-red-200 dark:shadow-red-900/20 text-white font-semibold py-6 text-base"
                            onClick={startCloning}
                            disabled={!targetGuild || analyzing}
                        >
                            {analyzing ? "Analiz Ediliyor..." : "Kopyalamayı Başlat"} <Play size={18} className="ml-2 fill-current" />
                        </Button>
                    </div>

                    {/* RIGHT: Preview Panel */}
                    <div className="lg:col-span-8">
                        <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm overflow-hidden h-full min-h-[500px] flex flex-col">
                            <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between bg-gray-50 dark:bg-white/5">
                                <div className="flex items-center space-x-2">
                                    <FileCode size={18} className="text-gray-500 dark:text-gray-400" />
                                    <span className="font-semibold text-gray-700 dark:text-gray-200">Sunucu Önizlemesi</span>
                                </div>
                                <div className="flex space-x-1 text-[10px] font-mono">
                                    <span className="px-2 py-1 bg-gray-200 dark:bg-white/10 rounded text-gray-600 dark:text-gray-400">READ-ONLY</span>
                                </div>
                            </div>

                            <div className="flex-1 p-6 bg-slate-50 dark:bg-[#0a0a0a] overflow-y-auto font-mono text-sm custom-scrollbar">
                                {analyzing ? (
                                    <div className="h-full flex flex-col items-center justify-center space-y-4 text-gray-400">
                                        <RefreshCw className="animate-spin w-8 h-8 text-red-400" />
                                        <p>Sunucu yapısı analiz ediliyor...</p>
                                    </div>
                                ) : previewData ? (
                                    <div className="space-y-8">
                                        {/* Channels Tree */}
                                        <section>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                                <Hash size={12} className="mr-1" /> Kanallar & Kategoriler
                                            </h3>
                                            <div className="space-y-1 ml-2 border-l-2 border-gray-200 dark:border-gray-800 pl-4">
                                                {previewData.channels.map((cat, i) => (
                                                    <div key={i} className="mb-4">
                                                        <div className="flex items-center text-gray-700 dark:text-gray-300 font-bold mb-1">
                                                            <FolderOpen size={14} className="mr-2 text-red-400" />
                                                            {cat.name.toUpperCase()}
                                                        </div>
                                                        <div className="ml-5 space-y-1">
                                                            {cat.children?.map((child, j) => (
                                                                <div key={j} className="flex items-center text-gray-500 dark:text-gray-500">
                                                                    <span className="text-gray-300 dark:text-gray-700 mr-2">├─</span>
                                                                    <Hash size={12} className="mr-1.5 opacity-50" />
                                                                    {child}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Roles List */}
                                        <section>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                                <Shield size={12} className="mr-1" /> Roller ({previewData.roles.length})
                                            </h3>
                                            <div className="flex flex-wrap gap-2">
                                                {previewData.roles.map((role, i) => (
                                                    <div
                                                        key={i}
                                                        className="flex items-center px-2 py-1 rounded bg-white dark:bg-[#1a1a1a] border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 text-xs shadow-sm"
                                                        style={{ borderLeftColor: role.color, borderLeftWidth: '3px' }}
                                                    >
                                                        <div className="w-2 h-2 rounded-full mr-2" style={{ backgroundColor: role.color }} />
                                                        {role.name}
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Emojis Grid */}
                                        <section>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center">
                                                <Mic size={12} className="mr-1" /> Emojiler ({previewData.emojis.length})
                                            </h3>
                                            <div className="grid grid-cols-8 gap-2">
                                                {previewData.emojis.map((emoji, i) => (
                                                    <div key={i} className="group relative w-8 h-8 cursor-help">
                                                        <img src={emoji.url} alt={emoji.name} className="w-full h-full object-contain" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black text-white text-[10px] rounded opacity-0 group-hover:opacity-100 whitespace-nowrap z-10 pointer-events-none">
                                                            {emoji.name}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </section>

                                        {/* Bots List (Interactive) */}
                                        <section>
                                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3 flex items-center justify-between">
                                                <div className="flex items-center">
                                                    <Bot size={12} className="mr-1" /> Botlar ({previewData.bots?.length || 0})
                                                </div>
                                                {options.bots && previewData.bots && previewData.bots.length > 0 && (
                                                    <div className="flex space-x-2">
                                                        <button
                                                            onClick={() => setSelectedBots(previewData.bots ? previewData.bots.map(b => b.id) : [])}
                                                            className="text-[10px] text-red-400 hover:text-red-300"
                                                        >
                                                            Hepsini Seç
                                                        </button>
                                                        <button
                                                            onClick={() => setSelectedBots([])}
                                                            className="text-[10px] text-red-400 hover:text-red-300"
                                                        >
                                                            Temizle
                                                        </button>
                                                    </div>
                                                )}
                                            </h3>

                                            {!options.bots ? (
                                                <div className="p-4 rounded-lg bg-gray-100 dark:bg-white/5 text-center text-sm text-gray-500">
                                                    Bot kopyalama kapalı.
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                    {previewData.bots && previewData.bots.map((bot, i) => {
                                                        const isSelected = selectedBots.includes(bot.id);
                                                        return (
                                                            <div
                                                                key={bot.id}
                                                                onClick={() => {
                                                                    if (isSelected) setSelectedBots(prev => prev.filter(id => id !== bot.id));
                                                                    else setSelectedBots(prev => [...prev, bot.id]);
                                                                }}
                                                                className={`flex items-center p-2 rounded-lg border cursor-pointer transition-all ${isSelected
                                                                    ? 'bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30'
                                                                    : 'bg-white dark:bg-[#1a1a1a] border-gray-200 dark:border-white/10 hover:border-red-300'
                                                                    }`}
                                                            >
                                                                <div className={`w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors ${selectedBots.includes(bot.id)
                                                                    ? 'bg-red-500 border-red-500'
                                                                    : 'border-gray-300 dark:border-gray-600'
                                                                    }`}>
                                                                    {selectedBots.includes(bot.id) && <Check size={10} className="text-white" />}
                                                                </div>    <img src={bot.avatar} alt={bot.username} className="w-8 h-8 rounded-full mr-3" />
                                                                <span className={`text-sm font-medium truncate ${isSelected ? 'text-red-900 dark:text-red-300' : 'text-gray-700 dark:text-gray-300'}`}>
                                                                    {bot.username}
                                                                </span>
                                                            </div>
                                                        )
                                                    })}
                                                    {(!previewData.bots || previewData.bots.length === 0) && (
                                                        <div className="col-span-full text-center text-gray-500 text-sm py-4">Bu sunucuda bot bulunamadı.</div>
                                                    )}
                                                </div>
                                            )}
                                        </section>
                                    </div>
                                ) : (
                                    <div className="text-red-500">Veri yüklenemedi.</div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* --- STEP 2 & 3: Execution Log (Terminal Style) --- */}
            {(step === 2 || step === 3) && (
                <div className="max-w-4xl mx-auto">
                    <div className="bg-[#0c0c0c] rounded-xl border border-gray-800 shadow-2xl overflow-hidden font-mono">
                        <div className="flex items-center justify-between px-4 py-3 bg-[#111] border-b border-gray-800">
                            <div className="flex items-center space-x-2">
                                <div className="flex space-x-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-amber-500/80" />
                                    <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
                                </div>
                                <span className="text-gray-500 text-xs ml-3">kynarix_cloner.exe</span>
                            </div>
                            <div className="text-xs text-gray-600">{logs.length} satır</div>
                        </div>

                        <div className="p-6 h-[500px] overflow-y-auto space-y-2 custom-scrollbar">
                            {logs.map((log, i) => (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    key={i}
                                    className="flex items-start space-x-3 text-sm"
                                >
                                    <span className="text-gray-600 select-none">[{log.timestamp}]</span>
                                    <span className={`
                                    ${log.type === 'info' ? 'text-blue-400' : ''}
                                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                                    ${log.type === 'warning' ? 'text-amber-400' : ''}
                                    ${log.type === 'error' ? 'text-red-400' : ''}
                                    ${log.type === 'process' ? 'text-gray-300' : ''}
                                `}>
                                        {log.type === 'process' && <span className="inline-block w-4 animate-pulse mr-1">➜</span>}
                                        {log.type === 'success' && <span className="inline-block w-4 mr-1">✓</span>}
                                        {log.msg}
                                    </span>
                                </motion.div>
                            ))}
                        </div>

                        {step === 3 && (
                            <div className="p-4 bg-[#111] border-t border-gray-800 flex justify-end">
                                <Button variant="outline" className="text-white border-gray-700 hover:bg-gray-800" onClick={() => router.push('/dashboard')}>
                                    Ana Menüye Dön
                                </Button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}

function OptionItem({ icon, label, desc, checked, onClick, danger = false }: any) {
    return (
        <div
            onClick={onClick}
            className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border ${checked
                ? (danger ? "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30" : "bg-red-50 dark:bg-red-500/10 border-red-200 dark:border-red-500/30")
                : "hover:bg-gray-50 dark:hover:bg-white/5 border-transparent"
                }`}
        >
            <div className="flex items-center space-x-3">
                <div className={`${checked ? (danger ? 'text-red-600 dark:text-red-400' : 'text-red-600 dark:text-red-400') : 'text-gray-400'}`}>
                    {icon}
                </div>
                <div>
                    <div className={`text-sm font-semibold ${checked ? (danger ? 'text-red-900 dark:text-red-400' : 'text-red-900 dark:text-red-400') : 'text-gray-700 dark:text-gray-300'}`}>
                        {label}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-500">{desc}</div>
                </div>
            </div>
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${checked
                ? (danger ? 'bg-red-500 border-red-500 text-white' : 'bg-red-600 border-red-600 text-white')
                : 'border-gray-300 dark:border-gray-600'
                }`}>
                {checked && <Check size={12} strokeWidth={3} />}
            </div>
        </div>
    )
}
