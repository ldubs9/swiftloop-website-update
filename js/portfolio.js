/* SwiftLoop portfolio — Flip-animated filtering + case-study overlay */
(function () {
  "use strict";

  var hasGSAP = typeof gsap !== "undefined";
  var hasFlip = hasGSAP && typeof Flip !== "undefined";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hasFlip) gsap.registerPlugin(Flip);

  /* ---------- case study data ---------- */
  var CASES = {
    falcon: {
      meta: "E-commerce × AI inventory — Dubai",
      title: "Falcon Timepieces",
      tags: ["Custom e-commerce", "AI inventory", "Luxury watches"],
      brief: "A Dubai luxury watch dealer whose stock moves fast — rare pieces selling across multiple channels, with a catalogue that was always a step behind the safe.",
      built: "A custom storefront with an AI-driven live inventory management system: every piece tracked in real time, listings that update themselves the moment a watch arrives or sells, and a catalogue that always reflects what's actually in stock.",
      stats: [
        ["Live", "inventory sync"],
        ["24/7", "automated updates"],
        ["Real-time", "stock tracking"],
      ],
      url: "https://www.falcontimepiece.com",
    },
    mainspring: {
      meta: "E-commerce × AI inventory — Dubai",
      title: "Mainspring",
      tags: ["Custom e-commerce", "AI inventory", "Watch curation"],
      brief: "A Dubai watch platform positioned as a personal guide to better watches — curation-led, with inventory that turns over quickly and can't afford stale listings.",
      built: "A custom shop with an active AI inventory engine behind it: stock levels, listings and availability manage themselves in real time, so the curation stays the focus.",
      stats: [
        ["Live", "inventory engine"],
        ["24/7", "automated ops"],
        ["Zero", "stale listings"],
      ],
      url: "https://www.mainspring.ae",
    },
    esmeywr: {
      meta: "E-commerce × Cartier configurator — Montréal / Dubai",
      title: "ESM EYWR",
      tags: ["Custom e-commerce", "AI inventory", "Cartier eyewear", "Glasses configurator", "Two showrooms"],
      brief: "An authorized Cartier eyewear dealer running showrooms on two continents — Montréal and Dubai — who needed a unified catalogue and a way for clients to build their perfect frame online.",
      built: "A luxury storefront with AI-managed inventory across both locations, plus a full eyeglasses configurator: 4 lens cut types (Diamond, Standard, White Frost, Clear Ice), 258 frame variations, 13 lens styles and 60 colour/type options — with live pricing that updates as you customise.",
      stats: [
        ["258", "frame variations"],
        ["4", "lens cut types"],
        ["60", "colour options"],
        ["2", "showrooms in sync"],
      ],
      url: "https://www.esmeywr.com",
    },
    velora: {
      meta: "E-commerce × AI inventory — EN / AR",
      title: "Velora Fine Jewelry",
      tags: ["Custom e-commerce", "AI inventory", "Bilingual EN/AR", "Fine jewelry"],
      brief: "A fine-jewelry house with handcrafted collections — rings, necklaces, earrings, bracelets — and a catalogue that had to stay precise across two languages.",
      built: "A bilingual English/Arabic storefront with an AI-managed live inventory system: collections update in real time, with every piece tracked from catalogue to checkout.",
      stats: [
        ["EN/AR", "bilingual storefront"],
        ["4", "collections"],
        ["Live", "inventory sync"],
      ],
      url: "https://www.velorafj.com",
    },
    brrnbarre: {
      meta: "Website × booking — Dubai",
      title: "BRRN BARRE",
      tags: ["Web design", "Class schedules", "Booking", "Fitness brand"],
      brief: "Dubai's infra-heated Pilates, Barre and Reformer studio needed a web presence as intense as the workout — schedules, bookings and brand heat in one place.",
      built: "A bold, high-energy site for the studio: class formats and schedules up front, booking wired straight in, and a look that matches the infrared room.",
      stats: [
        ["3", "class formats"],
        ["Live", "schedules & booking"],
        ["Dubai", "studio"],
      ],
      url: "https://www.brrnbarre.com",
    },
    creativefinishings: {
      meta: "Website × quote generator — Dubai",
      title: "Creative Finishings",
      tags: ["Web design", "Lead generation", "Renovations", "Quote generator"],
      brief: "A Dubai renovation company specialising in vinyl wrapping and flooring — kitchens, bathrooms and offices transformed with zero downtime — needed a site that sells the before-and-after and lets clients price a project on the spot.",
      built: "A conversion-focused site with an integrated wrap estimator: clients select their space, surface area and finish to get an instant ballpark quote — no back-and-forth needed. The estimator feeds qualified leads straight into the pipeline.",
      stats: [
        ["Instant", "wrap estimates"],
        ["Zero", "downtime renovations"],
        ["Resi + com", "spaces covered"],
      ],
      url: "https://www.creativefinishings.com",
    },
    agencyportfolio: {
      meta: "Design proposition",
      title: "Agency Portfolio",
      tags: ["Web design", "Portfolio", "Next.js", "Infinite grid"],
      brief: "A concept for a creative agency portfolio — built around an infinite-scroll grid that lets the work speak first, with details on demand.",
      built: "A Next.js site with a full-bleed infinite grid layout: projects tile seamlessly, each card expands into a detailed case view, and the whole thing feels like browsing a gallery wall.",
      stats: [
        ["Infinite", "grid layout"],
        ["Next.js", "framework"],
        ["Zero", "pagination"],
      ],
      url: "https://gridportfolio.swiftloop.tech",
    },
    coffeeshop: {
      meta: "Design proposition",
      title: "STEEP™ Coffee Shop",
      tags: ["Web design", "Menu system", "Brand identity", "F&B"],
      brief: "A concept for a specialty coffee brand — bold typography, a live clock, and a menu system that feels as crafted as the drinks.",
      built: "A single-page site with a strong brand identity: bold Archivo Black type, a real-time UAE clock in the header, a full interactive menu with categories and pricing, and a dark editorial tone throughout.",
      stats: [
        ["Full", "menu system"],
        ["Live", "UAE clock"],
        ["Bold", "brand identity"],
      ],
      url: "https://steep.swiftloop.tech",
    },
    horizontalportfolio: {
      meta: "Design proposition",
      title: "Horizontal Portfolio",
      tags: ["Web design", "Portfolio", "Next.js", "Agency"],
      brief: "A concept for a design studio portfolio — horizontal scroll, award-style layout, and bold section reveals that make the work feel like a showreel.",
      built: "A Next.js site with horizontal-scroll project showcases, awards ticker, expertise cards and a cinematic hero — built to present creative work with the weight it deserves.",
      stats: [
        ["Horizontal", "scroll layout"],
        ["Next.js", "framework"],
        ["Cinematic", "presentation"],
      ],
      url: "https://horizontalportfolio.swiftloop.tech",
    },
    interiordesigner: {
      meta: "Design proposition",
      title: "Interior Designer",
      tags: ["Web design", "Portfolio", "Next.js", "Residential interiors"],
      brief: "A concept for a residential interior designer — minimal, image-led, built to let the spaces do the talking.",
      built: "A Next.js portfolio with a curated project list: each entry leads with full-width photography, paired with restrained typography and generous whitespace that mirrors the design ethos.",
      stats: [
        ["Image-led", "layout"],
        ["Next.js", "framework"],
        ["Minimal", "aesthetic"],
      ],
      url: "https://khouri.swiftloop.tech",
    },
  };

  /* ---------- filtering (GSAP Flip) ---------- */
  var grid = document.getElementById("folioGrid");
  var cards = Array.prototype.slice.call(document.querySelectorAll(".folio-card"));
  var buttons = document.querySelectorAll(".filter-btn");
  var countEl = document.getElementById("gridCount");

  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var filter = btn.getAttribute("data-filter");
      buttons.forEach(function (b) { b.classList.remove("is-active"); });
      btn.classList.add("is-active");

      var state = hasFlip && !reduceMotion ? Flip.getState(cards) : null;
      var shown = 0;

      cards.forEach(function (card) {
        var cats = card.getAttribute("data-cats").split(" ");
        var show = filter === "all" || cats.indexOf(filter) !== -1;
        card.classList.toggle("is-hidden", !show);
        if (show) shown++;
      });
      if (countEl) countEl.textContent = shown;

      if (state) {
        Flip.from(state, {
          duration: 0.6,
          ease: "power3.inOut",
          stagger: 0.02,
          absolute: true,
          onEnter: function (els) {
            return gsap.fromTo(els, { opacity: 0, scale: 0.92 }, { opacity: 1, scale: 1, duration: 0.5 });
          },
          onLeave: function (els) {
            return gsap.to(els, { opacity: 0, scale: 0.92, duration: 0.35 });
          },
        });
      }
    });
  });

  /* ---------- case overlay ---------- */
  var overlay = document.getElementById("case");
  var closeBtn = document.getElementById("caseClose");
  var scrim = document.getElementById("caseScrim");
  var lastFocus = null;

  function openCase(id, sourceCard) {
    var data = CASES[id];
    if (!data) return;
    lastFocus = document.activeElement;

    document.getElementById("caseMeta").textContent = data.meta;
    document.getElementById("caseTitle").textContent = data.title;

    var tags = document.getElementById("caseTags");
    tags.innerHTML = "";
    data.tags.forEach(function (t) {
      var s = document.createElement("span");
      s.textContent = t;
      tags.appendChild(s);
    });

    // display the portfolio image
    var media = document.getElementById("caseMedia");
    media.innerHTML = "";
    var img = document.createElement("img");
    img.src = "img/portfolio/" + id + ".jpg";
    img.alt = data.title + " portfolio showcase";
    media.appendChild(img);

    document.getElementById("caseBrief").textContent = data.brief;
    document.getElementById("caseBuilt").textContent = data.built;

    var visit = document.getElementById("caseVisit");
    if (visit) {
      if (data.url) {
        visit.href = data.url;
        visit.style.display = "";
      } else {
        visit.style.display = "none";
      }
    }

    var stats = document.getElementById("caseStats");
    stats.innerHTML = "";
    data.stats.forEach(function (pair) {
      var d = document.createElement("div");
      var b = document.createElement("b");
      b.textContent = pair[0];
      var s = document.createElement("span");
      s.textContent = pair[1];
      d.appendChild(b);
      d.appendChild(s);
      stats.appendChild(d);
    });

    overlay.classList.add("is-open");
    document.body.classList.add("is-locked");
    closeBtn.focus();

    if (hasGSAP && !reduceMotion) {
      gsap.fromTo(".case-body > div",
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.6, stagger: 0.08, delay: 0.3, ease: "power3.out" });
    }
  }

  function closeCase() {
    overlay.classList.remove("is-open");
    document.body.classList.remove("is-locked");
    if (lastFocus) lastFocus.focus();
  }

  cards.forEach(function (card) {
    card.addEventListener("click", function () {
      openCase(card.getAttribute("data-project"), card);
    });
  });

  closeBtn.addEventListener("click", closeCase);
  scrim.addEventListener("click", closeCase);
  document.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && overlay.classList.contains("is-open")) closeCase();
  });

  /* deep links: portfolio.html#ferra opens the case */
  var hash = location.hash.replace("#", "");
  if (hash && CASES[hash]) {
    var target = document.getElementById(hash);
    if (target) {
      setTimeout(function () {
        target.scrollIntoView({ block: "center" });
        openCase(hash, target);
      }, 400);
    }
  }
})();
