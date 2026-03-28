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

// Cursor-tracking on phone triptych + showcase mockup
if (window.matchMedia('(pointer: fine)').matches) {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);

  // Triptych subtle scene rotation
  const triptych = document.getElementById('hero-phones');
  if (triptych) {
    let tX = 0, tY = 0, cX = 0, cY = 0;
    document.addEventListener('mousemove', (e) => {
      const rect = triptych.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;
      tX = ((e.clientX / window.innerWidth) - 0.5) * 8;
      tY = ((e.clientY / window.innerHeight) - 0.5) * -4;
    });
    (function animTriptych() {
      cX += (tX - cX) * 0.04;
      cY += (tY - cY) * 0.04;
      triptych.style.transform = `rotateY(${cX}deg) rotateX(${cY}deg)`;
      requestAnimationFrame(animTriptych);
    })();
  }

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
    ? 'linear-gradient(180deg, rgba(8, 8, 8, 0.92), rgba(8, 8, 8, 0.7))'
    : 'linear-gradient(180deg, rgba(8, 8, 8, 0.72), rgba(8, 8, 8, 0.38))';
});

// Reduced motion
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('.floating-badge').forEach(b => b.style.animation = 'none');
}
