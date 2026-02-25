"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, DollarSign, MapPin, Bell, Shield, Users, Palette, Database } from "lucide-react";
import Link from "next/link";

export default function SettingsPage() {
    const settingsCategories = [
        {
            title: "תמחור ותעריפים",
            description: "ניהול מחירים, תעריפים והנחות",
            icon: DollarSign,
            href: "/admin/settings/pricing",
            color: "from-green-500 to-emerald-600"
        },
        {
            title: "אזורי חלוקה",
            description: "הגדרת אזורים גיאוגרפיים ומחירים",
            icon: MapPin,
            href: "/admin/settings/zones",
            color: "from-brand to-cyan-600"
        },
        {
            title: "התראות ועדכונים",
            description: "הגדרות SMS, מייל ו-Push notifications",
            icon: Bell,
            href: "/admin/settings/notifications",
            color: "from-purple-500 to-pink-600"
        },
        {
            title: "אבטחה והרשאות",
            description: "ניהול משתמשים, תפקידים והרשאות",
            icon: Shield,
            href: "/admin/users",
            color: "from-red-500 to-orange-600"
        },
        {
            title: "ניהול צוות",
            description: "שליחים, לקוחות ומשתמשי מערכת",
            icon: Users,
            href: "/admin/users",
            color: "from-indigo-500 to-primary"
        },
        {
            title: "עיצוב ומיתוג",
            description: "לוגו, צבעים ועיצוב הממשק",
            icon: Palette,
            href: "/admin/settings/branding",
            color: "from-pink-500 to-rose-600"
        },
        {
            title: "גיבויים ונתונים",
            description: "ייצוא, ייבוא וגיבוי מידע",
            icon: Database,
            href: "/admin/settings/data",
            color: "from-slate-500 to-gray-600"
        }
    ];

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <div className="bg-gradient-to-br from-brand to-primary p-3 rounded-xl shadow-lg">
                    <Settings className="h-6 w-6 text-white" />
                </div>
                <div>
                    <h1 className="text-3xl font-bold text-slate-900">הגדרות מערכת</h1>
                    <p className="text-slate-600">ניהול והגדרות כלליות של המערכת</p>
                </div>
            </div>

            {/* Settings Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {settingsCategories.map((category, index) => {
                    const Icon = category.icon;
                    return (
                        <Link key={index} href={category.href}>
                            <Card className="group hover:shadow-2xl transition-all duration-300 cursor-pointer border-2 hover:border-brand/20 h-full">
                                <CardHeader>
                                    <div className="flex items-start justify-between">
                                        <div className={`bg-gradient-to-br ${category.color} p-3 rounded-xl shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                            <Icon className="h-6 w-6 text-white" />
                                        </div>
                                    </div>
                                    <CardTitle className="text-xl mt-4 group-hover:text-brand transition-colors">
                                        {category.title}
                                    </CardTitle>
                                    <CardDescription className="text-sm">
                                        {category.description}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        variant="ghost"
                                        className="w-full group-hover:bg-brand-dark/10 group-hover:text-brand transition-colors"
                                    >
                                        פתח הגדרות
                                    </Button>
                                </CardContent>
                            </Card>
                        </Link>
                    );
                })}
            </div>

            {/* Quick Actions */}
            <Card className="bg-gradient-to-br from-slate-50 to-primary/10 border-brand/20">
                <CardHeader>
                    <CardTitle className="text-lg">פעולות מהירות</CardTitle>
                </CardHeader>
                <CardContent className="flex flex-wrap gap-3">
                    <Button variant="outline" className="border-brand/20 hover:bg-brand-dark/10">
                        ייצוא נתונים
                    </Button>
                    <Button variant="outline" className="border-brand/20 hover:bg-brand-dark/10">
                        גיבוי מערכת
                    </Button>
                    <Button variant="outline" className="border-brand/20 hover:bg-brand-dark/10">
                        צפייה בלוגים
                    </Button>
                    <Button variant="outline" className="border-brand/20 hover:bg-brand-dark/10">
                        בדיקת מערכת
                    </Button>
                </CardContent>
            </Card>
        </div>
    );
}
