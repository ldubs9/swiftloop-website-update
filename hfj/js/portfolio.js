// HFJ collection — filters, staggered entrance, lightbox
(function () {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pieces = Array.from(document.querySelectorAll('.piece'));
  const filters = document.querySelectorAll('.filter');
  const empty = document.getElementById('galleryEmpty');

  // entrance
  gsap.fromTo(pieces,
    { y: 40, opacity: 0 },
    { y: 0, opacity: 1, duration: reduced ? 0 : 0.9, stagger: 0.06, ease: 'power3.out', delay: 0.6 }
  );

  function applyFilter(cat) {
    let shown = 0;
    pieces.forEach((p) => {
      const match = cat === 'all' || p.dataset.cat === cat;
      p.classList.toggle('is-hidden', !match);
      if (match) shown++;
    });
    empty.hidden = shown > 0;
    const visible = pieces.filter((p) => !p.classList.contains('is-hidden'));
    gsap.fromTo(visible,
      { y: 24, opacity: 0 },
      { y: 0, opacity: 1, duration: reduced ? 0 : 0.6, stagger: 0.045, ease: 'power3.out' }
    );
  }

  filters.forEach((btn) => {
    btn.addEventListener('click', () => {
      filters.forEach((b) => {
        b.classList.toggle('is-active', b === btn);
        b.setAttribute('aria-selected', String(b === btn));
      });
      applyFilter(btn.dataset.filter);
    });
  });

  // deep links: portfolio.html#beads selects the matching filter
  const hash = window.location.hash.slice(1);
  const hashBtn = hash && document.querySelector(`.filter[data-filter="${hash}"]`);
  if (hashBtn) hashBtn.click();

  // ——— lightbox
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightboxImg');
  const lbCaption = document.getElementById('lightboxCaption');
  const lbClose = document.getElementById('lightboxClose');
  let lastFocus = null;

  function openLightbox(trigger) {
    const img = trigger.querySelector('img');
    const info = trigger.closest('.piece').querySelector('.piece-info');
    lbImg.src = img.src;
    lbImg.alt = img.alt;
    lbCaption.textContent = info.querySelector('h3').textContent + ' — ' + info.querySelector('.piece-spec').textContent;
    lightbox.classList.add('is-open');
    lightbox.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    lastFocus = trigger;
    lbClose.focus();
  }
  function closeLightbox() {
    lightbox.classList.remove('is-open');
    lightbox.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    if (lastFocus) lastFocus.focus();
  }

  document.querySelectorAll('[data-lightbox]').forEach((btn) => {
    btn.addEventListener('click', () => openLightbox(btn));
  });
  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', (e) => { if (e.target === lightbox) closeLightbox(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && lightbox.classList.contains('is-open')) closeLightbox();
  });
})();
