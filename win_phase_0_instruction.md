# Windows 11 Phase 0 - Local Development Setup
## One-Night Bonus Stage Initiative

**Goal:** Set up a complete local development environment for the ArcGIS SDK web app with hot-reload testing, ready to load static ArcGIS Online layers and R2-hosted GeoJSON data.

**Timeline:** ~45–60 minutes for complete local setup  
**Target:** Fully functional `npm run dev` with ArcGIS SDK, hot module replacement, and sample map rendering

---

## Prerequisites Check (5 minutes)

- [ ] Windows 11 installed
- [ ] Administrator access (may be needed for some installs)
- [ ] Visual Studio Code (latest)
- [ ] Git (already installed, based on workspace context)

Verify in PowerShell:
```powershell
node --version    # Should be v18.0.0 or higher
npm --version     # Should be v8.0.0 or higher
git --version     # Should be present
```

If Node/npm missing, install from https://nodejs.org (LTS version recommended).

---

## Phase 0 Setup Steps (8 core tasks)

### Step 1: Initialize Vite + React + TypeScript Project
**Time: 10 minutes**

```powershell
# Inside workspace root
npm create vite@latest . -- --template react-ts
```

Select:
- Framework: **React**
- Variant: **TypeScript**

This scaffolds:
- `vite.config.ts` (build config)
- `tsconfig.json` (TypeScript settings)
- `package.json` (dependencies)
- `src/main.tsx` (entry point)
- `index.html` (HTML shell)

### Step 2: Install Core Dependencies
**Time: 15 minutes**

```powershell
npm install
```

Core packages installed automatically:
- `react`, `react-dom`
- `vite`
- `@vitejs/plugin-react`
- TypeScript tooling

### Step 3: Install ArcGIS SDK and Components
**Time: 10 minutes**

```powershell
npm install --save @arcgis/core @arcgis/map-components
```

Additional optional but recommended:
```powershell
npm install --save @esri/calcite-components
npm install --save @esri/calcite-design-tokens
```

**Why locally:**
- All packages download to `node_modules/` in workspace
- Zero package bloat concerns for one-night build
- Full offline capability after install

### Step 4: Create Project Directory Structure
**Time: 5 minutes**

Delete placeholder content and create:

```
src/
  ├── main.tsx
  ├── App.tsx
  ├── components/
  │   ├── MapContainer.tsx
  │   └── LayerPanel.tsx
  ├── features/
  │   ├── map/
  │   ├── layers/
  │   ├── sketch/
  │   └── export/
  ├── data/
  │   ├── mock/
  │   │   └── sample-geojson.json
  │   └── config.ts
  └── styles/
      └── index.css

public/
  └── index.html

.github/
  └── workflows/
      └── update-bikeshare.yml (for later)

scripts/
  └── process_gbfs.py (for later)
```

### Step 5: Create Minimal ArcGIS Map Component
**Time: 15 minutes**

File: `src/components/MapContainer.tsx`

```tsx
import { useEffect, useRef } from 'react';
import Map from '@arcgis/core/Map';
import MapView from '@arcgis/core/views/MapView';
import '@arcgis/core/assets/esri/themes/light/main.css';

export function MapContainer() {
  const mapDiv = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mapDiv.current) return;

    const map = new Map({
      basemap: 'streets-vector'
    });

    const view = new MapView({
      container: mapDiv.current,
      map,
      zoom: 15,
      center: [-122.3075, 47.6550] // U District, Seattle
    });

    return () => {
      view.destroy();
    };
  }, []);

  return (
    <div
      ref={mapDiv}
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
```

### Step 6: Update App.tsx Entry Point
**Time: 5 minutes**

File: `src/App.tsx`

```tsx
import { MapContainer } from './components/MapContainer';
import './App.css';

function App() {
  return (
    <div className="app">
      <MapContainer />
    </div>
  );
}

export default App;
```

File: `src/App.css`

```css
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
    'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Source Sans Pro',
    sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  width: 100%;
  height: 100vh;
}

.app {
  width: 100%;
  height: 100%;
}
```

### Step 7: Verify Vite Config for Hot Module Replacement
**Time: 5 minutes**

File: `vite.config.ts`

Ensure it contains:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    open: true // Auto-open browser on npm run dev
  }
})
```

### Step 8: Launch Local Development Server
**Time: 2 minutes**

```powershell
npm run dev
```

Expected output:
```
VITE v[version] ready in [time] ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

Browser should auto-open to `http://localhost:5173/` with a map centered on U District, Seattle.

---

## Validation Checklist (Before Next Phase)

- [ ] `npm run dev` launches without errors
- [ ] Browser auto-opens to `http://localhost:5173/`
- [ ] ArcGIS map appears with basemap
- [ ] Map is interactive (pan, zoom with mouse/scroll)
- [ ] Console shows no red errors (warnings are OK)
- [ ] Hot-reload works: edit `MapContainer.tsx`, save, browser updates instantly
- [ ] `node_modules/` contains `@arcgis/core` and `@arcgis/map-components`

---

## Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| `npm install` fails | Clear cache: `npm cache clean --force`, then retry |
| Port 5173 already in use | Change in `vite.config.ts`: `port: 5174` |
| Blank map / white screen | Check browser console (F12). Verify ArcGIS CSS imported. |
| Module not found errors | Delete `node_modules/`, run `npm install` again |
| Hot reload not working | Restart dev server: Ctrl+C, then `npm run dev` |
| TypeScript errors in editor | Reload VS Code window: Ctrl+Shift+P → "Reload Window" |

---

## Next Steps After Phase 0 (One-Night Sequence)

1. **Phase 1a:** Load existing ArcGIS Online WebMap by item ID (~15 min)
   - Replace hardcoded basemap with `new WebMap({ portalItem: { id: "..." } })`

2. **Phase 1b:** Prepare one clipped bikeshare GeoJSON manually (~30 min)
   - Save as `public/data/udistrict_bikeshare_sample.geojson`

3. **Phase 1c:** Add GeoJSON layer to map (~20 min)
   - Use `GeoJSONLayer` from `@arcgis/core/layers`

4. **Phase 1d:** Add Sketch (drawing) tool (~20 min)
   - Import `Sketch` from `@arcgis/core/widgets`

5. **Phase 1e:** Add snapshot selector dropdown (~15 min)
   - Create dropdown component to swap GeoJSON URLs

6. **Phase 1f:** Polish and README (~20 min)

**Total remaining: ~2 hours for full one-night build**

---

## File Checklist After Phase 0

```
✓ package.json          (auto-generated, dependencies listed)
✓ vite.config.ts        (Vite build config)
✓ tsconfig.json         (TypeScript settings)
✓ index.html            (HTML entry point)
✓ src/main.tsx          (React entry point)
✓ src/App.tsx           (App component)
✓ src/App.css           (Styling)
✓ src/components/MapContainer.tsx  (ArcGIS map logic)
✓ node_modules/         (all npm packages, ~500MB)
✓ .gitignore            (auto-generated)
```

---

## Summary: Phase 0 Execution Path

| Phase | Task | Time | Status |
|-------|------|------|--------|
| **Setup** | Node/npm verify | 5 min | Pre-check |
| **Step 1** | Vite init | 10 min | ✓ |
| **Step 2** | npm install | 15 min | ✓ |
| **Step 3** | ArcGIS SDK install | 10 min | ✓ |
| **Step 4** | Dir structure | 5 min | ✓ |
| **Step 5** | MapContainer.tsx | 15 min | ✓ |
| **Step 6** | App.tsx entry point | 5 min | ✓ |
| **Step 7** | Vite config HMR | 5 min | ✓ |
| **Step 8** | Launch dev server | 2 min | ✓ |
| **Verify** | Validation checklist | 5 min | ✓ |
| | **TOTAL** | **~60 min** | **Ready** |

After Phase 0 is complete: **Local development environment fully functional. Ready for Feature 1 (ArcGIS Online WebMap loading).**

---

## Windows 11 Notes

- Use PowerShell (v5.1 or higher, included by default)
- Node.js installer adds npm to PATH automatically
- If admin access needed, right-click PowerShell → "Run as administrator"
- Node packages stored in `node_modules/` (can grow to 500MB+, normal)
- Vite dev server binds to localhost only (not accessible from other machines while developing)

---

## Commands Reference Card

```powershell
# Initialize Vite project
npm create vite@latest . -- --template react-ts

# Install all dependencies
npm install

# Install ArcGIS packages
npm install --save @arcgis/core @arcgis/map-components

# Start development server (hot reload enabled)
npm run dev

# Build for production (later)
npm run build

# Preview production build locally
npm run preview
```

---

**Ready?** Run the 8 steps above, then report status to proceed to Phase 1.
