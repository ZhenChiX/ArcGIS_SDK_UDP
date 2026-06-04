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

##Milestones

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