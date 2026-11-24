// "Query my résumé": a real SQLite database (sql.js / WebAssembly) loaded on demand.

const SQLJS = 'https://cdn.jsdelivr.net/npm/sql.js@1.10.3/dist/';

const SCHEMA = `
CREATE TABLE experience (company TEXT, role TEXT, start_date TEXT, end_date TEXT, stack TEXT, highlight TEXT);
INSERT INTO experience VALUES
 ('Synapxe','ALPS Data Analytics & Information Systems Intern','2026-06','2026-12','Tableau, Databricks, SQL, AI Genie','Procurement Savings Data Mart: 5M+ records, queries 8 min -> under 3 min'),
 ('Giftano','Data Engineer & Analyst Intern','2025-06','2025-09','Airflow, Python, PostgreSQL, MongoDB, MySQL, Power BI','8+ Airflow ETL pipelines across 15+ sources, 10+ hours saved per week'),
 ('NUS FinTech Society','Blockchain Developer','2024-10','2025-05','Solidity, Ethereum, Solana','Built dApps and smart contracts bridging TradFi and DeFi'),
 ('National Service','Intelligence Specialist','2021-03','2023-02','Machine Learning, Power BI','Camera-based object detection models');

CREATE TABLE projects (name TEXT, category TEXT, stack TEXT, live INTEGER, team INTEGER, demo_url TEXT, repo_url TEXT);
INSERT INTO projects VALUES
 ('Rhythm','Productivity','Next.js, TypeScript, Supabase, OpenAI, Gemini',1,0,'https://ai-smart-calendar-nine.vercel.app','https://github.com/totallyregi/AISmartCalendar'),
 ('AutoWallet','FinTech','Next.js, Prisma, PostgreSQL, Gemini',1,0,'https://www.autowallet.site/','https://github.com/totallyregi/AutoWallet'),
 ('EPL Match Predictor','Sports ML','Python, FastAPI, Next.js, Poisson model',1,0,'https://epl-predictor-two.vercel.app','https://github.com/totallyregi/EPLPredictor'),
 ('Stock Price Predictor','Data Science','Airflow, Python, PostgreSQL, Docker',0,1,NULL,'https://github.com/w1nsl/stock-prediction'),
 ('Trippy','Travel','React, Spring Boot, PostgreSQL, Stripe',0,1,NULL,'https://github.com/Michelsim01/Trippy');

CREATE TABLE skills (name TEXT, category TEXT);
INSERT INTO skills VALUES
 ('Python','language'),('Java','language'),('SQL','language'),('TypeScript','language'),('JavaScript','language'),('Solidity','language'),
 ('React','framework'),('React Native','framework'),('Next.js','framework'),('FastAPI','framework'),('Spring Boot','framework'),
 ('Apache Airflow','data'),('Databricks','data'),('PostgreSQL','data'),('MongoDB','data'),('Power BI','data'),('Tableau','data'),('R','data'),
 ('Docker','tooling'),('Git','tooling'),('CI/CD','tooling'),('Figma','tooling'),('Jira','tooling');

CREATE TABLE impact (metric TEXT, value TEXT, context TEXT);
INSERT INTO impact VALUES
 ('records modelled','5M+','Synapxe procurement data mart'),
 ('query runtime','8 min -> <3 min','Databricks SQL optimisation'),
 ('hours saved / week','10+','Airflow ETL automation at Giftano'),
 ('ETL pipelines','8+','Across 15+ data sources'),
 ('dashboard users','55+','Tableau (30+) and Power BI (25+)'),
 ('campaign ROI','double-digit uplift','Giftano marketing analytics');

CREATE TABLE contact (channel TEXT, value TEXT);
INSERT INTO contact VALUES
 ('email','totallyregi@gmail.com'),
 ('linkedin','https://www.linkedin.com/in/reginald-yang-75005a267/'),
 ('github','https://github.com/totallyregi'),
 ('resume','assets/Reginald_Yang_Resume.pdf');
`;

const SUGGESTIONS = [
    { label: 'Live projects', sql: "SELECT name, stack, demo_url FROM projects WHERE live = 1;" },
    { label: 'Career timeline', sql: "SELECT company, role, start_date, end_date FROM experience ORDER BY start_date DESC;" },
    { label: 'Impact', sql: "SELECT metric, value, context FROM impact;" },
    { label: 'Skills by type', sql: "SELECT category, COUNT(*) AS n, GROUP_CONCAT(name, ', ') AS skills FROM skills GROUP BY category ORDER BY n DESC;" },
    { label: 'Hire me', sql: "SELECT channel, value FROM contact;" },
    { label: 'Show tables', sql: "SELECT name FROM sqlite_master WHERE type = 'table';" },
];

let db = null;
let loading = null;

function loadScript(src) {
    return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src; s.onload = resolve; s.onerror = () => reject(new Error('Could not load the SQL engine'));
        document.head.append(s);
    });
}

async function getDb() {
    if (db) return db;
    loading ??= (async () => {
        await loadScript(`${SQLJS}sql-wasm.js`);
        const SQL = await window.initSqlJs({ locateFile: (f) => `${SQLJS}${f}` });
        db = new SQL.Database();
        db.run(SCHEMA);
        return db;
    })();
    return loading;
}

function escapeHtml(v) {
    return String(v).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function renderCell(v) {
    if (v === null) return '<span class="sql-null">NULL</span>';
    const text = escapeHtml(v);
    if (/^(https?:\/\/|assets\/)/.test(String(v))) return `<a href="${text}" target="_blank" rel="noreferrer">${text}</a>`;
    if (/^[^@\s]+@[^@\s]+\.[a-z]+$/i.test(String(v))) return `<a href="mailto:${text}">${text}</a>`;
    return text;
}

export function initConsole() {
    const panel = document.querySelector('#sqlConsole');
    if (!panel) return { open() {} };
    const form = panel.querySelector('form');
    const input = panel.querySelector('textarea');
    const output = panel.querySelector('.sql-output');
    const chips = panel.querySelector('.sql-chips');
    const status = panel.querySelector('.sql-status');
    const history = [];
    let hIndex = 0;

    SUGGESTIONS.forEach(({ label, sql }) => {
        const b = document.createElement('button');
        b.type = 'button'; b.textContent = label;
        b.addEventListener('click', () => { run(sql); input.value = ''; input.focus(); });
        chips.append(b);
    });

    function print(html, cls = '') {
        const block = document.createElement('div');
        block.className = `sql-block ${cls}`;
        block.innerHTML = html;
        output.append(block);
        output.scrollTop = output.scrollHeight;
    }

    async function run(sql) {
        sql = sql.trim();
        if (!sql) return;
        history.push(sql); hIndex = history.length;
        print(`<div class="sql-echo"><span>sql&gt;</span> ${escapeHtml(sql)}</div>`);
        try {
            const database = await getDb();
            if (/^\s*(insert|update|delete|drop|alter|create)\b/i.test(sql)) {
                print('Nice try. This database is read-only, but I like the instinct.', 'sql-note');
                return;
            }
            const t0 = performance.now();
            const results = database.exec(sql);
            const ms = (performance.now() - t0).toFixed(1);
            if (!results.length) { print(`Query OK, 0 rows <span class="sql-meta">(${ms} ms)</span>`, 'sql-note'); return; }
            results.forEach(({ columns, values }) => {
                const head = columns.map((c) => `<th>${escapeHtml(c)}</th>`).join('');
                const body = values.map((r) => `<tr>${r.map((v) => `<td>${renderCell(v)}</td>`).join('')}</tr>`).join('');
                print(`<div class="sql-table-wrap"><table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div><div class="sql-meta">${values.length} row${values.length === 1 ? '' : 's'} in ${ms} ms</div>`);
            });
        } catch (err) {
            print(`Error: ${escapeHtml(err.message)}`, 'sql-error');
        }
    }

    form.addEventListener('submit', (e) => { e.preventDefault(); run(input.value); input.value = ''; });
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
        if (e.key === 'ArrowUp' && !input.value.includes('\n') && history.length) {
            e.preventDefault(); hIndex = Math.max(0, hIndex - 1); input.value = history[hIndex];
        }
        if (e.key === 'ArrowDown' && history.length) {
            e.preventDefault(); hIndex = Math.min(history.length, hIndex + 1); input.value = history[hIndex] ?? '';
        }
    });
    panel.querySelector('.sql-close').addEventListener('click', () => close());
    panel.addEventListener('cancel', (e) => { e.preventDefault(); close(); });

    function close() {
        panel.classList.remove('open');
        setTimeout(() => panel.close(), 250);
    }

    async function open() {
        if (!panel.open) panel.show();
        requestAnimationFrame(() => panel.classList.add('open'));
        input.focus();
        if (!db) {
            status.textContent = 'Loading SQLite (WebAssembly)…';
            try {
                await getDb();
                status.textContent = 'Connected · 5 tables · read-only';
                print('Welcome. This is a real SQLite database of my résumé, running in your browser. Try a query below, or write your own.', 'sql-note');
            } catch (err) {
                status.textContent = 'Offline';
                print(escapeHtml(err.message), 'sql-error');
            }
        }
    }

    document.querySelectorAll('[data-open-console]').forEach((el) => el.addEventListener('click', (e) => { e.preventDefault(); open(); }));
    document.addEventListener('keydown', (e) => {
        if (e.key === '`' && !e.metaKey && !e.ctrlKey && !isTyping(e.target)) { e.preventDefault(); panel.open ? close() : open(); }
        if (e.key === 'Escape' && panel.open) close();
    });

    return { open, close };
}

export function isTyping(el) {
    return el instanceof HTMLElement && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
}
