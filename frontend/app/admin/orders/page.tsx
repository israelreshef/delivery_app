"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import { useEffect, useState } from "react";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Truck, MapPin, FileText, Bell } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import styles from "./orders-list.module.css";

export default function AdminOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [selectedCourierId, setSelectedCourierId] = useState<string>("");
    const [unreadNotifications, setUnreadNotifications] = useState(0);
    const [notificationLog, setNotificationLog] = useState<string[]>([]);
    const [showNotifPanel, setShowNotifPanel] = useState(false);

    // Real-time updates
    const socket = useSocket(null, "admin"); // Context handles token, but here we pass role

    useEffect(() => {
        if (socket) {
            socket.on('new_order', (data: any) => {
                console.log("New order received via socket:", data);
                const msg = `הזמנה חדשה! #${data.id}`;
                toast.success(msg);
                setUnreadNotifications(n => n + 1);
                setNotificationLog(log => [msg, ...log.slice(0, 19)]);
                fetchOrders();
            });
            
            socket.on('order_update', (data: any) => {
                if (data.status === 'delivered') {
                    const msg = `הזמנה #${data.order_id} נמסרה`;
                    setUnreadNotifications(n => n + 1);
                    setNotificationLog(log => [msg, ...log.slice(0, 19)]);
                }
                fetchOrders();
            });

            socket.on('courier_offline', (data: any) => {
                const msg = `שליח ${data.courier_name || data.courier_id} עבר לאופליין`;
                setUnreadNotifications(n => n + 1);
                setNotificationLog(log => [msg, ...log.slice(0, 19)]);
            });
        }
        return () => {
             if (socket) {
                 socket.off('new_order');
                 socket.off('order_update');
                 socket.off('courier_offline');
             }
        };
    }, [socket]);

    useEffect(() => {
        fetchOrders();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, statusFilter]);

    // Debounce search could be added here, for now simple effect
    useEffect(() => {
        const timer = setTimeout(() => {
            if (page === 1) fetchOrders();
            else setPage(1); // Reset to page 1 to trigger fetch
        }, 500);
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchTerm]);

    const fetchOrders = async () => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');
            if (searchTerm) params.append('q', searchTerm);
            if (statusFilter !== 'all') params.append('status', statusFilter);
            if (dateFrom) params.append('date_from', dateFrom);
            if (dateTo) params.append('date_to', dateTo);

            const res = await api.get(`/orders?${params.toString()}`);
            const data = res.data;

            // Assuming data is array or { items: [], total: ... }
            if (Array.isArray(data)) {
                setOrders(data);
            } else if (data.orders) {
                setOrders(data.orders);
            } else if (data.data) {
                setOrders(data.data);
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה בטעינת הזמנות");
        } finally {
            setLoading(false);
        }
    };

    const fetchCouriers = async () => {
        try {
            const res = await api.get('/couriers');
            if (res.data && Array.isArray(res.data.data)) {
                setCouriers(res.data.data.filter((c: any) => c.is_available));
            } else if (Array.isArray(res.data)) {
                setCouriers(res.data.filter((c: any) => c.is_available));
            }
        } catch (error) {
            console.error("Failed to fetch couriers", error);
        }
    };

    const handleAssignCourier = async () => {
        if (!selectedOrderId || !selectedCourierId) return;

        try {
            await api.post(`/orders/${selectedOrderId}/assign`, {
                courier_id: parseInt(selectedCourierId)
            });
            toast.success("שליח שובץ בהצלחה!");
            setAssignDialogOpen(false);
            setSelectedOrderId(null);
            setSelectedCourierId("");
            fetchOrders(); // Refresh orders
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה בשיבוץ שליח");
        }
    };

    const handleGenerateInvoice = async (orderId: number) => {
        try {
            const res = await api.post('/invoices/', {
                delivery_id: orderId,
                document_type: 'tax_invoice_receipt'
            });
            toast.success("חשבונית הופקה בהצלחה!");
            if (res.data.download_url) {
                // Determine base URL, fallback to default local if env is missing
                const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:5000';
                window.open(`${baseUrl}${res.data.download_url}`, '_blank');
            }
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה בהפקת חשבונית");
        }
    };

    const openAssignDialog = (orderId: number) => {
        setSelectedOrderId(orderId);
        setAssignDialogOpen(true);
        fetchCouriers();
    };

    const getStatusBadge = (status: string) => {
        const styleMap: Record<string, string> = {
            pending: styles.badgePending,
            assigned: styles.badgeAssigned,
            picked_up: styles.badgePickedUp,
            delivered: styles.badgeDelivered,
            cancelled: styles.badgeCancelled,
        };
        const labels: Record<string, string> = {
            pending: "ממתין",
            assigned: "שליח בדרך",
            picked_up: "נאסף",
            delivered: "נמסר",
            cancelled: "בוטל",
        };
        return (
            <span className={`${styles.badge} ${styleMap[status] || styles.badgePending}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className={styles.listContainer}>
            <header className={styles.headerArea}>
                <div>
                    <h1 className={styles.title}>ניהול הזמנות</h1>
                    <p className={styles.subtitle}>צפייה וניהול כל ההזמנות במערכת</p>
                </div>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    {/* ─── Notification Bell ─── */}
                    <div style={{ position: 'relative' }}>
                        <button
                            onClick={() => { setShowNotifPanel(v => !v); setUnreadNotifications(0); }}
                            style={{ background: 'transparent', border: 'none', cursor: 'pointer', position: 'relative' }}
                            title="התראות"
                        >
                            <Bell size={22} color={unreadNotifications > 0 ? '#f59e0b' : '#9ca3af'} />
                            {unreadNotifications > 0 && (
                                <span style={{
                                    position: 'absolute', top: -4, right: -4,
                                    background: '#ef4444', color: '#fff',
                                    borderRadius: '50%', width: 16, height: 16,
                                    fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 700
                                }}>{unreadNotifications}</span>
                            )}
                        </button>
                        {showNotifPanel && (
                            <div style={{
                                position: 'absolute', right: 0, top: 32,
                                background: '#1a1a2e', border: '1px solid #2d2d44',
                                borderRadius: 12, padding: 12, width: 260,
                                zIndex: 100, boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                            }}>
                                <p style={{ color: '#9ca3af', fontSize: 12, marginBottom: 8 }}>אירועים אחרונים:</p>
                                {notificationLog.length === 0 ? (
                                    <p style={{ color: '#6b7280', fontSize: 13 }}>אין אירועים חדשים</p>
                                ) : notificationLog.map((msg, i) => (
                                    <p key={i} style={{ color: '#e5e7eb', fontSize: 13, paddingBottom: 6, borderBottom: '1px solid #2d2d44' }}>{msg}</p>
                                ))}
                            </div>
                        )}
                    </div>
                    <button onClick={fetchOrders} className={styles.btnPrimary}>רענן נתונים</button>
                </div>
            </header>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <h2 className={styles.tableTitle}>רשימת הזמנות</h2>

                    <div className={styles.filtersArea}>
                        <div className={styles.searchBox}>
                            <Search className={styles.searchIcon} />
                            <input
                                type="text"
                                placeholder="חיפוש לפי מספר הזמנה או שם..."
                                className={styles.searchInput}
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <select
                            className={styles.selectInput}
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            aria-label="סנן לפי סטטוס"
                            title="סנן לפי סטטוס"
                        >
                            <option value="all">כל הסטטוסים</option>
                            <option value="pending">ממתין</option>
                            <option value="assigned">בטיפול</option>
                            <option value="delivered">הושלם</option>
                            <option value="cancelled">בוטל</option>
                        </select>

                        {/* ─── Date range ─── */}
                        <input
                            type="date"
                            className={styles.selectInput}
                            value={dateFrom}
                            onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                            title="מתאריך"
                        />
                        <span style={{ color: '#9ca3af', fontSize: 13 }}>עד</span>
                        <input
                            type="date"
                            className={styles.selectInput}
                            value={dateTo}
                            onChange={e => { setDateTo(e.target.value); setPage(1); }}
                            title="עד תאריך"
                        />
                    </div>
                </div>

                <table className={styles.customTable}>
                    <thead>
                        <tr>
                            <th>מס' הזמנה</th>
                            <th>לקוח</th>
                            <th>כתובת איסוף</th>
                            <th>כתובת יעד</th>
                            <th>סטטוס</th>
                            <th>תאריך</th>
                            <th>מחיר</th>
                            <th>פעולות</th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>טוען נתונים...</td>
                            </tr>
                        ) : orders.length === 0 ? (
                            <tr>
                                <td colSpan={8} className={styles.emptyState}>לא נמצאו הזמנות תואמות לחיפוש</td>
                            </tr>
                        ) : (
                            orders.map((order) => (
                                <tr key={order.id}>
                                    <td className={styles.orderId}>#{order.id}</td>
                                    <td>{order.customer_name || "אורח"}</td>
                                    <td className={styles.truncateCell} title={order.pickup_address}>
                                        {order.pickup_address}
                                    </td>
                                    <td className={styles.truncateCell} title={order.delivery_address}>
                                        {order.delivery_address}
                                    </td>
                                    <td>{getStatusBadge(order.status)}</td>
                                    <td className={styles.subText}>{format(new Date(order.created_at), "dd/MM/yy HH:mm")}</td>
                                    <td className={styles.fontSemiBold}>₪{order.total || "—"}</td>
                                    <td>
                                        <div className={styles.actionsContainer}>
                                            <Link href={`/tracking/${order.id}`} className={styles.btnAction} title="צפה בפרטים">
                                                <Eye size={16} />
                                            </Link>
                                            {order.status === 'pending' && (
                                                <button
                                                    className={`${styles.btnAction} ${styles.btnActionBrand}`}
                                                    title="שבץ שליח"
                                                    onClick={() => openAssignDialog(order.id)}
                                                >
                                                    <Truck size={16} />
                                                </button>
                                            )}
                                            <a
                                                href={`https://waze.com/ul?q=${encodeURIComponent(order.delivery_address)}&navigate=yes`}
                                                target="_blank"
                                                rel="noreferrer"
                                                className={`${styles.btnAction} ${styles.btnActionBlue}`}
                                                title="נווט ליעד (Waze)"
                                            >
                                                <MapPin size={16} />
                                            </a>
                                            {order.status !== 'pending' && order.status !== 'cancelled' && (
                                                <button
                                                    onClick={() => handleGenerateInvoice(order.id)}
                                                    className={`${styles.btnAction} text-amber-500 hover:text-amber-600`}
                                                    title="הפק חשבונית"
                                                >
                                                    <FileText size={16} />
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className={styles.pagination}>
                    <button
                        className={styles.btnAction}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                    >
                        <ChevronRight size={16} className={styles.iconRight} /> הקודם
                    </button>
                    <span className={styles.pageText}>עמוד {page}</span>
                    <button
                        className={styles.btnAction}
                        onClick={() => setPage(p => p + 1)}
                        disabled={orders.length < 20 || loading}
                    >
                        הבא <ChevronLeft size={16} className={styles.iconLeft} />
                    </button>
                </div>
            </div>

            {/* Courier Assignment Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className={`sm:max-w-md ${styles.dialogContent}`} dir="rtl">
                    <DialogHeader>
                        <DialogTitle>שיבוץ שליח להזמנה #{selectedOrderId}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="courier">בחר שליח זמין</Label>
                            <Select value={selectedCourierId} onValueChange={setSelectedCourierId}>
                                <SelectTrigger id="courier">
                                    <SelectValue placeholder="בחר שליח..." />
                                </SelectTrigger>
                                <SelectContent>
                                    {couriers.length === 0 ? (
                                        <SelectItem value="none" disabled>אין שליחים זמינים</SelectItem>
                                    ) : (
                                        couriers.map((courier) => (
                                            <SelectItem key={courier.id} value={courier.id.toString()}>
                                                {courier.full_name} - {courier.vehicle_type} (⭐ {courier.rating.toFixed(1)})
                                            </SelectItem>
                                        ))
                                    )}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAssignDialogOpen(false)}>
                            ביטול
                        </Button>
                        <Button
                            onClick={handleAssignCourier}
                            disabled={!selectedCourierId}
                            className="bg-brand hover:bg-brand-dark"
                        >
                            שבץ שליח
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
