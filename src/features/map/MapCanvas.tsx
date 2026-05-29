import { useState } from "react";

import "@arcgis/map-components/main.css";

import "@arcgis/map-components/components/arcgis-map";
import "@arcgis/map-components/components/arcgis-zoom";
import "@arcgis/map-components/components/arcgis-home";
import "@arcgis/map-components/components/arcgis-layer-list";
import "@arcgis/map-components/components/arcgis-legend";

import "@esri/calcite-components/components/calcite-shell";
import "@esri/calcite-components/components/calcite-shell-panel";
import "@esri/calcite-components/components/calcite-panel";
import "@esri/calcite-components/components/calcite-action-bar";
import "@esri/calcite-components/components/calcite-action-group";
import "@esri/calcite-components/components/calcite-action";
import "../../MapCanvas.css";

const WEBMAP_ID = "ac2e660700144e0883b725c75d8b8b5f";
const MAP_ID = "udp-map";

type Panel = "layers" | "legend";

const PANEL_ACTIONS: Array<{ panel: Panel; text: string; icon: string }> = [
  { panel: "layers", text: "Layers", icon: "layers" },
  { panel: "legend", text: "Legend", icon: "legend" },
];

export default function MapCanvas() {
  const [panel, setPanel] = useState<Panel>("layers");
  const [panelCollapsed, setPanelCollapsed] = useState(false);

  function togglePanel() {
    setPanelCollapsed((value) => !value);
  }

  function openPanel(nextPanel: Panel) {
    setPanel(nextPanel);
    setPanelCollapsed(false);
  }

  return (
  <calcite-shell className="udp-shell">
      {/* Sticky header */}
      <calcite-shell-header slot="header">
        <h3>U DISTRICT PARTNERSHIP</h3>
      </calcite-shell-header>
      <calcite-shell-panel slot="panel-end" width-scale="m" collapsed={panelCollapsed}>
        <calcite-action-bar slot="action-bar">
          <calcite-action-group>
            <calcite-action
              text={panelCollapsed ? "Expand" : "Collapse"}
              icon={panelCollapsed ? "chevron-left" : "chevron-right"}
              textEnabled
              onClick={togglePanel}
            />
          </calcite-action-group>

          <calcite-action-group>
            {PANEL_ACTIONS.map(({ panel: nextPanel, text, icon }) => (
              <calcite-action
                key={nextPanel}
                text={text}
                icon={icon}
                textEnabled
                active={panel === nextPanel && !panelCollapsed}
                onClick={() => openPanel(nextPanel)}
              />
            ))}
          </calcite-action-group>
        </calcite-action-bar>

        <calcite-panel heading={panel === "layers" ? "Layers" : "Legend"}>
          {panel === "layers" && <arcgis-layer-list reference-element={MAP_ID} />}
          {panel === "legend" && <arcgis-legend reference-element={MAP_ID} />}
        </calcite-panel>
      </calcite-shell-panel>

      {/* UDP address: center={[-122.31232, 47.66126]} zoom={15} */}
      <arcgis-map id={MAP_ID} itemId={WEBMAP_ID} className="map" center={[-122.31232, 47.66126]} zoom={15}>
        <arcgis-zoom slot="top-left" />
        <arcgis-home slot="top-left" />
      </arcgis-map>
    </calcite-shell>
  );
}