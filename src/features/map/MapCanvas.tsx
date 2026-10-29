import { useCallback, useEffect, useRef, useState } from "react";

import "@arcgis/map-components/main.css";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-feature-table";
// import arcgis-scale-bar
import "@arcgis/map-components/components/arcgis-scale-bar";

import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-tooltip";

import "@esri/calcite-components/components/calcite-button";
import "@esri/calcite-components/components/calcite-popover";
import "@esri/calcite-components/components/calcite-card";
import "@esri/calcite-components/components/calcite-dialog";

import "../../MapCanvas.css";
// import RadiusSelectTool from "../sketch/RadiusSelectTool";

// import CircleInspectorTool from "../sketch/RadiusSelectTool";
import CircleInspectorTool from "../sketch/CircleInspectorTool";

import PlanningTools from "./PlanningTools";
import type MapView from "@arcgis/core/views/MapView";

const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";

export default function MapCanvas() {
  const mapRef = useRef<any>(null);
  const featureTableRef = useRef<any>(null);

  // State management
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [tableVisible, setTableVisible] = useState(false);
  const [circleInspectorActive, setCircleInspectorActive] = useState(false);

  const [planningOpen, setPlanningOpen] = useState(false);
  const [view, setView] = useState<MapView | null>(null);
  const [mapStatus, setMapStatus] = useState("Loading district map…");
  const drawingChanged = useCallback((drawing: boolean) => {
    if (drawing) setCircleInspectorActive(false);
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(
      () =>
        setMapStatus(
          "Map is taking longer to load. Check your connection and access to ArcGIS services, then reload.",
        ),
      20000,
    );
    if (view) {
      window.clearTimeout(timer);
      setMapStatus("");
    }
    return () => window.clearTimeout(timer);
  }, [view]);

  // Highlight state for Circle Inspector
  // const [circleSelectedIds, setCircleSelectedIds] = useState<number[]>([]);

  function handleLayersAction() {
    setPlanningOpen(false);
    setPanelCollapsed((currentCollapsed) => !currentCollapsed);
  }

  function handleTableAction() {
    setTableVisible((currentVisible) => !currentVisible);
  }

  // =================================================================
  // ONLY HOOK NEEDED: Controls Popups, Padding, and Force-Loads a Layer
  // =================================================================
  useEffect(() => {
    let cancelled = false;

    async function initializeAndSetupUI() {
      const mapElement = mapRef.current;
      const tableElement = featureTableRef.current;

      if (!mapElement?.viewOnReady) return;
      await mapElement.viewOnReady();
      if (cancelled) return;
      setView(mapElement.view);

      // Connect table reference anchor
      if (tableElement) {
        tableElement.referenceElement = mapElement;
      }

      // Configure Popup Positions
      const popup = mapElement.popupElement;
      if (popup) {
        popup.dockEnabled = true;
        popup.hideCloseButton = false;
        popup.hideActionBar = true;
        popup.dockOptions = {
          buttonEnabled: false,
          breakpoint: false,
          position: "top-right",
        };
      }

      // Adjust padding map layout boundaries
      if (tableVisible) {
        mapElement.padding = { bottom: 280, top: 0, left: 0, right: 0 };
      } else {
        mapElement.padding = { bottom: 0, top: 0, left: 0, right: 0 };
      }

      // --- METHOD 2: FILTERING SIDEBAR LIST BY INDEX ---
      const mapInstance = mapElement.map;
      if (mapInstance && mapInstance.layers) {
        mapInstance.layers.forEach((layer: any, index: number) => {
          const allowedIndexes = [0, 1]; // Keep your preferred sidebar indices active
          // Index 0: "Commercial & Land Use"
          // Index 1: "Micromobility"
          // Index 2: "U District Boundary"
          // Index 3: "Zone Mask"
          // Index 4: "Inspector Overlay"
          console.log(`Layer Index ${index}: "${layer.title}"`);

          if (!allowedIndexes.includes(index) && layer.title !== "Planning annotations") {
            layer.listMode = "hide";
          }
        });

        // =================================================================
        // FINAL FIXED CODE BLOCK: LOAD DYNAMIC SUB-LAYERS BY INDEX
        // 0 = Property & Parcel boundaries       polygon / parcel inspector
        // 1 = Active Business License_UD         business activity points
        // 2 = Food_Facilites_UD                  food facility points
        // 3 = Lime Bike Feed_Heatmap             heatmap version
        // 4 = Lime Bike Feed_Point               point version
        // 5 = ON Street Bike Racks UD            bike rack points
        // 6 = OFF Street Bike Racks              bike rack points
        // 7 = Collisions All Years UD 23-26      safety/collision points or lines
        // 8 = U District Boundary                boundary
        // 9 = Zone Mask                          mask
        // 10 = Inspector Overlay                 graphics layer
        // =================================================================
        if (tableElement) {
          // Flatten the map's layout arrays to automatically extract all hidden nested child layers
          const allFlattenedLayers: any[] = [];

          mapInstance.layers.forEach((layer: any) => {
            // Drill into nested sub-structures if present (.layers or .sublayers collections)
            const nestedChildren = layer.layers || layer.sublayers;
            if (nestedChildren && nestedChildren.length > 0) {
              nestedChildren.forEach((sublayer: any) => {
                allFlattenedLayers.push(sublayer);
              });
            } else {
              allFlattenedLayers.push(layer);
            }
          });

          // Console log map index layout registry to make debugging easy
          console.log("--- Flat Sublayer Registry Map ---");
          allFlattenedLayers.forEach((layer, idx) => {
            console.log(
              `[Index ${idx}] -> Name: "${layer.title}" | Type: ${layer.type || "sublayer"}`,
            );
          });

          // -----------------------------------------------------------
          // TESTING AREA: Change this index number to test out different sheets!
          // -----------------------------------------------------------
          const targetTestIndex = 0;

          const selectedTargetSheet = allFlattenedLayers[targetTestIndex];

          if (selectedTargetSheet) {
            tableElement.layer = selectedTargetSheet;
            console.log(
              `[Success] Table loaded index [${targetTestIndex}]: "${selectedTargetSheet.title}"`,
            );
          } else {
            // Absolute fail-safe fallback to load whatever works if the testing index is out of bounds
            const functionalFallback = allFlattenedLayers.find(
              (l) => l.type === "feature" || l.layerId !== undefined,
            );
            if (functionalFallback) {
              tableElement.layer = functionalFallback;
              console.log(
                `[Fallback Alert] Loading working layer: "${functionalFallback.title}"`,
              );
            }
          }
        }
      }
    }

    void initializeAndSetupUI().catch(() => {
      if (!cancelled)
        setMapStatus(
          "Unable to load the district map. Check access to ArcGIS services and reload.",
        );
    });

    return () => {
      cancelled = true;
    };
  }, [tableVisible]);
  return (
    <calcite-shell className="udp-shell">
      <header slot="header" className="udp-header">
        <div>
          <span className="planning-eyebrow">U DISTRICT PARTNERSHIP</span>
          <h1>District planning map</h1>
        </div>
        <span className="udp-header-note">Explore · Plan · Share</span>
      </header>
      {mapStatus && !planningOpen && (
        <div className="map-status" role="status">
          {mapStatus}
        </div>
      )}

      <calcite-shell-panel
        slot="panel-end"
        width-scale="m"
        collapsed={panelCollapsed ? true : undefined}
      >
        <calcite-action-bar slot="action-bar">
          {/* Layer List Toggle Button */}
          <calcite-action
            id="layer-button"
            icon="layers"
            label="Layers"
            text="Layers"
            active={!panelCollapsed ? true : undefined}
            onClick={handleLayersAction}
          />
          <calcite-tooltip reference-element="layer-button" placement="auto">
            <span>Layers</span>
          </calcite-tooltip>
          {/* Table Toggle Button */}
          <calcite-action
            id="table-button"
            icon="table"
            label="Table"
            text="Table"
            active={tableVisible ? true : undefined}
            onClick={handleTableAction}
          />
          <calcite-tooltip reference-element="table-button" placement="auto">
            <span>Show Tables</span>
          </calcite-tooltip>

          {/* Circle Inspector Toggle Button */}
          <calcite-action
            id="circle-inspector-button"
            icon="chart-magnifying-glass"
            label="Inspector Circle"
            text="Inspector"
            active={circleInspectorActive ? true : undefined}
            onClick={() => {
              setPlanningOpen(false);
              setCircleInspectorActive((value) => !value);
            }}
          />

          <calcite-tooltip
            reference-element="circle-inspector-button"
            placement="auto"
          >
            <span>Inspector Circle</span>
          </calcite-tooltip>

          <calcite-action
            id="planning-button"
            icon="pencil-mark"
            text="Planning tools"
            label="Planning tools"
            active={planningOpen ? true : undefined}
            onClick={() => {
              setPlanningOpen((value) => !value);
              setPanelCollapsed(false);
              setCircleInspectorActive(false);
            }}
          />
          <calcite-tooltip reference-element="planning-button">
            Basemaps, annotations & export
          </calcite-tooltip>
        </calcite-action-bar>

        <calcite-panel heading={planningOpen ? "Planning tools" : "Layers"}>
          <PlanningTools
            view={view}
            active={planningOpen}
            onDrawingChange={drawingChanged}
          />
          <div hidden={planningOpen}>
            <arcgis-layer-list
              reference-element={MAP_ID}
              tooltip="Layers"
              selection-mode="single"
            />
          </div>
        </calcite-panel>
      </calcite-shell-panel>

      {/* Arcgis main map loader */}
      <arcgis-map
        id={MAP_ID}
        itemId={WEBMAP_ID}
        ref={mapRef}
        className="map"
        center={[-122.31232, 47.66126]}
        zoom={14}
        popupComponentEnabled
        dockingEnabled
      >
        <arcgis-expand slot="top-left" mode="auto">
          <arcgis-legend label="Legend" icon="legend"></arcgis-legend>
        </arcgis-expand>

        <div slot="top-start" className="tools_bottom">
          <arcgis-zoom />
          <arcgis-home />
          {/* <CircleInspectorTool mapRef={mapRef}/> */}

          {/* // Target test index based on flattened layer. */}
        </div>
        {/* Inspector Component */}
        <CircleInspectorTool mapRef={mapRef} isActive={circleInspectorActive} />
        {/* <CircleInspectorTool mapRef={mapRef} targetTestIndex={4} /> */}

        {/* Scale Bar */}
        <arcgis-scale-bar
          slot="bottom-start"
          bar-style="line"
          unit="imperial"
        ></arcgis-scale-bar>

        {/* <arcgis-search slot="top-right" /> */}

        {/* 
          SLOT POSITIONING FIX:
          Placing the container directly inside the arcgis-map using slot="bottom-start" 
          ensures that it stays nested within the map layout engine boundaries.
        */}
        {tableVisible && (
          <div slot="bottom-start" className="inner-map-table-panel">
            <arcgis-feature-table
              ref={featureTableRef}
              id="udp-feature-table"
              reference-element={MAP_ID}
              show-layer-dropdown="true"
              related-records-enabled="true"
              show-selection-column="true"
            ></arcgis-feature-table>
          </div>
        )}
      </arcgis-map>
    </calcite-shell>
  );
}
