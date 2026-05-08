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

## Why this stack
This stack was chosen because:
- ArcGIS JS SDK already covers most MVP mapping needs
- React is better than vanilla JS once the app grows beyond a simple map page
- Vite gives a clean modern frontend setup
- Calcite helps the app feel polished and GIS-appropriate without building every UI control from scratch

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

## Proposed Project Phases

### Phase 1 - Tooling and shell prototype
Focus:
- scaffold app
- prove ArcGIS components and interaction model
- use mock or sample data
- validate layout and workflow

### Phase 2 - Real data integration
Focus:
- gather public datasets
- clean and normalize layers
- connect real building / POI / planning layers
- refine popup schemas and symbology

### Phase 3 - Shared internal tool
Focus:
- persistent saved annotations
- optional upload workflows
- backend/API/database if needed
- stronger internal planning workflows and governance

## Estimated Timeline

### Phase 1 demo
With ChatGPT and GitHub Copilot support, a realistic estimate is:
- **fast rough demo:** 1.5 to 2 weeks
- **decent Phase 1 demo:** 2 to 3 weeks
- **safe estimate with data uncertainty:** 3 to 4 weeks

Main time sinks:
- app wiring and UI cleanup
- learning ArcGIS component patterns
- preparing clean public data later
- testing map interactions and presentation flow

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

## Suggested Dependencies
These may change, but a likely starting point is:

```bash
npm install @arcgis/map-components @esri/calcite-components
npm install
```

The exact ArcGIS package setup should follow the official ArcGIS React + Vite guidance used at project start.

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

## Suggested First Milestones

### Milestone 1
- app scaffold works
- map renders
- one basemap loads

### Milestone 2
- sample feature layer loads
- popup works
- layer list works

### Milestone 3
- sketch/annotation works
- basic print/export works

### Milestone 4
- side panel and UI cleanup
- mobile/tablet sanity check
- ready for real data layer testing

## Data Strategy
Start with:
- sample ArcGIS item or mock client-side layers
- small building polygons
- small point-of-interest dataset

Then move to:
- public U-District / Seattle datasets
- cleaned attribute schema
- real planning-relevant layers

## Architecture Guidance
For MVP:
- frontend-only is acceptable
- client-side layers are acceptable
- no backend required on day one

For later phases:
- add backend only when persistent shared data is needed
- add database only when uploads, saved annotations, or multi-user workflows become real requirements

## Positioning
This project should be described as:

> A lightweight internal planning support and interactive mapping tool for the U District Partnership.

That is more accurate than calling it a full analytics platform during early phases.

## Good Development Rules
- keep scope narrow
- learn a small ArcGIS feature set deeply
- validate tooling before heavy data work
- use mock data first, real data second
- treat uploads and backend work as later-stage features
- optimize for a credible demo before feature breadth

## Future Nice-to-Haves
- limited GeoJSON / CSV import
- saved user annotation layers
- better export templates
- richer filtering
- stronger 3D exploration
- backend + spatial database
- internal authentication and project sharing

## Notes for LLM / Copilot Use
This repo should remain:
- explicit about scope
- modular by feature
- easy to scaffold incrementally
- conservative about introducing new libraries
- centered on ArcGIS JS SDK first, with supporting UI frameworks only where justified
