"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Clock, Send } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

export default function ContactPage() {
    const [formData, setFormData] = useState({
        name: "",
        email: "",
        phone: "",
        subject: "",
        message: ""
    });
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulate API call
        setTimeout(() => {
            toast.success("הפנייה נשלחה בהצלחה! ניצור איתך קשר בקרוב.");
            setFormData({ name: "", email: "", phone: "", subject: "", message: "" });
            setLoading(false);
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {/* Hero */}
            <div className="bg-gradient-to-l from-blue-600 to-blue-800 text-white py-20">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <h1 className="text-5xl font-bold mb-4">צור קשר</h1>
                    <p className="text-xl text-blue-100">
                        נשמח לעמוד לשירותך ולענות על כל שאלה
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid md:grid-cols-2 gap-12">
                    {/* Contact Form */}
                    <div>
                        <h2 className="text-3xl font-bold mb-6">שלח לנו הודעה</h2>
                        <Card>
                            <CardContent className="p-6">
                                <form onSubmit={handleSubmit} className="space-y-4">
                                    <div>
                                        <Label>שם מלא *</Label>
                                        <Input
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            placeholder="ישראל ישראלי"
                                        />
                                    </div>
                                    <div>
                                        <Label>אימייל *</Label>
                                        <Input
                                            required
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                            placeholder="israel@example.com"
                                        />
                                    </div>
                                    <div>
                                        <Label>טלפון</Label>
                                        <Input
                                            value={formData.phone}
                                            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                            placeholder="050-1234567"
                                        />
                                    </div>
                                    <div>
                                        <Label>נושא *</Label>
                                        <Input
                                            required
                                            value={formData.subject}
                                            onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                            placeholder="בקשה למידע / תמיכה טכנית / שאלה כללית"
                                        />
                                    </div>
                                    <div>
                                        <Label>הודעה *</Label>
                                        <Textarea
                                            required
                                            value={formData.message}
                                            onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                                            placeholder="ספר לנו איך נוכל לעזור..."
                                            rows={6}
                                        />
                                    </div>
                                    <Button type="submit" disabled={loading} className="w-full gap-2">
                                        <Send className="w-4 h-4" />
                                        {loading ? "שולח..." : "שלח הודעה"}
                                    </Button>
                                </form>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Contact Info */}
                    <div>
                        <h2 className="text-3xl font-bold mb-6">פרטי התקשרות</h2>
                        <div className="space-y-6">
                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-blue-600" />
                                        </div>
                                        טלפון
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-medium mb-1">03-1234567</p>
                                    <p className="text-sm text-slate-600">זמינים א׳-ה׳ 8:00-18:00</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                                            <Mail className="w-5 h-5 text-green-600" />
                                        </div>
                                        אימייל
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-medium mb-1">info@tzir.delivery</p>
                                    <p className="text-sm text-slate-600">מענה תוך 24 שעות</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                                            <MapPin className="w-5 h-5 text-purple-600" />
                                        </div>
                                        כתובת
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-lg font-medium mb-1">רחוב דיזנגוף 100</p>
                                    <p className="text-sm text-slate-600">תל אביב-יפו, 6433116</p>
                                </CardContent>
                            </Card>

                            <Card>
                                <CardHeader>
                                    <CardTitle className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                            <Clock className="w-5 h-5 text-orange-600" />
                                        </div>
                                        שעות פעילות
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="font-medium">א׳-ה׳:</span>
                                            <span className="text-slate-600">8:00 - 18:00</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">ו׳:</span>
                                            <span className="text-slate-600">8:00 - 14:00</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="font-medium">שבת:</span>
                                            <span className="text-slate-600">סגור</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Map Placeholder */}
                        <Card className="mt-6">
                            <CardContent className="p-0">
                                <div className="h-64 bg-gradient-to-br from-blue-100 to-purple-100 flex items-center justify-center">
                                    <div className="text-center">
                                        <MapPin className="w-12 h-12 mx-auto mb-2 text-blue-600" />
                                        <p className="text-slate-600">מפה אינטראקטיבית</p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="mt-16">
                    <h2 className="text-3xl font-bold mb-8 text-center">שאלות נפוצות</h2>
                    <div className="grid md:grid-cols-2 gap-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">מהו זמן האספקה?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600">
                                    משלוחי אקספרס - תוך 3 שעות. משלוחים רגילים - עד 24 שעות.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">איך אני עוקב אחרי המשלוח?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600">
                                    תקבל מספר מעקב ב-SMS ובאימייל. ניתן לעקוב בזמן אמת דרך האפליקציה.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">מה קורה אם החבילה לא הגיעה?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600">
                                    צור קשר עם התמיכה מיד ונטפל בבעיה. יש לנו ביטוח מלא על כל המשלוחים.
                                </p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-lg">האם יש הנחות לעסקים?</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-slate-600">
                                    כן! הנחות מיוחדות לעסקים עם נפח משלוחים גבוה. צור קשר לפרטים.
                                </p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
