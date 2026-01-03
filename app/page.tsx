"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { motion } from "framer-motion"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Disc, Lock, ArrowRight, Loader2 } from "lucide-react"

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
          <div className="p-3 rounded-full bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Disc size={32} />
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
                className="pl-10 h-12 bg-gray-50 dark:bg-black/20 border-gray-200 dark:border-white/10 focus:bg-white dark:focus:bg-black/40 text-gray-900 dark:text-white transition-all"
                value={token}
                onChange={(e) => setToken(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="submit"
            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-600 dark:hover:bg-indigo-500 text-white font-medium transition-all"
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
