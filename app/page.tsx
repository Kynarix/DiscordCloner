"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Crown, Lock, ArrowRight, Loader2 } from "lucide-react"

export default function LoginPage() {
  const [token, setToken] = useState("")
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        body: JSON.stringify({ token }),
        headers: { "Content-Type": "application/json" },
      })

      if (res.ok) {
        router.push("/dashboard")
      } else {
        alert("Giriş başarısız. Tokeni kontrol et.")
        setLoading(false)
      }
    } catch (err) {
      console.error(err)
      setLoading(false)
    }
  }

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50/50 dark:bg-[#0a0a0a] transition-colors duration-200">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 space-y-6 bg-white dark:bg-[#111] rounded-2xl shadow-xl border border-gray-100 dark:border-white/5"
      >
        <div className="flex flex-col items-center space-y-2 text-center">
          <div className="p-3 rounded-full bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400">
            <Crown size={32} />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">Twixx Cloner</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Discord sunucularını saniyeler içinde kopyala. <br />
            <span className="text-xs text-gray-400 dark:text-gray-600">Tokeniniz sadece bu oturumda kullanılır.</span>
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-2">
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
              <Input
                placeholder="Discord Token"
                type="password"
                className="pl-10 h-12 bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 text-gray-900 dark:text-white transition-all focus:ring-red-500/20 focus:border-red-500/50"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-medium transition-all shadow-lg shadow-red-500/20"
            disabled={loading || !token}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <>
                Giriş Yap <ArrowRight className="ml-2 h-4 w-4" />
              </>
            )}
          </Button>
        </form>

        <div className="pt-4 text-center text-xs text-gray-400 dark:text-gray-600">
          by Twixx &bull; v1.0.0
        </div>
      </motion.div>
    </div>
  )
}
