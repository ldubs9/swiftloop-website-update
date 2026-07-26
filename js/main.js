/* SwiftLoop — shared interactions: preloader, nav, reveals, counters */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var hasGSAP = typeof gsap !== "undefined";

  if (hasGSAP && typeof ScrollTrigger !== "undefined") {
    gsap.registerPlugin(ScrollTrigger);
  }
  if (!hasGSAP || reduceMotion) {
    document.documentElement.classList.add("gsap-off");
  }

  /* ---------- nav scroll state ---------- */
  var nav = document.getElementById("nav");
  function onScroll() {
    nav.classList.toggle("is-scrolled", window.scrollY > 40);
  }
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();

  /* ---------- mobile menu ---------- */
  var burger = document.getElementById("burger");
  var menu = document.getElementById("menu");
  if (burger && menu) {
    var setMenu = function (open, returnFocus) {
      menu.classList.toggle("is-open", open);
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
      if (open) {
        var first = menu.querySelector("a");
        if (first) first.focus();
      } else if (returnFocus) {
        burger.focus();
      }
    };

    burger.addEventListener("click", function () {
      setMenu(!menu.classList.contains("is-open"), true);
    });

    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () { setMenu(false, false); });
    });

    // escape closes it; tab stays inside while it owns the screen
    document.addEventListener("keydown", function (e) {
      if (!menu.classList.contains("is-open")) return;
      if (e.key === "Escape") { setMenu(false, true); return; }
      if (e.key !== "Tab") return;
      var stops = [burger].concat(Array.prototype.slice.call(menu.querySelectorAll("a")));
      var first = stops[0];
      var last = stops[stops.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- preloader + hero intro ---------- */
  var preloader = document.getElementById("preloader");

  // revisit within the same session (flag set inline in <head>): skip the preloader
  if (preloader && document.documentElement.classList.contains("sl-revisit")) {
    preloader.remove();
    preloader = null;
  }

  function heroIntro() {
    if (!hasGSAP || reduceMotion) return;
    var lines = document.querySelectorAll(".hero .line-mask > span, .folio-hero .line-mask > span");
    if (lines.length) {
      gsap.fromTo(lines,
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: "power4.out", stagger: 0.09, delay: 0.05 }
      );
    }
    var heroReveals = document.querySelectorAll(".hero .gs-reveal, .folio-hero .gs-reveal");
    if (heroReveals.length) {
      gsap.to(heroReveals, {
        opacity: 1, y: 0, duration: 0.9, ease: "power3.out", stagger: 0.08, delay: 0.55,
      });
    }
  }

  if (preloader) {
    var fill = document.getElementById("preloaderFill");
    var count = document.getElementById("preloaderCount");
    var done = false;

    var finish = function () {
      if (done) return;
      done = true;
      if (hasGSAP && !reduceMotion) {
        gsap.to(preloader, {
          yPercent: -100, duration: 0.7, ease: "power4.inOut",
          onComplete: function () { preloader.remove(); },
        });
        heroIntro();
      } else {
        preloader.remove();
        heroIntro();
      }
    };

    if (hasGSAP && !reduceMotion) {
      var render = function (n) {
        n = Math.round(n);
        count.textContent = (n < 10 ? "0" : "") + n;
        fill.style.transform = "scaleX(" + n / 100 + ")";
      };

      // The bar tracks real readiness: it crawls to 90 while fonts and the
      // first paint settle, then runs to 100 the moment they land. A hard
      // ceiling keeps a stalled font or a throttled tab from trapping anyone
      // behind the curtain.
      var progress = { v: 0 };
      var crawl = gsap.to(progress, {
        v: 90, duration: 2.2, ease: "power2.out",
        onUpdate: function () { render(progress.v); },
      });

      var released = false;
      var release = function () {
        if (released) return;
        released = true;
        crawl.kill();
        gsap.to(progress, {
          v: 100, duration: 0.35, ease: "power2.out",
          onUpdate: function () { render(progress.v); },
          onComplete: finish,
        });
      };

      var ready = document.fonts && document.fonts.ready
        ? document.fonts.ready
        : Promise.resolve();
      var minShown = new Promise(function (r) { setTimeout(r, 550); });

      Promise.all([ready, minShown]).then(release);

      // Last resort. A stalled font, a paused rAF or a backgrounded tab must
      // never leave anyone behind the curtain, so this drops it outright
      // instead of animating — the animation is the thing that may be stuck.
      setTimeout(function () {
        if (done) return;
        done = true;
        // no intro here: the masked rise is the thing that may be stuck, and
        // the untouched CSS state is already the finished one
        document.documentElement.classList.add("gsap-off");
        preloader.remove();
      }, 3200);
    } else {
      finish();
    }
  } else {
    // no preloader (portfolio page, or skipped on revisit) — run intro once fonts settle
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(heroIntro);
    } else {
      heroIntro();
    }
  }

  /* ---------- scroll reveals ---------- */
  if (hasGSAP && typeof ScrollTrigger !== "undefined" && !reduceMotion) {
    document.querySelectorAll(".gs-reveal").forEach(function (el) {
      if (el.closest(".hero") || el.closest(".folio-hero")) return; // handled by intro
      gsap.to(el, {
        opacity: 1, y: 0, duration: 0.7, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // section titles get a masked rise
    document.querySelectorAll(".section-title").forEach(function (el) {
      gsap.from(el, {
        yPercent: 18, opacity: 0, duration: 0.9, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 90%", once: true },
      });
    });

    // CTA title lines
    document.querySelectorAll(".cta .line-mask > span").forEach(function (el, i) {
      gsap.fromTo(el, { yPercent: 110 }, {
        yPercent: 0, duration: 1, ease: "power4.out", delay: i * 0.08,
        scrollTrigger: { trigger: el.closest(".cta"), start: "top 75%", once: true },
      });
    });
  } else {
    // no GSAP / reduced motion: make everything visible
    document.querySelectorAll(".gs-reveal").forEach(function (el) {
      el.style.opacity = 1;
      el.style.transform = "none";
    });
  }

  /* ---------- metric counters ---------- */
  var metrics = document.querySelectorAll("[data-count]");
  if (metrics.length) {
    var animateCount = function (el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var decimals = parseInt(el.getAttribute("data-decimals") || "0", 10);
      var suffix = el.getAttribute("data-suffix") || "";
      var render = function (v) {
        var txt = decimals ? v.toFixed(decimals) : Math.round(v).toLocaleString("en-US");
        el.innerHTML = txt + (suffix ? "<sup>" + suffix + "</sup>" : "");
      };
      if (hasGSAP && !reduceMotion) {
        var obj = { v: 0 };
        gsap.to(obj, {
          v: target, duration: 1.8, ease: "power2.out",
          onUpdate: function () { render(obj.v); },
          scrollTrigger: { trigger: el, start: "top 90%", once: true },
        });
      } else {
        render(target);
      }
    };
    metrics.forEach(animateCount);
  }
})();
