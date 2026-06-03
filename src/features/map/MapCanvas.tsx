import { useEffect, useRef, useState } from "react";

import "@arcgis/map-components/main.css";

// Import ArcGIS MAP components
import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-expand";
import "@arcgis/map-components/components/arcgis-feature-table";


// Import calcite components
import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";
import "@esri/calcite-components/components/calcite-label";
import "@esri/calcite-components/components/calcite-select";
import "@esri/calcite-components/components/calcite-option";
import "@esri/calcite-components/components/calcite-tooltip";

import "../../MapCanvas.css";


const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";

// Add table


export default function MapCanvas() {

  const mapRef = useRef<any>(null);
  const featureTableRef = useRef<any>(null);




  // Keep the shell panel collapsed on first page load.
  const [panelCollapsed, setPanelCollapsed] = useState(true);
  const [tables, setTables] = useState<any[]>([]);
  const [selectedTableKey, setSelectedTableKey] = useState("");

  // Toggle the layers shell panel from the single action button.
  function handleLayersAction() {
    setPanelCollapsed((currentCollapsed) => !currentCollapsed);
  }

  // Configure popup docking after the map view is ready.
  useEffect(() => {
    let cancelled = false;
    // handle popup
    async function configurePopupDocking() {
      const mapElement = mapRef.current;

      if (!mapElement?.viewOnReady) {
        return;
      }

      await mapElement.viewOnReady();

      if (cancelled) {
        return;
      }

      const popup = mapElement.popupElement;

      if (!popup) {
        return;
      }

      popup.dockEnabled = true;
      popup.hideCloseButton = false;
      popup.hideActionBar = true;

      popup.dockOptions = {
        buttonEnabled: false,
        breakpoint: false,
        position: "bottom-right",
      };
      console.log("Popup docking configured");
    }

    void configurePopupDocking();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWebMapTable() {
      const mapElement = mapRef.current;
      if (!mapElement?.viewOnReady) return;

      await mapElement.viewOnReady();
      if (cancelled) return;

      const webmap = mapElement.map;
      if (!webmap) return;

      await webmap.loadAll();

      const loadedTables = webmap.tables?.toArray?.() ?? [];
      setTables(loadedTables);

      const initialTable = loadedTables[0];
      if (!initialTable) return;

      const initialKey = getTableKey(initialTable, 0);
      setSelectedTableKey((currentKey) => currentKey || initialKey);
    }

    void loadWebMapTable();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const selectedTable = tables.find((table, index) => getTableKey(table, index) === selectedTableKey);

    if (!selectedTable || !featureTableRef.current) {
      return;
    }

    featureTableRef.current.layer = selectedTable;
  }, [selectedTableKey, tables]);

  return (
    <calcite-shell className="udp-shell">
      {/* Sticky app header. */}
      <calcite-shell-header slot="header">
        <h3>U DISTRICT PARTNERSHIP</h3>
      </calcite-shell-header>

      {/* Side panel container controlled by the collapsed state above. */}
      <calcite-shell-panel slot="panel-end" width-scale="auto" collapsed={panelCollapsed}>

        {/* Action bar contains the single Layers control for the shell panel. */}
        <calcite-action-bar slot="action-bar">
          <calcite-action id="layer-button" icon="layers" label="Layers" text="Layers" onClick={handleLayersAction} />
          <calcite-tooltip reference-element="layer-button" placement="auto">
            <span>Layers</span>
          </calcite-tooltip>

          <calcite-action id="table-button" icon="table" label="Table" text="Table" />
          <calcite-tooltip reference-element="table-button" placement="auto">
            <span>Show Tables</span>
          </calcite-tooltip>
        </calcite-action-bar>

        {/* Extent Content area that holds the layer list only. */}
        <calcite-panel heading="Layers">
          <arcgis-layer-list reference-element={MAP_ID} tooltip="Layers" />
        </calcite-panel>
      </calcite-shell-panel>

      {/* Bottom-half feature table panel. */}
      <calcite-panel slot="panel-bottom" className="table-panel">

        <arcgis-feature-table
          reference-element="arcgis-map"
          show-layer-dropdown
          related-records-enabled
          show-selection-column></arcgis-feature-table>

      </calcite-panel>


      {/* Main map view. */}
      <arcgis-map id={MAP_ID} itemId={WEBMAP_ID}
        ref={mapRef}
        className="map" center={[-122.31232, 47.66126]}
        zoom={15}
        popupComponentEnabled
        dockingEnabled

        dockingOptions={{ buttonEnabled: false, breakpoint: false }}>
        <arcgis-expand slot="top-left" mode="auto">
          <arcgis-legend label="Legend" icon="legend"></arcgis-legend>
        </arcgis-expand>
        <div slot="top-left" className="tools_bottom">
          <arcgis-zoom />
          <arcgis-home />
        </div>




      </arcgis-map>
    </calcite-shell>
  );
}