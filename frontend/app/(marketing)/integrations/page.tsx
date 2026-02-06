"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plug, Zap, ShoppingCart, Package, Truck, CheckCircle } from "lucide-react";

export default function IntegrationsPage() {
    const integrations = [
        {
            name: "WooCommerce",
            icon: ShoppingCart,
            description: "חיבור אוטומטי לחנות WooCommerce שלך",
            color: "purple",
            features: ["סנכרון הזמנות אוטומטי", "עדכון מספרי מעקב", "חישוב משלוח בזמן אמת"]
        },
        {
            name: "Shopify",
            icon: ShoppingCart,
            description: "אינטגרציה מלאה עם Shopify",
            color: "green",
            features: ["התקנה בקליק אחד", "ניהול משלוחים מהממשק", "דוחות משולבים"]
        },
        {
            name: "Magento",
            icon: ShoppingCart,
            description: "פלאגין למגנטו 2",
            color: "orange",
            features: ["תמיכה במולטי-סטור", "ניהול מלאי משולב", "אוטומציה מלאה"]
        },
        {
            name: "Priority",
            icon: Package,
            description: "חיבור למערכת Priority",
            color: "blue",
            features: ["סנכרון דו-כיווני", "ייבוא הזמנות", "עדכון סטטוסים"]
        },
        {
            name: "Salesforce",
            icon: Zap,
            description: "אינטגרציה עם Salesforce CRM",
            color: "cyan",
            features: ["ניהול לקוחות", "מעקב משלוחים", "דוחות מתקדמים"]
        },
        {
            name: "Zapier",
            icon: Plug,
            description: "חיבור לאלפי אפליקציות דרך Zapier",
            color: "yellow",
            features: ["אוטומציות מותאמות", "טריגרים ופעולות", "ללא קוד"]
        }
    ];

    const getColorClasses = (color: string) => {
        const colors: Record<string, { bg: string; text: string; border: string }> = {
            purple: { bg: "bg-purple-100", text: "text-purple-600", border: "border-purple-200" },
            green: { bg: "bg-green-100", text: "text-green-600", border: "border-green-200" },
            orange: { bg: "bg-orange-100", text: "text-orange-600", border: "border-orange-200" },
            blue: { bg: "bg-blue-100", text: "text-blue-600", border: "border-blue-200" },
            cyan: { bg: "bg-cyan-100", text: "text-cyan-600", border: "border-cyan-200" },
            yellow: { bg: "bg-yellow-100", text: "text-yellow-600", border: "border-yellow-200" }
        };
        return colors[color] || colors.blue;
    };

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {/* Hero */}
            <div className="bg-gradient-to-l from-purple-600 to-purple-800 text-white py-20">
                <div className="max-w-6xl mx-auto px-6 text-center">
                    <Badge className="mb-4 bg-white/20">Integrations</Badge>
                    <h1 className="text-5xl font-bold mb-4">אינטגרציות</h1>
                    <p className="text-xl text-purple-100 max-w-2xl mx-auto">
                        חבר את TZIR לכלים שאתה כבר משתמש בהם ואוטומט את תהליך המשלוחים
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16">
                {/* Stats */}
                <div className="grid md:grid-cols-3 gap-6 mb-16">
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Plug className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                            <p className="text-4xl font-bold mb-2">15+</p>
                            <p className="text-slate-600">אינטגרציות מובנות</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                            <p className="text-4xl font-bold mb-2">5 דק׳</p>
                            <p className="text-slate-600">זמן התקנה ממוצע</p>
                        </CardContent>
                    </Card>
                    <Card>
                        <CardContent className="pt-6 text-center">
                            <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-600" />
                            <p className="text-4xl font-bold mb-2">99.9%</p>
                            <p className="text-slate-600">זמינות</p>
                        </CardContent>
                    </Card>
                </div>

                {/* Integrations Grid */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-8">פלטפורמות נתמכות</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {integrations.map((integration) => {
                            const Icon = integration.icon;
                            const colors = getColorClasses(integration.color);

                            return (
                                <Card key={integration.name} className={`border-2 ${colors.border} hover:shadow-lg transition-all`}>
                                    <CardHeader>
                                        <div className={`w-14 h-14 ${colors.bg} rounded-lg flex items-center justify-center mb-4`}>
                                            <Icon className={`w-7 h-7 ${colors.text}`} />
                                        </div>
                                        <CardTitle>{integration.name}</CardTitle>
                                        <CardDescription>{integration.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-2 mb-4">
                                            {integration.features.map((feature, idx) => (
                                                <div key={idx} className="flex items-start gap-2 text-sm">
                                                    <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                                                    <span className="text-slate-600">{feature}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <Button variant="outline" className="w-full">
                                            התחבר עכשיו
                                        </Button>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>

                {/* How it Works */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-8">איך זה עובד?</h2>
                    <div className="grid md:grid-cols-4 gap-6">
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-blue-600">1</span>
                                </div>
                                <h3 className="font-bold mb-2">בחר פלטפורמה</h3>
                                <p className="text-sm text-slate-600">בחר את הפלטפורמה שאתה משתמש בה</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-green-600">2</span>
                                </div>
                                <h3 className="font-bold mb-2">התקן</h3>
                                <p className="text-sm text-slate-600">התקנה פשוטה בקליק אחד</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-purple-600">3</span>
                                </div>
                                <h3 className="font-bold mb-2">הגדר</h3>
                                <p className="text-sm text-slate-600">התאם אישית את ההגדרות</p>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="pt-6 text-center">
                                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <span className="text-2xl font-bold text-orange-600">4</span>
                                </div>
                                <h3 className="font-bold mb-2">התחל</h3>
                                <p className="text-sm text-slate-600">התחל לשלוח אוטומטית</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Custom Integration */}
                <Card className="bg-gradient-to-l from-slate-800 to-slate-900 text-white border-0">
                    <CardContent className="p-12">
                        <div className="grid md:grid-cols-2 gap-8 items-center">
                            <div>
                                <h3 className="text-3xl font-bold mb-4">צריך אינטגרציה מותאמת?</h3>
                                <p className="text-slate-300 mb-6">
                                    הצוות שלנו יכול לפתח אינטגרציה מותאמת אישית למערכת שלך
                                </p>
                                <div className="space-y-2 mb-6">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <span>פיתוח מהיר ומקצועי</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <span>תמיכה טכנית מלאה</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-5 h-5 text-green-400" />
                                        <span>תיעוד מפורט</span>
                                    </div>
                                </div>
                                <Button size="lg" variant="secondary">
                                    צור קשר לפרטים
                                </Button>
                            </div>
                            <div className="hidden md:block">
                                <div className="bg-white/10 backdrop-blur rounded-lg p-8 border border-white/20">
                                    <Code className="w-16 h-16 text-blue-400 mb-4" />
                                    <p className="text-sm text-slate-300">
                                        REST API, Webhooks, SDKs ועוד...
                                    </p>
                                </div>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}

function Code({ className }: { className?: string }) {
    return (
        <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
        </svg>
    );
}
