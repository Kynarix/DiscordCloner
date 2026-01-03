"use client"

import { Settings as SettingsIcon, Shield, Bell, Key, Moon, Volume2, User, Github, Zap } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { useSound } from "@/components/sound-provider";

export default function SettingsPage() {
    const { theme, setTheme } = useTheme();
    const { isSoundEnabled, toggleSound } = useSound();

    return (
        <div className="space-y-6">
            <div className="flex items-center space-x-4">
                <div className="p-3 bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 shadow-sm">
                    <SettingsIcon className="text-red-600 dark:text-red-400" size={24} />
                </div>
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Ayarlar</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Uygulama ve hesap ayarlarını yapılandır.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Genel Ayarlar */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <Shield className="text-red-500" size={20} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Genel Ayarlar</h3>
                    </div>

                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                                <Moon size={18} className="text-gray-400" />
                                <span className="text-sm text-gray-600 dark:text-gray-400">Otomatik Karanlık Mod</span>
                            </div>
                            <button
                                onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                className={`w-12 h-7 rounded-full relative transition-colors duration-200 ease-in-out focus:outline-none ${theme === 'dark' ? 'bg-red-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                            >
                                <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-transform duration-200 shadow-sm ${theme === 'dark' ? 'translate-x-[22px]' : 'translate-x-1'}`}></div>
                            </button>
                        </div>
                    </div>
                </div>

                {/* API Ayarları */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-6">
                    <div className="flex items-center space-x-3 mb-2">
                        <Key className="text-red-500" size={20} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">API Ayarları</h3>
                    </div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        Şu anki oturum için kullanılan token güvenli bir şekilde saklanmaktadır.
                    </p>
                    <div className="p-3 bg-gray-50 dark:bg-white/5 rounded-lg border border-gray-100 dark:border-white/5">
                        <code className="text-xs text-gray-600 dark:text-gray-400 font-mono break-all">
                            ************************************************
                        </code>
                    </div>
                </div>

                {/* Hakkımda */}
                <div className="bg-white dark:bg-[#111] rounded-xl border border-gray-200 dark:border-white/10 p-6 space-y-6 md:col-span-2">
                    <div className="flex items-center space-x-3 mb-2">
                        <User className="text-red-500" size={20} />
                        <h3 className="font-semibold text-gray-900 dark:text-white">Hakkımda</h3>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center space-x-4">
                            <div className="p-2 bg-[#5865F2]/10 rounded-lg">
                                <svg width="24" height="24" viewBox="0 0 127.14 96.36" className="fill-[#5865F2]">
                                    <path d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.09,105.09,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.11,77.11,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.89,105.89,0,0,0,126.6,80.22c1.24-18.87-2.09-36.9-18.9-72.15ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,54,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.23,53,91.1,65.69,84.69,65.69Z" />
                                </svg>
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">Discord</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">kynarix.</p>
                            </div>
                        </div>
                        <a href="https://github.com/kynarix" target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center space-x-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group">
                            <div className="p-2 bg-black/10 dark:bg-white/10 rounded-lg group-hover:bg-black/20 dark:group-hover:bg-white/20 transition-colors">
                                <Github className="text-gray-900 dark:text-white" size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">GitHub</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">github.com/kynarix</p>
                            </div>
                        </a>
                        <a href="https://cheatglobal.com/members/twixx.64436/" target="_blank" rel="noopener noreferrer" className="p-4 bg-gray-50 dark:bg-white/5 rounded-xl border border-gray-100 dark:border-white/5 flex items-center space-x-4 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors cursor-pointer group sm:col-span-2">
                            <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg group-hover:bg-red-200 dark:group-hover:bg-red-900/30 transition-colors">
                                <Zap className="text-red-500" size={24} />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">CheatGlobal</p>
                                <p className="text-sm font-bold text-gray-900 dark:text-white">cheatglobal.com/members/twixx.64436</p>
                            </div>
                        </a>
                    </div>
                </div>
            </div>
        </div>
    )
}
