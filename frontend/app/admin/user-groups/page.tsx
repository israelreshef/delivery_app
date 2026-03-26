"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { toast } from "sonner";

type GroupItem = {
    id: number;
    name: string;
    description?: string;
    is_active: boolean;
    users_count: number;
    permissions: string[];
};

type PermissionItem = {
    id: number;
    permission_key: string;
    resource: string;
    action: string;
    description?: string;
};

export default function UserGroupsPage() {
    const [groups, setGroups] = useState<GroupItem[]>([]);
    const [permissions, setPermissions] = useState<PermissionItem[]>([]);
    const [loading, setLoading] = useState(true);

    const [name, setName] = useState("");
    const [description, setDescription] = useState("");
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [saving, setSaving] = useState(false);

    const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
    const [editingPermissions, setEditingPermissions] = useState<string[]>([]);

    const availablePermissionKeys = useMemo(
        () => permissions.map((p) => p.permission_key),
        [permissions]
    );

    const fetchData = async () => {
        try {
            setLoading(true);
            const res = await api.get("/admin/groups");
            setGroups(res.data.groups || []);
            setPermissions(res.data.available_permissions || []);
        } catch (error) {
            console.error(error);
            toast.error("Failed to load groups");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const togglePermission = (key: string, list: string[], setList: (val: string[]) => void) => {
        if (list.includes(key)) {
            setList(list.filter((x) => x !== key));
        } else {
            setList([...list, key]);
        }
    };

    const createGroup = async () => {
        if (!name.trim()) {
            toast.error("Group name is required");
            return;
        }
        try {
            setSaving(true);
            await api.post("/admin/groups", {
                name: name.trim(),
                description: description.trim() || null,
                permission_keys: selectedPermissions,
            });
            toast.success("Group created");
            setName("");
            setDescription("");
            setSelectedPermissions([]);
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Failed to create group");
        } finally {
            setSaving(false);
        }
    };

    const saveGroupPermissions = async () => {
        if (!editingGroupId) return;
        try {
            setSaving(true);
            await api.put(`/admin/groups/${editingGroupId}`, {
                permission_keys: editingPermissions,
            });
            toast.success("Group updated");
            setEditingGroupId(null);
            setEditingPermissions([]);
            fetchData();
        } catch (error: any) {
            toast.error(error?.response?.data?.error || "Failed to update group");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return <div className="p-6" dir="rtl">Loading groups...</div>;
    }

    return (
        <div className="p-6 space-y-6" dir="rtl">
            <div>
                <h1 className="text-2xl font-bold">ניהול קבוצות והרשאות</h1>
                <p className="text-sm text-slate-500 mt-1">
                    יצירה ועריכה של קבוצות הרשאות למשתמשי מערכת.
                </p>
            </div>

            <div className="rounded-lg border p-4 space-y-4">
                <h2 className="font-semibold">יצירת קבוצה חדשה</h2>
                <div className="grid md:grid-cols-2 gap-3">
                    <input
                        className="border rounded px-3 py-2"
                        placeholder="שם קבוצה (לדוגמה: support)"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                    />
                    <input
                        className="border rounded px-3 py-2"
                        placeholder="תיאור"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                    />
                </div>
                <div>
                    <div className="font-medium mb-2">הרשאות</div>
                    <div className="grid md:grid-cols-3 gap-2">
                        {availablePermissionKeys.map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={selectedPermissions.includes(key)}
                                    onChange={() => togglePermission(key, selectedPermissions, setSelectedPermissions)}
                                />
                                <span>{key}</span>
                            </label>
                        ))}
                    </div>
                </div>
                <button
                    className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                    onClick={createGroup}
                    disabled={saving}
                >
                    צור קבוצה
                </button>
            </div>

            <div className="rounded-lg border overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="bg-slate-50">
                        <tr>
                            <th className="text-right p-3">קבוצה</th>
                            <th className="text-right p-3">תיאור</th>
                            <th className="text-right p-3">משתמשים</th>
                            <th className="text-right p-3">הרשאות</th>
                            <th className="text-right p-3">פעולה</th>
                        </tr>
                    </thead>
                    <tbody>
                        {groups.map((group) => (
                            <tr key={group.id} className="border-t align-top">
                                <td className="p-3 font-medium">{group.name}</td>
                                <td className="p-3">{group.description || "-"}</td>
                                <td className="p-3">{group.users_count}</td>
                                <td className="p-3">
                                    <div className="flex flex-wrap gap-1">
                                        {group.permissions.map((p) => (
                                            <span key={p} className="bg-slate-100 px-2 py-0.5 rounded text-xs">{p}</span>
                                        ))}
                                    </div>
                                </td>
                                <td className="p-3">
                                    <button
                                        className="border px-3 py-1.5 rounded"
                                        onClick={() => {
                                            setEditingGroupId(group.id);
                                            setEditingPermissions(group.permissions || []);
                                        }}
                                    >
                                        ערוך הרשאות
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {editingGroupId && (
                <div className="rounded-lg border p-4 space-y-3">
                    <div className="font-semibold">עריכת הרשאות לקבוצה #{editingGroupId}</div>
                    <div className="grid md:grid-cols-3 gap-2">
                        {availablePermissionKeys.map((key) => (
                            <label key={key} className="flex items-center gap-2 text-sm">
                                <input
                                    type="checkbox"
                                    checked={editingPermissions.includes(key)}
                                    onChange={() => togglePermission(key, editingPermissions, setEditingPermissions)}
                                />
                                <span>{key}</span>
                            </label>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button
                            className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
                            onClick={saveGroupPermissions}
                            disabled={saving}
                        >
                            שמור
                        </button>
                        <button
                            className="border px-4 py-2 rounded"
                            onClick={() => {
                                setEditingGroupId(null);
                                setEditingPermissions([]);
                            }}
                        >
                            ביטול
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
