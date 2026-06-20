/* SwiftLoop Journal — single article: Supabase fetch, markdown render, progress, related */
(function () {
  "use strict";

  var hasGSAP = typeof gsap !== "undefined";
  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (hasGSAP && typeof ScrollTrigger !== "undefined") gsap.registerPlugin(ScrollTrigger);

  var ORIGIN = "https://swiftloop.tech";

  /* ---------- slug ---------- */
  function getSlug() {
    var m = location.pathname.match(/\/journal\/([^/?#]+)/);
    if (m) return decodeURIComponent(m[1]);
    return new URLSearchParams(location.search).get("slug");
  }

  /* ---------- helpers ---------- */
  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
  }
  function fmtDate(iso) {
    try {
      return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric" }).format(new Date(iso));
    } catch (e) { return ""; }
  }
  function setMeta(id, attr, val) {
    var el = document.getElementById(id);
    if (el) el.setAttribute(attr, val);
  }

  /* ---------- read progress ---------- */
  var bar = document.getElementById("readProgress");
  function onScroll() {
    var h = document.documentElement;
    var max = h.scrollHeight - h.clientHeight;
    var p = max > 0 ? Math.min(1, h.scrollTop / max) : 0;
    bar.style.transform = "scaleX(" + p + ")";
  }
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- render ---------- */
  function renderArticle(a) {
    var url = ORIGIN + "/journal/" + a.slug;

    // <head> + SEO
    document.title = a.title + " — SwiftLoop Journal";
    setMeta("metaDesc", "content", a.description || "");
    setMeta("metaCanonical", "href", url);
    setMeta("ogTitle", "content", a.title);
    setMeta("ogDesc", "content", a.description || "");
    setMeta("ogUrl", "content", url);
    if (a.image) { setMeta("ogImage", "content", a.image); setMeta("twImage", "content", a.image); }
    setMeta("twTitle", "content", a.title);

    var ld = document.getElementById("articleJsonLd");
    if (ld) {
      ld.textContent = JSON.stringify({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: a.title,
        description: a.description || "",
        image: a.image ? [a.image] : undefined,
        datePublished: a.published_at,
        dateModified: a.updated_at || a.published_at,
        articleSection: a.category,
        keywords: (a.keywords || []).join(", "),
        url: url,
        mainEntityOfPage: { "@type": "WebPage", "@id": url },
        author: { "@type": "Organization", name: "SwiftLoop" },
        publisher: { "@type": "Organization", name: "SwiftLoop", url: ORIGIN + "/" },
      });
    }

    // meta row
    document.getElementById("artMeta").innerHTML =
      '<span class="cat">' + esc(a.category) + "</span>" +
      '<i class="dot"></i><span>' + fmtDate(a.published_at) + "</span>" +
      (a.read_time ? '<i class="dot"></i><span>' + esc(a.read_time) + "</span>" : "");

    // title (masked reveal)
    var titleEl = document.getElementById("artTitle");
    titleEl.innerHTML = '<span class="line-mask"><span>' + esc(a.title) + "</span></span>";

    // lede
    document.getElementById("artLede").textContent = a.description || "";

    // hero image
    if (a.image) {
      var fig = document.getElementById("artFigure");
      var img = document.getElementById("artImage");
      img.src = a.image;
      img.alt = a.image_alt || a.title;
      fig.hidden = false;
    }

    // body (markdown)
    var bodyEl = document.getElementById("artBody");
    if (typeof marked !== "undefined") {
      marked.setOptions({ breaks: false, gfm: true });
      bodyEl.innerHTML = marked.parse(a.body || "");
    } else {
      bodyEl.textContent = a.body || "";
    }

    // share
    var enc = encodeURIComponent;
    setMeta("shareX", "href", "https://twitter.com/intent/tweet?text=" + enc(a.title) + "&url=" + enc(url));
    setMeta("shareLn", "href", "https://www.linkedin.com/sharing/share-offsite/?url=" + enc(url));
    setMeta("shareWa", "href", "https://wa.me/?text=" + enc(a.title + " " + url));
    var copyBtn = document.getElementById("shareCopy");
    if (copyBtn) {
      copyBtn.addEventListener("click", function () {
        navigator.clipboard && navigator.clipboard.writeText(url).then(function () {
          var prev = copyBtn.textContent; copyBtn.textContent = "✓";
          setTimeout(function () { copyBtn.textContent = prev; }, 1400);
        });
      });
    }
    document.getElementById("artEnd").hidden = false;

    // intro animations
    if (hasGSAP && !reduceMotion) {
      var line = titleEl.querySelector(".line-mask > span");
      gsap.fromTo(line, { yPercent: 110 }, { yPercent: 0, duration: 1.05, ease: "power4.out" });
      gsap.fromTo("#artMeta, #artLede", { opacity: 0, y: 18 }, { opacity: 1, y: 0, duration: 0.8, ease: "power3.out", stagger: 0.1, delay: 0.15 });
      if (a.image && typeof ScrollTrigger !== "undefined") {
        gsap.fromTo("#artFigure", { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: "power3.out", delay: 0.25 });
        gsap.to("#artImage", {
          yPercent: 12, ease: "none",
          scrollTrigger: { trigger: "#artFigure", start: "top bottom", end: "bottom top", scrub: true },
        });
      }
    }

    onScroll();
    loadRelated(a);
  }

  function relatedCard(a) {
    return (
      '<a class="jr-card" href="/journal/' + a.slug + '">' +
        '<div class="jr-card-media">' +
          (a.image ? '<img src="' + esc(a.image) + '" alt="' + esc(a.image_alt || a.title) + '" loading="lazy" />' : "") +
        "</div>" +
        '<div class="jr-card-body">' +
          '<div class="jr-meta"><span class="cat">' + esc(a.category) + '</span>' +
            (a.read_time ? '<i class="dot"></i><span>' + esc(a.read_time) + "</span>" : "") + "</div>" +
          "<h3>" + esc(a.title) + "</h3>" +
        "</div>" +
      "</a>"
    );
  }

  function loadRelated(a) {
    var client = window._slClient;
    if (!client) return;
    client
      .from("swiftloop_articles")
      .select("slug,title,category,read_time,image,image_alt,published_at")
      .eq("published", true)
      .lte("published_at", new Date().toISOString())
      .eq("category", a.category)
      .neq("slug", a.slug)
      .order("published_at", { ascending: false })
      .limit(3)
      .then(function (res) {
        var list = (res.data || []);
        if (!list.length) return;
        document.getElementById("relatedGrid").innerHTML = list.map(relatedCard).join("");
        document.getElementById("related").hidden = false;
        if (hasGSAP && !reduceMotion) {
          gsap.from("#relatedGrid .jr-card", { opacity: 0, y: 30, duration: 0.7, ease: "power3.out", stagger: 0.08,
            scrollTrigger: { trigger: "#related", start: "top 85%", once: true } });
        }
      });
  }

  function fail(title, msg) {
    document.getElementById("artTitle").innerHTML = '<span class="line-mask"><span>' + esc(title) + "</span></span>";
    document.getElementById("artBody").innerHTML =
      "<p style='color:var(--bone-dim)'>" + esc(msg) + ' Head back to the <a href="/journal" style="color:var(--accent)">journal</a>.</p>';
  }

  /* ---------- load ---------- */
  function load() {
    var slug = getSlug();
    if (!slug) { fail("No entry selected", "We couldn't tell which entry to open."); return; }

    var cfg = window.SUPABASE_CONFIG || {};
    if (!cfg.url || !cfg.anonKey || cfg.url.indexOf("YOUR-") !== -1 || typeof supabase === "undefined") {
      fail("Connect Supabase", "Add your project URL and anon key in /js/supabase-config.js, then run the schema and seed SQL.");
      return;
    }

    var client = supabase.createClient(cfg.url, cfg.anonKey);
    window._slClient = client;
    client
      .from("swiftloop_articles")
      .select("*")
      .eq("slug", slug)
      .eq("published", true)
      .lte("published_at", new Date().toISOString()) // scheduled posts aren't reachable until live
      .single()
      .then(function (res) {
        if (res.error || !res.data) { fail("Entry not found", "That entry isn't published (yet)."); return; }
        renderArticle(res.data);
      })
      .catch(function (err) { fail("Something went wrong", err && err.message ? err.message : String(err)); });
  }

  load();
})();
