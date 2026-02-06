"use client";

import { useAuth } from "@/context/AuthContext";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { User, Truck, FileText, DollarSign, Star, Save, Shield, Download, Trash2, ExternalLink, Fingerprint } from "lucide-react";
import { toast } from "sonner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { startRegistration } from '@simplewebauthn/browser';
import { api } from "@/lib/api";

export default function CourierProfilePage() {
    const { user } = useAuth();
    const [loading, setLoading] = useState(false);
    // ... state ...

    const handleRegisterWebAuthn = async () => {
        try {
            // 1. Get options
            const optionsRes = await api.post('/webauthn/register/options');
            const options = optionsRes.data;

            // 2. Create credentials
            const attResp = await startRegistration(options);

            // 3. Verify
            const verificationRes = await api.post('/webauthn/register/verify', attResp);
            const verificationJSON = verificationRes.data;

            if (verificationJSON.verified) {
                toast.success('המכשיר נרשם בהצלחה! כעת תוכל להשתמש בו לאימות מהיר.');
            } else {
                toast.error(`שגיאה ברישום: ${verificationJSON.error}`);
            }
        } catch (error) {
            console.error(error);
            toast.error('שגיאה בתהליך הרישום הביומטרי');
        }
    };
    const [profile, setProfile] = useState({
        full_name: "",
        phone: "",
        email: "",
        vehicle_type: "motorcycle",
        license_plate: "",
        national_id: "",
        bank_account: "",
        rating: 5.0,
        total_deliveries: 0
    });

    const [documents, setDocuments] = useState<any[]>([]);
    const [earnings, setEarnings] = useState<any[]>([]);
    const [stats, setStats] = useState({
        today_deliveries: 0,
        week_earnings: 0,
        month_earnings: 0,
        avg_rating: 5.0
    });

    useEffect(() => {
        fetchProfile();
        fetchDocuments();
        fetchEarnings();
        fetchStats();
    }, []);

    const fetchProfile = async () => {
        try {
            const res = await api.get('/courier/profile');
            setProfile(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchDocuments = async () => {
        try {
            const res = await api.get('/courier/documents');
            setDocuments(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchEarnings = async () => {
        try {
            const res = await api.get('/courier/earnings');
            setEarnings(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const fetchStats = async () => {
        try {
            const res = await api.get('/courier/stats');
            setStats(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSave = async () => {
        setLoading(true);
        try {
            await api.put('/courier/profile', profile);
            toast.success("הפרופיל עודכן בהצלחה!");
        } catch (error) {
            toast.error("תקלה בתקשורת עם השרת");
        } finally {
            setLoading(false);
        }
    };

    const handleExportData = async () => {
        try {
            const res = await api.get('/privacy/export', { responseType: 'blob' });

            const url = window.URL.createObjectURL(new Blob([res.data]));
            const a = document.createElement('a');
            a.href = url;
            a.download = 'my_data.json';
            a.click();
            toast.success("הנתונים הורדו בהצלחה");
        } catch (error) {
            toast.error("תקלה בתקשורת");
        }
    };

    const handleDeleteAccount = async () => {
        if (!confirm("האם אתה בטוח שברצונך למחוק את החשבון? פעולה זו אינה הפיכה!")) return;

        try {
            await api.delete('/privacy/account');
            toast.success("החשבון נמחק בהצלחה. להתראות!");
            // localStorage.removeItem('token'); // Handled by auth context usually, but manual remove is fine
            // sessionStorage.removeItem('tzir_auth_token'); // Should clear this too
            sessionStorage.clear();
            localStorage.clear();
            window.location.href = '/login';
        } catch (error) {
            toast.error("תקלה בתקשורת");
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 p-8" dir="rtl">
            <div className="max-w-6xl mx-auto space-y-6">
                <header className="flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold text-slate-900">הפרופיל שלי</h1>
                        <p className="text-slate-600">נהל את הפרטים האישיים והמקצועיים שלך</p>
                    </div>
                    <div className="flex gap-4">
                        <Card className="p-4">
                            <div className="flex items-center gap-2">
                                <Star className="w-5 h-5 text-yellow-500 fill-yellow-500" />
                                <div>
                                    <p className="text-2xl font-bold">{profile.rating.toFixed(1)}</p>
                                    <p className="text-xs text-slate-600">דירוג</p>
                                </div>
                            </div>
                        </Card>
                        <Card className="p-4">
                            <div>
                                <p className="text-2xl font-bold">{profile.total_deliveries}</p>
                                <p className="text-xs text-slate-600">משלוחים</p>
                            </div>
                        </Card>
                    </div>
                </header>

                <Tabs defaultValue="personal" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-4">
                        <TabsTrigger value="personal" className="gap-2">
                            <User className="w-4 h-4" />
                            פרטים אישיים
                        </TabsTrigger>
                        <TabsTrigger value="vehicle" className="gap-2">
                            <Truck className="w-4 h-4" />
                            רכב ומסמכים
                        </TabsTrigger>
                        <TabsTrigger value="earnings" className="gap-2">
                            <DollarSign className="w-4 h-4" />
                            הכנסות
                        </TabsTrigger>
                        <TabsTrigger value="ratings" className="gap-2">
                            <Star className="w-4 h-4" />
                            דירוגים
                        </TabsTrigger>
                        <TabsTrigger value="privacy" className="gap-2 text-red-600 data-[state=active]:text-red-700">
                            <Shield className="w-4 h-4" />
                            פרטיות ובטיחות
                        </TabsTrigger>
                    </TabsList>

                    {/* Personal Details Tab */}
                    <TabsContent value="personal">
                        <Card>
                            <CardHeader>
                                <CardTitle>פרטים אישיים</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>שם מלא</Label>
                                        <Input
                                            value={profile.full_name}
                                            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                                            placeholder="דוד כהן"
                                        />
                                    </div>
                                    <div>
                                        <Label>טלפון</Label>
                                        <Input
                                            value={profile.phone}
                                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                                            placeholder="050-1234567"
                                        />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <Label>אימייל</Label>
                                        <Input
                                            type="email"
                                            value={profile.email}
                                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                                            placeholder="david@example.com"
                                        />
                                    </div>
                                    <div>
                                        <Label>ת.ז</Label>
                                        <Input
                                            value={profile.national_id}
                                            onChange={(e) => setProfile({ ...profile, national_id: e.target.value })}
                                            placeholder="123456789"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <Label>מספר חשבון בנק</Label>
                                    <Input
                                        value={profile.bank_account}
                                        onChange={(e) => setProfile({ ...profile, bank_account: e.target.value })}
                                        placeholder="12-345-67890"
                                    />
                                </div>
                                <Button onClick={handleSave} disabled={loading} className="gap-2">
                                    <Save className="w-4 h-4" />
                                    {loading ? "שומר..." : "שמור שינויים"}
                                </Button>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Vehicle & Documents Tab */}
                    <TabsContent value="vehicle">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle>פרטי רכב</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <Label>סוג רכב</Label>
                                            <Select value={profile.vehicle_type} onValueChange={(val) => setProfile({ ...profile, vehicle_type: val })}>
                                                <SelectTrigger>
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="motorcycle">אופנוע</SelectItem>
                                                    <SelectItem value="scooter">קטנוע</SelectItem>
                                                    <SelectItem value="car">רכב</SelectItem>
                                                    <SelectItem value="van">טנדר</SelectItem>
                                                    <SelectItem value="bicycle">אופניים</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div>
                                            <Label>מספר רישוי</Label>
                                            <Input
                                                value={profile.license_plate}
                                                onChange={(e) => setProfile({ ...profile, license_plate: e.target.value })}
                                                placeholder="12-345-67"
                                            />
                                        </div>
                                    </div>
                                    <Button onClick={handleSave} disabled={loading}>שמור שינויים</Button>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle>מסמכים</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {documents.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            אין מסמכים מועלים
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {documents.map((doc, index) => (
                                                <div key={index} className="p-4 border rounded-lg flex justify-between items-center">
                                                    <div className="flex items-center gap-3">
                                                        <FileText className="w-5 h-5 text-blue-600" />
                                                        <div>
                                                            <p className="font-medium">{doc.type}</p>
                                                            <p className="text-sm text-slate-600">תוקף: {doc.expiry_date}</p>
                                                        </div>
                                                    </div>
                                                    <span className={`px-3 py-1 rounded-full text-xs ${doc.status === 'approved' ? 'bg-green-100 text-green-800' :
                                                        doc.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                                            'bg-red-100 text-red-800'
                                                        }`}>
                                                        {doc.status}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    <Button variant="outline" className="mt-4">העלה מסמך חדש</Button>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Earnings Tab */}
                    <TabsContent value="earnings">
                        <div className="space-y-4">
                            <div className="grid grid-cols-3 gap-4">
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-600">היום</p>
                                        <p className="text-2xl font-bold">₪{stats.today_deliveries * 25}</p>
                                        <p className="text-xs text-slate-500">{stats.today_deliveries} משלוחים</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-600">השבוע</p>
                                        <p className="text-2xl font-bold">₪{stats.week_earnings}</p>
                                    </CardContent>
                                </Card>
                                <Card>
                                    <CardContent className="pt-6">
                                        <p className="text-sm text-slate-600">החודש</p>
                                        <p className="text-2xl font-bold">₪{stats.month_earnings}</p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader>
                                    <CardTitle>היסטוריית תשלומים</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    {earnings.length === 0 ? (
                                        <div className="text-center py-10 text-slate-500">
                                            אין תשלומים עדיין
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {earnings.map((payment, index) => (
                                                <div key={index} className="p-4 border rounded-lg flex justify-between items-center">
                                                    <div>
                                                        <p className="font-medium">{payment.period}</p>
                                                        <p className="text-sm text-slate-600">{payment.deliveries_count} משלוחים</p>
                                                    </div>
                                                    <p className="text-lg font-bold text-green-600">₪{payment.amount}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>

                    {/* Ratings Tab */}
                    <TabsContent value="ratings">
                        <Card>
                            <CardHeader>
                                <CardTitle>דירוגים ומשובים</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="text-center py-10">
                                    <div className="flex items-center justify-center gap-2 mb-4">
                                        <Star className="w-12 h-12 text-yellow-500 fill-yellow-500" />
                                        <p className="text-5xl font-bold">{profile.rating.toFixed(1)}</p>
                                    </div>
                                    <p className="text-slate-600">מבוסס על {profile.total_deliveries} משלוחים</p>

                                    <div className="mt-8 space-y-2 max-w-md mx-auto">
                                        {[5, 4, 3, 2, 1].map((stars) => (
                                            <div key={stars} className="flex items-center gap-2">
                                                <span className="text-sm w-8">{stars}★</span>
                                                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                                                    <div
                                                        className="h-full bg-yellow-500"
                                                        style={{ width: `${Math.random() * 100}%` }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Privacy Tab */}
                    <TabsContent value="privacy">
                        <div className="space-y-4">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Shield className="w-5 h-5 text-blue-600" />
                                        מרכז הפרטיות
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-6">
                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">שקיפות ומידע (GDPR)</h3>
                                        <p className="text-slate-600">
                                            אנו מחויבים לשמור על הפרטיות שלך. בהתאם לתקנות הגנת הפרטיות, יש לך את הזכות לקבל עותק של המידע שאנו מחזיקים עליך.
                                        </p>
                                        <Button variant="outline" onClick={handleExportData} className="gap-2 mt-2">
                                            <Download className="w-4 h-4" />
                                            הורד את המידע שלי (JSON)
                                        </Button>
                                    </div>

                                    <div className="w-full h-[1px] bg-slate-200" />

                                    <div className="space-y-2">
                                        <h3 className="font-semibold text-lg">מדיניות פרטיות</h3>
                                        <p className="text-slate-600">
                                            קרא את תנאי השימוש ומדיניות הפרטיות שלנו כדי להבין כיצד אנו מעבדים את הנתונים שלך.
                                        </p>
                                        <Button variant="link" className="gap-2 px-0 text-blue-600">
                                            <ExternalLink className="w-4 h-4" />
                                            צפייה במדיניות הפרטיות
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-2">
                                        <Fingerprint className="w-5 h-5 text-blue-600" />
                                        זיהוי ביומטרי (WebAuthn)
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <p className="text-slate-600">
                                        רשום את המכשיר שלך (FaceID, TouchID, Windows Hello) כדי לבצע אימות מהיר במשלוחים רגישים ללא צורך בסלפי.
                                    </p>
                                    <Button onClick={handleRegisterWebAuthn} variant="outline" className="gap-2 border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100">
                                        <Fingerprint className="w-4 h-4" />
                                        רשום מכשיר זה
                                    </Button>
                                </CardContent>
                            </Card>

                            <Card className="border-red-200 bg-red-50">
                                <CardHeader>
                                    <CardTitle className="text-red-600 flex items-center gap-2">
                                        <Trash2 className="w-5 h-5" />
                                        אזור מסוכן
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex justify-between items-center">
                                        <div>
                                            <h3 className="font-bold text-red-900">מחיקת חשבון</h3>
                                            <p className="text-red-700 text-sm mt-1">
                                                פעולה זו תמחק את החשבון שלך לצמיתות ותבצע אנונימיזציה לנתונים שלך.
                                                <br />
                                                לא ניתן לשחזר את החשבון לאחר ביצוע הפעולה.
                                            </p>
                                        </div>
                                        <Button variant="destructive" onClick={handleDeleteAccount}>
                                            מחק את החשבון שלי
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
