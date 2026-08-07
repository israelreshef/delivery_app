"use client";

import { Header } from "@/components/dashboard/header";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    ArrowDown, ArrowUp, Box, Package, Search, Barcode,
    Map, Layers, ShieldCheck, Activity, Server
} from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { wmsApi, InventoryItem, WarehouseTopology } from "@/lib/api/wms";
import { toast } from "sonner";
import { BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import styles from "./wms-dashboard.module.css";

const COLORS = ['#3b82f6', '#10b981', '#145DDB', '#ef4444', '#8b5cf6', '#06b6d4'];

export default function WmsDashboard() {
    const [inventory, setInventory] = useState<InventoryItem[]>([]);
    const [topology, setTopology] = useState<WarehouseTopology[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // Quick Action States
    const [actionType, setActionType] = useState<'in' | 'out'>('in');
    const [actionSku, setActionSku] = useState("");
    const [actionQty, setActionQty] = useState(1);
    const [newItemName, setNewItemName] = useState("");
    const [newItemVolume, setNewItemVolume] = useState(10);
    const [selectedBinId, setSelectedBinId] = useState<number | ''>('');
    const [isDialogOpen, setIsDialogOpen] = useState(false);

    // Package Locator State
    const [packageLocations, setPackageLocations] = useState<any[]>([]);
    const [checkInMode, setCheckInMode] = useState<'sku' | 'order'>('sku');
    const [actionOrderNumber, setActionOrderNumber] = useState("");

    // New Warehouse Modal State
    const [isNewWhDialogOpen, setIsNewWhDialogOpen] = useState(false);
    const [newWhName, setNewWhName] = useState("");
    const [newWhAddress, setNewWhAddress] = useState("");

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [invData, topData, pkgData] = await Promise.all([
                wmsApi.getInventory(),
                wmsApi.getTopology(),
                wmsApi.getOrderLocations()
            ]);
            setInventory(invData);
            setTopology(topData);
            setPackageLocations(pkgData || []);
        } catch (err) {
            console.error(err);
            toast.error("שגיאה בטעינת נתוני מחסן");
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async () => {
        if (!selectedBinId) {
            toast.error("חובה לבחור מיקום פיזי (Bin)");
            return;
        }

        try {
            if (actionType === 'in') {
                await wmsApi.checkIn({
                    sku: actionSku,
                    quantity: actionQty,
                    bin_id: selectedBinId as number,
                    name: newItemName || undefined,
                    volume_per_unit_cm3: newItemVolume
                });
                toast.success(`נקלטו ${actionQty} יחידות במיקום נבחר`);
            } else {
                await wmsApi.checkOut({
                    sku: actionSku,
                    quantity: actionQty,
                    bin_id: selectedBinId as number
                });
                toast.success(`שוחררו ${actionQty} יחידות מהמיקום`);
            }
            setIsDialogOpen(false);
            fetchData();
            // Reset form
            setActionSku("");
            setActionQty(1);
            setNewItemName("");
            setSelectedBinId('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "פעולה נכשלה בדוק מגבלת נפח/כמות");
        }
    };

    const handleOrderAction = async () => {
        if (!actionOrderNumber) {
            toast.error("חובה להזין מספר הזמנה/ברקוד");
            return;
        }

        try {
            if (actionType === 'in') {
                if (!selectedBinId) {
                    toast.error("חובה לבחור מיקום פיזי (Bin)");
                    return;
                }
                await wmsApi.checkInOrder({ order_number: actionOrderNumber, bin_id: selectedBinId as number });
                toast.success("הזמנה נקלטה במחסן בהצלחה");
            } else {
                await wmsApi.checkOutOrder({ order_number: actionOrderNumber });
                toast.success("הזמנה שוחררה מהמחסן בהצלחה");
            }
            setIsDialogOpen(false);
            fetchData();
            // Reset
            setActionOrderNumber("");
            setSelectedBinId('');
        } catch (err: any) {
            toast.error(err.response?.data?.error || "פעולה נכשלה");
        }
    };

    const handleCreateWarehouse = async () => {
        if (!newWhName) {
            toast.error("חובה להזין שם מחסן");
            return;
        }
        try {
            await wmsApi.createWarehouse({ name: newWhName, address: newWhAddress });
            toast.success("מחסן נוצר בהצלחה!");
            setIsNewWhDialogOpen(false);
            setNewWhName("");
            setNewWhAddress("");
            fetchData();
        } catch (err: any) {
            toast.error(err.response?.data?.error || "יצירת המחסן נכשלה");
        }
    };

    const toggleDialog = (type: 'in' | 'out') => {
        setActionType(type);
        setIsDialogOpen(true);
    };

    const filteredItems = inventory.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Derived Analytics Analytics
    const totalItems = inventory.reduce((acc, item) => acc + item.quantity_on_hand, 0);
    const totalValue = inventory.reduce((acc, item) => acc + (item.quantity_on_hand * parseFloat(item.unit_value || '0')), 0);

    // Flat bin list for dropdowns
    const availableBins = useMemo(() => {
        const bins: { id: number, label: string, freeSpace: number | null }[] = [];
        topology.forEach(w => {
            w.zones.forEach(z => {
                z.bins.forEach(b => {
                    bins.push({
                        id: b.id,
                        label: `${w.name} > ${z.name} > ${b.bin_index}`,
                        freeSpace: b.max_volume ? (b.max_volume - b.current_volume) : null
                    });
                });
            });
        });
        return bins;
    }, [topology]);

    // Pie chart: capacity per warehouse
    const warehouseCapacityData = useMemo(() => {
        return topology.map(w => {
            let used = 0;
            w.zones.forEach(z => z.bins.forEach(b => used += b.current_volume));
            return { name: w.name, value: used };
        }).filter(d => d.value > 0);
    }, [topology]);

    return (
        <div className={styles.main}>
            <Header />

            <div className={styles.headerContainer}>
                <div className={styles.headerContent}>
                    <div className={styles.titleArea}>
                        <h1>ניהול מחסן מתקדם (WMS)</h1>
                        <p className={styles.subtitle}>מעקב סחורה, ניהול שטחי אחסון ואינדקס מיקומים</p>
                    </div>
                    <div className={styles.actionsArea}>
                        <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 backdrop-blur-md border border-slate-700 hover:bg-slate-700 text-white transition-all text-sm font-medium mr-auto" onClick={() => setIsNewWhDialogOpen(true)}>
                            + הוסף מחסן
                        </button>
                        <button className={styles.primaryButton} onClick={() => toggleDialog('in')}>
                            <ArrowDown size={18} /> קליטת סחורה (IN)
                        </button>
                        <button className={styles.secondaryButton} onClick={() => toggleDialog('out')}>
                            <ArrowUp size={18} /> שילוח (OUT)
                        </button>
                    </div>
                </div>
            </div>

            {/* Top Metrics Map */}
            <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconPrimary}`}>
                        <Package size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>סה"כ יחידות במלאי</h3>
                        <p>{loading ? '-' : totalItems.toLocaleString()}</p>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconSuccess}`}>
                        <Box size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>ערך מלאי מוערך</h3>
                        <p>{loading ? '-' : `₪${totalValue.toLocaleString()}`}</p>
                    </div>
                </div>
                <div className={styles.statCard}>
                    <div className={`${styles.statIconWrapper} ${styles.statIconWarning}`}>
                        <Map size={24} />
                    </div>
                    <div className={styles.statContent}>
                        <h3>מספר מחסנים רשומים</h3>
                        <p>{loading ? '-' : topology.length}</p>
                    </div>
                </div>
            </div>

            {/* Check-in / Out Modal */}
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogContent className="fixed top-[50%] left-[50%] z-50 w-full max-w-lg translate-x-[-50%] translate-y-[-50%] rounded-xl border border-slate-800 bg-[#0a0a0f] text-slate-50 shadow-2xl overflow-hidden p-0" dir="rtl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-l from-white to-slate-400 bg-clip-text text-transparent">
                            {actionType === 'in' ? 'קליטת פריט לאיתור (Check-in)' : 'משיכת פריט מאיתור (Check-out)'}
                        </DialogTitle>
                    </DialogHeader>
                    <Tabs value={checkInMode} onValueChange={(v: any) => setCheckInMode(v)} className="w-full" dir="rtl">
                        <TabsList className="w-full grid grid-cols-2 rounded-none border-b border-slate-800 bg-transparent p-0">
                            <TabsTrigger value="sku" className="rounded-none border-b-2 border-transparent data-[state=active]:border-teal-500 data-[state=active]:bg-teal-500/10 data-[state=active]:text-teal-400 py-3 transition-all">
                                מלאי / גלובלי (SKU)
                            </TabsTrigger>
                            <TabsTrigger value="order" className="rounded-none border-b-2 border-transparent data-[state=active]:border-blue-500 data-[state=active]:bg-blue-500/10 data-[state=active]:text-blue-400 py-3 transition-all">
                                חבילת לקוח (Order)
                            </TabsTrigger>
                        </TabsList>

                        {/* SKU TAB */}
                        <TabsContent value="sku" className="m-0 outline-none">
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">מק"ט (SKU) / ברקוד</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            className="bg-slate-900 border-slate-700 text-white focus:ring-teal-500"
                                            value={actionSku}
                                            onChange={e => setActionSku(e.target.value)}
                                            placeholder="הקלד SKU מדויק..."
                                        />
                                        <Button variant="outline" size="icon" className="bg-slate-800 border-slate-700 hover:bg-slate-700">
                                            <Barcode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>

                                {actionType === 'in' && inventory.find(i => i.sku === actionSku) === undefined && actionSku.length > 0 && (
                                    <div className="p-4 bg-teal-900/20 border border-teal-800/50 rounded-lg space-y-4">
                                        <Label className="text-teal-300 font-medium flex items-center gap-2">
                                            <ShieldCheck className="w-4 h-4" /> SKU חדש זוהה. נא להזין פרטים:
                                        </Label>
                                        <Input
                                            className="bg-slate-900 border-slate-700 text-white"
                                            value={newItemName}
                                            onChange={e => setNewItemName(e.target.value)}
                                            placeholder="שם המוצר"
                                        />
                                        <div className="space-y-2">
                                            <Label className="text-slate-400 text-xs">נפח יחידה (סמ"ק)</Label>
                                            <Input
                                                type="number"
                                                className="bg-slate-900 border-slate-700 text-white"
                                                value={newItemVolume}
                                                onChange={e => setNewItemVolume(Number(e.target.value))}
                                            />
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-slate-300">כמות (יחידות)</Label>
                                    <Input
                                        type="number"
                                        min="1"
                                        className="bg-slate-900 border-slate-700 text-white focus:ring-teal-500"
                                        value={actionQty}
                                        onChange={e => setActionQty(parseInt(e.target.value))}
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label className="text-slate-300">מיקום פיזי (Bin)</Label>
                                    <select
                                        className="w-full flex h-10 items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-teal-500"
                                        value={selectedBinId}
                                        onChange={e => setSelectedBinId(Number(e.target.value))}
                                    >
                                        <option value="">-- בחר אינדקס מיקום --</option>
                                        {availableBins.map(b => (
                                            <option key={b.id} value={b.id}>
                                                {b.label} {b.freeSpace !== null ? `(פנוי: ${b.freeSpace} סמק)` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <DialogFooter className="p-6 pt-2 border-t border-slate-800">
                                <Button
                                    onClick={handleAction}
                                    className="w-full bg-teal-600 hover:bg-teal-700 text-white shadow-lg"
                                >
                                    {actionType === 'in' ? 'אחסן סחורה במיקום הנבחר' : 'משוך סחורה מהמיקום הנבחר'}
                                </Button>
                            </DialogFooter>
                        </TabsContent>

                        {/* ORDER TAB */}
                        <TabsContent value="order" className="m-0 outline-none">
                            <div className="p-6 space-y-5">
                                <div className="space-y-2">
                                    <Label className="text-slate-300">מספר הזמנה / חבילה</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            className="bg-slate-900 border-slate-700 text-white focus:ring-blue-500"
                                            value={actionOrderNumber}
                                            onChange={e => setActionOrderNumber(e.target.value)}
                                            placeholder="לדוגמה: ORD-12345"
                                        />
                                        <Button variant="outline" size="icon" className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300">
                                            <Barcode className="h-4 w-4" />
                                        </Button>
                                    </div>
                                    <p className="text-xs text-slate-500 mt-1">
                                        סריקת ברקוד ההזמנה תאתר את החבילה ותשייך אותה למיקום הנבחר פיזית.
                                    </p>
                                </div>

                                {actionType === 'in' && (
                                    <div className="space-y-2 pt-2 border-t border-slate-800">
                                        <Label className="text-slate-300">לאיזה מיקום לאחסן? (Bin)</Label>
                                        <select
                                            className="w-full flex h-10 items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white focus:ring-1 focus:ring-blue-500"
                                            value={selectedBinId}
                                            onChange={e => setSelectedBinId(Number(e.target.value))}
                                        >
                                            <option value="">-- בחר אינדקס מיקום --</option>
                                            {availableBins.map(b => (
                                                <option key={b.id} value={b.id}>
                                                    {b.label} {b.freeSpace !== null ? `(פנוי: ${b.freeSpace} סמק)` : ''}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                )}
                            </div>
                            <DialogFooter className="p-6 pt-2 border-t border-slate-800">
                                <Button
                                    onClick={handleOrderAction}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white shadow-lg"
                                >
                                    {actionType === 'in' ? 'קלוט הזמנה למחסן במיקום' : 'הוצא הזמנה מהמחסן'}
                                </Button>
                            </DialogFooter>
                        </TabsContent>
                    </Tabs>
                </DialogContent>
            </Dialog>

            {/* New Warehouse Modal */}
            <Dialog open={isNewWhDialogOpen} onOpenChange={setIsNewWhDialogOpen}>
                <DialogContent className="fixed top-[50%] left-[50%] z-50 w-full max-w-md translate-x-[-50%] translate-y-[-50%] rounded-xl border border-slate-800 bg-[#0a0a0f] text-slate-50 shadow-2xl overflow-hidden p-0" dir="rtl">
                    <DialogHeader className="p-6 pb-2">
                        <DialogTitle className="text-xl font-bold bg-gradient-to-l from-white to-slate-400 bg-clip-text text-transparent">
                            הגדרת מתקן אחסון חדש
                        </DialogTitle>
                    </DialogHeader>
                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <Label className="text-slate-300">שם המחסן</Label>
                            <Input
                                className="bg-slate-900 border-slate-700 text-white focus:ring-emerald-500"
                                value={newWhName}
                                onChange={e => setNewWhName(e.target.value)}
                                placeholder="לדוגמה: מחסן מרכזי בפתח תקווה"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-slate-300">כתובת הפיזית מלאה (אופציונלי)</Label>
                            <Input
                                className="bg-slate-900 border-slate-700 text-white focus:ring-emerald-500"
                                value={newWhAddress}
                                onChange={e => setNewWhAddress(e.target.value)}
                                placeholder="לדוגמה: רחוב היצירה 15"
                            />
                        </div>
                    </div>
                    <DialogFooter className="p-6 pt-2 border-t border-slate-800">
                        <Button
                            onClick={handleCreateWarehouse}
                            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                        >
                            צור מחסן חדש
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Tabs defaultValue="topology" className="w-full mt-2" dir="rtl">
                <TabsList className="bg-slate-800/50 border border-slate-700 p-1 rounded-xl mb-6">
                    <TabsTrigger value="topology" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Layers className="w-4 h-4 ml-2" /> מפת מחסן (Topology)
                    </TabsTrigger>
                    <TabsTrigger value="matrix" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Search className="w-4 h-4 ml-2" /> אינדקס פריטים (Matrix)
                    </TabsTrigger>
                    <TabsTrigger value="packages" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Package className="w-4 h-4 ml-2" /> איתור חבילות (Orders)
                    </TabsTrigger>
                    <TabsTrigger value="analytics" className="rounded-lg data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                        <Activity className="w-4 h-4 ml-2" /> דיווח וניתוח (Analytics)
                    </TabsTrigger>
                </TabsList>

                {/* Tab: Topology */}
                <TabsContent value="topology" className="mt-0 outline-none">
                    {loading ? <div className="p-10 text-center text-slate-500">טוען מבנה מחסנים...</div> : (
                        <div>
                            {topology.map(wh => (
                                <div key={wh.id} className={styles.warehouseBlock}>
                                    <h2 className={styles.warehouseHeader}>
                                        <Server className="text-blue-500 w-5 h-5" />
                                        {wh.name}
                                        <span className="text-sm font-normal text-slate-500 mr-3">({wh.address})</span>
                                    </h2>
                                    <div className={styles.zoneGrid}>
                                        {wh.zones.map(zone => (
                                            <div key={zone.id} className={styles.zoneCard}>
                                                <div className={styles.zoneTitle}>
                                                    <span>{zone.name}</span>
                                                    <span className="text-xs px-2 py-0.5 bg-slate-800 rounded-full">{zone.type}</span>
                                                </div>
                                                <div className={styles.binList}>
                                                    {zone.bins.map(bin => (
                                                        <div key={bin.id} className={styles.binItem}>
                                                            <div className={styles.binTop}>
                                                                <span className={styles.binName}>{bin.bin_index}</span>
                                                                <span className="text-xs bg-black/40 px-2 py-1 rounded text-slate-300">
                                                                    {bin.items_count} פריטים
                                                                </span>
                                                            </div>
                                                            {bin.max_volume ? (
                                                                <>
                                                                    <div className={styles.progressTrack}>
                                                                        <div
                                                                            className={`${styles.progressFill} ${bin.percent_full > 85 ? styles.progressFillWarning : ''}`}
                                                                            style={{ width: `${Math.min(100, bin.percent_full)}%` }}
                                                                        ></div>
                                                                    </div>
                                                                    <div className={styles.binDetails}>
                                                                        <span>{bin.percent_full}% תפוסה</span>
                                                                        <span>{bin.current_volume} / {bin.max_volume} סמ"ק</span>
                                                                    </div>
                                                                </>
                                                            ) : (
                                                                <div className="text-[10px] text-slate-500 text-left">קיבולת בלתי מוגבלת</div>
                                                            )}

                                                            {/* Mini item list for specific bin */}
                                                            {bin.items.length > 0 && (
                                                                <div className="mt-2 text-[11px] text-slate-400 border-t border-white/5 pt-2 flex flex-col gap-1">
                                                                    {bin.items.slice(0, 3).map((it, i) => (
                                                                        <div key={i} className="flex justify-between">
                                                                            <span>{it.sku} ({it.item_name})</span>
                                                                            <span className="text-slate-200">{it.quantity} יח'</span>
                                                                        </div>
                                                                    ))}
                                                                    {bin.items.length > 3 && <div className="text-center text-slate-600 mt-1">+{bin.items.length - 3} פריטים נוספים</div>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    ))}
                                                    {zone.bins.length === 0 && <div className="text-xs text-slate-600 p-2">אין מיקומים מוגדרים תחת אזור זה.</div>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </TabsContent>

                {/* Tab: Matrix */}
                <TabsContent value="matrix" className="mt-0 outline-none">
                    <div className={styles.glassPanel}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">אינדקס מיקומי סחורה</h2>
                            <div className="relative w-64">
                                <Search className="absolute right-3 top-2.5 h-4 w-4 text-slate-400" />
                                <Input
                                    placeholder="חיפוש מקט או שם..."
                                    className="pr-9 bg-slate-900/50 border-slate-700 text-white"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.glassTable}>
                                <thead>
                                    <tr>
                                        <th>מק"ט פריט</th>
                                        <th>שם מלא</th>
                                        <th>כמות יחידות גלובלית</th>
                                        <th>מיקומים פיזיים (Bins)</th>
                                        <th>נפח יח' (סמ"ק)</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredItems.map(item => (
                                        <tr key={item.id}>
                                            <td className={styles.itemSku}>{item.sku}</td>
                                            <td>{item.name}</td>
                                            <td className="font-bold">{item.quantity_on_hand}</td>
                                            <td>
                                                <div className="flex flex-col gap-1.5">
                                                    {item.physical_locations && item.physical_locations.length > 0 ? (
                                                        item.physical_locations.map(loc => (
                                                            <div key={loc.bin_id} className="flex items-center gap-2 text-xs">
                                                                <span className="bg-slate-800/80 border border-slate-700 px-2 py-0.5 rounded text-blue-300 font-mono tracking-tight">
                                                                    {loc.path}
                                                                </span>
                                                                <span className="text-slate-400">× {loc.quantity} יח'</span>
                                                            </div>
                                                        ))
                                                    ) : (
                                                        <span className="text-slate-500 text-xs italic">לא משויך למיקום ספציפי</span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="text-slate-400">{item.volume_per_unit_cm3 || 'לא מוגדר'}</td>
                                        </tr>
                                    ))}
                                    {filteredItems.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-slate-500">
                                                לא נמצאו תוצאות לחיפוש
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab: Packages */}
                <TabsContent value="packages" className="mt-0 outline-none">
                    <div className={styles.glassPanel}>
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-white">איתור הזמנות שילוח במחסן</h2>
                        </div>

                        <div className={styles.tableContainer}>
                            <table className={styles.glassTable}>
                                <thead>
                                    <tr>
                                        <th>מספר הזמנה / חבילה</th>
                                        <th>תיאור תכולה</th>
                                        <th>גודל נרשם</th>
                                        <th>מיקום מחסן (Bin)</th>
                                        <th>סטטוס הזמנה</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {packageLocations.map((pkg, idx) => (
                                        <tr key={idx}>
                                            <td className="font-mono text-blue-300 font-bold">{pkg.order_number}</td>
                                            <td>{pkg.package_description || 'לא צויין'}</td>
                                            <td>{pkg.package_size}</td>
                                            <td>
                                                <span className="bg-slate-800 border border-slate-700 px-2 py-1 rounded text-emerald-300 font-mono tracking-tight text-sm">
                                                    {pkg.location_path}
                                                </span>
                                            </td>
                                            <td><span className="text-slate-400 text-xs px-2 py-1 bg-slate-800 rounded">{pkg.status}</span></td>
                                        </tr>
                                    ))}
                                    {packageLocations.length === 0 && !loading && (
                                        <tr>
                                            <td colSpan={5} className="text-center p-8 text-slate-500">
                                                אין חבילות המשויכות כרגע למיקומים פיזיים במחסנים.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </TabsContent>

                {/* Tab: Analytics */}
                <TabsContent value="analytics" className="mt-0 outline-none">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className={styles.glassPanel}>
                            <h3 className="text-lg font-medium text-white mb-6">שטח תפוס לפי מחסנים (נפח סמ"ק)</h3>
                            {warehouseCapacityData.length > 0 ? (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer>
                                        <PieChart>
                                            <Pie
                                                data={warehouseCapacityData}
                                                innerRadius={60}
                                                outerRadius={80}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {warehouseCapacityData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                                ))}
                                            </Pie>
                                            <RechartsTooltip
                                                contentStyle={{ background: '#0a0a0f', borderColor: '#334155', borderRadius: '8px' }}
                                                itemStyle={{ color: '#fff' }}
                                            />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-64 flex items-center justify-center text-slate-500 italic">
                                    אין נתוני נפח תפוס במחסנים (0 סמ"ק)
                                </div>
                            )}
                            <div className="flex flex-wrap justify-center gap-4 mt-2">
                                {warehouseCapacityData.map((d, i) => (
                                    <div key={d.name} className="flex items-center gap-2 text-sm text-slate-300">
                                        <div className="w-3 h-3 rounded-full" style={{ background: COLORS[i % COLORS.length] }}></div>
                                        {d.name} ({d.value} סמ"ק)
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className={styles.glassPanel}>
                            <h3 className="text-lg font-medium text-white mb-6">תנועות אחרונות / סטטוס כללי</h3>
                            <div className="space-y-4 text-sm text-slate-300">
                                <p className="leading-relaxed">
                                    המערכת מנטרת נפח ברמה של <strong>Storage Bin</strong> מדויקת.
                                    ניתן לאחסן פריט אחד (למשל SKU-101) במספר מיקומים במקביל בשל אילוצי מקום,
                                    והמערכת תשקלל את סך כל הפריטים יחדיו תחת ה-<strong>Matrix</strong>.
                                </p>
                                <div className="p-4 bg-black/40 border border-slate-700/50 rounded-lg flex items-center gap-3 mt-4">
                                    <ShieldCheck className="text-emerald-500 w-8 h-8" />
                                    <div>
                                        <div className="font-medium text-emerald-400">אלימות מידע מאומתת</div>
                                        <div className="text-xs text-slate-500 mt-0.5">סנכרון מלא מופעל מול מעקב המלאי המרחבי</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>

        </div>
    );
}
