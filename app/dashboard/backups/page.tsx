"use client"

import { Archive, Download, Loader2, X, Search, Server, Trash2, RefreshCcw, FileJson } from "lucide-react";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface Guild {
    id: string;
    name: string;
    icon: string | null;
}

interface BackupMeta {
    filename: string;
    name: string; // Server name
    id: string;   // Server ID
    icon: string | null;
    date: string;
    version: string;
    channelCount?: number;
    roleCount?: number;
}

export default function BackupsPage() {
    const router = useRouter();
    const [pageLoading, setPageLoading] = useState(true);
    const [backups, setBackups] = useState<BackupMeta[]>([]);

    // Create Backup Modal State
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [guilds, setGuilds] = useState<Guild[]>([]);
    const [guildsLoading, setGuildsLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [creatingBackupId, setCreatingBackupId] = useState<string | null>(null);

    // Initial Load
    useEffect(() => {
        fetchBackups();
    }, []);

    const fetchBackups = async () => {
        setPageLoading(true);
        try {
            const res = await fetch("/api/backups");
            const data = await res.json();
            if (data.backups) {
                setBackups(data.backups);
            }
        } catch (error) {
            console.error("Failed to fetch backups", error);
        } finally {
            setPageLoading(false);
        }
    };

    const openCreateModal = () => {
        setIsCreateModalOpen(true);
        if (guilds.length === 0) {
            setGuildsLoading(true);
            fetch("/api/guilds")
                .then(res => res.json())
                .then(data => {
                    const guildList = Array.isArray(data) ? data : (data.guilds || []);
                    if (Array.isArray(guildList)) setGuilds(guildList);
                    else setGuilds([]);
                })
                .catch(console.error)
                .finally(() => setGuildsLoading(false));
        }
    };

    const handleCreateBackup = async (guild: Guild) => {
        setCreatingBackupId(guild.id);
        try {
            const res = await fetch("/api/backups", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ guildId: guild.id })
            });

            if (res.ok) {
                // Success
                setIsCreateModalOpen(false);
                fetchBackups(); // Refresh list
            } else {
                alert("Yedek oluşturulamadı.");
            }
        } catch (e) {
            console.error(e);
            alert("Bir hata oluştu.");
        } finally {
            setCreatingBackupId(null);
        }
    };

    const handleDeleteBackup = async (filename: string) => {
        if (!confirm("Bu yedeği silmek istediğine emin misin?")) return;

        try {
            const res = await fetch(`/api/backups/${filename}`, {
                method: "DELETE" // Now we have this endpoint
            });

            if (res.ok) {
                // Remove locally to feel instant
                setBackups(prev => prev.filter(b => b.filename !== filename));
            } else {
                alert("Silme işlemi başarısız oldu.");
            }
        } catch (e) {
            console.error(e);
            alert("Bir hata oluştu.");
        }
    };

    const handleRestoreClick = (backup: BackupMeta) => {
        // Redirect to the detailed restore wizard page
        router.push(`/dashboard/backups/restore/${backup.filename}`);
    };

    const [importing, setImporting] = useState(false);

    const handleImportClick = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e: any) => {
            const file = e.target.files[0];
            if (!file) return;

            setImporting(true);
            const formData = new FormData();
            formData.append('file', file);

            try {
                const res = await fetch('/api/backups/import', {
                    method: 'POST',
                    body: formData
                });
                const data = await res.json();

                if (res.ok) {
                    alert('Yedek başarıyla içe aktarıldı! ✅');
                    fetchBackups();
                } else {
                    alert('Hata: ' + data.error);
                }
            } catch (err) {
                console.error(err);
                alert('Yükleme sırasında bir hata oluştu.');
            } finally {
                setImporting(false);
            }
        };
        input.click();
    };



    return (
        <div className="space-y-6 relative pb-20">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                        <Archive className="text-red-600 dark:text-red-400" size={24} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Yedekler</h1>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Sunucu yedeklerini buradan yönetebilirsin.</p>
                    </div>
                </div>
                <div className="flex space-x-3">
                    <button
                        onClick={handleImportClick}
                        disabled={importing}
                        className="px-4 py-2 bg-white dark:bg-white/5 hover:bg-gray-50 dark:hover:bg-white/10 text-gray-700 dark:text-white border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium transition-colors inline-flex items-center shadow-sm"
                    >
                        {importing ? <Loader2 size={16} className="animate-spin mr-2" /> : <Download size={16} className="mr-2 rotate-180" />}
                        İçe Aktar
                    </button>
                    <button
                        onClick={openCreateModal}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors inline-flex items-center shadow-sm"
                    >
                        <Download size={16} className="mr-2" />
                        Yeni Yedek Oluştur
                    </button>
                </div>
            </div>

            {/* Content */}
            {pageLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-red-500" /></div>
            ) : backups.length === 0 ? (
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-12 text-center">
                    <div className="mx-auto w-16 h-16 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mb-4">
                        <Archive className="text-gray-400" size={32} />
                    </div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Henüz yedek yok</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-sm mx-auto">
                        Sunucularının yedeğini alarak verilerini güvenle saklayabilirsin.
                    </p>
                    <div className="flex justify-center space-x-3">
                        <button
                            onClick={handleImportClick}
                            className="px-4 py-2 bg-white dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-lg text-sm font-medium hover:bg-gray-50 dark:hover:bg-white/10 transition-colors"
                        >
                            Yedek Yükle
                        </button>
                        <button
                            onClick={openCreateModal}
                            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium transition-colors"
                        >
                            Yedek Oluştur
                        </button>
                    </div>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {backups.map((backup) => (
                        <div key={backup.filename} className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-4 transition-all hover:border-red-500/50 hover:shadow-md group">
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                        {backup.icon ? (
                                            <img src={`https://cdn.discordapp.com/icons/${backup.id}/${backup.icon}.png`} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{backup.name.substring(0, 2)}</span>
                                        )}
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{format(new Date(backup.date), 'dd MMM yyyy HH:mm', { locale: tr })}</p>
                                        <div className="flex gap-2 mt-1.5">
                                            <span className="px-2 py-0.5 bg-green-100 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-[10px] rounded-full font-medium">
                                                {backup.channelCount ?? 0} Kanal
                                            </span>
                                            <span className="px-2 py-0.5 bg-blue-100 dark:bg-blue-500/10 text-blue-700 dark:text-blue-400 text-[10px] rounded-full font-medium">
                                                {backup.roleCount ?? 0} Rol
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-1.5 bg-gray-50 dark:bg-white/5 rounded-lg">
                                    <FileJson size={16} className="text-gray-400" />
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 mt-4 pt-4 border-t border-gray-100 dark:border-white/5">
                                <button
                                    onClick={() => handleRestoreClick(backup)}
                                    className="flex-1 flex items-center justify-center space-x-2 px-3 py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors cursor-pointer"
                                >
                                    <RefreshCcw size={14} />
                                    <span>Geri Yükle</span>
                                </button>
                                <button
                                    onClick={() => handleDeleteBackup(backup.filename)}
                                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors cursor-pointer"
                                    title="Sil"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Backup Modal */}
            {isCreateModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-[#111] w-full max-w-lg rounded-2xl shadow-2xl border border-gray-200 dark:border-white/10 max-h-[80vh] flex flex-col animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-4 border-b border-gray-100 dark:border-white/5 flex items-center justify-between">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-white">Yedeklenecek Sunucuyu Seç</h3>
                                <p className="text-xs text-gray-500 dark:text-gray-400">Yedek dosyası proje klasörüne kaydedilecek.</p>
                            </div>
                            <button onClick={() => setIsCreateModalOpen(false)} className="text-gray-400 hover:text-gray-900 dark:hover:text-white cursor-pointer">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-4 border-b border-gray-100 dark:border-white/5 bg-gray-50 dark:bg-white/5">
                            <div className="relative">
                                <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                                <Input
                                    placeholder="Sunucu ara..."
                                    className="pl-9 h-9 bg-white dark:bg-black/20 border-gray-200 dark:border-white/10 text-gray-900 dark:text-white"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {guildsLoading ? (
                                <div className="flex justify-center p-8 text-red-600"><Loader2 className="animate-spin" /></div>
                            ) : (
                                guilds
                                    .filter(g => g.name.toLowerCase().includes(searchQuery.toLowerCase()))
                                    .map(guild => (
                                        <div key={guild.id} className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-white/5 rounded-xl transition-colors group">
                                            <div className="flex items-center space-x-3">
                                                <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                                                    {guild.icon ? (
                                                        <img src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <span className="text-sm font-bold text-gray-500 dark:text-gray-400">{guild.name.substring(0, 2)}</span>
                                                    )}
                                                </div>
                                                <span className="font-medium text-gray-700 dark:text-gray-200 text-sm truncate max-w-[200px]">{guild.name}</span>
                                            </div>
                                            <button
                                                onClick={() => handleCreateBackup(guild)}
                                                disabled={!!creatingBackupId}
                                                className="px-3 py-1.5 text-xs font-medium bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors cursor-pointer"
                                            >
                                                {creatingBackupId === guild.id ? <Loader2 size={14} className="animate-spin" /> : 'Yedekle'}
                                            </button>
                                        </div>
                                    ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
