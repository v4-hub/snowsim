# ❄️ Chicoutimi SnowSim

A 3D physics-based simulation of road snow and wind, evaluating the effectiveness of vegetation barriers for winter driving safety in the Saguenay–Lac-Saint-Jean region.

Built with **React**, **Three.js** (React Three Fiber), **Vite**, and **TailwindCSS**.

🌐 **[Live Demo](https://v4-hub.github.io/snowsim/)** · 📖 **[FAQ](https://v4-hub.github.io/snowsim/qa.html)** · 📦 **[Download Desktop App](https://github.com/v4-hub/snowsim/releases)**

## Features

### Physics Engine

- **WE-UQ Wind Modeling** — Logarithmic wind profile with stochastic gust simulation
- **Cone-Shaped Collision** — Snow particles interact with tapered tree crown shape, denser at base, sparser at top
- **Snow Accumulation** — Particles blocked by barriers settle on the ground instead of disappearing

### Visualization

- **Black Spruce Tree Model** — Realistic boreal conifer: brown trunk + dark green cone crown (Picea mariana)
- **SVG Gauge Meters** — Forward/reverse visibility with color-coded status (GOOD / MODERATE / POOR)
- **Barrier Protection Score** — Real-time percentage comparison: with vs. without barriers
- **Shield Comparison Bars** — Green (protected) vs. red (unprotected) visual contrast
- **Multiple Camera Views** — Bird's eye, driver, and side perspectives

### Interactive Controls

- Wind speed, direction, turbulence intensity, and terrain roughness
- Configurable barriers: height, density, distance from road, per side
- Snow intensity: 10k–100k particles

## Run Locally

**Prerequisites:** Node.js 20+

```bash
npm install
npm run dev
```

Open [http://localhost:3000/snowsim/](http://localhost:3000/snowsim/)

## Desktop App (Offline)

Run the simulation as a standalone desktop application — no internet required.

```bash
# Test locally
npm run electron:dev

# Build installer
npm run electron:build         # macOS .dmg
npm run electron:build:win     # Windows .exe
```

Output goes to the `release/` directory.

Pre-built installers are also available on [GitHub Releases](https://github.com/v4-hub/snowsim/releases).

## Deploy to GitHub Pages

This repo includes a GitHub Actions workflow for auto-deployment:

1. Push to your GitHub account
2. Go to **Settings → Pages → Source** → select **GitHub Actions**
3. Push to `main` — auto-deploys to `https://<username>.github.io/snowsim/`

## Release Desktop Installers

Tag a version to automatically build and publish installers:

```bash
git tag v1.0.0
git push origin v1.0.0
```

GitHub Actions will build `.dmg` (Mac) and `.exe` (Windows) and publish them as a Release.

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
| Desktop | Electron + electron-builder |

## License

MIT
