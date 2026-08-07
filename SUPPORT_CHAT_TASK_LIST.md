# Support Chat Center - Complete Task List

## Backend Requirements

### Database Models
- [x] SupportTicket model: add `ticket_number` column (VARCHAR(10), sequential per courier starting 001)
- [x] TicketMessage model: add `attachments` column (JSON array for image URLs)
- [x] SupportTicket model: ensure status field exists (open, in_progress, closed)
- [x] Migration script to add columns to existing SQLite/PostgreSQL database

### API Routes (`/api/support/*`)
- [x] POST `/api/support/tickets` - Create new support ticket
  - [x] Auto-generate sequential ticket_number per courier (001, 002...)
  - [x] Validate courier has < 2 open/in_progress tickets (backend + frontend)
  - [x] Return created ticket with ticket_number
  - [x] Emit `ticket_created` Socket.IO event
- [x] GET `/api/support/tickets` - List courier's tickets
  - [x] Return ticket_number, first_message preview, message_count, status
  - [x] Support filtering by status, priority, assigned_to
  - [x] Support search by subject, ticket_number, username
- [x] GET `/api/support/tickets/:id` - Get ticket details with messages
  - [x] Return all messages with attachments
  - [ ] Mark messages as read
- [x] POST `/api/support/tickets/:id/messages` - Add message to ticket
  - [x] Support text + image attachments
  - [x] Emit `ticket_message_added` Socket.IO event
  - [x] Auto-update ticket status based on sender
- [x] PUT `/api/support/tickets/:id` - Update ticket (status, etc.)
  - [x] Admin only: change status (open, in_progress, closed)
  - [x] Emit `ticket_updated` Socket.IO event
- [x] POST `/api/support/upload` - File upload endpoint
  - [x] Accept: png, jpg, jpeg, gif, webp, bmp
  - [x] Return uploaded file URL
  - [x] Store in static/uploads/support/

### Permissions (utils/decorators.py)
- [x] `support:create` - Courier can create tickets
- [x] `support:view` - Courier can view own tickets, Admin can view all
- [x] `support:comment` - Both can add messages
- [x] `support:edit` - Admin only: update ticket status

### Socket.IO Events
- [x] `ticket_created` - New ticket created
- [x] `ticket_message_added` - New message in ticket
- [x] `ticket_updated` - Ticket status/metadata changed
- [x] Real-time updates to both courier and admin

### Business Logic
- [x] Enforce max 2 concurrent open/in_progress tickets per courier
- [x] Sequential ticket_number per courier (not global)
- [ ] Auto-close/inactive ticket handling (if specified)

---

## Frontend Requirements

### Types (`frontend/types/support.ts`)
- [x] SupportTicket interface: ticket_number, first_message, message_count, status
- [x] TicketMessage interface: attachments (string[])
- [x] CreateTicketDTO, AddMessageDTO with proper fields

### API Client (`frontend/lib/api/support.ts`)
- [x] createTicket(data)
- [x] getTickets()
- [x] getTicket(id)
- [x] addMessage(ticketId, data)
- [x] updateTicket(id, data)
- [x] uploadFile(file)

### Courier Support Page (`frontend/app/courier/support/page.tsx`)
**WhatsApp/Telegram-style design:**
- [x] **Default view: Chat List** with inline creation bar at top
  - [x] Header: "צאט ותמיכה"
  - [x] New chat bar: [`+` button] [text input] [send] [image attach]
  - [x] List of existing chats with:
    - [x] ticket_number, first_message preview, status badge, timestamp, message count
    - [x] Click to open chat view
  - [x] Clicking `+` opens modal (behavior varies by active ticket count)
- [x] **Mobile courier send-failure handling fix** (`mobile-native/courier-android/.../SupportChatScreen.kt`, 2026-08-06):
  - [x] Send failure shows inline red banner ("נסה שוב"/"ביטול") above the input instead of replacing the whole chat with a centered error screen
  - [x] Typed message is preserved on failure and cleared only on success
  - [x] Load-error screen has a retry ("נסה שוב") button in addition to back ("חזרה")
  - [x] Typing after a failure dismisses the banner
- [x] **New Ticket creation** (modal or inline via input bar)
  - [x] Text input for message
  - [x] Image attachment (gallery + camera)
  - [x] Submit → creates ticket, navigates to chat view
  - [x] Limit: 0 active → full form, 1 active → warning + "פתיחת צאט בנושא אחר", 2+ active → blocked
- [x] **Chat View** (when clicking a chat)
  - [x] Header: back button, ticket_number, status badge
  - [x] Message list (own vs staff styling)
  - [x] Image attachments displayed inline
  - [x] Bottom message input with image attachment
  - [x] Auto-scroll to latest message
  - [x] Real-time updates via Socket.IO
  - [x] "Closed" notice when ticket resolved/closed

### Courier Layout (`components/courier/CourierLayout.tsx`)
- [x] Add "צאט ותמיכה" nav item in Settings tab
- [x] MessageSquare icon
- [x] Link to `/courier/support`

### Admin Support Pages

#### List Page (`frontend/app/admin/support/page.tsx`)
- [x] Table with columns:
  - [x] Ticket Number (ticket_number)
  - [x] Subject + First Message Preview
  - [x] Courier Name/ID
  - [x] Assigned To
  - [x] Status Badge
  - [x] Priority Badge
  - [x] Created Date
  - [x] MessageCircle icon button → links to detail page
- [x] Filter by status, assigned_to
- [x] Search by subject, ticket id, username
- [x] Quick filters: all, assigned to me, open
- [x] Create new ticket dialog (admin-side)
- [ ] Pagination
- [ ] Tab: Tasks (support-originated tasks)

#### Detail Page (`frontend/app/admin/support/[id]/page.tsx`)
- [x] Header: back button, ticket subject, ticket_number badge, courier info
- [x] Status selector (dropdown)
- [x] Priority selector (dropdown)
- [x] Assign to user (dropdown)
- [x] Message thread with:
  - [x] Sender identification (staff vs client, avatar)
  - [x] Timestamps
  - [x] Internal notes (not visible to courier)
  - [x] Image attachments rendered as gallery
- [x] Reply input with internal note checkbox
- [ ] Image upload in admin reply
- [x] Sidebar: customer details, linked order

### Offline Storage (localStorage)
- [x] Key: `tzir_offline_tickets` - cache ticket list
- [x] Key: `tzir_offline_messages_{ticketId}` - cache messages per ticket
- [x] Fallback when API fails (read from cache)

### Styling (`frontend/app/courier/support/support.module.css`)
- [x] WhatsApp/Telegram-like chat UI
- [x] Message bubbles (sent/received)
- [x] Image gallery in messages
- [x] Status badges with colors
- [x] Responsive design
- [x] RTL support (Hebrew)
- [x] Bottom sheet modal animation

---

## Validation & Error Handling

### Courier-Side Validation
- [x] Block new ticket if 2+ open/in_progress tickets
  - [x] Case 1: 1 open ticket → modal shows "יש לך כבר צאט פתוח" + "פתיחת צאט בנושא אחר" button
  - [x] Case 2: 2 open tickets → modal shows "לא ניתן לפתוח יותר משני פניות במקביל"
- [x] Backend also enforces same limit (double validation)

### Admin-Side
- [x] Status management (open/in_progress/closed/resolved/waiting_for_customer)
- [x] View all tickets regardless of courier
- [x] Assign tickets to support staff

---

## Testing (E2E)
- [x] Ticket creation with sequential numbering
- [x] Message persistence (courier → admin → courier)
- [x] Admin reply visible to both
- [x] Status update propagation
- [x] Follow-up messages
- [ ] Image attachment upload and display
- [ ] Offline storage persistence
- [x] Max 2 tickets enforcement
- [ ] Real-time Socket.IO updates (requires WebSocket client)

---

## Infrastructure
- [x] Backend server running on port 5000 (SQLite: delivery.db)
- [x] Database migration executed (ticket_number, attachments columns)
- [x] Auto-migration on startup (check/add missing columns in `app.py`)
- [ ] Frontend build (resolve pre-existing route conflicts)
- [ ] Production: PostgreSQL migration equivalent

---

## Summary of Current State
| Component | Status |
|-----------|--------|
| Backend Models | ✅ Done |
| Backend Routes | ✅ Done |
| Backend Max-2 Validation | ✅ Done (server + client) |
| Backend Migration | ✅ Done (SQLite) |
| Auto-migration on startup | ✅ Done |
| Courier Page (WhatsApp-style) | ✅ Done |
| Offline Storage | ✅ Done |
| Admin List Page | ✅ Done |
| Admin Detail Page | ✅ Done |
| Types | ✅ Done |
| API Client | ✅ Done |
| Courier Layout Nav | ✅ Done |
| E2E Tests (10 tests) | ✅ All Pass |
| Frontend Build | ❌ Blocked (pre-existing route conflicts) |
| Backend Server | ✅ Running on port 5000 |

## Remaining Work
1. **Frontend build fix** - Resolve duplicate route groups (`(marketing)/api` vs `/api`)
2. **Production PostgreSQL migration** - Run ALTER TABLE equivalents
3. **Image upload in admin reply** - Add to admin detail page
4. **Pagination on admin list** - Add page controls
5. **Mark messages as read** - Implement read tracking
6. **Real-time E2E testing** - Verify Socket.IO in automated tests
