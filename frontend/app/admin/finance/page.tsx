"use client";

import { useState, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    DollarSign,
    FileText,
    TrendingUp,
    TrendingDown,
    Calendar,
    Download,
    Users,
    Briefcase,
    ShieldCheck,
    Receipt,
    Upload,
    Archive,
    FileUp
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell
} from 'recharts';
import LoadingSpinner from "@/components/ui/loading-spinner";
import styles from './finance.module.css';

export default function AdminFinancePage() {
    const [month, setMonth] = useState(new Date().getMonth() + 1);
    const [year, setYear] = useState(new Date().getFullYear());
    const [loading, setLoading] = useState(true);
    const [financeData, setFinanceData] = useState<any>(null);

    const [docs, setDocs] = useState<any[]>([]);
    const [docLoading, setDocLoading] = useState(false);
    const [docUploading, setDocUploading] = useState(false);
    const [docFile, setDocFile] = useState<File | null>(null);
    const [docSearch, setDocSearch] = useState("");
    const [docFilterType, setDocFilterType] = useState("all");
    const [docFilterStatus, setDocFilterStatus] = useState("all");
    const [docFilterYear, setDocFilterYear] = useState("all");
    const [docFilterDue, setDocFilterDue] = useState("all");
    const [alerts, setAlerts] = useState<{ overdue: any[]; due_soon: any[]; overdue_count: number; due_soon_count: number; days: number } | null>(null);
    const uploadRef = useRef<HTMLDivElement>(null);
    const [docForm, setDocForm] = useState({
        title: "",
        doc_type: "expense_receipt",
        authority: "tax_authority",
        submitted_by: "self",
        entity_type: "sole_prop",
        status: "archived",
        year: new Date().getFullYear().toString(),
        period: "",
        due_date: "",
        filed_date: "",
        amount_due: "",
        description: ""
    });

    const fetchFinanceData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/reports/financial-overview?month=${month}&year=${year}`);
            setFinanceData(res.data);
        } catch (error) {
            toast.error("שגיאה בטעינת נתונים פיננסיים");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFinanceData();
    }, [month, year]);

    const fetchDocs = async () => {
        setDocLoading(true);
        try {
            const res = await api.get("/finances/documents");
            setDocs(res.data || []);
        } catch (error) {
            toast.error("שגיאה בטעינת מסמכים פיננסיים");
        } finally {
            setDocLoading(false);
        }
    };

    useEffect(() => {
        fetchDocs();
    }, []);

    const fetchAlerts = async () => {
        try {
            const res = await api.get("/finances/documents/alerts?days=30");
            setAlerts(res.data);
            if (res.data.overdue_count > 0) {
                toast.error(`יש ${res.data.overdue_count} מסמכים באיחור`);
            }
            if (res.data.due_soon_count > 0) {
                toast.info(`יש ${res.data.due_soon_count} מסמכים ב-30 ימים הקרובים`);
            }
        } catch {
            // ignore alerts failure
        }
    };

    useEffect(() => {
        fetchAlerts();
    }, []);

    const handleDownload = async (endpoint: string, filename: string) => {
        try {
            const res = await api.get(`/reports/${endpoint}?month=${month}&year=${year}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            toast.success("הדו\"ח הופק בהצלחה");
        } catch (error) {
            toast.error("שגיאה בהורדת הדו\"ח");
        }
    };

    const complianceItems = [
        {
            id: "income_tax_annual",
            title: "דוח שנתי מס הכנסה (טופס 1301)",
            authority: "tax_authority",
            submitted_by: "accountant",
            doc_type: "income_tax",
            frequency: "שנתי",
            notes: "דוח שנתי לבעלי תיק מס הכנסה (עצמאים)."
        },
        {
            id: "income_tax_advances",
            title: "מקדמות מס הכנסה",
            authority: "tax_authority",
            submitted_by: "self",
            doc_type: "tax_report",
            frequency: "חודשי/דו־חודשי",
            notes: "דיווח ותשלום מקדמות מס במהלך השנה."
        },
        {
            id: "vat_periodic",
            title: "דיווח מע״מ תקופתי",
            authority: "vat",
            submitted_by: "accountant",
            doc_type: "tax_report",
            frequency: "חודשי/דו־חודשי",
            notes: "לעוסק מורשה/תיק מע״מ פעיל."
        },
        {
            id: "national_insurance_advances",
            title: "דיווח/תשלום ביטוח לאומי לעצמאים",
            authority: "national_insurance",
            submitted_by: "self",
            doc_type: "national_insurance",
            frequency: "חודשי/תקופתי",
            notes: "תשלומי מקדמות ודיווחי שינוי הכנסה."
        },
        {
            id: "withholding_856",
            title: "טופס 856/ניכויים לספקים וקבלנים",
            authority: "tax_authority",
            submitted_by: "accountant",
            doc_type: "tax_report",
            frequency: "שנתי",
            notes: "במידה ומנכים מס במקור לספקים/קבלנים."
        },
        {
            id: "debt_notices",
            title: "דרישות תשלום וחובות לרשויות",
            authority: "tax_authority",
            submitted_by: "self",
            doc_type: "debt_notice",
            frequency: "לפי צורך",
            notes: "ארכוב דרישות תשלום, קנסות, והשגות."
        }
    ];

    const handleDocUpload = async () => {
        if (!docFile) {
            toast.error("בחר קובץ להעלאה");
            return;
        }

        setDocUploading(true);
        try {
            const formData = new FormData();
            formData.append("file", docFile);
            Object.entries(docForm).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== "") {
                    formData.append(key, value as string);
                }
            });

            await api.post("/finances/documents", formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });

            toast.success("המסמך הועלה ונשמר בארכיון");
            setDocFile(null);
            setDocForm({
                title: "",
                doc_type: "expense_receipt",
                authority: "tax_authority",
                submitted_by: "self",
                entity_type: "sole_prop",
                status: "archived",
                year: new Date().getFullYear().toString(),
                period: "",
                due_date: "",
                filed_date: "",
                amount_due: "",
                description: ""
            });
            fetchDocs();
        } catch (error) {
            toast.error("שגיאה בהעלאת המסמך");
        } finally {
            setDocUploading(false);
        }
    };

    const handleDownloadDoc = async (docId: number, filename: string) => {
        try {
            const res = await api.get(`/finances/documents/${docId}/download`, { responseType: "blob" });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement("a");
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
        } catch (error) {
            toast.error("שגיאה בהורדת המסמך");
        }
    };

    const updateDocStatus = async (docId: number, status: string) => {
        try {
            await api.put(`/finances/documents/${docId}`, { status });
            setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, status } : d)));
            toast.success("הסטטוס עודכן");
        } catch {
            toast.error("שגיאה בעדכון סטטוס");
        }
    };

    const updateDocFiledDate = async (docId: number, filed_date: string) => {
        try {
            await api.put(`/finances/documents/${docId}`, { filed_date });
            setDocs((prev) => prev.map((d) => (d.id === docId ? { ...d, filed_date } : d)));
            toast.success("תאריך ההגשה עודכן");
        } catch {
            toast.error("שגיאה בעדכון תאריך הגשה");
        }
    };

    const today = new Date();
    const inDays = (dateStr: string, days: number) => {
        const d = new Date(dateStr);
        const diff = d.getTime() - today.getTime();
        return diff >= 0 && diff <= days * 24 * 60 * 60 * 1000;
    };

    const filteredDocs = docs.filter((doc) => {
        const text = docSearch.trim().toLowerCase();
        const matchesText =
            !text ||
            `${doc.title || ""} ${doc.description || ""} ${doc.doc_type || ""} ${doc.authority || ""}`
                .toLowerCase()
                .includes(text);
        const matchesType = docFilterType === "all" || doc.doc_type === docFilterType;
        const matchesStatus = docFilterStatus === "all" || doc.status === docFilterStatus;
        const matchesYear = docFilterYear === "all" || String(doc.year || "") === docFilterYear;
        const matchesDue =
            docFilterDue === "all" ||
            (docFilterDue === "overdue" && doc.due_date && new Date(doc.due_date) < today) ||
            (docFilterDue === "due_30" && doc.due_date && inDays(doc.due_date, 30));

        return matchesText && matchesType && matchesStatus && matchesYear && matchesDue;
    });

    const overdueCount = docs.filter((d) => d.due_date && new Date(d.due_date) < today && d.status !== "accepted").length;
    const dueSoonCount = docs.filter((d) => d.due_date && inDays(d.due_date, 30) && d.status !== "accepted").length;

    if (loading && !financeData) return <div className="flex h-screen items-center justify-center bg-[#0B0E14] text-white"><LoadingSpinner size="lg" text="טוען נתונים פיננסיים..." /></div>;

    const COLORS = ['#10b981', '#ef4444', '#f59e0b', '#3b82f6'];

    return (
        <div className={styles.financeContainer}>
            <header className={styles.headerArea}>
                <div>
                    <h1 className={styles.title}>מרכז פיננסי - ציר לוגיסטיקה</h1>
                    <p className={styles.subtitle}>ניהול הכנסות, הוצאות, קבלנים ודיווחים רגולטוריים</p>
                </div>
                <div className={styles.headerActions}>
                    <div className="flex items-center gap-2 bg-slate-800 p-2 rounded-lg border border-slate-700">
                        <Calendar className="w-4 h-4 text-slate-400" />
                        <select
                            value={month}
                            onChange={(e) => setMonth(parseInt(e.target.value))}
                            className="text-sm font-medium bg-transparent text-white focus:outline-none"
                            title="בחר חודש"
                        >
                            {Array.from({ length: 12 }, (_, i) => (
                                <option key={i + 1} value={i + 1} className="bg-slate-800 text-white">{format(new Date(2024, i, 1), 'MMMM')}</option>
                            ))}
                        </select>
                        <select
                            value={year}
                            onChange={(e) => setYear(parseInt(e.target.value))}
                            className="text-sm font-medium bg-transparent text-white focus:outline-none"
                            title="בחר שנה"
                        >
                            {[2024, 2025, 2026].map(y => (
                                <option key={y} value={y} className="bg-slate-800 text-white">{y}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </header>

            {/* Top Stats Cards */}
            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>סה"כ הכנסות (ברוטו)</div>
                        <div className={styles.metricValue}>₪{financeData?.revenue.gross.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-1">נטו: ₪{financeData?.revenue.net.toLocaleString()}</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconGreen}`}>
                        <TrendingUp size={24} />
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>סה"כ הוצאות (ברוטו)</div>
                        <div className={styles.metricValue}>₪{financeData?.expenses.gross.toLocaleString()}</div>
                        <p className="text-xs text-slate-400 mt-1">כולל ניכוי מס: ₪{financeData?.expenses.withholding.toLocaleString()}</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconRed}`}>
                        <TrendingDown size={24} />
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>רווח תפעולי</div>
                        <div className={`text-2xl font-bold ${financeData?.profit_loss >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                            ₪{financeData?.profit_loss.toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">לפני מס חברות</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconBlue}`}>
                        <DollarSign size={24} />
                    </div>
                </div>

                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>מע"מ לתשלום/החזר</div>
                        <div className={styles.metricValue}>
                            ₪{(financeData?.revenue.vat - financeData?.expenses.vat).toLocaleString()}
                        </div>
                        <p className="text-xs text-slate-400 mt-1">צפי לדיווח {month}/{year}</p>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconOrange}`}>
                        <ShieldCheck size={24} />
                    </div>
                </div>
            </div>

            {/* Reports Section */}
            <div className={`${styles.sectionGrid} ${styles.sectionGrid3}`}>
                {/* Visualizations Column */}
                <div className={styles.colSpan2}>
                    <div className={`${styles.panelCard} mb-6`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelTitle}>התפלגות כספית</div>
                                <div className={styles.panelDescription}>השוואה בין הכנסות להוצאות ותזרימי המזומנים</div>
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ height: '300px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={[
                                    { name: 'הכנסות', amount: financeData?.revenue.net, fill: '#10b981' },
                                    { name: 'הוצאות', amount: financeData?.expenses.net, fill: '#ef4444' },
                                    { name: 'רווח נקי', amount: financeData?.profit_loss, fill: '#3b82f6' }
                                ]}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.1)" />
                                    <XAxis dataKey="name" axisLine={false} tickLine={false} stroke="#94A3B8" />
                                    <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₪${v / 1000}k`} stroke="#94A3B8" />
                                    <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                    <Bar dataKey="amount" radius={[4, 4, 0, 0]} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    <div className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div className={styles.panelTitle}>הוצאות לפי קבוצות (קבלנים vs ספקים)</div>
                        </div>
                        <div className={styles.panelContent} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '250px' }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={[
                                            { name: 'קבלני משנה (שליחים)', value: financeData?.expenses.net * 0.7 },
                                            { name: 'תפעול ומשרד', value: financeData?.expenses.net * 0.3 }
                                        ]}
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        <Cell fill="#6366f1" />
                                        <Cell fill="#94a3b8" />
                                    </Pie>
                                    <Tooltip contentStyle={{ backgroundColor: '#1E293B', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex flex-col gap-2 ml-8">
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#6366f1] rounded-full"></div>
                                    <span className="text-sm font-medium text-slate-300">קבלנים (70%)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-3 h-3 bg-[#94a3b8] rounded-full"></div>
                                    <span className="text-sm font-medium text-slate-300">ספקים (30%)</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Report Generation Column */}
                <div className="space-y-6">
                    <div className={styles.panelCard} style={{ borderTop: '4px solid #3B82F6' }}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelTitle}>דיווחים רגולטוריים</div>
                                <div className={styles.panelDescription}>הפקת קבצים לרשות המסים וביטוח לאומי</div>
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className={styles.reportItem}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <FileText className="w-4 h-4 text-brand" />
                                        <span className="font-semibold text-sm">דיווח מע"מ PCN 874</span>
                                    </div>
                                    <button className={styles.btnOutline} onClick={() => handleDownload('vat-pcn874', `PCN874_${year}_${month}.csv`)}>
                                        <Download className="w-4 h-4 text-brand" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">קובץ תקני לשידור מקוון למע"מ (עסקאות ותשומות).</p>
                            </div>

                            <div className={styles.reportItem}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <Users className="w-4 h-4 text-purple-400" />
                                        <span className="font-semibold text-sm">דו"ח 856 (קבלני משנה)</span>
                                    </div>
                                    <button className={styles.btnOutline} onClick={() => handleDownload('contractors-856', `Report856_${year}.csv`)}>
                                        <Download className="w-4 h-4 text-purple-400" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">ריכוז תשלומים וניכוי מס במקור לשליחים עצמאיים.</p>
                            </div>

                            <div className={styles.reportItem}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <Briefcase className="w-4 h-4 text-green-400" />
                                        <span className="font-semibold text-sm">מאזן בוחן (Trial Balance)</span>
                                    </div>
                                    <button className={styles.btnOutline} onClick={() => handleDownload('regulatory', `TrialBalance_${year}_${month}.xlsx`)}>
                                        <Download className="w-4 h-4 text-green-400" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-400">דאטה גולמית להגשת דו"ח שנתי (6111) ע"י רו"ח.</p>
                            </div>

                            <div className={styles.reportItem}>
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2 text-slate-200">
                                        <Receipt className="w-4 h-4 text-slate-500" />
                                        <span className="font-semibold text-sm text-slate-400">סיכום 102 (שכירים)</span>
                                    </div>
                                    <button className={styles.btnOutline} disabled style={{ opacity: 0.5 }}>
                                        <Download className="w-4 h-4 text-slate-500" />
                                    </button>
                                </div>
                                <p className="text-[10px] text-slate-500">דיווח ביטוח לאומי לעובדי מנהלה (בקרוב).</p>
                            </div>
                        </div>
                    </div>

                    <div className={styles.panelCard} style={{ backgroundColor: 'rgba(37, 99, 235, 0.2)', border: '1px solid rgba(59, 130, 246, 0.5)' }}>
                        <div className={styles.panelHeader} style={{ borderBottom: 'none', paddingBottom: 0 }}>
                            <div className={styles.panelTitle} style={{ color: '#60A5FA' }}>ניכוי מס במקור</div>
                        </div>
                        <div className={styles.panelContent}>
                            <div className="space-y-2">
                                <div className="flex justify-between text-sm text-blue-100">
                                    <span>צפי ניכוי החודש:</span>
                                    <span className="font-bold">₪{financeData?.expenses.withholding.toLocaleString()}</span>
                                </div>
                                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                                    <div className="bg-blue-400 h-full" style={{ width: '45%' }}></div>
                                </div>
                                <p className="text-[10px] text-blue-200/80 mt-2">הסכום שנצבר להעברה למס הכנסה ב-15 לחודש.</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Archive & Regulatory Uploads */}
            <div className={`${styles.sectionGrid} ${styles.sectionGrid3}`}>
                <div className={styles.colSpan1}>
                    <div className={`${styles.panelCard} mb-6`}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelTitle}>
                                    <Archive className="w-5 h-5 text-brand" />
                                    חובות ודיווחים לפי חוק
                                </div>
                                <div className={styles.panelDescription}>
                                    תבניות מהירות להעלאת מסמכים רגולטוריים
                                </div>
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                            <div className="flex items-center gap-3 text-sm mb-2">
                                <div className="flex items-center gap-2 bg-red-500/10 text-red-500 px-3 py-1 rounded-full border border-red-500/20">
                                    <span className="font-semibold">{overdueCount}</span>
                                    <span>באיחור</span>
                                </div>
                                <div className="flex items-center gap-2 bg-amber-500/10 text-amber-500 px-3 py-1 rounded-full border border-amber-500/20">
                                    <span className="font-semibold">{dueSoonCount}</span>
                                    <span>ב־30 ימים הקרובים</span>
                                </div>
                            </div>
                            {complianceItems.map((item) => (
                                <div key={item.id} className={styles.reportItem} style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '0.75rem' }}>
                                    <div className="min-w-0">
                                        <div className="font-medium text-sm text-slate-200">{item.title}</div>
                                        <div className="text-xs text-slate-400 mt-1">
                                            תדירות: {item.frequency} · {item.notes}
                                        </div>
                                    </div>
                                    <button
                                        className={styles.btnOutline}
                                        onClick={() => {
                                            setDocForm((prev) => ({
                                                ...prev,
                                                title: item.title,
                                                doc_type: item.doc_type,
                                                authority: item.authority,
                                                submitted_by: item.submitted_by,
                                                status: "draft"
                                            }));
                                            uploadRef.current?.scrollIntoView({ behavior: "smooth" });
                                        }}
                                    >
                                        העלאה
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div ref={uploadRef} className={styles.panelCard}>
                        <div className={styles.panelHeader}>
                            <div>
                                <div className={styles.panelTitle}>
                                    <FileUp className="w-5 h-5 text-brand" />
                                    העלאת מסמכים וארכיון
                                </div>
                                <div className={styles.panelDescription}>
                                    העלה קבלות ישנות, הוצאות, דיווחים לרשויות, חובות ומסמכים משפטיים
                                </div>
                            </div>
                        </div>
                        <div className={styles.panelContent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                            <div className="space-y-2">
                                <span className={styles.formLabel}>כותרת</span>
                                <input
                                    className={styles.searchInput}
                                    style={{ width: '100%' }}
                                    value={docForm.title}
                                    onChange={(e) => setDocForm({ ...docForm, title: e.target.value })}
                                    placeholder="לדוגמה: דו״ח מע״מ 2024 Q4"
                                />
                            </div>
                            <div className="space-y-2">
                                <span className={styles.formLabel}>סוג מסמך</span>
                                <select
                                    value={docForm.doc_type}
                                    onChange={(e) => setDocForm({ ...docForm, doc_type: e.target.value })}
                                    className={styles.selectInput}
                                    style={{ width: '100%' }}
                                >
                                    <option value="expense_receipt">קבלה/הוצאה</option>
                                    <option value="income_receipt">קבלה/הכנסה</option>
                                    <option value="old_receipt">קבלה ישנה (עבר)</option>
                                    <option value="tax_report">דיווח מס/מע״מ</option>
                                    <option value="national_insurance">ביטוח לאומי</option>
                                    <option value="income_tax">מס הכנסה</option>
                                    <option value="debt_notice">חוב/דרישת תשלום</option>
                                    <option value="legal_submission">דיווח משפטי</option>
                                    <option value="other">אחר</option>
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>ישות</span>
                                    <select
                                        value={docForm.entity_type}
                                        onChange={(e) => setDocForm({ ...docForm, entity_type: e.target.value })}
                                        className={styles.selectInput}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="sole_prop">עוסק מורשה/פטור</option>
                                        <option value="llc">חברה בע״מ</option>
                                        <option value="partnership">שותפות</option>
                                        <option value="other">אחר</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>הוגש ע״י</span>
                                    <select
                                        value={docForm.submitted_by}
                                        onChange={(e) => setDocForm({ ...docForm, submitted_by: e.target.value })}
                                        className={styles.selectInput}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="self">עצמי</option>
                                        <option value="accountant">רואה חשבון</option>
                                        <option value="lawyer">עו״ד</option>
                                        <option value="other_rep">מייצג אחר</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>רשות</span>
                                    <select
                                        value={docForm.authority}
                                        onChange={(e) => setDocForm({ ...docForm, authority: e.target.value })}
                                        className={styles.selectInput}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="tax_authority">רשות המסים</option>
                                        <option value="national_insurance">ביטוח לאומי</option>
                                        <option value="vat">מע״מ</option>
                                        <option value="corporate_registry">רשם החברות</option>
                                        <option value="other">אחר</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>שנה</span>
                                    <input
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={docForm.year}
                                        onChange={(e) => setDocForm({ ...docForm, year: e.target.value })}
                                        placeholder="2026"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>תקופה (אופציונלי)</span>
                                    <input
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={docForm.period}
                                        onChange={(e) => setDocForm({ ...docForm, period: e.target.value })}
                                        placeholder="Q1 / חודשי"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>סטטוס</span>
                                    <select
                                        value={docForm.status}
                                        onChange={(e) => setDocForm({ ...docForm, status: e.target.value })}
                                        className={styles.selectInput}
                                        style={{ width: '100%' }}
                                    >
                                        <option value="archived">בארכיון</option>
                                        <option value="draft">טיוטה</option>
                                        <option value="submitted">הוגש</option>
                                        <option value="accepted">אושר</option>
                                        <option value="rejected">נדחה</option>
                                        <option value="overdue">באיחור</option>
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>תאריך יעד</span>
                                    <input
                                        type="date"
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={docForm.due_date}
                                        onChange={(e) => setDocForm({ ...docForm, due_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>תאריך הגשה</span>
                                    <input
                                        type="date"
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={docForm.filed_date}
                                        onChange={(e) => setDocForm({ ...docForm, filed_date: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>סכום חוב (אופציונלי)</span>
                                    <input
                                        className={styles.searchInput}
                                        style={{ width: '100%' }}
                                        value={docForm.amount_due}
                                        onChange={(e) => setDocForm({ ...docForm, amount_due: e.target.value })}
                                        placeholder="₪0.00"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <span className={styles.formLabel}>קובץ</span>
                                    <input
                                        type="file"
                                        onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                                        style={{ color: '#94A3B8', fontSize: '0.875rem' }}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <span className={styles.formLabel}>תיאור / הערות</span>
                                <input
                                    className={styles.searchInput}
                                    style={{ width: '100%' }}
                                    value={docForm.description}
                                    onChange={(e) => setDocForm({ ...docForm, description: e.target.value })}
                                    placeholder="הערות קצרות למסמך"
                                />
                            </div>
                            <button className={styles.btnPrimary} style={{ width: '100%' }} onClick={handleDocUpload} disabled={docUploading}>
                                <Upload className="w-4 h-4" />
                                {docUploading ? "מעלה..." : "העלה ושמור בארכיון"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className={`${styles.panelCard} ${styles.colSpan2}`}>
                    <div className={styles.panelHeader}>
                        <div>
                            <div className={styles.panelTitle}>
                                <Archive className="w-5 h-5 text-brand" />
                                ארכיון מסמכים פיננסיים
                            </div>
                            <div className={styles.panelDescription}>ניהול קבלות, חובות, ודיווחים לרשויות במקום אחד</div>
                        </div>
                        <button className={styles.btnOutline} onClick={fetchDocs} disabled={docLoading}>
                            {docLoading ? "טוען..." : "רענן"}
                        </button>
                    </div>
                    <div className={styles.panelContent}>
                        {alerts && (alerts.overdue_count > 0 || alerts.due_soon_count > 0) && (
                            <div className="mb-4 border border-slate-700/50 rounded-lg p-3 bg-slate-800/40">
                                <div className="flex items-center justify-between">
                                    <div className="font-semibold text-sm text-slate-200">התראות מסמכים</div>
                                    <button className={styles.btnOutline} style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={fetchAlerts}>רענן התראות</button>
                                </div>
                                {alerts.overdue.length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-xs text-red-400 font-semibold">באיחור</div>
                                        <div className="space-y-1 mt-1">
                                            {alerts.overdue.slice(0, 5).map((a) => (
                                                <div key={a.id} className="text-xs text-slate-400">
                                                    {a.title} · יעד: {a.due_date}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {alerts.due_soon.length > 0 && (
                                    <div className="mt-2">
                                        <div className="text-xs text-amber-500 font-semibold">ב-30 ימים הקרובים</div>
                                        <div className="space-y-1 mt-1">
                                            {alerts.due_soon.slice(0, 5).map((a) => (
                                                <div key={a.id} className="text-xs text-slate-400">
                                                    {a.title} · יעד: {a.due_date}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                        <div className={styles.filtersArea}>
                            <input
                                className={styles.searchInput}
                                placeholder="חיפוש..."
                                value={docSearch}
                                onChange={(e) => setDocSearch(e.target.value)}
                            />
                            <select
                                value={docFilterType}
                                onChange={(e) => setDocFilterType(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">כל הסוגים</option>
                                <option value="expense_receipt">קבלה/הוצאה</option>
                                <option value="income_receipt">קבלה/הכנסה</option>
                                <option value="old_receipt">קבלה ישנה</option>
                                <option value="tax_report">דיווח מס</option>
                                <option value="national_insurance">ביטוח לאומי</option>
                                <option value="income_tax">מס הכנסה</option>
                                <option value="debt_notice">חוב/דרישה</option>
                                <option value="legal_submission">דיווח משפטי</option>
                                <option value="other">אחר</option>
                            </select>
                            <select
                                value={docFilterStatus}
                                onChange={(e) => setDocFilterStatus(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">כל הסטטוסים</option>
                                <option value="archived">בארכיון</option>
                                <option value="draft">טיוטה</option>
                                <option value="submitted">הוגש</option>
                                <option value="accepted">אושר</option>
                                <option value="rejected">נדחה</option>
                                <option value="overdue">באיחור</option>
                            </select>
                            <select
                                value={docFilterYear}
                                onChange={(e) => setDocFilterYear(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">כל השנים</option>
                                {Array.from(new Set(docs.map((d) => d.year).filter(Boolean))).map((y) => (
                                    <option key={y} value={String(y)}>{y}</option>
                                ))}
                            </select>
                            <select
                                value={docFilterDue}
                                onChange={(e) => setDocFilterDue(e.target.value)}
                                className={styles.selectInput}
                            >
                                <option value="all">כל המועדים</option>
                                <option value="overdue">באיחור</option>
                                <option value="due_30">ב־30 ימים הקרובים</option>
                            </select>
                        </div>
                        <div style={{ overflowX: 'auto' }}>
                            <table className={styles.customTable}>
                                <thead>
                                    <tr>
                                        <th>כותרת</th>
                                        <th>סוג</th>
                                        <th>רשות</th>
                                        <th>שנה</th>
                                        <th>סטטוס</th>
                                        <th>תאריך יעד</th>
                                        <th>הוגש</th>
                                        <th>קובץ</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredDocs.length === 0 ? (
                                        <tr>
                                            <td colSpan={8} style={{ textAlign: 'center', color: '#94A3B8', padding: '2rem' }}>
                                                אין מסמכים בארכיון עדיין
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredDocs.map((doc) => (
                                            <tr key={doc.id}>
                                                <td style={{ fontWeight: 600 }}>{doc.title}</td>
                                                <td>{doc.doc_type}</td>
                                                <td style={{ color: '#94A3B8' }}>{doc.authority || "-"}</td>
                                                <td style={{ color: '#94A3B8' }}>{doc.year || "-"}</td>
                                                <td>
                                                    <select
                                                        value={doc.status || "archived"}
                                                        onChange={(e) => updateDocStatus(doc.id, e.target.value)}
                                                        className={styles.selectInput}
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', minWidth: '100px' }}
                                                    >
                                                        <option value="archived">בארכיון</option>
                                                        <option value="draft">טיוטה</option>
                                                        <option value="submitted">הוגש</option>
                                                        <option value="accepted">אושר</option>
                                                        <option value="rejected">נדחה</option>
                                                        <option value="overdue">באיחור</option>
                                                    </select>
                                                </td>
                                                <td>
                                                    {doc.status === 'overdue' || (doc.due_date && new Date(doc.due_date) < new Date() && doc.status !== 'accepted') ?
                                                        <span className={`${styles.badge} ${styles.badgeDestructive}`}>{doc.due_date || "-"}</span>
                                                        : doc.due_date || "-"}
                                                </td>
                                                <td>
                                                    <input
                                                        type="date"
                                                        value={doc.filed_date || ""}
                                                        onChange={(e) => updateDocFiledDate(doc.id, e.target.value)}
                                                        className={styles.searchInput}
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                    />
                                                </td>
                                                <td>
                                                    <button
                                                        className={styles.btnOutline}
                                                        style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }}
                                                        onClick={() => handleDownloadDoc(doc.id, doc.file_name)}
                                                    >
                                                        הורדה
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
