# AI Feature Customization, Minimal UI Redesign & Encrypted Gemini API Key Integration

Streamline the Biblia Sacra user experience by removing top-bar and sidebar clutter, consolidating search into a fast mobile-ready search popout, providing an AI feature toggle in Settings, transforming the AI scripture search into a minimal full-width interface, and requiring a personal Gemini API key with AES-GCM client-side encryption and cloud sync.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following decisions govern this revision:
> - **Sidebar Decluttering**: Remove the separate large "AI Scripture Search" button located above Voice Reader. AI search is anchored directly to the main search bar and the small AI search sparkle button adjacent to it.
> - **Top Menu Bar Quick Search Popout**: Replace the top-bar AI button with a fast **Quick Search** button (magnifying glass) that opens a lightweight search popout/modal containing the main scripture search bar and its companion AI button, giving mobile users instant access to navigation and search without opening the full sidebar.
> - **Top Menu Bar Quote Icon**: Removed from the top header; Quote Studio remains accessible in verse selection popups and the sidebar.
> - **Settings AI Toggle**: Toggling "Show AI Scripture Search" off hides all AI buttons (including the companion button on the search bar) and disables the `Ctrl+K` / `Cmd+K` shortcut.
> - **Personal Gemini API Key**: Kept on-device encrypted via AES-GCM 256-bit (Web Crypto API) and synced encrypted to Firestore if signed in. Guidance and entry are accessible both in Settings and as an inline prompt in the AI search modal.
> - **Minimal AI Search Interface**: Full-width search input, icon-only submit button (no text), and zero sample topic chips.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. **Top Bar Transformation**: Removes the Quote Maker icon and replaces the AI button with a Quick Search button (`open-quick-search-btn`) that launches an instant search modal on mobile.
  2. **Sidebar Streamlining**: Removes the duplicate large AI button above Voice Reader; keeps the search experience cleanly anchored to the main input and its companion AI button.
  3. **AI Visibility Toggle in Settings**: Adds a toggle to hide all AI affordances and disable keyboard shortcuts for readers wanting a purely traditional reading experience.
  4. **Minimal AI Scripture Search**: Refactors the AI search modal to be full-width, clean, and distraction-free, with no sample topic chips and a compact icon button.
  5. **Encrypted Gemini API Key Management**: Secures user keys using browser AES-GCM encryption before storing locally or syncing to Firestore, with step-by-step guidance to get a free key from Google AI Studio.
- **Target Audience**: Catholic scripture readers, researchers, and students who want rapid scripture lookup, minimal visual clutter, and privacy-respecting AI tools.
- **Key Value**: Provides effortless mobile search, removes redundant buttons, respects user privacy with encrypted credentials, and gives users full control over AI visibility.

---

## 2. User Experience & Visual Design

### Key User Flows

1. **Mobile Quick Search (Top Bar)**:
   - User taps the magnifying glass icon in the top header.
   - A smooth, lightweight popout/modal appears containing the main search bar (`Jn 3:16`, `Genesis 1`, or topic keywords) with auto-focus.
   - Beside the input is the small AI button: users can either jump directly to a chapter/verse or tap the AI button to search by natural language subject.
2. **Streamlined Sidebar**:
   - The sidebar displays:
     - **Search Section**: Input bar with "GO" and companion small AI sparkle button.
     - **Navigation**: Book & Chapter selector.
     - **Translation**: Catholic translation dropdown.
     - **Quick Actions**: Voice Reader, Notes & Highlights, Bookmarks, Quote Studio, Dictionary/Wikipedia, and Settings (the redundant standalone AI button above Voice Reader is gone).
3. **Settings AI Visibility & Key Management**:
   - **"AI Features" Section**:
     - Toggle: *"Show AI Scripture Search"* (turns off all AI buttons and `Ctrl+K`).
     - *"Gemini API Key"*: Masked input with edit/clear buttons, test status badge, and guide link (`https://aistudio.google.com/app/apikey`).
4. **Encrypted Key Onboarding**:
   - When a user opens AI search without an API key, the modal displays a welcoming, minimal card guiding them to get a free key, paste it, and save with AES-GCM encryption.
5. **Minimal AI Scripture Search**:
   - Full-width search bar with magnifying glass icon.
   - Compact submit button with search arrow/icon and spinner (no "Find Verses" text button).
   - Zero sample topic chips.
   - Instant thematic summary + canonical verse cards with one-tap jump to chapter.

```
TOP BAR (Mobile):
┌────────────────────────────────────────────────────────┐
│ [☰ Menu]  [🔍 Quick Search]   Genesis 1 ▾   [⚙ Settings] │
└──────────────────────────┬─────────────────────────────┘
                           │ Opens
                           ▼
QUICK SEARCH POPOUT:
┌────────────────────────────────────────────────────────┐
│  Search Scripture or Topic                          ✕  │
│ ┌──────────────────────────────────────┬────┬────────┐ │
│ │ e.g. "John 3:16" or "Eucharist"      │ GO │ [✨ AI] │ │
│ └──────────────────────────────────────┴────┴────────┘ │
└────────────────────────────────────────────────────────┘
```

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Quick Search Popout vs Opening Full Sidebar**
  - *Chosen Approach*: Add a focused Quick Search modal triggered by the top bar magnifying glass.
  - *Why*: Allows mobile users to jump to any chapter or verse instantly in 2 taps without scrolling through the multi-section sidebar drawer.
- **Decision 2: Companion AI Button on Search Bar**
  - *Chosen Approach*: Position the small AI sparkle button directly alongside the search bar (in both the sidebar and the Quick Search popout) while removing the large duplicate button above Voice Reader.
  - *Why*: Eliminates redundant buttons while keeping AI search naturally accessible wherever search occurs.
- **Decision 3: Client-Side Web Crypto AES-GCM Encryption**
  - *Chosen Approach*: Encrypt personal API keys client-side before persisting in `localStorage` or syncing to Firebase.
  - *Why*: Protects user keys against plaintext inspection and ensures cloud sync remains private and secure.

---

## 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                                CLIENT (Browser)                              │
│                                                                              │
│  ┌──────────────────────┐   ┌─────────────────────┐   ┌───────────────────┐  │
│  │   Top Header / Nav   │   │ Quick Search Popout │   │  AI Search Modal  │  │
│  │  - Menu Burger       │──▶│ - Direct Verse Input│──▶│ - Full-width Input│  │
│  │  - Quick Search [🔍] │   │ - "GO" Button       │   │ - Icon-only Submit│  │
│  │  - Chapter Selector  │   │ - Companion [✨ AI] │   │ - Key Setup Guide │  │
│  │  - Settings [⚙]      │   └─────────────────────┘   └─────────┬─────────┘  │
│  └──────────────────────┘                                       │            │
│             │                                                   ▼            │
│             ▼                                      ┌──────────────────────┐  │
│  ┌──────────────────────┐                          │   Web Crypto Suite   │  │
│  │    Settings Modal    │                          │ - AES-GCM 256-bit    │  │
│  │ - AI Feature Toggle  │                          │ - Local & Cloud Sync │  │
│  │ - Encrypted Key Mgmt │                          └──────────┬───────────┘  │
│  └──────────────────────┘                                     │              │
└───────────────────────────────────────────────────────────────┼──────────────┘
                                                                │ POST /api/ai/search-verses
                                                                │ Header: x-gemini-api-key
                                                                ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                            SERVER (Node / Express)                           │
│  - Receives decrypted user key in request header                             │
│  - Executes Gemini 3.1 Flash Lite (with fallback) with Catholic canon prompt │
│  - Returns structured JSON to client                                         │
└──────────────────────────────────────────────────────────────────────────────┘
```

### Verification Plan
1. **Header Checks**: Verify Quote Maker is removed from top bar; verify Quick Search button appears on mobile and opens the search popout.
2. **Sidebar Checks**: Verify large AI button above Voice Reader is removed; verify search bar contains the companion AI sparkle button.
3. **Settings Toggle**:
   - Toggle AI OFF -> verify companion AI buttons disappear from search bars and popouts; verify `Ctrl+K` is disabled.
   - Toggle AI ON -> verify AI buttons and shortcut are restored.
4. **Encrypted Gemini Key**:
   - Verify setup prompt in AI modal when key is empty.
   - Verify key input, test validation, and AES-GCM encryption in storage.
   - Verify cloud sync when signed into Firebase.
5. **Minimal AI Search**:
   - Verify search bar is full-width with icon-only submit button and no sample topic pills.
   - Verify verse clicking jumps directly to the chapter in CPDV.
6. **Code Compilation**: Run `compile_applet`, `node -c`, and `lint_applet`.
