"use client";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, ArrowRight, TrendingUp, Zap, Package } from "lucide-react";
import Link from "next/link";

export default function BlogPage() {
    const posts = [
        {
            id: 1,
            title: "5 טיפים לאופטימיזציה של עלויות משלוח",
            excerpt: "גלה איך לחסוך עד 30% בעלויות המשלוח שלך עם האסטרטגיות הבאות...",
            author: "צוות TZIR",
            date: "1 בפברואר 2026",
            category: "טיפים",
            image: "💡",
            readTime: "5 דקות קריאה"
        },
        {
            id: 2,
            title: "המדריך המלא למשלוחי אקספרס",
            excerpt: "כל מה שצריך לדעת על משלוחים דחופים - מתי כדאי, איך לתכנן ועוד...",
            author: "דוד כהן",
            date: "28 בינואר 2026",
            category: "מדריכים",
            image: "🚀",
            readTime: "8 דקות קריאה"
        },
        {
            id: 3,
            title: "טרנדים בעולם המשלוחים ב-2026",
            excerpt: "מה חדש בתעשיית המשלוחים? רכבים אוטונומיים, AI ועוד...",
            author: "שרה לוי",
            date: "25 בינואר 2026",
            category: "חדשות",
            image: "📈",
            readTime: "6 דקות קריאה"
        },
        {
            id: 4,
            title: "איך לבחור שירות משלוחים לעסק שלך",
            excerpt: "המדריך השלם לבחירת ספק משלוחים - קריטריונים, שאלות ועוד...",
            author: "מיכל אברהם",
            date: "20 בינואר 2026",
            category: "מדריכים",
            image: "🎯",
            readTime: "10 דקות קריאה"
        },
        {
            id: 5,
            title: "סיפור הצלחה: איך PROMALL חסכה 40% בעלויות",
            excerpt: "קראו על השותפות שלנו עם PROMALL וכיצד ייעלנו את תהליכי המשלוח שלהם...",
            author: "צוות TZIR",
            date: "15 בינואר 2026",
            category: "סיפורי הצלחה",
            image: "⭐",
            readTime: "7 דקות קריאה"
        },
        {
            id: 6,
            title: "אבטחת מידע במשלוחים - מה חשוב לדעת",
            excerpt: "כל מה שצריך לדעת על הגנת מידע ופרטיות בתהליך המשלוח...",
            author: "אבי מזרחי",
            date: "10 בינואר 2026",
            category: "אבטחה",
            image: "🔒",
            readTime: "5 דקות קריאה"
        }
    ];

    const categories = ["הכל", "טיפים", "מדריכים", "חדשות", "סיפורי הצלחה", "אבטחה"];

    const getCategoryColor = (category: string) => {
        const colors: Record<string, string> = {
            "טיפים": "bg-blue-100 text-blue-800",
            "מדריכים": "bg-green-100 text-green-800",
            "חדשות": "bg-purple-100 text-purple-800",
            "סיפורי הצלחה": "bg-yellow-100 text-yellow-800",
            "אבטחה": "bg-red-100 text-red-800"
        };
        return colors[category] || "bg-gray-100 text-gray-800";
    };

    return (
        <div className="min-h-screen bg-slate-50" dir="rtl">
            {/* Hero */}
            <div className="bg-gradient-to-l from-indigo-600 to-indigo-800 text-white py-20">
                <div className="max-w-6xl mx-auto px-6">
                    <Badge className="mb-4 bg-white/20">Blog</Badge>
                    <h1 className="text-5xl font-bold mb-4">הבלוג של TZIR</h1>
                    <p className="text-xl text-indigo-100 max-w-2xl">
                        טיפים, מדריכים וחדשות מעולם המשלוחים והלוגיסטיקה
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16">
                {/* Categories Filter */}
                <div className="flex gap-2 mb-12 overflow-x-auto pb-2">
                    {categories.map((category) => (
                        <Button
                            key={category}
                            variant={category === "הכל" ? "default" : "outline"}
                            className="whitespace-nowrap"
                        >
                            {category}
                        </Button>
                    ))}
                </div>

                {/* Featured Post */}
                <Card className="mb-12 overflow-hidden border-2 border-indigo-200 hover:shadow-xl transition-all">
                    <div className="grid md:grid-cols-2">
                        <div className="bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center p-12">
                            <div className="text-center">
                                <div className="text-8xl mb-4">{posts[0].image}</div>
                                <Badge className="bg-indigo-600">מומלץ</Badge>
                            </div>
                        </div>
                        <div className="p-8 flex flex-col justify-center">
                            <Badge className={`w-fit mb-3 ${getCategoryColor(posts[0].category)}`}>
                                {posts[0].category}
                            </Badge>
                            <h2 className="text-3xl font-bold mb-4">{posts[0].title}</h2>
                            <p className="text-slate-600 mb-6">{posts[0].excerpt}</p>
                            <div className="flex items-center gap-4 text-sm text-slate-500 mb-6">
                                <div className="flex items-center gap-1">
                                    <User className="w-4 h-4" />
                                    {posts[0].author}
                                </div>
                                <div className="flex items-center gap-1">
                                    <Calendar className="w-4 h-4" />
                                    {posts[0].date}
                                </div>
                            </div>
                            <Button className="w-fit gap-2">
                                קרא עוד
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                </Card>

                {/* Blog Posts Grid */}
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
                    {posts.slice(1).map((post) => (
                        <Card key={post.id} className="hover:shadow-lg transition-all cursor-pointer group">
                            <CardHeader>
                                <div className="text-6xl mb-4 text-center">{post.image}</div>
                                <Badge className={`w-fit mb-2 ${getCategoryColor(post.category)}`}>
                                    {post.category}
                                </Badge>
                                <CardTitle className="group-hover:text-indigo-600 transition-colors">
                                    {post.title}
                                </CardTitle>
                                <CardDescription>{post.excerpt}</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="flex items-center gap-3 text-xs text-slate-500 mb-4">
                                    <div className="flex items-center gap-1">
                                        <User className="w-3 h-3" />
                                        {post.author}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <Calendar className="w-3 h-3" />
                                        {post.date}
                                    </div>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-xs text-slate-500">{post.readTime}</span>
                                    <Button variant="ghost" size="sm" className="gap-1 group-hover:gap-2 transition-all">
                                        קרא עוד
                                        <ArrowRight className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>

                {/* Load More */}
                <div className="text-center">
                    <Button variant="outline" size="lg">
                        טען עוד מאמרים
                    </Button>
                </div>

                {/* Newsletter Signup */}
                <Card className="mt-16 bg-gradient-to-l from-indigo-600 to-indigo-800 text-white border-0">
                    <CardContent className="p-12 text-center">
                        <h3 className="text-3xl font-bold mb-4">הישאר מעודכן</h3>
                        <p className="text-indigo-100 mb-8 max-w-2xl mx-auto">
                            הירשם לניוזלטר שלנו וקבל את המאמרים החדשים ישירות למייל
                        </p>
                        <div className="flex gap-3 max-w-md mx-auto">
                            <input
                                type="email"
                                placeholder="האימייל שלך"
                                className="flex-1 px-4 py-3 rounded-lg text-slate-900"
                            />
                            <Button size="lg" variant="secondary">
                                הרשמה
                            </Button>
                        </div>
                    </CardContent>
                </Card>

                {/* Popular Topics */}
                <div className="mt-16">
                    <h2 className="text-3xl font-bold mb-8">נושאים פופולריים</h2>
                    <div className="grid md:grid-cols-3 gap-6">
                        <Card className="hover:shadow-lg transition-all cursor-pointer">
                            <CardContent className="pt-6 text-center">
                                <TrendingUp className="w-12 h-12 mx-auto mb-4 text-green-600" />
                                <h3 className="font-bold mb-2">אופטימיזציה</h3>
                                <p className="text-sm text-slate-600">12 מאמרים</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all cursor-pointer">
                            <CardContent className="pt-6 text-center">
                                <Zap className="w-12 h-12 mx-auto mb-4 text-yellow-600" />
                                <h3 className="font-bold mb-2">טכנולוגיה</h3>
                                <p className="text-sm text-slate-600">8 מאמרים</p>
                            </CardContent>
                        </Card>
                        <Card className="hover:shadow-lg transition-all cursor-pointer">
                            <CardContent className="pt-6 text-center">
                                <Package className="w-12 h-12 mx-auto mb-4 text-blue-600" />
                                <h3 className="font-bold mb-2">לוגיסטיקה</h3>
                                <p className="text-sm text-slate-600">15 מאמרים</p>
                            </CardContent>
                        </Card>
                    </div>
                </div>
            </div>
        </div>
    );
}
