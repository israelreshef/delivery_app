"use client"

import { useState, useEffect } from 'react'
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
    const [pricingLoading, setPricingLoading] = useState(false)
    const [editMode, setEditMode] = useState(false)
    const [activeTab, setActiveTab] = useState("info")

    const [pricingData, setPricingData] = useState({
        base_price: '',
        price_per_km: '',
        price_per_kg: '',
        discount_percentage: '0'
    })

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

    const fetchPricing = async () => {
        if (!customer?.id) return
        setPricingLoading(true)
        try {
            const res = await api.get(`/crm/customers/${customer.id}/pricing`)
            if (res.data) {
                setPricingData({
                    base_price: res.data.base_price || '',
                    price_per_km: res.data.price_per_km || '',
                    price_per_kg: res.data.price_per_kg || '',
                    discount_percentage: res.data.discount_percentage ? (res.data.discount_percentage * 100).toString() : '0'
                })
            }
        } catch (error) {
            console.error("Failed to fetch customer pricing", error)
        } finally {
            setPricingLoading(false)
        }
    }

    const savePricing = async () => {
        setPricingLoading(true)
        try {
            const payload = {
                base_price: pricingData.base_price ? parseFloat(pricingData.base_price) : null,
                price_per_km: pricingData.price_per_km ? parseFloat(pricingData.price_per_km) : null,
                price_per_kg: pricingData.price_per_kg ? parseFloat(pricingData.price_per_kg) : null,
                discount_percentage: pricingData.discount_percentage ? parseFloat(pricingData.discount_percentage) / 100.0 : 0
            }
            await api.put(`/crm/customers/${customer.id}/pricing`, payload)
            toast.success("מחירון הלקוח עודכן בהצלחה")
            fetchPricing()
        } catch (error: any) {
            toast.error("שגיאה בשמירת מחירון")
        } finally {
            setPricingLoading(false)
        }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => {
        if (isOpen && activeTab === 'pricing') {
            fetchPricing()
        }
    }, [isOpen, activeTab, customer?.id])

    if (!customer) return null

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-2xl overflow-y-auto max-h-[90vh]" dir="rtl">
                <DialogHeader>
                    <div className="flex justify-between items-start">
                        <div>
                            <DialogTitle className="text-2xl flex items-center gap-2">
                                {customer.company_name ? <Building2 className="h-6 w-6 text-brand" /> : <User className="h-6 w-6 text-gray-600" />}
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

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="info">מידע כללי</TabsTrigger>
                        <TabsTrigger value="pricing">מחירון עסק</TabsTrigger>
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
                                            title="Enforce 2FA checkbox"
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

                    <TabsContent value="pricing" className="space-y-4 pt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground mb-6">
                                    הגדר מחירון מותאם אישית ללקוח עסקי זה. השארת שדה ריק תשתמש במחירון הגלובלי הסטנדרטי. שים לב: אחוזי הנחה חלים כהנחה גורפת על הסה"כ.
                                </p>
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <Label>מחיר בסיס (₪)</Label>
                                        <Input
                                            type="number"
                                            placeholder="ברירת מחדל: 45₪+"
                                            value={pricingData.base_price}
                                            onChange={(e) => setPricingData({ ...pricingData, base_price: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>תוספת לכל ק"מ (₪)</Label>
                                        <Input
                                            type="number"
                                            placeholder="ברירת מחדל: 4₪/ק״מ"
                                            value={pricingData.price_per_km}
                                            onChange={(e) => setPricingData({ ...pricingData, price_per_km: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>חריגת משקל מעל 10 ק"ג (₪/ק"ג)</Label>
                                        <Input
                                            type="number"
                                            placeholder="ברירת מחדל: 5₪"
                                            value={pricingData.price_per_kg}
                                            onChange={(e) => setPricingData({ ...pricingData, price_per_kg: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>אחוז הנחה גורף (%)</Label>
                                        <div className="relative">
                                            <Input
                                                type="number"
                                                placeholder="0"
                                                min="0"
                                                max="100"
                                                className="pe-8"
                                                value={pricingData.discount_percentage}
                                                onChange={(e) => setPricingData({ ...pricingData, discount_percentage: e.target.value })}
                                            />
                                            <span className="absolute left-3 top-2.5 text-muted-foreground">%</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="mt-6 flex justify-end">
                                    <Button onClick={savePricing} disabled={pricingLoading}>
                                        {pricingLoading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                        עדכן מחירון לקוח
                                    </Button>
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
