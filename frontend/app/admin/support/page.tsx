"use client";

import { useEffect, useMemo, useState } from "react";
import { LifeBuoy, Search, Loader2, Plus, ListChecks, Filter } from "lucide-react";
import Link from "next/link";
import { supportApi } from "@/lib/api/support";
import { api } from "@/lib/api";
import { SupportTicket, TicketStatus, TicketPriority } from "@/types/support";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import styles from "./support.module.css";

const ticketSchema = z.object({
  subject: z.string().min(3, "נושא קצר מדי"),
  message: z.string().min(10, "הודעה קצרה מדי"),
  priority: z.enum(["low", "medium", "high", "urgent"] as const),
});

type ViewMode = "tickets" | "tasks";
type TaskStatus = "open" | "in_progress" | "completed" | "cancelled";
type TaskSource = "all" | "support_ticket" | "requirements" | "manual";

interface SupportTask {
  id: number;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TicketPriority;
  source?: string;
  source_id?: string;
  assigned_to?: number;
  assigned_to_name?: string;
  created_at?: string;
}

export default function SupportPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [tasks, setTasks] = useState<SupportTask[]>([]);
  const [loading, setLoading] = useState(true);

  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [assignedFilter, setAssignedFilter] = useState<string>("all");
  const [taskSourceFilter, setTaskSourceFilter] = useState<TaskSource>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("tickets");

  const form = useForm<z.infer<typeof ticketSchema>>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      subject: "",
      message: "",
      priority: "medium",
    },
  });

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const data = await supportApi.getTickets({
        status: statusFilter === "all" ? undefined : statusFilter,
        assigned_to: assignedFilter === "all" ? undefined : assignedFilter,
      });
      setTickets(data);
    } catch (error) {
      console.error("Failed to fetch tickets", error);
      toast.error("שגיאה בטעינת הקריאות");
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const params: Record<string, string> = {};
      if (statusFilter !== "all") params.status = statusFilter;
      if (assignedFilter !== "all") params.assigned_to = assignedFilter;
      if (taskSourceFilter !== "all") params.source = taskSourceFilter;

      const res = await api.get("/tasks", { params });
      setTasks(res.data || []);
    } catch (error) {
      console.error("Failed to fetch tasks", error);
      toast.error("שגיאה בטעינת המשימות");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (viewMode === "tickets") {
      fetchTickets();
    } else {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, assignedFilter, taskSourceFilter, viewMode]);

  async function onCreateTicket(values: z.infer<typeof ticketSchema>) {
    try {
      await supportApi.createTicket(values);
      toast.success("הקריאה נפתחה בהצלחה");
      setIsCreateOpen(false);
      form.reset();
      fetchTickets();
    } catch {
      toast.error("שגיאה ביצירת הקריאה");
    }
  }

  const filteredTickets = useMemo(() => {
    const normalized = searchQuery.toLowerCase();
    return tickets.filter((ticket) => {
      return (
        ticket.subject.toLowerCase().includes(normalized) ||
        ticket.id.toString().includes(searchQuery) ||
        ticket.user_name.toLowerCase().includes(normalized)
      );
    });
  }, [tickets, searchQuery]);

  const filteredTasks = useMemo(() => {
    const normalized = searchQuery.toLowerCase();
    return tasks.filter((task) => {
      return (
        task.title.toLowerCase().includes(normalized) ||
        String(task.id).includes(searchQuery) ||
        (task.assigned_to_name || "").toLowerCase().includes(normalized) ||
        (task.source_id || "").toLowerCase().includes(normalized)
      );
    });
  }, [tasks, searchQuery]);

  const getStatusBadge = (status: TicketStatus) => {
    const map: Record<TicketStatus, string> = {
      open: styles.badgeOpen,
      in_progress: styles.badgeInProgress,
      waiting_for_customer: styles.badgeWaiting,
      resolved: styles.badgeResolved,
      closed: styles.badgeClosed,
    };

    const labels: Record<TicketStatus, string> = {
      open: "פתוח",
      in_progress: "בטיפול",
      waiting_for_customer: "ממתין ללקוח",
      resolved: "נפתר",
      closed: "סגור",
    };

    return <span className={`${styles.badge} ${map[status]}`}>{labels[status]}</span>;
  };

  const getTaskStatusBadge = (status: TaskStatus) => {
    const map: Record<TaskStatus, string> = {
      open: styles.badgeOpen,
      in_progress: styles.badgeInProgress,
      completed: styles.badgeResolved,
      cancelled: styles.badgeClosed,
    };

    const labels: Record<TaskStatus, string> = {
      open: "פתוח",
      in_progress: "בתהליך",
      completed: "הושלם",
      cancelled: "בוטל",
    };

    return <span className={`${styles.badge} ${map[status]}`}>{labels[status]}</span>;
  };

  const getPriorityBadge = (priority: TicketPriority) => {
    const map: Record<TicketPriority, string> = {
      low: styles.priLow,
      medium: styles.priMed,
      high: styles.priHigh,
      urgent: styles.priUrg,
    };
    const labels: Record<TicketPriority, string> = {
      low: "נמוכה",
      medium: "רגילה",
      high: "גבוהה",
      urgent: "דחופה",
    };
    return <span className={`${styles.badge} ${map[priority]}`}>{labels[priority]}</span>;
  };

  const resetFilters = () => {
    setStatusFilter("all");
    setAssignedFilter("all");
    setTaskSourceFilter("all");
  };

  const applyQuickMine = () => setAssignedFilter("me");
  const applyQuickOpen = () => setStatusFilter("open");
  const applyQuickBranch = () => {
    // For tasks, treat "branch" as support-origin tasks.
    if (viewMode === "tasks") {
      setTaskSourceFilter("support_ticket");
    } else {
      setAssignedFilter("me");
    }
  };

  return (
    <div className={styles.supportContainer}>
      <div className={styles.headerArea}>
        <div className={styles.titleWrapper}>
          <LifeBuoy className="h-8 w-8 text-brand" style={{ color: "#3B82F6" }} />
          <div>
            <h1 className={styles.title}>מרכז תמיכה</h1>
            <p className={styles.subtitle}>ניהול פניות שירות ותקלות</p>
          </div>
        </div>

        {viewMode === "tickets" && (
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <button className={styles.btnPrimary}>
                <Plus className="h-4 w-4" />
                קריאה חדשה
              </button>
            </DialogTrigger>
            <DialogContent style={{ backgroundColor: "#0F172A", color: "#F8FAFC", border: "1px solid rgba(255,255,255,0.1)" }}>
              <DialogHeader>
                <DialogTitle style={{ color: "#fff" }}>פתיחת קריאת שירות</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onCreateTicket)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="subject"
                    render={({ field }) => (
                      <FormItem className={styles.formGroup}>
                        <FormLabel className={styles.formLabel}>נושא</FormLabel>
                        <FormControl>
                          <input className={styles.formInput} placeholder="תיאור קצר של הבעיה" {...field} />
                        </FormControl>
                        <FormMessage style={{ color: "#F87171" }} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem className={styles.formGroup}>
                        <FormLabel className={styles.formLabel}>דחיפות</FormLabel>
                        <select className={styles.formInput} value={field.value} onChange={field.onChange}>
                          <option value="low">נמוכה</option>
                          <option value="medium">רגילה</option>
                          <option value="high">גבוהה</option>
                          <option value="urgent">דחופה</option>
                        </select>
                        <FormMessage style={{ color: "#F87171" }} />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem className={styles.formGroup}>
                        <FormLabel className={styles.formLabel}>פירוט</FormLabel>
                        <FormControl>
                          <textarea className={styles.formTextarea} placeholder="תאר את הבעיה בהרחבה" {...field} />
                        </FormControl>
                        <FormMessage style={{ color: "#F87171" }} />
                      </FormItem>
                    )}
                  />
                  <button type="submit" className={styles.btnPrimary} style={{ width: "100%", marginTop: "1rem" }}>
                    צור קריאה
                  </button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      <div className={styles.panelCard}>
        <div className={styles.panelHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
            <button
              type="button"
              data-testid="tickets-tab"
              className={viewMode === "tickets" ? styles.btnTabActive : styles.btnTab}
              onClick={() => {
                setViewMode("tickets");
                resetFilters();
              }}
            >
              קריאות שירות
            </button>
            <button
              type="button"
              data-testid="tasks-tab"
              className={viewMode === "tasks" ? styles.btnTabActive : styles.btnTab}
              onClick={() => {
                setViewMode("tasks");
                resetFilters();
              }}
            >
              <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
                <ListChecks size={14} />
                טכניות / משימות
              </span>
            </button>
          </div>

          <div className={styles.filtersRow}>
            <div className={styles.searchInputContainer}>
              <Search className={styles.searchIcon} size={18} />
              <input
                placeholder={viewMode === "tickets" ? "חיפוש לפי נושא/לקוח/מספר" : "חיפוש לפי מזהה/כותרת/מקור"}
                className={styles.searchInput}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <select
              data-testid="status-filter"
              className={styles.selectInput}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              {viewMode === "tickets" ? (
                <>
                  <option value="all">כל הסטטוסים</option>
                  <option value="open">פתוח</option>
                  <option value="in_progress">בטיפול</option>
                  <option value="waiting_for_customer">ממתין ללקוח</option>
                  <option value="resolved">נפתר</option>
                  <option value="closed">סגור</option>
                </>
              ) : (
                <>
                  <option value="all">כל הסטטוסים</option>
                  <option value="open">פתוח</option>
                  <option value="in_progress">בתהליך</option>
                  <option value="completed">הושלם</option>
                  <option value="cancelled">בוטל</option>
                </>
              )}
            </select>

            <select
              data-testid="assigned-filter"
              className={styles.selectInput}
              value={assignedFilter}
              onChange={(e) => setAssignedFilter(e.target.value)}
            >
              <option value="all">כל ההקצאות</option>
              <option value="me">הוקצו לי</option>
            </select>

            {viewMode === "tasks" && (
              <select
                data-testid="source-filter"
                className={styles.selectInput}
                value={taskSourceFilter}
                onChange={(e) => setTaskSourceFilter(e.target.value as TaskSource)}
              >
                <option value="all">כל המקורות</option>
                <option value="support_ticket">support_ticket</option>
                <option value="requirements">requirements</option>
                <option value="manual">manual</option>
              </select>
            )}
          </div>
        </div>

        <div className={styles.panelContent} style={{ paddingTop: "0.75rem", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className={styles.filtersRow}>
            <span className={styles.panelTitle} style={{ fontSize: "0.9rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
              <Filter size={14} />
              סינונים מהירים
            </span>
            <button type="button" className={styles.btnOutline} onClick={resetFilters} data-testid="quick-all">
              הכל
            </button>
            <button type="button" className={styles.btnOutline} onClick={applyQuickMine} data-testid="quick-mine">
              הוקצו לי
            </button>
            <button type="button" className={styles.btnOutline} onClick={applyQuickOpen} data-testid="quick-open">
              פתוחות
            </button>
            <button type="button" className={styles.btnOutline} onClick={applyQuickBranch} data-testid="quick-branch">
              רק לענף שלי
            </button>
          </div>
        </div>

        <div className={styles.panelContent} style={{ padding: 0, overflowX: "auto" }}>
          {viewMode === "tickets" ? (
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>מס' קריאה</th>
                  <th style={{ textAlign: "center" }}>נושא</th>
                  <th style={{ textAlign: "center" }}>לקוח</th>
                  <th style={{ textAlign: "center" }}>מוטב</th>
                  <th style={{ textAlign: "center" }}>סטטוס</th>
                  <th style={{ textAlign: "center" }}>דחיפות</th>
                  <th style={{ textAlign: "center" }}>תאריך פתיחה</th>
                  <th style={{ textAlign: "center" }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ height: "6rem", textAlign: "center" }}>
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
                    </td>
                  </tr>
                ) : filteredTickets.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ height: "6rem", textAlign: "center", color: "#94A3B8" }}>
                      לא נמצאו קריאות שירות
                    </td>
                  </tr>
                ) : (
                  filteredTickets.map((ticket) => (
                    <tr key={ticket.id}>
                      <td className={styles.cellId}>#{ticket.id}</td>
                      <td style={{ fontWeight: 500, textAlign: "center" }}>{ticket.subject}</td>
                      <td style={{ textAlign: "center" }}>{ticket.user_name}</td>
                      <td style={{ textAlign: "center" }}>{ticket.assigned_to_name ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{getStatusBadge(ticket.status)}</td>
                      <td style={{ textAlign: "center" }}>{getPriorityBadge(ticket.priority)}</td>
                      <td dir="ltr" style={{ textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>{ticket.created_at}</td>
                      <td style={{ textAlign: "center" }}>
                        <Link href={`/admin/support/${ticket.id}`} style={{ textDecoration: "none" }}>
                          <button className={styles.btnGhost}>צפה בפרטים</button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          ) : (
            <table className={styles.customTable}>
              <thead>
                <tr>
                  <th>מס' משימה</th>
                  <th style={{ textAlign: "center" }}>כותרת</th>
                  <th style={{ textAlign: "center" }}>מקור</th>
                  <th style={{ textAlign: "center" }}>מוטב</th>
                  <th style={{ textAlign: "center" }}>סטטוס</th>
                  <th style={{ textAlign: "center" }}>דחיפות</th>
                  <th style={{ textAlign: "center" }}>תאריך יצירה</th>
                  <th style={{ textAlign: "center" }}>פעולות</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} style={{ height: "6rem", textAlign: "center" }}>
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-slate-500" />
                    </td>
                  </tr>
                ) : filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ height: "6rem", textAlign: "center", color: "#94A3B8" }}>
                      לא נמצאו משימות
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => (
                    <tr key={task.id}>
                      <td className={styles.cellId}>#{task.id}</td>
                      <td style={{ fontWeight: 500, textAlign: "center" }}>{task.title}</td>
                      <td style={{ textAlign: "center" }}>{task.source || "manual"}</td>
                      <td style={{ textAlign: "center" }}>{task.assigned_to_name ?? "-"}</td>
                      <td style={{ textAlign: "center" }}>{getTaskStatusBadge(task.status)}</td>
                      <td style={{ textAlign: "center" }}>{getPriorityBadge(task.priority)}</td>
                      <td dir="ltr" style={{ textAlign: "center", color: "#94A3B8", fontSize: "0.875rem" }}>
                        {task.created_at ? new Date(task.created_at).toLocaleString() : "-"}
                      </td>
                      <td style={{ textAlign: "center" }}>
                        <Link href={`/admin/tasks/${task.id}`} style={{ textDecoration: "none" }}>
                          <button className={styles.btnGhost}>פתח משימה</button>
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
