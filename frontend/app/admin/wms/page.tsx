"use client";

import { Header } from "@/components/dashboard/header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowDown, ArrowUp, Box, Package, Search, Barcode } from "lucide-react";
import { useState, useEffect } from "react";
import { wmsApi, InventoryItem } from "@/lib/api/wms";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function WmsDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Quick Action States
    const [actionType, setActionType] = useState<'in' | 'out'>('in');
    const [actionSku, setActionSku] = useState("");
    const [actionQty, setActionQty] = useState(1);
    const [newItemName, setNewItemName] = useState(""); // For new items check-in
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    useEffect(() => {
        fetchInventory();
    }, []);

    const fetchInventory = async () => {
        try {
            const data = await wmsApi.getInventory();
            setInventory(data);
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בטעינת המלאי");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        try {
            if (actionType === 'in') {
                await wmsApi.checkIn({
                    sku: actionSku,
                    quantity: actionQty,
                    name: newItemName || undefined // Send name only if provided (for new items)
                });
                toast.success(`נקלטו ${actionQty} יחידות של ${actionSku}`);
            } else {
                await wmsApi.checkOut({
                    sku: actionSku,
                    quantity: actionQty
                });
                toast.success(`שוחררו ${actionQty} יחידות של ${actionSku}`);
            }
            setIsDialogOpen(false);
            fetchInventory();
            // Reset form
            setActionSku("");
            setActionQty(1);
            setNewItemName("");
        } catch (err: any) {
            toast.error(err.response?.data?.error || "פעולה נכשלה");
        }
    };

    const filteredItems = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex flex-col h-full overflow-hidden">
            <Header />
            <main className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                <div className="max-w-7xl mx-auto space-y-6">

                    <div className="flex justify-between items-center">
                        <div>
                            <h1 className="text-3xl font-bold tracking-tight">ניהול מחסן (WMS)</h1>
                            <p className="text-muted-foreground">מעקב מלאי, קליטת סחורה ושילוח</p>
                        </div>
                        <div className="flex gap-2">
                            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                                <DialogTrigger asChild>
                                    <Button onClick={() => setActionType('in')} className="bg-blue-600 hover:bg-blue-700">
                                        <ArrowDown className="ml-2 h-4 w-4" />
                                        קליטת סחורה
                                    </Button>
                                </DialogTrigger>
                                <DialogContent>
                                    <DialogHeader>
                                        <DialogTitle>
                                            {actionType === 'in' ? 'קליטת סחורה למלאי (Check-in)' : 'שילוח סחורה (Check-out)'}
                                        </DialogTitle>
                                    </DialogHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>מק"ט (SKU) / ברקוד</Label>
                                            <div className="flex gap-2">
                                                <Input
                                                    value={actionSku}
                                                    onChange={e => setActionSku(e.target.value)}
                                                    placeholder="סרוק או הקלד..."
                                                />
                                                <Button variant="outline" size="icon">
                                                    <Barcode className="h-4 w-4" />
                                                </Button>
                                            </div>
                                        </div>

                                        {actionType === 'in' && inventory.find(i => i.sku === actionSku) === undefined && actionSku.length > 0 && (
                                            <div className="space-y-2 bg-yellow-50 p-3 rounded-md border border-yellow-100">
                                                <Label className="text-yellow-800">פריט חדש! נא להזין שם:</Label>
                                                <Input
                                                    value={newItemName}
                                                    onChange={e => setNewItemName(e.target.value)}
                                                    placeholder="שם המוצר"
                                                />
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <Label>כמות</Label>
                                            <Input
                                                type="number"
                                                min="1"
                                                value={actionQty}
                                                onChange={e => setActionQty(parseInt(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                    <DialogFooter>
                                        <Button onClick={handleAction}>ביצוע פעולה</Button>
                                    </DialogFooter>
                                </DialogContent>
                            </Dialog>

                            <Button variant="outline" onClick={() => { setActionType('out'); setIsDialogOpen(true); }}>
                                <ArrowUp className="ml-2 h-4 w-4" />
                                שילוח
                            </Button>
                        </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">סה"כ פריטים</CardTitle>
                                <Package className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">{inventory.length}</div>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">ערך מלאי כולל</CardTitle>
                                <Box className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent>
                                <div className="text-2xl font-bold">
                                    ₪{inventory.reduce((acc, item) => acc + (item.quantity_on_hand * item.unit_value), 0).toLocaleString()}
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Inventory Table */}
                    <Card>
                        <CardHeader>
                            <div className="flex justify-between items-center">
                                <CardTitle>מלאי נוכחי</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder="חיפוש פריט..."
                                        className="pr-8"
                                        value={searchTerm}
                                        onChange={e => setSearchTerm(e.target.value)}
                                    />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {loading ? (
                                <div className="text-center py-4">טוען נתונים...</div>
                            ) : (
                                <div className="border rounded-md">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b bg-muted/50">
                                                <th className="p-3 text-right font-medium">SKU</th>
                                                <th className="p-3 text-right font-medium">שם פריט</th>
                                                <th className="p-3 text-right font-medium">במלאי</th>
                                                <th className="p-3 text-right font-medium">זמין</th>
                                                <th className="p-3 text-right font-medium">ערך יח'</th>
                                                <th className="p-3 text-center font-medium">סטטוס</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.map(item => (
                                                <tr key={item.id} className="border-b hover:bg-muted/50 transition-colors">
                                                    <td className="p-3 font-mono">{item.sku}</td>
                                                    <td className="p-3 font-medium">{item.name}</td>
                                                    <td className="p-3">{item.quantity_on_hand}</td>
                                                    <td className="p-3">{item.quantity_available}</td>
                                                    <td className="p-3">₪{item.unit_value}</td>
                                                    <td className="p-3 text-center">
                                                        {item.quantity_available > 10 ? (
                                                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">במלאי</Badge>
                                                        ) : item.quantity_available > 0 ? (
                                                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">מלאי נמוך</Badge>
                                                        ) : (
                                                            <Badge variant="destructive">חסר במלאי</Badge>
                                                        )}
                                                    </td>
                                                </tr>
                                            ))}
                                            {filteredItems.length === 0 && (
                                                <tr>
                                                    <td colSpan={6} className="p-8 text-center text-muted-foreground">
                                                        לא נמצאו פריטים
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card>

                </div>
            </main>
        </div>
    );
}
