import Link from "next/link";
import { cookies } from "next/headers";
import { DiscordService } from "@/lib/discord-service";
import { NavbarRightSide } from "@/components/navbar-right-side";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    // 1. Get Token & Fetch User
    const cookieStore = await cookies();
    const token = cookieStore.get("discord_token")?.value;
    let user = null;

    if (token) {
        const discord = new DiscordService(token);
        try {
            user = await discord.getUser();
        } catch (e) {
            console.error("Failed to fetch user in layout", e);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-[#0a0a0a] flex flex-col transition-colors duration-200">
            {/* Google-like minimal Navbar */}
            <header className="bg-white dark:bg-[#0a0a0a] border-b border-gray-200 dark:border-white/5 sticky top-0 z-50">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    <Link href="/dashboard" className="flex items-center space-x-2 text-gray-900 dark:text-white hover:text-red-600 dark:hover:text-red-400 transition-colors">
                        <div className="relative group">
                            <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-orange-600 rounded-lg blur opacity-25 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
                            <div className="relative p-1.5 bg-white dark:bg-[#0a0a0a] ring-1 ring-gray-900/5 dark:ring-white/10 rounded-lg leading-none flex items-center justify-center">
                                <span className="font-bold text-transparent bg-clip-text bg-gradient-to-r from-red-600 to-orange-600 text-xl leading-none px-1 select-none">
                                    K
                                </span>
                            </div>
                        </div>
                        <span className="font-semibold tracking-tight text-lg">Twixx Cloner</span>
                    </Link>

                    <div className="flex items-center space-x-6">
                        <nav className="hidden md:flex items-center space-x-6 text-sm font-medium text-gray-600 dark:text-gray-400">
                            <Link href="/dashboard" className="hover:text-gray-900 dark:hover:text-white transition-colors">Sunucular</Link>
                            <Link href="/dashboard/backups" className="hover:text-gray-900 dark:hover:text-white transition-colors">Yedekler</Link>
                            <Link href="/dashboard/settings" className="hover:text-gray-900 dark:hover:text-white transition-colors">Ayarlar</Link>
                        </nav>
                        <div className="flex items-center space-x-3 pl-6 border-l border-gray-100 dark:border-white/5">
                            {/* Client Component for Interactive Right Side (Theme Toggle + User Dropdown) */}
                            <NavbarRightSide user={user} />
                        </div>
                    </div>
                </div>
            </header>

            <main className="flex-1 container mx-auto px-4 py-8">
                {children}
            </main>

            {/* Footer removed as requested */}
        </div>
    )
}
