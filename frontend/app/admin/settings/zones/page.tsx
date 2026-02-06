"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Map, MapPin, Plus, Trash2, Edit2 } from "lucide-react";
import { toast } from "sonner";
import dynamic from 'next/dynamic';

// Define Zone Interface
interface Zone {
    id: number;
    name: string;
    description: string;
    price_multiplier: number;
    base_price_addition: number;
    is_active: boolean;
    polygon_coords: [number, number][];
}

// Dynamically import Map (client-side only)
const ZoneMap = dynamic(() => import('@/components/admin/ZoneMap').then(mod => ({ default: mod.default })), {
    ssr: false,
    loading: () => <div className="h-[400px] w-full bg-slate-100 animate-pulse flex items-center justify-center">טוען מפה...</div>
});

export default function ZoneManagementPage() {
    const [zones, setZones] = useState<Zone[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddOpen, setIsAddOpen] = useState(false);

    // New Zone Form
    const [newZone, setNewZone] = useState({
        name: "",
        description: "",
        price_multiplier: 1.0,
        base_price_addition: 0,
        polygon_coords: [] as [number, number][] // Would be set by map drawing
    });

    useEffect(() => {
        fetchZones();
    }, []);

    const fetchZones = async () => {
        setLoading(true);
        try {
            const token = localStorage.getItem('token');
            const res = await fetch('http://localhost:5000/api/zones', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                const data = await res.json();
                setZones(data);
            }
        } catch (error) {
            toast.error("שגיאה בטעינת אזורים");
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm("האם אתה בטוח שברצונך למחוק אזור זה?")) return;

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`http://localhost:5000/api/zones/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            if (res.ok) {
                toast.success("אזור נמחק בהצלחה");
                fetchZones();
            }
        } catch (error) {
            toast.error("שגיאה במחיקת אזור");
        }
    };

    const handleCreateMockZone = async () => {
        // Quick create for testing without complex map drawing UI
        try {
            const token = localStorage.getItem('token');
            const mockZone = {
                name: "אזור תל אביב מרכז",
                description: "אזור חלוקה ראשי",
                price_multiplier: 1.2,
                base_price_addition: 10,
                polygon_coords: [[32.08, 34.78], [32.09, 34.79], [32.07, 34.79]] // Triangle
            };

            const res = await fetch('http://localhost:5000/api/zones', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(mockZone)
            });

            if (res.ok) {
                toast.success("אזור נוצר (Mock)");
                fetchZones();
            }
        } catch (error) {
            toast.error("שגיאה ביצירה");
        }
    };

    return (
        <div className="p-8 space-y-6 bg-slate-50 min-h-screen" dir="rtl">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">ניהול אזורי חלוקה</h1>
                    <p className="text-slate-500">הגדרת אזורים גיאוגרפיים ותמחור</p>
                </div>
                <Button onClick={handleCreateMockZone} className="gap-2">
                    <Plus className="w-4 h-4" />
                    הוסף אזור חדש (מהיר)
                </Button>
            </header>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Zones List */}
                <Card className="lg:col-span-1 border-none shadow-md h-fit">
                    <CardHeader>
                        <CardTitle>רשימת אזורים</CardTitle>
                        <CardDescription>אזורים פעילים במערכת</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead className="text-right">שם</TableHead>
                                    <TableHead className="text-center">מכפיל</TableHead>
                                    <TableHead className="text-left"></TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8">טוען...</TableCell>
                                    </TableRow>
                                ) : zones.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={3} className="text-center py-8 text-slate-500">אין אזורים מוגדרים</TableCell>
                                    </TableRow>
                                ) : (
                                    zones.map((zone) => (
                                        <TableRow key={zone.id}>
                                            <TableCell className="font-medium">
                                                <div>{zone.name}</div>
                                                <div className="text-xs text-muted-foreground">{zone.description}</div>
                                            </TableCell>
                                            <TableCell className="text-center">x{zone.price_multiplier}</TableCell>
                                            <TableCell>
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500" onClick={() => handleDelete(zone.id)}>
                                                        <Trash2 className="w-4 h-4" />
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

                {/* Map Preview */}
                <Card className="lg:col-span-2 border-none shadow-md overflow-hidden">
                    <CardHeader className="bg-slate-100 border-b">
                        <CardTitle className="flex items-center gap-2">
                            <Map className="w-5 h-5 text-blue-600" />
                            מפת אזורים
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="p-0 h-[600px] relative">
                        {/* We will implement a ZoneMap component next that accepts 'zones' prop */}
                        <ZoneMap zones={zones} />
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
