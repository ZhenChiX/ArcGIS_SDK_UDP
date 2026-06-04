import { useEffect, useMemo, useRef, useState } from "react";
import Circle from "@arcgis/core/geometry/Circle";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import "../../styles/CircleInspectorTool.css";


interface CircleInspectorToolProps {
  mapRef: React.RefObject<any>;
  isActive: boolean;
}

// ================================================================
// Circle Inspector Config
// One inspector scans multiple target layers.
// ================================================================

const INSPECTION_RADIUS = 250;
const INSPECTION_UNIT = "feet" as const;

// Circle still moves every frame, but data queries are throttled.
const QUERY_THROTTLE_MS = 50;

// Do not highlight too many features at once.
// Parcel polygons can become heavy if this is too high.
const HIGHLIGHT_LIMIT = 250;

const INSPECTOR_TARGETS = [
  {
    key: "landUse",
    title: "Land Use",
    titleIncludes: "Property & Parcel",
    layerLabel: "Property & Parcel boundaries",
    aggregateField: "LAND_USE_1",
    groupLabel: "Land Use",
  },
  {
    key: "collision",
    title: "Traffic Collision",
    titleIncludes: "Collisions",
    layerLabel: "Collisions All Years UD 23-26",
    aggregateField: "ST_COLLISIONTYPE",
    groupLabel: "Collision Type",
  },
] as const;

type InspectorTarget = (typeof INSPECTOR_TARGETS)[number];

type FieldCount = {
  value: string;
  count: number;
};

type TargetLayerView = InspectorTarget & {
  layer: any;
  layerView: any;
};

type InspectorSummary = {
  key: string;
  title: string;
  layerLabel: string;
  groupLabel: string;
  total: number;
  counts: FieldCount[];
};

export default function CircleInspectorTool({
  mapRef,
  isActive,
}: CircleInspectorToolProps) {
  const [summaries, setSummaries] = useState<InspectorSummary[]>([]);
  const [statusText, setStatusText] = useState("Standby");

  // Graphics and event handles
  const overlayLayerRef = useRef<GraphicsLayer | null>(null);
  const circleGraphicRef = useRef<Graphic | null>(null);
  const pointerHandleRef = useRef<any>(null);
  const rafIdRef = useRef<number | null>(null);

  // Query / highlight state
  const isQueryingRef = useRef(false);
  const lastQueryTimeRef = useRef(0);
  const highlightHandlesRef = useRef<Record<string, any>>({});
  const lastHighlightKeysRef = useRef<Record<string, string>>({});
  const lastSummaryKeyRef = useRef("");

  const totalFeatureCount = useMemo(
    () => summaries.reduce((sum, section) => sum + section.total, 0),
    [summaries]
  );

  // ================================================================
  // Helper: recursively flatten WebMap layers and group sublayers.
  // ================================================================
  function flattenLayers(mapInstance: any) {
    const layers: any[] = [];

    function walk(layer: any) {
      if (!layer) return;

      const children = layer.layers || layer.sublayers;

      if (children && typeof children.forEach === "function") {
        children.forEach((child: any) => walk(child));
        return;
      }

      layers.push(layer);
    }

    mapInstance.layers.forEach((layer: any) => walk(layer));
    return layers;
  }

  // ================================================================
  // Helper: aggregate features by one field.
  // ================================================================
  function aggregateFeatures(
    features: any[],
    aggregateField: string
  ): FieldCount[] {
    const countsMap = features.reduce((acc, feature) => {
      const raw = feature.attributes?.[aggregateField];

      const value =
        raw === null || raw === undefined || raw === ""
          ? "N/A"
          : String(raw);

      acc[value] = (acc[value] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(countsMap)
      .map(([value, count]) => ({
        value,
        count: Number(count),
      }))
      .sort((a, b) => b.count - a.count);
  }

  // ================================================================
  // Helper: remove all highlights from all target layers.
  // ================================================================
  function clearHighlights() {
    Object.values(highlightHandlesRef.current).forEach((handle: any) => {
      handle?.remove?.();
    });

    highlightHandlesRef.current = {};
    lastHighlightKeysRef.current = {};
  }

  // ================================================================
  // Helper: full tool cleanup.
  // ================================================================
  function cleanup(view?: any) {
    pointerHandleRef.current?.remove();
    pointerHandleRef.current = null;

    if (rafIdRef.current) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }

    clearHighlights();

    overlayLayerRef.current?.removeAll();
    circleGraphicRef.current = null;

    isQueryingRef.current = false;
    lastQueryTimeRef.current = 0;
    lastSummaryKeyRef.current = "";

    if (view) {
      view.popupEnabled = true;
    }

    setSummaries([]);
    setStatusText("Standby");
  }

  // ================================================================
  // Helper: build queryable target layers from the current WebMap.
  // Uses title matching, not fixed index, so grouped layers are safer.
  // ================================================================
  async function buildTargetLayerViews(view: any, mapInstance: any) {
    const allLayers = flattenLayers(mapInstance);
    const targetLayerViews: TargetLayerView[] = [];

    for (const target of INSPECTOR_TARGETS) {
      const layer = allLayers.find((candidate: any) =>
        String(candidate.title ?? "")
          .toLowerCase()
          .includes(target.titleIncludes.toLowerCase())
      );

      if (!layer) {
        console.warn(
          `[CircleInspectorTool] Missing target layer: ${target.titleIncludes}`
        );
        continue;
      }

      try {
        const layerView = await view.whenLayerView(layer);

        targetLayerViews.push({
          ...target,
          layer,
          layerView,
        });
      } catch (error) {
        console.warn(
          `[CircleInspectorTool] LayerView failed: ${target.title}`,
          error
        );
      }
    }

    return targetLayerViews;
  }

  // ================================================================
  // Helper: highlight all visible target layers inside the radius.
  // Hidden layers are still summarized if their layerView is available,
  // but their visual highlight is cleared.
  // ================================================================
  function updateLayerHighlight(
    target: TargetLayerView,
    selectedObjectIds: any[]
  ) {
    const nextHighlightKey = selectedObjectIds.join(",");
    const previousHighlightKey = lastHighlightKeysRef.current[target.key];

    const layerCanHighlight =
      target.layer.visible !== false &&
      target.layerView &&
      target.layerView.suspended !== true;

    if (!layerCanHighlight) {
      highlightHandlesRef.current[target.key]?.remove?.();
      delete highlightHandlesRef.current[target.key];
      lastHighlightKeysRef.current[target.key] = "";
      return;
    }

    if (nextHighlightKey === previousHighlightKey) return;

    highlightHandlesRef.current[target.key]?.remove?.();
    delete highlightHandlesRef.current[target.key];

    if (
      selectedObjectIds.length > 0 &&
      selectedObjectIds.length <= HIGHLIGHT_LIMIT
    ) {
      highlightHandlesRef.current[target.key] =
        target.layerView.highlight(selectedObjectIds);
    }

    lastHighlightKeysRef.current[target.key] = nextHighlightKey;
  }

  // ================================================================
  // Helper: query all configured targets inside the same circle.
  // Uses layerView query for speed during live mouse-over.
  // ================================================================
  async function queryTargetsInCircle(
    targetLayerViews: TargetLayerView[],
    circleGeom: Circle
  ) {
    const now = Date.now();

    if (now - lastQueryTimeRef.current < QUERY_THROTTLE_MS) return;
    if (isQueryingRef.current) return;

    lastQueryTimeRef.current = now;
    isQueryingRef.current = true;

    try {
      const nextSummaries: InspectorSummary[] = [];

      for (const target of targetLayerViews) {
        const objectIdField = target.layer.objectIdField ?? "OBJECTID";

        // Data query: always use the source layer so hidden layers still count.
        const query = target.layerView.createQuery();
        query.geometry = circleGeom;
        query.spatialRelationship = "intersects";
        query.returnGeometry = false;
        query.outFields = [target.aggregateField, objectIdField];

        const results = await target.layerView.queryFeatures(query);

        const features = results.features ?? [];

        const selectedObjectIds = features
          .map((feature: any) => feature.attributes?.[objectIdField])
          .filter((id: any) => id !== undefined && id !== null);

        // Visual highlight: handled separately and only works when drawable.
        updateLayerHighlight(target, selectedObjectIds);

        nextSummaries.push({
          key: target.key,
          title: target.title,
          layerLabel: target.layer.title ?? target.layerLabel,
          groupLabel: target.groupLabel,
          total: features.length,
          counts:
            features.length > 0
              ? aggregateFeatures(features, target.aggregateField)
              : [],
        });
      }

      const nextSummaryKey = JSON.stringify(nextSummaries);

      if (nextSummaryKey !== lastSummaryKeyRef.current) {
        setSummaries(nextSummaries);
        lastSummaryKeyRef.current = nextSummaryKey;
      }
    } catch (error) {
      console.debug("[CircleInspectorTool] Query skipped:", error);
    } finally {
      isQueryingRef.current = false;
    }
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

      if (!isActive) {
        cleanup(view);
        return;
      }

      if (!overlayLayerRef.current) {
        overlayLayerRef.current = new GraphicsLayer({
          title: "Inspector Overlay",
          listMode: "hide",
        });

        mapInstance.add(overlayLayerRef.current);
      }

      const targetLayerViews = await buildTargetLayerViews(view, mapInstance);

      if (cancelled) return;

      if (targetLayerViews.length === 0) {
        setStatusText("No target layers");
        return;
      }

      view.popupEnabled = false;
      setStatusText("Active");

      overlayLayerRef.current.removeAll();

      circleGraphicRef.current = new Graphic({
        symbol: {
          type: "simple-fill",
          color: [0, 122, 255, 0.1],
          outline: {
            color: [0, 122, 255, 1],
            width: 1.5,
          },
        } as any,
      });

      overlayLayerRef.current.add(circleGraphicRef.current);

      pointerHandleRef.current?.remove();

      pointerHandleRef.current = view.on("pointer-move", (event: any) => {
        if (rafIdRef.current) {
          cancelAnimationFrame(rafIdRef.current);
        }

        rafIdRef.current = requestAnimationFrame(() => {
          const mapPoint = view.toMap({ x: event.x, y: event.y });
          if (!mapPoint) return;

          const circleGeom = new Circle({
            center: mapPoint,
            radius: INSPECTION_RADIUS,
            radiusUnit: INSPECTION_UNIT as any,
            geodesic: true,
          });

          // Keep circle movement snappy even if query is busy.
          if (circleGraphicRef.current) {
            circleGraphicRef.current.geometry = circleGeom;
          }

          // Do not query while user is actively panning/zooming.
          if (view.interacting) return;

          void queryTargetsInCircle(targetLayerViews, circleGeom);
        });
      });
    }

    void initializeTool();

    return () => {
      cancelled = true;

      const mapElement = mapRef.current;
      cleanup(mapElement?.view);
    };
  }, [isActive, mapRef]);

  if (!isActive) return null;

  return (
    <div slot="top-right" className="circle-inspector-panel">
      <div className="circle-panel-header">
        <div>
          <div className="circle-panel-title">Radius Inspector</div>
          <div className="circle-panel-subtitle">
            Search area · {statusText}
          </div>
        </div>
      </div>

      <div className="circle-metric-hero">
        <span className="metric-val">{totalFeatureCount}</span>
        <span className="metric-lbl">features</span>
      </div>

      {summaries.length === 0 ? (
        <div className="circle-panel-section">
          <div className="row-empty">Move over the map to scan nearby data</div>
        </div>
      ) : (
        summaries.map((section) => (
          <div key={section.key} className="circle-panel-section">
            <div className="circle-label">{section.title}</div>
            <div className="circle-value">{section.layerLabel}</div>

            <div className="circle-list" style={{ marginTop: "0.5rem" }}>
              <div className="circle-list-row">
                <span className="row-key">Total</span>
                <span className="row-val">{section.total}</span>
              </div>

              {section.counts.length === 0 ? (
                <div className="row-empty">No data in range</div>
              ) : (
                section.counts.slice(0, 6).map((item) => (
                  <div
                    key={`${section.key}-${item.value}`}
                    className="circle-list-row"
                  >
                    <span className="row-key">{item.value}</span>
                    <span className="row-val">{item.count}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        ))
      )}
    </div>
  );
}