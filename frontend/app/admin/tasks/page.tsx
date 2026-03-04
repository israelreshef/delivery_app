'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { toast } from 'sonner';
import { CheckCircle2, Clock, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';

interface Task {
    id: number;
    title: string;
    description: string;
    due_date: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
    customer_id: number;
    customer_name: string;
    assigned_to_name: string;
    created_at: string;
}

function formatDate(dateStr: string) {
    try {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear()}`;
    } catch { return dateStr; }
}

export default function GlobalTasksPage() {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'completed'>('open');

    useEffect(() => { fetchTasks(); }, []);

    const fetchTasks = async () => {
        try {
            setLoading(true);
            const res = await api.get('/tasks');
            setTasks(res.data);
        } catch (err: any) {
            toast.error('שגיאה בטעינת המשימות');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleTaskToggle = async (taskId: number, currentStatus: string) => {
        const newStatus = currentStatus === 'completed' ? 'open' : 'completed';
        try {
            await api.patch(`/tasks/${taskId}`, { status: newStatus });
            setTasks(tasks.map(t => t.id === taskId ? { ...t, status: newStatus as any } : t));
        } catch {
            toast.error('שגיאה בעדכון משימה');
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'bg-red-500/15 text-red-500';
            case 'medium': return 'bg-amber-500/15 text-amber-500';
            case 'low': return 'bg-emerald-500/15 text-emerald-500';
            default: return 'bg-muted/15 text-muted';
        }
    };

    const filteredTasks = tasks.filter(t => {
        if (filter === 'open') return t.status !== 'completed' && t.status !== 'cancelled';
        if (filter === 'completed') return t.status === 'completed';
        return true;
    });

    return (
        <div className="p-8 max-w-5xl mx-auto flex flex-col gap-6 font-sans" dir="rtl">
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-2xl font-bold text-text mb-1">ניהול משימות</h1>
                    <p className="text-sm text-muted">מעקב אחר משימות פתוחות מול לקוחות ועשייה</p>
                </div>
                <div className="flex gap-1 bg-surface border border-border p-1 rounded-lg">
                    {(['open', 'completed', 'all'] as const).map(f => (
                        <button key={f} onClick={() => setFilter(f)}
                            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${filter === f ? 'bg-accent text-white' : 'text-muted hover:text-text'}`}>
                            {f === 'open' ? 'פתוחות' : f === 'completed' ? 'הושלמו' : 'הכל'}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="py-20 flex justify-center"><Loader2 className="w-8 h-8 text-accent animate-spin" /></div>
            ) : filteredTasks.length === 0 ? (
                <div className="py-20 flex flex-col items-center gap-3 bg-surface border border-dashed border-border rounded-xl">
                    <CheckCircle2 className="w-12 h-12 text-emerald-500 opacity-50" />
                    <div className="text-lg font-medium text-text">אין משימות להצגה</div>
                    <div className="text-sm text-muted">נהדר! הכל מטופל.</div>
                </div>
            ) : (
                <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-sm">
                    <table className="w-full text-right">
                        <thead>
                            <tr className="bg-surface2 border-b border-border">
                                <th className="w-10 p-4"></th>
                                <th className="p-4 text-[12px] font-semibold text-muted uppercase">משימה</th>
                                <th className="p-4 text-[12px] font-semibold text-muted uppercase">לקוח</th>
                                <th className="p-4 text-[12px] font-semibold text-muted uppercase">עדיפות</th>
                                <th className="p-4 text-[12px] font-semibold text-muted uppercase">תאריך יעד</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredTasks.map(task => {
                                const isDone = task.status === 'completed';
                                const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date();
                                return (
                                    <tr key={task.id} className={`hover:bg-surface2/50 transition-colors ${isDone ? 'opacity-60' : ''}`}>
                                        <td className="p-4">
                                            <button
                                                onClick={() => handleTaskToggle(task.id, task.status)}
                                                className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'bg-emerald-500 border-emerald-500' : 'border-border hover:border-accent'}`}
                                            >
                                                {isDone && <CheckCircle2 className="w-5 h-5 text-white" />}
                                            </button>
                                        </td>
                                        <td className="p-4">
                                            <div className={`text-[14px] font-medium text-text ${isDone ? 'line-through text-muted' : ''}`}>{task.title}</div>
                                            {task.description && <div className="text-[13px] text-muted mt-0.5 line-clamp-1">{task.description}</div>}
                                        </td>
                                        <td className="p-4">
                                            {task.customer_id ? (
                                                <Link href={`/admin/customers/${task.customer_id}`}
                                                    className="text-[13px] font-medium text-accent hover:underline bg-accent/10 px-2.5 py-1 rounded-md">
                                                    {task.customer_name}
                                                </Link>
                                            ) : <span className="text-[13px] text-muted">כללי</span>}
                                        </td>
                                        <td className="p-4">
                                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[12px] font-semibold ${getPriorityColor(task.priority)}`}>
                                                {task.priority === 'high' ? 'גבוהה' : task.priority === 'medium' ? 'בינונית' : 'נמוכה'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            {task.due_date ? (
                                                <div className={`inline-flex items-center gap-1.5 text-[13px] font-medium ${isOverdue ? 'text-red-500' : 'text-muted'}`}>
                                                    {isOverdue ? <AlertCircle className="w-3.5 h-3.5" /> : <Clock className="w-3.5 h-3.5" />}
                                                    {formatDate(task.due_date)}
                                                </div>
                                            ) : <span className="text-[13px] text-muted">ללא תאריך</span>}
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
