/* SwiftLoop Journal — listing: Supabase fetch, Flip filtering, search, reveals */
(function () {
  "use strict";

  var hasGSAP = typeof gsap !== "undefined";
  var hasFlip = hasGSAP && typeof Flip !== "undefined";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hasFlip) gsap.registerPlugin(Flip);

  var grid = document.getElementById("jrGrid");
  var featuredWrap = document.getElementById("jrFeatured");
  var filtersWrap = document.getElementById("jrFilters");
  var searchInput = document.getElementById("jrSearch");
  var countEl = document.getElementById("jrCount");
  var footCount = document.getElementById("jrFootCount");

  var ALL = [];
  var activeCat = "all";
  var query = "";

  /* ---------- helpers ---------- */
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
    } catch (e) {
      return "";
    }
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function metaRow(a) {
    return (
      '<span class="cat">' + esc(a.category) + "</span>" +
      '<i class="dot"></i><span>' + fmtDate(a.published_at) + "</span>" +
      (a.read_time ? '<i class="dot"></i><span>' + esc(a.read_time) + "</span>" : "")
    );
  }

  function stateBlock(title, html) {
    grid.innerHTML = '<div class="jr-state"><h3>' + esc(title) + "</h3>" + (html || "") + "</div>";
  }

  /* ---------- render ---------- */
  function renderFeatured(a) {
    if (!a) return;
    var el = document.createElement("a");
    el.className = "jr-featured-card";
    el.href = "/journal/" + a.slug;
    el.innerHTML =
      '<div class="jr-featured-media">' +
        '<span class="jr-featured-flag">Latest</span>' +
        (a.image ? '<img src="' + esc(a.image) + '" alt="' + esc(a.image_alt || a.title) + '" loading="eager" />' : "") +
      "</div>" +
      '<div class="jr-featured-body">' +
        '<div class="jr-meta">' + metaRow(a) + "</div>" +
        "<h2>" + esc(a.title) + "</h2>" +
        "<p>" + esc(a.description) + "</p>" +
        '<span class="btn btn--ghost">Read the entry <span class="arrow">→</span></span>' +
      "</div>";
    featuredWrap.innerHTML = "";
    featuredWrap.appendChild(el);
    if (hasGSAP && !reduceMotion) {
      gsap.from(el, { opacity: 0, y: 40, duration: 0.9, ease: "power3.out" });
    }
  }

  function cardMarkup(a, i) {
    var num = String(i + 1).padStart(2, "0");
    return (
      '<a class="jr-card" href="/journal/' + a.slug + '" data-cat="' + esc(a.category) +
        '" data-search="' + esc((a.title + " " + a.description + " " + a.category + " " + (a.keywords || []).join(" ")).toLowerCase()) + '">' +
        '<div class="jr-card-media">' +
          '<span class="jr-card-index">' + num + " / " + ALL.length + "</span>" +
          (a.image ? '<img src="' + esc(a.image) + '" alt="' + esc(a.image_alt || a.title) + '" loading="lazy" />' : "") +
        "</div>" +
        '<div class="jr-card-body">' +
          '<div class="jr-meta">' + metaRow(a) + "</div>" +
          "<h3>" + esc(a.title) + "</h3>" +
          "<p>" + esc(a.description) + "</p>" +
        "</div>" +
      "</a>"
    );
  }

  function renderGrid(list) {
    grid.innerHTML = list.map(cardMarkup).join("");
    revealCards();
    if (hasGSAP && typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  function revealCards() {
    if (!hasGSAP || reduceMotion || typeof ScrollTrigger === "undefined") return;
    var cards = grid.querySelectorAll(".jr-card");
    gsap.set(cards, { opacity: 0, y: 36 });
    ScrollTrigger.batch(cards, {
      start: "top 92%",
      onEnter: function (batch) {
        gsap.to(batch, { opacity: 1, y: 0, duration: 0.7, ease: "power3.out", stagger: 0.06, overwrite: true });
      },
    });
  }

  function buildFilters() {
    var counts = { all: ALL.length };
    ALL.forEach(function (a) { counts[a.category] = (counts[a.category] || 0) + 1; });
    var cats = Object.keys(counts).filter(function (c) { return c !== "all"; }).sort();
    var html = '<button class="filter-btn is-active" data-filter="all">All<sup>' + counts.all + "</sup></button>";
    cats.forEach(function (c) {
      html += '<button class="filter-btn" data-filter="' + esc(c) + '">' + esc(c) + "<sup>" + counts[c] + "</sup></button>";
    });
    filtersWrap.innerHTML = html;
    filtersWrap.querySelectorAll(".filter-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        filtersWrap.querySelectorAll(".filter-btn").forEach(function (b) { b.classList.remove("is-active"); });
        btn.classList.add("is-active");
        activeCat = btn.getAttribute("data-filter");
        applyFilter();
      });
    });
  }

  function applyFilter() {
    var cards = Array.prototype.slice.call(grid.querySelectorAll(".jr-card"));
    if (!cards.length) return;
    var state = hasFlip && !reduceMotion ? Flip.getState(cards) : null;
    var shown = 0;
    cards.forEach(function (card) {
      var matchCat = activeCat === "all" || card.getAttribute("data-cat") === activeCat;
      var matchQuery = !query || card.getAttribute("data-search").indexOf(query) !== -1;
      var show = matchCat && matchQuery;
      card.classList.toggle("is-hidden", !show);
      if (show) shown++;
    });

    if (footCount) footCount.innerHTML = "Showing <b>" + shown + "</b> of " + ALL.length + " entries";

    if (state) {
      Flip.from(state, {
        duration: 0.55, ease: "power3.inOut", stagger: 0.015, absolute: true,
        onEnter: function (els) { return gsap.fromTo(els, { opacity: 0, scale: 0.94 }, { opacity: 1, scale: 1, duration: 0.45 }); },
        onLeave: function (els) { return gsap.to(els, { opacity: 0, scale: 0.94, duration: 0.3 }); },
      });
    }

    if (shown === 0) {
      var existing = grid.querySelector(".jr-state");
      if (!existing) {
        var d = document.createElement("div");
        d.className = "jr-state jr-empty";
        d.innerHTML = "<h3>Nothing here yet</h3><p>No entries match that filter. Try another topic or clear your search.</p>";
        grid.appendChild(d);
      }
    } else {
      var empty = grid.querySelector(".jr-empty");
      if (empty) empty.remove();
    }
  }

  function countUp(n) {
    if (!countEl) return;
    if (!hasGSAP || reduceMotion) { countEl.textContent = n; return; }
    var obj = { v: 0 };
    gsap.to(obj, { v: n, duration: 1.4, ease: "power2.out", onUpdate: function () { countEl.textContent = Math.round(obj.v); } });
  }

  /* ---------- search ---------- */
  if (searchInput) {
    var t;
    searchInput.addEventListener("input", function () {
      clearTimeout(t);
      t = setTimeout(function () { query = searchInput.value.trim().toLowerCase(); applyFilter(); }, 140);
    });
  }

  /* ---------- load ---------- */
  function notConfigured() {
    featuredWrap.innerHTML = "";
    stateBlock("Connect Supabase to go live", "<p>Add your project URL and anon key in <code>/js/supabase-config.js</code>, then run <code>supabase/schema.sql</code> and <code>supabase/seed.sql</code>. The journal reads published entries automatically.</p>");
    if (footCount) footCount.textContent = "";
  }

  function load() {
    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || cfg.url.indexOf("YOUR-") !== -1 || typeof supabase === "undefined") {
      notConfigured();
      return;
    }
    var client = supabase.createClient(cfg.url, cfg.anonKey);
    client
      .from("swiftloop_articles")
      .select("slug,title,description,category,keywords,read_time,image,image_alt,published_at,featured")
      .eq("published", true)
      .lte("published_at", new Date().toISOString()) // hide scheduled (future-dated) posts until live
      .order("published_at", { ascending: false })
      .then(function (res) {
        if (res.error) { stateBlock("Couldn't load the journal", "<p>" + esc(res.error.message) + "</p>"); return; }
        ALL = res.data || [];
        if (!ALL.length) { stateBlock("No entries yet", "<p>Run <code>supabase/seed.sql</code> to publish the journal.</p>"); return; }

        countUp(ALL.length);
        var featured = ALL.filter(function (a) { return a.featured; })[0] || ALL[0];
        renderFeatured(featured);
        // grid excludes the featured entry
        var rest = ALL.filter(function (a) { return a.slug !== featured.slug; });
        renderGrid(rest);
        buildFilters();
        if (footCount) footCount.innerHTML = "Showing <b>" + rest.length + "</b> of " + ALL.length + " entries";
      })
      .catch(function (err) {
        stateBlock("Couldn't load the journal", "<p>" + esc(err && err.message ? err.message : String(err)) + "</p>");
      });
  }

  load();
})();
