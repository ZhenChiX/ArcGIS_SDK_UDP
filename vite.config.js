import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
export default defineConfig({
    plugins: [react()],
    // GitHub Pages repo name
    base: "/ArcGIS_SDK_UDP/",
    server: {
        port: 5173,
        open: true,
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks(id) {
                    if (id.includes("@arcgis/core") ||
                        id.includes("@arcgis/map-components") ||
                        id.includes("@esri/calcite-components")) {
                        return "arcgis";
                    }
                    if (id.includes("node_modules")) {
                        return "vendor";
                    }
                },
            },
        },
    },
});
