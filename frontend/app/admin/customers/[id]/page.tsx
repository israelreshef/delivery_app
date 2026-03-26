'use client';

import React, { useState, useEffect } from 'react';
import { CustomerInfoPanel } from '@/components/admin/crm/CustomerInfoPanel';
import { CustomerActivityTabs } from '@/components/admin/crm/CustomerActivityTabs';
import { CustomerTasksBoard } from '@/components/admin/crm/CustomerTasksBoard';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import './customer-card.css';

const C = {
    bg: '#0f1117',
    surface: '#181b24',
    surface2: '#1e2232',
    border: '#2a2f45',
    accent: '#4f6ef7',
    text: '#e8eaf0',
    muted: '#7b83a6',
    soft: '#b0b8d4',
};

export default function CustomerCardPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const [customer, setCustomer] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [activities, setActivities] = useState<any[]>([]);
    const [orders, setOrders] = useState<any[]>([]);
    const [notes, setNotes] = useState<any[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const [tasks, setTasks] = useState<any[]>([]);
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [financialData, setFinancialData] = useState({ total_sales: 0, paid: 0, open_balance: 0, cancelled: 0 });
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        fetchCustomerData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const fetchCustomerData = async () => {
        try {
            setLoading(true);
            const [customerRes, detailsRes] = await Promise.all([
                api.get(`/customers/${params.id}`),
                api.get(`/customers/${params.id}/related`),
            ]);

            setCustomer(customerRes.data);
            setEditForm(customerRes.data); // sync edit form with latest data
            const details = detailsRes.data;

            setOrders(details.deliveries || []);
            setFiles(details.files || []);
            setNotes(details.notes || []);
            setTasks(details.tasks || []);
            setAuditLogs(details.audit_logs || []);

            // Financial data from invoices
            let total = 0, paid = 0, open = 0, cancelled = 0;
            (details.invoices || []).forEach((inv: any) => {
                if (inv.status === 'cancelled') {
                    cancelled += inv.total_amount || 0;
                } else {
                    total += inv.total_amount || 0;
                    if (inv.status === 'paid') paid += inv.total_amount || 0;
                    else open += inv.total_amount || 0;
                }
            });
            setFinancialData({ total_sales: total, paid, open_balance: open, cancelled });

            // Build unified activity timeline
            const timeline = [
                ...((details.notes || []).map((n: any) => ({ type: 'note', title: 'הערה פנימית', description: n.content, date: n.created_at }))),
                ...((details.deliveries || []).map((d: any) => ({ type: 'order', title: `הזמנה ${d.order_number || '#' + d.id}`, description: d.package_description || d.status, date: d.created_at, amount: d.delivery_fee }))),
                ...((details.payments || []).map((p: any) => ({ type: 'payment', title: 'תשלום התקבל', description: `באמצעות ${p.payment_method || 'העברה בנקאית'}`, date: p.payment_date || p.created_at, amount: p.amount }))),
            ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

            setActivities(timeline);
        } catch (err: any) {
            toast.error('שגיאה בטעינת כרטיס לקוח');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleAddNote = async (content: string) => {
        try {
            await api.post(`/customers/${params.id}/notes`, { content });
            toast.success('הערה נשמרה');
            fetchCustomerData();
        } catch { toast.error('שגיאה בשמירת הערה'); }
    };

    const handleAddOrder = () => router.push(`/admin/orders/create?customer_id=${params.id}`);

    const handleUploadFile = async (file: File) => {
        try {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('title', file.name);

            await api.post(`/customers/${params.id}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' } // Browser forms need this
            });
            toast.success('הקובץ הועלה בהצלחה');
            fetchCustomerData();
        } catch (err: any) {
            toast.error('שגיאה בהעלאת קובץ');
            console.error(err);
        }
    };

    const handleSaveEdit = async () => {
        try {
            await api.put(`/customers/${params.id}`, editForm);
            toast.success('פרטי הלקוח עודכנו');
            setEditOpen(false);
            fetchCustomerData();
        } catch { toast.error('שגיאה בעדכון לקוח'); }
    };

    const handleTaskToggle = async (taskId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
        try {
            await api.patch(`/tasks/${taskId}`, { status: newStatus });
            fetchCustomerData();
        } catch { toast.error('שגיאה בעדכון משימה'); }
    };

    const handleAddTask = async (title: string) => {
        try {
            await api.post('/tasks', { title, customer_id: Number(params.id), priority: 'medium' });
            fetchCustomerData();
        } catch { toast.error('שגיאה ביצירת משימה'); }
    };

    const handleToggleActive = async () => {
        try {
            const res = await api.post(`/customers/${params.id}/toggle-active`);
            toast.success(res.data.message || 'סטטוס לקוח עודכן');
            fetchCustomerData();
        } catch (error: any) {
            console.error("Failed to toggle customer active status", error);
            toast.error(error.response?.data?.error || 'שגיאה בעדכון הסטטוס');
        }
    };

    const handleDeleteCustomer = async () => {
        if (!confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את הלקוח "${customer.full_name}"?\nפעולה זו תמחק גם את פרטי המשתמש שלו ולא ניתנת לביטול.`)) {
            return;
        }
        try {
            await api.delete(`/admin/customers/${params.id}`);
            toast.success("הלקוח נמחק בהצלחה");
            router.push('/admin/customers');
        } catch (error: any) {
            console.error("Failed to delete customer", error);
            toast.error(error.response?.data?.error || "שגיאה במחיקת הלקוח");
        }
    };

    if (loading) {
        return (
            <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: C.muted, fontFamily: "'Heebo', sans-serif" }}>
                    <div style={{
                        width: 40, height: 40, border: `3px solid ${C.border}`,
                        borderTopColor: C.accent, borderRadius: '50%',
                        animation: 'spin 0.8s linear infinite',
                    }} />
                    <div style={{ fontSize: 14 }}>טוען כרטיס לקוח...</div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!customer) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 16, fontFamily: "'Heebo', sans-serif" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>לא נמצא לקוח במערכת.</div>
                <Link href="/admin/customers" style={{ padding: '8px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.soft, fontSize: 14, textDecoration: 'none' }}>
                    חזרה לרשימת הלקוחות
                </Link>
            </div>
        );
    }

    return (
        <>
            {/* Load Heebo font */}
            <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

            <div className="customer-card-app">
                {/* Top Navigation Bar */}
                <nav className="topnav">
                    {/* Logo */}
                    <div className="logo">⬡ CRM</div>

                    {/* Breadcrumb */}
                    <div className="breadcrumb">
                        <Link href="/admin/customers" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                            onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')}
                            onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
                            לקוחות
                        </Link>
                        <span className="sep">›</span>
                        <span>{customer.full_name}</span>
                    </div>

                    {/* Action Buttons */}
                    <div className="topnav-right">
                        {(user?.role === 'admin' || user?.user_type === 'admin') && (
                            <button onClick={handleDeleteCustomer} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                🗑 מחק לקוח
                            </button>
                        )}
                        {(user?.role === 'admin' || user?.user_type === 'admin') && (
                            <button onClick={handleToggleActive} className="btn btn-ghost" style={{ color: customer.is_active ? '#ef4444' : '#10b981', border: '1px solid currentColor' }}>
                                {customer.is_active ? '⏸ השבת לקוח' : '▶ הפעל הצגת לקוח'}
                            </button>
                        )}
                        <a href={customer.email ? `mailto:${customer.email}` : '#'} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                            ✉ שלח מייל
                        </a>
                        <a href={customer.phone ? `tel:${customer.phone}` : '#'} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                            📞 התקשר
                        </a>
                        <button onClick={() => { setEditForm({ ...customer }); setEditOpen(true); }} className="btn btn-primary">
                            ✏ ערוך לקוח
                        </button>
                    </div>
                </nav>

                {/* Main 3-Column Layout */}
                <div className="main">
                    <CustomerInfoPanel customer={customer} />
                    <CustomerActivityTabs
                        customerId={Number(params.id)}
                        activities={activities}
                        orders={orders}
                        notes={notes}
                        files={files}
                        auditLogs={auditLogs}
                        onAddNote={handleAddNote}
                        onAddOrder={handleAddOrder}
                        onUploadFile={handleUploadFile}
                    />
                    <CustomerTasksBoard
                        financialData={financialData}
                        tasks={tasks}
                        onTaskToggle={handleTaskToggle}
                        onAddTask={handleAddTask}
                    />
                </div>

                {/* Edit Modal */}
                {editOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, fontFamily: "'Heebo', sans-serif",
                    }} onClick={() => setEditOpen(false)}>
                        <div style={{
                            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16,
                            padding: 28, width: 520, maxHeight: '85vh', overflowY: 'auto',
                            direction: 'rtl',
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 18, fontWeight: 700, color: C.text, marginBottom: 20 }}>עריכת לקוח</div>

                            {[{ key: 'full_name', label: 'שם מלא' }, { key: 'company_name', label: 'שם חברה' }, { key: 'contact_person', label: 'איש קשר' }, { key: 'email', label: 'אימייל' }, { key: 'phone', label: 'טלפון' }, { key: 'business_id', label: 'ח.פ / ע.מ' }, { key: 'billing_address', label: 'כתובת חיוב' }, { key: 'default_address', label: 'כתובת ברירת מחדל' }, { key: 'website', label: 'אתר אינטרנט' }, { key: 'lead_source', label: 'מקור הגעה' }].map(f => (
                                <div key={f.key} style={{ marginBottom: 14 }}>
                                    <div style={{ fontSize: 11, color: C.muted, marginBottom: 4 }}>{f.label}</div>
                                    <input
                                        value={editForm[f.key] || ''}
                                        onChange={e => setEditForm((prev: any) => ({ ...prev, [f.key]: e.target.value }))}
                                        style={{
                                            width: '100%', background: C.surface2, border: `1px solid ${C.border}`,
                                            borderRadius: 8, padding: '8px 12px', color: C.text,
                                            fontFamily: "'Heebo', sans-serif", fontSize: 13, outline: 'none',
                                            boxSizing: 'border-box',
                                        }}
                                        onFocus={e => (e.target.style.borderColor = C.accent)}
                                        onBlur={e => (e.target.style.borderColor = C.border)}
                                    />
                                </div>
                            ))}

                            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                                <button onClick={() => setEditOpen(false)} style={{
                                    padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                    border: `1px solid ${C.border}`, background: 'transparent', color: C.soft,
                                    fontFamily: "'Heebo', sans-serif",
                                }}>ביטול</button>
                                <button onClick={handleSaveEdit} style={{
                                    padding: '8px 20px', borderRadius: 8, fontSize: 13, cursor: 'pointer',
                                    border: 'none', background: C.accent, color: '#fff',
                                    fontFamily: "'Heebo', sans-serif", fontWeight: 600,
                                }}>שמור</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
