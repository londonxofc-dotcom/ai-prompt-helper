// ============================================================
// Prompt Intelligence Helper — V1.5
// Detects vague phrases, surfaces precise technical terminology
// ============================================================

const patterns = [
  // ── Scroll & Motion ──────────────────────────────────────
  {
    triggers: ["move slower than", "background slower", "depth on scroll", "layers move at different"],
    concept: "Parallax Scrolling",
    options: [
      {
        label: "Parallax scrolling (CSS)",
        insert: "Create a CSS parallax scrolling effect where background layers move at a slower speed than foreground content using transform: translateZ() and perspective."
      },
      {
        label: "Parallax scrolling (GSAP ScrollTrigger)",
        insert: "Implement a GSAP ScrollTrigger parallax effect where each layer moves at a different scroll speed using gsap.to() with scrub."
      },
      {
        label: "Sticky layered scroll",
        insert: "Build a sticky scroll section where layers pin at different scroll positions, creating a depth illusion using position: sticky."
      }
    ]
  },

  // ── Fade & Appear ─────────────────────────────────────────
  {
    triggers: ["fade in", "appear smoothly", "smooth fade", "gradually appear", "slowly show"],
    concept: "Opacity Transition / Intersection Observer",
    options: [
      {
        label: "CSS opacity transition",
        insert: "Add a CSS opacity transition with cubic-bezier easing: transition: opacity 0.4s ease-in-out; triggered on class toggle."
      },
      {
        label: "Intersection Observer reveal",
        insert: "Use IntersectionObserver to detect when elements enter the viewport, then trigger a fade-in animation by adding a CSS class."
      },
      {
        label: "GSAP fade-in sequence",
        insert: "Use gsap.fromTo() with opacity: 0 → 1 and a stagger value to animate a sequence of elements appearing one after another."
      }
    ]
  },

  // ── Hover & Interaction ───────────────────────────────────
  {
    triggers: ["make it interactive", "react on hover", "hover effect", "mouse over effect", "highlight on hover"],
    concept: "Hover State / Pointer Interaction",
    options: [
      {
        label: "CSS :hover with transform",
        insert: "Add a CSS :hover state with transform: scale(1.05) and box-shadow to create a lift effect on pointer interaction."
      },
      {
        label: "JavaScript mousemove tracking",
        insert: "Use mousemove event listener to track pointer position and apply a dynamic CSS transform based on cursor coordinates (magnetic/tilt effect)."
      },
      {
        label: "CSS custom property hover",
        insert: "Leverage CSS custom properties (--x, --y) updated by JavaScript mousemove to drive a radial-gradient spotlight hover effect."
      }
    ]
  },

  // ── Pop / Emphasis ────────────────────────────────────────
  {
    triggers: ["make it pop", "stand out more", "more punch", "make it bold", "needs more impact"],
    concept: "Visual Emphasis",
    options: [
      {
        label: "Scale + shadow contrast",
        insert: "Increase visual emphasis using transform: scale(1.08), increased contrast via filter: contrast(1.2), and a stronger box-shadow."
      },
      {
        label: "Color contrast + weight",
        insert: "Boost visual weight by increasing font-weight to 700+, adjusting color contrast ratio to at least 7:1, and adding a color accent underline."
      },
      {
        label: "Motion emphasis (GSAP)",
        insert: "Use gsap.from() with a scale: 0.8 and opacity: 0 entrance animation to give the element a punchy appear effect."
      }
    ]
  },

  // ── 3D & Depth ────────────────────────────────────────────
  {
    triggers: ["3d feel", "looks flat", "add depth", "3d effect", "three dimensional"],
    concept: "CSS 3D Transform / Perspective",
    options: [
      {
        label: "CSS perspective + rotateX/Y",
        insert: "Apply CSS perspective: 800px on the parent and transform: rotateX(10deg) rotateY(-5deg) on the child to create a 3D tilt effect."
      },
      {
        label: "Layered box-shadow depth",
        insert: "Simulate depth with layered box-shadow values: 0 2px 4px, 0 8px 16px, 0 24px 48px with decreasing opacity to mimic light falloff."
      },
      {
        label: "Three.js 3D scene",
        insert: "Create a Three.js scene with PerspectiveCamera, ambient + directional lighting, and MeshStandardMaterial to render a real-time 3D element."
      }
    ]
  },

  // ── Smooth Scroll ─────────────────────────────────────────
  {
    triggers: ["smooth scroll", "scroll smoothly", "scroll between sections", "page scroll animation"],
    concept: "Smooth Scroll / Scroll Behavior",
    options: [
      {
        label: "CSS scroll-behavior",
        insert: "Enable smooth scrolling site-wide with html { scroll-behavior: smooth; } and use anchor links to scroll to sections."
      },
      {
        label: "Lenis smooth scroll",
        insert: "Integrate Lenis for buttery smooth momentum scrolling: new Lenis({ duration: 1.2, easing: ... }) with a requestAnimationFrame loop."
      },
      {
        label: "GSAP ScrollTo plugin",
        insert: "Use the GSAP ScrollTo plugin to animate scrolling to a target element: gsap.to(window, { scrollTo: '#target', duration: 1, ease: 'power2.inOut' })."
      }
    ]
  },

  // ── Loading / Skeleton ────────────────────────────────────
  {
    triggers: ["loading animation", "skeleton screen", "placeholder while loading", "show while waiting"],
    concept: "Skeleton Loading / Shimmer Effect",
    options: [
      {
        label: "CSS shimmer skeleton",
        insert: "Build a skeleton loading screen using CSS: gray placeholder divs with a shimmer animation via @keyframes and a moving linear-gradient background."
      },
      {
        label: "Spinner / loader",
        insert: "Create a CSS spinner using border-radius: 50%, a transparent border, and a colored top-border rotated with a @keyframes spin animation."
      }
    ]
  },

  // ── Responsive / Layout ───────────────────────────────────
  {
    triggers: ["works on mobile", "responsive layout", "fit any screen", "looks good on phone"],
    concept: "Responsive Design / Mobile-First CSS",
    options: [
      {
        label: "CSS Grid + media queries",
        insert: "Implement a mobile-first responsive layout with CSS Grid: grid-template-columns: 1fr, scaling up with @media (min-width: 768px) breakpoints."
      },
      {
        label: "Flexbox responsive wrap",
        insert: "Use Flexbox with flex-wrap: wrap and flex: 1 1 300px on children so items reflow naturally across screen sizes."
      },
      {
        label: "Container queries",
        insert: "Use CSS Container Queries (@container) so components adapt based on their own width rather than the viewport, enabling truly component-level responsiveness."
      }
    ]
  }
];

// ── State ──────────────────────────────────────────────────
let currentBox = null;
let debounceTimer = null;
const DEBOUNCE_MS = 500;

// ── Suggestion Box ─────────────────────────────────────────
function createSuggestionBox(target, pattern) {
  removeSuggestionBox();

  const box = document.createElement("div");
  box.className = "pih-box";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-label", "Prompt suggestion");

  const optionsHTML = pattern.options.map((opt, i) => `
    <button class="pih-option" data-index="${i}">
      <span class="pih-option-label">${opt.label}</span>
      <span class="pih-arrow">→</span>
    </button>
  `).join("");

  box.innerHTML = `
    <div class="pih-header">
      <span class="pih-icon">✦</span>
      <span class="pih-concept">Did you mean: <strong>${pattern.concept}</strong>?</span>
      <button class="pih-close" aria-label="Dismiss">✕</button>
    </div>
    <div class="pih-options">${optionsHTML}</div>
  `;

  document.body.appendChild(box);

  // Position it above the textarea
  positionBox(box, target);

  // Close button
  box.querySelector(".pih-close").addEventListener("click", removeSuggestionBox);

  // Option buttons
  box.querySelectorAll(".pih-option").forEach((btn) => {
    btn.addEventListener("click", () => {
      const idx = parseInt(btn.dataset.index, 10);
      insertSuggestion(target, pattern.options[idx].insert);
    });
  });

  currentBox = box;
}

function positionBox(box, target) {
  const rect = target.getBoundingClientRect();
  const boxHeight = 160; // estimate before render

  let top = rect.top + window.scrollY - boxHeight - 12;
  let left = rect.left + window.scrollX;

  // Clamp to viewport
  if (top < window.scrollY + 8) {
    top = rect.bottom + window.scrollY + 12;
  }

  const maxLeft = window.innerWidth - 420 - 16;
  if (left > maxLeft) left = maxLeft;
  if (left < 8) left = 8;

  box.style.top = `${top}px`;
  box.style.left = `${left}px`;
}

function removeSuggestionBox() {
  if (currentBox) {
    currentBox.classList.add("pih-fadeout");
    setTimeout(() => {
      currentBox?.remove();
      currentBox = null;
    }, 180);
  }
}

function insertSuggestion(target, text) {
  // Try to work with contenteditable (Claude, Gemini) and textarea (ChatGPT legacy)
  if (target.isContentEditable) {
    target.focus();
    // Append a line break + suggestion text
    const selection = window.getSelection();
    const range = document.createRange();
    range.selectNodeContents(target);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
    document.execCommand("insertText", false, "\n" + text);
  } else {
    target.value = target.value.trimEnd() + "\n" + text;
    target.dispatchEvent(new Event("input", { bubbles: true }));
  }
  target.focus();
  removeSuggestionBox();
}

// ── Pattern Matching ───────────────────────────────────────
function checkText(target) {
  const value = (target.value || target.innerText || target.textContent || "").toLowerCase();
  if (!value.trim()) {
    removeSuggestionBox();
    return;
  }

  for (const pattern of patterns) {
    for (const trigger of pattern.triggers) {
      if (value.includes(trigger)) {
        createSuggestionBox(target, pattern);
        return;
      }
    }
  }

  removeSuggestionBox();
}

// ── Attach Listeners ───────────────────────────────────────
function attachToTarget(target) {
  if (target.dataset.pihAttached) return;
  target.dataset.pihAttached = "true";

  target.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => checkText(target), DEBOUNCE_MS);
  });

  target.addEventListener("blur", () => {
    // Slight delay so clicks on the suggestion box register first
    setTimeout(removeSuggestionBox, 200);
  });
}

// ── DOM Observer ───────────────────────────────────────────
function scanForInputs() {
  // Standard textareas
  document.querySelectorAll("textarea").forEach(attachToTarget);
  // Contenteditable divs (Claude, Gemini use these)
  document.querySelectorAll("[contenteditable='true']").forEach(attachToTarget);
}

function init() {
  scanForInputs();

  const observer = new MutationObserver(() => {
    scanForInputs();
  });

  observer.observe(document.body, { childList: true, subtree: true });

  // Reposition on scroll/resize
  window.addEventListener("scroll", () => {
    if (currentBox) {
      const attached = document.querySelector("[data-pih-attached]");
      if (attached) positionBox(currentBox, attached);
    }
  }, { passive: true });
}

init();
