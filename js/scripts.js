const motionUrl = 'https://cdn.jsdelivr.net/npm/motion@13.2.0/+esm';
document.documentElement.classList.add('motion-ready');

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const header = document.querySelector('.site-header');
const nav = document.querySelector('.site-nav');
const menuToggle = document.querySelector('.menu-toggle');
const progress = document.querySelector('#scrollProgress');

function updateScrollUI() {
    header?.classList.toggle('scrolled', window.scrollY > 24);
    const scrollable = document.documentElement.scrollHeight - window.innerHeight;
    if (progress && scrollable > 0) progress.style.transform = `scaleX(${window.scrollY / scrollable})`;
}

function closeMenu() {
    header?.classList.remove('menu-open');
    menuToggle?.setAttribute('aria-expanded', 'false');
}

function initNavigation() {
    window.addEventListener('scroll', updateScrollUI, { passive: true });
    updateScrollUI();
    menuToggle?.addEventListener('click', () => {
        const isOpen = header.classList.toggle('menu-open');
        menuToggle.setAttribute('aria-expanded', String(isOpen));
    });
    nav?.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
}

async function initMotion() {
    const revealElements = document.querySelectorAll('.reveal');
    if (prefersReducedMotion) {
        revealElements.forEach((element) => element.classList.add('is-visible'));
        return;
    }

    const motion = await import(motionUrl).catch(() => null);
    if (!motion) {
        revealElements.forEach((element) => element.classList.add('is-visible'));
        return;
    }

    const { animate, inView } = motion;
    inView('.reveal', (element) => {
        element.classList.add('is-visible');
        animate(element, { opacity: [0, 1], y: [24, 0] }, {
            delay: Number(element.dataset.delay || 0),
            duration: 0.72,
            ease: [0.22, 1, 0.36, 1]
        });
    }, { amount: 0.18 });

    animate('.hero-grid', { opacity: [0, 0.55] }, { duration: 1.4, ease: 'easeOut' });
    animate('.orbit-one', { rotate: [-33, -24] }, { duration: 8, repeat: Infinity, direction: 'alternate', ease: 'easeInOut' });
    animate('.orbit-two', { rotate: [30, 37] }, { duration: 10, repeat: Infinity, direction: 'alternate', ease: 'easeInOut' });
}

function initSectionTracking() {
    const links = [...document.querySelectorAll('.site-nav a:not(.nav-contact)')];
    const sections = [...document.querySelectorAll('main section[id]')];
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            links.forEach((link) => link.removeAttribute('aria-current'));
            const active = links.find((link) => link.getAttribute('href') === `#${entry.target.id}`);
            active?.setAttribute('aria-current', 'page');
        });
    }, { rootMargin: '-35% 0px -55% 0px' });
    sections.forEach((section) => observer.observe(section));
}

initNavigation();
initSectionTracking();
initMotion();
