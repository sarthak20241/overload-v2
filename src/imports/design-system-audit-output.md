# Overload - Design System Audit Report

> Reverse-engineered from codebase analysis. Documents only what currently exists.
> Generated: March 1, 2026

---

## 1. Brand & Style Characterization

| Property | Value |
|---|---|
| **UI density** | Compact to medium - mobile-first with tight spacing (px-5 page padding, py-3 items) |
| **Corner radius style** | Mixed - pills for nav/badges (`rounded-full`), large rounds for cards/sheets (`rounded-2xl` / `rounded-3xl` / `rounded-t-[24px]`), medium for buttons/inputs (`rounded-xl` / `rounded-lg`) |
| **Shadow usage** | Dark mode: none (flat). Light mode: layered (`0 1px 3px` cards, `0 4px 12px` elevated). CTA play button always has neon glow shadow. |
| **Color usage style** | Dark: flat surfaces with subtle alpha borders. Light: tinted warm surfaces with soft shadows. Neon accent (`#c8ff00`) used for CTAs, highlights, and active states in both modes. |
| **Overall tone** | Premium consumer / fitness-tech. Dark-first aesthetic with neon accent. Minimal, dense, mobile-native. |

---

## 2. Color Tokens

### Primary Scale

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--primary` | `#c8ff00` | `#c8ff00` | CTA buttons, active tab bg, switch checked, progress bar, tooltip bg |
| `--primary-foreground` | `#0a0a0a` | `#0a0a0a` | Text on primary surfaces |
| `--t-neon` | `#c8ff00` | `#4d7a00` | Accent icons, labels, active nav text, chart lines, badges |
| `--t-accent-text` | `#c8ff00` | `#4d7a00` | Inline accent text, "Analyze" links, today highlight |
| `--t-cta-bg` | `#c8ff00` | `#c8ff00` | All CTA buttons (Finish, Log Set, Start, Save) |
| `--t-cta-fg` | `#0a0a0a` | `#0a0a0a` | Text on CTA buttons |
| `--t-primary-muted` | `rgba(200,255,0,0.1)` | `rgba(77,122,0,0.08)` | Icon container backgrounds |
| `--t-primary-subtle` | `rgba(200,255,0,0.05)` | `rgba(77,122,0,0.04)` | Faint highlighted rows/areas |
| `--t-primary-border` | `rgba(200,255,0,0.2)` | `rgba(77,122,0,0.2)` | Borders on primary-tinted elements |
| `--t-primary-glow` | `rgba(200,255,0,0.3)` | `rgba(77,122,0,0.15)` | Box-shadow glow on workout day circles |

### Neutral Scale

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--background` | `#0a0a0a` | `#f7f6f1` | Page background, body bg |
| `--foreground` | `#ffffff` | `#1a1a1a` | Primary text |
| `--card` | `#141414` | `#ffffff` | Card backgrounds, input container surfaces |
| `--card-foreground` | `#ffffff` | `#1a1a1a` | Text on cards |
| `--secondary` | `#1e1e1e` | `#f0efe9` | Secondary button bg, stepper buttons |
| `--secondary-foreground` | `#ffffff` | `#1a1a1a` | Text on secondary surfaces |
| `--muted` | `#1a1a1a` | `#efeee8` | Input backgrounds, tab list bg, timer bar bg, search field bg |
| `--muted-foreground` | `#777777` | `#6b6b6b` | Placeholder text, secondary descriptions |
| `--accent` | `#1e1e1e` | `#f0efe9` | Hover bg on ghost buttons |
| `--popover` | `#1a1a1a` | `#ffffff` | Popover/dropdown surfaces |
| `--t-elevated` | `#111111` | `#ffffff` | Bottom sheet surfaces |
| `--t-shimmer` | `#141414` | `#efeee8` | Skeleton loading shimmer |

### Text Hierarchy

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--foreground` | `#ffffff` | `#1a1a1a` | H1, H2, primary labels |
| `--t-text-secondary` | `#666666` | `#78716c` | Inactive tab text |
| `--t-text-muted` | `#555555` | `#9ca3af` | Subtitles, helper text, inactive nav labels |
| `--t-text-dim` | `#444444` | `#c4c4c4` | Unit labels ("kg", "reps"), elapsed/rest labels, separator text |
| `--t-text-faint` | `#333333` | `#e0e0e0` | Extremely subdued text |
| `--muted-foreground` | `#777777` | `#6b6b6b` | Input placeholder, card descriptions, stepper button text |

### Border & Surface

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--border` | `rgba(255,255,255,0.08)` | `rgba(0,0,0,0.08)` | Default border, nav bar top border, sheet top border |
| `--input` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.06)` | Input border color |
| `--t-border-subtle` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.05)` | List item dividers, card internal borders, set row borders |
| `--t-border-light` | `rgba(255,255,255,0.06)` | `rgba(0,0,0,0.06)` | Sheet header bottom border, horizontal dividers |
| `--t-surface-hover` | `#222222` | `#f5f4ef` | Hover state on list items |
| `--t-glow-1` | `rgba(255,255,255,0.03)` | `rgba(0,0,0,0.02)` | Faint background tint |
| `--t-glow-2` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.03)` | Skeleton loading placeholder |
| `--t-glow-3` | `rgba(255,255,255,0.07)` | `rgba(0,0,0,0.05)` | Close button bg on sheets |
| `--t-overlay` | `rgba(0,0,0,0.7)` | `rgba(0,0,0,0.4)` | Modal/sheet backdrop |
| `--t-handle` | `rgba(255,255,255,0.2)` | `rgba(0,0,0,0.15)` | Bottom sheet drag handle |
| `--t-badge-bg` | `rgba(255,255,255,0.05)` | `rgba(0,0,0,0.04)` | Badge/pill backgrounds |

### Semantic Colors

| Token | Value | Usage |
|---|---|---|
| `--destructive` | Dark: `#ff4444` / Light: `#ef4444` | Delete buttons, error states |
| `--destructive-foreground` | `#ffffff` | Text on destructive surfaces |
| Success (hardcoded) | `#10b981` / `text-emerald-400` | Positive diff badges, positive trends |
| Warning (hardcoded) | `#f59e0b` | Guest mode banner, PR trophy badge |
| Error (hardcoded) | `#ff4444` / `text-red-400` | Cancel button tint, negative diff badges, delete icons |
| Info (hardcoded) | `#06b6d4` | Chart-2 color |

### Chart Colors

| Token | Value | Usage |
|---|---|---|
| `--chart-1` | `#c8ff00` | Primary chart line/area |
| `--chart-2` | `#06b6d4` | Secondary chart data |
| `--chart-3` | `#a855f7` | Tertiary chart data |
| `--chart-4` | `#f59e0b` | Quaternary chart data |
| `--chart-5` | `#10b981` | Quinary chart data |
| `--t-chart-grid` | Dark: `rgba(255,255,255,0.04)` / Light: `rgba(0,0,0,0.06)` | CartesianGrid stroke |
| `--t-chart-tick` | Dark: `#555555` / Light: `#9ca3af` | Axis tick text |
| `--t-chart-tooltip-bg` | Dark: `#1e1e1e` / Light: `#ffffff` | Recharts tooltip background |
| `--t-chart-tooltip-border` | Dark: `rgba(255,255,255,0.10)` / Light: `rgba(0,0,0,0.08)` | Tooltip border |
| `--t-chart-tooltip-text` | Dark: `#888888` / Light: `#6b6b6b` | Tooltip label text |
| `--t-chart-insight-text` | Dark: `#cccccc` / Light: `#4a4a4a` | AI insight body text, exercise names in PR list |

### Completed Set Highlight

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--t-set-complete-bg` | `rgba(200,255,0,0.07)` | `rgba(200,255,0,0.12)` | Logged set row bg, finished exercise pill bg |
| `--t-set-complete-border` | `rgba(200,255,0,0.2)` | `rgba(200,255,0,0.25)` | Logged set row border, finished check icon container |

### Circle/Icon Container (Avatar, Play)

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--t-circle-bg` | `#c8ff00` | `#ffffff` | Profile avatar bg, icon circles |
| `--t-circle-fg` | `#0a0a0a` | `#4d7a00` | Avatar text, icon fill |
| `--t-circle-shadow` | `0 0 20px rgba(200,255,0,0.35)` | `0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(77,122,0,0.2)` | Avatar/circle glow |
| `--t-circle-border` | `none` | `1px solid rgba(77,122,0,0.2)` | Circle border (light only) |

### Routine Colors (Hardcoded Array)

```
["#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"]
```

Assigned by index (not stored per routine). Used for routine cards, history items, muscle split chart, and workout selector.

### Muscle Group Colors (Hardcoded Map)

```
Chest: #ef4444, Back: #3b82f6, Shoulders: #f59e0b, Quads: #10b981,
Hamstrings: #06b6d4, Biceps: #a855f7, Triceps: #ec4899, Calves: #84cc16,
Core: #f97316, Glutes: #14b8a6, Other: #6b7280
```

---

## 3. Typography System

### Font Family

| Property | Value |
|---|---|
| **Primary font** | `Inter` (Google Fonts, weights 300-900) |
| **Fallback stack** | `-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif` |
| **Base font size** | `16px` (`--font-size: 16px` on `<html>`) |

### Heading Hierarchy

| Level | CSS Size Variable | Font Weight | Line Height | Letter Spacing | Usage Examples |
|---|---|---|---|---|---|
| **H1** | `--text-2xl` (1.5rem / 24px) | 700 (bold) | 1.25 | -0.025em | Page titles ("Analytics", "History") |
| **H2** | `--text-xl` (1.25rem / 20px) | 600 (semibold) | 1.3 | -0.02em | Section headers, sheet titles |
| **H3** | `--text-lg` (1.125rem / 18px) | 600 (semibold) | 1.4 | normal | Card section titles |
| **H4** | `--text-base` (1rem / 16px) | 600 (semibold) | 1.5 | normal | CardTitle, subsection labels |

### Body & UI Text

| Element | Size | Weight | Line Height | Usage |
|---|---|---|---|---|
| **Body** | `--text-base` (16px) | 400 | 1.5 | Input text, textarea content |
| **Label** | `--text-sm` (14px) | 500 | 1.5 | Form labels |
| **Button** | `--text-sm` (14px) | 500 | 1.5 | Button default text |
| **Small** | `text-xs` (12px) | varies | default | Helper text, timestamps, descriptions |
| **Caption** | `text-[10px]` (10px) | 600 (semibold) | default | Uppercase tracking-widest labels ("WEIGHT (KG)", "PREVIOUS SESSION", nav labels) |
| **Micro** | `text-[9px]` (9px) | varies | default | XP counters, stat unit labels ("Sets", "Vol") |
| **Extra Small** | `text-[11px]` (11px) | varies | default | XP level pill, exercise nav pills |

### Inline Overrides (Frequently Used)

| Class Pattern | Size | Weight | Usage |
|---|---|---|---|
| `text-2xl font-black tracking-tight` | 24px / 900 | Dashboard name, exercise name in workout |
| `text-4xl font-black tracking-tighter` | 36px / 900 | Auth page logo "OVERLOAD" |
| `text-lg font-black` | 18px / 900 | Stat values, workout title bar |
| `text-sm font-semibold` | 14px / 600 | List item labels, exercise names in sheets |
| `text-sm font-bold` | 14px / 700 | AI section title, chart section title |
| `text-xs font-bold` | 12px / 700 | Week day numbers, set weight values |
| `text-[10px] font-semibold uppercase tracking-widest` | 10px / 600 | Section micro-headers, field labels |

### Max Text Width & Paragraph Spacing

| Property | Value |
|---|---|
| **Max text width** | Not explicitly set; content constrained by `max-w-sm` (auth) and `max-w-lg` (nav container) |
| **Paragraph spacing** | `mt-0.5` to `mt-1.5` between heading and subtitle; `space-y-2` to `space-y-5` between sections |

---

## 4. Spacing & Layout

### Spacing Scale

Base: **4px grid** (`gap-1` = 4px, `gap-2` = 8px, `gap-3` = 12px, etc.)

### Common Paddings

| Element | Padding |
|---|---|
| **Page horizontal** | `px-5` (20px) |
| **Page top** | `pt-12` (48px) - accounts for status bar on mobile |
| **Page bottom** | `pb-4` to `pb-8` (16-32px) |
| **Cards (custom)** | `p-4` (16px) |
| **Cards (Radix UI)** | `px-6 pt-6` header, `px-6` content, `px-6 pb-6` footer |
| **CTA Buttons** | `py-3.5 to py-4` vertical, `px-3.5 to px-5` horizontal |
| **Small Buttons** | `px-3 py-2` or `px-2.5 py-1` (pills) |
| **Inputs (custom)** | `px-4 py-3` (16px / 12px) |
| **Inputs (Radix UI)** | `px-3 py-1` with `h-9` (36px total) |
| **Bottom Sheets** | `px-5 py-3` header, `px-5 pb-8` content |
| **List Items** | `px-5 py-3.5` (20px / 14px) |
| **Sections** | `space-y-5` between major sections |
| **Section inner** | `space-y-2` to `space-y-3` between items |
| **Bottom nav bar** | Height: `60px` (`h-[60px]`), `px-2` inner |
| **Workout bottom bar** | `px-5 py-2.5 pb-7` |

### Container Widths

| Context | Value |
|---|---|
| **Auth form** | `max-w-sm` (384px) |
| **Nav inner** | `max-w-lg` (512px) |
| **Page content** | Full width (mobile-first, no max-width) |

### Grid Columns

| Context | Columns |
|---|---|
| **Week day row** | 7 items flexed with `justify-between` |
| **Finish workout stats** | `grid-cols-3` |
| **Custom exercise form** | `grid-cols-2 gap-3` |
| **Previous performance table** | `grid-cols-3` |

### Breakpoints

| Breakpoint | Usage |
|---|---|
| **Mobile-first** | All layouts designed for ~375-428px viewport |
| **No explicit desktop breakpoints** | App is mobile-only; no responsive layout switches |
| **md:** | Only used in Radix UI Input component (`md:text-sm`) |

---

## 5. Component Specifications

### Buttons

#### CTA Button (Primary Action)

| Property | Value |
|---|---|
| Height | `py-3.5` to `py-4` (~44-48px) |
| Padding | `px-5` or full-width `w-full` |
| Radius | `rounded-2xl` (16px) |
| Background | `var(--t-cta-bg)` = `#c8ff00` |
| Text | `text-sm font-black` (14px / 900) with `var(--t-cta-fg)` = `#0a0a0a` |
| Icon | Leading icon, `size={15}`, `strokeWidth={2.5}` |
| Layout | `flex items-center justify-center gap-2` |
| Interaction | `whileTap={{ scale: 0.96-0.97 }}` (Motion) |
| Disabled | `disabled:opacity-60` |

#### Header CTA (Compact)

| Property | Value |
|---|---|
| Height | `px-3.5 py-2` (~36px) |
| Radius | `rounded-xl` (12px) |
| Text | `text-xs font-bold` (12px / 700) |
| Icon | `size={12}`, inline with gap-1.5 |

#### Nav Play Button (Floating)

| Property | Value |
|---|---|
| Size | `w-[58px] h-[58px]` |
| Radius | `rounded-full` |
| Position | Centered in nav, `-top-5` offset |
| Shadow | `0 4px 16px rgba(200,255,0,0.3)` |
| Interaction | `whileTap={{ scale: 0.92 }}`, `whileHover={{ scale: 1.05 }}` |

#### Secondary/Ghost Button

| Property | Value |
|---|---|
| Background | `var(--secondary)` / `var(--muted)` |
| Text | `text-sm font-semibold` with `var(--muted-foreground)` |
| Radius | `rounded-2xl` |
| Padding | `py-3` full-width |

#### Destructive Button

| Property | Value |
|---|---|
| Background | `bg-red-500/20` |
| Text | `text-red-400 font-bold text-sm` |
| Radius | `rounded-2xl` |

#### Icon Button (Small)

| Property | Value |
|---|---|
| Size | `w-8 h-8` or `w-10 h-10` |
| Radius | `rounded-full` or `rounded-xl` |
| Background | `var(--muted)`, `var(--t-glow-3)`, or `rgba(239,68,68,0.15)` |
| Icon size | 13-15px |

#### Stepper Button (Weight/Reps)

| Property | Value |
|---|---|
| Size | `w-9 h-11` |
| Radius | `rounded-lg` (8px) |
| Background | `var(--secondary)` |
| Text | `text-base font-bold` |
| Interaction | `active:scale-90 transition-transform` |

#### Radix UI Button (from cva)

| Variant | Background | Text |
|---|---|---|
| **default** | `bg-primary` | `text-primary-foreground` |
| **destructive** | `bg-destructive` | `text-white` |
| **outline** | `bg-background` + border | `text-foreground` |
| **secondary** | `bg-secondary` | `text-secondary-foreground` |
| **ghost** | transparent | inherits |
| **link** | transparent | `text-primary` underline |

| Size | Height | Padding |
|---|---|---|
| **default** | `h-9` (36px) | `px-4 py-2` |
| **sm** | `h-8` (32px) | `px-3` |
| **lg** | `h-10` (40px) | `px-6` |
| **icon** | `size-9` (36px) | none |

### Inputs

#### Custom Inline Input (Workout Page)

| Property | Value |
|---|---|
| Height | `h-11` (44px) |
| Background | `var(--muted)` |
| Text | `text-lg font-black text-center` (18px / 900) |
| Radius | `rounded-lg` (8px) |
| Border | `border-0` |
| Focus | `focus:outline-none` |

#### Custom Form Input (Sheets, Profile)

| Property | Value |
|---|---|
| Padding | `px-4 py-3` |
| Radius | `rounded-xl` (12px) |
| Background | `var(--muted)` |
| Text | `text-sm` (14px) with `var(--muted-foreground)` |
| Focus | `focus:outline-none` |

#### Radix UI Input

| Property | Value |
|---|---|
| Height | `h-9` (36px) |
| Padding | `px-3 py-1` |
| Radius | `rounded-md` (6px) |
| Background | `bg-input-background` |
| Border | `border-input` |
| Focus | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| Error | `aria-invalid:border-destructive aria-invalid:ring-destructive/20` |

#### Search Input (in sheet)

| Property | Value |
|---|---|
| Container | `rounded-2xl px-4 py-3` with `var(--muted)` bg |
| Input | `bg-transparent text-sm outline-none flex-1` |
| Close button | `X` icon, 14px, `var(--t-text-muted)` |

### Dropdowns / Select

#### Custom Select (Inline)

| Property | Value |
|---|---|
| Padding | `px-4 py-3` |
| Radius | `rounded-xl` |
| Background | `var(--muted)` |
| Text | `text-sm` with `var(--muted-foreground)` |

#### Custom Dropdown (Analytics Exercise Picker)

| Property | Value |
|---|---|
| Trigger | `px-3 py-2 rounded-xl border w-full` with `var(--muted)` bg |
| Dropdown | `rounded-2xl border max-h-48 overflow-y-auto` |
| Background | `var(--secondary)` |
| Item padding | `px-4 py-2.5` |
| Active item | `font-semibold` with `var(--t-accent-text)` color |
| Animation | `initial={{ opacity: 0, y: -8 }}`, spring |
| Shadow | `var(--t-shadow-elevated)` |

### Cards

#### Custom Card (used everywhere)

| Property | Value |
|---|---|
| Radius | `rounded-2xl` (16px) |
| Border | `1px solid var(--t-border-subtle)` |
| Background | `var(--card)` |
| Padding | `p-4` (16px) |
| Shadow | `var(--t-shadow-card)` (none in dark, subtle in light) |
| Inner spacing | `space-y-2` to `space-y-3` |

#### Radix UI Card

| Property | Value |
|---|---|
| Radius | `rounded-xl` (12px) |
| Border | default `border` class |
| Background | `bg-card text-card-foreground` |
| Inner gap | `gap-6` (24px) between card sections |
| Header padding | `px-6 pt-6` |
| Content padding | `px-6`, last child `pb-6` |
| Footer padding | `px-6 pb-6` |

### Tables

#### Custom Table (Previous Performance)

| Property | Value |
|---|---|
| Container | `rounded-2xl overflow-hidden border` |
| Header | `grid-cols-3 px-4 py-2` with `var(--muted)` bg |
| Header text | `text-[9px] font-semibold uppercase tracking-wider` |
| Row | `grid-cols-3 px-4 py-3 border-t` with `var(--card)` bg |
| Cell text | `text-xs font-bold` for values, `text-xs font-medium` for labels |

#### Radix UI Table

| Property | Value |
|---|---|
| Head height | `h-10` |
| Head text | `text-foreground font-medium` |
| Cell padding | `p-2` |
| Row hover | `hover:bg-muted/50` |
| Row border | `border-b` |

### Bottom Sheets (Custom - not using Radix Sheet)

| Property | Value |
|---|---|
| Position | `fixed bottom-0 left-0 right-0 z-[70]` |
| Radius | `rounded-t-[24px]` |
| Max height | `max-h-[70vh]` or `max-h-[80vh]` |
| Background | `var(--t-elevated)` |
| Border | `border-t` with `var(--border)` |
| Handle | `w-10 h-1 rounded-full` centered, `var(--t-handle)` color |
| Backdrop | `fixed inset-0 z-[60]` with `var(--t-overlay)` |
| Animation | `initial={{ y: "100%" }} animate={{ y: 0 }}`, spring `damping: 30, stiffness: 320` |
| Layout | `flex flex-col` with scrollable content via `overflow-y-auto flex-1 scrollbar-hide` |

### Navigation Bar (Bottom)

| Property | Value |
|---|---|
| Position | `fixed bottom-0 left-0 right-0 z-50` |
| Height | `60px` |
| Background | `var(--t-nav-bg)` (frosted: `rgba(10,10,10,0.95)` dark / `rgba(255,255,255,0.92)` light) |
| Backdrop | `backdrop-blur-xl` |
| Border | `border-t` with `var(--border)` |
| Items | 4 NavLinks + 1 floating center play button |
| Nav item layout | `flex flex-col items-center gap-1` |
| Icon size | `size={20} strokeWidth={1.8}` |
| Label | `text-[10px] font-medium tracking-wide` |
| Active color | `var(--t-accent-text)` |
| Inactive color | `var(--t-text-muted)` |
| Content reserve | `pb-20` on main content area |

### Badges / Pills

#### Exercise Nav Pill (Active Workout)

| Property | Value |
|---|---|
| Padding | `px-3 py-1.5` |
| Radius | `rounded-full` |
| Text | `text-[11px] font-semibold` |
| Active | `var(--t-cta-bg)` bg, `var(--t-cta-fg)` text |
| Done | `var(--t-set-complete-bg)` bg, `var(--t-neon)` text, Check icon |
| Default | `var(--muted)` bg, `var(--t-text-muted)` text, `1px solid var(--t-border-subtle)` border |

#### XP Level Pill

| Property | Value |
|---|---|
| Padding | `px-2.5 py-1` |
| Radius | `rounded-full` |
| Border | `${titleColor}30` |
| Background | `${titleColor}12` |
| Text | `text-[11px] font-black` with `titleColor` |

#### PR Badge (Analytics)

| Property | Value |
|---|---|
| Padding | `px-2.5 py-1` |
| Radius | `rounded-full` |
| Background | `var(--t-primary-muted)` |
| Text | `text-[10px] font-bold` with `var(--t-accent-text)` |
| Icon | Trophy, 11px, `var(--t-neon)` |

#### Radix UI Badge

| Property | Value |
|---|---|
| Padding | `px-2 py-0.5` |
| Radius | `rounded-md` (6px) |
| Text | `text-xs font-medium` |
| Variants | default (primary), secondary, destructive, outline |

#### Diff Badge (Inline, Workout)

| Property | Value |
|---|---|
| Text | `text-[10px] font-semibold` |
| Positive | `text-emerald-400` |
| Negative | `text-red-400` |
| No container - inline text |

### Tags (Guest Banner)

| Property | Value |
|---|---|
| Padding | `p-3` |
| Radius | `rounded-2xl` |
| Background | `bg-[#f59e0b]/10` |
| Border | `border-[#f59e0b]/20` |
| Text | `text-xs text-[#f59e0b]` |
| Action button | `text-xs font-bold text-[#0a0a0a] bg-[#f59e0b] px-3 py-1.5 rounded-xl` |

### Skeleton Loader

| Property | Value |
|---|---|
| Radius | `rounded-md` (Radix), `rounded-2xl` (custom) |
| Background | `var(--t-glow-2)` (custom), `bg-accent` (Radix) |
| Animation | `animate-pulse` |
| Height | `h-4` for text lines, `h-16` for card skeletons |

---

## 6. Effects & Elevation

### Shadows

| Token | Dark Mode | Light Mode | Usage |
|---|---|---|---|
| `--t-shadow-card` | `none` | `0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)` | Card containers |
| `--t-shadow-elevated` | `none` | `0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)` | Dropdowns, auth form card |
| Play button shadow | `0 4px 16px rgba(200,255,0,0.3)` | same | Center nav play button |
| Circle shadow | `0 0 20px rgba(200,255,0,0.35)` | `0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(77,122,0,0.2)` | Profile avatar |
| Workout day glow | `0 0 10px var(--t-primary-glow)` | same | Calendar days with workouts |
| XP level glow | `0 0 10px ${titleColor}20` | same | XP level circle |

### Blur Usage

| Element | Value |
|---|---|
| Bottom nav | `backdrop-blur-xl` |
| Workout selector backdrop | `backdrop-blur-sm` |
| Auth bg glow | `blur-3xl` on decorative circle |

### Borders

| Pattern | Value | Usage |
|---|---|---|
| Default | `1px solid var(--border)` | Cards, nav, sheets |
| Subtle | `1px solid var(--t-border-subtle)` | Internal dividers, list items |
| Light | `1px solid var(--t-border-light)` | Sheet header bottom, section dividers |
| Primary | `1px solid var(--t-primary-border)` | Highlighted containers (blank workout, today) |
| Dashed | `1px dashed var(--border)` | Add exercise pill button |
| Set complete | `1px solid var(--t-set-complete-border)` | Logged set rows |

### Dividers

| Pattern | Value |
|---|---|
| Horizontal | `h-px` div with `var(--t-border-light)` bg, often in flex with text ("or from routine") |
| Vertical | `w-px self-stretch my-4` with `var(--t-border-subtle)`, used between weight/reps steppers |
| Border-based | `border-b` or `border-t` on list items with `var(--t-border-subtle)` |

### Layer Stacking (z-index)

| Layer | Z-Index | Element |
|---|---|---|
| Bottom nav | `z-50` | Fixed bottom navigation |
| Sheet backdrop | `z-[60]` | Overlay behind bottom sheets |
| Bottom sheet | `z-[70]` | Sheet content |
| Confirm dialogs | `z-[80]` | Cancel/Complete workout confirmations |

---

## 7. Interaction Behavior

### Hover

| Element | Change |
|---|---|
| Ghost button | `hover:bg-accent` |
| Nav item | `hover:text-[var(--muted-foreground)]` (inactive items) |
| Radix Button default | `hover:bg-primary/90` |
| Radix Button secondary | `hover:bg-secondary/80` |
| Table row | `hover:bg-muted/50` |

### Active / Pressed States

| Element | Behavior |
|---|---|
| CTA buttons | `whileTap={{ scale: 0.96-0.97 }}` (Motion) |
| Play button | `whileTap={{ scale: 0.92 }}` |
| Routine cards | `whileTap={{ scale: 0.98 }}` |
| Stepper buttons | `active:scale-90 transition-transform` (CSS) |

### Focus Rings

| Element | Style |
|---|---|
| Radix UI components | `focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]` |
| Custom inputs | `focus:outline-none` (no visible ring) |
| Ring color | `var(--ring)` = `#c8ff00` (dark) / `#5a7a00` (light) |

### Transitions & Animations

| Element | Duration / Config |
|---|---|
| Bottom sheet entry | Spring: `damping: 30, stiffness: 320` |
| Exercise slide | `duration: 0.2, ease: "easeOut"` with x-axis slide |
| Dropdown appear | `initial={{ opacity: 0, y: -8 }}`, default spring |
| Page elements | `initial={{ opacity: 0, y: -20 }}` to `animate={{ opacity: 1, y: 0 }}` |
| Confirm dialogs | `initial={{ y: 40, opacity: 0 }}` to `animate={{ y: 0, opacity: 1 }}` |
| AnimatePresence | `mode="wait"` for exercise carousel, default for overlays |
| Color transitions | `transition-colors duration-200` on nav items |
| General transitions | `transition-all` on most interactive elements |
| Pulse animation | `animate-pulse` on skeletons and loading states |
| Spin animation | `animate-spin` on Loader2 icons |

### Disabled States

| Element | Style |
|---|---|
| Radix UI buttons | `disabled:pointer-events-none disabled:opacity-50` |
| Custom CTA | `disabled:opacity-60` |
| Nav arrows | `disabled:opacity-20 transition-opacity` |
| General | `disabled:opacity-50` |

---

## 8. Design Tokens Output (Developer-Ready)

```json
{
  "colors": {
    "background": { "dark": "#0a0a0a", "light": "#f7f6f1" },
    "foreground": { "dark": "#ffffff", "light": "#1a1a1a" },
    "card": { "dark": "#141414", "light": "#ffffff" },
    "card-foreground": { "dark": "#ffffff", "light": "#1a1a1a" },
    "popover": { "dark": "#1a1a1a", "light": "#ffffff" },
    "primary": "#c8ff00",
    "primary-foreground": "#0a0a0a",
    "secondary": { "dark": "#1e1e1e", "light": "#f0efe9" },
    "secondary-foreground": { "dark": "#ffffff", "light": "#1a1a1a" },
    "muted": { "dark": "#1a1a1a", "light": "#efeee8" },
    "muted-foreground": { "dark": "#777777", "light": "#6b6b6b" },
    "accent": { "dark": "#1e1e1e", "light": "#f0efe9" },
    "destructive": { "dark": "#ff4444", "light": "#ef4444" },
    "border": { "dark": "rgba(255,255,255,0.08)", "light": "rgba(0,0,0,0.08)" },
    "input": { "dark": "rgba(255,255,255,0.07)", "light": "rgba(0,0,0,0.06)" },
    "input-background": { "dark": "#1a1a1a", "light": "#f0efe9" },
    "ring": { "dark": "#c8ff00", "light": "#5a7a00" },

    "neon": { "dark": "#c8ff00", "light": "#4d7a00" },
    "accent-text": { "dark": "#c8ff00", "light": "#4d7a00" },
    "cta-bg": "#c8ff00",
    "cta-fg": "#0a0a0a",

    "text-muted": { "dark": "#555555", "light": "#9ca3af" },
    "text-dim": { "dark": "#444444", "light": "#c4c4c4" },
    "text-faint": { "dark": "#333333", "light": "#e0e0e0" },
    "text-secondary": { "dark": "#666666", "light": "#78716c" },

    "border-subtle": { "dark": "rgba(255,255,255,0.05)", "light": "rgba(0,0,0,0.05)" },
    "border-light": { "dark": "rgba(255,255,255,0.06)", "light": "rgba(0,0,0,0.06)" },
    "surface-hover": { "dark": "#222222", "light": "#f5f4ef" },
    "overlay": { "dark": "rgba(0,0,0,0.7)", "light": "rgba(0,0,0,0.4)" },
    "elevated": { "dark": "#111111", "light": "#ffffff" },
    "nav-bg": { "dark": "rgba(10,10,10,0.95)", "light": "rgba(255,255,255,0.92)" },
    "handle": { "dark": "rgba(255,255,255,0.2)", "light": "rgba(0,0,0,0.15)" },

    "primary-muted": { "dark": "rgba(200,255,0,0.1)", "light": "rgba(77,122,0,0.08)" },
    "primary-subtle": { "dark": "rgba(200,255,0,0.05)", "light": "rgba(77,122,0,0.04)" },
    "primary-border": { "dark": "rgba(200,255,0,0.2)", "light": "rgba(77,122,0,0.2)" },
    "primary-glow": { "dark": "rgba(200,255,0,0.3)", "light": "rgba(77,122,0,0.15)" },

    "set-complete-bg": { "dark": "rgba(200,255,0,0.07)", "light": "rgba(200,255,0,0.12)" },
    "set-complete-border": { "dark": "rgba(200,255,0,0.2)", "light": "rgba(200,255,0,0.25)" },

    "circle-bg": { "dark": "#c8ff00", "light": "#ffffff" },
    "circle-fg": { "dark": "#0a0a0a", "light": "#4d7a00" },

    "chart-1": "#c8ff00",
    "chart-2": "#06b6d4",
    "chart-3": "#a855f7",
    "chart-4": "#f59e0b",
    "chart-5": "#10b981",
    "chart-grid": { "dark": "rgba(255,255,255,0.04)", "light": "rgba(0,0,0,0.06)" },
    "chart-tick": { "dark": "#555555", "light": "#9ca3af" },
    "chart-tooltip-bg": { "dark": "#1e1e1e", "light": "#ffffff" },
    "chart-tooltip-border": { "dark": "rgba(255,255,255,0.10)", "light": "rgba(0,0,0,0.08)" },
    "chart-tooltip-text": { "dark": "#888888", "light": "#6b6b6b" },
    "chart-insight-text": { "dark": "#cccccc", "light": "#4a4a4a" },

    "routine-colors": ["#84cc16", "#06b6d4", "#a855f7", "#f59e0b", "#10b981", "#f97316"],

    "semantic-success": "#10b981",
    "semantic-warning": "#f59e0b",
    "semantic-error": "#ff4444",
    "semantic-info": "#06b6d4"
  },

  "spacing": {
    "0": "0px",
    "0.5": "2px",
    "1": "4px",
    "1.5": "6px",
    "2": "8px",
    "2.5": "10px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "7": "28px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "page-x": "20px",
    "page-top": "48px",
    "nav-height": "60px",
    "nav-content-reserve": "80px"
  },

  "radius": {
    "sm": "calc(0.75rem - 4px)",
    "md": "calc(0.75rem - 2px)",
    "base": "0.375rem",
    "lg": "0.75rem",
    "xl": "calc(0.75rem + 4px)",
    "2xl": "1rem",
    "3xl": "1.5rem",
    "full": "9999px",
    "sheet-top": "24px",
    "card-custom": "16px",
    "card-radix": "12px",
    "input-custom": "12px",
    "input-radix": "6px",
    "button-cta": "16px",
    "button-stepper": "8px",
    "pill": "9999px"
  },

  "typography": {
    "font-family": "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    "font-weights": {
      "normal": 400,
      "medium": 500,
      "semibold": 600,
      "bold": 700,
      "extrabold": 800,
      "black": 900
    },
    "sizes": {
      "micro": "9px",
      "caption": "10px",
      "xs-plus": "11px",
      "xs": "12px",
      "sm": "14px",
      "base": "16px",
      "lg": "18px",
      "xl": "20px",
      "2xl": "24px",
      "4xl": "36px"
    },
    "headings": {
      "h1": { "size": "24px", "weight": 700, "lineHeight": 1.25, "letterSpacing": "-0.025em" },
      "h2": { "size": "20px", "weight": 600, "lineHeight": 1.3, "letterSpacing": "-0.02em" },
      "h3": { "size": "18px", "weight": 600, "lineHeight": 1.4, "letterSpacing": "normal" },
      "h4": { "size": "16px", "weight": 600, "lineHeight": 1.5, "letterSpacing": "normal" }
    },
    "body": { "size": "16px", "weight": 400, "lineHeight": 1.5 },
    "label": { "size": "14px", "weight": 500, "lineHeight": 1.5 },
    "button": { "size": "14px", "weight": 500, "lineHeight": 1.5 },
    "small": { "size": "12px", "weight": "varies" },
    "caption": { "size": "10px", "weight": 600, "textTransform": "uppercase", "letterSpacing": "0.1em" }
  },

  "shadows": {
    "none": "none",
    "card-light": "0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)",
    "elevated-light": "0 4px 12px rgba(0,0,0,0.08), 0 2px 4px rgba(0,0,0,0.04)",
    "neon-glow": "0 4px 16px rgba(200,255,0,0.3)",
    "neon-circle-dark": "0 0 20px rgba(200,255,0,0.35)",
    "neon-circle-light": "0 2px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(77,122,0,0.2)",
    "workout-day-glow": "0 0 10px var(--t-primary-glow)"
  },

  "z-index": {
    "nav": 50,
    "sheet-backdrop": 60,
    "sheet": 70,
    "confirm-dialog": 80
  },

  "animation": {
    "sheet-spring": { "type": "spring", "damping": 30, "stiffness": 320 },
    "slide-duration": "0.2s",
    "slide-ease": "easeOut",
    "tap-scale-cta": 0.96,
    "tap-scale-card": 0.98,
    "tap-scale-play": 0.92,
    "hover-scale-play": 1.05,
    "active-scale-stepper": 0.9
  }
}
```

---

## Appendix: Theme Switching Mechanism

- **Context**: `ThemeContext.tsx` provides `theme`, `isDark`, `toggleTheme`, `setTheme`
- **Storage**: `localStorage` key `overload_theme` (values: `"light"` | `"dark"`)
- **Application**: Adds `.light` or `.dark` class to `document.documentElement`
- **CSS Strategy**: `:root` defines dark mode defaults; `.light` class overrides all tokens
- **Tailwind v4**: Uses `@custom-variant dark (&:is(.dark *))` for dark variant support
- **Meta theme-color**: Updates dynamically (`#f7f6f1` light, `#0a0a0a` dark)
- **System preference**: Falls back to `prefers-color-scheme` if no saved preference
- **Default**: Dark mode

---

*End of audit. This report documents only what exists in the codebase. No suggestions or improvements have been made.*
