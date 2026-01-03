"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Search, Server as ServerIcon, Loader2, ArrowRight, Copy } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface Guild {
    id: string;
    name: string;
    icon: string;
    owner: boolean;
    permissions: string;
}

import { useRouter } from "next/navigation"

export default function DashboardPage() {
    const router = useRouter()
    const [guilds, setGuilds] = useState<Guild[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState("")

    useEffect(() => {
        fetch('/api/guilds')
            .then(res => res.json())
            .then(data => {
                if (data.guilds) setGuilds(data.guilds)
                setLoading(false)
            })
            .catch(err => {
                console.error(err)
                setLoading(false)
            })
    }, [])

    const handleCloneClick = (guild: Guild) => {
        router.push(`/cloner/${guild.id}`)
    }

    const filteredGuilds = guilds.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="space-y-8">
            {/* Header Section */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-900 to-gray-600 dark:from-white dark:to-gray-400 bg-clip-text text-transparent">Sunucularım</h2>
                    <p className="text-gray-500 dark:text-gray-400">Kopyalamak istediğin sunucuyu seç.</p>
                </div>
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                        placeholder="Sunucu ara..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white dark:bg-[#111] border-gray-200 dark:border-white/10 focus:ring-red-500/20"
                    />
                </div>
            </div>

            {/* Content Section */}
            {loading ? (
                <div className="flex justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-red-500" />
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredGuilds.map((guild, i) => (
                        <Link key={guild.id} href={`/cloner/${guild.id}`}>
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                whileHover={{ y: -4 }}
                                transition={{ delay: i * 0.05 }}
                                className="group relative bg-white dark:bg-[#111] rounded-2xl border border-gray-200 dark:border-white/10 p-5 shadow-sm hover:shadow-xl hover:shadow-red-500/5 hover:border-red-500/50 transition-all duration-300"
                            >
                                <div className="flex items-center space-x-4">
                                    {guild.icon ? (
                                        <img
                                            src={`https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png`}
                                            alt={guild.name}
                                            className="w-12 h-12 rounded-xl object-cover ring-2 ring-gray-50 dark:ring-white/5 group-hover:ring-red-500 transition-all"
                                        />
                                    ) : (
                                        <div className="w-12 h-12 rounded-xl bg-gray-100 dark:bg-white/10 flex items-center justify-center text-gray-500 dark:text-gray-400 ring-2 ring-gray-50 dark:ring-white/5 group-hover:ring-red-500 transition-all">
                                            <ServerIcon size={20} />
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <h3 className="font-semibold text-gray-900 dark:text-white truncate group-hover:text-red-600 dark:group-hover:text-red-400 transition-colors">
                                            {guild.name}
                                        </h3>
                                        <div className="flex items-center mt-1 space-x-2">
                                            {guild.owner && (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-500">
                                                    Sahip
                                                </span>
                                            )}
                                            <span className="text-xs text-gray-500 dark:text-gray-400">
                                                {guild.permissions}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between mt-2 pt-3 border-t border-gray-50 dark:border-white/5">
                                    <span className="text-xs font-mono text-gray-400 dark:text-gray-500">ID: {guild.id.slice(0, 6)}...</span>
                                    <button
                                        onClick={(e) => {
                                            e.preventDefault();
                                            handleCloneClick(guild);
                                        }}
                                        className="w-full py-2 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-500/20 rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Kopyala
                                    </button>
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </div>
            )}

            {!loading && filteredGuilds.length === 0 && (
                <div className="text-center py-20 bg-white dark:bg-[#111] rounded-2xl border border-dashed border-gray-200 dark:border-white/10">
                    <ServerIcon className="h-10 w-10 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white">Sunucu bulunamadı</h3>
                    <p className="text-gray-500 dark:text-gray-400">Arama kriterlerine uygun sunucu yok.</p>
                </div>
            )}
        </div>
    )
}

