'use client';

import React, { useState } from 'react';

interface Task {
    id: number;
    title: string;
    description?: string;
    due_date?: string;
    priority: 'low' | 'medium' | 'high';
    status: 'open' | 'in_progress' | 'completed' | 'cancelled';
}

interface FinancialData {
    total_sales: number;
    paid: number;
    open_balance: number;
    cancelled?: number;
}

interface CustomerTasksBoardProps {
    financialData: FinancialData;
    tasks: Task[];
    onTaskToggle: (taskId: number, currentStatus: string) => void;
    onAddTask: (title: string) => void;
}

function formatDateShort(dateStr?: string) {
    if (!dateStr) return null;
    try {
        const d = new Date(dateStr);
        return `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}/${d.getFullYear().toString().slice(-2)}`;
    } catch { return dateStr; }
}

export function CustomerTasksBoard({ financialData, tasks, onTaskToggle, onAddTask }: CustomerTasksBoardProps) {
    const [newTaskTitle, setNewTaskTitle] = useState('');

    const handleAddTask = () => {
        if (!newTaskTitle.trim()) return;
        onAddTask(newTaskTitle);
        setNewTaskTitle('');
    };

    const collectionPercent = financialData.total_sales > 0
        ? Math.round((financialData.paid / financialData.total_sales) * 100)
        : 0;

    return (
        <div className="panel-right">

            {/* Finance Bar */}
            <div className="finance-bar">
                <div className="finance-row">
                    <span className="finance-label">מחזור כולל</span>
                    <span className="finance-value">₪{financialData.total_sales.toLocaleString()}</span>
                </div>
                <div className="finance-row">
                    <span className="finance-label">שולם</span>
                    <span className="finance-value green">₪{financialData.paid.toLocaleString()}</span>
                </div>
                {financialData.open_balance > 0 && (
                    <div className="finance-row">
                        <span className="finance-label">פתוח לגביה</span>
                        <span className="finance-value amber">₪{financialData.open_balance.toLocaleString()}</span>
                    </div>
                )}
                {financialData.cancelled ? (
                    <div className="finance-row">
                        <span className="finance-label">בוטל</span>
                        <span className="finance-value red">₪{financialData.cancelled.toLocaleString()}</span>
                    </div>
                ) : null}

                <div className="progress-bar-wrap">
                    <div className="progress-label">
                        <span>% גביה</span>
                        <span>{collectionPercent}%</span>
                    </div>
                    <div className="progress-track">
                        <div className="progress-fill" style={{ width: `${Math.min(collectionPercent, 100)}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Tasks Section Header */}
            <div className="section-header" style={{ marginTop: 10 }}>
                <div className="card-title">משימות פתוחות</div>
                <a href="/admin/tasks" className="icon-btn" style={{ textDecoration: 'none' }}>⤢</a>
            </div>

            {/* Tasks List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {tasks.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--muted)', fontSize: 13 }}>
                        אין ללקוח זה משימות פתוחות.
                    </div>
                ) : tasks.map(task => {
                    const isDone = task.status === 'completed';
                    const isOverdue = !isDone && task.due_date && new Date(task.due_date) < new Date();

                    let priorityClass = 'p-low';
                    if (task.priority === 'high') priorityClass = 'p-high';
                    if (task.priority === 'medium') priorityClass = 'p-med';

                    return (
                        <div key={task.id}
                            className={`task-item ${isDone ? 'done' : ''}`}
                            onClick={() => onTaskToggle(task.id, task.status)}>

                            <div className="task-check">
                                {isDone && (
                                    <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                                        <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                    </svg>
                                )}
                            </div>

                            <div style={{ flex: 1 }}>
                                <div className="task-text">{task.title}</div>
                                {task.due_date && (
                                    <div className={`task-due ${isOverdue ? 'overdue' : ''}`}>
                                        {isOverdue ? '⚠ ' : ''}{formatDateShort(task.due_date)}
                                    </div>
                                )}
                            </div>

                            {!isDone && <div className={`task-priority ${priorityClass}`}></div>}
                        </div>
                    );
                })}
            </div>

            {/* Add Task Input */}
            <div className="add-task-input">
                <input
                    type="text"
                    placeholder="הוסף משימה..."
                    value={newTaskTitle}
                    onChange={e => setNewTaskTitle(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleAddTask()}
                />
                <button onClick={handleAddTask} className="btn btn-primary" style={{ padding: '0 14px', fontSize: 18 }}>+</button>
            </div>
        </div>
    );
}
