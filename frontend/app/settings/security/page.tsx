"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ShieldCheck, ShieldAlert, Smartphone, Loader2, KeyRound, Copy, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

export default function SecuritySettingsPage() {
    const { user } = useAuth()
    const [loading, setLoading] = useState(false)
    const [statusLoading, setStatusLoading] = useState(true)
    const [is2FAEnabled, setIs2FAEnabled] = useState(false)

    // Setup states
    const [showSetup, setShowSetup] = useState(false)
    const [qrCode, setQrCode] = useState("")
    const [secret, setSecret] = useState("")
    const [verificationCode, setVerificationCode] = useState("")

    useEffect(() => {
        fetchSecurityStatus()
    }, [])

    const fetchSecurityStatus = async () => {
        setStatusLoading(true)
        try {
            // נשלוף את הסטטוס העדכני מהשרת
            const res = await api.get('/auth/me')
            setIs2FAEnabled(res.data.is_two_factor_enabled)
        } catch (error) {
            console.error("Failed to fetch security status")
        } finally {
            setStatusLoading(false)
        }
    }

    const start2FASetup = async () => {
        setLoading(true)
        try {
            const res = await api.post('/auth/2fa/setup')
            setQrCode(res.data.qr_code)
            setSecret(res.data.secret)
            setShowSetup(true)
            toast.info("נא לסרוק את הברקוד באפליקציית Authenticator")
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה בהתחלת הגדרת 2FA")
        } finally {
            setLoading(false)
        }
    }

    const verifyAndEnable = async () => {
        if (verificationCode.length !== 6) {
            toast.error("נא להזין קוד בן 6 ספרות")
            return
        }

        setLoading(true)
        try {
            await api.post('/auth/2fa/verify-and-enable', { code: verificationCode })
            toast.success("אימות דו-שלבי הופעל בהצלחה!")
            setIs2FAEnabled(true)
            setShowSetup(false)
        } catch (error: any) {
            toast.error(error.response?.data?.error || "קוד אימות לא תקין")
        } finally {
            setLoading(false)
        }
    }

    const copySecret = () => {
        navigator.clipboard.writeText(secret)
        toast.success("הקוד הועתק")
    }

    if (statusLoading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        )
    }

    return (
        <div className="container mx-auto py-10 max-w-3xl" dir="rtl">
            <h1 className="text-3xl font-bold mb-6">הגדרות אבטחה</h1>

            <div className="space-y-6">
                {/* 2FA Status Card */}
                <Card className={is2FAEnabled ? "border-green-200 bg-green-50/30" : "border-amber-200 bg-amber-50/30"}>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${is2FAEnabled ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>
                                {is2FAEnabled ? <ShieldCheck className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
                            </div>
                            <div>
                                <CardTitle>אימות דו-שלבי (2FA)</CardTitle>
                                <CardDescription>
                                    הוסף שכבת הגנה נוספת לחשבון שלך באמצעות Microsoft Authenticator או Google Authenticator.
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        {!is2FAEnabled ? (
                            <div className="space-y-4">
                                <div className="text-sm text-amber-800">
                                    החשבון שלך כרגע מוגן בסיסמה בלבד. מומלץ להפעיל אימות דו-שלבי למניעת פריצות.
                                </div>
                                {!showSetup ? (
                                    <Button onClick={start2FASetup} disabled={loading}>
                                        {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                        הפעל אימות דו-שלבי
                                    </Button>
                                ) : (
                                    <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
                                        <div className="flex flex-col md:flex-row items-center gap-8">
                                            <div className="bg-white p-2 border rounded-md">
                                                <img src={qrCode} alt="Security QR Code" className="w-48 h-48" />
                                            </div>
                                            <div className="flex-1 space-y-4">
                                                <div className="flex items-center gap-2 font-semibold text-lg">
                                                    <Smartphone className="h-5 w-5 text-blue-600" />
                                                    שלב 1: סרוק את הברקוד
                                                </div>
                                                <p className="text-sm text-muted-foreground">
                                                    פתח את אפליקציית Authenticator בטלפון שלך, בחר ב-"הוסף חשבון" וסרוק את התמונה משמאל.
                                                </p>
                                                <div className="p-3 bg-slate-50 rounded border flex items-center justify-between">
                                                    <code className="text-xs font-mono">{secret}</code>
                                                    <Button variant="ghost" size="sm" onClick={copySecret}>
                                                        <Copy className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="border-t pt-6 space-y-4">
                                            <div className="flex items-center gap-2 font-semibold text-lg">
                                                <KeyRound className="h-5 w-5 text-blue-600" />
                                                שלב 2: הזן קוד אימות
                                            </div>
                                            <p className="text-sm text-muted-foreground">
                                                לאחר הסריקה, הזן כאן את הקוד בן 6 הספרות המופיע באפליקציה.
                                            </p>
                                            <div className="flex gap-2 max-w-sm">
                                                <Input
                                                    placeholder="000000"
                                                    maxLength={6}
                                                    className="text-center text-xl tracking-[0.5em]"
                                                    value={verificationCode}
                                                    onChange={(e) => setVerificationCode(e.target.value)}
                                                />
                                                <Button onClick={verifyAndEnable} disabled={loading}>
                                                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                                    אמת והפעל
                                                </Button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-green-700">
                                    <CheckCircle2 className="h-5 w-5" />
                                    <span className="font-semibold">האימות הדו-שלבי מופעל ומגן על החשבון שלך.</span>
                                </div>
                                <Button variant="outline" size="sm" className="text-red-600 border-red-200 hover:bg-red-50">
                                    בטל אימות דו-שלבי
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Password Change Card */}
                <Card>
                    <CardHeader>
                        <CardTitle>סיסמת כניסה</CardTitle>
                        <CardDescription>שינוי סיסמת הכניסה למערכת.</CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Button variant="outline">שנה סיסמה</Button>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
