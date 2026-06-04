

import { useEffect, useRef, useState } from "react";

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

import "../../MapCanvas.css";
// import RadiusSelectTool from "../sketch/RadiusSelectTool";

// import CircleInspectorTool from "../sketch/RadiusSelectTool";
import CircleInspectorTool from "../sketch/CircleInspectorTool";


const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";
//Global constants for layer indexing and UI configuration
const TARGET_TEST_INDEX = 2;
const SIDEBAR_ALLOWED_LAYER_INDEXES = [2];
const TABLE_BOTTOM_PADDING = 280;
// =================================================================
// Helper: Flatten WebMap layers and nested group/sublayers into one array.
// This gives us a stable test index registry for table + tools.
// =================================================================
function flattenMapLayers(mapInstance: any) {
  const flattenedLayers: any[] = [];

  mapInstance.layers.forEach((layer: any) => {
    const nestedChildren = layer.layers || layer.sublayers;

    if (nestedChildren && nestedChildren.length > 0) {
      nestedChildren.forEach((childLayer: any) => {
        flattenedLayers.push(childLayer);
      });
    } else {
      flattenedLayers.push(layer);
    }
  });

  return flattenedLayers;
}

export default function MapCanvas() {
  const mapRef = useRef<any>(null);
  const featureTableRef = useRef<any>(null);

  // State management
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [tableVisible, setTableVisible] = useState(false);
  const [circleInspectorActive, setCircleInspectorActive] = useState(false);
  // Highlight state for Circle Inspector
  const [circleSelectedIds, setCircleSelectedIds] = useState<number[]>([]);

  function handleLayersAction() {
    setPanelCollapsed((currentCollapsed) => !currentCollapsed);
  }

  function handleTableAction() {
    setTableVisible((currentVisible) => !currentVisible);
  }

  // =================================================================
  // Helper: Configure popup as a docked top-right panel.
  // Disabled by CircleInspectorTool while live scanning.
  // =================================================================
  function configurePopup(mapElement: any) {
    const popup = mapElement.popupElement;
    if (!popup) return;

    popup.dockEnabled = true;
    popup.hideCloseButton = false;
    popup.hideActionBar = true;
    popup.dockOptions = {
      buttonEnabled: false,
      breakpoint: false,
      position: "top-right",
    };
  }
  // =================================================================
  // Helper: Reserve bottom map space when feature table is visible.
  // =================================================================
  function applyMapPadding(mapElement: any, isTableVisible: boolean) {
    mapElement.padding = isTableVisible
      ? { bottom: TABLE_BOTTOM_PADDING, top: 0, left: 0, right: 0 }
      : { bottom: 0, top: 0, left: 0, right: 0 };
  }
  // =================================================================
  // Helper: Hide unwanted top-level layers from LayerList sidebar.
  // This does not remove layers from the map; it only hides them from UI.
  // =================================================================
  function filterLayerList(mapInstance: any) {
    mapInstance.layers.forEach((layer: any, index: number) => {
      if (!SIDEBAR_ALLOWED_LAYER_INDEXES.includes(index)) {
        layer.listMode = "hide";
      }
    });
  }
  // =================================================================
  // Helper: Connect FeatureTable to the same target layer used by testing.
  // Current MVP uses flattened layer index TARGET_TEST_INDEX.
  // =================================================================
  function configureFeatureTable(tableElement: any, mapElement: any) {
    if (!tableElement || !mapElement?.map) return;

    tableElement.referenceElement = mapElement;

    const flattenedLayers = flattenMapLayers(mapElement.map);

    console.log("--- Flat Sublayer Registry Map ---");
    flattenedLayers.forEach((layer, index) => {
      console.log(
        `[Index ${index}] -> Name: "${layer.title}" | Type: ${layer.type || "sublayer"}`
      );
    });

    const selectedTargetLayer = flattenedLayers[TARGET_TEST_INDEX];

    if (selectedTargetLayer) {
      tableElement.layer = selectedTargetLayer;
      console.log(
        `[Success] Table loaded index [${TARGET_TEST_INDEX}]: "${selectedTargetLayer.title}"`
      );
      return;
    }

    const fallbackLayer = flattenedLayers.find(
      (layer) => layer.type === "feature" || layer.layerId !== undefined
    );

    if (fallbackLayer) {
      tableElement.layer = fallbackLayer;
      console.log(`[Fallback Alert] Loading working layer: "${fallbackLayer.title}"`);
    }
  }
  // =================================================================
  // Effect 1: One-time map setup.
  // Waits for ArcGIS map readiness, configures popup, layer list, and table layer.
  // =================================================================
  useEffect(() => {
    let cancelled = false;

    async function initializeMapOnce() {
      const mapElement = mapRef.current;
      if (!mapElement?.viewOnReady) return;

      await mapElement.viewOnReady();
      if (cancelled) return;

      configurePopup(mapElement);

      if (mapElement.map) {
        filterLayerList(mapElement.map);
      }

      if (featureTableRef.current) {
        configureFeatureTable(featureTableRef.current, mapElement);
      }
    }

    void initializeMapOnce();

    return () => {
      cancelled = true;
    };
  }, []);
  // =================================================================
  // Effect 2: Update map padding when bottom FeatureTable opens/closes.
  // =================================================================
  useEffect(() => {
    const mapElement = mapRef.current;
    if (!mapElement) return;

    applyMapPadding(mapElement, tableVisible);

    if (tableVisible && featureTableRef.current) {
      configureFeatureTable(featureTableRef.current, mapElement);
    }
  }, [tableVisible]);

  // =================================================================
  // Effect 3: Sync CircleInspector selected ObjectIDs into FeatureTable.
  // The inspector owns spatial query; MapCanvas owns the table.
  // =================================================================
  useEffect(() => {
    const tableElement = featureTableRef.current as any;
    if (!tableElement || circleSelectedIds.length === 0) return;

    function syncTableSelection() {
      const tableWidget = tableElement.widget ?? tableElement.featureTable ?? tableElement;

      try {
        // Visual row highlight if supported.
        tableWidget.rowHighlightIds?.removeAll?.();
        tableWidget.rowHighlightIds?.addMany?.(circleSelectedIds);

        // True selected/highlight IDs if supported.
        tableWidget.highlightIds?.removeAll?.();
        tableWidget.highlightIds?.addMany?.(circleSelectedIds);
      } catch (error) {
        console.warn("[MapCanvas] Could not sync table selection:", error);
      }
    }

    requestAnimationFrame(syncTableSelection);
  }, [circleSelectedIds, tableVisible]);
  return (
    <calcite-shell className="udp-shell">
      <calcite-shell-header slot="header">
        <h3>U DISTRICT PARTNERSHIP</h3>
      </calcite-shell-header>

      <calcite-shell-panel slot="panel-end" width-scale="auto" collapsed={panelCollapsed ? true : undefined}>
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
            label="Circle Inspector"
            text="Inspector"
            active={circleInspectorActive ? true : undefined}
            onClick={() => setCircleInspectorActive((value) => !value)}
          />

          <calcite-tooltip reference-element="circle-inspector-button" placement="auto">
            <span>Inspector Circle</span>
          </calcite-tooltip>

          {/* Future buttons goes here */}
        </calcite-action-bar>

        <calcite-panel heading="Layers">
          <arcgis-layer-list reference-element={MAP_ID}
            tooltip="Layers"
            selection-mode="single" />
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
        <CircleInspectorTool
          mapRef={mapRef}
          isActive={circleInspectorActive}
          onSelectionChange={setCircleSelectedIds}
        />
        {/* <CircleInspectorTool mapRef={mapRef} targetTestIndex={4} /> */}

        {/* Scale Bar */}
        <arcgis-scale-bar slot="bottom-start" bar-style="line" unit="imperial"></arcgis-scale-bar>

        {/* <arcgis-search slot="top-right" /> */}

        {/* 
          SLOT POSITIONING FIX:
          Placing the container directly inside the arcgis-map using slot="bottom-start" 
          ensures that it stays nested within the map layout engine boundaries.
        */}
        {tableVisible && (

          <div slot="bottom-start" className="inner-map-table-panel" >
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
