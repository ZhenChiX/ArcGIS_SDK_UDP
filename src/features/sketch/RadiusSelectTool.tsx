// import { useEffect, useMemo, useRef, useState } from "react";
// import Circle from "@arcgis/core/geometry/Circle";
// import Graphic from "@arcgis/core/Graphic";
// import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
// import "../../styles/CircleInspectorTool.css";

// interface CircleInspectorToolProps {
//   mapRef: React.RefObject<any>;
//   isActive: boolean;
// }

// /**
//  * Module-level config.
//  * MapCanvas only controls ON/OFF.
//  */
// // target layers index to inspect (after flattening)
// const TARGET_TEST_INDEX = 2;
// const RADIUS_FEET = 250;
// const AGGREGATE_FIELD = "LAND_USE_1";
// const QUERY_THROTTLE_MS = 250;

// type FieldCount = {
//   value: string;
//   count: number;
// };

// export default function CircleInspectorTool({
//   mapRef,
//   isActive,
// }: CircleInspectorToolProps) {
//   const [layerName, setLayerName] = useState("Target layer");
//   const [totalCount, setTotalCount] = useState(0);
//   const [fieldCounts, setFieldCounts] = useState<FieldCount[]>([]);
//   const [lastCursor, setLastCursor] = useState("");
//   const [statusText, setStatusText] = useState("Move over map to inspect.");

//   const overlayLayerRef = useRef<GraphicsLayer | null>(null);
//   const pointerHandleRef = useRef<any>(null);
//   const queryRunRef = useRef(0);
//   const lastQueryTimeRef = useRef(0);

//   const topCounts = useMemo(() => fieldCounts.slice(0, 8), [fieldCounts]);

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

//   function clearOutput() {
//     overlayLayerRef.current?.removeAll();
//     setTotalCount(0);
//     setFieldCounts([]);
//     setLastCursor("");
//     setStatusText("Move over map to inspect.");
//   }

//   function buildCounts(features: any[]) {
//     const counts = new Map<string, number>();

//     features.forEach((feature) => {
//       const rawValue = feature.attributes?.[AGGREGATE_FIELD];

//       const value =
//         rawValue === null || rawValue === undefined || rawValue === ""
//           ? "Unknown"
//           : String(rawValue);

//       counts.set(value, (counts.get(value) ?? 0) + 1);
//     });

//     return Array.from(counts.entries())
//       .map(([value, count]) => ({ value, count }))
//       .sort((a, b) => b.count - a.count);
//   }

//   useEffect(() => {
//     let cancelled = false;

//     async function setupInspector() {
//       const mapElement = mapRef.current;
//       if (!mapElement?.viewOnReady) return;

//       await mapElement.viewOnReady();
//       if (cancelled) return;

//       const view = mapElement.view;
//       const mapInstance = mapElement.map;

//       if (!view || !mapInstance) return;

//       if (!overlayLayerRef.current) {
//         overlayLayerRef.current = new GraphicsLayer({
//           title: "Circle Inspector Overlay",
//           listMode: "hide",
//         });

//         mapInstance.add(overlayLayerRef.current);
//       }

//       const allLayers = flattenLayers(mapInstance);
//       const targetLayer = allLayers[TARGET_TEST_INDEX];

//       if (!targetLayer) {
//         setLayerName(`Layer index ${TARGET_TEST_INDEX} not found`);
//         setStatusText("Target layer not found.");
//         return;
//       }

//       setLayerName(targetLayer.title ?? `Layer ${TARGET_TEST_INDEX}`);

//       let layerView: any = null;

//       try {
//         layerView = await view.whenLayerView(targetLayer);
//       } catch (error) {
//         console.warn("[CircleInspectorTool] Could not create layerView:", error);
//         setStatusText("Target layer is not queryable.");
//         return;
//       }

//       if (cancelled) return;

//       if (!isActive) {
//         view.popupEnabled = true;
//         clearOutput();
//         pointerHandleRef.current?.remove();
//         pointerHandleRef.current = null;
//         return;
//       }

//       view.popupEnabled = false;
//       setStatusText("Inspector active. Move over the map.");

//       pointerHandleRef.current?.remove();

//       pointerHandleRef.current = view.on("pointer-move", async (event: any) => {
//         const now = Date.now();

//         if (now - lastQueryTimeRef.current < QUERY_THROTTLE_MS) return;
//         lastQueryTimeRef.current = now;

//         const runId = ++queryRunRef.current;

//         try {
//           const mapPoint = view.toMap({ x: event.x, y: event.y });
//           if (!mapPoint) return;

//           const circle = new Circle({
//             center: mapPoint,
//             radius: RADIUS_FEET,
//             radiusUnit: "feet",
//             geodesic: true,
//           });

//           overlayLayerRef.current?.removeAll();

//           overlayLayerRef.current?.add(
//             new Graphic({
//               geometry: circle,
//               symbol: {
//                 type: "simple-fill",
//                 color: [0, 122, 255, 0.1],
//                 outline: {
//                   color: [0, 122, 255, 0.95],
//                   width: 2,
//                 },
//               } as any,
//             })
//           );

//           const query = targetLayer.createQuery();
//           query.geometry = circle;
//           query.spatialRelationship = "intersects";
//           query.outFields = [AGGREGATE_FIELD];
//           query.returnGeometry = false;

//           /**
//            * layerView.queryFeatures is faster for already-loaded client features.
//            * If it fails, fallback to layer.queryFeatures.
//            */
//           let result;

//           try {
//             result = await layerView.queryFeatures(query);
//           } catch {
//             result = await targetLayer.queryFeatures(query);
//           }

//           if (cancelled || runId !== queryRunRef.current) return;

//           const features = result.features ?? [];
//           const counts = buildCounts(features);

//           setTotalCount(features.length);
//           setFieldCounts(counts);
//           setLastCursor(
//             `${mapPoint.latitude?.toFixed?.(5) ?? "?"}, ${
//               mapPoint.longitude?.toFixed?.(5) ?? "?"
//             }`
//           );
//           setStatusText("Live query complete.");

//           console.log(
//             `[CircleInspectorTool] ${features.length} records in ${targetLayer.title}`
//           );
//           console.table(counts);
//         } catch (error) {
//           console.debug("[CircleInspectorTool] query skipped:", error);
//         }
//       });
//     }

//     void setupInspector();

//     return () => {
//       cancelled = true;

//       pointerHandleRef.current?.remove();
//       pointerHandleRef.current = null;

//       const mapElement = mapRef.current;
//       if (mapElement?.view) {
//         mapElement.view.popupEnabled = true;
//       }

//       if (!isActive) {
//         overlayLayerRef.current?.removeAll();
//       }
//     };
//   }, [isActive, mapRef]);

//   if (!isActive) return null;

//   return (
//     <div slot="top-left" className="circle-inspector-panel">
//       <div className="circle-panel-header">
//         <div>
//           <div className="circle-panel-title">Circle Inspector</div>
//           <div className="circle-panel-subtitle">{RADIUS_FEET} ft live radius</div>
//         </div>

//         <button className="circle-panel-clear" type="button" onClick={clearOutput}>
//           Clear
//         </button>
//       </div>

//       <div className="circle-status">{statusText}</div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Target Layer</div>
//         <div className="circle-value">{layerName}</div>
//       </div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Aggregate Field</div>
//         <div className="circle-value">{AGGREGATE_FIELD}</div>
//       </div>

//       <div className="circle-stat-row">
//         <div>
//           <div className="circle-label">Features Found</div>
//           <div className="circle-big-number">{totalCount}</div>
//         </div>

//         <div>
//           <div className="circle-label">Cursor</div>
//           <div className="circle-small-text">{lastCursor || "Move over map"}</div>
//         </div>
//       </div>

//       <div className="circle-panel-section">
//         <div className="circle-label">Land Use Count</div>

//         {topCounts.length === 0 ? (
//           <div className="circle-empty">No features detected inside the radius.</div>
//         ) : (
//           <div className="circle-count-list">
//             {topCounts.map((item) => (
//               <div key={item.value} className="circle-count-item">
//                 <span title={item.value}>{item.value}</span>
//                 <strong>{item.count}</strong>
//               </div>
//             ))}
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }