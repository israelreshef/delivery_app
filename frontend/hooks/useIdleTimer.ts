"use client"
import { useEffect, useRef } from "react"
import { useRouter } from "next/navigation"

/**
 * Fix 16: Admin Inactivity Timeout
 * Logs out the admin after `timeoutMinutes` of inactivity.
 * Shows a 1-minute warning alert before logging out.
 */
export function useIdleTimer(timeoutMinutes: number = 15) {
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout>>()
  const warningRef = useRef<ReturnType<typeof setTimeout>>()

  const reset = () => {
    clearTimeout(timerRef.current)
    clearTimeout(warningRef.current)

    // Warning: 1 minute before logout
    warningRef.current = setTimeout(() => {
      alert("⚠️ תנותק בעוד דקה עקב חוסר פעילות")
    }, (timeoutMinutes - 1) * 60 * 1000)

    // Auto-logout
    timerRef.current = setTimeout(() => {
      localStorage.removeItem("admin_token")
      sessionStorage.clear()
      router.push("/admin/login?reason=timeout")
    }, timeoutMinutes * 60 * 1000)
  }

  useEffect(() => {
    const events: string[] = ["mousemove", "keydown", "click", "scroll", "touchstart"]
    events.forEach((e) => window.addEventListener(e, reset))
    reset() // start timer on mount

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset))
      clearTimeout(timerRef.current)
      clearTimeout(warningRef.current)
    }
  }, [])
}
