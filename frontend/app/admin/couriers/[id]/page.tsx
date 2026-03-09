'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
// Reusing the exact same dark-mode layout CSS from the customer card for absolute consistency!
import '../../customers/[id]/customer-card.css';

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

export default function CourierCardPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const { user } = useAuth();
    const [courier, setCourier] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [deliveries, setDeliveries] = useState<any[]>([]);
    const [gamification, setGamification] = useState<any>({});
    const [activeShift, setActiveShift] = useState<any>({});

    // UI state
    const [activeTab, setActiveTab] = useState('missions');
    const [editOpen, setEditOpen] = useState(false);
    const [editForm, setEditForm] = useState<any>({});

    useEffect(() => {
        fetchCourierData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [params.id]);

    const fetchCourierData = async () => {
        try {
            setLoading(true);
            const res = await api.get(`/couriers/${params.id}/related`);
            const data = res.data;

            setCourier(data.courier);
            setEditForm(data.courier);
            setDeliveries(data.deliveries || []);
            setGamification(data.gamification || {});
            setActiveShift(data.active_shift || {});
        } catch (err: any) {
            toast.error('שגיאה בטעינת כרטיס שליח');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveEdit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.put(`/couriers/${courier.id}`, editForm);
            toast.success('פרטי השליח עודכנו בהצלחה');
            setEditOpen(false);
            fetchCourierData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || 'שגיאה בעדכון השליח');
            console.error(err);
        }
    };

    const handleDeleteCourier = async () => {
        if (!confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את השליח "${courier.full_name}"?\nפעולה זו תמחק גם את פרטי המשתמש שלו ולא ניתנת לביטול.`)) {
            return;
        }
        try {
            await api.delete(`/admin/couriers/${params.id}`);
            toast.success("השליח נמחק בהצלחה");
            router.push('/admin/couriers');
        } catch (error: any) {
            console.error("Failed to delete courier", error);
            toast.error(error.response?.data?.error || "שגיאה במחיקת השליח");
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
                    <div style={{ fontSize: 14 }}>טוען כרטיס שליח...</div>
                </div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!courier) {
        return (
            <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, gap: 16, fontFamily: "'Heebo', sans-serif" }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: C.text }}>לא נמצא שליח במערכת.</div>
                <Link href="/admin/couriers" style={{ padding: '8px 16px', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, color: C.soft, fontSize: 14, textDecoration: 'none' }}>
                    חזרה לרשימת השליחים
                </Link>
            </div>
        );
    }

    return (
        <>
            <link href="https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />

            <div className="customer-card-app">
                {/* Top Navigation Bar */}
                <nav className="topnav">
                    <div className="logo">⬡ CRM</div>
                    <div className="breadcrumb">
                        <Link href="/admin/couriers" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                            onMouseOver={e => (e.currentTarget.style.color = 'var(--text)')}
                            onMouseOut={e => (e.currentTarget.style.color = 'var(--muted)')}>
                            שליחים
                        </Link>
                        <span className="sep">›</span>
                        <span>{courier.full_name}</span>
                    </div>

                    <div className="topnav-right">
                        {(user?.role === 'admin' || user?.user_type === 'admin') && (
                            <button onClick={handleDeleteCourier} className="btn" style={{ background: '#ef4444', color: 'white', border: 'none' }}>
                                🗑 מחק שליח
                            </button>
                        )}
                        <a href={courier.email ? `mailto:${courier.email}` : '#'} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                            ✉ שלח מייל
                        </a>
                        <a href={courier.phone ? `tel:${courier.phone}` : '#'} className="btn btn-ghost" style={{ textDecoration: 'none' }}>
                            📞 התקשר
                        </a>
                        <button onClick={() => { setEditForm({ ...courier }); setEditOpen(true); }} className="btn btn-primary">
                            ✏ ערוך שליח
                        </button>
                    </div>
                </nav>

                <div className="main">
                    {/* Column 1: Courier Info Panel */}
                    <div className="panel info-panel">
                        <div className="info-header" style={{ marginBottom: 20 }}>
                            <div style={{ position: 'relative', display: 'inline-block' }}>
                                <div style={{
                                    width: 64, height: 64, borderRadius: 16, background: 'linear-gradient(135deg, var(--surface3), var(--surface2))',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    border: '1px solid var(--border)', fontSize: 24, marginBottom: 16, color: '#fff'
                                }}>
                                    🛵
                                </div>
                                {courier.is_available && (
                                    <div style={{
                                        position: 'absolute', bottom: 12, right: -4, width: 14, height: 14,
                                        background: 'var(--green)', borderRadius: '50%',
                                        border: '3px solid var(--surface)'
                                    }} />
                                )}
                            </div>
                            <h1 style={{ fontSize: 22, fontWeight: 700, margin: '0 0 6px 0', color: '#fff' }}>{courier.full_name}</h1>
                            <div style={{ fontSize: 13, color: 'var(--accent)', fontWeight: 500 }}>
                                שליח {courier.onboarding_status === 'active' ? 'פעיל' : 'בגיוס'} • {courier.is_available ? 'זמין למשלוחים' : 'לא זמין'}
                            </div>
                        </div>

                        {/* Gorgeous Metric Grid */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
                            <div style={{ background: 'linear-gradient(145deg, var(--surface2), var(--surface))', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--amber)', marginBottom: 4 }}>⭐ {courier.rating?.toFixed(1) || '5.0'}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>דירוג ממוצע</div>
                            </div>
                            <div style={{ background: 'linear-gradient(145deg, var(--surface2), var(--surface))', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--green)', marginBottom: 4 }}>{courier.total_deliveries}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>סה"כ מסירות</div>
                            </div>
                            <div style={{ background: 'linear-gradient(145deg, var(--surface2), var(--surface))', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>רמה {gamification?.level || 1}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>טיר (Tier) נוכחי</div>
                            </div>
                            <div style={{ background: 'linear-gradient(145deg, var(--surface2), var(--surface))', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}>
                                <div style={{ fontSize: 22, fontWeight: 700, color: '#a78bfa', marginBottom: 4 }}>{gamification?.xp || 0}</div>
                                <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 500 }}>נקודות ניסיון (XP)</div>
                            </div>
                        </div>

                        {/* Contact Info Card */}
                        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700, margin: '0 0 16px 0' }}>פרטי קשר מקושרים</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79, 110, 247, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>📱</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{courier.phone || 'לא הוגדר טלפון'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>מספר פלאפון נייד</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(79, 110, 247, 0.1)', color: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>✉</div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{courier.email || 'לא הוגדר אימייל'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>דואר אלקטרוני רשמי</div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Vehicle Data Card */}
                        <div style={{ background: 'var(--surface2)', borderRadius: 12, padding: 16, border: '1px solid var(--border)', marginBottom: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
                            <h3 style={{ fontSize: 13, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 16, fontWeight: 700, margin: '0 0 16px 0' }}>ציוד ורכב</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>
                                        {courier.vehicle_type === 'motorcycle' ? '🛵' : courier.vehicle_type === 'car' ? '🚘' : courier.vehicle_type === 'bicycle' ? '🚲' : '🚚'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                                            {courier.vehicle_type === 'motorcycle' ? 'קטנוע' : courier.vehicle_type === 'car' ? 'רכב פרטי' : courier.vehicle_type === 'bicycle' ? 'אופניים משלוחים' : courier.vehicle_type}
                                        </div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>סוג רכב פלטפורמה</div>
                                    </div>
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(16, 185, 129, 0.1)', color: 'var(--green)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 800 }}>
                                        {courier.license_plate ? courier.license_plate.substring(0, 2) : '-'}
                                    </div>
                                    <div>
                                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', letterSpacing: 1 }}>{courier.license_plate || 'לא הוזנה לוחית'}</div>
                                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>מספר לוחית רישוי</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Dashboard & Missions */}
                    <div className="panel center-panel">
                        <div className="tabs">
                            <div className={`tab ${activeTab === 'missions' ? 'active' : ''}`} onClick={() => setActiveTab('missions')}>היסטוריית משימות</div>
                            <div className={`tab ${activeTab === 'stats' ? 'active' : ''}`} onClick={() => setActiveTab('stats')}>סטטיסטיקות</div>
                        </div>

                        <div className="tab-content" style={{ display: activeTab === 'missions' ? 'block' : 'none' }}>
                            <div className="action-bar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ fontSize: 15, fontWeight: 600 }}>מסירות אחרונות ({deliveries.length})</div>
                            </div>
                            <div className="timeline">
                                {deliveries.length === 0 ? (
                                    <div className="empty-state">לא נמצאו משימות לשליח זה.</div>
                                ) : (
                                    deliveries.map((delivery, i) => (
                                        <div key={i} className="timeline-item">
                                            <div className="t-icon" style={{ background: delivery.status === 'delivered' ? 'rgba(16,185,129,0.1)' : 'rgba(79,110,247,0.1)', color: delivery.status === 'delivered' ? 'var(--green)' : 'var(--accent)' }}>📦</div>
                                            <div className="t-content">
                                                <div className="t-header">
                                                    <span className="t-title">הזמנה #{delivery.order_number || delivery.id}</span>
                                                    <span className="t-date">{delivery.timestamp ? new Date(delivery.timestamp).toLocaleDateString('he-IL') : ''}</span>
                                                </div>
                                                <div className="t-desc">
                                                    {delivery.pickup} ➔ {delivery.dropoff}
                                                </div>
                                                <div className="t-footer">
                                                    <span className="t-badge" style={{ color: delivery.status === 'delivered' ? 'var(--green)' : 'var(--accent)', borderColor: delivery.status === 'delivered' ? 'rgba(16,185,129,0.3)' : 'rgba(79,110,247,0.3)' }}>
                                                        {delivery.status}
                                                    </span>
                                                    {delivery.amount > 0 && <span style={{ fontSize: 12, color: 'var(--text)', fontWeight: 500 }}>₪{delivery.amount.toFixed(2)} שכר</span>}
                                                </div>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        <div className="tab-content" style={{ display: activeTab === 'stats' ? 'block' : 'none', padding: 24 }}>
                            <div className="action-bar">
                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>סיכום פיננסי ורווחים</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16, marginBottom: 24 }}>
                                <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>סה״כ הכנסות ממשלוחים</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--green)', margin: '8px 0' }}>
                                        ₪{deliveries.filter(d => d.status === 'delivered').reduce((sum, d) => sum + (d.amount || 0), 0).toFixed(2)}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>מבוסס על משלוחים שהושלמו בהצלחה</div>
                                </div>
                                <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>ממוצע למשלוח</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--accent)', margin: '8px 0' }}>
                                        ₪{deliveries.filter(d => d.status === 'delivered').length > 0 ? (deliveries.filter(d => d.status === 'delivered').reduce((sum, d) => sum + (d.amount || 0), 0) / deliveries.filter(d => d.status === 'delivered').length).toFixed(2) : '0.00'}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>רווח ממוצע לכל משלוח מוצלח</div>
                                </div>
                            </div>

                            <div className="action-bar">
                                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>מדדי יעילות</div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)', gap: 16 }}>
                                <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>אחוז הצלחה (השלמת משלוחים)</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text)', margin: '8px 0' }}>
                                        {deliveries.length > 0 ? Math.round((deliveries.filter(d => d.status === 'delivered').length / deliveries.length) * 100) : 0}%
                                    </div>
                                    <div style={{ width: '100%', height: 4, background: 'var(--surface)', borderRadius: 2 }}>
                                        <div style={{ width: `${deliveries.length > 0 ? Math.round((deliveries.filter(d => d.status === 'delivered').length / deliveries.length) * 100) : 0}%`, height: '100%', background: 'var(--accent)', borderRadius: 2 }} />
                                    </div>
                                </div>
                                <div style={{ background: 'var(--surface2)', padding: 20, borderRadius: 12, border: '1px solid var(--border)' }}>
                                    <div style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>כמות משלוחים שבוטלו/נדחו</div>
                                    <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--amber)', margin: '8px 0' }}>
                                        {deliveries.filter(d => d.status === 'cancelled' || d.status === 'failed').length}
                                    </div>
                                    <div style={{ fontSize: 12, color: 'var(--soft)' }}>משלוחים שלא הושלמו</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Column 3: Active Shift / Gamification Board */}
                    <div className="panel side-panel">
                        <div className="task-board-header">
                            <h2>סטטוס משמרת נוכחית</h2>
                        </div>
                        <div className="task-list">
                            {activeShift.is_active ? (
                                <div className="task-item" style={{ borderLeftColor: 'var(--green)', padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                                        <span style={{ fontSize: 18 }}>🟢</span>
                                        <span style={{ fontWeight: 600, color: 'var(--green)' }}>משמרת פעילה</span>
                                    </div>
                                    <div style={{ fontSize: 13, color: 'var(--soft)', marginBottom: 8 }}>
                                        החלה ב: {new Date(activeShift.start_time).toLocaleTimeString('he-IL')}
                                    </div>
                                    <div style={{ fontSize: 13, background: 'var(--surface)', padding: '6px 10px', borderRadius: 6, display: 'inline-block' }}>
                                        וייב: {activeShift.vibe === 'energetic' ? '⚡ אנרגטי' : activeShift.vibe === 'chill' ? '🧘 רגוע' : '🎯 רגיל'}
                                    </div>
                                </div>
                            ) : (
                                <div className="task-item" style={{ borderLeftColor: 'var(--muted)', padding: 16 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                        <span style={{ fontSize: 18 }}>⭕</span>
                                        <span style={{ fontWeight: 600, color: 'var(--muted)' }}>שליח אינו במשמרת</span>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="task-board-header" style={{ marginTop: 32 }}>
                            <h2>מדדי ביצוע (Performance)</h2>
                        </div>
                        <div className="task-list">
                            <div className="task-item" style={{ borderLeftColor: 'var(--accent2)' }}>
                                <div className="t-row">
                                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>מדד אמינות הגעה</span>
                                    <span style={{ fontSize: 13, color: 'var(--accent2)' }}>{Math.min(100, (courier.total_deliveries || 1) * 2)}%</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${Math.min(100, (courier.total_deliveries || 1) * 2)}%`, height: '100%', background: 'var(--accent2)' }} />
                                </div>
                            </div>
                            <div className="task-item" style={{ borderLeftColor: 'var(--accent)' }}>
                                <div className="t-row">
                                    <span style={{ fontSize: 13, color: 'var(--text)', fontWeight: 500 }}>דירוג לקוחות (CSAT)</span>
                                    <span style={{ fontSize: 13, color: 'var(--accent)' }}>{(courier.rating || 5.0).toFixed(1)}/5.0</span>
                                </div>
                                <div style={{ height: 4, background: 'var(--surface)', borderRadius: 2, marginTop: 8, overflow: 'hidden' }}>
                                    <div style={{ width: `${((courier.rating || 5) / 5) * 100}%`, height: '100%', background: 'var(--accent)' }} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Edit Modal Component */}
                {editOpen && (
                    <div style={{
                        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        zIndex: 1000, fontFamily: "'Heebo', sans-serif",
                    }} onClick={() => setEditOpen(false)}>
                        <div style={{
                            background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16,
                            padding: 32, width: 480, direction: 'rtl', boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
                            maxHeight: '90vh', overflowY: 'auto'
                        }} onClick={e => e.stopPropagation()}>
                            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 16 }}>
                                ✏ עריכת פרטי שליח
                            </div>

                            <form onSubmit={handleSaveEdit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                                <div>
                                    <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>שם מלא</label>
                                    <input
                                        type="text"
                                        value={editForm.full_name || ''}
                                        onChange={e => setEditForm({ ...editForm, full_name: e.target.value })}
                                        style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
                                        required
                                    />
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>טלפון (משתמש מערכת)</label>
                                        <input
                                            type="tel"
                                            value={editForm.phone || ''}
                                            onChange={e => setEditForm({ ...editForm, phone: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
                                        />
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>אימייל (משתמש מערכת)</label>
                                        <input
                                            type="email"
                                            value={editForm.email || ''}
                                            onChange={e => setEditForm({ ...editForm, email: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>סוג רכב</label>
                                        <select
                                            value={editForm.vehicle_type || 'motorcycle'}
                                            onChange={e => setEditForm({ ...editForm, vehicle_type: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, WebkitAppearance: 'none' }}
                                        >
                                            <option value="motorcycle">קטנוע 🛵</option>
                                            <option value="car">רכב פרטי 🚘</option>
                                            <option value="bicycle">אופניים 🚲</option>
                                            <option value="truck">משאית קלה 🚚</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>לוחית רישוי</label>
                                        <input
                                            type="text"
                                            value={editForm.license_plate || ''}
                                            onChange={e => setEditForm({ ...editForm, license_plate: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, direction: 'ltr' }}
                                        />
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>זמינות עבודה למשלוחים</label>
                                        <select
                                            value={editForm.is_available ? 'true' : 'false'}
                                            onChange={e => setEditForm({ ...editForm, is_available: e.target.value === 'true' })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, WebkitAppearance: 'none' }}
                                        >
                                            <option value="true">זמין (מרחב קליטת קריאות)</option>
                                            <option value="false">לא זמין (מנותק / הפסקה)</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label style={{ display: 'block', fontSize: 13, color: 'var(--soft)', marginBottom: 6, fontWeight: 500 }}>סטטוס קליטה (Onboarding)</label>
                                        <select
                                            value={editForm.onboarding_status || 'active'}
                                            onChange={e => setEditForm({ ...editForm, onboarding_status: e.target.value })}
                                            style={{ width: '100%', padding: '10px 14px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, WebkitAppearance: 'none' }}
                                        >
                                            <option value="active">פעיל ✅</option>
                                            <option value="pending_docs">ממתין להעלאת מסמכים ⏳</option>
                                            <option value="blocked">חסום 🛑</option>
                                        </select>
                                    </div>
                                </div>

                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                                    <button type="button" onClick={() => setEditOpen(false)} style={{
                                        padding: '10px 20px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                                        border: '1px solid var(--border)', background: 'transparent', color: 'var(--text)', fontWeight: 500,
                                    }}>ביטול</button>

                                    <button type="submit" style={{
                                        padding: '10px 24px', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                                        border: 'none', background: 'var(--accent)', color: '#fff', fontWeight: 600,
                                    }}>שמור שינויים</button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </>
    );
}
