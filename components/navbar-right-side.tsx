"use client"

import { UserDropdown } from "./user-dropdown";

export function NavbarRightSide({ user }: { user: any }) {

    const toggleTheme = () => {
        document.documentElement.classList.toggle('dark');
    }

    return (
        <div className="flex items-center space-x-3">
            <button
                onClick={toggleTheme}
                className="p-2 rounded-full text-gray-400 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
                title="Temayı Değiştir"
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-moon dark:hidden">
                    <path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z" />
                </svg>
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-sun hidden dark:block">
                    <circle cx="12" cy="12" r="4" />
                    <path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41-1.41" /><path d="m19.07 4.93-1.41 1.41" />
                </svg>
            </button>

            {user ? (
                <UserDropdown user={user} />
            ) : (
                <div className="w-8 h-8 rounded-full bg-red-100 dark:bg-red-500/20 flex items-center justify-center text-red-600 dark:text-red-400 font-medium text-xs ring-2 ring-white dark:ring-white/10 shadow-sm animate-pulse">
                    ...
                </div>
            )}
        </div>
    )
}
