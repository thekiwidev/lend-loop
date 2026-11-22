# LendLoop — Interface Design

The plan for how LendLoop will look and behave on screen. It ports the LendLoop design system into typed React components and keeps every page calm, minimal and usable on a phone.

## 1. Principles

- **A shared shed, not a marketplace.** Warm paper surfaces, pine green for action, brass for attention, clay for trouble. No prices, ratings or urgency tricks.
- **One job per screen.** Each page answers one question: what can I borrow, what have I listed, what have I asked for, what is waiting on me.
- **Status in words and colour.** Every loan and tool shows a badge with a label, never colour alone.
- **Plain English.** Errors say what happened and what to do ("The drill is already lent for 24–26 Nov."), not codes.
- **Every state designed.** Loading skeletons, empty states with a next step, error banners with a way out.

## 2. Tokens (`app/tokens.css`)

Generated from the design system's `tokens.json` and copied as-is.

| Group | Tokens |
| --- | --- |
| Surfaces | `--surface-0` page, `--surface-1` card, `--surface-2` inset; `--line`, `--line-strong` |
| Ink | `--ink`, `--ink-muted`, `--ink-subtle`, `--ink-inverse` |
| Accents | `--pine` (primary action), `--brass` (attention, trusted marks), `--sky-ink` (on loan), `--clay` (danger, overdue, failed), each with `-soft` and `on-` pairs |
| Space | 4, 8, 12, 16, 20, 24, 32, 40, 56 px |
| Radius | 4, 6, 10, 14, 20 px and pill |
| Shadow | `sm`, `md`, `pop` |
| Type | Bricolage Grotesque (display), Figtree (body), JetBrains Mono (dates and numbers), loaded with `next/font` in `app/layout.tsx` |

Light and dark palettes are defined under `[data-theme]`. `ThemeToggle` offers Light, Dark and System, stores the choice under `lendloop-theme`, and System follows `prefers-color-scheme`.

## 3. Layout

- **Public landing (`/`)**: logo and theme toggle, display headline with the tagline, one paragraph, the "Sign in to lend or borrow" button, then a grid of available tool cards.
- **Signed-in shell (`AppShell`)**: left `Sidebar` with the logo, navigation groups (Browse, Lending, Borrowing, and Admin for admins), counts on items with pending work (incoming requests in brass), and the account block (name, trust marks, manage account, theme, sign out). Each page has a `TopBar` with title, subtitle and one primary action.
- **Responsive**: between 768 and 1023 px the sidebar narrows to icons; at 767 px and below it becomes a drawer opened from the top bar (`useNavDrawer`), stat cards stack, and tables scroll horizontally inside their card.
- **Motion** is limited to short fades and menu transitions, and is turned off under `prefers-reduced-motion`.

## 4. Pages

| Route | Purpose | Main pieces |
| --- | --- | --- |
| `/` | Public preview | `ToolCard` grid (name, category, icon; no owner), `EmptyState`, error `Banner` |
| `/app` | All tools | `StatCard` row (your listings, on loan now, waiting on you, overdue), category `FilterChips`, `ToolCard` grid with availability and owner, Request / Request sent / Manage action, `LoadMore` |
| `/app/listings` | My listings | Tool cards with Edit and Remove, `ToolForm` dialog, remove confirmation `Dialog` |
| `/app/requests` | My requests | `RequestList` of `RequestCard`s filtered All / Pending / Active / Closed; Cancel on pending |
| `/app/incoming` | Incoming requests | Same list for the caller's tools; Approve, Decline, Mark returned; trusted-borrower badge |
| `/admin` | Overview | Street-wide `StatCard`s and links to each table |
| `/admin/loans` | All loans | `PagedTable` with both parties, dates, status and last automation |
| `/admin/listings` | All listings | `PagedTable` including removed rows; Remove with confirmation |
| `/admin/neighbours` | Neighbours | `PagedTable` with avatar, trust badges and an `ActionMenu` to toggle Trusted lender and Trusted borrower |
| `/admin/automations` | Failed automations | `PagedTable` of failures with kind, time and reason |
| `/sign-in`, `/sign-up` | Clerk | Clerk components styled with the tokens |

## 5. Components (`components/`)

One component per file, typed props, no page logic inside.

| Group | Components |
| --- | --- |
| Shell | `AppShell`, `Sidebar`, `TopBar`, `Logo`, `ThemeToggle`, `Avatar` |
| Actions and inputs | `Button` (primary, ghost, danger; sizes; loading), `TextField`, `Select`, `Field`, `FilterChips`, `IconPicker`, `DateRangePicker`, `ActionMenu` |
| Content | `ToolCard`, `RequestCard`, `RequestList`, `StatCard`, `Badge`, `StatusBadge`, `ActivityLine`, `Icon` |
| Feedback | `Banner`, `Dialog`, `EmptyState`, `Skeleton` |
| Data | `DataTable`, `PagedTable`, `Pagination`, `LoadMore` |
| Forms | `ToolForm` (create and edit), `RequestForm` (date range and confirm) |

### Notable interactions

- **Icon picker.** As the owner types a tool name, `IconPicker` suggests matching glyphs from the catalogue in `lib/toolIcons.ts` ("cordless drill" suggests the drill first) and falls back to the category icon.
- **Collect and return calendars.** `DateRangePicker` asks for a collection day, then a return day on a second calendar. Past dates and dates already booked (`loans.booked`) are greyed out. The return day defaults to a week after collection, cut short before the next booking, and can be at most 30 days out.
- **Activity line.** Under each request card, `ActivityLine` shows the latest automation in relative time: "Email sent 2 hours ago", "Reminder sent 2 days ago", or "Notification failed" in clay.
- **Trust marks.** A brass shield for Trusted lender beside owner names; a pine check for Trusted borrower on incoming requests.

## 6. Status vocabulary

| Status | Label | Tone |
| --- | --- | --- |
| available | Available | pine |
| on_loan | On loan until <date> | sky |
| pending | Waiting | brass |
| approved | Approved | pine |
| overdue | Overdue | clay |
| declined, cancelled | Declined, Cancelled | muted |
| returned | Returned | muted |
| removed | Removed | muted |

## 7. Accessibility

- Semantic landmarks (`main`, `nav`, headed sections), `aria-current` on the active nav item, `aria-label` on icon-only buttons.
- Dialogs move focus in on open and back on close, close on Escape or backdrop click, and use `alertdialog` for destructive confirmations.
- Visible focus rings from `--focus`; text and badge colours chosen for WCAG AA contrast in both themes.
- Screen-reader-only table headers (`ll-sr`) for action columns.

## 8. Email design (`convex/lib/emails.ts`)

Each email has a plain-text body and a light HTML twin built from the same parts: default font, the person, tool and dates in bold, dates written as "Tuesday, December 1st", links on words rather than raw URLs, a one-line sign-off. Every user-supplied value is HTML-escaped.
