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
    burger.addEventListener("click", function () {
      var open = menu.classList.toggle("is-open");
      burger.classList.toggle("is-open", open);
      burger.setAttribute("aria-expanded", String(open));
      menu.setAttribute("aria-hidden", String(!open));
      document.body.classList.toggle("is-locked", open);
    });
    menu.querySelectorAll("a").forEach(function (a) {
      a.addEventListener("click", function () {
        menu.classList.remove("is-open");
        burger.classList.remove("is-open");
        burger.setAttribute("aria-expanded", "false");
        menu.setAttribute("aria-hidden", "true");
        document.body.classList.remove("is-locked");
      });
    });
  }

  /* ---------- preloader + hero intro ---------- */
  var preloader = document.getElementById("preloader");

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
    var progress = { v: 0 };

    var finish = function () {
      if (hasGSAP && !reduceMotion) {
        gsap.to(preloader, {
          yPercent: -100, duration: 0.8, ease: "power4.inOut", delay: 0.15,
          onComplete: function () { preloader.remove(); },
        });
        heroIntro();
      } else {
        preloader.remove();
        heroIntro();
      }
    };

    if (hasGSAP && !reduceMotion) {
      gsap.to(progress, {
        v: 100, duration: 1.4, ease: "power2.inOut",
        onUpdate: function () {
          var n = Math.round(progress.v);
          count.textContent = (n < 10 ? "0" : "") + n;
          fill.style.transform = "scaleX(" + n / 100 + ")";
        },
        onComplete: finish,
      });
    } else {
      finish();
    }
  } else {
    // portfolio page has no preloader — run intro once fonts settle
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
        opacity: 1, y: 0, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: el, start: "top 88%", once: true },
      });
    });

    // section titles get a masked rise
    document.querySelectorAll(".section-title").forEach(function (el) {
      gsap.from(el, {
        yPercent: 40, opacity: 0, duration: 1, ease: "power3.out",
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
