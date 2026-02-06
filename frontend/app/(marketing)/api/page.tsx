"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Code, Zap, Shield, CheckCircle, Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";

export default function APIPage() {
    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
        toast.success("הועתק ללוח!");
    };

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {/* Hero */}
            <div className="bg-gradient-to-l from-slate-800 to-slate-900 text-white py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <Badge className="mb-4 bg-blue-600">API Documentation</Badge>
                    <h1 className="text-5xl font-bold mb-4">TZIR API</h1>
                    <p className="text-xl text-slate-300 max-w-2xl">
                        שלב את שירותי המשלוחים שלנו ישירות לתוך המערכת שלך עם API פשוט וחזק
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16">
                {/* Quick Start */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">התחלה מהירה</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                                    <Shield className="w-6 h-6 text-blue-600" />
                                </div>
                                <CardTitle>1. קבל API Key</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-4">
                                    צור חשבון והפק מפתח API מלוח הבקרה שלך
                                </p>
                                <Button variant="outline" size="sm">לוח בקרה</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mb-4">
                                    <Code className="w-6 h-6 text-green-600" />
                                </div>
                                <CardTitle>2. שלב בקוד</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-4">
                                    השתמש ב-REST API או ב-SDK שלנו
                                </p>
                                <Button variant="outline" size="sm">תיעוד מלא</Button>
                            </CardContent>
                        </Card>

                        <Card>
                            <CardHeader>
                                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mb-4">
                                    <Zap className="w-6 h-6 text-purple-600" />
                                </div>
                                <CardTitle>3. התחל לשלוח</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-slate-600 mb-4">
                                    צור משלוחים, עקוב אחריהם וקבל עדכונים בזמן אמת
                                </p>
                                <Button variant="outline" size="sm">דוגמאות</Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Base URL */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">Base URL</h2>
                    <Card>
                        <CardContent className="p-6">
                            <div className="flex items-center justify-between bg-slate-900 text-white p-4 rounded-lg font-mono">
                                <code>https://api.tzir.delivery/v1</code>
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => copyToClipboard('https://api.tzir.delivery/v1')}
                                >
                                    <Copy className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Authentication */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">אימות (Authentication)</h2>
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-slate-600">
                                כל הבקשות דורשות API Key בכותרת Authorization:
                            </p>
                            <div className="bg-slate-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                <code>
                                    Authorization: Bearer YOUR_API_KEY
                                </code>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Endpoints */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">נקודות קצה (Endpoints)</h2>

                    <div className="space-y-4">
                        {/* Create Order */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-3">
                                        <Badge className="bg-green-600">POST</Badge>
                                        <code className="text-lg">/orders</code>
                                    </CardTitle>
                                </div>
                                <CardDescription>יצירת משלוח חדש</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                    <pre>{`{
  "pickup_address": {
    "city": "תל אביב",
    "street": "דיזנגוף",
    "number": "100"
  },
  "delivery_address": {
    "city": "ירושלים",
    "street": "יפו",
    "number": "50"
  },
  "recipient_name": "דוד כהן",
  "recipient_phone": "0501234567",
  "package_description": "מסמכים",
  "delivery_type": "express"
}`}</pre>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Get Order */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-3">
                                        <Badge className="bg-blue-600">GET</Badge>
                                        <code className="text-lg">/orders/:id</code>
                                    </CardTitle>
                                </div>
                                <CardDescription>קבלת פרטי משלוח</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                    <pre>{`{
  "id": 12345,
  "order_number": "TZ-2024-12345",
  "status": "in_transit",
  "courier": {
    "name": "משה לוי",
    "phone": "0509876543"
  },
  "estimated_delivery": "2024-02-03T18:00:00Z"
}`}</pre>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Track Order */}
                        <Card>
                            <CardHeader>
                                <div className="flex items-center justify-between">
                                    <CardTitle className="flex items-center gap-3">
                                        <Badge className="bg-blue-600">GET</Badge>
                                        <code className="text-lg">/orders/:id/track</code>
                                    </CardTitle>
                                </div>
                                <CardDescription>מעקב אחר משלוח בזמן אמת</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="bg-slate-900 text-white p-4 rounded-lg font-mono text-sm overflow-x-auto">
                                    <pre>{`{
  "current_location": {
    "lat": 32.0853,
    "lng": 34.7818
  },
  "status": "picked_up",
  "events": [
    {
      "timestamp": "2024-02-03T15:30:00Z",
      "status": "picked_up",
      "location": "תל אביב"
    }
  ]
}`}</pre>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Webhooks */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">Webhooks</h2>
                    <Card>
                        <CardContent className="p-6 space-y-4">
                            <p className="text-slate-600">
                                קבל עדכונים אוטומטיים על שינויים בסטטוס המשלוחים:
                            </p>
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <code className="text-sm">order.created</code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <code className="text-sm">order.assigned</code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <code className="text-sm">order.picked_up</code>
                                </div>
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <code className="text-sm">order.delivered</code>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* SDKs */}
                <div className="mb-16">
                    <h2 className="text-3xl font-bold mb-6">SDKs & ספריות</h2>
                    <div className="grid md:grid-cols-3 gap-4">
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Code className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                                <h3 className="font-bold mb-2">Node.js</h3>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    GitHub
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Code className="w-12 h-12 mx-auto mb-4 text-green-600" />
                                <h3 className="font-bold mb-2">Python</h3>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    GitHub
                                </Button>
                            </CardContent>
                        </Card>
                        <Card>
                            <CardContent className="p-6 text-center">
                                <Code className="w-12 h-12 mx-auto mb-4 text-purple-600" />
                                <h3 className="font-bold mb-2">PHP</h3>
                                <Button variant="outline" size="sm" className="gap-2">
                                    <ExternalLink className="w-4 h-4" />
                                    GitHub
                                </Button>
                            </CardContent>
                        </Card>
                    </div>
                </div>

                {/* Support */}
                <Card className="bg-gradient-to-l from-blue-600 to-blue-800 text-white border-0">
                    <CardContent className="p-12 text-center">
                        <h3 className="text-3xl font-bold mb-4">צריך עזרה?</h3>
                        <p className="text-blue-100 mb-6">
                            הצוות הטכני שלנו כאן כדי לעזור לך
                        </p>
                        <div className="flex gap-4 justify-center">
                            <Button variant="secondary" size="lg">תיעוד מלא</Button>
                            <Button variant="outline" size="lg" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                                צור קשר
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
