import { useEffect, useMemo, useRef, useState } from "react";
import Circle from "@arcgis/core/geometry/Circle";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import "../../styles/CircleInspectorTool.css";

interface CircleInspectorToolProps {
  mapRef: React.RefObject<any>;
  isActive: boolean;
}

// CONFIGURATION
const TARGET_TEST_INDEX = 2; // Index of the layer to inspect after flattening
const RADIUS_FEET = 250;
const AGGREGATE_FIELD = "LAND_USE_1";

type FieldCount = {
  value: string;
  count: number;
};

export default function CircleInspectorTool({
  mapRef,
  isActive,
}: CircleInspectorToolProps) {
  // UI State (Only update this when necessary)
  const [layerName, setLayerName] = useState("Target layer");
  const [totalCount, setTotalCount] = useState(0);
  const [fieldCounts, setFieldCounts] = useState<FieldCount[]>([]);
  const [statusText, setStatusText] = useState("Standby");

  // Performance Refs
  const overlayLayerRef = useRef<GraphicsLayer | null>(null);
  const circleGraphicRef = useRef<Graphic | null>(null);
  const pointerHandleRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);
  const isQueryingRef = useRef(false); // Semaphore to prevent overlapping calculations

  // Memoized top results for rendering to prevent React churn
  const topCounts = useMemo(() => fieldCounts.slice(0, 8), [fieldCounts]);

  // --- HELPER: Flatten nested map layers ---
  function flattenLayers(mapInstance: any) {
    const layers: any[] = [];
    mapInstance.layers.forEach((layer: any) => {
      const children = layer.layers || layer.sublayers;
      if (children && children.length > 0) {
        children.forEach((child: any) => layers.push(child));
      } else {
        layers.push(layer);
      }
    });
    return layers;
  }

  // --- HELPER: Fast Aggregation Logic ---
  function aggregateFeatures(features: any[]) {
    // Single pass reduction O(n)
    const countsMap = features.reduce((acc, feature) => {
      const raw = feature.attributes[AGGREGATE_FIELD];
      const val = raw === null || raw === undefined || raw === "" ? "N/A" : String(raw);
      acc[val] = (acc[val] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // Convert to sorted array for display
    return Object.entries(countsMap)
      .map(([value, count]) => ({ value, count: Number(count) }))
      .sort((a, b) => b.count - a.count);
  }
 
  useEffect(() => {
    let cancelled = false;

    async function initializeTool() {
      const mapElement = mapRef.current;
      if (!mapElement?.viewOnReady) return;
      await mapElement.viewOnReady();
      if (cancelled) return;

      const view = mapElement.view;
      const mapInstance = mapElement.map;
      if (!view || !mapInstance) return;

      // 1. SETUP GRAPHICS LAYER (Once)
      if (!overlayLayerRef.current) {
        overlayLayerRef.current = new GraphicsLayer({
          title: "Inspector Overlay",
          listMode: "hide",
          elevationInfo: { mode: "on-the-ground" } // Optimization for 3D views, ignored in 2D
        });
        mapInstance.add(overlayLayerRef.current);
      }

      // 2. IDENTIFY TARGET LAYER
      const allLayers = flattenLayers(mapInstance);
      const targetLayer = allLayers[TARGET_TEST_INDEX];

      if (!targetLayer) {
        setStatusText("Layer Error");
        return;
      }
      setLayerName(targetLayer.title);

      // 3. WAIT FOR CLIENT-SIDE VIEW (Critical for speed)
      let layerView: any = null;
      try {
        layerView = await view.whenLayerView(targetLayer);
        // Ensure we only query fields we need to keep memory footprint low
        if (targetLayer.outFields && !targetLayer.outFields.includes("*")) {
           // If strict schema, ensure our aggregate field is available. 
           // Note: For best speed, 'outFields: ["*"]' is usually cached by the feature table anyway.
        }
      } catch (e) {
        console.warn("LayerView failed", e);
        return;
      }

      // Cleanup logic helper
      const cleanup = () => {
        if (pointerHandleRef.current) pointerHandleRef.current.remove();
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
        if (overlayLayerRef.current) overlayLayerRef.current.removeAll();
        circleGraphicRef.current = null;
        view.popupEnabled = true;
      };

      if (!isActive) {
        cleanup();
        return;
      }

      // 4. ACTIVATE TOOL
      view.popupEnabled = false; // Disable default clicks
      setStatusText("Active");

      // Initialize the reusable Graphic (Zero Allocation during move)
      circleGraphicRef.current = new Graphic({
        symbol: {
          type: "simple-fill",
          color: [0, 122, 255, 0.1],
          outline: { color: [0, 122, 255, 1], width: 1.5 },
        } as any
      });
      overlayLayerRef.current?.add(circleGraphicRef.current);

      // 5. POINTER MOVE HANDLER (Frame-Locked)
      pointerHandleRef.current = view.on("pointer-move", (event: any) => {
        // Prevent overlap of animation frames
        if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

        // Schedule logic for the next available screen repaint (60fps limit)
        rafIdRef.current = requestAnimationFrame(async () => {
          if (isQueryingRef.current) return; // Drop frame if previous calc is still running
          isQueryingRef.current = true;

          try {
            // A. Update Visuals (Instant)
            const mapPoint = view.toMap({ x: event.x, y: event.y });
            if (!mapPoint) { isQueryingRef.current = false; return; }

            const circleGeom = new Circle({
              center: mapPoint,
              radius: RADIUS_FEET,
              radiusUnit: "feet",
              geodesic: true // More accurate for geography, slightly slower math
            });

            // Update existing graphic geometry (Fastest method)
            if (circleGraphicRef.current) {
              circleGraphicRef.current.geometry = circleGeom;
            }

            // B. Run Query (Client-Side Memory Only)
            const query = layerView.createQuery();
            query.geometry = circleGeom;
            query.spatialRelationship = "intersects";
            query.returnGeometry = false; // Critical optimization: Don't ask for shapes
            query.outFields = [AGGREGATE_FIELD]; // Fetch ONLY the column we need

            // queryFeatures on layerView is synchronous-like for cached data
            const results = await layerView.queryFeatures(query);
            
            // C. Process Data
            const features = results.features || [];
            const count = features.length;
            
            // D. Batch State Updates (React Re-render)
            setTotalCount(count);
            // Only calc breakdown if we have data to save CPU
            if (count > 0) {
              const breakdown = aggregateFeatures(features);
              setFieldCounts(breakdown);
            } else {
              setFieldCounts([]);
            }

          } catch (err) {
             // Silent fail on edge cases
          } finally {
            isQueryingRef.current = false;
          }
        });
      });
    }

    void initializeTool();

    return () => {
      cancelled = true;
      if (pointerHandleRef.current) pointerHandleRef.current.remove();
      if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
      if (overlayLayerRef.current) overlayLayerRef.current.removeAll();
      const mapElement = mapRef.current;
      if (mapElement?.view) mapElement.view.popupEnabled = true;
    };
  }, [isActive, mapRef]);

  // --- RENDER UI ---
  if (!isActive) return null;

  return (
    <>
      <div slot="auto" style={{ marginTop: "1rem" }}>
        {/* The Activation Button is managed by the parent, but we can double up controls here if needed */}
      </div>

      <div slot="top-right" className="circle-inspector-panel">
        <div className="circle-panel-header">
          <div className="circle-panel-title">Radius Inspector</div>
          <div className="circle-panel-subtitle">{RADIUS_FEET} ft • {statusText}</div>
        </div>

        <div className="circle-metric-hero">
          <span className="metric-val">{totalCount}</span>
          <span className="metric-lbl">parcels</span>
        </div>

        <div className="circle-panel-section">
           <div className="circle-label">Top {AGGREGATE_FIELD}</div>
           <div className="circle-list">
             {topCounts.map((item, idx) => (
               <div key={idx} className="circle-list-row">
                 <span className="row-key" title={item.value}>{item.value}</span>
                 <span className="row-val">{item.count}</span>
               </div>
             ))}
             {topCounts.length === 0 && <div className="row-empty">No data in range</div>}
           </div>
        </div>
      </div>
    </>
  );
}
