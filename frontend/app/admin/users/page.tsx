"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Eye, EyeOff, Key } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";

type AnyUser = {
  id: number;
  username: string;
  email: string;
  phone: string;
  user_type: "admin" | "courier" | "customer" | string;
  is_active: boolean;
  groups?: Array<{ id: number; name: string }>;
};

export default function AdminUsersPage() {
  const [users, setUsers] = useState<AnyUser[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [pendingCouriers, setPendingCouriers] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [targetRole, setTargetRole] = useState("courier");
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  const [resetUser, setResetUser] = useState<AnyUser | null>(null);
  const [newPass, setNewPass] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [isResetting, setIsResetting] = useState(false);

  const [groupDialogUser, setGroupDialogUser] = useState<AnyUser | null>(null);
  const [selectedGroupIds, setSelectedGroupIds] = useState<number[]>([]);
  const [isSavingGroups, setIsSavingGroups] = useState(false);

  useEffect(() => {
    void refreshAll();
  }, []);

  const refreshAll = async () => {
    await Promise.all([fetchUsers(), fetchInvitations(), fetchPendingCouriers(), fetchGroups()]);
  };

  const fetchUsers = async () => {
    try {
      const res = await api.get("/admin/users?include_permissions=1");
      setUsers(res.data || []);
    } catch (error) {
      console.error("Failed to fetch users", error);
      toast.error("Failed to load users");
    } finally {
      setLoading(false);
    }
  };

  const fetchInvitations = async () => {
    try {
      const res = await api.get("/admin/invitations");
      setInvitations(res.data || []);
    } catch (error) {
      console.error("Failed to fetch invitations", error);
    }
  };

  const fetchPendingCouriers = async () => {
    try {
      const res = await api.get("/couriers");
      const data = res.data || [];
      setPendingCouriers(data.filter((c: any) => !c.is_available));
    } catch (error) {
      console.error("Failed to fetch pending couriers", error);
    }
  };

  const fetchGroups = async () => {
    try {
      const res = await api.get("/admin/groups");
      setGroups(res.data?.groups || []);
    } catch (error) {
      console.error("Failed to fetch groups", error);
    }
  };

  const handleBanUser = async (userId: number, currentStatus: boolean) => {
    try {
      await api.post(`/admin/users/${userId}/ban`, { ban: currentStatus });
      await fetchUsers();
    } catch (error) {
      console.error("Failed to ban/unban user", error);
      toast.error("Failed to update user status");
    }
  };

  const handleCreateInvitation = async () => {
    try {
      const res = await api.post("/admin/invitations", { target_role: targetRole });
      setGeneratedCode(res.data.code);
      await fetchInvitations();
    } catch (error) {
      console.error("Failed to create invitation", error);
      toast.error("Failed to create invitation");
    }
  };

  const handleApproveCourier = async (courierId: number, action: "approve" | "reject") => {
    try {
      await api.post(`/admin/couriers/${courierId}/approve`, { action });
      await Promise.all([fetchPendingCouriers(), fetchUsers()]);
    } catch (error) {
      console.error("Failed to approve courier", error);
      toast.error("Failed to update courier approval");
    }
  };

  const handleResetPassword = async () => {
    if (!resetUser || !newPass) return;
    setIsResetting(true);
    try {
      await api.post("/auth/admin/reset-password", {
        user_id: resetUser.id,
        password: newPass,
      });
      toast.success(`Password reset for ${resetUser.username}`);
      setResetUser(null);
      setNewPass("");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to reset password");
    } finally {
      setIsResetting(false);
    }
  };

  const openGroupsDialog = (user: AnyUser) => {
    setGroupDialogUser(user);
    setSelectedGroupIds((user.groups || []).map((g) => Number(g.id)));
  };

  const toggleGroup = (groupId: number) => {
    if (selectedGroupIds.includes(groupId)) {
      setSelectedGroupIds(selectedGroupIds.filter((id) => id !== groupId));
    } else {
      setSelectedGroupIds([...selectedGroupIds, groupId]);
    }
  };

  const saveGroupsForUser = async () => {
    if (!groupDialogUser) return;
    setIsSavingGroups(true);
    try {
      await api.put(`/admin/users/${groupDialogUser.id}`, { group_ids: selectedGroupIds });
      toast.success("User groups updated");
      setGroupDialogUser(null);
      await fetchUsers();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to update groups");
    } finally {
      setIsSavingGroups(false);
    }
  };

  const roleLabel = (role: string) => {
    if (role === "admin") return "מנהל";
    if (role === "courier") return "שליח";
    if (role === "customer") return "לקוח";
    return role;
  };

  return (
    <div className="container mx-auto py-10 space-y-8" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">ניהול משתמשים</h1>
          <p className="text-muted-foreground">ניהול משתמשים, הזמנות וקבוצות הרשאה.</p>
        </div>
        <Link href="/admin/user-groups">
          <Button variant="outline">ניהול קבוצות והרשאות</Button>
        </Link>
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
              <CardDescription>צפיה ועריכה של משתמשים קיימים</CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="py-10 text-center text-muted-foreground">Loading...</div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">שם משתמש</TableHead>
                      <TableHead className="text-right">אימייל</TableHead>
                      <TableHead className="text-right">טלפון</TableHead>
                      <TableHead className="text-right">סוג</TableHead>
                      <TableHead className="text-right">קבוצות</TableHead>
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
                          <Badge variant={user.user_type === "admin" ? "destructive" : user.user_type === "courier" ? "secondary" : "outline"}>
                            {roleLabel(user.user_type)}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {(user.groups || []).map((group) => (
                              <Badge key={`${user.id}-${group.id}`} variant="secondary">
                                {group.name}
                              </Badge>
                            ))}
                            {(!user.groups || user.groups.length === 0) && (
                              <span className="text-xs text-muted-foreground">ללא</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={user.is_active ? "default" : "destructive"} className={user.is_active ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                            {user.is_active ? "פעיל" : "חסום"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {user.user_type !== "admin" && (
                              <Button variant={user.is_active ? "destructive" : "outline"} size="sm" onClick={() => handleBanUser(user.id, user.is_active)}>
                                {user.is_active ? "חסום" : "הפעל"}
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              data-testid={`open-groups-${user.id}`}
                              onClick={() => openGroupsDialog(user)}
                            >
                              קבוצות
                            </Button>
                            <Button variant="outline" size="sm" title="איפוס סיסמה" onClick={() => setResetUser(user)}>
                              <Key className="w-4 h-4 text-orange-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="invitations">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <CardTitle>קודי הזמנה פעילים</CardTitle>
                <CardDescription>רשימת קודים להצטרפות למערכת</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-right">קוד</TableHead>
                      <TableHead className="text-right">תפקיד יעד</TableHead>
                      <TableHead className="text-right">נוצר בתאריך</TableHead>
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
                          <Badge variant={invite.is_used ? "secondary" : "outline"}>{invite.is_used ? "נוצל" : "פנוי"}</Badge>
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
                <CardDescription>צור קוד הזמנה לפי תפקיד</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">תפקיד יעד</label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    value={targetRole}
                    onChange={(e) => setTargetRole(e.target.value)}
                    title="בחר תפקיד"
                  >
                    <option value="courier">שליח</option>
                    <option value="customer">לקוח</option>
                    <option value="admin">מנהל</option>
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
              <CardTitle>בקשות ממתינות</CardTitle>
              <CardDescription>שליחים הממתינים לאישור</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-right">שם</TableHead>
                    <TableHead className="text-right">טלפון</TableHead>
                    <TableHead className="text-right">רכב</TableHead>
                    <TableHead className="text-right">פעולות</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingCouriers.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center text-muted-foreground py-10">
                        אין בקשות ממתינות
                      </TableCell>
                    </TableRow>
                  )}
                  {pendingCouriers.map((courier) => (
                    <TableRow key={courier.id}>
                      <TableCell className="font-medium">{courier.full_name}</TableCell>
                      <TableCell>{courier.phone}</TableCell>
                      <TableCell>{courier.vehicle_type}</TableCell>
                      <TableCell className="space-x-2">
                        <Button variant="default" size="sm" className="bg-green-600 hover:bg-green-700 ml-2" onClick={() => handleApproveCourier(courier.id, "approve")}>
                          אשר
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleApproveCourier(courier.id, "reject")}>
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

      <Dialog open={!!resetUser} onOpenChange={(open) => !open && setResetUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>איפוס סיסמה למשתמש - {resetUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2 text-right">
              <Label>סיסמה חדשה</Label>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  value={newPass}
                  onChange={(e) => setNewPass(e.target.value)}
                  placeholder="הכנס סיסמה חדשה"
                  className="text-right"
                />
                <button type="button" onClick={() => setShowPass(!showPass)} className="absolute left-3 top-3 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setResetUser(null)}>
              ביטול
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPass}>
              {isResetting ? "מעדכן..." : "אפס סיסמה"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!groupDialogUser} onOpenChange={(open) => !open && setGroupDialogUser(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ניהול קבוצות עבור {groupDialogUser?.username}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2 max-h-[50vh] overflow-auto" data-testid="groups-dialog-list">
            {groups.map((group) => (
              <label key={group.id} className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={selectedGroupIds.includes(Number(group.id))}
                  onChange={() => toggleGroup(Number(group.id))}
                  data-testid={`group-checkbox-${group.id}`}
                />
                <span>{group.name}</span>
              </label>
            ))}
            {groups.length === 0 && <p className="text-sm text-muted-foreground">לא נמצאו קבוצות במערכת</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGroupDialogUser(null)}>
              ביטול
            </Button>
            <Button data-testid="save-user-groups" onClick={saveGroupsForUser} disabled={isSavingGroups}>
              {isSavingGroups ? "שומר..." : "שמור"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
