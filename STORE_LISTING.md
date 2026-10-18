# Chrome Web Store Listing — Epoch Time Customizer

## Extension icon

Icons now live in `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png`
and are wired up in `manifest.json` under both the top-level `"icons"` key
and `"action.default_icon"`. That's the only place Chrome reads an icon
from — without it, Chrome falls back to a generic placeholder built from the
extension's first letter, which is why the toolbar was showing a plain "E".
Reload the unpacked extension (or bump the version and re-upload to the Web
Store) and the toolbar/Extensions-menu icon will pick up the new artwork
automatically. If you want a different look, just replace those three PNGs
(keep the same file names and pixel sizes) — no manifest changes needed.

For the actual Web Store listing you'll also want a **1280×800 promo
screenshot** and, optionally, a **440×280 small promo tile** — the images in
`store-assets/` (screenshot-1.jpg through screenshot-4.jpg, plus
reference-mock.png) work well as a starting point for the screenshots
section of the listing. That folder is just a holding place for these
marketing assets — it isn't loaded by Chrome as part of the extension.

---

## Title
**Epoch Time Customizer**

## Short description (132 characters max — shown in search results)
Instantly converts Unix epoch timestamps on any page to readable dates — plus a built-in epoch ⇄ date/time converter.

*(117 characters)*

## Detailed description

```
Epoch Time Customizer turns raw Unix timestamps into readable dates —
right where you find them, and in your own converter tool.

WORKS ON ANY PAGE
Logs, JSON responses, dashboards, API docs — anywhere a 10-digit (seconds)
or 13-digit (milliseconds) epoch timestamp appears as plain text, this
extension quietly appends a human-readable date next to it:

  1779313371 → 1779313371 [2026-05-21 03:12:51 IST]

No copy-pasting into a converter site, no guessing which timestamp is which.

BUILT-IN CONVERTER
Click the toolbar icon for a quick two-way converter:
  • Epoch → Human — paste any epoch value (seconds or milliseconds) and get
    a readable date/time instantly.
  • Human → Epoch — pick a date (yyyy-mm-dd) and time (hh:mm:ss) and get
    the exact Unix epoch back, in your chosen timezone.

CHOOSE YOUR TIMEZONE
Pick Local time, UTC/GMT, or a specific zone (New York, London, India and
more) — both the on-page conversion and the popup converter use it.

BUILT FOR SAFETY & PERFORMANCE
  • Only converts standalone timestamps — numbers that are part of a link,
    URL, ID, file name or decimal (e.g. /orders/1779313371, ?id=…,
    ORD-1779313371, 1779313371.jpg) are left untouched.
  • Never converts a timestamp twice — if a human-readable date is already
    shown next to it in any format (from this extension, another converter
    or the page itself, e.g. "1779313371 (26 July 2026)"), it is skipped.
  • Only reads and rewrites plain text nodes — never touches scripts,
    styles, or code blocks.
  • Skips text editors, code editors and input fields entirely, so it never
    interferes with typing, your cursor position, or copy/paste anywhere
    else on the page.
  • A guarded MutationObserver keeps working on dynamic, single-page apps
    without reprocessing content it has already converted.
  • Requires only the "storage" permission — no browsing history, no
    network access, no data collection.

Perfect for developers, QA engineers, support teams and anyone who reads
logs, API payloads or database rows full of Unix timestamps every day.
```

## What's new (release notes)

### Version 1.1.2 — Bug fix
```
• Only standalone epoch timestamps are converted now. Numbers that are part
  of a link, URL, query parameter, ID, file name or decimal are no longer
  converted by mistake.
• Link IDs are skipped: if a link's address contains the same number as its
  text, that number is treated as an ID, not a time.
• No double conversion: timestamps that already have a human-readable date
  next to them (in any format, such as "26 July 2026", "Jul 26, 2026",
  "2026-07-26", "21:42" or "3 hours ago", including dates added by other
  converter extensions) are left as they are.
```

## Category
Developer Tools

## Permissions justification (for the Web Store review form)
- **storage** — saves your enabled/disabled state and preferred timezone
  locally in `chrome.storage.local` so your settings persist between
  browser sessions. Nothing is sent off your device.

## Privacy
This extension does not collect, transmit, or sell any user data. All
processing (timestamp detection and formatting) happens locally in the
page using the browser's built-in `Intl` API.
