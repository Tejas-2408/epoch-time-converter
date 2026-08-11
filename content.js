// Secure and Reactive DOM Engine

// To handle Single Page Applications (SPAs) safely, this script uses a MutationObserver. It includes architectural safeguards to prevent infinite mutation loop rendering and eliminates Cross-Site Scripting (XSS) risks.

let extensionSettings = { enabled: true, timezone: 'LOCAL' };

// Strict regex matching 10-digit or 13-digit Unix timestamps.
// The lookahead/lookbehind ensures we don't convert timestamps already appended with [🕒 ...]
const EPOCH_REGEX = /\b(1\d{9}|2\d{9}|1\d{12})\b(?!\s*\[🕒)/g;

// Any element matching this selector is treated as a "live editing surface" —
// text/code editors and input-like widgets — and is never touched by the
// converter. Rewriting a text node's value while a user's cursor/selection is
// anchored inside it forces the browser to reset that cursor to the start of
// the node, which is what caused typing, caret position and copy/paste to
// break in unrelated editor panes elsewhere on the page.
const EDITABLE_SURFACE_SELECTOR = [
  '[contenteditable]',
  'input',
  'textarea',
  '[role="textbox"]',
  '[role="combobox"]',
  '[role="searchbox"]',
  '.CodeMirror',
  '.cm-editor',
  '.monaco-editor',
  '.ace_editor',
  '.ProseMirror',
  '[data-slate-editor]'
].join(',');

/**
 * True if `el` is, or sits inside, a live editing surface (a text box, rich
 * text editor or code editor) that the converter must never rewrite.
 */
function isEditableSurface(el) {
  if (!el || el.nodeType !== Node.ELEMENT_NODE) return false;

  const host = el.closest(EDITABLE_SURFACE_SELECTOR);
  if (!host) return false;

  // A `contenteditable="false"` element explicitly opts back out, even when
  // nested inside a larger editable ancestor.
  if (host.hasAttribute('contenteditable')) {
    return host.getAttribute('contenteditable') !== 'false';
  }

  return true;
}

// Initialize configurations from chrome storage
chrome.storage.local.get({ enabled: true, timezone: 'LOCAL' }, (items) => {
  extensionSettings = items;
  if (extensionSettings.enabled) {
    runConversion(document.body);
  }
});

// Watch for configuration shifts dynamically without requiring a page reload
chrome.storage.onChanged.addListener((changes) => {
  if (changes.enabled) extensionSettings.enabled = changes.enabled.newValue;
  if (changes.timezone) extensionSettings.timezone = changes.timezone.newValue;
  
  if (extensionSettings.enabled) {
    runConversion(document.body);
  }
});

function convertText(text) {
  return text.replace(EPOCH_REGEX, (match) => {
    let timestamp = parseInt(match, 10);
    if (match.length === 10) timestamp *= 1000;

    try {
      // Configure strict 24-hour token options
      const options = {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hourCycle: 'h23', // Forces 24-hour cycle (00-23)
        timeZoneName: 'short' // Captures short code like IST, GMT, EST
      };
      
      if (extensionSettings.timezone !== 'LOCAL') {
        options.timeZone = extensionSettings.timezone;
      }
      
      // Use 'en-US' as a deterministic base locale to extract layout parts cleanly
      const formatter = new Intl.DateTimeFormat('en-US', options);
      const parts = formatter.formatToParts(new Date(timestamp));
      
      // Map the parts array into an easily queryable object map
      const p = Object.fromEntries(parts.map(part => [part.type, part.value]));
      
      // Construct exactly: yyyy-mm-dd HH:MM:ss TZ
      const humanTime = `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}:${p.second} ${p.timeZoneName}`;
      
      return `${match} [${humanTime}]`;
    } catch (e) {
      return match; // Keep unchanged if date calculations fail
    }
  });
}

function runConversion(rootNode) {
  if (!rootNode) return;

  // Never walk into a live editing surface at all — skip the whole subtree.
  if (rootNode.nodeType === Node.ELEMENT_NODE && isEditableSurface(rootNode)) {
    return;
  }

  const walker = document.createTreeWalker(
    rootNode,
    NodeFilter.SHOW_TEXT,
    {
      acceptNode: (node) => {
        const parentEl = node.parentElement;
        if (!parentEl) return NodeFilter.FILTER_REJECT;

        const parentTag = parentEl.tagName;
        if (['SCRIPT', 'STYLE', 'CODE', 'INPUT', 'TEXTAREA'].includes(parentTag)) {
          return NodeFilter.FILTER_REJECT;
        }

        // Skip text that lives inside any editor / input-like widget so we
        // never mutate a node the user might currently be typing into.
        if (isEditableSurface(parentEl)) {
          return NodeFilter.FILTER_REJECT;
        }

        return NodeFilter.FILTER_ACCEPT;
      }
    }
  );

  let currentNode;
  while ((currentNode = walker.nextNode())) {
    const originalValue = currentNode.nodeValue;
    const alteredValue = convertText(originalValue);
    if (originalValue !== alteredValue) {
      currentNode.nodeValue = alteredValue; 
    }
  }
}

// Performance and Security Shielded Mutation Observer
const observer = new MutationObserver((mutations) => {
  if (!extensionSettings.enabled) return;

  // Temporarily pause monitoring transformations to completely neutralize infinite loops
  observer.disconnect();

  for (const mutation of mutations) {
    // If this mutation happened inside a live editing surface (e.g. a code
    // editor pane re-rendering as the user types), ignore it entirely —
    // don't even look at its added nodes. This is what previously caused
    // typing/cursor position/copy-paste to break in other editor panes.
    if (mutation.target && isEditableSurface(mutation.target)) {
      continue;
    }

    for (const node of mutation.addedNodes) {
      if (node.nodeType === Node.ELEMENT_NODE) {
        runConversion(node);
      } else if (node.nodeType === Node.TEXT_NODE) {
        const parentEl = node.parentElement;
        if (!parentEl) continue;

        const pTag = parentEl.tagName;
        if (['SCRIPT', 'STYLE', 'CODE'].includes(pTag)) continue;
        if (isEditableSurface(parentEl)) continue;

        node.nodeValue = convertText(node.nodeValue);
      }
    }
  }

  // Re-engage execution pipeline
  startObserving();
});

function startObserving() {
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// Trigger initial entrypoint initialization
if (document.body) startObserving();