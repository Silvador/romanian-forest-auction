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

// Cursor-tracking 3D tilt for mockup frames
if (window.matchMedia('(pointer: fine)').matches) {
  const clamp = (v, min, max) => Math.min(Math.max(v, min), max);
  const tiltEls = document.querySelectorAll('#hero-mockup, #showcase-mockup');

  tiltEls.forEach((el) => {
    let rafId = null;
    let targetX = 0, targetY = 0, currentX = 0, currentY = 0;

    document.addEventListener('mousemove', (e) => {
      const rect = el.getBoundingClientRect();
      // Only tilt when element is in viewport
      if (rect.bottom < 0 || rect.top > window.innerHeight) return;

      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (window.innerWidth / 2);
      const dy = (e.clientY - cy) / (window.innerHeight / 2);

      targetX = clamp(dx * 5, -5, 5);
      targetY = clamp(-dy * 3, -3, 3);

      if (!rafId) {
        rafId = requestAnimationFrame(function animate() {
          currentX += (targetX - currentX) * 0.06;
          currentY += (targetY - currentY) * 0.06;
          el.style.transform = `perspective(1200px) rotateY(${currentX}deg) rotateX(${currentY + 1.5}deg)`;
          if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
            rafId = requestAnimationFrame(animate);
          } else {
            rafId = null;
          }
        });
      }
    });
  });
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
