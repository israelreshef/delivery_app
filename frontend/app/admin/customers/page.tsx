"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Input } from "@/components/ui/input"
import { Search, Building2, User } from "lucide-react"
import { AddCustomerModal } from "@/components/admin/AddCustomerModal"
import { CustomerDetailsModal } from "@/components/admin/CustomerDetailsModal"
import { toast } from "sonner"
import { api } from "@/lib/api"

export default function AdminCustomersPage() {
    const [customers, setCustomers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')

    // modal states
    const [selectedCustomer, setSelectedCustomer] = useState<any>(null)
    const [isDetailsOpen, setIsDetailsOpen] = useState(false)

    useEffect(() => {
        fetchCustomers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const res = await api.get('/customers')
            setCustomers(res.data)
            // Refresh selected customer if current modal is open
            if (selectedCustomer) {
                const updated = res.data.find((c: any) => c.id === selectedCustomer.id)
                if (updated) setSelectedCustomer(updated)
            }
        } catch (error) {
            console.error("Failed to fetch customers", error)
            toast.error("שגיאה בטעינת הלקוחות")
        } finally {
            setLoading(false)
        }
    }

    const openDetails = (customer: any) => {
        setSelectedCustomer(customer)
        setIsDetailsOpen(true)
    }

    const filteredCustomers = customers.filter((c: any) =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && String(c.phone).includes(searchTerm)) ||
        (c.business_id && String(c.business_id).includes(searchTerm))
    )

    return (
        <div className="container mx-auto py-10 space-y-8" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">ניהול לקוחות</h1>
                    <p className="text-muted-foreground">ניהול לקוחות עסקיים ופרטיים, אשראי והזמנות.</p>
                </div>
                <AddCustomerModal onSuccess={fetchCustomers} />
            </div>

            <Card>
                <CardHeader>
                    <div className="flex justify-between items-center">
                        <div>
                            <CardTitle>רשימת לקוחות ({filteredCustomers.length})</CardTitle>
                            <CardDescription>צפייה בפרטי לקוחות, יתרות והיסטוריה</CardDescription>
                        </div>
                        <div className="relative w-64">
                            <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="חיפוש לפי שם, חברה או ח.פ..."
                                className="pr-8"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">לקוח</TableHead>
                                <TableHead className="text-right">פרטי עסק</TableHead>
                                <TableHead className="text-right">איש קשר</TableHead>
                                <TableHead className="text-right">יתרה / אשראי</TableHead>
                                <TableHead className="text-right">הזמנות</TableHead>
                                <TableHead className="text-right" />
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">טוען נתונים...</TableCell>
                                </TableRow>
                            ) : filteredCustomers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-10">לא נמצאו לקוחות</TableCell>
                                </TableRow>
                            ) : (
                                filteredCustomers.map((customer: any) => (
                                    <TableRow key={customer.id}>
                                        <TableCell className="font-medium">
                                            <div className="flex items-center gap-2">
                                                {customer.company_name ? <Building2 className="h-4 w-4 text-blue-500" /> : <User className="h-4 w-4 text-gray-500" />}
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        {customer.full_name}
                                                        {!customer.is_active && <Badge variant="destructive" className="text-[10px] h-4">מושבת</Badge>}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">{customer.email}</div>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            {customer.company_name ? (
                                                <div>
                                                    <div className="font-semibold">{customer.company_name}</div>
                                                    <div className="text-xs text-muted-foreground">ח.פ: {customer.business_id || '-'}</div>
                                                </div>
                                            ) : (
                                                <Badge variant="outline">פרטי</Badge>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            {customer.contact_person || '-'}
                                            {customer.phone && <div className="text-xs text-muted-foreground">{customer.phone}</div>}
                                        </TableCell>
                                        <TableCell>
                                            <div className={customer.balance > 0 ? "text-red-500 font-medium" : "text-green-600"}>
                                                ₪{customer.balance?.toFixed(2)}
                                            </div>
                                            <div className="text-xs text-muted-foreground">תקרה: ₪{customer.credit_limit}</div>
                                        </TableCell>
                                        <TableCell>{customer.total_orders}</TableCell>
                                        <TableCell>
                                            <Button variant="ghost" size="sm" onClick={() => openDetails(customer)}>כרטיס לקוח</Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <CustomerDetailsModal
                customer={selectedCustomer}
                isOpen={isDetailsOpen}
                onClose={() => setIsDetailsOpen(false)}
                onUpdate={fetchCustomers}
            />
        </div>
    )
}
