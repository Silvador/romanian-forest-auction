// Lenis smooth scroll
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches && typeof Lenis !== 'undefined') {
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
  });
  function raf(time) {
    lenis.raf(time);
    requestAnimationFrame(raf);
  }
  requestAnimationFrame(raf);
}

// Scroll reveal
const revealItems = document.querySelectorAll('.reveal');

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry, index) => {
      if (entry.isIntersecting) {
        entry.target.style.transitionDelay = `${Math.min(index * 70, 280)}ms`;
        entry.target.classList.add('is-visible');
        revealObserver.unobserve(entry.target);
      }
    });
  },
  {
    threshold: 0.16,
    rootMargin: '0px 0px -8% 0px'
  }
);

revealItems.forEach((item) => revealObserver.observe(item));

// Staggered reveal for data-strip cards
const dataStripCards = document.querySelectorAll('.data-strip__card');
const dataStripObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        dataStripCards.forEach((card, i) => {
          setTimeout(() => card.classList.add('is-visible'), i * 100);
        });
        dataStripObserver.disconnect();
      }
    });
  },
  { threshold: 0.2 }
);
if (dataStripCards.length) {
  dataStripObserver.observe(dataStripCards[0].parentElement);
}

// Cursor-tracking on phone triptych + showcase mockup
if (window.matchMedia('(pointer: fine)').matches) {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Showcase sections — scroll-triggered animation
  // (handled by IntersectionObserver below)

  // Showcase mockup tilt
  const showcase = document.getElementById('showcase-mockup');
  if (showcase) {
    let sX = 0, sY = 0, scX = 0, scY = 0;
    document.addEventListener('mousemove', (e) => {
      const rect = showcase.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      sX = clamp((e.clientX - cx) / (window.innerWidth / 2) * 5, -5, 5);
      sY = clamp(-(e.clientY - cy) / (window.innerHeight / 2) * 3, -3, 3);
    });
    (function animShowcase() {
      scX += (sX - scX) * 0.06;
      scY += (sY - scY) * 0.06;
      showcase.style.transform = `perspective(1200px) rotateY(${scX - 4}deg) rotateX(${scY + 2}deg)`;
      requestAnimationFrame(animShowcase);
    })();
  }
}

// Header scroll effect
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (!header) return;
  header.style.background = window.scrollY > 30
    ? 'linear-gradient(180deg, rgba(26, 29, 26, 0.92), rgba(26, 29, 26, 0.7))'
    : 'linear-gradient(180deg, rgba(26, 29, 26, 0.72), rgba(26, 29, 26, 0.38))';
});

// Showcase scroll-triggered reveals
const showcaseSections = document.querySelectorAll('.showcase');
const showcaseObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        showcaseObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.15, rootMargin: '0px 0px -5% 0px' }
);
showcaseSections.forEach((s) => showcaseObserver.observe(s));

// Reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.showcase-enter-left, .showcase-enter-right').forEach(el => {
    el.style.opacity = '1';
    el.style.transform = 'none';
    el.style.transition = 'none';
  });
}

// ===== Bento Effect System =====
// Modular: each effect is a standalone function, toggled via config.
(function initBento() {
  var grid = document.querySelector('[data-bento]');
  if (!grid) return;

  var cards = Array.prototype.slice.call(grid.querySelectorAll('[data-bento-card]'));
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touch = window.matchMedia('(pointer: coarse)').matches;

  // Config — toggle any effect on/off
  var fx = {
    spotlight: true,
    borderGlow: true,
    tilt: !touch && !reduced,
    magnetism: !touch && !reduced,
    ripple: !reduced,
    particles: !reduced
  };

  // Smooth interpolation state per card
  var state = cards.map(function() {
    return { mx: 0, my: 0, tx: 0, ty: 0, rx: 0, ry: 0, active: false };
  });

  // --- Particles ---
  if (fx.particles) {
    cards.forEach(function(card) {
      var wrap = document.createElement('div');
      wrap.className = 'bento__particles';
      wrap.setAttribute('aria-hidden', 'true');
      for (var i = 0; i < 8; i++) {
        var d = document.createElement('span');
        d.className = 'bento__dot';
        var s = 1.5 + Math.random() * 2;
        d.style.width = s + 'px';
        d.style.height = s + 'px';
        d.style.top = (15 + Math.random() * 70) + '%';
        d.style.left = (15 + Math.random() * 70) + '%';
        d.style.setProperty('--dur', (2.5 + Math.random() * 2) + 's');
        d.style.setProperty('--del', (Math.random() * 1) + 's');
        d.style.setProperty('--dx', (-30 + Math.random() * 60) + 'px');
        d.style.setProperty('--dy', (-30 + Math.random() * 60) + 'px');
        wrap.appendChild(d);
      }
      card.appendChild(wrap);
    });
  }

  // --- Pointer tracking (spotlight, border glow, tilt, magnetism) ---
  if (touch) return;

  var lerp = function(a, b, t) { return a + (b - a) * t; };
  var raf;

  function tick() {
    cards.forEach(function(card, i) {
      var s = state[i];

      // Smooth interpolation
      s.mx = lerp(s.mx, s.tx, 0.12);
      s.my = lerp(s.my, s.ty, 0.12);
      s.rx = lerp(s.rx, s.active ? (s.ty / card.offsetHeight - 0.5) * -6 : 0, 0.08);
      s.ry = lerp(s.ry, s.active ? (s.tx / card.offsetWidth - 0.5) * 6 : 0, 0.08);

      // Spotlight + border glow position
      card.style.setProperty('--mx', s.mx + 'px');
      card.style.setProperty('--my', s.my + 'px');

      // Tilt
      if (fx.tilt) {
        var magX = fx.magnetism ? (s.tx / card.offsetWidth - 0.5) * 3 : 0;
        var magY = fx.magnetism ? (s.ty / card.offsetHeight - 0.5) * 2 : 0;
        card.style.transform = s.active
          ? 'perspective(800px) rotateX(' + s.rx.toFixed(2) + 'deg) rotateY(' + s.ry.toFixed(2) + 'deg) translate(' + magX.toFixed(1) + 'px,' + magY.toFixed(1) + 'px)'
          : '';
      }
    });
    raf = requestAnimationFrame(tick);
  }

  raf = requestAnimationFrame(tick);

  cards.forEach(function(card, i) {
    card.addEventListener('pointerenter', function() {
      state[i].active = true;
      card.setAttribute('data-active', '');
    });

    card.addEventListener('pointermove', function(e) {
      var rect = card.getBoundingClientRect();
      state[i].tx = e.clientX - rect.left;
      state[i].ty = e.clientY - rect.top;
    });

    card.addEventListener('pointerleave', function() {
      state[i].active = false;
      state[i].tx = card.offsetWidth / 2;
      state[i].ty = card.offsetHeight / 2;
      card.removeAttribute('data-active');
      card.style.transform = '';
    });

    // Ripple
    if (fx.ripple) {
      card.addEventListener('click', function(e) {
        var rect = card.getBoundingClientRect();
        var rip = document.createElement('span');
        rip.className = 'bento__ripple';
        var sz = Math.max(rect.width, rect.height) * 2;
        rip.style.width = sz + 'px';
        rip.style.height = sz + 'px';
        rip.style.left = (e.clientX - rect.left - sz / 2) + 'px';
        rip.style.top = (e.clientY - rect.top - sz / 2) + 'px';
        card.appendChild(rip);
        rip.addEventListener('animationend', function() { rip.remove(); });
      });
    }
  });
})();
