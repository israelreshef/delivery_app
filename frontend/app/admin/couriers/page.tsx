"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Truck, Bike, Car, Plus, Search, FileSignature, Key, Eye, EyeOff, UserCheck, UserPlus, Package, Trash } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/context/AuthContext";
import { api } from "@/lib/api";
import { useSocket } from "@/lib/socket";
import Link from "next/link";
import styles from './courier-list.module.css';

export default function AdminCouriersPage() {
    const { user } = useAuth();
    const [couriers, setCouriers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [resetTokenUser, setResetTokenUser] = useState<any>(null);
    const [newPassword, setNewPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isResetLoading, setIsResetLoading] = useState(false);

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
            if (res.data && Array.isArray(res.data.data)) {
                setCouriers(res.data.data);
            } else if (Array.isArray(res.data)) {
                setCouriers(res.data);
            } else {
                setCouriers([]);
            }
        } catch (error) {
            console.error("Failed to fetch couriers", error);
            toast.error("שגיאה בטעינת צי שליחים");
        } finally {
            setLoading(false);
        }
    };

    const handleAddCourier = async () => {
        try {
            await api.post('/couriers', newCourier);
            toast.success("שליח נוצר בהצלחה!");
            setIsAddOpen(false);
            fetchCouriers();
            setNewCourier({
                username: "",
                email: "",
                phone: "",
                full_name: "",
                vehicle_type: "motorcycle",
                license_plate: "",
                national_id: "",
                password: "TempPassword123!"
            });
        } catch (error: any) {
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

    const handleResetPassword = async () => {
        if (!resetTokenUser || !newPassword) return;
        setIsResetLoading(true);
        try {
            await api.post('/auth/admin/reset-password', {
                user_id: resetTokenUser.user_id,
                password: newPassword
            });
            toast.success(`הסיסמה עבור ${resetTokenUser.full_name} אופסה בהצלחה!`);
            setResetTokenUser(null);
            setNewPassword("");
        } catch (error: any) {
            toast.error(error.response?.data?.error || "שגיאה באיפוס סיסמה");
        } finally {
            setIsResetLoading(false);
        }
    };

    const handleDeleteCourier = async (id: number, name: string) => {
        if (!confirm(`האם אתה בטוח שברצונך למחוק לחלוטין את השליח "${name}"?
פעולה זו תמחק גם את פרטי המשתמש שלו ולא ניתנת לביטול.`)) {
            return;
        }

        try {
            await api.delete(`/admin/couriers/${id}`);
            toast.success("השליח נמחק בהצלחה");
            fetchCouriers();
        } catch (error: any) {
            console.error("Failed to delete courier", error);
            toast.error(error.response?.data?.error || "שגיאה במחיקת השליח");
        }
    };

    const getVehicleIcon = (type: string) => {
        switch (type) {
            case 'car': return <Car size={16} color="#94A3B8" />;
            case 'bike': return <Bike size={16} color="#94A3B8" />;
            default: return <Truck size={16} color="#94A3B8" />;
        }
    };

    const filteredCouriers = couriers.filter(c =>
        c.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm)
    );

    const totalCouriers = couriers.length;
    const activeCouriers = couriers.filter(c => c.is_available).length;
    const newCandidates = couriers.filter(c => c.onboarding_status === 'new').length;
    const totalDeliveries = couriers.reduce((sum, c) => sum + (c.total_deliveries || 0), 0);

    return (
        <div className={styles.listContainer}>
            <div className={styles.headerArea}>
                <div>
                    <h1 className={styles.title}>ניהול שליחים</h1>
                    <p className={styles.subtitle}>גיוס, חתימה, ומעקב אחרי צי השליחים.</p>
                </div>
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <button className={styles.btnPrimary}>
                            <Plus size={18} />
                            גיוס שליח חדש
                        </button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl bg-slate-900 text-slate-100 border-slate-700 font-sans" dir="rtl">
                        <DialogHeader>
                            <DialogTitle className="text-white">הוספת שליח חדש</DialogTitle>
                        </DialogHeader>
                        <div className="grid grid-cols-2 gap-4 py-4">
                            <div className="space-y-2">
                                <Label className="text-slate-300">שם משתמש</Label>
                                <Input
                                    value={newCourier.username}
                                    onChange={e => setNewCourier({ ...newCourier, username: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">שם מלא</Label>
                                <Input
                                    value={newCourier.full_name}
                                    onChange={e => setNewCourier({ ...newCourier, full_name: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">אימייל</Label>
                                <Input
                                    type="email"
                                    value={newCourier.email}
                                    onChange={e => setNewCourier({ ...newCourier, email: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">טלפון</Label>
                                <Input
                                    value={newCourier.phone}
                                    onChange={e => setNewCourier({ ...newCourier, phone: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">ת.ז.</Label>
                                <Input
                                    value={newCourier.national_id}
                                    onChange={e => setNewCourier({ ...newCourier, national_id: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">מספר לוחית רישוי</Label>
                                <Input
                                    value={newCourier.license_plate}
                                    onChange={e => setNewCourier({ ...newCourier, license_plate: e.target.value })}
                                    className="bg-slate-800 border-slate-700 text-white"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label className="text-slate-300">סוג רכב</Label>
                                <Select
                                    value={newCourier.vehicle_type}
                                    onValueChange={v => setNewCourier({ ...newCourier, vehicle_type: v })}
                                >
                                    <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                                        <SelectItem value="motorcycle">קטנוע</SelectItem>
                                        <SelectItem value="car">רכב פרטי</SelectItem>
                                        <SelectItem value="bicycle">אופניים חשמליים</SelectItem>
                                        <SelectItem value="van">משאית/מסחרית</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setIsAddOpen(false)} className="text-slate-300 hover:text-white hover:bg-slate-800">ביטול</Button>
                            <Button onClick={handleAddCourier} className="bg-brand hover:bg-brand-dark text-black">צור שליח</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            <div className={styles.metricsGrid}>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>סה״כ שליחים</div>
                        <div className={styles.metricValue}>{totalCouriers}</div>
                    </div>
                    <div className={styles.metricIcon}>
                        <Truck size={24} />
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>שליחים זמינים</div>
                        <div className={styles.metricValue}>{activeCouriers}</div>
                    </div>
                    <div className={styles.metricIcon}>
                        <UserCheck size={24} />
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>מועמדים חדשים</div>
                        <div className={styles.metricValue}>{newCandidates}</div>
                    </div>
                    <div className={`${styles.metricIcon} ${styles.iconWarning}`}>
                        <UserPlus size={24} />
                    </div>
                </div>
                <div className={styles.metricCard}>
                    <div>
                        <div className={styles.metricLabel}>סה״כ מסירות</div>
                        <div className={styles.metricValue}>
                            {totalDeliveries}
                        </div>
                    </div>
                    <div className={`${styles.badge} ${styles.badgeOutline}`}><Package size={14} className="mr-1" /> All Time</div>
                </div>
            </div>

            <div className={styles.tableContainer}>
                <div className={styles.tableHeader}>
                    <div className={styles.tableTitle}>סגל שליחים ({filteredCouriers.length})</div>
                    <div className={styles.searchBox}>
                        <Search className={styles.searchIcon} />
                        <input
                            type="text"
                            placeholder="חיפוש משלוחן..."
                            className={styles.searchInput}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <table className={styles.customTable}>
                    <thead>
                        <tr>
                            <th>פרטי שליח</th>
                            <th>רכב</th>
                            <th>סטטוס גיוס</th>
                            <th>סטטוס זמינות</th>
                            <th>דירוג וביצועים</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loading ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-400">טוען נתונים...</td>
                            </tr>
                        ) : filteredCouriers.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="text-center py-10 text-slate-500">לא נמצאו שליחים</td>
                            </tr>
                        ) : (
                            filteredCouriers.map((courier: any) => (
                                <tr key={courier.id}>
                                    <td>
                                        <div className={styles.courierName}>
                                            {courier.full_name}
                                        </div>
                                        <div className={styles.subText}>{courier.phone}</div>
                                    </td>
                                    <td>
                                        <div className="flex items-center gap-2 text-slate-300">
                                            {getVehicleIcon(courier.vehicle_type)}
                                            <span className="text-sm font-medium">{courier.license_plate || '-'}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {courier.onboarding_status === 'new' ? (
                                            <span className={`${styles.badge} ${styles.badgeWarning}`}>מועמד חדש</span>
                                        ) : courier.onboarding_status === 'active' ? (
                                            <span className={`${styles.badge} ${styles.badgeSuccess}`}>פעיל</span>
                                        ) : (
                                            <span className={`${styles.badge} ${styles.badgeSecondary}`}>{courier.onboarding_status}</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`${styles.badge} ${courier.is_available ? styles.badgeSuccess : styles.badgeSecondary}`}>
                                            {courier.is_available ? "זמין" : "לא זמין"}
                                        </span>
                                    </td>
                                    <td>
                                        <div className={styles.textBright}>⭐ {courier.rating?.toFixed(1) || '0.0'}</div>
                                        <div className={styles.subText}>{courier.total_deliveries} מסירות עבר</div>
                                    </td>
                                    <td>
                                        <div className="flex gap-2 justify-end">
                                            {(user?.role === 'admin' || user?.user_type === 'admin') && (
                                                <button
                                                    className={`${styles.btnAction} text-red-500 hover:text-red-700 hover:bg-red-500/10`}
                                                    title="מחק שליח"
                                                    onClick={() => handleDeleteCourier(courier.id, courier.full_name)}
                                                >
                                                    <Trash size={16} />
                                                </button>
                                            )}
                                            <button className={styles.btnAction} title="שלח חוזה" onClick={() => sendContract(courier.id)}>
                                                <FileSignature size={16} />
                                            </button>
                                            <button className={styles.btnAction} title="איפוס סיסמה" onClick={() => setResetTokenUser(courier)}>
                                                <Key size={16} />
                                            </button>
                                            <Link href={`/admin/couriers/${courier.id}`} className={styles.btnAction}>
                                                כרטיס שליח
                                            </Link>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            <Dialog open={!!resetTokenUser} onOpenChange={(open) => !open && setResetTokenUser(null)}>
                <DialogContent className="bg-slate-900 border-slate-700 text-slate-100" dir="rtl">
                    <DialogHeader>
                        <DialogTitle className="text-white">איפוס סיסמה - {resetTokenUser?.full_name}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2 text-right">
                            <Label className="text-slate-300">סיסמה חדשה</Label>
                            <div className="relative">
                                <Input
                                    type={showPassword ? "text" : "password"}
                                    value={newPassword}
                                    onChange={e => setNewPassword(e.target.value)}
                                    placeholder="הכנס סיסמה חזקה..."
                                    className="text-right bg-slate-800 border-slate-700 text-white"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-3 text-slate-400 hover:text-slate-300"
                                >
                                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-500">מומלץ להשתמש בסיסמה של 8 תווים לפחות הכוללת אותיות ומספרים.</p>
                        </div>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="ghost" onClick={() => setResetTokenUser(null)} className="text-slate-300 hover:bg-slate-800 hover:text-white">ביטול</Button>
                        <Button onClick={handleResetPassword} disabled={isResetLoading || !newPassword} className="bg-brand hover:bg-brand-dark text-black">
                            {isResetLoading ? "מעדכן..." : "אפס סיסמה"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
