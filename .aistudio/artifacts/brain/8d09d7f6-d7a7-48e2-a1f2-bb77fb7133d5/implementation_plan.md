# Implementation Plan: Personal Space Upgrades & Real Reading Validation

## Objective
Enhance Personal Space based on user feedback:
1. Cap reading history to a maximum of 20 items (across storage, display, and cloud payloads).
2. Hide the Personal Space side slider tab on mobile viewports so it doesn't obscure the reading area, retaining access exclusively via the sidebar menu.
3. Fix the Sign In modal appearing under the Personal Space drawer when clicked from the drawer (raise `#login-modal` z-index to `z-60` above the drawer's `z-50`, and close the drawer cleanly upon opening login).
4. Upgrade Personal Space to validate and register *real readings*—requiring both a minimum reading engagement time (e.g. at least 15–20 seconds actively in the chapter) and scrolling to/near the bottom of the chapter, preventing transient scrolls or quick skips from inflating completion stats.

---

## User Review Required

> [!NOTE]
> Per clarifying answers:
> - Real readings are validated via **Time threshold and bottom scroll trigger**.
> - On mobile, the side tab is hidden and Personal Space is accessed via **Sidebar menu item only**.

---

## Proposed Changes

### 1. Hide Personal Space Slider Handle on Mobile
#### `index.html`
- Update `#personal-space-handle` from `flex` to `hidden md:flex` so it is only visible on desktop/tablet screens (`md:` and above), leaving mobile reading view completely unobstructed.
- Keep the existing sidebar menu item (`.open-personal-space-btn`) as the primary mobile entrance.

### 2. Fix Sign In Modal Z-Index & Layering
#### `index.html`
- Increase `#login-modal` z-index from `z-50` to `z-[60]` (or `z-60`) to ensure it sits safely above both `#personal-space-backdrop` and `#personal-space-drawer` (`z-50`).
#### `app.js`
- In `#drawer-auth-btn` click handler, call `closePersonalSpaceDrawer()` before opening `#login-modal` for clean, professional UX.

### 3. Enforce 20-Item Limit on Reading History
#### `app.js`
- In `recordChapterRead()`:
  - Slice `readingProgress.history` to a strict limit of 20 items: `if (readingProgress.history.length > 20) readingProgress.history.length = 20;`.
- In `buildProgressObject()`:
  - Slice `history: (readingProgress.history || []).slice(0, 20)`.
- In `renderPersonalSpaceDrawer()`:
  - Render up to 20 items in `#drawer-reading-history-list` (currently slices to 15, update to 20).
- In `loadDataFromLocalDB()` and `smartMerge()`:
  - Truncate any imported or legacy history arrays to `slice(0, 20)`.

### 4. Implement Real Reading Validation (Time + Bottom Scroll Trigger)
#### `app.js`
- **Active Chapter Tracker**:
  - Track `activeReadingSession`:
    ```js
    let activeReadingSession = {
        book: null,
        chapter: null,
        startTime: 0,
        hasReachedBottom: false,
        timer: null
    };
    ```
- **Time Threshold**:
  - When a chapter is loaded or becomes the primary reading focus, start a session timer (`ACTIVE_READING_MIN_TIME = 15000` ms, i.e. 15 seconds).
  - Check visibility state (`document.visibilityState === 'visible'`) so background tabs don't falsely accumulate reading time.
- **Bottom Scroll Trigger**:
  - In `mainScrollArea` scroll event handler, detect when the user scrolls near the bottom of the active chapter's `.chapter-wrapper` (or bottom 15% of the chapter container).
  - When the bottom is reached:
    - Mark `hasReachedBottom = true`.
    - Check if the time threshold (`Date.now() - activeReadingSession.startTime >= 15000`) is also satisfied.
    - If both conditions are met, trigger `validateAndRegisterRealRead(book, chapter)`.
  - Also provide an intersection sentinel / chapter-end listener to reliably detect completion on both long and short chapters without requiring extra button clicks.
- **Remove Eager Call in `loadChapter`**:
  - Remove direct `recordChapterRead(book, chapter)` from `loadChapter()`, ensuring loading or scrolling past chapters never counts as read.
- **Completion Toast & Visual Feedback**:
  - When a chapter is validated, show a discreet toast (`"Completed [Book] [Chapter] • Progress updated"`) and update streak/stats immediately.

---

## Verification Plan

### Automated / Syntax Verification
- Run `node -c app.js` to ensure zero syntax errors.
- Run `compile_applet` to verify compilation.

### Interactive Functionality Testing
1. **Mobile Viewport Test**:
   - Check that `#personal-space-handle` is hidden below `md` breakpoint (`hidden md:flex`).
   - Check that clicking "Personal Space" in the mobile sidebar drawer opens Personal Space smoothly.
2. **Sign In Modal Layering**:
   - Open Personal Space drawer and click "Sign In".
   - Confirm login modal is fully visible on top without backdrop conflicts.
3. **History Limit**:
   - Verify reading history is capped at 20 items.
4. **Real Reading Validation**:
   - Quick-scroll through chapters: confirm progress and chapter count do NOT increase.
   - Stay on a chapter for >=15s and scroll to the bottom: confirm chapter is registered in reading history, Catholic Canon percentage updates, and streak advances.
