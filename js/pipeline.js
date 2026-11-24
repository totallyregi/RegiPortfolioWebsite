// Hero background: data packets flowing through an ETL pipeline.
// Packets start grey (raw), turn coral after TRANSFORM and lime after LOAD,
// bend toward the cursor, and bump a "rows loaded" counter at INSIGHT.

const STAGES = ['EXTRACT', 'TRANSFORM', 'LOAD', 'INSIGHT'];
const SAMPLES = 600;

export function initPipeline(hero, { reducedMotion = false } = {}) {
    if (!hero) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'pipeline-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d');

    let width = 0, height = 0, dpr = 1;
    let path = [];          // sampled points along the pipe {x, y}
    let nodeT = [];         // t position (0..1) of each stage node
    let packets = [];
    let colors = readColors();
    let rows = 1204331;
    const nodeHit = STAGES.map(() => -1e9);
    const pointer = { x: -9999, y: -9999, active: false };
    let running = false, rafId = 0, last = performance.now();

    function readColors() {
        const cs = getComputedStyle(document.documentElement);
        const v = (name) => cs.getPropertyValue(name).trim();
        return { ink: v('--ink'), muted: v('--muted'), coral: v('--coral'), lime: v('--lime-strong') || v('--lime'), line: v('--line') };
    }

    function layout() {
        const rect = hero.getBoundingClientRect();
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        width = rect.width; height = rect.height;
        canvas.width = Math.round(width * dpr);
        canvas.height = Math.round(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

        const mobile = width < 640;
        const baseY = height - (mobile ? 92 : 122);
        const x0 = mobile ? 68 : Math.max(110, width * 0.07);
        const x1 = width - (mobile ? 24 : Math.max(60, width * 0.05));
        // Control points: gentle wave through four stage nodes.
        const ctrl = [
            { x: x0 - 200, y: baseY + 16 },
            { x: x0 - 100, y: baseY + 10 },
            { x: x0, y: baseY },
            { x: x0 + (x1 - x0) * 0.33, y: baseY - 22 },
            { x: x0 + (x1 - x0) * 0.66, y: baseY + 14 },
            { x: x1, y: baseY - 8 },
            { x: x1 + 100, y: baseY - 4 },
            { x: x1 + 200, y: baseY },
        ];
        path = sampleCatmullRom(ctrl, SAMPLES);
        // Stage nodes are control points 2..5; find the nearest sample for each.
        nodeT = ctrl.slice(2, 6).map((p) => {
            let best = 0, bestD = Infinity;
            path.forEach((q, i) => { const d = (q.x - p.x) ** 2 + (q.y - p.y) ** 2; if (d < bestD) { bestD = d; best = i; } });
            return best / (SAMPLES - 1);
        });
        const target = mobile ? 26 : 54;
        packets = Array.from({ length: target }, () => spawn(Math.random()));
    }

    function spawn(t = 0) {
        return {
            t,
            speed: 0.035 + Math.random() * 0.045,
            lane: (Math.random() - 0.5) * 26,
            size: 1.6 + Math.random() * 2.2,
            square: Math.random() < 0.35,
            dx: 0, dy: 0,
            stage: stageFor(t),
        };
    }

    function stageFor(t) {
        let s = -1;
        nodeT.forEach((nt, i) => { if (t >= nt) s = i; });
        return s;
    }

    function pointAt(t) {
        const f = Math.max(0, Math.min(1, t)) * (SAMPLES - 1);
        const i = Math.floor(f), k = f - i;
        const a = path[i], b = path[Math.min(i + 1, SAMPLES - 1)];
        return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k, nx: -(b.y - a.y), ny: b.x - a.x };
    }

    // Lanes pinch to zero at each node so streams visibly converge.
    function laneScale(t) {
        const pts = [0, ...nodeT, 1];
        for (let i = 0; i < pts.length - 1; i++) {
            if (t >= pts[i] && t <= pts[i + 1]) {
                const local = (t - pts[i]) / (pts[i + 1] - pts[i] || 1);
                return Math.sin(Math.PI * local);
            }
        }
        return 0;
    }

    function step(dt, now) {
        for (const p of packets) {
            p.t += p.speed * dt;
            const s = stageFor(p.t);
            if (s > p.stage) {
                p.stage = s;
                nodeHit[s] = now;
                if (s === STAGES.length - 1) rows += 97 + Math.floor(Math.random() * 900);
            }
            if (p.t > 1.02) Object.assign(p, spawn(-0.04));
        }
    }

    function draw(now) {
        ctx.clearRect(0, 0, width, height);
        // Pipe
        ctx.lineWidth = 1;
        ctx.strokeStyle = colors.line;
        ctx.setLineDash([]);
        ctx.beginPath();
        path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
        ctx.stroke();

        // Packets
        for (const p of packets) {
            const pt = pointAt(p.t);
            const len = Math.hypot(pt.nx, pt.ny) || 1;
            const off = p.lane * laneScale(Math.max(0, Math.min(1, p.t)));
            let x = pt.x + (pt.nx / len) * off;
            let y = pt.y + (pt.ny / len) * off;
            // Cursor attraction
            let tx = 0, ty = 0;
            if (pointer.active) {
                const ddx = pointer.x - x, ddy = pointer.y - y, d = Math.hypot(ddx, ddy);
                if (d < 160) { const f = (1 - d / 160) * 0.45; tx = ddx * f; ty = ddy * f; }
            }
            p.dx += (tx - p.dx) * 0.12;
            p.dy += (ty - p.dy) * 0.12;
            x += p.dx; y += p.dy;
            ctx.fillStyle = p.stage >= 2 ? colors.lime : p.stage >= 1 ? colors.coral : colors.muted;
            ctx.globalAlpha = p.stage >= 0 ? 0.95 : 0.55;
            if (p.square) ctx.fillRect(x - p.size, y - p.size, p.size * 2, p.size * 2);
            else { ctx.beginPath(); ctx.arc(x, y, p.size, 0, Math.PI * 2); ctx.fill(); }
        }
        ctx.globalAlpha = 1;

        // Nodes + labels
        ctx.font = '500 10px "DM Mono", monospace';
        ctx.textAlign = 'center';
        nodeT.forEach((t, i) => {
            const { x, y } = pointAt(t);
            const age = (now - nodeHit[i]) / 600;
            if (age < 1) {
                ctx.strokeStyle = i >= 2 ? colors.lime : colors.coral;
                ctx.globalAlpha = 1 - age;
                ctx.beginPath(); ctx.arc(x, y, 7 + age * 14, 0, Math.PI * 2); ctx.stroke();
                ctx.globalAlpha = 1;
            }
            ctx.fillStyle = colors.ink;
            ctx.beginPath(); ctx.arc(x, y, 4.5, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = colors.muted;
            ctx.fillText(STAGES[i], x, y + 24);
            if (i === STAGES.length - 1 && width >= 640) {
                ctx.textAlign = 'right';
                ctx.fillStyle = colors.ink;
                ctx.fillText(`${rows.toLocaleString()} ROWS LOADED`, x + 10, y - 16);
                ctx.textAlign = 'center';
            }
        });
    }

    function frame(now) {
        const dt = Math.min((now - last) / 1000, 0.05);
        last = now;
        step(dt, now);
        draw(now);
        if (running) rafId = requestAnimationFrame(frame);
    }

    function start() {
        if (running || reducedMotion) return;
        running = true; last = performance.now();
        rafId = requestAnimationFrame(frame);
    }
    function stop() { running = false; cancelAnimationFrame(rafId); }

    layout();
    draw(performance.now());

    new ResizeObserver(() => { layout(); draw(performance.now()); }).observe(hero);
    new IntersectionObserver(([entry]) => (entry.isIntersecting ? start() : stop())).observe(hero);
    document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));
    window.addEventListener('themechange', () => { colors = readColors(); draw(performance.now()); });
    hero.addEventListener('pointermove', (e) => {
        const r = hero.getBoundingClientRect();
        pointer.x = e.clientX - r.left; pointer.y = e.clientY - r.top; pointer.active = true;
    });
    hero.addEventListener('pointerleave', () => { pointer.active = false; });
}

function sampleCatmullRom(points, count) {
    const segs = points.length - 3;
    const out = [];
    for (let i = 0; i < count; i++) {
        const u = (i / (count - 1)) * segs;
        const s = Math.min(Math.floor(u), segs - 1);
        const t = u - s;
        const [p0, p1, p2, p3] = [points[s], points[s + 1], points[s + 2], points[s + 3]];
        const t2 = t * t, t3 = t2 * t;
        const f = (a, b, c, d) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
        out.push({ x: f(p0.x, p1.x, p2.x, p3.x), y: f(p0.y, p1.y, p2.y, p3.y) });
    }
    return out;
}
