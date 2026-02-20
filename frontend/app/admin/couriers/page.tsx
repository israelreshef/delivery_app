"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Bike, Car, Plus, Search, FileSignature, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";

export default function AdminCouriersPage() {
    const { user } = useAuth();
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);

    // New Courier Form State
    const [newCourier, setNewCourier] = useState({
        username: "",
        email: "",
        phone: "",
        full_name: "",
        vehicle_type: "motorcycle",
        license_plate: "",
        national_id: "",
        password: "TempPassword123!" // Default for now
    });

    useEffect(() => {
        fetchCouriers();
    }, []);

    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const socket = useSocket(token, user?.role || null);

    useEffect(() => {
        if (!socket || user?.role !== 'admin') return;

        const handleUpdate = () => {
            console.log("Real-time couriers update received");
            fetchCouriers();
        };

        socket.on('courier_availability_update', handleUpdate);
        socket.on('courier_location_update', handleUpdate);

        return () => {
            socket.off('courier_availability_update', handleUpdate);
            socket.off('courier_location_update', handleUpdate);
        };
    }, [socket, user?.role]);

    const fetchCouriers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/couriers');
            // Backend returns { data: [], total: ..., pages: ... }
            if (res.data && Array.isArray(res.data.data)) {
                setCouriers(res.data.data);
            } else if (Array.isArray(res.data)) {
                setCouriers(res.data);
            } else {
                setCouriers([]);
            }
        } catch (error) {
            console.error("Failed to fetch couriers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourier = async () => {
        try {
            const res = await api.post('/couriers', newCourier);

            toast.success("שליח נוצר בהצלחה!");
            setIsAddOpen(false);
            fetchCouriers();
            setNewCourier({
                username: "",
                email: "",
                phone: "",
                full_name: "",
                vehicle_type: "scooter",
                license_plate: "",
                national_id: "",
                password: "TempPassword123!"
            });
        } catch (error: any) {
            console.error(error);
            toast.error(error.response?.data?.error || "שגיאה ביצירת שליח");
        }
    };

    const sendContract = async (courierId: number) => {
        toast.promise(
            api.post(`/couriers/${courierId}/send-contract`),
            {
                loading: 'שולח חוזה חתימה...',
                success: 'החוזה נשלח במייל לשליח!',
                error: 'שגיאה בשליחת החוזה'
            }
        );
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'car': return <Car className="h-4 w-4" />;
            case 'bike': return <Bike className="h-4 w-4" />;
            default: return <Truck className="h-4 w-4" />; // Scooter/Truck
        }
    };

    const filteredCouriers = couriers.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ניהול שליחים</h1>
                    <p className="text-slate-500">גיוס, מעקב וניהול צי השליחים</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                            <Plus className="w-4 h-4" />
                            גיוס שליח חדש
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl">
                        <DialogHeader>
                            <DialogTitle>הוספת שליח חדש</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label>שם משתמש</Label>
                                <Input
                                    value={newCourier.username}
                                    onChange={e => setNewCourier({ ...newCourier, username: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>שם מלא</Label>
                                <Input
                                    value={newCourier.full_name}
                                    onChange={e => setNewCourier({ ...newCourier, full_name: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>אימייל</Label>
                                <Input
                                    type="email"
                                    value={newCourier.email}
                                    onChange={e => setNewCourier({ ...newCourier, email: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>טלפון</Label>
                                <Input
                                    value={newCourier.phone}
                                    onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>ת.ז.</Label>
                                <Input
                                    value={newCourier.national_id}
                                    onChange={e => setNewCourier({ ...newCourier, national_id: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>מספר לוחית רישוי</Label>
                                <Input
                                    value={newCourier.license_plate}
                                    onChange={e => setNewCourier({ ...newCourier, license_plate: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>סוג רכב</Label>
                                <Select
                                    value={newCourier.vehicle_type}
                                    onValueChange={v => setNewCourier({ ...newCourier, vehicle_type: v })}
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="motorcycle">קטנוע</SelectItem>
                                        <SelectItem value="car">רכב פרטי</SelectItem>
                                        <SelectItem value="bicycle">אופניים חשמליים</SelectItem>
                                        <SelectItem value="van">משאית/מסחרית</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="outline" onClick={() => setIsAddOpen(false)}>ביטול</Button>
                            <Button onClick={handleAddCourier}>צור שליח</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </header>

            <Card className="border-none shadow-md">
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="חיפוש שליח..."
                                className="pr-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="text-right">שם מלא</TableHead>
                                <TableHead className="text-right">רכב</TableHead>
                                <TableHead className="text-right">סטטוס זמינות</TableHead>
                                <TableHead className="text-right">דירוג</TableHead>
                                <TableHead className="text-right">משלוחים</TableHead>
                                <TableHead className="text-right">סטטוס גיוס</TableHead>
                                <TableHead className="text-right">פעולות</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10">טוען נתונים...</TableCell>
                                </TableRow>
                            ) : filteredCouriers.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-10 text-slate-500">לא נמצאו שליחים</TableCell>
                                </TableRow>
                            ) : (
                                filteredCouriers.map((courier) => (
                                    <TableRow key={courier.id}>
                                        <TableCell className="font-medium">
                                            <div>{courier.full_name}</div>
                                            <div className="text-xs text-muted-foreground">{courier.phone}</div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-2">
                                                {getVehicleIcon(courier.vehicle_type)}
                                                <span className="text-sm">{courier.license_plate}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={courier.is_available ? "default" : "secondary"}>
                                                {courier.is_available ? "זמין" : "לא זמין"}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>⭐ {courier.rating?.toFixed(1)}</TableCell>
                                        <TableCell>{courier.total_deliveries}</TableCell>
                                        <TableCell>
                                            {courier.onboarding_status === 'new' && <Badge variant="outline" className="text-yellow-600 bg-yellow-50 border-yellow-200">מועמד חדש</Badge>}
                                            {courier.onboarding_status === 'active' && <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">פעיל</Badge>}
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex gap-2">
                                                <Button size="icon" variant="ghost" title="שלח חוזה" onClick={() => sendContract(courier.id)}>
                                                    <FileSignature className="w-4 h-4 text-purple-600" />
                                                </Button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    );
}
