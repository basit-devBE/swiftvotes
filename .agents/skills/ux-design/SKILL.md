---
name: ux-design
description: >
  Apply this skill whenever building, designing, or reviewing any UI — including web apps, dashboards,
  forms, landing pages, components, artifacts, or any interactive interface. Trigger on phrases like
  "make it look good", "design a UI", "build a dashboard", "create a form", "make it user-friendly",
  "improve the UX", "design a page", or any request that will produce something a user looks at or
  interacts with. Also trigger when the user mentions colors, layouts, typography, or flow — even
  casually. This skill defines color systems, spacing, typography, interaction patterns, and flow
  principles that should be applied by default on every visual output.
---

# UX Design Skill

This skill governs how every visual interface is built. Apply it fully — not selectively.

---

## Core Philosophy

> Design is not decoration. It is clarity, hierarchy, and trust.

Every interface must answer three questions instantly:
1. **Where am I?** — Context and orientation
2. **What can I do?** — Clear affordances
3. **What happens next?** — Predictable feedback

---

## Color System

### Palette Approach

Never use raw hex codes arbitrarily. Build from a consistent, intentional palette.

**Neutral Foundation (always present)**
```
Background:     #0F0F0F  (dark) | #FAFAFA  (light)
Surface:        #1A1A1A  (dark) | #FFFFFF  (light)
Border:         #2A2A2A  (dark) | #E5E5E5  (light)
Text Primary:   #F0F0F0  (dark) | #111111  (light)
Text Secondary: #888888  (dark) | #666666  (light)
Text Muted:     #555555  (dark) | #999999  (light)
```

**Accent Color — pick ONE per interface**
```
Electric Blue:  #3B82F6  → hover #2563EB
Violet:         #7C3AED  → hover #6D28D9
Emerald:        #10B981  → hover #059669
Amber:          #F59E0B  → hover #D97706
Rose:           #F43F5E  → hover #E11D48
```

**Semantic Colors — fixed meaning, never swap**
```
Success:  #22C55E
Warning:  #EAB308
Error:    #EF4444
Info:     #3B82F6
```

### Color Rules

- **60/30/10 rule**: 60% neutral, 30% surface/secondary, 10% accent
- Never use more than 2 accent colors in one interface
- Maintain a minimum contrast ratio of **4.5:1** for body text, **3:1** for large text
- Interactive elements must visually differ from static ones (color, weight, or cursor)
- Disabled states use 40% opacity — never remove them entirely
- Error states always use red. Do not use red for anything else.

### Dark vs Light

Default to **dark mode** for developer tools, dashboards, and technical UIs.
Default to **light mode** for consumer-facing, content-heavy, or document-style UIs.

---

## Typography

### Type Scale
```
xs:   11px / line-height 1.4
sm:   13px / line-height 1.5
base: 15px / line-height 1.6   ← body default
md:   17px / line-height 1.5
lg:   20px / line-height 1.4
xl:   24px / line-height 1.3
2xl:  30px / line-height 1.2
3xl:  38px / line-height 1.15
4xl:  48px / line-height 1.1
```

### Font Stack
```css
/* System UI — performant, no flash */
font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;

/* Monospace — code, data, IDs */
font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
```

### Rules
- Body copy: base size, regular weight (400)
- Labels and captions: sm, medium weight (500)
- Headings: scale down from page title to subsection (2xl → xl → lg)
- **Never use bold for everything** — it loses meaning; use it for 1–2 elements max per section
- Line length: 60–75 characters for body, never wider than 700px on full text blocks
- Letter spacing: slightly loosen uppercase labels (`letter-spacing: 0.05em`)

---

## Spacing System

Use a **4px base grid**. All spacing values are multiples of 4.

```
4px   xs    — icon internal padding, tight badges
8px   sm    — between related inline elements
12px  md    — between label and input
16px  lg    — standard component internal padding
24px  xl    — between components in a group
32px  2xl   — between sections
48px  3xl   — major section breaks
64px  4xl   — page-level vertical rhythm
```

### Rules
- Never use arbitrary pixel values like 7px, 11px, 23px
- Consistent padding within a component type (all cards same padding)
- More space = more important; whitespace is hierarchy
- Group related items with tight spacing, unrelated items with generous spacing

---

## Layout

### Grid
- Use a 12-column grid for complex layouts
- Max content width: **1200px**, centered
- Sidebar + content split: 240px sidebar / remaining content (never 50/50 for dashboards)
- Card grids: prefer 3-col desktop, 2-col tablet, 1-col mobile

### Responsive Breakpoints
```
Mobile:   < 640px
Tablet:   640px – 1024px
Desktop:  > 1024px
```

### Composition Rules
- Align to a grid — never place elements by feel
- Left-align body text; center only for short headings or empty states
- Related actions group together (primary + secondary buttons side by side)
- Destructive actions (delete, remove) must be visually separated from safe actions

---

## Component Patterns

### Buttons
```
Primary:    accent bg, white text, full opacity
Secondary:  transparent bg, border, accent text
Ghost:      no border, muted text, hover shows bg
Danger:     error red bg on confirm only
```
- Minimum tap target: **44x44px** (mobile), 36px height (desktop)
- Loading state: replace label with spinner, disable the button
- Icon buttons must have a tooltip or aria-label
- Never use ALL CAPS for button text — it reads as shouting

### Forms
- Label always above input, never inside (placeholder ≠ label)
- Show validation inline, below the field, on blur (not on submit only)
- Required fields: mark with `*`, explain it at top of form
- Tab order must follow visual reading order
- Inputs: 40–44px height, 1px border, 4px radius minimum
- Group related fields visually (name + surname on one row)

### Cards
- Consistent padding: 20–24px
- Subtle border or shadow — not both
- Hover state: lift shadow or subtle bg change
- Card click target should be the whole card if it navigates

### Tables
- Zebra stripe or hover highlight rows — never neither
- Numeric columns right-align
- Text columns left-align
- Sticky header on scrollable tables
- Empty state inside table: centered message, not just blank rows

### Navigation
- Active item must be clearly distinct (color + weight, not just underline)
- Max 5–7 top-level nav items
- Mobile: bottom nav bar for 3–5 items, hamburger for more
- Breadcrumbs for anything 3+ levels deep

### Modals
- Always include a close button (X top-right)
- Clicking backdrop closes (unless destructive confirmation)
- Max width: 560px for forms, 720px for content
- Never nest modals

### Empty States
- Always show an empty state — never a blank container
- Include: icon or illustration, short heading, optional CTA
- Keep copy friendly, not technical ("No results" not "Query returned 0 records")

---

## Interaction & Flow

### Feedback Loops — every action needs a response
```
Immediate (0–100ms):   Visual press state on click
Short (100–300ms):     Hover animations, micro-transitions
Medium (300ms–1s):     Loading spinners, skeleton screens
Long (1s+):            Progress bars, step indicators
```

- Never leave a user wondering if their click registered
- Optimistic UI: update the UI before the server confirms (with rollback on error)
- Destructive actions: always confirm. Non-destructive: never confirm.

### Transitions
```css
/* Standard transition — applies to most interactive elements */
transition: all 150ms ease;

/* Entrance animation */
animation: fadeIn 200ms ease forwards;

/* Never exceed 300ms for functional transitions */
/* Reserve 500ms+ for intentional dramatic moments only */
```

### Loading States
- Skeleton screens > spinners for content-heavy areas
- Inline spinners for buttons/small actions
- Never block the full page with a spinner for partial loads
- Show progress for anything that takes > 2 seconds

### Error Handling
- Field errors: inline, below the field, red, specific ("Email is invalid" not "Error")
- Page errors: centered, with a retry action
- Toast notifications: top-right, auto-dismiss after 4s (errors stay until dismissed)
- Never show raw error codes or stack traces to users

### Navigation Flow
- Preserve scroll position on back navigation
- Confirm before leaving a form with unsaved changes
- Deep link every state — URL should reflect what user sees
- Pagination: show current page, total, prev/next. Infinite scroll only if content is feed-style.

---

## Accessibility (Non-negotiable)

- All interactive elements reachable by keyboard (Tab, Enter, Escape, Arrow keys)
- Focus outline: never `outline: none` without a custom replacement
- Images: always `alt` text (empty string `alt=""` for decorative images)
- Color: never use color alone to convey meaning — add icon or label
- Font size: never below 12px, body never below 14px
- Headings: semantic hierarchy (h1 → h2 → h3), one h1 per page

---

## Micro-copy & Tone

- Labels: short, noun-first ("Email address", not "Please enter your email address")
- Buttons: verb-noun ("Save changes", "Delete account", not just "Submit")
- Errors: human, direct, actionable ("Email already in use. Try logging in instead.")
- Empty states: encouraging, not clinical
- Tooltips: complete sentences, no period needed for short fragments

---

## Quick Reference Checklist

Before delivering any UI:

- [ ] Color contrast passes 4.5:1 for body text
- [ ] Every interactive element has a hover + active state
- [ ] Every form field has a visible label
- [ ] Every action has feedback (loading, success, error)
- [ ] Spacing follows the 4px grid
- [ ] No more than 2 accent colors used
- [ ] Empty states handled
- [ ] Mobile layout considered
- [ ] Destructive actions have confirmation
- [ ] Focus states visible for keyboard users

Apply this skill fully for UI work.
