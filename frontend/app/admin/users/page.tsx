"use client"

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from '@/lib/api'

export default function AdminUsersPage() {
    const [users, setUsers] = useState<any[]>([])
    const [invitations, setInvitations] = useState<any[]>([])
    const [pendingCouriers, setPendingCouriers] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [targetRole, setTargetRole] = useState('courier')
    const [generatedCode, setGeneratedCode] = useState(null)

    useEffect(() => {
        fetchUsers()
        fetchInvitations()
        fetchPendingCouriers()
    }, [])

    const fetchUsers = async () => {
        try {
            const res = await api.get('/admin/users')
            setUsers(res.data)
        } catch (error) {
            console.error("Failed to fetch users", error)
        } finally {
            setLoading(false)
        }
    }

    const fetchInvitations = async () => {
        try {
            const res = await api.get('/admin/invitations')
            setInvitations(res.data)
        } catch (error) {
            console.error("Failed to fetch invitations", error)
        }
    }

    const fetchPendingCouriers = async () => {
        try {
            const res = await api.get('/couriers')
            const data = res.data;
            setPendingCouriers(data.filter((c: any) => !c.is_available))
        } catch (error) {
            console.error("Failed to fetch pending couriers", error)
        }
    }

    const handleBanUser = async (userId: number, currentStatus: boolean) => {
        try {
            await api.post(`/admin/users/${userId}/ban`, { ban: currentStatus })
            fetchUsers()
        } catch (error) {
            console.error("Failed to ban/unban user", error)
        }
    }

    const handleCreateInvitation = async () => {
        try {
            const res = await api.post('/admin/invitations', { target_role: targetRole })
            setGeneratedCode(res.data.code)
            fetchInvitations()
        } catch (error) {
            console.error("Failed to create invitation", error)
        }
    }

    const handleApproveCourier = async (courierId: number, action: string) => {
        try {
            await api.post(`/admin/couriers/${courierId}/approve`, { action: action })
            fetchPendingCouriers()
            fetchUsers() // Refresh users as status might change
        } catch (error) {
            console.error("Failed to approve courier", error)
        }
    }

    return (
        <div className="container mx-auto py-10 space-y-8" dir="rtl">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">ניהול משתמשים</h1>
                    <p className="text-muted-foreground">צפייה וניהול של כל המשתמשים, שליחים וקולי ההזמנה במערכת.</p>
                </div>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList>
                    <TabsTrigger value="users">משתמשים</TabsTrigger>
                    <TabsTrigger value="invitations">קודי הזמנה</TabsTrigger>
                    <TabsTrigger value="approvals">בקשות ממתינות</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader>
                            <CardTitle>כל המשתמשים</CardTitle>
                            <CardDescription>רשימת המשתמשים הרשומים במערכת</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">שם משתמש</TableHead>
                                        <TableHead className="text-right">אימייל</TableHead>
                                        <TableHead className="text-right">טלפון</TableHead>
                                        <TableHead className="text-right">סוג</TableHead>
                                        <TableHead className="text-right">סטטוס</TableHead>
                                        <TableHead className="text-right">פעולות</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {users.map((user) => (
                                        <TableRow key={user.id}>
                                            <TableCell className="font-medium">{user.username}</TableCell>
                                            <TableCell>{user.email}</TableCell>
                                            <TableCell>{user.phone}</TableCell>
                                            <TableCell>
                                                <Badge variant={user.user_type === 'admin' ? 'destructive' : user.user_type === 'courier' ? 'secondary' : 'outline'}>
                                                    {user.user_type === 'customer' ? 'לקוח' : user.user_type === 'courier' ? 'שליח' : 'מנהל'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant={user.is_active ? 'default' : 'destructive'} className={user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                                                    {user.is_active ? 'פעיל' : 'חסום'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                {user.user_type !== 'admin' && (
                                                    <Button
                                                        variant={user.is_active ? "destructive" : "outline"}
                                                        size="sm"
                                                        onClick={() => handleBanUser(user.id, user.is_active)}
                                                    >
                                                        {user.is_active ? 'חסום' : 'הפעל'}
                                                    </Button>
                                                )}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="invitations">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                        <Card className="col-span-4">
                            <CardHeader>
                                <CardTitle>קודי הזמנה פעילים</CardTitle>
                                <CardDescription>רשימת קודים שנוצרו להצטרפות למערכת</CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead className="text-right">קוד</TableHead>
                                            <TableHead className="text-right">תפקיד מיועד</TableHead>
                                            <TableHead className="text-right">נוצר ב</TableHead>
                                            <TableHead className="text-right">סטטוס</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {invitations.map((invite) => (
                                            <TableRow key={invite.code}>
                                                <TableCell className="font-mono">{invite.code}</TableCell>
                                                <TableCell>{invite.target_role}</TableCell>
                                                <TableCell>{new Date(invite.created_at).toLocaleDateString()}</TableCell>
                                                <TableCell>
                                                    <Badge variant={invite.is_used ? 'secondary' : 'outline'}>
                                                        {invite.is_used ? 'נוצל' : 'פנוי'}
                                                    </Badge>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </CardContent>
                        </Card>

                        <Card className="col-span-3">
                            <CardHeader>
                                <CardTitle>יצירת קוד חדש</CardTitle>
                                <CardDescription>צור קוד הזמנה חדש למשתמש</CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">תפקיד מיועד</label>
                                    <select
                                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                                        value={targetRole}
                                        onChange={(e) => setTargetRole(e.target.value)}
                                    >
                                        <option value="courier">שליח</option>
                                        <option value="customer">לקוח עסקי</option>
                                        <option value="admin">מנהל (מוגבל)</option>
                                    </select>
                                </div>
                                <Button onClick={handleCreateInvitation} className="w-full">
                                    צור קוד הזמנה
                                </Button>

                                {generatedCode && (
                                    <div className="p-4 mt-4 bg-muted rounded-lg text-center">
                                        <p className="text-sm text-muted-foreground mb-1">הקוד שנוצר:</p>
                                        <p className="text-2xl font-mono font-bold tracking-widest select-all">{generatedCode}</p>
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="approvals">
                    <Card>
                        <CardHeader>
                            <CardTitle>בקשות הצטרפות ממתינות</CardTitle>
                            <CardDescription>שליחים הממתינים לאישור מסמכים</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="text-right">שם מלא</TableHead>
                                        <TableHead className="text-right">טלפון</TableHead>
                                        <TableHead className="text-right">רכב</TableHead>
                                        <TableHead className="text-right">מסמכים</TableHead>
                                        <TableHead className="text-right">פעולות</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {pendingCouriers.length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={5} className="text-center text-muted-foreground py-10">אין בקשות ממתינות</TableCell>
                                        </TableRow>
                                    )}
                                    {pendingCouriers.map((courier) => (
                                        <TableRow key={courier.id}>
                                            <TableCell className="font-medium">{courier.full_name}</TableCell>
                                            <TableCell>{courier.phone}</TableCell>
                                            <TableCell>{courier.vehicle_type}</TableCell>
                                            <TableCell>
                                                <Button variant="link" size="sm" onClick={() => window.alert('פתיחת מסמכים - ייושם בהמשך')}>
                                                    צפה במסמכים
                                                </Button>
                                            </TableCell>
                                            <TableCell className="space-x-2">
                                                <Button
                                                    variant="default"
                                                    size="sm"
                                                    className="bg-green-600 hover:bg-green-700 ml-2"
                                                    onClick={() => handleApproveCourier(courier.id, 'approve')}
                                                >
                                                    אשר
                                                </Button>
                                                <Button
                                                    variant="destructive"
                                                    size="sm"
                                                    onClick={() => handleApproveCourier(courier.id, 'reject')}
                                                >
                                                    דחה
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    )
}
