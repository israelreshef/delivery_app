"use client";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Header } from "@/components/dashboard/header";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search, Plus, User, Building, MapPin } from "lucide-react";
import { useEffect, useState } from "react";
import { api } from "@/lib/api";

type Customer = {
    id: number;
    full_name: string;
    company_name: string;
    default_address: string;
    user: {
        email: string;
        phone: string;
    };
    balance: number;
};

export default function CustomersPage() {
    const [customers, setCustomers] = useState<Customer[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // In a real app we would have a dedicated endpoint, but let's mock using same seed structure if needed
        // or just display empty for now as we focused on couriers/orders
        // Let's TRY to fetch active customers from orders for now if endpoints missing
        // Ideally: api.get('/customers')
        // We will assume endpoint exists
        fetchCustomers();
    }, []);

    const fetchCustomers = async () => {
        try {
            // Note: We haven't explicitly built GET /customers in Flask yet, 
            // but assuming we will or using basic mock
            // Let's create a quick array if fail
            const res = await api.get('/admin/customers').catch(() => ({ data: [] }));
            setCustomers(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex h-screen bg-background text-right" dir="rtl">
            <Sidebar />
            <div className="flex flex-1 flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-y-auto p-6">

                    <div className="flex items-center justify-between mb-6">
                        <h1 className="text-3xl font-bold">ניהול לקוחות</h1>
                        <Button className="gap-2">
                            <Plus className="h-4 w-4" />
                            לקוח עסקי חדש
                        </Button>
                    </div>

                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle>לקוחות רשומים</CardTitle>
                                <div className="relative w-64">
                                    <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                                    <Input placeholder="חיפוש חברה או שם..." className="pr-8" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">שם לקוח / חברה</TableHead>
                                        <TableHead className="text-right">איש קשר</TableHead>
                                        <TableHead className="text-right">כתובת ברירת מחדל</TableHead>
                                        <TableHead className="text-right">יתרה</TableHead>
                                        <TableHead className="text-right">פעולות</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {customers.map((c) => (
                                        <TableRow key={c.id}>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span className="font-medium">{c.company_name || c.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{c.user.email}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex flex-col">
                                                    <span>{c.full_name}</span>
                                                    <span className="text-xs text-muted-foreground">{c.user.phone}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="flex items-center gap-2 text-sm">
                                                    <MapPin className="h-3 w-3 text-muted-foreground" />
                                                    {c.default_address}
                                                </div>
                                            </TableCell>
                                            <TableCell>
                                                <span className={c.balance < 0 ? "text-red-500 font-bold" : "text-green-600"}>
                                                    ₪{c.balance}
                                                </span>
                                            </TableCell>
                                            <TableCell>
                                                <Button variant="outline" size="sm">הזמנות</Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {customers.length === 0 && !loading && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                                                אין נתונים להצגה (יש לוודא endpoint בשרת)
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </main>
            </div>
        </div>
    );
}
