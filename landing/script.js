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

const heroCard = document.querySelector('.hero-backdrop');
if (heroCard && window.matchMedia('(pointer: fine)').matches) {
  const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

  heroCard.addEventListener('mousemove', (event) => {
    const rect = heroCard.getBoundingClientRect();
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    const rotateY = clamp((px - 0.5) * 10, -5, 5);
    const rotateX = clamp((0.5 - py) * 8, -4, 4);
    heroCard.style.transform = `perspective(1200px) rotateY(${rotateY - 6}deg) rotateX(${rotateX + 2}deg) translateY(-4px)`;
  });

  heroCard.addEventListener('mouseleave', () => {
    heroCard.style.transform = '';
  });
}

const header = document.querySelector('.site-header');
window.addEventListener('scroll', () => {
  if (!header) return;
  header.style.background = window.scrollY > 30
    ? 'linear-gradient(180deg, rgba(8, 8, 8, 0.88), rgba(8, 8, 8, 0.6))'
    : 'linear-gradient(180deg, rgba(8, 8, 8, 0.72), rgba(8, 8, 8, 0.38))';
});

const footerYear = new Date().getFullYear();
const footerShell = document.querySelector('.footer-shell');
if (footerShell) {
  const stamp = document.createElement('p');
  stamp.textContent = `Editable clone prepared ${footerYear}.`;
  footerShell.appendChild(stamp);
}

if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.querySelectorAll('*').forEach((node) => {
    node.style.scrollBehavior = 'auto';
  });
}
