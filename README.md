# Reginald Yang — Portfolio

Live: **https://totallyregi.github.io/RegiPortfolioWebsite/**

A single-page portfolio for data engineering, analytics, and AI-enabled product work.

## Stack

Plain HTML, CSS and a small ES module. No build step.

- `index.html` — all content (hero, about + impact stats, experience, projects, toolkit, contact)
- `css/styles.css` — design tokens in `:root` (paper / ink / coral / lime / blue), Manrope + DM Mono + serif italics
- `js/scripts.js` — scroll progress, mobile nav, scroll-reveal via [Motion](https://motion.dev) (loaded from CDN, degrades gracefully), stat count-up, copy-email toast
- `assets/Reginald_Yang_Resume.pdf` — résumé linked from the nav, hero and contact
- `images/` — portrait (`portrait-1400.jpg`, resized from `profile.JPG`), about photo, project art

Honours `prefers-reduced-motion`.

## Featured projects

| Project | Live | Code |
| --- | --- | --- |
| Rhythm — AI Smart Calendar | [ai-smart-calendar-nine.vercel.app](https://ai-smart-calendar-nine.vercel.app) | [GitHub](https://github.com/totallyregi/AISmartCalendar) |
| AutoWallet | [autowallet.site](https://www.autowallet.site/) | [GitHub](https://github.com/totallyregi/AutoWallet) |
| EPL Match Predictor | [epl-predictor-two.vercel.app](https://epl-predictor-two.vercel.app) | [GitHub](https://github.com/totallyregi/EPLPredictor) |
| Stock Price Predictor (team) | — | [GitHub](https://github.com/w1nsl/stock-prediction) |
| Trippy (team) | — | [GitHub](https://github.com/Michelsim01/Trippy) |

## Editing

- **Add a project:** copy an `<article class="project-card">` block in `#projects`. Add a `.live-badge` inside `.project-art` and `.pill-link` buttons in `.project-links` when there's a demo or repo.
- **Bust caches after CSS/JS changes:** bump `?v=` on the stylesheet and script tags.
- **Preview locally:** open `index.html`, or run `python3 -m http.server` and visit `localhost:8000`.

## Contact

totallyregi@gmail.com · [LinkedIn](https://www.linkedin.com/in/reginald-yang-75005a267/) · [GitHub](https://github.com/totallyregi)
