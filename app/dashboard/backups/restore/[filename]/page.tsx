"use client"

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Check, ChevronRight, Layout, MessageSquare, Shield, Smile, Play, Server, Loader2, AlertTriangle, Terminal } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface RestoreOption {
    id: string;
    label: string;
    icon: any;
    description: string;
    checked: boolean;
}

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

export default function RestorePage() {
    const params = useParams();
    const router = useRouter();
    const filename = params.filename as string;

    const [loading, setLoading] = useState(true);
    const [backupData, setBackupData] = useState<any>(null);
    const [userGuilds, setUserGuilds] = useState<Guild[]>([]);
    const [targetGuildId, setTargetGuildId] = useState<string>("");

    const [currentStep, setCurrentStep] = useState(1);
    const [logs, setLogs] = useState<string[]>([]);
    const [isRestoring, setIsRestoring] = useState(false);
    const [isFinished, setIsFinished] = useState(false);


    const [options, setOptions] = useState<RestoreOption[]>([
        { id: "channels", label: "Kanallar ve Kategoriler", icon: MessageSquare, description: "Tüm metin ve ses kanallarını yapılandırır.", checked: true },
        { id: "roles", label: "Roller ve İzinler", icon: Shield, description: "Rolleri oluşturur ve hiyerarşiyi ayarlar.", checked: true },
        { id: "emojis", label: "Emojiler", icon: Smile, description: "Sunucu emojilerini yükler.", checked: true },
        { id: "settings", label: "Sunucu Ayarları", icon: Layout, description: "Sunucu adı, ikonu ve bölge ayarları.", checked: false },
        { id: "clean", label: "Önce Temizle", icon: AlertTriangle, description: "Yüklemeden önce hedefteki kanalları ve rolleri siler.", checked: false },
    ]);

    useEffect(() => {
        // Fetch Backup Data and User Guilds
        Promise.all([
            fetch(`/api/backups/${filename}`).then(res => res.json()),
            fetch("/api/guilds").then(res => res.json())
        ]).then(([backup, guildsResponse]) => {
            if (backup.error) {
                alert("Yedek bulunamadı!");
                router.push("/dashboard/backups");
                return;
            }
            setBackupData(backup);

            const list = Array.isArray(guildsResponse) ? guildsResponse : (guildsResponse.guilds || []);
            setUserGuilds(list);
            setLoading(false);
        }).catch(err => {
            console.error(err);
            alert("Veriler yüklenirken hata oluştu.");
            setLoading(false);
        });
    }, [filename]);

    const toggleOption = (id: string) => {
        setOptions(prev => prev.map(opt =>
            opt.id === id ? { ...opt, checked: !opt.checked } : opt
        ));
    };

    const addLog = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
        // Auto-scroll logic would go here
    };

    // Helper to count channels including nested children in categories
    const getChannelCount = (backup: any) => {
        // 1. Direct Flat List (Full Backup)
        if (backup.data?.channels?.length) return backup.data.channels.length;
        if (backup.data?.Channels?.length) return backup.data.Channels.length;

        // 2. Preview Nested List (Imported/Preview Data)
        const preview = backup.data?.preview;
        const channels = preview?.channels || preview?.Channels;

        if (channels && Array.isArray(channels)) {
            return channels.reduce((acc: number, item: any) => {
                // If item has children (it's a category), add children count + 1 (params option for category itself)
                if (item.children && Array.isArray(item.children)) {
                    return acc + 1 + item.children.length;
                }
                return acc + 1;
            }, 0);
        }
        return 0;
    };

    // Helper to count roles
    const getRoleCount = (backup: any) => {
        if (backup.data?.roles?.length) return backup.data.roles.length;
        if (backup.data?.Roles?.length) return backup.data.Roles.length;

        const preview = backup.data?.preview;
        const roles = preview?.roles || preview?.Roles;
        return roles?.length || 0;
    };

    const startRestore = async () => {
        if (!targetGuildId) return;
        setIsRestoring(true);
        setIsFinished(false);
        setCurrentStep(3); // Log view
        setLogs([]); // Clear previous logs

        try {
            const response = await fetch("/api/backups/restore", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    filename,
                    targetGuildId,
                    options: options.filter(o => o.checked).map(o => o.id)
                })
            });

            if (!response.ok) {
                throw new Error("API hatası");
            }

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("Stream başlatılamadı");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n\n");

                for (const line of lines) {
                    if (line.startsWith("data: ")) {
                        try {
                            const data = JSON.parse(line.slice(6));
                            if (data.type === 'log') {
                                addLog(data.message);
                            } else if (data.type === 'error') {
                                addLog(`❌ ${data.message}`);
                            } else if (data.type === 'done') {
                                addLog(`✅ ${data.message}`);
                                setIsRestoring(false);
                                setIsFinished(true);
                            }
                        } catch (e) {
                            console.error("JSON parse error", e);
                        }
                    }
                }
            }

        } catch (e) {
            addLog("❌ Bağlantı hatası veya işlem durduruldu.");
            setIsRestoring(false);
        }
    };

    if (loading) {
        return <div className="flex h-screen items-center justify-center bg-gray-50 dark:bg-[#0a0a0a]"><Loader2 className="animate-spin text-indigo-600" size={32} /></div>;
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] text-gray-900 dark:text-white pb-20">
            {/* Header */}
            <div className="border-b border-gray-200 dark:border-white/10 bg-white dark:bg-[#111] sticky top-0 z-10">
                <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 dark:hover:bg-white/5 rounded-full transition-colors">
                            <ArrowLeft size={20} className="text-gray-500 dark:text-gray-400" />
                        </button>
                        <h1 className="text-lg font-semibold">Yedek Geri Yükleme Sihirbazı</h1>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-6 py-12">

                {/* Steps Indicator */}
                <div className="flex items-center justify-center mb-12 space-x-4">
                    {[1, 2, 3].map((step) => (
                        <div key={step} className="flex items-center">
                            <div className={cn(
                                "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300",
                                currentStep >= step ? "bg-red-600 text-white" : "bg-gray-200 dark:bg-white/10 text-gray-500"
                            )}>
                                {step}
                            </div>
                            {step < 3 && <div className={cn("w-12 h-0.5 mx-2 transition-all duration-300", currentStep > step ? "bg-red-600" : "bg-gray-200 dark:bg-white/10")} />}
                        </div>
                    ))}
                </div>

                {/* Step 1: Configuration */}
                {currentStep === 1 && (
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="grid md:grid-cols-2 gap-8">
                        {/* Source Card */}
                        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Kaynak Yedek</h2>
                            <div className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5">
                                <div className="w-16 h-16 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center flex-shrink-0">
                                    {backupData.meta.icon ? (
                                        <img src={`https://cdn.discordapp.com/icons/${backupData.meta.id}/${backupData.meta.icon}.png`} className="w-full h-full rounded-full object-cover" />
                                    ) : (
                                        <Server className="text-red-600 dark:text-red-400" size={28} />
                                    )}
                                </div>
                                <div>
                                    <h3 className="font-bold text-lg">{backupData.meta.name}</h3>
                                    <p className="text-sm text-gray-500 dark:text-gray-400">Oluşturulma: {new Date(backupData.meta.date).toLocaleDateString()}</p>
                                    <div className="flex gap-2 mt-2">
                                        <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs rounded-full font-medium">
                                            {getChannelCount(backupData)} Kanal
                                        </span>
                                        <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-xs rounded-full font-medium">
                                            {getRoleCount(backupData)} Rol
                                        </span>
                                    </div>
                                    {/* Debug helper: Remove in production or hide if data found */}
                                    {(!backupData.data.channels && !backupData.data.Channels && !backupData.data.preview) && (
                                        <p className="text-xs text-red-400 mt-1">Veri yapısı farklı. ({Object.keys(backupData.data || {}).join(", ")})</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Target Card */}
                        <div className="bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-4 uppercase tracking-wider">Hedef Sunucu</h2>
                            <div className="space-y-4">
                                <p className="text-sm text-gray-500 dark:text-gray-400">Yedeklemek istediğin sunucuyu seç. <strong className="text-red-500">Dikkat: Çakışan veriler üzerine yazılabilir.</strong></p>
                                <select
                                    className="w-full p-3 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl outline-none focus:ring-2 focus:ring-red-500 transition-all dark:text-white"
                                    value={targetGuildId}
                                    onChange={(e) => setTargetGuildId(e.target.value)}
                                >
                                    <option value="" disabled>Bir sunucu seç...</option>
                                    {userGuilds.map(g => (
                                        <option key={g.id} value={g.id}>{g.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        {/* Options */}
                        <div className="md:col-span-2 bg-white dark:bg-[#111] p-6 rounded-2xl border border-gray-200 dark:border-white/10 shadow-sm">
                            <h2 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-6 uppercase tracking-wider">İçerik Seçimi</h2>
                            <div className="grid sm:grid-cols-2 gap-4">
                                {options.map((opt) => (
                                    <div
                                        key={opt.id}
                                        onClick={() => toggleOption(opt.id)}
                                        className={cn(
                                            "flex items-start space-x-4 p-4 rounded-xl border-2 cursor-pointer transition-all duration-200",
                                            opt.checked
                                                ? "border-red-600 bg-red-50 dark:bg-red-900/10"
                                                : "border-gray-200 dark:border-white/5 hover:border-gray-300 dark:hover:border-white/10"
                                        )}
                                    >
                                        <div className={cn(
                                            "w-6 h-6 rounded-md flex items-center justify-center border transition-colors mt-0.5",
                                            opt.checked ? "bg-red-600 border-red-600" : "border-gray-300 dark:border-gray-600"
                                        )}>
                                            {opt.checked && <Check size={14} className="text-white" />}
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2">
                                                <opt.icon size={18} className={opt.checked ? "text-red-600 dark:text-red-400" : "text-gray-400"} />
                                                <h3 className="font-medium">{opt.label}</h3>
                                            </div>
                                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{opt.description}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Action Bar */}
                        <div className="md:col-span-2 flex justify-end pt-4">
                            <button
                                disabled={!targetGuildId}
                                onClick={() => setCurrentStep(2)}
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl font-bold tracking-wide shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center"
                            >
                                Devam Et <ChevronRight className="ml-2" />
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 2: Confirmation */}
                {currentStep === 2 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="max-w-xl mx-auto text-center space-y-8">
                        <div className="w-24 h-24 bg-yellow-100 dark:bg-yellow-500/20 text-yellow-600 dark:text-yellow-400 rounded-full mx-auto flex items-center justify-center mb-6">
                            <AlertTriangle size={48} />
                        </div>

                        <div>
                            <h2 className="text-2xl font-bold mb-2">Geri Yüklemeyi Başlat?</h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                <strong className="text-gray-900 dark:text-white">{backupData.meta.name}</strong> yedeği, <br />
                                <strong className="text-red-600 dark:text-red-400">{userGuilds.find(g => g.id === targetGuildId)?.name}</strong> sunucusuna yüklenecek.
                            </p>
                        </div>

                        <div className="bg-gray-50 dark:bg-white/5 p-4 rounded-xl text-left text-sm space-y-2 border border-yellow-200 dark:border-yellow-500/20">
                            <p className="font-semibold text-yellow-700 dark:text-yellow-500 flex items-center"><Shield size={16} className="mr-2" /> Uyarılar:</p>
                            <ul className="list-disc list-inside text-gray-600 dark:text-gray-400 space-y-1 ml-1">
                                <li>Mevcut rollerin sırası değişebilir.</li>
                                <li>Aynı isme sahip kanallar tekrar oluşturulabilir.</li>
                                <li>Bu işlem <span className="underline decoration-wavy">geri alınamaz</span>.</li>
                            </ul>
                        </div>

                        <div className="flex items-center justify-center space-x-4 pt-4">
                            <button onClick={() => setCurrentStep(1)} className="px-6 py-3 text-gray-500 font-medium hover:text-gray-900 dark:hover:text-white transition-colors">
                                Vazgeç
                            </button>
                            <button
                                onClick={startRestore}
                                className="px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-xl font-bold tracking-wide shadow-lg shadow-red-500/20 transition-all transform hover:scale-105 active:scale-95 flex items-center"
                            >
                                <Play size={18} className="mr-2" />
                                İşlemi Başlat
                            </button>
                        </div>
                    </motion.div>
                )}

                {/* Step 3: Progress Log */}
                {currentStep === 3 && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-black rounded-2xl border border-gray-800 shadow-2xl overflow-hidden font-mono text-sm leading-relaxed p-6 h-[500px] flex flex-col">
                        <div className="flex items-center space-x-2 text-gray-400 border-b border-gray-800 pb-4 mb-4">
                            <Terminal size={16} />
                            <span>System Log</span>
                            {isRestoring && <Loader2 size={14} className="animate-spin ml-auto" />}
                        </div>
                        <div className="flex-1 overflow-y-auto space-y-2 pr-2 custom-scrollbar">
                            {logs.map((log, i) => (
                                <div key={i} className="text-green-400/90 border-l-2 border-transparent hover:border-green-500/50 pl-2 transition-colors">
                                    {log}
                                </div>
                            ))}
                            {isRestoring && (
                                <div className="animate-pulse text-red-400">_</div>
                            )}
                        </div>

                        {isFinished && (
                            <div className="pt-4 mt-2 border-t border-gray-800 flex justify-end">
                                <button
                                    onClick={() => router.push('/dashboard')}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg font-bold shadow-lg shadow-red-500/20 transition-all animate-pulse hover:animate-none flex items-center"
                                >
                                    Ana Sayfaya Dön <ChevronRight size={18} className="ml-2" />
                                </button>
                            </div>
                        )}
                    </motion.div>
                )}
            </div>
        </div>
    )
}
