"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Header } from "@/components/dashboard/header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, MapPin, Phone, Truck, Clock, Package, CheckCircle, AlertCircle, Calendar, ShieldCheck, Coins } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export default function OrderDetailsPage({ params }: { params: { id: string } }) {
    const router = useRouter();
    const [order, setOrder] = useState<any>(null);
    const [couriers, setCouriers] = useState<any[]>([]);
    const [assigning, setAssigning] = useState(false);
    const [selectedCourier, setSelectedCourier] = useState("");
    const [isEditing, setIsEditing] = useState(false);
    const [editData, setEditData] = useState<any>({});

    const saveChanges = async () => {
        try {
            await api.put(`/orders/${params.id}`, editData);
            toast.success("פרטים עודכנו בהצלחה");
            setIsEditing(false);
            fetchOrder();
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בעדכון פרטים");
        }
    };

    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrder();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const fetchOrder = async () => {
        try {
            const res = await api.get(`/orders/${params.id}`);
            setOrder(res.data);
        } catch (err) {
            console.error(err);
            toast.error("לא ניתן לטעון את פרטי ההזמנה");
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        try {
            await api.put(`/admin/orders/${params.id}/status`, { status: newStatus });
            toast.success("סטטוס עודכן בהצלחה");
            fetchOrder();
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בעדכון סטטוס");
        }
    };

    const fetchCouriers = async () => {
        try {
            const res = await api.get('/couriers');
            let courierList = [];
            if (res.data && Array.isArray(res.data.data)) {
                courierList = res.data.data;
            } else if (Array.isArray(res.data)) {
                courierList = res.data;
            }
            setCouriers(courierList.filter((c: any) => c.is_available));
        } catch (err) {
            console.error("Failed to load couriers", err);
        }
    };

    const handleAssign = async () => {
        if (!selectedCourier) return;
        setAssigning(true);
        try {
            await api.post(`/orders/${params.id}/assign`, { courier_id: selectedCourier });
            toast.success("שליח שובץ בהצלחה");
            fetchOrder(); // Refresh order data
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בשיבוץ השליח");
        } finally {
            setAssigning(false);
        }
    };

    if (loading) return <div className="p-8 text-center bg-background min-h-screen">טוען נתונים...</div>;
    if (!order) return <div className="p-8 text-center bg-background min-h-screen">הזמנה לא נמצאה</div>;

    const statusMap: Record<string, { label: string; color: string; icon: any }> = {
        'pending': { label: 'ממתין לשיבוץ', color: 'bg-yellow-500', icon: Clock },
        'assigned': { label: 'שובץ לשליח', color: 'bg-blue-500', icon: Truck },
        'picked_up': { label: 'נאסף', color: 'bg-purple-500', icon: Package },
        'in_transit': { label: 'בדרך', color: 'bg-indigo-500', icon: MapPin },
        'delivered': { label: 'נמסר', color: 'bg-green-500', icon: CheckCircle },
        'cancelled': { label: 'בוטל', color: 'bg-red-500', icon: AlertCircle },
    };

    const currentStatus = statusMap[order.status] || statusMap['pending'];
    const StatusIcon = currentStatus.icon;

    return (
        <div className="flex h-screen bg-background text-right" dir="rtl">
            <AdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">

                    <div className="max-w-5xl mx-auto">

                        {/* Header Banner */}
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                            <div className="flex items-center gap-4">
                                <Button variant="ghost" size="icon" onClick={() => router.back()}>
                                    <ArrowRight className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
                                        הזמנה #{order.order_number}
                                        <Badge className={`text-base px-3 py-1 ${currentStatus.color} hover:${currentStatus.color}`}>
                                            <StatusIcon className="w-4 h-4 ml-2" />
                                            {currentStatus.label}
                                        </Badge>
                                    </h1>
                                    <p className="text-muted-foreground flex items-center gap-2 mt-1">
                                        <Calendar className="h-4 w-4" />
                                        נוצר ב: {new Date(order.created_at).toLocaleString('he-IL')}
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2">
                                <Button variant="outline">הדפס תעודה</Button>
                                {order.status !== 'delivered' && order.status !== 'cancelled' && (
                                    <Button onClick={() => updateStatus('delivered')} className="bg-green-600 hover:bg-green-700">
                                        סמן כנמסר
                                    </Button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                            {/* Main Info */}
                            <div className="md:col-span-2 space-y-6">

                                {/* Route */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>מסלול משלוח</CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-6 relative">
                                        {/* Line connector */}
                                        <div className="absolute right-[2.65rem] top-[5.5rem] bottom-[5.5rem] w-0.5 bg-slate-200" />

                                        {/* A - Pickup */}
                                        <div className="flex gap-4 relative">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600 ring-4 ring-white z-10">
                                                <span className="font-bold">A</span>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none text-muted-foreground">נקודת איסוף</p>
                                                <p className="font-semibold text-lg">{order.pickup.address}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">{order.pickup.contact}</span>
                                                    <span>•</span>
                                                    <a href={`tel:${order.pickup.phone}`} className="hover:text-blue-600 flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {order.pickup.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>

                                        {/* B - Delivery */}
                                        <div className="flex gap-4 relative">
                                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-600 ring-4 ring-white z-10">
                                                <span className="font-bold">B</span>
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className="text-sm font-medium leading-none text-muted-foreground">נקודת מסירה</p>
                                                <p className="font-semibold text-lg">{order.delivery.address}</p>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <span className="font-medium text-foreground">{order.delivery.recipient}</span>
                                                    <span>•</span>
                                                    <a href={`tel:${order.delivery.phone}`} className="hover:text-blue-600 flex items-center gap-1">
                                                        <Phone className="h-3 w-3" />
                                                        {order.delivery.phone}
                                                    </a>
                                                </div>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Package Details */}
                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between">
                                        <CardTitle>פרטי חבילה</CardTitle>
                                        <Button variant="ghost" size="sm" onClick={() => setIsEditing(!isEditing)}>
                                            {isEditing ? 'ביטול עריכה' : 'ערוך פרטים'}
                                        </Button>
                                    </CardHeader>
                                    <CardContent className="grid grid-cols-2 gap-4">
                                        <div>
                                            <p className="text-sm text-muted-foreground">גודל חבילה</p>
                                            {isEditing ? (
                                                <select
                                                    className="w-full p-1 border rounded"
                                                    value={editData.package_size || order.package?.size || 'small'}
                                                    onChange={e => setEditData({ ...editData, package_size: e.target.value })}
                                                >
                                                    <option value="envelope">מעטפה</option>
                                                    <option value="small">קטנה (עד 5 ק"ג)</option>
                                                    <option value="medium">בינונית (עד 15 ק"ג)</option>
                                                    <option value="large">גדולה (עד 30 ק"ג)</option>
                                                </select>
                                            ) : (
                                                <p className="font-medium">
                                                    {order.package?.size === 'envelope' && 'מעטפה'}
                                                    {order.package?.size === 'small' && 'קטנה (עד 5 ק"ג)'}
                                                    {order.package?.size === 'medium' && 'בינונית (עד 15 ק"ג)'}
                                                    {order.package?.size === 'large' && 'גדולה (עד 30 ק"ג)'}
                                                    {order.package?.size === 'regular' && 'רגילה'}
                                                </p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">הערות למשלוח</p>
                                            {isEditing ? (
                                                <textarea
                                                    className="w-full p-1 border rounded text-sm"
                                                    value={editData.notes !== undefined ? editData.notes : (order.notes || "")}
                                                    onChange={e => setEditData({ ...editData, notes: e.target.value })}
                                                />
                                            ) : (
                                                <p className="font-medium">{order.notes || "אין הערות"}</p>
                                            )}
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">מרחק משוער</p>
                                            <p className="font-medium">{order.distance_km} ק"מ</p>
                                        </div>
                                        <div>
                                            <p className="text-sm text-muted-foreground">עלות משלוח</p>
                                            <p className="font-bold text-green-600">₪{order.price}</p>
                                        </div>
                                        {isEditing && (
                                            <div className="col-span-2 flex justify-end gap-2 mt-2">
                                                <Button size="sm" onClick={saveChanges}>שמור שינויים</Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                            </div>

                            {/* Sidebar Info */}
                            <div className="space-y-6">

                                {/* Logistics & Finance */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base flex items-center gap-2">
                                            <Coins className="h-4 w-4 text-green-600" />
                                            פרטי חיוב ולוגיסטיקה
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent className="space-y-4">
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-sm text-muted-foreground">סוג משלוח</span>
                                            <Badge variant="outline" className="text-xs">
                                                {order.delivery_type === 'legal_document' ? 'מסמך משפטי' :
                                                    order.delivery_type === 'valuable' ? 'יקר ערך' : 'סטנדרט'}
                                            </Badge>
                                        </div>
                                        <div className="flex justify-between items-center pb-2 border-b">
                                            <span className="text-sm text-muted-foreground">דחיפות</span>
                                            <Badge variant={order.urgency === 'express' ? 'default' : 'secondary'} className="text-xs">
                                                {order.urgency === 'express' ? 'אקספרס' :
                                                    order.urgency === 'same_day' ? 'מעכשיו לעכשיו' : 'רגיל'}
                                            </Badge>
                                        </div>
                                        {order.insurance_required && (
                                            <div className="bg-green-50 p-2 rounded-md flex items-center justify-between">
                                                <div className="flex items-center gap-2 text-xs text-green-800">
                                                    <ShieldCheck className="h-3 w-3" />
                                                    <span>ביטוח תכולה</span>
                                                </div>
                                                <span className="font-bold text-xs">₪{order.insurance_value}</span>
                                            </div>
                                        )}
                                        <div className="pt-2">
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="text-sm text-muted-foreground">מרחק</span>
                                                <span className="font-mono text-sm">{order.distance_km} km</span>
                                            </div>
                                            <div className="flex justify-between items-center text-lg font-bold">
                                                <span>סה"כ</span>
                                                <span>₪{order.price}</span>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>

                                {/* Courier Assignment */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-base">פרטי שליח</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        {order.courier ? (
                                            <div className="space-y-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="h-10 w-10 rounded-full bg-slate-100 flex items-center justify-center">
                                                        <Truck className="h-5 w-5 text-slate-600" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{order.courier.name || 'שליח'}</p>
                                                        <p className="text-xs text-muted-foreground">{order.courier.phone || ''}</p>
                                                    </div>
                                                </div>
                                                <Button size="sm" variant="outline" className="w-full text-xs" onClick={() => {
                                                    // In real app, unassign logic
                                                    toast.info("אפשרות ביטול שיבוץ תתווסף בקרוב");
                                                }}>
                                                    בטל שיבוץ
                                                </Button>
                                            </div>
                                        ) : (
                                            <div className="text-center py-4 space-y-3">
                                                <p className="text-sm text-muted-foreground">טרם שובץ שליח להזמנה זו</p>

                                                <div className="space-y-2">
                                                    <select
                                                        className="w-full p-2 border rounded-md text-sm"
                                                        value={selectedCourier}
                                                        onChange={(e) => setSelectedCourier(e.target.value)}
                                                        onClick={() => { if (couriers.length === 0) fetchCouriers(); }}
                                                    >
                                                        <option value="">בחר שליח...</option>
                                                        {couriers.map(c => (
                                                            <option key={c.id} value={c.id}>
                                                                {c.full_name} ({c.is_available ? 'זמין' : 'עסוק'})
                                                            </option>
                                                        ))}
                                                    </select>

                                                    <Button
                                                        className="w-full"
                                                        disabled={!selectedCourier || assigning}
                                                        onClick={handleAssign}
                                                    >
                                                        {assigning ? 'משבץ...' : 'שבץ שליח'}
                                                    </Button>
                                                </div>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>

                                {/* Status History */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle>היסטוריית סטטוסים</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-4">
                                            {order.status_history && order.status_history.map((h: any, i: number) => (
                                                <div key={i} className="flex gap-3 text-sm">
                                                    <div className="flex flex-col items-center">
                                                        <div className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-blue-600' : 'bg-slate-300'}`} />
                                                        {i !== order.status_history.length - 1 && <div className="w-0.5 h-full bg-slate-100 my-1" />}
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{statusMap[h.status]?.label || h.status}</p>
                                                        <p className="text-xs text-muted-foreground">
                                                            {new Date(h.timestamp).toLocaleString('he-IL')}
                                                        </p>
                                                        {h.notes && <p className="text-xs text-slate-500 mt-1">{h.notes}</p>}
                                                    </div>
                                                </div>
                                            ))}
                                            {(!order.status_history || order.status_history.length === 0) && (
                                                <div className="text-muted-foreground text-sm">אין היסטוריה זמינה</div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>

                            </div>

                        </div>
                    </div>

                </main>
            </div>
        </div>
    );
}
