"use client";

import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, ChevronLeft, ChevronRight, Eye, Truck } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

export default function AdminOrders() {
    const { user } = useAuth();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");
    const [assignDialogOpen, setAssignDialogOpen] = useState(false);
    const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [selectedCourierId, setSelectedCourierId] = useState<string>("");

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
            // Construct query params
            const params = new URLSearchParams();
            params.append('page', page.toString());
            params.append('limit', '20');
            if (searchTerm) params.append('q', searchTerm);
            if (statusFilter !== 'all') params.append('status', statusFilter);

            const res = await api.get(`/orders?${params.toString()}`);
            const data = res.data;

            // Assuming data is array or { items: [], total: ... }
            if (Array.isArray(data)) {
                setOrders(data);
            } else if (data.orders) {
                setOrders(data.orders);
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

    const openAssignDialog = (orderId: number) => {
        setSelectedOrderId(orderId);
        setAssignDialogOpen(true);
        fetchCouriers();
    };

    const getStatusBadge = (status: string) => {
        const styles: Record<string, string> = {
            pending: "bg-yellow-100 text-yellow-800",
            assigned: "bg-blue-100 text-blue-800",
            picked_up: "bg-purple-100 text-purple-800",
            delivered: "bg-green-100 text-green-800",
            cancelled: "bg-red-100 text-red-800",
        };
        const labels: Record<string, string> = {
            pending: "ממתין",
            assigned: "שליח בדרך",
            picked_up: "נאסף",
            delivered: "נמסר",
            cancelled: "בוטל",
        };
        return (
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${styles[status] || "bg-gray-100 text-gray-800"}`}>
                {labels[status] || status}
            </span>
        );
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ניהול הזמנות</h1>
                    <p className="text-slate-500">צפייה וניהול כל ההזמנות במערכת</p>
                </div>
                <Button onClick={fetchOrders} variant="outline">רענן נתונים</Button>
            </header>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <div className="flex gap-4 items-center">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="חיפוש לפי מספר הזמנה או שם..."
                                className="pr-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <Filter className="h-4 w-4 text-slate-500" />
                            <select
                                className="border rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                            >
                                <option value="all">כל הסטטוסים</option>
                                <option value="pending">ממתין</option>
                                <option value="assigned">בטיפול</option>
                                <option value="delivered">הושלם</option>
                                <option value="cancelled">בוטל</option>
                            </select>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">מס' הזמנה</TableHead>
                                    <TableHead className="text-right">לקוח</TableHead>
                                    <TableHead className="text-right">כתובת איסוף</TableHead>
                                    <TableHead className="text-right">כתובת יעד</TableHead>
                                    <TableHead className="text-right">סטטוס</TableHead>
                                    <TableHead className="text-right">תאריך</TableHead>
                                    <TableHead className="text-right">מחיר</TableHead>
                                    <TableHead className="text-right">פעולות</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10">טוען נתונים...</TableCell>
                                    </TableRow>
                                ) : orders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-10 text-slate-500">לא נמצאו הזמנות תואמות לחיפוש</TableCell>
                                    </TableRow>
                                ) : (
                                    orders.map((order) => (
                                        <TableRow key={order.id}>
                                            <TableCell className="font-medium">#{order.id}</TableCell>
                                            <TableCell>{order.customer_name || "אורח"}</TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={order.pickup_address}>
                                                {order.pickup_address}
                                            </TableCell>
                                            <TableCell className="max-w-[200px] truncate" title={order.delivery_address}>
                                                {order.delivery_address}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(order.status)}</TableCell>
                                            <TableCell>{format(new Date(order.created_at), "dd/MM/yy HH:mm")}</TableCell>
                                            <TableCell>₪{order.total || "—"}</TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Link href={`/tracking/${order.id}`}>
                                                        <Button variant="ghost" size="icon" title="צפה בפרטים">
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                    </Link>
                                                    {order.status === 'pending' && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                                            title="שבץ שליח"
                                                            onClick={() => openAssignDialog(order.id)}
                                                        >
                                                            <Truck className="w-4 h-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>

                    <div className="flex justify-center gap-2 mt-4">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => Math.max(1, p - 1))}
                            disabled={page === 1 || loading}
                        >
                            <ChevronRight className="w-4 h-4" /> הקודם
                        </Button>
                        <span className="flex items-center px-4 text-sm text-slate-600">עמוד {page}</span>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setPage(p => p + 1)}
                            disabled={orders.length < 20 || loading}
                        >
                            הבא <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>
                </CardContent>
            </Card>

            {/* Courier Assignment Dialog */}
            <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                <DialogContent className="sm:max-w-md" dir="rtl">
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
                            className="bg-blue-600 hover:bg-blue-700"
                        >
                            שבץ שליח
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
