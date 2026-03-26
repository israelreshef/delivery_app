✅ רשימת משימות (TODO) - מרכז תמיכה + משימות + הרשאות + דרישות
==================== LIVE STATUS ====================
Updated: 2026-03-26
Overall: in progress

[Done]
- 1.1, 1.2, 1.3, 1.4, 1.5
- 2.1, 2.2, 2.3, 2.4, 2.5
- 3.1, 3.2, 3.3
- 4.1, 4.2, 4.3 (group/permission models + permission layer integrated)
- 6.1, 6.2, 6.3 (requirements sync script + API endpoint + mapping)
- 7.1, 7.2, 7.3, 7.4, 7.5
- 8.1, 8.2, 8.3, 8.4
- 9.1, 9.2, 9.3, 9.4
- 5.1, 5.2, 5.3 (admin groups API + user-groups page + assignment flow)
- 10.1, 10.2, 10.3, 10.4 (realtime websocket + push notifications + audit trail + requirements import)

[In Progress]
- none

[Pending]
- none
=====================================================


V 1. בניית ממשק קריאות שירות + תמיכה טכנית
 V 1.1 טאב UI: "קריאות שירות" ו"טכניות / משימות" נפרדים ב-page.tsx
 V 1.2 קריאות: טבלה + סינון status + assigned_to + חיפוש (subject, user_name, id)
 V 1.3 משימות: טבלה נפרדת שמביאה את GET /api/tasks + סינון assigned_to=me + status
 V 1.4 הוספת כפתור שינוי viewMode (tickets/tasks) והחלפת תוכן טבלה
 V 1.5 הצגת assigned_to_name בקריאות + משימות
V 2. API קדמי/שרת קריאות
 V 2.1 GET /api/support/tickets:
   V - תמיכה בפילטר query assigned_to=me, status, priority
   V - role filter: ללקוח רק שלו, לשליח רק שלו/הוקצה לו, למנהלי תמיכה/אדמין הכל
 V 2.2 GET /api/support/tickets/<id>: הצגת שדות assigned_to, assigned_to_name
 V 2.3 POST /api/support/tickets: יצירת קריאה חדשה עם assigned_to אופציונלי
 V 2.4 PUT /api/support/tickets/<id>:
   V - עדכון status / priority / assigned_to
   V - חיבור למצב resolved / closed שעדכן CustomerTask סטטוס completed
 V 2.5 POST /api/support/tickets/<id>/messages:
   V - תעדוף תרחישי is_internal
   V - עדכון קריאה לin_progress / waiting_for_customer לפי שאלה
3. חיבור קריאות למשימות (CustomerTask)
 V 3.1 בכל POST קריאה שהוקצה (assigned_to):
   V - יצירת CustomerTask מקור support_ticket, source_id=ticket.id
   V - title/description לפי נושא + הודעה
   V - status=in_progress
   V - assigned_to = אותו משתמש
 V 3.2 בכל PUT הקצאה חדשה:
   V - יצירת CustomerTask חדש (אם assignment שונה)
   V - דיווח notification
   V - סטטוס קריאה in_progress
 V 3.3 סנכרון סטטוס:
   V - קריאה resolved/closed -> משימה מקושרת completed + completed_at
 3.4 רענון אוטומטי מסוג message מבחוץ (אם יש צורך)
V 4. מודל נתונים + permissions
 V 4.1 בתוך models.py:
   V - הוספת טבלה Group + Permission + UserGroup + GroupPermission
   V - או לפחות User.role עם enum admin, support, manager, courier, customer, sales, finance
 V 4.2 בדקורטור utils/decorators.py:
   V - @role_required([...])
   V - @permission_required('support:view'), @permission_required('tasks:edit')
 V 4.3 כל route support/task עובר בדיקת role/permission:
   V - admin = כל הרשאה
   V - support = support tickets וכלל
   V - courier = assigned בלבד
   V - customer = own only
   V - sub_admin (manager) = לפי הרשאות UI-selected
V 5. ניהול קבוצות משתמשים ב־UI (Admin)
 V 5.1 מסך admin/users:
   V - ליצור/לערוך משתמש
   V - לבחור תפקיד ועליו להקצות קבוצת הרשאות
 V 5.2 מסך admin/user-groups:
   V - יצירת Group רוחבי (sales, finance, dev, support)
   V - הגדרת Permissions לכל קבוצת group
 V 5.3 API:
   V - GET /api/admin/groups, POST /api/admin/groups, PUT /api/admin/groups
   V - GET /api/admin/users עם group + permissions
V 6. סנכרון דרישות קוד (requirements -> CustomerTask)
 V 6.1 script הפעלה אחת
   V - קובץ scripts/import_requirements_tasks.py או scripts:
   V - parse COURIER_APP_REQUIREMENTS.md (REQ-xxxx)
   V - POST /api/tasks עם source+source_id
 V 6.2 endpoint:
   V - POST /api/tasks/import-requirements
   V - מבנה גולש לשורות REQ עם title/description/priority/due_date/assigned_to
 V 6.3 map:
   V - [REQ] -> CustomerTask (source='requirements')
   V - סטטוס משימה מסונכרן מ-Ack מה-UX
V 7. API משימות נוספות
 V 7.1 GET /api/tasks:
   V - פילטרים: assigned_to, customer_id, status, source
   V - role-based visibility
 V 7.2 GET /api/tasks/<id>
 V 7.3 POST /api/tasks (יצירת משימה ידנית)
 V 7.4 PUT /api/tasks/<id> (עדכון + הוספת ציון source)
 V 7.5 DELETE /api/tasks/<id> על פי הרשאה
8. שיפורי UI נוספים
 V 8.1 הוספת Tabs: viewMode = 'tickets' | 'tasks'
 V 8.2 ב"tasks" להראות:
   V - source (support_ticket / requirements / manual)
   V - task status (open/in_progress/completed/cancelled)
   V - assigned_to_name, created_by, created_at
 V 8.3 אינטגרציה לפעולה: לחיצה על שורה tasks פותחת /admin/tasks/<id>
 V 8.4 טבלת שורות סינון "הוקצו לי", "פתוחות", "רק לענף שלי"
9. בדיקות & וולידציה
 V 9.1 unit tests backend:
   V - test_support_ticket_assignment_creates_customer_task
   V - test_support_ticket_resolved_closes_task
   V - test_support_get_tickets_assigned_to_me
   V - test_tasks_access_by_role
 V 9.2 frontend tests / integration:
   V - support/page פתיחת טאבים
   V - support/page סינון assigned
   V - support/page סינון source במשימות
 V 9.3 חזרה: python -m py_compile backend/routes/support.py
 V 9.4 חזרה: npm run lint (לבדוק parsing + React rule)
10. ניהול המשך (פיצולים)
 10.1 חיבור realtime (WebSocket) לרענון מקטעי קריאות + משימות
 10.2 קישור push notification למשתמשים שמקבלים מטלות חדשות
 10.3 דוח "audit trail" על שינויים ב-tickets/tasks (מי שינה, מה):
 10.4 טמפלייט COURIER_APP_REQUIREMENTS.md לייצוא/ייבוא משימות
