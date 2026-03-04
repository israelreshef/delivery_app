"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { FileDown, Calendar as CalendarIcon, TrendingUp, Package, Users, Wallet } from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { format, subDays } from "date-fns";
import styles from './reports.module.css';

export default function ReportsPage() {
    // Default: Last 30 days
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

    const [loading, setLoading] = useState(false);
    const [summary, setSummary] = useState<any>(null);

    const fetchReport = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/revenue?start_date=${startDate}&end_date=${endDate}`);
            setSummary(res.data);
        } catch (error) {
            toast.error("שגיאה בטעינת דוח");
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async (type: 'orders' | 'revenue') => {
        try {
            const res = await api.get(`/reports/export?type=${type}&start_date=${startDate}&end_date=${endDate}`, {
                responseType: 'blob'
            });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = `report_${type}_${startDate}_${endDate}.csv`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("דוח הורד בהצלחה");
        } catch (error) {
            toast.error("תקלה בתקשורת");
        }
    };

    return (
        <div className={styles.reportsContainer}>
            <header className={styles.headerArea}>
                <h1 className={styles.title}>דוחות ונתונים</h1>
                <p className={styles.subtitle}>הפקת דוחות כספיים ותפעוליים וייצוא לאקסל</p>
            </header>

            <div className={`${styles.panelCard} mb-8`}>
                <div className={styles.panelHeader}>
                    <div className={styles.panelTitle}>סינון טווח תאריכים</div>
                </div>
                <div className={styles.panelContent}>
                    <div className="flex flex-col md:flex-row gap-4 items-end">
                        <div className="grid gap-2">
                            <span className={styles.formLabel}>תאריך התחלה</span>
                            <input
                                type="date"
                                className={styles.searchInput}
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                            />
                        </div>
                        <div className="grid gap-2">
                            <span className={styles.formLabel}>תאריך סיום</span>
                            <input
                                type="date"
                                className={styles.searchInput}
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                            />
                        </div>
                        <button onClick={fetchReport} disabled={loading} className={styles.btnPrimary}>
                            <CalendarIcon className="w-4 h-4" />
                            הפק דוח
                        </button>
                    </div>
                </div>
            </div>

            {summary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                    <div className={styles.panelCard} style={{ borderColor: 'rgba(59, 130, 246, 0.3)', backgroundColor: 'rgba(59, 130, 246, 0.05)' }}>
                        <div className={styles.panelHeader} style={{ paddingBottom: '0.75rem', borderBottom: 'none' }}>
                            <div className={styles.panelTitle} style={{ fontSize: '1.125rem', color: '#60A5FA' }}>
                                <TrendingUp className="w-5 h-5" />
                                סה"כ הכנסות
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ paddingTop: 0 }}>
                            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: '#3B82F6' }}>₪{summary.total_revenue?.toLocaleString()}</div>
                            <p style={{ fontSize: '0.875rem', color: '#94A3B8', marginTop: '0.25rem' }}>לתקופה הנבחרת</p>
                        </div>
                    </div>

                    <div className={styles.panelCard} style={{ borderColor: 'rgba(16, 185, 129, 0.3)', backgroundColor: 'rgba(16, 185, 129, 0.05)' }}>
                        <div className={styles.panelHeader} style={{ paddingBottom: '0.75rem', borderBottom: 'none' }}>
                            <div className={styles.panelTitle} style={{ fontSize: '1.125rem', color: '#34D399' }}>
                                <Package className="w-5 h-5" />
                                נתוני יצוא
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ paddingTop: 0, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            <button className={styles.btnOutline} style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => handleDownload('orders')}>
                                <FileDown className="w-4 h-4 text-emerald-400" />
                                ייצוא רשימת הזמנות (CSV)
                            </button>
                            <button className={styles.btnOutline} style={{ width: '100%', justifyContent: 'flex-start', backgroundColor: 'rgba(0,0,0,0.2)' }} onClick={() => handleDownload('revenue')}>
                                <FileDown className="w-4 h-4 text-emerald-400" />
                                ייצוא דוח הכנסות (CSV)
                            </button>
                        </div>
                    </div>

                    <div className={styles.panelCard} style={{ borderColor: 'rgba(168, 85, 247, 0.3)', backgroundColor: 'rgba(168, 85, 247, 0.05)' }}>
                        <div className={styles.panelHeader} style={{ paddingBottom: '0.75rem', borderBottom: 'none' }}>
                            <div className={styles.panelTitle} style={{ fontSize: '1.125rem', color: '#C084FC' }}>
                                <Users className="w-5 h-5" />
                                נתוני שימוש (בקרוב)
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ paddingTop: 0 }}>
                            <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>דוחות ביצועי שליחים וזמני אספקה יהיו זמינים בקרוב.</p>
                        </div>
                    </div>
                </div>
            )}

            <div className="mt-8">
                <h2 className={styles.sectionTitle}>דוחות חוקיים ורגולציה</h2>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className={styles.panelCard} style={{ borderColor: 'rgba(59, 130, 246, 0.5)' }}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle} style={{ fontSize: '1rem' }}>
                                <Wallet className="w-4 h-4 text-blue-400" />
                                מרכז פיננסי לשליח
                            </div>
                        </div>
                        <div className={styles.panelContent}>
                            <p style={{ fontSize: '0.75rem', color: '#94A3B8', marginBottom: '1rem' }}>ניהול מע"מ, דו"ח שנתי וביטוח לאומי באופן עצמאי במערכת.</p>
                            <Link href="/admin/reports/courier-finance" style={{ textDecoration: 'none' }}>
                                <button className={styles.btnPrimary} style={{ width: '100%' }}>כניסה למרכז הפיננסי</button>
                            </Link>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle} style={{ fontSize: '1rem' }}>דוח מע"מ</div>
                        </div>
                        <div className={styles.panelContent}>
                            <button className={styles.btnOutline} style={{ width: '100%' }} onClick={() => handleDownload('revenue')}>הורד למחשב</button>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle} style={{ fontSize: '1rem' }}>ריכוז חשבוניות</div>
                        </div>
                        <div className={styles.panelContent}>
                            <button className={styles.btnOutline} style={{ width: '100%' }} onClick={() => handleDownload('revenue')}>הורד למחשב</button>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle} style={{ fontSize: '1rem' }}>101 שליחים</div>
                        </div>
                        <div className={styles.panelContent}>
                            <button className={styles.btnOutline} style={{ width: '100%' }} disabled>בקרוב</button>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle} style={{ fontSize: '1rem' }}>ביטוחים ורישיונות</div>
                        </div>
                        <div className={styles.panelContent}>
                            <button className={styles.btnOutline} style={{ width: '100%' }} disabled>בקרוב</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
