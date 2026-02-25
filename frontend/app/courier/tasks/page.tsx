"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/dashboard/header";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Phone, MessageCircle, Star, Navigation, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { useParams } from "next/navigation";

export default function CourierTasksPage() {
    // In real app, we get courier ID from auth context
    const [tasks, setTasks] = useState<any[]>([]);
    const [activeTask, setActiveTask] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchTasks();
    }, []);

    const fetchTasks = async () => {
        try {
            // Mocking getting "my" tasks - in real app would use /couriers/me/active_order
            // For demo, we just fetch a pending or assigned order
            const res = await api.get('/orders');
            const myOrders = res.data.filter((o: any) => o.status === 'assigned' || o.status === 'picked_up' || o.status === 'in_transit');

            if (myOrders.length > 0) {
                // Fetch full details of the first active order
                const fullOrderRes = await api.get(`/orders/${myOrders[0].id}`);
                setActiveTask(fullOrderRes.data);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (newStatus: string) => {
        if (!activeTask) return;
        try {
            await api.put(`/admin/orders/${activeTask.id}/status`, { status: newStatus });
            // Refresh
            const updated = { ...activeTask };
            updated.status = newStatus;

            // Add history locally for smooth UI
            if (!updated.status_history) updated.status_history = [];
            updated.status_history.push({
                status: newStatus,
                timestamp: new Date().toISOString(),
                notes: 'Updated by courier app'
            });

            setActiveTask(updated);

            if (newStatus === 'delivered') {
                alert("כל הכבוד! המשלוח נמסר בהצלחה 🏆");
                setActiveTask(null); // Clear active task
                fetchTasks(); // Look for next
            }
        } catch (err) {
            console.error(err);
            alert("שגיאה בעדכון סטטוס");
        }
    };

    if (loading) return <div className="p-8 text-center text-lg">טוען משימות...</div>;

    if (!activeTask) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 text-center space-y-4">
            <div className="h-24 w-24 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold">אין משימות פעילות</h2>
            <p className="text-muted-foreground">נראה שסיימת הכל! המתן לקריאות חדשות.</p>
            <Button onClick={fetchTasks} variant="outline">רענן רשימה</Button>
        </div>
    );

    // Determine next logical step
    let nextActionLabel = "לא ידוע";
    let nextActionStatus = "";

    switch (activeTask.status) {
        case 'assigned':
            nextActionLabel = "אספתי את החבילה";
            nextActionStatus = 'picked_up';
            break;
        case 'picked_up':
            nextActionLabel = "יצאתי לדרך";
            nextActionStatus = 'in_transit';
            break;
        case 'in_transit':
            nextActionLabel = "החבילה נמסרה";
            nextActionStatus = 'delivered';
            break;
    }

    return (
        <div className="min-h-screen bg-slate-100 pb-20" dir="rtl">
            {/* Top Bar */}
            <header className="bg-slate-900 text-white p-4 sticky top-0 z-10 shadow-md">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-bold text-lg">משימה #{activeTask.order_number}</h1>
                        <p className="text-xs text-slate-300 opacity-80">
                            {activeTask.status === 'assigned' && 'בדרך לאיסוף'}
                            {activeTask.status === 'picked_up' && 'נאסף - בהמתנה בנקודה'}
                            {activeTask.status === 'in_transit' && 'בנסיעה ליעד'}
                        </p>
                    </div>
                    <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        {activeTask.status}
                    </Badge>
                </div>
            </header>

            {/* Map Placeholder */}
            <div className="h-64 bg-slate-200 relative w-full flex items-center justify-center text-slate-500">
                <MapPin className="h-8 w-8 mb-2" />
                <span className="absolute bottom-2 bg-white/80 px-2 py-1 text-xs rounded">Navigation View</span>
            </div>

            {/* Action Card */}
            <div className="p-4 -mt-6 relative z-10 px-4">
                <Card className="shadow-lg border-0">
                    <CardContent className="p-6 space-y-6">

                        {/* Current Target */}
                        <div className="text-center space-y-1">
                            <p className="text-sm text-muted-foreground">
                                {activeTask.status === 'assigned' ? 'כתובת איסוף' : 'כתובת מסירה'}
                            </p>
                            <h2 className="text-2xl font-bold">
                                {activeTask.status === 'assigned' ? activeTask.pickup.address : activeTask.delivery.address}
                            </h2>
                            <p className="text-indigo-600 font-medium text-lg">
                                {activeTask.status === 'assigned' ? activeTask.pickup.contact : activeTask.delivery.recipient}
                            </p>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="grid grid-cols-2 gap-4">
                            <Button className="h-12 text-lg bg-brand hover:bg-brand-dark gap-2">
                                <Navigation className="h-5 w-5" />
                                Waze
                            </Button>
                            <Button variant="outline" className="h-12 text-lg gap-2" onClick={() => window.open(`tel:${activeTask.status === 'assigned' ? activeTask.pickup.phone : activeTask.delivery.phone}`)}>
                                <Phone className="h-5 w-5" />
                                התקשר
                            </Button>
                        </div>

                        {/* Order Details Mini-Summary */}
                        <div className="bg-slate-50 p-3 rounded text-sm space-y-2">
                            <div className="flex justify-between">
                                <span className="text-slate-500">הערות:</span>
                                <span>{activeTask.notes || 'אין הערות'}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-slate-500">חבילה:</span>
                                <span>{activeTask.package.size}</span>
                            </div>
                        </div>

                        {/* Action Slider Button */}
                        {nextActionStatus && (
                            <Button
                                className="w-full py-8 text-xl font-bold bg-slate-900 hover:bg-slate-800 rounded-xl shadow-xl transition-all active:scale-95"
                                onClick={() => updateStatus(nextActionStatus)}
                            >
                                {nextActionLabel} &larr;
                            </Button>
                        )}

                    </CardContent>
                </Card>
            </div>

        </div>
    );
}
