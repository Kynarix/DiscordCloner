"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, User as UserIcon } from "lucide-react"
import { motion, AnimatePresence } from "framer-motion"

interface User {
    id: string;
    username: string;
    avatar: string | null;
    discriminator: string;
}

export function UserDropdown({ user }: { user: User }) {
    const [isOpen, setIsOpen] = useState(false)
    const router = useRouter()

    const handleLogout = async () => {
        await fetch("/api/auth/logout", { method: "POST" })
        router.push("/")
        router.refresh()
    }

    const avatarUrl = user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center rounded-full ring-2 ring-white dark:ring-white/10 shadow-sm transition-transform hover:scale-105"
            >
                {avatarUrl ? (
                    <img
                        src={avatarUrl}
                        alt={user.username}
                        className="h-8 w-8 rounded-full object-cover"
                    />
                ) : (
                    <div className="h-8 w-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-700 dark:text-red-300 font-bold text-xs">
                        {user.username.substring(0, 1).toUpperCase()}
                    </div>
                )}
            </button>

            <AnimatePresence>
                {isOpen && (
                    <>
                        <div
                            className="fixed inset-0 z-10"
                            onClick={() => setIsOpen(false)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#111] rounded-xl shadow-lg border border-gray-100 dark:border-white/10 z-20 py-1 overflow-hidden"
                        >
                            <div className="px-4 py-3 border-b border-gray-100 dark:border-white/5">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{user.username}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">#{user.discriminator}</p>
                            </div>

                            <button
                                onClick={handleLogout}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center space-x-2 transition-colors"
                            >
                                <LogOut size={14} />
                                <span>Çıkış Yap</span>
                            </button>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    )
}
