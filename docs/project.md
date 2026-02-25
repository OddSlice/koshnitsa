# Koshnitsa

Koshnitsa is a collaborative shopping list app for Sofia, Bulgaria. It helps people coordinate grocery shopping, track deals, and scan receipts — with a UI in English and product names in Bulgarian.

**GitHub**: https://github.com/OddSlice/koshnitsa

## Phase 1 — COMPLETE

### Step 1 — Project Setup + Auth

- **Next.js app** with TypeScript, Tailwind CSS, and App Router (`/src` directory structure)
- **Supabase authentication** — email/password sign up and sign in
- **Route protection** — middleware redirects unauthenticated users to `/login`
- **Mobile-first shell** — bottom navigation bar with 4 tabs: Lists, Scan, Deals, History
- **Placeholder pages** for Scan and Deals tabs
- **Profiles table** — linked to `auth.users` with auto-trigger on sign up (see `output/profiles-table.sql`)
- **Auth callback and sign-out** routes

### Step 2 — Shopping Lists + Join Code + Real-Time Sync

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

### Step 3 — Usual Items + List History

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
- **History tab** (`/history`) — fully built out:
  - Chronological list of completed shopping trips
  - Each card shows: list name, store name (if provided), completion date, progress bar of checked items
  - Relative date formatting (Today, Yesterday, X days ago)
- **Trip detail screen** (`/history/[id]`):
  - Full item snapshot showing all items grouped by category
  - Unchecked items shown normally, checked items muted with strikethrough
  - Summary bar with check progress
  - **"Reuse this list"** button — creates a brand new list from the snapshot
- **SQL output** in `output/usual-items-history.sql`

### Step 4 — Deploy to GitHub + Vercel

- **GitHub repo**: https://github.com/OddSlice/koshnitsa
- **Vercel deployment**: connected via GitHub import
- Environment variables configured in Vercel dashboard
- Supabase redirect URLs configured for the live domain

## Phase 2 — COMPLETE

### Step 1 — Photo Scan + OpenAI Item Identification

- **Scan tab** (`/scan`) — fully replaced the placeholder with a working photo-to-item flow
- **Camera capture** — HTML file input with `capture="environment"` for rear camera on mobile
- **Gallery upload** — separate button to pick an existing photo from the device
- **API route** (`/api/identify-item`) — server-side OpenAI call (keeps API key off the client)
  - Validates auth (Supabase session check)
  - Sends base64 image to GPT-4o with vision (`detail: "low"` for speed)
  - Structured prompt returns: name (Bulgarian), quantity, category (from existing list), confidence (0–1)
  - Handles JSON parsing, category validation, confidence clamping
- **Image resizing** — client-side canvas resize to max 1024px before upload (saves bandwidth)
- **Loading state** — spinner overlay on the captured photo while AI processes
- **Confirmation card** — editable fields for name, quantity, category dropdown, optional note
  - Confidence bar (green ≥80%, amber ≥50%, red <50%)
  - Low-confidence warning banner when confidence < 60%
- **Add to list** — single-list auto-add or list picker modal if user belongs to multiple lists
- **Success state** — green checkmark confirmation, auto-resets after 2 seconds
- **Error state** — descriptive error message with "Try again" and "Cancel" buttons
- **Environment variable**: `OPENAI_API_KEY` (server-only, never sent to client)
- **New dependency**: `openai` npm package

### Step 2 — Nutritional Information

- **API route** (`/api/nutrition`) — second OpenAI call for food items only
  - Accepts product name + quantity, returns: calories, protein, carbs, fat (per 100g), one-line Bulgarian description
  - All responses flagged as `estimated: true` — AI estimates, not verified label data
  - Auth check, JSON parsing, number sanitization
- **Food category detection** — only fetches nutrition for food categories (Плодове и зеленчуци, Месо и риба, Мляко и яйца, Хляб и тестени, Замразени); skips Почистване, Лични грижи, Друго
- **Expandable nutrition section** on scan confirmation card:
  - Collapsed by default, tap to expand
  - 2×2 grid: Calories (kcal), Protein (g), Carbs (g), Fat (g)
  - One-line Bulgarian product description
  - "~ estimated per 100g" label
  - Loads in background (non-blocking) — spinner shown while fetching
- **Nutrition data stored on list items** — calories, protein, carbs, fat, nutrition_description, nutrition_estimated columns
- **Nutrition info on list detail screen**:
  - Small info icon (ℹ) next to items that have nutrition data
  - Tapping opens a bottom sheet with the same nutrition grid + description
  - Subtle — doesn't clutter the list view
- **New component**: `NutritionSheet.tsx` — reusable bottom sheet for nutrition display
- **Database migration**: `output/nutrition-columns.sql` — adds 6 nullable columns to `list_items`
- **SQL output** in `output/nutrition-columns.sql`

## Phase 3 — COMPLETE

### Step 1 — Sofia Supermarkets Deal Matching

- **Sofia Supermarkets API** integration via public proxy (`https://sofia-supermarkets-api-proxy.stefan-bratanov.workers.dev`)
  - No API key required
  - `GET /products?offers=true` returns all current promotional products across stores
  - Supported stores: Lidl, Kaufland, Billa, Fantastico, T-Market
- **Server-side helper** (`/src/lib/supermarkets.ts`):
  - Fetches and flattens promo products with store name + calculated discount percentage
  - In-memory cache with 6-hour TTL + Next.js `revalidate` for double caching
  - Fuzzy matching via Dice-Sørensen bigram similarity coefficient
  - Contains-match boost for substring matches (e.g. "домати" in "Чери домати 500г")
  - Configurable similarity threshold (default 0.35)
- **API route** (`/api/deals`) — accepts list of item names, returns matched deals
  - Auth check via Supabase session
  - Fetches unchecked items from the selected list on the client side
  - Returns `deal`, `estimated`, or `no_deal` status per item with full promo details
  - Returns cached estimates if fresh (< 24 hours old)
- **Deals tab** (`/deals`) — fully built out:
  - List selector dropdown at top (defaults to most recently created list)
  - "Find Deals" button — nothing runs automatically, user-initiated only
  - Loading state with spinner
  - Results grouped: deals found (green) → price estimates (yellow) → no data (grey)
  - Summary bar showing deal / estimated / no-data counts
  - Deal cards show: store badge (color-coded per chain), promo product name, prices with discount percentage, expiry countdown

### Step 2 — AI Price Estimation for Unmatched Items

- **API route** (`/api/estimate-price`) — batched OpenAI call for all unmatched items
  - All unmatched items sent in a single GPT-4o prompt (fast + cheap)
  - Returns per item: estimated_price_min, estimated_price_max (€), most_likely_store, confidence (high/medium/low)
  - Prices based on typical Bulgarian supermarket pricing
  - Auth check, JSON parsing, number sanitization, store validation
- **Automatic estimation** — after deals are matched, unmatched items are automatically sent for price estimation (non-blocking)
  - "Estimating prices..." spinner shown during the process
  - Results merge into the deals view seamlessly
- **Estimate cards** on the Deals screen:
  - Yellow "~ Estimated" badge with price range (e.g. "~ 2.50 – 3.20 €")
  - Store badge if most_likely_store is available (color-coded)
  - "AI estimate — not a confirmed price" disclaimer
  - Warning icon for low-confidence estimates
- **Estimates saved to database** — stored on `list_items` table to avoid re-fetching
  - Columns: estimated_price_min, estimated_price_max, estimated_store, price_confidence, price_estimated_at
  - Only re-fetched if existing estimate is older than 24 hours
- **Database migration**: `output/price-estimate-columns.sql` — adds 5 nullable columns to `list_items`
- **SQL output** in `output/price-estimate-columns.sql`

## What's next

- Best store calculation — recommend which store to shop at based on combined deals + estimates
- List deletion and leave-list functionality
- Optimistic UI updates for faster-feeling interactions
- Connect profiles table to show who added/checked items

## Known issues / things to revisit

- Next.js 16 shows a deprecation warning about "middleware" → "proxy" file convention. Cosmetic only, can be migrated later.
- Supabase email confirmation is enabled by default — disable for easier dev (Authentication → Providers → Email → toggle off "Confirm email")
- The sign-out button uses a form POST to `/auth/signout` — could be a client component for better UX later
- The `lists` table has two overlapping SELECT policies (one for members, one permissive for join-code lookup). Fine for now.
- When reusing a list from history, only the creator is added as a member — other original members would need to rejoin via the new join code.
- Nutrition columns must be added to the database manually — run `output/nutrition-columns.sql` on Supabase.
- Price estimate columns must be added to the database manually — run `output/price-estimate-columns.sql` on Supabase.
