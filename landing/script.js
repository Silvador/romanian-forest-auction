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

// Hero mockup — cursor-tracking 3D tilt
const mockup = document.getElementById('hero-mockup');
if (mockup && window.matchMedia('(pointer: fine)').matches) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);
  let rafId = null;
  let targetX = 0, targetY = 0;
  let currentX = 0, currentY = 0;

  document.addEventListener('mousemove', (event) => {
    const rect = mockup.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    // Distance from center of mockup, normalized
    const dx = (event.clientX - cx) / (window.innerWidth / 2);
    const dy = (event.clientY - cy) / (window.innerHeight / 2);

    targetX = clamp(dx * 6, -6, 6);
    targetY = clamp(-dy * 4, -4, 4);

    if (!rafId) {
      rafId = requestAnimationFrame(function animate() {
        // Smooth lerp
        currentX += (targetX - currentX) * 0.08;
        currentY += (targetY - currentY) * 0.08;

        mockup.style.transform = `perspective(1200px) rotateY(${currentX}deg) rotateX(${currentY + 2}deg)`;

        if (Math.abs(targetX - currentX) > 0.01 || Math.abs(targetY - currentY) > 0.01) {
          rafId = requestAnimationFrame(animate);
        } else {
          rafId = null;
        }
      });
    }
  });
}

// Header scroll effect
const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (!header) return;
  header.style.background = window.scrollY > 30
    ? 'linear-gradient(180deg, rgba(8, 8, 8, 0.88), rgba(8, 8, 8, 0.6))'
    : 'linear-gradient(180deg, rgba(8, 8, 8, 0.72), rgba(8, 8, 8, 0.38))';
});

// Reduced motion respect
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach((node) => {
    node.style.scrollBehavior = 'auto';
  });
}
