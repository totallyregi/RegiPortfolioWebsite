import { isTyping } from './console.js';

const RESUME = 'assets/Reginald_Yang_Resume.pdf';
const EMAIL = 'totallyregi@gmail.com';

/* ---------- Theme: circular reveal from the toggle via View Transitions ---------- */
export function initTheme() {
    const button = document.querySelector('#themeToggle');
    const root = document.documentElement;
    const sync = () => button?.setAttribute('aria-pressed', String(root.dataset.theme === 'dark'));
    sync();

    function apply(theme) {
        root.dataset.theme = theme;
        try { localStorage.setItem('theme', theme); } catch { /* private mode */ }
        sync();
        window.dispatchEvent(new Event('themechange'));
    }

    function toggle(origin) {
        const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
        const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        if (!document.startViewTransition || reduce) { apply(next); return; }
        const rect = (origin ?? button)?.getBoundingClientRect();
        const x = rect ? rect.left + rect.width / 2 : innerWidth - 40;
        const y = rect ? rect.top + rect.height / 2 : 40;
        const r = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
        const transition = document.startViewTransition(() => apply(next));
        transition.ready.then(() => {
            root.animate(
                { clipPath: [`circle(0 at ${x}px ${y}px)`, `circle(${r}px at ${x}px ${y}px)`] },
                { duration: 650, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)' }
            );
        });
    }

    button?.addEventListener('click', () => toggle(button));
    return { toggle };
}

/* ---------- Command palette (⌘K / Ctrl+K) ---------- */
export function initPalette({ openConsole, toggleTheme, showToast }) {
    const dialog = document.querySelector('#palette');
    if (!dialog) return;
    const input = dialog.querySelector('input');
    const list = dialog.querySelector('ul');
    const isMac = /Mac|iPhone|iPad/.test(navigator.platform);
    document.querySelectorAll('[data-kbd-mod]').forEach((el) => { el.textContent = isMac ? '⌘' : 'Ctrl'; });

    const go = (id) => () => document.querySelector(id)?.scrollIntoView({ behavior: 'smooth' });
    const open = (url) => () => window.open(url, '_blank', 'noopener');
    const commands = [
        { group: 'Navigate', label: 'About', hint: '01', run: go('#about') },
        { group: 'Navigate', label: 'Experience', hint: '02', run: go('#experience') },
        { group: 'Navigate', label: 'Projects', hint: '03', run: go('#projects') },
        { group: 'Navigate', label: 'Toolkit', hint: '04', run: go('#skills') },
        { group: 'Navigate', label: 'Contact', hint: '05', run: go('#contact') },
        { group: 'Actions', label: 'Query my résumé with SQL', hint: '`', run: () => openConsole() },
        { group: 'Actions', label: 'Open résumé (PDF)', run: open(RESUME) },
        { group: 'Actions', label: 'Copy email address', run: async () => { await navigator.clipboard.writeText(EMAIL).catch(() => {}); showToast('Email copied ✓'); } },
        { group: 'Actions', label: 'Send me an email', run: () => { location.href = `mailto:${EMAIL}`; } },
        { group: 'Actions', label: 'Toggle dark mode', run: () => toggleTheme() },
        { group: 'Demos', label: 'Rhythm — AI Smart Calendar', run: open('https://ai-smart-calendar-nine.vercel.app') },
        { group: 'Demos', label: 'AutoWallet', run: open('https://www.autowallet.site/') },
        { group: 'Demos', label: 'EPL Match Predictor', run: open('https://epl-predictor-two.vercel.app') },
        { group: 'Elsewhere', label: 'GitHub', run: open('https://github.com/totallyregi') },
        { group: 'Elsewhere', label: 'LinkedIn', run: open('https://www.linkedin.com/in/reginald-yang-75005a267/') },
    ];
    let filtered = commands;
    let active = 0;

    function render() {
        const q = input.value.trim().toLowerCase();
        filtered = commands.filter((c) => `${c.group} ${c.label}`.toLowerCase().includes(q));
        active = Math.min(active, Math.max(filtered.length - 1, 0));
        list.innerHTML = '';
        if (!filtered.length) { list.innerHTML = '<li class="palette-empty">No matches. Try “sql” or “resume”.</li>'; return; }
        let lastGroup = '';
        filtered.forEach((c, i) => {
            if (c.group !== lastGroup) {
                const g = document.createElement('li'); g.className = 'palette-group'; g.textContent = c.group; list.append(g);
                lastGroup = c.group;
            }
            const li = document.createElement('li');
            li.className = 'palette-item'; li.setAttribute('role', 'option'); li.setAttribute('aria-selected', String(i === active));
            li.innerHTML = `<span></span>${c.hint ? `<kbd>${c.hint}</kbd>` : ''}`;
            li.firstChild.textContent = c.label;
            li.addEventListener('mousemove', () => { if (active !== i) { active = i; render(); } });
            li.addEventListener('click', () => choose(i));
            list.append(li);
        });
        list.querySelector('[aria-selected="true"]')?.scrollIntoView({ block: 'nearest' });
    }

    function choose(i) {
        const c = filtered[i];
        if (!c) return;
        dialog.close();
        c.run();
    }

    function show() { input.value = ''; active = 0; render(); dialog.showModal(); input.focus(); }

    input.addEventListener('input', () => { active = 0; render(); });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowDown') { e.preventDefault(); active = (active + 1) % filtered.length; render(); }
        if (e.key === 'ArrowUp') { e.preventDefault(); active = (active - 1 + filtered.length) % filtered.length; render(); }
        if (e.key === 'Enter') { e.preventDefault(); choose(active); }
    });
    dialog.addEventListener('click', (e) => { if (e.target === dialog) dialog.close(); });
    document.querySelectorAll('[data-open-palette]').forEach((el) => el.addEventListener('click', show));
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); dialog.open ? dialog.close() : show(); }
        else if (e.key === '/' && !isTyping(e.target) && !dialog.open) { e.preventDefault(); show(); }
    });
}

/* ---------- Project cards: 3D tilt, glare, and live demo preview ---------- */
export function initCards() {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!fine) return;

    document.querySelectorAll('.project-card:not(.more-card)').forEach((card) => {
        const glare = document.createElement('span');
        glare.className = 'card-glare'; glare.setAttribute('aria-hidden', 'true');
        card.append(glare);

        if (!reduce) {
            card.addEventListener('pointermove', (e) => {
                const r = card.getBoundingClientRect();
                const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
                const max = card.classList.contains('project-featured') ? 3 : 6;
                card.style.transform = `perspective(1000px) rotateX(${(0.5 - py) * max}deg) rotateY(${(px - 0.5) * max}deg) translateY(-6px)`;
                card.style.setProperty('--gx', `${px * 100}%`);
                card.style.setProperty('--gy', `${py * 100}%`);
            });
            card.addEventListener('pointerleave', () => { card.style.transform = ''; });
        }

        const art = card.querySelector('.project-art[data-preview]');
        if (!art) return;
        let timer = 0, frame = null;
        art.addEventListener('pointerenter', () => {
            timer = setTimeout(() => {
                if (!frame) {
                    frame = document.createElement('div');
                    frame.className = 'live-preview';
                    const iframe = document.createElement('iframe');
                    iframe.src = art.dataset.preview;
                    iframe.title = 'Live preview';
                    iframe.loading = 'lazy';
                    iframe.tabIndex = -1;
                    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
                    const scale = art.clientWidth / 1280;
                    iframe.style.transform = `scale(${scale})`;
                    iframe.style.height = `${art.clientHeight / scale}px`;
                    frame.append(iframe);
                    const tag = document.createElement('span'); tag.className = 'preview-tag'; tag.textContent = 'Live preview';
                    frame.append(tag);
                    iframe.addEventListener('load', () => frame.classList.add('loaded'));
                    art.append(frame);
                }
                frame.classList.add('show');
            }, 450);
        });
        art.addEventListener('pointerleave', () => { clearTimeout(timer); frame?.classList.remove('show'); });
    });
}

/* ---------- Experience: pipeline line draws itself as you scroll ---------- */
export function initTimeline() {
    const list = document.querySelector('.experience-list');
    if (!list) return;
    const items = [...list.querySelectorAll('.experience-item')];
    const rail = document.createElement('div');
    rail.className = 'timeline-rail'; rail.setAttribute('aria-hidden', 'true');
    rail.innerHTML = '<span class="timeline-fill"></span>';
    list.prepend(rail);
    list.classList.add('has-timeline');

    let ticking = false;
    function update() {
        ticking = false;
        const trigger = innerHeight * 0.62;
        const r = list.getBoundingClientRect();
        const p = Math.max(0, Math.min(1, (trigger - r.top) / r.height));
        list.style.setProperty('--progress', p.toFixed(4));
        items.forEach((item) => item.classList.toggle('lit', item.getBoundingClientRect().top + 40 < trigger));
    }
    window.addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener('resize', update);
    update();
}
