// HFJ — shared interactions: preloader, nav, reveals, counters
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  gsap.registerPlugin(ScrollTrigger);

  // ——— preloader (index only)
  const preloader = document.getElementById('preloader');
  const countEl = document.getElementById('preloaderCount');

  function heroIn() {
    const masks = document.querySelectorAll('.hero-title .line-mask > span, .phero-title .line-mask > span');
    if (masks.length) {
      gsap.to(masks, {
        y: 0, duration: reduced ? 0 : 1.1, stagger: 0.12,
        ease: 'power4.out', delay: 0.1,
      });
    }
    const heroReveals = document.querySelectorAll('.hero .gs-reveal, .phero .gs-reveal, .filters');
    gsap.fromTo(heroReveals,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: reduced ? 0 : 0.9, stagger: 0.1, ease: 'power3.out', delay: 0.5 }
    );
  }

  if (preloader && countEl && !reduced) {
    document.body.style.overflow = 'hidden';
    const counter = { v: 0 };
    gsap.to(counter, {
      v: 100, duration: 1.4, ease: 'power2.inOut',
      onUpdate: () => { countEl.textContent = String(Math.round(counter.v)).padStart(2, '0'); },
      onComplete: () => {
        gsap.to(preloader, {
          yPercent: -100, duration: 0.9, ease: 'power4.inOut',
          onComplete: () => { preloader.remove(); document.body.style.overflow = ''; },
        });
        heroIn();
      },
    });
  } else {
    if (preloader) preloader.remove();
    heroIn();
  }

  // ——— nav scroll state
  const nav = document.getElementById('nav');
  const onScroll = () => nav.classList.toggle('is-scrolled', window.scrollY > 30);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ——— mobile menu
  const burger = document.getElementById('burger');
  const menu = document.getElementById('menu');
  if (burger && menu) {
    const setOpen = (open) => {
      burger.classList.toggle('is-open', open);
      menu.classList.toggle('is-open', open);
      burger.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      document.body.style.overflow = open ? 'hidden' : '';
    };
    burger.addEventListener('click', () => setOpen(!burger.classList.contains('is-open')));
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => setOpen(false)));
  }

  // ——— scroll reveals (everything outside the hero)
  document.querySelectorAll('.gs-reveal').forEach((el) => {
    if (el.closest('.hero') || el.closest('.phero')) return;
    gsap.fromTo(el,
      { y: 36, opacity: 0 },
      {
        y: 0, opacity: 1, duration: reduced ? 0 : 1, ease: 'power3.out',
        scrollTrigger: { trigger: el, start: 'top 88%' },
      }
    );
  });

  // ——— CTA title masks on scroll
  document.querySelectorAll('.cta-title .line-mask > span').forEach((span) => {
    gsap.to(span, {
      y: 0, duration: reduced ? 0 : 1, ease: 'power4.out',
      scrollTrigger: { trigger: span.closest('.cta-title'), start: 'top 85%' },
    });
  });

  // ——— metric counters
  document.querySelectorAll('.metric b[data-count]').forEach((el) => {
    const end = parseFloat(el.dataset.count);
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const suffix = el.dataset.suffix || '';
    const obj = { v: 0 };
    gsap.to(obj, {
      v: end, duration: reduced ? 0 : 1.8, ease: 'power2.out',
      scrollTrigger: { trigger: el, start: 'top 90%' },
      onUpdate: () => { el.textContent = obj.v.toFixed(decimals) + suffix; },
      onComplete: () => { el.textContent = end.toFixed(decimals) + suffix; },
    });
  });
})();
