// import { useEffect, useMemo, useRef, useState } from "react";
// import Circle from "@arcgis/core/geometry/Circle";
// import Graphic from "@arcgis/core/Graphic";
// import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
// import "../../styles/CircleInspectorTool.css";

// interface CircleInspectorToolProps {
//   mapRef: React.RefObject<any>;
//   isActive: boolean;
// }

// // CONFIGURATION
// const TARGET_TEST_INDEX = 2;
// const RADIUS_FEET = 250;
// const AGGREGATE_FIELD = "LAND_USE_1";
// let TARGET_LAYER_TITLE = "null";

// type FieldCount = {
//   value: string;
//   count: number;
// };

// export default function CircleInspectorTool({
//   mapRef,
//   isActive,
// }: CircleInspectorToolProps) {
//   // UI State 
//   const [totalCount, setTotalCount] = useState(0);
//   const [fieldCounts, setFieldCounts] = useState<FieldCount[]>([]);
//   const [statusText, setStatusText] = useState("Standby");

//   // Performance Refs
//   const overlayLayerRef = useRef<GraphicsLayer | null>(null);
//   const circleGraphicRef = useRef<Graphic | null>(null);
//   const pointerHandleRef = useRef<any>(null);
//   const highlightHandleRef = useRef<any>(null); // TRACKS THE GLOW
//   const rafIdRef = useRef<number | null>(null);
//   const isQueryingRef = useRef(false);

//   const topCounts = useMemo(() => fieldCounts.slice(0, 8), [fieldCounts]);

//   // --- HELPER: Flatten nested map layers ---
//   function flattenLayers(mapInstance: any) {
//     const layers: any[] = [];
//     mapInstance.layers.forEach((layer: any) => {
//       const children = layer.layers || layer.sublayers;
//       if (children && children.length > 0) {
//         children.forEach((child: any) => layers.push(child));
//       } else {
//         layers.push(layer);
//       }
//     });
//     return layers;
//   }

//   // --- HELPER: Fast Aggregation Logic ---
//   function aggregateFeatures(features: any[]) {
//     const countsMap = features.reduce((acc, feature) => {
//       const raw = feature.attributes[AGGREGATE_FIELD];
//       const val = raw === null || raw === undefined || raw === "" ? "N/A" : String(raw);
//       acc[val] = (acc[val] || 0) + 1;
//       return acc;
//     }, {} as Record<string, number>);

//     return Object.entries(countsMap)
//       .map(([value, count]) => ({ value, count: Number(count) }))
//       .sort((a, b) => b.count - a.count);
//   }

//   useEffect(() => {
//     let cancelled = false;

//     async function initializeTool() {
//       const mapElement = mapRef.current;
//       if (!mapElement?.viewOnReady) return;
//       await mapElement.viewOnReady();
//       if (cancelled) return;

//       const view = mapElement.view;
//       const mapInstance = mapElement.map;
//       if (!view || !mapInstance) return;

//       // 1. SETUP GRAPHICS LAYER (Once)
//       if (!overlayLayerRef.current) {
//         overlayLayerRef.current = new GraphicsLayer({
//           title: "Inspector Overlay",
//           listMode: "hide",
//           elevationInfo: { mode: "on-the-ground" }
//         });
//         mapInstance.add(overlayLayerRef.current);
//       }

//       // 2. IDENTIFY TARGET LAYER
//       const allLayers = flattenLayers(mapInstance);
//       const targetLayer = allLayers[TARGET_TEST_INDEX];
//       TARGET_LAYER_TITLE = allLayers[TARGET_TEST_INDEX]?.title || "Unknown Layer";

//       if (!targetLayer) {
//         setStatusText("Layer Error");
//         return;
//       }

//       // 3. WAIT FOR CLIENT-SIDE VIEW
//       let layerView: any = null;
//       try {
//         layerView = await view.whenLayerView(targetLayer);
//       } catch (e) {
//         console.warn("LayerView failed", e);
//         return;
//       }

//       // Cleanup logic helper
//       const cleanup = () => {
//         if (pointerHandleRef.current) pointerHandleRef.current.remove();
//         if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
//         if (highlightHandleRef.current) highlightHandleRef.current.remove(); // Remove Glow
//         if (overlayLayerRef.current) overlayLayerRef.current.removeAll();
//         circleGraphicRef.current = null;
//         view.popupEnabled = true;
//       };

//       if (!isActive) {
//         cleanup();
//         return;
//       }

//       // 4. ACTIVATE TOOL
//       view.popupEnabled = false;
//       setStatusText("Active");

//       // Initialize the reusable Graphic 
//       circleGraphicRef.current = new Graphic({
//         symbol: {
//           type: "simple-fill",
//           color: [0, 122, 255, 0.1],
//           outline: { color: [0, 122, 255, 1], width: 1.5 },
//         } as any
//       });
//       overlayLayerRef.current?.add(circleGraphicRef.current);

//       // 5. POINTER MOVE HANDLER (Frame-Locked)
//       pointerHandleRef.current = view.on("pointer-move", (event: any) => {
//         if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);

//         rafIdRef.current = requestAnimationFrame(async () => {
//           if (isQueryingRef.current) return;
//           isQueryingRef.current = true;

//           try {
//             // A. Update Visuals (Instant)
//             const mapPoint = view.toMap({ x: event.x, y: event.y });
//             if (!mapPoint) { isQueryingRef.current = false; return; }

//             const circleGeom = new Circle({
//               center: mapPoint,
//               radius: RADIUS_FEET,
//               radiusUnit: "feet",
//               geodesic: true
//             });

//             if (circleGraphicRef.current) {
//               circleGraphicRef.current.geometry = circleGeom;
//             }

//             // B. Run Query 
//             const query = layerView.createQuery();
//             query.geometry = circleGeom;
//             query.spatialRelationship = "intersects";
//             query.returnGeometry = false;

//             // [CRITICAL FIX] We MUST request the OBJECTID field for highlighting to work
//             const objectIdField = targetLayer.objectIdField || "OBJECTID";
//             query.outFields = [AGGREGATE_FIELD, objectIdField];

//             const results = await layerView.queryFeatures(query);

//             // C. Process Data
//             const features = results.features || [];
//             const count = features.length;
//             // --- E. APPLY THE NATIVE HIGHLIGHT ---
//             // 1. Clear old highlight
//             if (highlightHandleRef.current) {
//               highlightHandleRef.current.remove();
//               highlightHandleRef.current = null;
//             }

//             // 2. Add new highlight (This uses the same engine as clicking!)
//             if (count > 0) {
//               highlightHandleRef.current = layerView.highlight(features);
//             }
//             // -------------------------------------

//             // D. Batch State Updates
//             setTotalCount(count);
//             if (count > 0) {
//               const breakdown = aggregateFeatures(features);
//               setFieldCounts(breakdown);

//               // For debugging: Log the top breakdown
//               console.log("Top Breakdown:", breakdown[0]);
//             } else {
//               setFieldCounts([]);
//             }

//           } catch (err) {
//             // Silent fail
//           } finally {
//             isQueryingRef.current = false;
//           }
//         });
//       });

//     }

//     void initializeTool();

//     return () => {
//       cancelled = true;
//       // Full cleanup ensures no stuck highlights
//       if (pointerHandleRef.current) pointerHandleRef.current.remove();
//       if (rafIdRef.current) cancelAnimationFrame(rafIdRef.current);
//       if (highlightHandleRef.current) highlightHandleRef.current.remove();
//       if (overlayLayerRef.current) overlayLayerRef.current.removeAll();
//       const mapElement = mapRef.current;
//       if (mapElement?.view) mapElement.view.popupEnabled = true;
//     };
//   }, [isActive, mapRef]);

//   if (!isActive) return null;

//   return (
//     <div slot="top-right" className="circle-inspector-panel">
//       <div className="circle-panel-header">
//         <div>
//           <div className="circle-panel-title">Radius Inspector</div>
//           <div className="circle-panel-subtitle">Search area · {statusText}</div>
//         </div>
//       </div>

//       <div className="circle-metric-hero">
//         <span className="metric-val">{totalCount}</span>
//         <span className="metric-lbl">features</span>
//       </div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Layer</div>
//         <div className="circle-value">{TARGET_LAYER_TITLE || "Unknown Layer"}</div>
//       </div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Grouped By</div>
//         <div className="circle-value">{AGGREGATE_FIELD}</div>
//       </div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Breakdown</div>

//         <div className="circle-list">
//           {topCounts.length === 0 ? (
//             <div className="row-empty">No data in range</div>
//           ) : (
//             topCounts.map((item) => (
//               <div key={item.value} className="circle-list-row">
//                 <span className="row-key">{item.value}</span>
//                 <span className="row-val">{item.count}</span>
//               </div>
//             ))
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
