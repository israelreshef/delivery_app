"use client";

import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { Header } from "@/components/dashboard/header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Phone, MapPin, Truck, Search, Plus, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type Courier = {
    id: number;
    full_name: string;
    vehicle_type: string;
    is_available: boolean;
    user: {
        phone: string;
    }
    current_location_lat?: number;
    current_location_lng?: number;
};

export default function CouriersPage() {
    const [couriers, setCouriers] = useState<Courier[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCouriers();
    }, []);

    const fetchCouriers = async () => {
        try {
            const res = await api.get('/couriers');
            setCouriers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleSendContract = async (id: number, name: string) => {
        toast.promise(api.post(`/couriers/${id}/send-contract`), {
            loading: `שולח חוזה ל-${name}...`,
            success: 'החוזה נשלח בהצלחה למייל השליח!',
            error: 'שגיאה בשליחת החוזה (ודא שההגדרות תקינות)'
        });
    };

    return (
        <div className="flex h-screen bg-background text-right" dir="rtl">
            <AdminSidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold">ניהול שליחים</h1>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            הוסף שליח חדש
                        </Button>
                    </div>

                    <div className="grid gap-6 md:grid-cols-3 mb-6">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">סה"כ שליחים</CardTitle>
                                <Truck className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{couriers.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">זמינים כעת</CardTitle>
                                <div className="h-2 w-2 rounded-full bg-green-500" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold text-green-600">
                                    {couriers.filter(c => c.is_available).length}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>רשימת שליחים</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="חיפוש לפי שם..." className="pr-8" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">שם מלא</TableHead>
                                        <TableHead className="text-right">כלי רכב</TableHead>
                                        <TableHead className="text-right">טלפון</TableHead>
                                        <TableHead className="text-right">סטטוס</TableHead>
                                        <TableHead className="text-right">מיקום אחרון</TableHead>
                                        <TableHead className="text-right">פעולות</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {couriers.map((courier) => (
                                        <TableRow key={courier.id}>
                                            <TableCell className="font-medium">{courier.full_name}</TableCell>
                                            <TableCell>
                                                {courier.vehicle_type === 'motorcycle' && '🛵 אופנוע'}
                                                {courier.vehicle_type === 'car' && '🚗 רכב'}
                                                {courier.vehicle_type === 'bicycle' && '🚲 אופניים'}
                                                {courier.vehicle_type === 'van' && '🚐 משאית'}
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2">
                                                    <Phone className="h-3 w-3 text-muted-foreground" />
                                                    {courier.user?.phone || '-'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={courier.is_available ? "default" : "secondary"} className={courier.is_available ? "bg-green-500 hover:bg-green-600" : ""}>
                                                    {courier.is_available ? 'זמין' : 'לא זמין'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <MapPin className="h-3 w-3" />
                                                    {courier.current_location_lat ? 'זוהה במפה' : 'לא ידוע'}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex gap-2">
                                                    <Button variant="outline" size="sm">צפה במפה</Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 gap-1"
                                                        onClick={() => handleSendContract(courier.id, courier.full_name)}
                                                    >
                                                        <FileText className="h-3 w-3" />
                                                        שלח חוזה
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {couriers.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                                לא נמצאו שליחים במערכת
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
