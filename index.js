/* ============================================================
   RENDER COMPOSITION SECTIONS (composition-first, no fallbacks)
   ============================================================ */

// Container where cards go
const compositionContainerEl = document.getElementById("app");

// Read and sort compositions by performance order
const compositionList = (window.COMPOSITIONS || [])
  .slice()
  .sort((a, b) => a.orderInSet - b.orderInSet);

// Helper: create element with attrs + children
function createEl(tagName, attrs = {}, ...children) {
  const el = document.createElement(tagName);
  for (const [key, val] of Object.entries(attrs)) {
    if (key === "class") el.className = val;
    else if (key === "html") el.innerHTML = val; // only for trusted strings
    else el.setAttribute(key, val);
  }
  children
    .flat()
    .filter(Boolean)
    .forEach((child) => {
      el.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child
      );
    });
  return el;
}

// Render solfejo as <span> tokens
function renderSolfejoSpans(solfejoText = "") {
  const wrap = createEl("div", { class: "pattern-display" });
  solfejoText
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .forEach((token) => {
      wrap.appendChild(createEl("span", {}, token));
    });
  return wrap;
}

// Build each composition card
compositionList.forEach((comp) => {
  const mediaBlock = createEl(
    "div",
    { class: "media" },
    comp.spotify
      ? createEl("iframe", {
          src: comp.spotify,
          allow:
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
        })
      : null,
    comp.youtube
      ? createEl("iframe", { src: comp.youtube, allow: "fullscreen" })
      : null,
    comp.lessonVideo
      ? createEl("video", { controls: "", src: comp.lessonVideo })
      : null,
    comp.solfejoAudio
      ? createEl("audio", { controls: "", src: comp.solfejoAudio })
      : null
  );

  const tagRow = createEl(
    "p",
    { class: "tags" },
    comp.mode ? createEl("span", { class: "tag" }, comp.mode) : null,
    comp.bpm ? createEl("span", { class: "tag" }, `${comp.bpm} bpm`) : null
  );

  const cardEl = createEl(
    "section",
    { class: "composition" },
    createEl("h2", {}, `${comp.orderInSet}. ${comp.title}`),
    tagRow,
    mediaBlock,
    createEl("h3", {}, "Solfejo"),
    comp.solfejoName
      ? createEl("p", { class: "solfejo-name" }, comp.solfejoName)
      : null,
    renderSolfejoSpans(comp.solfejoText || ""),
    comp.notes ? createEl("p", { class: "notes" }, comp.notes) : null,
    createEl(
      "div",
      { class: "actions" },
      createEl(
        "button",
        {
          class: "load-solfejo",
          "data-pattern": comp.solfejoText || "",
        },
        "usar solfejo no metrônomo"
      )
    )
  );

  compositionContainerEl.appendChild(cardEl);
});

/* ============================================================
   METRONOME + PATTERN HIGHLIGHTER (plain JS)
   ============================================================ */

// Controls
const metronomeBpmInput = document.getElementById("bpm");
const metronomePatternInput = document.getElementById("pattern");
const metronomeStartButton = document.getElementById("start");
const metronomeStopButton = document.getElementById("stop");
const metronomePatternDisplay = document.getElementById("patternView");

// State
let audioContext = null;
let metronomeIntervalId = null;
let solfejoTokens = []; // e.g., ["da-chi","da-chi","~"]
let currentSyllableIndex = 0; // which token is active

// Utilities
function tokenizeSolfejo(text) {
  return text.trim().split(/\s+/).filter(Boolean);
}

function renderMetronomePattern() {
  if (!metronomePatternDisplay) return;
  const frag = document.createDocumentFragment();
  solfejoTokens.forEach((syllable, i) => {
    const span = document.createElement("span");
    span.textContent = syllable;
    if (i === currentSyllableIndex) span.classList.add("active"); // style in CSS
    frag.appendChild(span);
  });
  metronomePatternDisplay.innerHTML = "";
  metronomePatternDisplay.appendChild(frag);
}

function playClick(ac, isAccent = false) {
  const osc = ac.createOscillator();
  const gain = ac.createGain();
  osc.type = "square";
  osc.frequency.value = isAccent ? 1600 : 1000;
  gain.gain.setValueAtTime(0, ac.currentTime);
  gain.gain.linearRampToValueAtTime(
    isAccent ? 0.08 : 0.05,
    ac.currentTime + 0.002
  );
  gain.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + 0.06);
  osc.connect(gain).connect(ac.destination);
  osc.start();
  osc.stop(ac.currentTime + 0.08);
}

function advanceMetronomeStep() {
  if (!solfejoTokens.length) return;
  const token = solfejoTokens[currentSyllableIndex];
  const isAccent = currentSyllableIndex === 0; // accent first of cycle
  if (token !== "~") playClick(audioContext, isAccent);
  renderMetronomePattern();
  currentSyllableIndex = (currentSyllableIndex + 1) % solfejoTokens.length;
}

function startMetronome() {
  stopMetronome();
  if (!audioContext)
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
  currentSyllableIndex = 0;
  const bpm = Math.max(
    30,
    Math.min(220, Number(metronomeBpmInput?.value) || 108)
  );
  const intervalMs = 60000 / bpm;
  metronomeIntervalId = setInterval(advanceMetronomeStep, intervalMs);
  advanceMetronomeStep();
}

function stopMetronome() {
  if (metronomeIntervalId) clearInterval(metronomeIntervalId);
  metronomeIntervalId = null;
  currentSyllableIndex = 0;
  renderMetronomePattern();
}

function setMetronomePatternFromInput() {
  if (!metronomePatternInput) return;
  solfejoTokens = tokenizeSolfejo(metronomePatternInput.value);
  renderMetronomePattern();
}

// Wire up
metronomeStartButton?.addEventListener("click", startMetronome);
metronomeStopButton?.addEventListener("click", stopMetronome);
metronomeBpmInput?.addEventListener("change", () => {
  if (metronomeIntervalId) startMetronome();
});
metronomePatternInput?.addEventListener("input", setMetronomePatternFromInput);
metronomePatternInput?.addEventListener("change", setMetronomePatternFromInput);

// Load pattern from any composition card button
document.querySelectorAll(".load-solfejo").forEach((button) => {
  button.addEventListener("click", (e) => {
    const pattern = e.currentTarget.getAttribute("data-pattern") || "";
    if (metronomePatternInput) metronomePatternInput.value = pattern;
    setMetronomePatternFromInput();
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

// Allow clicking the spans inside a composition to load it
document
  .querySelectorAll(".composition .pattern-display")
  .forEach((display) => {
    display.addEventListener("click", () => {
      const seq = Array.from(display.querySelectorAll("span"))
        .map((s) => s.textContent.trim())
        .filter(Boolean)
        .join(" ");
      if (metronomePatternInput) metronomePatternInput.value = seq;
      setMetronomePatternFromInput();
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
  });

// Init display once on load
setMetronomePatternFromInput();
