/* ============================================================
   RENDER COMPOSITIONS (composition-first, optional fields)
   ============================================================ */

// Container where cards go
const compositionContainerEl = document.getElementById("app");

// Read & sort compositions
const compositionList = (window.COMPOSITIONS || [])
  .slice()
  .sort((a, b) => a.orderInSet - b.orderInSet);

// Helper: element factory
function createEl(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === "class") el.className = v;
    else if (k === "html") el.innerHTML = v; // only for trusted strings
    else el.setAttribute(k, v);
  }
  children
    .flat()
    .filter(Boolean)
    .forEach((c) => {
      el.appendChild(typeof c === "string" ? document.createTextNode(c) : c);
    });
  return el;
}

/* ---------- Setlist (top order list) ---------- */
(function renderSetlist() {
  if (!compositionList.length) return;
  const header = document.querySelector("header") || document.body;
  const setlist = createEl(
    "nav",
    { id: "setlist" },
    createEl("h2", {}, "Setlist"),
    createEl(
      "ol",
      {},
      ...compositionList.map((comp) => {
        const anchorId = `comp-${comp.orderInSet}`;
        return createEl(
          "li",
          {},
          createEl(
            "a",
            { href: `#${anchorId}` },
            `${comp.orderInSet}. ${comp.title}`
          )
        );
      })
    )
  );
  header.insertAdjacentElement("afterend", setlist);
})();

/* ---------- Cards ---------- */
compositionList.forEach((comp, i) => {
  const anchorId = `comp-${comp.orderInSet}`;
  const isAlt = i % 2 === 0; // 0,2,4... red; 1,3,5... white

  // Mode tag (e.g., "com mãos", "baquetas")
  const tagRow = createEl(
    "p",
    { class: "tags" },
    comp.mode ? createEl("span", { class: "tag" }, comp.mode) : null
  );

  /* --- Solfejo fields with N/A fallbacks --- */
  const solfejoNameNode = createEl(
    "p",
    { class: "field" },
    createEl("strong", {}, "Solfejo: "),
    comp.solfejoName ? comp.solfejoName : "N/A"
  );

  const solfejoAudioNode = createEl(
    "div",
    { class: "field" },
    createEl("strong", {}, "Áudio: ")
  );
  if (comp.solfejoAudio && comp.solfejoAudio !== "N/A") {
    solfejoAudioNode.appendChild(
      createEl("audio", { controls: "", src: comp.solfejoAudio })
    );
  } else {
    solfejoAudioNode.appendChild(document.createTextNode("N/A"));
  }

  const solfejoImageNode = createEl(
    "div",
    { class: "field" },
    createEl("strong", {}, "Imagem do solfejo: ")
  );
  if (comp.solfejoImage) {
    solfejoImageNode.appendChild(
      createEl("img", {
        src: comp.solfejoImage,
        alt: `Solfejo - ${comp.title}`,
      })
    );
  } else {
    solfejoImageNode.appendChild(document.createTextNode("N/A"));
  }

  /* --- Lessons (Aulas) --- */
  const lessonsWrap = createEl("div", { class: "lessons" });

  function buildLesson(label, url) {
    if (!url) return null;

    const isYouTube = url.includes("youtube.com") || url.includes("youtu.be");
    const isDrive = url.includes("drive.google.com");

    let mediaEl;
    if (isYouTube) {
      mediaEl = createEl("iframe", {
        src: url,
        allow: "fullscreen",
        loading: "lazy",
        class: "youtube-embed",
      });
    } else if (isDrive) {
      mediaEl = createEl("iframe", {
        src: url,
        allow: "fullscreen",
        loading: "lazy",
        class: "drive-embed",
      });
    } else {
      mediaEl = createEl("video", { controls: "", src: url });
    }

    return createEl(
      "div",
      { class: "lesson" },
      createEl("h4", {}, label),
      mediaEl
    );
  }

  const lesson1 = buildLesson("Aula 1", comp.lessonVideo1);
  const lesson2 = buildLesson("Aula 2", comp.lessonVideo2);

  if (lesson1) lessonsWrap.appendChild(lesson1);
  if (lesson2) lessonsWrap.appendChild(lesson2);

  /* --- Example (between Aulas and Cantigas) --- */
  const exampleSection = comp.exampleYoutube
    ? createEl(
        "section",
        { class: "example" },
        createEl("h3", {}, "Exemplo (toque inteiro)"),
        createEl("iframe", {
          src: comp.exampleYoutube,
          allow: "fullscreen",
          loading: "lazy",
          class: "youtube-embed example-embed",
        })
      )
    : null;

  /* --- Cantigas (compact, labeled tiles) --- */
  const cantigasTiles = [];
  if (comp.spotify) {
    cantigasTiles.push(
      createEl(
        "figure",
        { class: "tile" },
        createEl("figcaption", { class: "tile-label" }, "Spotify"),
        createEl("iframe", {
          src: comp.spotify,
          allow:
            "autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture",
          loading: "lazy",
          class: "spotify-embed",
        })
      )
    );
  }
  if (comp.youtube) {
    cantigasTiles.push(
      createEl(
        "figure",
        { class: "tile" },
        createEl("figcaption", { class: "tile-label" }, "YouTube"),
        createEl("iframe", {
          src: comp.youtube,
          allow: "fullscreen",
          loading: "lazy",
          class: "youtube-embed",
        })
      )
    );
  }
  const cantigasSection = cantigasTiles.length
    ? createEl(
        "section",
        { class: "cantigas" },
        createEl("h3", {}, "Cantigas (referências)"),
        ...cantigasTiles
      )
    : null;

  /* --- Lyrics (optional) & Notes (optional) --- */
  const lyricsNode = comp.lyrics
    ? createEl(
        "details",
        { class: "lyrics" },
        createEl("summary", {}, "Letra"),
        createEl("pre", {}, comp.lyrics)
      )
    : null;

  const notesNode = comp.notes
    ? createEl("p", { class: "notes" }, comp.notes)
    : null;

  /* --- Assemble card --- */
  const cardEl = createEl(
    "section",
    {
      class: `composition ${isAlt ? "alt-red" : "alt-white"}`,
      id: anchorId,
    },
    createEl("h2", {}, `${comp.orderInSet}. ${comp.title}`),
    tagRow,

    createEl(
      "section",
      { class: "solfejo" },
      createEl("h3", {}, "Solfejo"),
      solfejoNameNode,
      solfejoAudioNode,
      solfejoImageNode
    ),

    lessonsWrap.childNodes.length
      ? createEl(
          "section",
          { class: "lessons-wrap" },
          createEl("h3", {}, "Aulas"),
          lessonsWrap
        )
      : null,

    exampleSection,
    cantigasSection,
    lyricsNode,
    notesNode
  );

  compositionContainerEl.appendChild(cardEl);
});
