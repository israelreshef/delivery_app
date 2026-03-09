"use client"



import { useState, useEffect } from 'react'

import { Search, Building2, User, UserX, Users, Plus, Trash } from "lucide-react"

import { AddCustomerModal } from "@/components/admin/AddCustomerModal"

import { toast } from "sonner"

import { api } from "@/lib/api"
import { useAuth } from "@/context/AuthContext"

import Link from "next/link"

import styles from './customer-list.module.css'



export default function AdminCustomersPage() {
    const { user } = useAuth()
    const [customers, setCustomers] = useState<any[]>([])

    const [loading, setLoading] = useState(true)

    const [searchTerm, setSearchTerm] = useState('')



    useEffect(() => {
        fetchCustomers()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const fetchCustomers = async () => {
        setLoading(true)
        try {
            const res = await api.get('/customers')
            // Handle both wrapped response ({ data: [...] }) and direct array
            setCustomers(Array.isArray(res.data) ? res.data : (res.data?.data || []))
        } catch (error) {
            console.error("Failed to fetch customers", error)
            toast.error("שגיאה בטעינת הלקוחות")
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteCustomer = async (id: number, name: string) => {
        if (!confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את הלקוח "${name}"?
פעולה זו תמחק גם את כל היסטוריית ההזמנות, החשבוניות, והאשראי שלו ולא ניתנת לביטול.`)) {
            return
        }

        try {
            await api.delete(`/admin/customers/${id}`)
            toast.success("הלקוח נמחק בהצלחה")
            fetchCustomers()
        } catch (error: any) {
            console.error("Failed to delete customer", error)
            toast.error(error.response?.data?.error || "שגיאה במחיקת הלקוח")
        }
    }

    const filteredCustomers = customers.filter((c: any) =>

        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        c.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||

        (c.phone && String(c.phone).includes(searchTerm)) ||

        (c.business_id && String(c.business_id).includes(searchTerm)) ||

        (c.tax_id && String(c.tax_id).includes(searchTerm))

    )



    const totalCustomers = customers.length

    const businessCustomers = customers.filter((c: any) => c.customer_type === 'business' || c.company_name).length

    const noAccountCustomers = customers.filter((c: any) => !c.has_account).length

    const totalBalance = customers.reduce((sum: number, c: any) => sum + (c.balance || 0), 0)

    const formatDate = (value?: string) => {

        if (!value) return '-'

        const d = new Date(value)

        if (Number.isNaN(d.getTime())) return '-'

        return d.toLocaleDateString('he-IL')

    }



    return (

        <div className={styles.listContainer}>

            <div className={styles.headerArea}>

                <div>

                    <h1 className={styles.title}>ניהול לקוחות</h1>

                    <p className={styles.subtitle}>ניהול לקוחות עסקיים ופרטיים, אשראי והזמנות.</p>

                </div>

                {/* Instead of native button we wrap AddCustomerModal if possible, or just render it */}

                <AddCustomerModal onSuccess={fetchCustomers} />

            </div>



            <div className={styles.metricsGrid}>

                <div className={styles.metricCard}>

                    <div>

                        <div className={styles.metricLabel}>סה״כ לקוחות</div>

                        <div className={styles.metricValue}>{totalCustomers}</div>

                    </div>

                    <div className={styles.metricIcon}>

                        <Users size={24} />

                    </div>

                </div>

                <div className={styles.metricCard}>

                    <div>

                        <div className={styles.metricLabel}>לקוחות עסקיים</div>

                        <div className={styles.metricValue}>{businessCustomers}</div>

                    </div>

                    <div className={styles.metricIcon}>

                        <Building2 size={24} />

                    </div>

                </div>

                <div className={styles.metricCard}>

                    <div>

                        <div className={styles.metricLabel}>ללא חשבון</div>

                        <div className={styles.metricValue}>{noAccountCustomers}</div>

                    </div>

                    <div className={`${styles.metricIcon} ${styles.iconWarning}`}>

                        <UserX size={24} />

                    </div>

                </div>

                <div className={styles.metricCard}>

                    <div>

                        <div className={styles.metricLabel}>חוב פתוח כולל</div>

                        <div className={`${styles.metricValue} ${totalBalance > 0 ? styles.totalBalanceRed : styles.totalBalanceGreen}`}>

                            ₪{totalBalance.toFixed(2)}

                        </div>

                    </div>

                    <div className={`${styles.badge} ${styles.badgeOutline}`}>יתרות</div>

                </div>

            </div>



            <div className={styles.tableContainer}>

                <div className={styles.tableHeader}>

                    <div className={styles.tableTitle}>רשימת לקוחות ({filteredCustomers.length})</div>

                    <div className={styles.searchBox}>

                        <Search className={styles.searchIcon} />

                        <input

                            type="text"

                            placeholder="חיפוש לפי שם, חברה או ח.פ..."

                            className={styles.searchInput}

                            value={searchTerm}

                            onChange={(e) => setSearchTerm(e.target.value)}

                        />

                    </div>

                </div>



                <table className={styles.customTable}>

                    <thead>

                        <tr>

                            <th>לקוח</th>

                            <th>שם חברה / סוג</th>

                            <th>איש קשר</th>

                            <th>יתרה / אשראי</th>

                            <th>מידע נוסף</th>

                            <th>גישה למערכת</th>

                            <th>הזמנות</th>

                            <th>פעילות אחרונה</th>

                            <th></th>

                        </tr>

                    </thead>

                    <tbody>

                        {loading ? (

                            <tr>

                                <td colSpan={9} className={styles.emptyState}>טוען נתונים...</td>

                            </tr>

                        ) : filteredCustomers.length === 0 ? (

                            <tr>

                                <td colSpan={9} className={styles.emptyState}>לא נמצאו לקוחות</td>

                            </tr>

                        ) : (

                            filteredCustomers.map((customer: any) => (

                                <tr key={customer.id}>

                                    <td>

                                        <div className={styles.customerName}>

                                            {customer.company_name ? <Building2 size={16} color="#3B82F6" /> : <User size={16} color="#94A3B8" />}

                                            {customer.full_name}

                                            {!customer.is_active && <span className={`${styles.badge} ${styles.badgeDestructive}`}>מושבת</span>}

                                        </div>

                                        <div className={styles.subText}>{customer.email}</div>

                                    </td>

                                    <td>

                                        {customer.company_name ? (

                                            <div>

                                                <div className={styles.companyName}>{customer.company_name}</div>

                                                <div className={styles.subText}>ח.פ: {customer.business_id || '-'}</div>

                                            </div>

                                        ) : (

                                            <span className={`${styles.badge} ${styles.badgeOutline}`}>פרטי</span>

                                        )}

                                    </td>

                                    <td>

                                        <div className={styles.textBright}>{customer.contact_person || '-'}</div>

                                        {customer.phone && <div className={styles.subText}>{customer.phone}</div>}

                                    </td>

                                    <td>

                                        <div className={`${customer.balance > 0 ? styles.totalBalanceRed : styles.totalBalanceGreen} ${styles.fontSemiBold}`}>

                                            ₪{customer.balance?.toFixed(2)}

                                        </div>

                                        <div className={styles.subText}>מסגרת: ₪{customer.credit_limit}</div>

                                    </td>

                                    <td>

                                        <div className={styles.subText}>סוג: {customer.customer_type || '-'}</div>

                                        <div className={styles.subText}>תשלום: {customer.payment_terms || '-'}</div>

                                    </td>

                                    <td>

                                        {customer.has_account ? (

                                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>פעיל</span>

                                        ) : (

                                            <span className={`${styles.badge} ${styles.badgeSecondary}`}>לא קיים</span>

                                        )}

                                    </td>

                                    <td className={styles.textBright}>{customer.total_orders}</td>

                                    <td>

                                        <div className={styles.subText}>שילח: {formatDate(customer.last_order_at)}</div>

                                        <div className={styles.subText}>שילם: {formatDate(customer.last_payment_at)}</div>

                                    </td>

                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {(user?.role === 'admin' || user?.user_type === 'admin') && (
                                                <button
                                                    className={`${styles.btnAction} text-red-500 hover:text-red-700 hover:bg-red-500/10`}
                                                    title="מחק לקוח"
                                                    onClick={() => handleDeleteCustomer(customer.id, customer.full_name)}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                            <Link href={`/admin/customers/${customer.id}`} className={styles.btnAction}>
                                                כרטיס לקוח
                                            </Link>
                                        </div>
                                    </td>

                                </tr>

                            ))

                        )}

                    </tbody>

                </table>

            </div>

        </div>

    )

}







