import { useEffect, useRef, useState } from "react";

import "@arcgis/map-components/main.css";
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-feature-table";

import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-tooltip";

import "../../MapCanvas.css";

const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";

export default function MapCanvas() {
  const mapRef = useRef<any>(null);
  const featureTableRef = useRef<any>(null);

  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [tableVisible, setTableVisible] = useState(false);

  function handleLayersAction() {
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
          const allowedIndexes = [2]; // Keep your preferred sidebar indices active

          if (!allowedIndexes.includes(index)) {
            layer.listMode = "hide";
          }
        });

        // =================================================================
        // FINAL FIXED CODE BLOCK: LOAD DYNAMIC SUB-LAYERS BY INDEX
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
            console.log(`[Index ${idx}] -> Name: "${layer.title}" | Type: ${layer.type || "sublayer"}`);
          });

          // -----------------------------------------------------------
          // TESTING AREA: Change this index number to test out different sheets!
          // -----------------------------------------------------------
          const targetTestIndex = 2;

          const selectedTargetSheet = allFlattenedLayers[targetTestIndex];

          if (selectedTargetSheet) {
            tableElement.layer = selectedTargetSheet;
            console.log(`[Success] Table loaded index [${targetTestIndex}]: "${selectedTargetSheet.title}"`);
          } else {
            // Absolute fail-safe fallback to load whatever works if the testing index is out of bounds
            const functionalFallback = allFlattenedLayers.find(l => l.type === "feature" || l.layerId !== undefined);
            if (functionalFallback) {
              tableElement.layer = functionalFallback;
              console.log(`[Fallback Alert] Loading working layer: "${functionalFallback.title}"`);
            }
          }
        }
      }
    }

    void initializeAndSetupUI();

    return () => {
      cancelled = true;
    };
  }, [tableVisible]);
  return (
    <calcite-shell className="udp-shell">
      <calcite-shell-header slot="header">
        <h3>U DISTRICT PARTNERSHIP</h3>
      </calcite-shell-header>

      <calcite-shell-panel slot="panel-end" width-scale="auto" collapsed={panelCollapsed ? true : undefined}>
        <calcite-action-bar slot="action-bar">
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
        </calcite-action-bar>

        <calcite-panel heading="Layers">
          <arcgis-layer-list reference-element={MAP_ID} tooltip="Layers" />
        </calcite-panel>
      </calcite-shell-panel>

      <arcgis-map
        id={MAP_ID}
        itemId={WEBMAP_ID}
        ref={mapRef}
        className="map"
        center={[-122.31232, 47.66126]}
        zoom={15}
        popupComponentEnabled
        dockingEnabled
      >
        <arcgis-expand slot="top-left" mode="auto">
          <arcgis-legend label="Legend" icon="legend"></arcgis-legend>
        </arcgis-expand>

        <div slot="top-left" className="tools_bottom">
          <arcgis-zoom />
          <arcgis-home />
        </div>

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
