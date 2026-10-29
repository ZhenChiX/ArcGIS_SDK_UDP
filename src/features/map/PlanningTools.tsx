import { useEffect, useRef, useState } from "react";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import Basemap from "@arcgis/core/Basemap";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SketchViewModel from "@arcgis/core/widgets/Sketch/SketchViewModel";
import type MapView from "@arcgis/core/views/MapView";

const BASEMAPS = [
  {
    id: "streets-vector",
    title: "Streets",
    detail: "Street names & neighborhood context",
  },
  {
    id: "satellite",
    title: "Imagery",
    detail: "Aerial view of buildings & open space",
  },
  {
    id: "topo-vector",
    title: "Topographic",
    detail: "Terrain & geographic context",
  },
];
type Tool = "basemaps" | "draw" | "export";

export default function PlanningTools({
  view,
  active,
  onDrawingChange,
}: {
  view: MapView | null;
  active: boolean;
  onDrawingChange: (drawing: boolean) => void;
}) {
  const [tab, setTab] = useState<Tool>("basemaps");
  const [basemap, setBasemap] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [count, setCount] = useState(0);
  const [color, setColor] = useState("#007ac2");
  const [title, setTitle] = useState("U District planning study");
  const [confirmClear, setConfirmClear] = useState(false);
  const sketch = useRef<SketchViewModel | null>(null);
  const layer = useRef<GraphicsLayer | null>(null);
  const generation = useRef(0);

  useEffect(() => {
    if (!view?.map) return;
    const drawings = new GraphicsLayer({
      title: "Planning annotations",
      listMode: "show",
    });
    view.map.add(drawings);
    const model = new SketchViewModel({
      view,
      layer: drawings,
      updateOnGraphicClick: false,
    });
    layer.current = drawings;
    sketch.current = model;
    const changed = drawings.graphics.on("change", () =>
      setCount(drawings.graphics.length),
    );
    setBasemap(view.map.basemap?.id ?? "");
    return () => {
      generation.current++;
      changed.remove();
      model.destroy();
      view.map?.remove(drawings);
      drawings.destroy();
      sketch.current = null;
      layer.current = null;
    };
  }, [view]);

  useEffect(() => {
    const enabled = active && tab === "draw";
    onDrawingChange(enabled);
    if (sketch.current) {
      sketch.current.updateOnGraphicClick = enabled;
      if (!enabled) sketch.current.cancel();
    }
    setConfirmClear(false);
    setMessage("");
    return () => onDrawingChange(false);
  }, [active, tab, onDrawingChange, view]);

  useEffect(() => {
    const model = sketch.current;
    if (!model) return;
    model.pointSymbol = new SimpleMarkerSymbol({
      color,
      size: 10,
      outline: { color: "white", width: 1.5 },
    });
    model.polylineSymbol = new SimpleLineSymbol({ color, width: 3 });
    model.polygonSymbol = new SimpleFillSymbol({
      color: `${color}30`,
      outline: { color, width: 2 },
    });
  }, [color, view]);

  async function changeBasemap(id: string) {
    if (!view?.map || busy) return;
    const request = generation.current;
    setBusy(true);
    setMessage("");
    try {
      const next = Basemap.fromId(id);
      if (!next) throw new Error("Basemap unavailable");
      await next.loadAll();
      if (request !== generation.current) return;
      view.map.basemap = next;
      setBasemap(id);
      setMessage("Basemap updated. Operational layers are preserved.");
    } catch {
      setMessage(
        "This basemap could not load. Check your connection and try again; the current basemap is unchanged.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function exportMap() {
    if (!view || busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (view.updating)
        throw new Error(
          "Wait for the map layers to finish loading, then export again.",
        );
      const screenshot = await view.takeScreenshot({
        format: "png",
        width: Math.min(view.width * 2, 3200),
      });
      const image = new Image();
      image.src = screenshot.dataUrl;
      await image.decode();
      const canvas = document.createElement("canvas");
      canvas.width = image.width;
      const credits =
        view.map?.allLayers
          .map((l) =>
            "copyright" in l && typeof l.copyright === "string"
              ? l.copyright
              : "",
          )
          .filter(Boolean)
          .join(" · ") || "Map data: Esri and contributors";
      const context = canvas.getContext("2d");
      if (!context)
        throw new Error("Image export is unavailable in this browser.");
      // Wrap credits instead of cropping attribution on small displays.
      context.font = "14px sans-serif";
      const lines: string[] = [];
      let line = "";
      for (const word of credits.replace(/<[^>]*>/g, "").split(/\s+/)) {
        if (
          context.measureText(`${line} ${word}`).width > canvas.width - 48 &&
          line
        ) {
          lines.push(line);
          line = word;
        } else line += `${line ? " " : ""}${word}`;
      }
      if (line) lines.push(line);
      canvas.height = image.height + 110 + lines.length * 20;
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0);
      context.fillStyle = "#153541";
      context.font = "bold 24px sans-serif";
      context.fillText(
        title.trim() || "U District planning study",
        24,
        image.height + 36,
        canvas.width - 48,
      );
      context.font = "14px sans-serif";
      context.fillText(
        `U District Partnership · ${new Date().toLocaleDateString()} · Scale 1:${Math.round(view.scale).toLocaleString()}`,
        24,
        image.height + 64,
      );
      context.fillText(
        "Planning reference only · Includes visible layers and annotations",
        24,
        image.height + 86,
      );
      lines.forEach((text, index) =>
        context.fillText(text, 24, image.height + 110 + index * 20),
      );
      const blob = await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) =>
            b ? resolve(b) : reject(new Error("Could not create image.")),
          "image/png",
        ),
      );
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "udp-planning-map.png";
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setMessage("PNG downloaded with title, date, scale and map credits.");
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Export failed. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <section
      className="planning-tools"
      hidden={!active}
      aria-label="Planning tools"
    >
      <div className="planning-intro">
        <span className="planning-eyebrow">PLAN · ANNOTATE · SHARE</span>
        <h2>Planning workspace</h2>
        <p>Explore the district. Mark an idea. Share a map.</p>
      </div>
      <div className="planning-tabs" role="tablist" aria-label="Planning tools">
        {(["basemaps", "draw", "export"] as Tool[]).map((tool) => (
          <button
            key={tool}
            role="tab"
            id={`tab-${tool}`}
            aria-controls={`panel-${tool}`}
            aria-selected={tab === tool}
            onKeyDown={(event) => {
              const tabs: Tool[] = ["basemaps", "draw", "export"];
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const index =
                event.key === "Home"
                  ? 0
                  : event.key === "End"
                    ? 2
                    : (tabs.indexOf(tool) +
                        (event.key === "ArrowRight" ? 1 : 2)) %
                      3;
              setTab(tabs[index]);
              document.getElementById(`tab-${tabs[index]}`)?.focus();
            }}
            tabIndex={tab === tool ? 0 : -1}
            onClick={() => setTab(tool)}
          >
            {tool === "basemaps"
              ? "Basemaps"
              : tool === "draw"
                ? "Annotate"
                : "Export"}
          </button>
        ))}
      </div>
      {!view && (
        <p className="planning-notice" role="status">
          Waiting for the map. These tools become available when the hosted map
          finishes loading.
        </p>
      )}
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === "basemaps" && (
          <div className="planning-section">
            <h3>A different perspective</h3>
            <p>
              Change the background while keeping the district’s operational
              layers.
            </p>
            <div className="basemap-options">
              {BASEMAPS.map((item) => (
                <button
                  disabled={!view || busy}
                  aria-pressed={basemap === item.id}
                  key={item.id}
                  onClick={() => void changeBasemap(item.id)}
                >
                  <span
                    className={`basemap-swatch ${item.id}`}
                    aria-hidden="true"
                  />
                  <span>
                    <strong>{item.title}</strong>
                    <small>{item.detail}</small>
                  </span>
                  <span aria-hidden="true">
                    {basemap === item.id ? "✓" : "→"}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {tab === "draw" && (
          <div className="planning-section">
            <h3>Mark a planning idea</h3>
            <p>
              Draw on the map. Double-click to finish a line or polygon. Select
              a drawing to move or reshape it; press Escape to cancel.
            </p>
            <label className="planning-label">
              Drawing color
              <input
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
              />
            </label>
            <div className="drawing-actions">
              {(
                ["point", "polyline", "polygon", "rectangle", "circle"] as const
              ).map((tool) => (
                <button
                  disabled={!view}
                  key={tool}
                  onClick={() => {
                    sketch.current?.cancel();
                    void sketch.current
                      ?.create(tool)
                      .catch(() =>
                        setMessage(
                          "Could not start drawing. Try again once the map is ready.",
                        ),
                      );
                  }}
                >
                  {tool === "polyline"
                    ? "Line"
                    : tool[0].toUpperCase() + tool.slice(1)}
                </button>
              ))}
            </div>
            <div className="drawing-actions">
              <button disabled={!view} onClick={() => sketch.current?.undo()}>
                Undo
              </button>
              <button disabled={!view} onClick={() => sketch.current?.redo()}>
                Redo
              </button>
              <button disabled={!view} onClick={() => sketch.current?.cancel()}>
                Finish editing
              </button>
            </div>
            <div className="planning-drawing-count">
              {count} annotation{count === 1 ? "" : "s"}
              <button disabled={!count} onClick={() => setConfirmClear(true)}>
                Clear all
              </button>
            </div>
            {confirmClear && (
              <div className="planning-notice">
                <p>Remove all planning annotations? This cannot be undone.</p>
                <button
                  onClick={() => {
                    sketch.current?.cancel();
                    layer.current?.removeAll();
                    setConfirmClear(false);
                  }}
                >
                  Remove annotations
                </button>
                <button onClick={() => setConfirmClear(false)}>
                  Keep them
                </button>
              </div>
            )}
            <p className="planning-footnote">
              Session only · Export before leaving. Drawings stay on this map
              while you switch tools and are not saved to ArcGIS Online.
            </p>
          </div>
        )}
        {tab === "export" && (
          <div className="planning-section">
            <h3>A map for your next conversation</h3>
            <p>
              Download the current map extent, visible layers and annotations as
              a PNG for reports or presentations.
            </p>
            <label className="planning-label">
              Report title
              <input
                maxLength={100}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
            <button
              className="planning-primary"
              disabled={!view || busy}
              onClick={() => void exportMap()}
            >
              {busy ? "Preparing…" : "Download map PNG"}
            </button>
            <p className="planning-footnote">
              Includes date, scale and basemap credits. Panels and popups are
              excluded. Keep source attribution when sharing.
            </p>
          </div>
        )}
      </div>
      <p className="planning-status" role="status" aria-live="polite">
        {busy ? "Working…" : message}
      </p>
    </section>
  );
}
