# Koshnitsa

Koshnitsa is a collaborative shopping list app for Sofia, Bulgaria. It helps people coordinate grocery shopping, track deals, and scan receipts — with a UI in English and product names in Bulgarian.

## What's been built

### Phase 1, Step 1 — Project Setup + Auth

- **Next.js app** with TypeScript, Tailwind CSS, and App Router (`/src` directory structure)
- **Supabase authentication** — email/password sign up and sign in
- **Route protection** — middleware redirects unauthenticated users to `/login`
- **Mobile-first shell** — bottom navigation bar with 4 tabs: Lists, Scan, Deals, History
- **Placeholder pages** for Scan and Deals tabs
- **Profiles table** — linked to `auth.users` with auto-trigger on sign up (see `output/profiles-table.sql`)
- **Auth callback and sign-out** routes

### Phase 1, Step 2 — Shopping Lists + Join Code + Real-Time Sync

- **Database tables**: `lists`, `list_members`, `list_items` — all with Row Level Security policies
- **Lists screen** (`/lists`) — shows all lists the user belongs to, with item and member counts
- **Create list** — modal to enter a name; auto-generates a 6-character join code, adds creator as a member
- **Join list** — modal to enter a 6-character code; looks up the list and adds the user as a member
- **List detail screen** (`/lists/[id]`) — items grouped by Bulgarian categories
  - Categories: Плодове и зеленчуци, Месо и риба, Мляко и яйца, Хляб и тестени, Замразени, Почистване, Лични грижи, Друго
  - Checking an item moves it to a "Done" section (visually muted, strikethrough)
  - **Real-time sync** via Supabase Realtime — INSERT, UPDATE, DELETE on `list_items` reflected live
- **Add item modal** — name (Bulgarian), quantity, note (optional), category dropdown
- **Invite modal** — shows join code with copy-to-clipboard
- **SQL output** in `output/lists-tables.sql`

### Phase 1, Step 3 — Usual Items + List History

- **Database tables**: `usual_items` (personal staple products), `list_snapshots` (completed trip records) — both with RLS for per-user isolation
- **`is_archived` column** added to `lists` table — archived lists are hidden from the active lists view
- **Usual Items** section on the Lists screen:
  - Displays saved staple items as tappable chips below active lists
  - Tapping a chip adds the item to the user's active list (or prompts which list if multiple exist)
  - "Edit" mode to delete unwanted usual items
  - "Add" button opens a modal to create new usual items (name, quantity, category)
- **Complete trip** flow on list detail screen:
  - "Complete trip" button appears when a list has items
  - Confirmation modal with optional store name (e.g. Лидл, Кауфланд, Билла)
  - Saves a JSONB snapshot of all items and their checked state to `list_snapshots`
  - Archives the list so it no longer appears in active lists
- **History tab** (`/history`) — fully built out (was a placeholder):
  - Chronological list of completed shopping trips
  - Each card shows: list name, store name (if provided), completion date, progress bar of checked items
  - Relative date formatting (Today, Yesterday, X days ago)
- **Trip detail screen** (`/history/[id]`):
  - Full item snapshot showing all items grouped by category
  - Unchecked items shown normally, checked items muted with strikethrough
  - Summary bar with check progress
  - **"Reuse this list"** button — creates a brand new list with the same name and all items (unchecked, fresh join code), redirects to it
- **Components**: `UsualItemChip`, `AddUsualItemModal`, `PickListModal`, `CompleteTripModal`, `HistoryClient`, `TripDetailClient`
- **SQL output** in `output/usual-items-history.sql`

## What's next

- **Phase 2**: Photo item scan + nutritional info
- List deletion and leave-list functionality
- Optimistic UI updates for faster-feeling interactions
- Connect profiles table to show who added/checked items

## Known issues / things to revisit

- Next.js 16 shows a deprecation warning about "middleware" → "proxy" file convention. Cosmetic only, can be migrated later.
- Supabase email confirmation is enabled by default — disable for easier dev (Authentication → Providers → Email → toggle off "Confirm email")
- The sign-out button uses a form POST to `/auth/signout` — could be a client component for better UX later
- The `lists` table has two overlapping SELECT policies (one for members, one permissive for join-code lookup). Fine for now.
- When reusing a list from history, only the creator is added as a member — other original members would need to rejoin via the new join code.
