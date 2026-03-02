# ❄️ Chicoutimi SnowSim

A 3D simulation system for road snow and wind, evaluating the effectiveness of vegetation barriers in Chicoutimi.

Built with **React**, **Three.js** (React Three Fiber), **Vite**, and **TailwindCSS**.

## Features

- **WE-UQ Wind Modeling** — Logarithmic wind profile with stochastic gust simulation
- **Vegetation Barriers** — Configurable conifer/shrub/fence barriers on both road sides and median
- **Real-time Metrics** — Forward/reverse visibility, snow accumulation on road, wind profile charts
- **Multiple Camera Views** — Bird's eye, driver, and side perspectives
- **Interactive Controls** — Wind speed, direction, turbulence intensity, terrain roughness, snow intensity

## Run Locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

Open [http://localhost:3000/snowsim/](http://localhost:3000/snowsim/) in your browser.

## Deploy to GitHub Pages

This repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) for automatic deployment.

1. Push this repo to your GitHub account
2. Go to **Settings → Pages → Source** and select **GitHub Actions**
3. Push to the `main` branch — the site will auto-deploy to `https://<username>.github.io/snowsim/`

## Tech Stack

| Layer | Technology |
|-------|-----------|
| UI Framework | React 19 |
| 3D Engine | Three.js + React Three Fiber + Drei |
| State | Zustand |
| Charts | Recharts |
| Styling | TailwindCSS v4 |
| Bundler | Vite 6 |
| Icons | Lucide React |

## License

MIT
