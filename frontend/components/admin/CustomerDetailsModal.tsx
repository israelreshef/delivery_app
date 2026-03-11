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
    const [accountFormOpen, setAccountFormOpen] = useState(false)
    const [accountForm, setAccountForm] = useState({
        username: "",
        password: "",
        email: "",
        phone: ""
    })
    const [contactLogs, setContactLogs] = useState<any[]>([])
    const [contactLoading, setContactLoading] = useState(false)
    const [contactForm, setContactForm] = useState({
        contact_type: 'call',
        summary: '',
        outcome: '',
        contact_date: '',
        next_follow_up: ''
    })
    const [relatedLoading, setRelatedLoading] = useState(false)
    const [relatedData, setRelatedData] = useState<{ deliveries: any[]; invoices: any[]; payments: any[]; expenses: any[]; files: any[] }>({
        deliveries: [],
        invoices: [],
        payments: [],
        expenses: [],
        files: []
    })
    const [fileUpload, setFileUpload] = useState({
        title: '',
        description: '',
        file_type: 'receipt',
        category: '',
        status: 'active',
        archived: false
    })
    const [fileUploading, setFileUploading] = useState(false)
    const [fileBin, setFileBin] = useState<File[]>([])
    const [fileSearch, setFileSearch] = useState('')
    const [fileFilterType, setFileFilterType] = useState('all')
    const [fileFilterStatus, setFileFilterStatus] = useState('all')
    const [fileFilterCategory, setFileFilterCategory] = useState('all')

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
        additional_phones: customer?.additional_phones || '',
        company_name: customer?.company_name || '',
        business_id: customer?.business_id || '',
        contact_person: customer?.contact_person || '',
        tax_id: customer?.tax_id || '',
        customer_type: customer?.customer_type || 'private',
        vat_status: customer?.vat_status || 'authorized_dealer',
        payment_terms: customer?.payment_terms || 'net_30',
        billing_address: customer?.billing_address || '',
        default_address: customer?.default_address || '',
        credit_limit: customer?.credit_limit || 0,
        two_factor_enforced: customer?.two_factor_enforced_by_admin || false
    })

    const handleUpdate = async () => {
        setLoading(true)
        try {
            const customerPayload = {
                full_name: formData.full_name,
                company_name: formData.company_name,
                business_id: formData.business_id,
                contact_person: formData.contact_person,
                tax_id: formData.tax_id,
                customer_type: formData.customer_type,
                vat_status: formData.vat_status,
                payment_terms: formData.payment_terms,
                billing_address: formData.billing_address,
                default_address: formData.default_address,
                credit_limit: formData.credit_limit,
                email: formData.email,
                phone: formData.phone,
                additional_phones: formData.additional_phones
            }
            await api.put(`/customers/${customer.id}`, customerPayload)

            if (customer.user_id) {
                await api.put(`/admin/users/${customer.user_id}`, {
                    two_factor_enforced: formData.two_factor_enforced
                })
            }

            toast.success("פרטי לקוח עודכנו בהצלחה")
            setEditMode(false)
            onUpdate()
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה בעדכון הפרטים")
        } finally {
            setLoading(false)
        }
    }

    const handleCreateAccount = async () => {
        if (!customer?.id) return
        if (!accountForm.username || !accountForm.password) {
            toast.error("נדרש שם משתמש וסיסמה")
            return
        }
        setLoading(true)
        try {
            await api.post(`/customers/${customer.id}/account`, accountForm)
            toast.success("חשבון לקוח נוצר בהצלחה")
            setAccountFormOpen(false)
            onUpdate()
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה ביצירת חשבון")
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
            toast.success("תמחור לקוח עודכן בהצלחה")
            fetchPricing()
        } catch (error: any) {
            toast.error("שגיאה בשמירת תמחור")
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

    useEffect(() => {
        if (isOpen && activeTab === 'contacts' && customer?.id) {
            fetchContacts()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab, customer?.id])

    useEffect(() => {
        if (isOpen && activeTab === 'files' && customer?.id) {
            fetchRelated()
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, activeTab, customer?.id])

    const fetchContacts = async () => {
        if (!customer?.id) return
        setContactLoading(true)
        try {
            const res = await api.get(`/customers/${customer.id}/contacts`)
            setContactLogs(res.data || [])
        } catch {
            toast.error("שגיאה בטעינת יומן קשר")
        } finally {
            setContactLoading(false)
        }
    }

    const createContact = async () => {
        if (!contactForm.summary) {
            toast.error("נדרש סיכום קשר")
            return
        }
        try {
            await api.post(`/customers/${customer.id}/contacts`, contactForm)
            toast.success("יומן קשר עודכן")
            setContactForm({
                contact_type: 'call',
                summary: '',
                outcome: '',
                contact_date: '',
                next_follow_up: ''
            })
            fetchContacts()
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה בשמירת קשר")
        }
    }

    const fetchRelated = async () => {
        if (!customer?.id) return
        setRelatedLoading(true)
        try {
            const res = await api.get(`/customers/${customer.id}/related`)
            setRelatedData(res.data || { deliveries: [], invoices: [], payments: [], expenses: [], files: [] })
        } catch {
            toast.error("שגיאה בטעינת פעילות לקוח")
        } finally {
            setRelatedLoading(false)
        }
    }

    const uploadCustomerFile = async () => {
        if (!fileBin.length) {
            toast.error("בחר קבצים להעלאה")
            return
        }
        setFileUploading(true)
        try {
            const formData = new FormData()
            fileBin.forEach((f) => formData.append('file', f))
            Object.entries(fileUpload).forEach(([k, v]) => {
                formData.append(k, String(v))
            })
            await api.post(`/customers/${customer.id}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            })
            toast.success("קבצים הועלו בהצלחה")
            setFileBin([])
            setFileUpload({
                title: '',
                description: '',
                file_type: 'receipt',
                category: '',
                status: 'active',
                archived: false
            })
            fetchRelated()
        } catch {
            toast.error("שגיאה בהעלאת קובץ")
        } finally {
            setFileUploading(false)
        }
    }

    const updateCustomerFile = async (fileId: number, payload: any) => {
        try {
            await api.put(`/customers/${customer.id}/files/${fileId}`, payload)
            fetchRelated()
        } catch {
            toast.error("שגיאה בעדכון קובץ")
        }
    }

    const downloadCustomerFile = async (fileId: number, fileName: string) => {
        try {
            const res = await api.get(`/customers/${customer.id}/files/${fileId}/download`, { responseType: 'blob' })
            const url = window.URL.createObjectURL(new Blob([res.data]))
            const a = document.createElement('a')
            a.href = url
            a.download = fileName
            document.body.appendChild(a)
            a.click()
            a.remove()
        } catch {
            toast.error("שגיאה בהורדת קובץ")
        }
    }

    const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'
    const openFile = (path?: string) => {
        if (!path) return
        const url = path.startsWith('http') ? path : `${API_BASE}${path}`
        window.open(url, '_blank')
    }

    const fileCategories = Array.from(new Set(relatedData.files.map((f) => f.category).filter(Boolean)))
    const filteredFiles = relatedData.files.filter((f) => {
        const text = fileSearch.trim().toLowerCase()
        const matchesText = !text || `${f.title || ''} ${f.description || ''} ${f.category || ''}`.toLowerCase().includes(text)
        const matchesType = fileFilterType === 'all' || f.file_type === fileFilterType
        const matchesStatus = fileFilterStatus === 'all' || f.status === fileFilterStatus
        const matchesCategory = fileFilterCategory === 'all' || f.category === fileFilterCategory
        return matchesText && matchesType && matchesStatus && matchesCategory
    })
    const legalFiles = relatedData.files.filter((f) => f.file_type === 'legal')

    useEffect(() => {
        if (!customer) return
        setFormData({
            full_name: customer?.full_name || '',
            email: customer?.email || '',
            phone: customer?.phone || '',
            additional_phones: customer?.additional_phones || '',
            company_name: customer?.company_name || '',
            business_id: customer?.business_id || '',
            contact_person: customer?.contact_person || '',
            tax_id: customer?.tax_id || '',
            customer_type: customer?.customer_type || 'private',
            vat_status: customer?.vat_status || 'authorized_dealer',
            payment_terms: customer?.payment_terms || 'net_30',
            billing_address: customer?.billing_address || '',
            default_address: customer?.default_address || '',
            credit_limit: customer?.credit_limit || 0,
            two_factor_enforced: customer?.two_factor_enforced_by_admin || false
        })
        setAccountFormOpen(false)
    }, [customer])

    if (!customer) return null
    const hasAccount = Boolean(customer.user_id)

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
                        {hasAccount ? (
                            <Badge variant={customer.is_active ? "default" : "destructive"} className="cursor-pointer" onClick={toggleActive}>
                                {customer.is_active ? "פעיל" : "מושבת"}
                            </Badge>
                        ) : (
                            <Badge variant="secondary">ללא חשבון</Badge>
                        )}
                    </div>
                </DialogHeader>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-6">
                        <TabsTrigger value="info">מידע כללי</TabsTrigger>
                        <TabsTrigger value="pricing">תמחור עסק</TabsTrigger>
                        <TabsTrigger value="security">אבטחה ו‑2FA</TabsTrigger>
                        <TabsTrigger value="contacts">יומן קשר</TabsTrigger>
                        <TabsTrigger value="files">קבצים ופעילות</TabsTrigger>
                        <TabsTrigger value="history">היסטוריה</TabsTrigger>
                    </TabsList>

                    <TabsContent value="info" className="space-y-4 pt-4">
                        {!hasAccount && (
                            <Card className="border border-amber-200 bg-amber-50/50">
                                <CardContent className="pt-4 space-y-3">
                                    <div className="text-sm font-medium">אין חשבון כניסה ללקוח הזה</div>
                                    <div className="text-xs text-muted-foreground">
                                        אפשר ליצור חשבון כניסה ללקוח עכשיו, או להשאיר ללא חשבון.
                                    </div>
                                    {!accountFormOpen ? (
                                        <Button size="sm" onClick={() => setAccountFormOpen(true)}>צור חשבון</Button>
                                    ) : (
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-2">
                                                <Label>שם משתמש</Label>
                                                <Input
                                                    value={accountForm.username}
                                                    onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>סיסמה</Label>
                                                <Input
                                                    type="password"
                                                    value={accountForm.password}
                                                    onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>אימייל (אופציונלי)</Label>
                                                <Input
                                                    value={accountForm.email}
                                                    onChange={(e) => setAccountForm({ ...accountForm, email: e.target.value })}
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label>טלפון (אופציונלי)</Label>
                                                <Input
                                                    value={accountForm.phone}
                                                    onChange={(e) => setAccountForm({ ...accountForm, phone: e.target.value })}
                                                />
                                            </div>
                                            <div className="col-span-2 flex gap-2">
                                                <Button variant="outline" size="sm" onClick={() => setAccountFormOpen(false)}>ביטול</Button>
                                                <Button size="sm" onClick={handleCreateAccount} disabled={loading}>
                                                    {loading && <Loader2 className="ml-2 h-4 w-4 animate-spin" />}
                                                    צור חשבון
                                                </Button>
                                            </div>
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        )}

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>שם מלא</Label>
                                <Input
                                    value={formData.full_name}
                                    disabled={!editMode || !hasAccount}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>חברה / עסק</Label>
                                <Input
                                    value={formData.company_name}
                                    disabled={!editMode || !hasAccount}
                                    onChange={(e) => setFormData({ ...formData, company_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>דוא״ל</Label>
                                <Input
                                    type="email"
                                    value={formData.email}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>טלפון עיקרי</Label>
                                <Input
                                    value={formData.phone}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>טלפונים נוספים (מופרדים בפסיקים)</Label>
                                <Input
                                    value={
                                        (typeof formData.additional_phones === 'string' && formData.additional_phones.startsWith('['))
                                            ? (() => {
                                                try { return JSON.parse(formData.additional_phones).join(', ') }
                                                catch { return formData.additional_phones }
                                            })()
                                            : formData.additional_phones
                                    }
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, additional_phones: e.target.value })}
                                    onBlur={(e) => {
                                        if (!editMode) return;
                                        const val = e.target.value;
                                        const jsonStr = JSON.stringify(val.split(',').map(s => s.trim()).filter(Boolean));
                                        setFormData({ ...formData, additional_phones: jsonStr });
                                    }}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ח.פ / ע.מ</Label>
                                <Input
                                    value={formData.business_id}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, business_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>איש קשר</Label>
                                <Input
                                    value={formData.contact_person}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>מס' עוסק / ח.פ</Label>
                                <Input
                                    value={formData.tax_id}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, tax_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>סוג לקוח</Label>
                                <select
                                    value={formData.customer_type}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, customer_type: e.target.value })}
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="private">פרטי</option>
                                    <option value="business">עסקי</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>סטטוס מע״מ</Label>
                                <select
                                    value={formData.vat_status}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, vat_status: e.target.value })}
                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                >
                                    <option value="exempt">פטור</option>
                                    <option value="authorized_dealer">עוסק מורשה</option>
                                    <option value="company">חברה</option>
                                    <option value="standard">רגיל</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>תנאי תשלום</Label>
                                <Input
                                    value={formData.payment_terms}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, payment_terms: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>כתובת לחיוב</Label>
                                <Input
                                    value={formData.billing_address}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, billing_address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>כתובת ברירת מחדל</Label>
                                <Input
                                    value={formData.default_address}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, default_address: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>תקרת אשראי</Label>
                                <Input
                                    type="number"
                                    value={formData.credit_limit}
                                    disabled={!editMode}
                                    onChange={(e) => setFormData({ ...formData, credit_limit: e.target.value })}
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
                        {!hasAccount && (
                            <Card>
                                <CardContent className="pt-6 text-sm text-muted-foreground">
                                    אין חשבון כניסה ללקוח זה, ולכן אין הגדרות אבטחה.
                                </CardContent>
                            </Card>
                        )}
                        {hasAccount && (
                            <Card>
                                <CardContent className="pt-6 space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <ShieldCheck className="h-5 w-5 text-green-600" />
                                            <div>
                                                <div className="font-medium">אימות דו־שלבי (2FA)</div>
                                                <div className="text-sm text-muted-foreground">הפעלת אימות דו־שלבי</div>
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
                                                <KeyRound className="h-5 w-5 text-brand" />
                                                <div>
                                                    <div className="font-medium">איפוס סיסמה</div>
                                                    <div className="text-sm text-muted-foreground">הגדרת סיסמה חדשה באופן מיידי</div>
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
                        )}
                    </TabsContent>

                    <TabsContent value="pricing" className="space-y-4 pt-4">
                        <Card>
                            <CardContent className="pt-6">
                                <p className="text-sm text-muted-foreground mb-6">
                                    הגדר תמחור מותאם אישית ללקוח עסקי זה. השאר שדה ריק כדי להשתמש בתמחור הגלובלי הסטנדרטי. שים לב: אחוזי הנחה חלים כהנחה גורפת על הסה״כ.
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
                                        <Label>תוספת לכל ק״מ (₪)</Label>
                                        <Input
                                            type="number"
                                            placeholder="ברירת מחדל: 4₪/ק״מ"
                                            value={pricingData.price_per_km}
                                            onChange={(e) => setPricingData({ ...pricingData, price_per_km: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>חריגת משקל מעל 10 ק״ג (₪/ק״ג)</Label>
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
                                        עדכן תמחור לקוח
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="contacts" className="space-y-4 pt-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>סוג קשר</Label>
                                        <select
                                            value={contactForm.contact_type}
                                            onChange={(e) => setContactForm({ ...contactForm, contact_type: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 text-sm"
                                        >
                                            <option value="call">שיחה</option>
                                            <option value="email">אימייל</option>
                                            <option value="whatsapp">וואטסאפ</option>
                                            <option value="meeting">פגישה</option>
                                            <option value="other">אחר</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <Label>תאריך קשר</Label>
                                        <Input
                                            type="date"
                                            value={contactForm.contact_date}
                                            onChange={(e) => setContactForm({ ...contactForm, contact_date: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>סיכום</Label>
                                    <Input
                                        value={contactForm.summary}
                                        onChange={(e) => setContactForm({ ...contactForm, summary: e.target.value })}
                                        placeholder="לדוגמה: מה סוכם"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>תוצאה / סטטוס</Label>
                                    <Input
                                        value={contactForm.outcome}
                                        onChange={(e) => setContactForm({ ...contactForm, outcome: e.target.value })}
                                        placeholder="לדוגמה: נשלחה הצעת מחיר"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>תזכורת הבאה</Label>
                                    <Input
                                        type="date"
                                        value={contactForm.next_follow_up}
                                        onChange={(e) => setContactForm({ ...contactForm, next_follow_up: e.target.value })}
                                    />
                                </div>
                                <Button onClick={createContact}>הוסף קשר</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                {contactLoading ? (
                                    <div className="text-sm text-muted-foreground">טוען יומן קשר...</div>
                                ) : contactLogs.length === 0 ? (
                                    <div className="text-sm text-muted-foreground">אין יומן קשר</div>
                                ) : (
                                    <div className="space-y-3">
                                        {contactLogs.map((log) => (
                                            <div key={log.id} className="border rounded-lg p-3">
                                                <div className="flex items-center justify-between text-sm">
                                                    <div className="font-medium">{log.contact_type}</div>
                                                    <div className="text-muted-foreground">{log.contact_date?.slice(0, 10)}</div>
                                                </div>
                                                <div className="text-sm mt-2">{log.summary}</div>
                                                {log.outcome && <div className="text-xs text-muted-foreground mt-1">תוצאה: {log.outcome}</div>}
                                                {log.next_follow_up && <div className="text-xs text-muted-foreground">מעקב: {log.next_follow_up}</div>}
                                                {log.created_by_name && <div className="text-xs text-muted-foreground">נוצר ע\"י: {log.created_by_name}</div>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </TabsContent>

                    <TabsContent value="files" className="space-y-4 pt-4">
                        <Card>
                            <CardContent className="pt-6 space-y-4">
                                <div className="text-sm font-semibold">העלאת קבצים ללקוח</div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>כותרת</Label>
                                        <Input
                                            value={fileUpload.title}
                                            onChange={(e) => setFileUpload({ ...fileUpload, title: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>סוג מסמך</Label>
                                        <select
                                            value={fileUpload.file_type}
                                            onChange={(e) => setFileUpload({ ...fileUpload, file_type: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 text-sm"
                                        >
                                            <option value="receipt">קבלה</option>
                                            <option value="contract">חוזה</option>
                                            <option value="legal">משפטי</option>
                                            <option value="other">אחר</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>קטגוריה / תיקיה</Label>
                                        <Input
                                            value={fileUpload.category}
                                            onChange={(e) => setFileUpload({ ...fileUpload, category: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>סטטוס</Label>
                                        <select
                                            value={fileUpload.status}
                                            onChange={(e) => setFileUpload({ ...fileUpload, status: e.target.value })}
                                            className="w-full border rounded-md px-3 py-2 text-sm"
                                        >
                                            <option value="active">פעיל</option>
                                            <option value="archived">בארכיון</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Label>תיאור</Label>
                                    <Input
                                        value={fileUpload.description}
                                        onChange={(e) => setFileUpload({ ...fileUpload, description: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>קבצים</Label>
                                        <Input type="file" multiple onChange={(e) => setFileBin(Array.from(e.target.files || []))} />
                                    </div>
                                    <div className="flex items-end">
                                        <Button onClick={uploadCustomerFile} disabled={fileUploading}>
                                            {fileUploading ? "מעלה..." : "העלה קבצים"}
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardContent className="pt-6">
                                {relatedLoading ? (
                                    <div className="text-sm text-muted-foreground">טוען קבצים...</div>
                                ) : (
                                    <div className="space-y-6">
                                        <div>
                                            <div className="text-sm font-semibold mb-2">מסמכים וקבצים</div>
                                            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-3">
                                                <Input
                                                    placeholder="חיפוש מסמכים..."
                                                    value={fileSearch}
                                                    onChange={(e) => setFileSearch(e.target.value)}
                                                />
                                                <select
                                                    value={fileFilterType}
                                                    onChange={(e) => setFileFilterType(e.target.value)}
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                >
                                                    <option value="all">כל הסוגים</option>
                                                    <option value="receipt">קבלה</option>
                                                    <option value="contract">חוזה</option>
                                                    <option value="legal">משפטי</option>
                                                    <option value="other">אחר</option>
                                                </select>
                                                <select
                                                    value={fileFilterStatus}
                                                    onChange={(e) => setFileFilterStatus(e.target.value)}
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                >
                                                    <option value="all">כל הסטטוסים</option>
                                                    <option value="active">פעיל</option>
                                                    <option value="archived">בארכיון</option>
                                                </select>
                                                <select
                                                    value={fileFilterCategory}
                                                    onChange={(e) => setFileFilterCategory(e.target.value)}
                                                    className="w-full border rounded-md px-3 py-2 text-sm"
                                                >
                                                    <option value="all">כל הקטגוריות</option>
                                                    {fileCategories.map((c) => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            {filteredFiles.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין קבצים</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {filteredFiles.map((f) => (
                                                        <div key={f.id} className="border rounded-lg p-3 flex items-center justify-between">
                                                            <div className="text-sm">
                                                                <div className="font-medium">{f.title}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {f.file_type} • {f.category || 'ללא קטגוריה'} • {f.created_at?.slice(0, 10)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <select
                                                                    value={f.status || 'active'}
                                                                    onChange={(e) => updateCustomerFile(f.id, { status: e.target.value })}
                                                                    className="border rounded-md px-2 py-1 text-xs"
                                                                >
                                                                    <option value="active">פעיל</option>
                                                                    <option value="archived">בארכיון</option>
                                                                </select>
                                                                <Button size="sm" variant="outline" onClick={() => downloadCustomerFile(f.id, f.file_name)}>
                                                                    הורדה
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold mb-2">היסטוריה משפטית</div>
                                            {legalFiles.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין היסטוריה משפטית</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {legalFiles.map((f) => (
                                                        <div key={f.id} className="border rounded-lg p-3">
                                                            <div className="flex items-center justify-between">
                                                                <div className="font-medium">{f.title}</div>
                                                                <div className="text-xs text-muted-foreground">{f.created_at?.slice(0, 10)}</div>
                                                            </div>
                                                            {f.description && <div className="text-xs text-muted-foreground mt-1">{f.description}</div>}
                                                            <div className="flex items-center gap-2 mt-2">
                                                                <Badge variant="outline" className="text-[10px] h-5">{f.status || 'active'}</Badge>
                                                                <Button size="sm" variant="outline" onClick={() => downloadCustomerFile(f.id, f.file_name)}>
                                                                    הורדה
                                                                </Button>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold mb-2">משלוחים / מסירות</div>
                                            {relatedData.deliveries.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין משלוחים</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {relatedData.deliveries.map((d) => (
                                                        <div key={d.id} className="border rounded-lg p-3 flex items-center justify-between">
                                                            <div className="text-sm">
                                                                <div className="font-medium">#{d.order_number}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {d.status} • {d.delivery_type} • {d.created_at?.slice(0, 10)}
                                                                </div>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                {d.pod_image_path && (
                                                                    <Button size="sm" variant="outline" onClick={() => openFile(d.pod_image_path)}>
                                                                        תמונת POD
                                                                    </Button>
                                                                )}
                                                                {d.pod_signature_path && (
                                                                    <Button size="sm" variant="outline" onClick={() => openFile(d.pod_signature_path)}>
                                                                        חתימה
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold mb-2">חשבוניות / חיובים</div>
                                            {relatedData.invoices.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין חשבוניות</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {relatedData.invoices.map((inv) => (
                                                        <div key={inv.id} className="border rounded-lg p-3 text-sm">
                                                            <div className="font-medium">{inv.invoice_number}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {inv.document_type} • {inv.status} • {inv.issue_date?.slice(0, 10)} • ₪{inv.total_amount}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold mb-2">תשלומים</div>
                                            {relatedData.payments.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין תשלומים</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {relatedData.payments.map((p) => (
                                                        <div key={p.id} className="border rounded-lg p-3 text-sm">
                                                            <div className="font-medium">₪{p.amount} • {p.status}</div>
                                                            <div className="text-xs text-muted-foreground">
                                                                {p.payment_method} • {p.payment_date?.slice(0, 10)} • חשבונית: {p.invoice_number || '-'}
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        <div>
                                            <div className="text-sm font-semibold mb-2">הוצאות / מסמכי הוצאה</div>
                                            {relatedData.expenses.length === 0 ? (
                                                <div className="text-sm text-muted-foreground">אין הוצאות</div>
                                            ) : (
                                                <div className="space-y-2">
                                                    {relatedData.expenses.map((e) => (
                                                        <div key={e.id} className="border rounded-lg p-3 text-sm flex items-center justify-between">
                                                            <div>
                                                                <div className="font-medium">{e.description}</div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    {e.expense_date} • ₪{e.amount} • {e.category || '-'}
                                                                </div>
                                                            </div>
                                                            {e.receipt_url && (
                                                                <Button size="sm" variant="outline" onClick={() => openFile(e.receipt_url)}>
                                                                    קבלה
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
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



