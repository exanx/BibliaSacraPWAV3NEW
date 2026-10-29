# Personal Space Slider, Reading Progress & AI Thinking Configuration (Revised)

A spiritual reading companion featuring a discreet right-edge slider button that expands into a full Personal Space drawer (opposite the main navigation sidebar) on mobile and desktop, ultra-low write cloud sync coalescing, Catholic 73-book scripture progress tracking, granular Gemini model and thinking token configuration, and safe settings restoration without user data loss.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following revisions have been incorporated:
> - **Opposite-Side Slider Button**: Positioned fixed on the **right edge** (opposite the main left sidebar). It renders as a sleek, compact tab handle that expands into the full Personal Space panel on click across both mobile and desktop.
> - **Ultra-Low Write Cloud Sync**: Uses our coalesced lifecycle architecture (`dirtySyncSections`, 60-second debouncing, and `visibilitychange` flush) with a compact aggregated schema. Zero repeated writes while reading; a single batched document write stores streak, daily goal, total chapters, and completed book counters.
> - **Cloud Sync Switch**: Allows turning synchronization ON or OFF at any time. When OFF, all operations remain strictly local in IndexedDB with zero network requests.
> - **AI Model & Thinking Tokens**: Configurable Gemini model selection with thinking token presets (`Off` / `Fast` / `Deep Theology` / `Custom`) and an interactive slider (0 to 2048 tokens).
> - **Non-Destructive Reset**: Dedicated "Restore Settings to Default" button in Settings that resets themes, typography, and AI options while preserving all user records (bookmarks, notes, highlights, reading progress, and goals).

---

## 1. Overview & Core Concept

- **Right-Edge Slider Handle**: A discreet vertical handle pinned to the right edge of the screen displaying a subtle icon and reading streak indicator. Clicking it smoothly slides open the Personal Space drawer without disturbing the reader's view.
- **Ultra-Efficient Cloud Synchronization**:
  - Eliminates redundant Firestore reads and writes by treating local IndexedDB as the primary high-speed source of truth.
  - Progress updates are queued in memory and committed to the user's Firestore document only during idle lulls, tab backgrounding (`visibilitychange`), or page unload.
  - A persistent Cloud Sync toggle gives users complete privacy control.
- **73-Book Catholic Scripture Progress**:
  - Tracks reading across the 1,334 chapters of the complete Catholic canon (1,074 Old Testament chapters, including Deuterocanonical books, and 260 New Testament chapters).
  - Displays canonical section completion bars (Pentateuch, Historical, Wisdom, Prophets, Gospels, Epistles).
- **Daily Habit & Streak Engine**:
  - Tracks consecutive daily reading habits.
  - Configurable daily chapter goal (e.g. 1, 3, or 5 chapters per day) with today's completion ring.
  - Recent reading history log with 1-click "Resume" affordance.
- **Granular AI Configuration**:
  - Model selector (default `gemini-3.1-flash-lite`, with fallbacks to `gemini-2.5-flash-lite`, `gemini-2.5-flash`, etc.).
  - Thinking tokens controls: Off (0 tokens, ultra-fast ~1s), Fast (512 tokens), Deep Theology (1024 tokens), or Custom (0–2048 slider).
- **Non-Destructive Reset**:
  - Reverts typography, spacing, active themes, and AI parameters to pristine defaults while strictly preserving highlights, notes, bookmarks, reading history, and custom bibles.

---

## 2. User Experience & Visual Design

### 1. The Right-Edge Slider Handle & Expanding Drawer
- **Collapsed Handle**: Pinned to `fixed right-0 top-1/2 -translate-y-1/2 z-40`.
  - Styled with subtle glassmorphism (`glass-panel`), rounded left border (`rounded-l-2xl`), and gentle hover expansion.
  - Displays a clean scripture/progress glyph and small streak flame number (e.g., `5`).
  - Accessible on all screen sizes (mobile, tablet, desktop) without occluding reading text.
- **Expanded Drawer**:
  - Clicking the handle smoothly slides out a `w-full sm:w-[420px]` panel from the right edge with backdrop blur (`z-50`).
  - Features a clean close button and quick collapse handle.
  - Contains 4 well-structured sections:
    1. **Profile & Sync Header**: Avatar, email / local guest label, Sign In button, and Cloud Sync ON/OFF toggle switch.
    2. **Habit & Streak Ring**: Active streak days, today's chapter goal progress, and target adjuster (`-` / `+`).
    3. **Catholic Canon Progress**: Overall percentage of the 73 books read, OT/NT breakdown meters, and canonical category bars.
    4. **Reading History**: Chronological log of recent chapters with relative timestamps ("20m ago", "Yesterday") and 1-click "Resume" buttons.

### 2. AI Settings in Settings Modal
- Located inside the `AI & Audio` tab of Settings.
- **Model Selector**: Dropdown featuring Gemini 3.1 Flash Lite, 2.5 Flash Lite, 2.5 Flash, and Flash Latest.
- **Thinking Token Presets**:
  - `Off (Fastest, ~1s)`: Sets budget to 0 for instant scripture lookups.
  - `Fast (512 tokens)`: Balanced reasoning for complex topics.
  - `Deep Theology (1024 tokens)`: In-depth biblical typology and theological synthesis.
  - `Custom`: Displays the numeric range slider (0 to 2048).
- **Max Output Tokens**: Dropdown (1024, 2048, 4096).

### 3. Non-Destructive "Restore Settings to Default"
- Positioned in Settings with a distinct secondary card and clear description.
- Restores: font family (`Inter`), size (`1.125rem`), line ratio (`1.75`), content width (`100%`), curated theme (`amoled_black`), accent color (`indigo`), live effect (`theme_default`), AI model (`gemini-3.1-flash-lite`), and thinking tokens (`0`).
- Leaves untouched: bookmarks, highlights, categories, personal notes, offline cached Bibles, custom bibles, reading streak, goals, and history.

---

## 3. Cloud Sync Architecture: Ultra-Low Write Strategy

Firestore charges by document reads and writes. To make cloud sync ultra-efficient:

```
┌────────────────────────────────────────────────────────────────────────┐
│                        Ultra-Low Write Pipeline                        │
│                                                                        │
│   User reads chapters & marks goals                                    │
│                     │                                                  │
│                     ▼                                                  │
│   ┌──────────────────────────────────┐                                 │
│   │ 1. Instant Local IndexedDB Write │ (0ms, 0 network, offline-first) │
│   └─────────────────┬────────────────┘                                 │
│                     │                                                  │
│                     ▼                                                  │
│   ┌──────────────────────────────────┐                                 │
│   │ 2. dirtySyncSections.add('prog') │ In-memory flag; no network call │
│   └─────────────────┬────────────────┘                                 │
│                     │                                                  │
│                     ▼                                                  │
│   ┌──────────────────────────────────┐                                 │
│   │ 3. Coalescing Timer (60s idle)   │ Coalesces 10+ chapter reads     │
│   │    OR visibilitychange / unload  │ into ONE single document write! │
│   └─────────────────┬────────────────┘                                 │
│                     │                                                  │
│                     ▼                                                  │
│   ┌──────────────────────────────────┐                                 │
│   │ 4. Single Document Update        │ Firestore: users/{uid}          │
│   │    { progress: compactAggregate }│ (1 write total per session)     │
│   └──────────────────────────────────┘                                 │
└────────────────────────────────────────────────────────────────────────┘
```

- **Compact Aggregated Schema**: Instead of writing separate documents for every chapter, all progress is serialized into a single compact JSON field under `users/{uid}`:
  ```json
  {
    "progress": {
      "streak": 5,
      "dailyTarget": 3,
      "todayCount": 2,
      "lastActiveDate": "2026-10-29",
      "totalReadChapters": 84,
      "readChapters": ["Genesis_1", "Genesis_2", "John_1", "..."],
      "history": [
        { "book": "John", "chapter": 1, "time": 1729000000 }
      ],
      "updatedAt": 1729000000
    }
  }
  ```
- **Sync Toggle Guard**: If `cloudSyncEnabled === false`, all network push/pull functions immediately exit without making any network requests.

---

## 4. Technical Architecture & Component Mapping

### Component Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│                         Viewport (100vw)                               │
│                                                                        │
│   ┌──────────┐    ┌───────────────────────────────────┐    ┌───────┐   │
│   │ Left     │    │       Main Scripture Reading      │    │ Right │   │
│   │ Sidebar  │    │              Canvas               │    │ Slider│   │
│   │ (Books)  │    │                                   │    │ Handle│   │
│   │          │    │                                   │    │ (Stats│   │
│   │          │    │                                   │    │ Streak│   │
│   │          │    │                                   │    │ Goal) │   │
│   └──────────┘    └───────────────────────────────────┘    └───┬───┘   │
│                                                                │       │
│                                                                ▼       │
│                                                   ┌────────────────┐   │
│                                                   │ Expanded       │   │
│                                                   │ Personal Space │   │
│                                                   │ Drawer         │   │
│                                                   │ • Profile/Sync │   │
│                                                   │ • Streak Meter │   │
│                                                   │ • 73-Book Canon│   │
│                                                   │ • History Log  │   │
│                                                   └────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
```

### Execution Steps

1. **HTML Architecture (`/index.html`)**:
   - Insert the right-edge slider button (`#personal-space-handle`).
   - Insert the full sliding drawer (`#personal-space-drawer`) with overlay backdrop.
   - Add the AI Model selector, Thinking Token Preset buttons, numeric slider, and token ceiling inside `settings-panel-ai`.
   - Update the "Reset Settings" section in `settings-panel-storage` with clear non-destructive labeling.

2. **Client State & Progress Engine (`/app.js`)**:
   - Initialize `readingProgress`: `{ streak: 0, dailyTarget: 3, todayCount: 0, lastActiveDate: '', readChapters: {}, history: [] }`.
   - Initialize `cloudSyncEnabled` (default `true`, stored in settings).
   - Implement Catholic 73-book canon chapter counts (Old Testament 1,074 chapters, New Testament 260 chapters = 1,334 chapters).
   - Track reading events when chapters load/finish and update streak/daily count.
   - Wire slider handle toggle animations (slide in/out with smooth cubic bezier).
   - Wire Cloud Sync On/Off toggle into `pushToCloud()` and `pullFromCloud()`.
   - Connect AI thinking token settings to `callGeminiDirect()` and backend proxy payload.
   - Refactor `resetSettings()` to strictly reset UI & AI preferences while preserving user database content.

3. **Backend Route Support (`/server.js`)**:
   - Support `thinkingBudget`, `maxOutputTokens`, and `model` forwarded from the client in `/api/ai/search-verses`.

4. **Verification**:
   - Verify slider button click expands and collapses drawer seamlessly on mobile and desktop.
   - Verify cloud sync toggle completely pauses/resumes Firestore sync.
   - Verify Catholic Bible progress metrics compute accurately for 73 books.
   - Verify AI search runs with user-configured thinking tokens (0 for instant, >0 for deep thinking).
   - Verify non-destructive reset restores defaults without clearing notes or reading history.
