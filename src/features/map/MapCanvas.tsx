import { useEffect, useRef, useState } from "react";

// @ts-expect-error Side-effect CSS import is handled by the bundler.
import "@arcgis/map-components/main.css";

import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";
import "@arcgis/map-components/components/arcgis-expand";

import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action";

// @ts-expect-error Side-effect CSS import is handled by the bundler.
import "../../MapCanvas.css";


const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";

export default function MapCanvas() {
  const mapRef = useRef<any>(null);

  // Keep the shell panel collapsed on first page load.
  const [panelCollapsed, setPanelCollapsed] = useState(true);

  // Toggle the layers shell panel from the single action button.
  function handleLayersAction() {
    setPanelCollapsed((currentCollapsed) => !currentCollapsed);
  }

  // Configure popup docking after the map view is ready.
  useEffect(() => {
    let cancelled = false;

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
    }

    void configurePopupDocking();

    return () => {
      cancelled = true;
    };
  }, []);
  return (
    <calcite-shell className="udp-shell">
      {/* Sticky app header. */}
      <calcite-shell-header slot="header">
        <h3>U DISTRICT PARTNERSHIP</h3>
      </calcite-shell-header>

      {/* Side panel container controlled by the collapsed state above. */}
      <calcite-shell-panel slot="panel-end" width-scale="s" collapsed={panelCollapsed}>

        {/* Action bar contains the single Layers control for the shell panel. */}
        <calcite-action-bar slot="action-bar">
          <calcite-action icon="layers" label="Layers" text="Layers" onClick={handleLayersAction} />
        </calcite-action-bar>

        {/* Content area that holds the layer list only. */}
        <calcite-panel heading="Layers">
          <arcgis-layer-list reference-element={MAP_ID} tooltip="Layers" />
        </calcite-panel>
      </calcite-shell-panel>

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