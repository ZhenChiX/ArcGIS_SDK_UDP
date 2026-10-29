# U District Partnership Mapping Web App

## Overview
This repository is for a **desktop-first, mobile-friendly internal mapping web app** for the **U District Partnership (UDP)**.  
The goal is to build a lightweight **urban planning and analysis tool** that is more structured than Google My Maps, lighter than a full professional GIS platform, and suitable for internal partnership workflows.

The current direction is to use **React + TypeScript + Vite** with **ArcGIS Maps SDK for JavaScript** as the primary mapping platform.

## Purpose
The app is intended to help UDP:
- view curated U-District map layers
- switch between multiple basemaps
- click buildings or features to inspect structured data
- draw annotations and planning shapes
- style and differentiate layers clearly
- export map views for reports or presentations
- later ingest selected GIS-friendly datasets and evolve toward a shared internal planning tool

## Recommended Stack

### Core
- **React**
- **TypeScript**
- **Vite**
- **ArcGIS Maps SDK for JavaScript**
- **@arcgis/map-components**
- **Calcite Design System**

### ArcGIS features to learn first
- `arcgis-map`
- `FeatureLayer`
- `Popup`
- `Layer List`
- `Basemap Gallery`
- `Sketch`
- `Print`

### Optional later additions
- custom side panels
- client-side GeoJSON / CSV layer import
- persistent storage
- shared annotation workflows
- backend API and spatial database


## MVP Scope (Phase 1)
Phase 1 is **tool-first, data-later**.

That means the first demo should prove the application shell and mapping workflow with sample or mock data before spending heavy time on public data cleanup.

### Phase 1 goals
- working map page
- 2D basemap switching
- placeholder building / feature layers
- click-to-identify popup behavior
- layer list
- sketch / annotation tools
- print or export workflow
- desktop-first UI with reasonable tablet/touch compatibility

### What Phase 1 is **not**
- not a full analytics platform
- not a polished paid-product clone
- not a fully persistent GIS system
- not a complete upload / ingestion platform
- not a final data model for all UDP needs


## Repository Setup

### Node / package manager
Use the latest stable or current LTS Node.js release recommended by the ArcGIS React guide.

Suggested tools:
- Node.js LTS
- npm

## Local Development

### 1. Clone the repo
```bash
git clone <your-repo-url>
cd <your-repo-folder>
```

### 2. Install dependencies
```bash
npm install
```

### 3. Start dev server
```bash
npm run dev
```

### 4. Build production bundle
```bash
npm run build
```

### 5. Preview production build
```bash
npm run preview
```

## OS Notes

### Linux
- install Node.js LTS and npm
- use a modern Chromium-based browser or Firefox for testing
- recommended for easiest dev workflow

### Windows
- install Node.js LTS
- use PowerShell or Windows Terminal
- ensure path and npm commands are available globally

### macOS
- install Node.js LTS
- use Terminal or iTerm
- ensure local dev certificates/network prompts do not block the Vite dev server

## Initial Folder Suggestion
```text
src/
  components/
  features/
    map/
    layers/
    sketch/
    export/
  data/
    mock/
  styles/
  App.tsx
  main.tsx
public/
docs/
```

## Milestones

### Milestone 1
- app scaffold works
- map renders
- one basemap loads

### Milestone 2
- sample feature layer loads
- popup works
- layer list works

## Future Nice-to-Haves
- limited GeoJSON / CSV import
- saved user annotation layers
- better export templates
- richer filtering
- stronger 3D exploration
- backend + spatial database
- internal authentication and project sharing
## Phase 1 milestone — planning workspace (`codex_testing`)

This milestone completes three tooling goals from `docs/U_District_Mapping_App_Plan.docx`: basemap switching, planning annotations, and basic report export. It uses the existing React + TypeScript + Vite, ArcGIS Maps SDK, and Calcite shell. No backend, new dependencies, or directory hierarchy was added.

Open **Planning tools** (pencil action in the right rail):

1. **Basemaps:** choose Streets, Imagery, or Topographic. The replacement loads before switching, and operational layers remain in place. A failed request keeps the current basemap and shows an error.
2. **Annotate:** draw points, lines, polygons, rectangles, or circles in a dedicated client-side `GraphicsLayer`. Choose a color for new drawings, select existing shapes to move/reshape them, and use Undo/Redo during an edit. Double-click to complete lines/polygons; Escape cancels the current operation. Clear all requires confirmation. Opening annotation tools pauses the existing radius inspector. Drawings survive switching panels, but **do not survive reload/navigation**: export before leaving.
3. **Export:** enter a report title and download the current map as PNG. The image includes visible layers and annotations, title, local date, scale, and available layer copyright text. Panels and popups are excluded. Wait for layers to finish loading before exporting. Retain attribution when sharing; this is a planning reference, not a survey product.

The header, tool panel, keyboard navigation, focus indicators, waiting/error messages, and narrow-screen layout were polished while retaining the original map, Layers, Table, legend, home/zoom, and Radius Inspector workflows.

The HTML’s legacy CDN stylesheet links were replaced by the installed Calcite stylesheet; ArcGIS map styles continue to come from the installed map-components package.

### Branch baseline and hosted content

The implementation starts from `main` at `feb424d`. All remote branches were inspected: `chi_test_branch` has one subsequent UI-default commit (`8ff167f`, opening Layers and legend by default), while `gh-pages` is deployment output. That alternate default was not merged into this milestone.

The hosted WebMap remains `ac2e660700144e0883b725c75d8b8b5f`. This app reads its existing layers and adds browser-local presentation tools. It does not call `applyEdits`, save the WebMap, or modify ArcGIS Online content. Editing hosted data or publishing a WebMap would require explicit product work and authorized ArcGIS credentials/permissions.

### Development and validation

Use Node 24 LTS (the pinned Vite version requires Node 20.19+ or 22.12+):

```bash
npm ci
npm run dev -- --open false
```

The app uses the `/ArcGIS_SDK_UDP/` base path. Validate without rewriting tracked TypeScript build outputs:

```bash
./node_modules/.bin/tsc -p tsconfig.json --noEmit --incremental false
./node_modules/.bin/vite build
```

Type checking and the production bundle pass. Vite reports the existing large ArcGIS bundle warning. `npm run lint` remains unavailable because the original repository does not declare ESLint or its configuration.

Live hosted-map validation in the cloud is blocked by the current outbound policy for ArcGIS CDN/portal requests. Network settings need `*.arcgis.com` and `*.arcgisonline.com` (plus any additional layer-specific hosts the WebMap references). A loaded application shell does not prove that hosted layers or basemaps work. Recheck all three basemaps, the original table/inspector, drawing/editing, and PNG contents against the live WebMap after access is applied. No claim is made that the hosted-map integration passed while that access is blocked.

Chromium verified the Planning tools panel and disabled controls while the hosted map is unavailable. In an isolated local MapView with an explicit projected extent and installed SDK assets, it also verified rectangle creation, annotations surviving tool changes, PNG download, and both cancel/confirm paths for clearing annotations. The exported PNG was visually checked for the drawing and report footer. This local fixture does not validate live basemap services or hosted operational layers.

The actual Calcite shell was also checked at a 390px viewport: the planning panel fits within the screen after constraining its width. Hosted-map waiting states remain visible inside the panel without covering the controls.
