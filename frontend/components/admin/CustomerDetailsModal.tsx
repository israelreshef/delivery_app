"use client"

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { api } from "@/lib/api"
import { Loader2, ShieldCheck, ShieldAlert, KeyRound, User, Building2, Phone, Mail, MapPin } from "lucide-react"

interface CustomerDetailsModalProps {
    customer: any
    isOpen: boolean
    onClose: () => void
    onUpdate: () => void
}

export function CustomerDetailsModal({ customer, isOpen, onClose, onUpdate }: CustomerDetailsModalProps) {
    const [loading, setLoading] = useState(false)
    const [resetLoading, setResetLoading] = useState(false)
    const [editMode, setEditMode] = useState(false)

    const [formData, setFormData] = useState({
        full_name: customer?.full_name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        company_name: customer?.company_name || '',
        business_id: customer?.business_id || '',
        two_factor_enforced: customer?.two_factor_enforced_by_admin || false
    })

    const handleUpdate = async () => {
        setLoading(true)
        try {
            await api.put(`/admin/users/${customer.user_id}`, formData)
            toast.success("פרטי משתמש עודכנו בהצלחה")
            setEditMode(false)
            onUpdate()
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה בעדכון הפרטים")
        } finally {
            setLoading(false)
        }
    }

    const handleResetPassword = async () => {
        const newPassword = prompt("הזן סיסמה חדשה:")
        if (!newPassword || newPassword.length < 6) {
            if (newPassword) toast.error("סיסמה חייבת להיות לפחות 6 תווים")
            return
        }

        setResetLoading(true)
        try {
            await api.post(`/admin/users/${customer.user_id}/reset-password`, { password: newPassword })
            toast.success("סיסמה אופסה בהצלחה")
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה באיפוס סיסמה")
        } finally {
            setResetLoading(false)
        }
    }

    const toggleActive = async () => {
        try {
            const res = await api.post(`/admin/users/${customer.user_id}/toggle-active`)
            toast.success(res.data.message)
            onUpdate()
        } catch (error: any) {
            toast.error("שגיאה בשינוי סטטוס משתמש")
        }
    }

    if (!customer) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]" dir="rtl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                {customer.company_name ? <Building2 className="h-6 w-6 text-blue-600" /> : <User className="h-6 w-6 text-gray-600" />}
                                {customer.full_name}
                            </DialogTitle>
                            <DialogDescription>
                                ניהול כרטיס לקוח {customer.company_name ? `עסקי: ${customer.company_name}` : 'פרטי'}
                            </DialogDescription>
                        </div>
                        <Badge variant={customer.is_active ? "default" : "destructive"} className="cursor-pointer" onClick={toggleActive}>
                            {customer.is_active ? "פעיל" : "מושבת"}
                        </Badge>
                    </div>
                </DialogHeader>

                <Tabs defaultValue="info" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                        <TabsTrigger value="info">מידע כללי</TabsTrigger>
                        <TabsTrigger value="security">אבטחה ו-2FA</TabsTrigger>
                        <TabsTrigger value="history">היסטוריה</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 pt-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>שם מלא</Label>
                                <Input
                                    value={formData.full_name}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>חברה / עסק</Label>
                                <Input
                                    value={formData.company_name}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>דוא"ל</Label>
                                <Input
                                    value={formData.email}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>טלפון</Label>
                                <Input
                                    value={formData.phone}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ח.פ / ת.ז</Label>
                                <Input
                                    value={formData.business_id}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                                />
                            </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-4">
                            {!editMode ? (
                                <Button onClick={() => setEditMode(true)}>ערוך פרטים</Button>
                            ) : (
                                <>
                                    <Button variant="outline" onClick={() => setEditMode(false)}>ביטול</Button>
                                    <Button onClick={handleUpdate} disabled={loading}>
                                        {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                        שמור שינויים
                                    </Button>
                                </>
                            )}
                        </div>
                    </TabsContent>

                    <TabsContent value="security" className="space-y-4 pt-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <ShieldCheck className="h-5 w-5 text-green-600" />
                                        <div>
                                            <div className="font-medium">אימות דו-שלבי (2FA)</div>
                                            <div className="text-sm text-muted-foreground">חיובי במידה ומסומן</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Label htmlFor="enforce-2fa">חייב 2FA</Label>
                                        <input
                                            type="checkbox"
                                            id="enforce-2fa"
                                            checked={formData.two_factor_enforced}
                                            onChange={(e) => {
                                                const val = e.target.checked
                                                setFormData({ ...formData, two_factor_enforced: val })
                                                // Update immediately
                                                api.put(`/admin/users/${customer.user_id}`, { two_factor_enforced: val })
                                                    .then(() => toast.success("הגדרת 2FA עודכנה"))
                                            }}
                                            className="h-5 w-5 rounded border-gray-300"
                                        />
                                    </div>
                                </div>

                                <div className="border-t pt-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <KeyRound className="h-5 w-5 text-amber-500" />
                                            <div>
                                                <div className="font-medium">איפוס סיסמה</div>
                                                <div className="text-sm text-muted-foreground">שימוש בסיסמה חדשה באופן מיידי</div>
                                            </div>
                                        </div>
                                        <Button variant="outline" size="sm" onClick={handleResetPassword} disabled={resetLoading}>
                                            {resetLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                            אפס סיסמה
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="history" className="pt-4">
                        <div className="text-center py-10 text-muted-foreground">
                            היסטוריית הזמנות ותשלומים תופיע כאן בגרסה הבאה.
                        </div>
                    </TabsContent>
                </Tabs>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose}>סגור</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
