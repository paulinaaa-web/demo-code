"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

// ─── Item types ───────────────────────────────────────────────────────────────

const ITEM_TYPES = [
  { id: "keys",       emoji: "🔑", label: "Keys" },
  { id: "suitcase",   emoji: "🧳", label: "Suitcase" },
  { id: "sunglasses", emoji: "🕶️", label: "Sunglasses" },
  { id: "bag",        emoji: "👜", label: "Bag" },
  { id: "wallet",     emoji: "👛", label: "Wallet" },
  { id: "phone",      emoji: "📱", label: "Phone" },
  { id: "other",      emoji: "📦", label: "Other" },
] as const;

type ItemTypeId = (typeof ITEM_TYPES)[number]["id"];

interface Pin {
  id: string;
  lng: number;
  lat: number;
  type: ItemTypeId;
  label: string;
  timestamp: number;
}

function loadPins(): Pin[] {
  try { return JSON.parse(localStorage.getItem("lf-pins") ?? "[]"); }
  catch { return []; }
}
function savePins(pins: Pin[]) {
  localStorage.setItem("lf-pins", JSON.stringify(pins));
}

// ─── Map style ────────────────────────────────────────────────────────────────

const ROAD_LAYER_IDS = [
  "road-service", "road-minor", "road-tertiary",
  "road-secondary", "road-primary", "road-trunk", "road-motorway",
];

const PINK_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: { ofm: { type: "vector", url: "https://tiles.openfreemap.org/planet" } },
  glyphs: "https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf",
  layers: [
    { id: "background",          type: "background", paint: { "background-color": "#fce4ec" } },
    { id: "landcover-wood",      type: "fill", source: "ofm", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["wood", "forest"], true, false],
      paint: { "fill-color": "#f48fb1", "fill-opacity": 0.55 } },
    { id: "landcover-grass",     type: "fill", source: "ofm", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["grass", "scrub", "meadow", "wetland"], true, false],
      paint: { "fill-color": "#f8bbd0", "fill-opacity": 0.55 } },
    { id: "landcover-sand",      type: "fill", source: "ofm", "source-layer": "landcover",
      filter: ["match", ["get", "class"], ["sand", "farmland"], true, false],
      paint: { "fill-color": "#fde8f0", "fill-opacity": 0.5 } },
    { id: "landuse-residential", type: "fill", source: "ofm", "source-layer": "landuse",
      filter: ["==", ["get", "class"], "residential"],
      paint: { "fill-color": "#fde0ed" } },
    { id: "landuse-commercial",  type: "fill", source: "ofm", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["commercial", "retail"], true, false],
      paint: { "fill-color": "#f9a8c8" } },
    { id: "landuse-industrial",  type: "fill", source: "ofm", "source-layer": "landuse",
      filter: ["==", ["get", "class"], "industrial"],
      paint: { "fill-color": "#f0a0c0" } },
    { id: "landuse-park",        type: "fill", source: "ofm", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["park", "recreation_ground", "grass", "pitch", "cemetery"], true, false],
      paint: { "fill-color": "#f8bbd0" } },
    { id: "landuse-civic",       type: "fill", source: "ofm", "source-layer": "landuse",
      filter: ["match", ["get", "class"], ["school", "university", "hospital", "college"], true, false],
      paint: { "fill-color": "#f48fb1", "fill-opacity": 0.6 } },
    { id: "park-fill",           type: "fill", source: "ofm", "source-layer": "park",
      paint: { "fill-color": "#f8bbd0", "fill-opacity": 0.6 } },
    { id: "water-fill",          type: "fill", source: "ofm", "source-layer": "water",
      paint: { "fill-color": "#ad5c8a" } },
    { id: "waterway",            type: "line", source: "ofm", "source-layer": "waterway",
      paint: { "line-color": "#ad5c8a", "line-width": ["interpolate", ["linear"], ["zoom"], 8, 1, 14, 3] } },
    { id: "building-fill",       type: "fill", source: "ofm", "source-layer": "building",
      paint: { "fill-color": "#e91e8c",
               "fill-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.45] } },
    { id: "building-outline",    type: "line", source: "ofm", "source-layer": "building",
      paint: { "line-color": "#c2185b", "line-width": 0.5,
               "line-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0, 14, 0.8] } },
    { id: "road-service",   type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["service", "track"], true, false],
      paint: { "line-color": "#ffffff", "line-width": 1 } },
    { id: "road-minor",     type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["match", ["get", "class"], ["minor", "residential"], true, false],
      paint: { "line-color": "#ffffff", "line-width": 2 } },
    { id: "road-tertiary",  type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "tertiary"],
      paint: { "line-color": "#ffffff", "line-width": 2.5 } },
    { id: "road-secondary", type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "secondary"],
      paint: { "line-color": "#ffffff", "line-width": 3.5 } },
    { id: "road-primary",   type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "primary"],
      paint: { "line-color": "#ffffff", "line-width": 5 } },
    { id: "road-trunk",     type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "trunk"],
      paint: { "line-color": "#ffffff", "line-width": 6 } },
    { id: "road-motorway",  type: "line", source: "ofm", "source-layer": "transportation",
      filter: ["==", ["get", "class"], "motorway"],
      paint: { "line-color": "#ffffff", "line-width": 7 } },
    { id: "road-label",  type: "symbol", source: "ofm", "source-layer": "transportation_name",
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"],
                 "text-size": 11, "symbol-placement": "line" },
      paint: { "text-color": "#880e4f", "text-halo-color": "#fce4ec", "text-halo-width": 1.5 } },
    { id: "place-label", type: "symbol", source: "ofm", "source-layer": "place",
      filter: ["match", ["get", "class"], ["city", "town", "village", "suburb", "neighbourhood"], true, false],
      layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"],
                 "text-size": ["interpolate", ["linear"], ["zoom"], 10, 11, 14, 14] },
      paint: { "text-color": "#880e4f", "text-halo-color": "#fce4ec", "text-halo-width": 1.5 } },
  ],
};

// ─── Glitter helpers ──────────────────────────────────────────────────────────

interface Sparkle { x: number; y: number; life: number; maxLife: number; size: number }

function getRoadPoints(map: maplibregl.Map) {
  const features = map.queryRenderedFeatures(undefined, { layers: ROAD_LAYER_IDS });
  const pts: { x: number; y: number }[] = [];
  for (const f of features) {
    const g = f.geometry;
    const lines = g.type === "LineString" ? [g.coordinates]
      : g.type === "MultiLineString" ? g.coordinates : [];
    for (const line of lines) {
      for (let i = 0; i < line.length - 1; i++) {
        const a = map.project(line[i] as [number, number]);
        const b = map.project(line[i + 1] as [number, number]);
        const steps = Math.max(1, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 12));
        for (let j = 0; j <= steps; j++) {
          const t = j / steps;
          pts.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
        }
      }
    }
  }
  return pts;
}

// ─── Custom marker element ────────────────────────────────────────────────────

function makeMarkerEl(emoji: string): HTMLElement {
  const wrap = document.createElement("div");
  Object.assign(wrap.style, {
    width: "38px", height: "38px",
    background: "#1a0d1a",
    border: "2.5px solid #f472b6",
    borderRadius: "50% 50% 50% 0",
    transform: "rotate(-45deg)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
    boxShadow: "0 3px 10px rgba(244,114,182,0.5)",
    transition: "transform 0.15s",
  });
  wrap.onmouseenter = () => { wrap.style.transform = "rotate(-45deg) scale(1.15)"; };
  wrap.onmouseleave = () => { wrap.style.transform = "rotate(-45deg) scale(1)"; };
  const inner = document.createElement("div");
  Object.assign(inner.style, { transform: "rotate(45deg)", fontSize: "17px", lineHeight: "1" });
  inner.textContent = emoji;
  wrap.appendChild(inner);
  return wrap;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Map() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const mapRef        = useRef<maplibregl.Map | null>(null);
  const markersRef    = useRef<Record<string, maplibregl.Marker>>({});
  const selectedPinCbRef = useRef<((pin: Pin) => void) | null>(null);

  const [pins,        setPins]        = useState<Pin[]>([]);
  const [addMode,     setAddMode]     = useState(false);
  const [pending,     setPending]     = useState<{ lng: number; lat: number } | null>(null);
  const [itemType,    setItemType]    = useState<ItemTypeId>("keys");
  const [note,        setNote]        = useState("");
  const [showList,    setShowList]    = useState(false);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);

  // Keep ref in sync so marker click handlers can call it without stale closure
  selectedPinCbRef.current = setSelectedPin;

  // Load from localStorage once
  useEffect(() => { setPins(loadPins()); }, []);

  // Persist whenever pins change
  useEffect(() => { savePins(pins); }, [pins]);

  // Delete helper
  const deletePin = useCallback((id: string) => {
    markersRef.current[id]?.remove();
    delete markersRef.current[id];
    setPins(prev => prev.filter(p => p.id !== id));
    setSelectedPin(p => p?.id === id ? null : p);
  }, []);

  // Sync markers when pins change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Remove markers no longer in pins
    for (const [id, marker] of Object.entries(markersRef.current)) {
      if (!pins.find(p => p.id === id)) {
        marker.remove();
        delete markersRef.current[id];
      }
    }
    // Add new markers
    for (const pin of pins) {
      if (pin.id in markersRef.current) continue;
      const type = ITEM_TYPES.find(t => t.id === pin.type)!;
      const el = makeMarkerEl(type.emoji);
      el.addEventListener("click", (e) => {
        e.stopPropagation();
        selectedPinCbRef.current?.(pin);
        setShowList(false);
      });
      const marker = new maplibregl.Marker({ element: el, anchor: "bottom-left" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(map);
      markersRef.current[pin.id] = marker;
    }
  }, [pins]);

  // Confirm adding a pin
  const confirmAdd = () => {
    if (!pending) return;
    const pin: Pin = {
      id: crypto.randomUUID(),
      lng: pending.lng,
      lat: pending.lat,
      type: itemType,
      label: note.trim(),
      timestamp: Date.now(),
    };
    setPins(prev => [...prev, pin]);
    setPending(null);
    setNote("");
    setAddMode(false);
  };

  // Map init
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const map = new maplibregl.Map({ container: el, style: PINK_STYLE, center: [11.582, 48.1351], zoom: 13 });
    mapRef.current = map;

    // Glitter canvas
    const canvas = document.createElement("canvas");
    Object.assign(canvas.style, { position: "absolute", inset: "0", width: "100%", height: "100%", pointerEvents: "none", zIndex: "2" });
    el.appendChild(canvas);
    const resize = () => { canvas.width = el.clientWidth; canvas.height = el.clientHeight; };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(el);

    const sparkles: Sparkle[] = [];
    let roadPoints: { x: number; y: number }[] = [];
    let raf: number;
    map.on("render", () => { if (map.isStyleLoaded()) roadPoints = getRoadPoints(map); });

    const animate = () => {
      const ctx = canvas.getContext("2d")!;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (roadPoints.length > 0) {
        for (let i = 0; i < 10; i++) {
          const pt = roadPoints[Math.floor(Math.random() * roadPoints.length)];
          sparkles.push({ x: pt.x + (Math.random() - 0.5) * 5, y: pt.y + (Math.random() - 0.5) * 5, life: 0, maxLife: 25 + Math.random() * 35, size: Math.random() * 2.5 + 0.8 });
        }
      }
      for (let i = sparkles.length - 1; i >= 0; i--) {
        const s = sparkles[i];
        s.life++;
        const alpha = Math.sin((s.life / s.maxLife) * Math.PI);
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = "#ffffff";
        ctx.shadowColor = "#ffffff";
        ctx.shadowBlur = s.size * 5;
        ctx.beginPath();
        for (let j = 0; j < 8; j++) {
          const a = (j * Math.PI) / 4;
          const r = j % 2 === 0 ? s.size : s.size * 0.28;
          j === 0 ? ctx.moveTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r)
                  : ctx.lineTo(s.x + Math.cos(a) * r, s.y + Math.sin(a) * r);
        }
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        if (s.life >= s.maxLife) sparkles.splice(i, 1);
      }
      if (sparkles.length > 800) sparkles.splice(0, sparkles.length - 800);
      raf = requestAnimationFrame(animate);
    };
    map.once("load", () => animate());

    // Re-add markers after map loads (pins may already be set from localStorage)
    map.once("load", () => {
      setPins(prev => {
        // Trigger marker sync by returning new reference if markers missing
        return [...prev];
      });
    });

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.remove();
      for (const m of Object.values(markersRef.current)) m.remove();
      markersRef.current = {};
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Map click handler — must stay in sync with addMode state
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const onClick = (e: maplibregl.MapMouseEvent) => {
      if (!addMode) return;
      setPending({ lng: e.lngLat.lng, lat: e.lngLat.lat });
      setItemType("keys");
      setNote("");
    };
    map.on("click", onClick);
    map.getCanvas().style.cursor = addMode ? "crosshair" : "";
    return () => { map.off("click", onClick); };
  }, [addMode]);

  const typeInfo = ITEM_TYPES.find(t => t.id === (selectedPin?.type ?? "other"))!;

  return (
    <div ref={containerRef} className="relative h-full w-full rounded-xl overflow-hidden">

      {/* ── Controls ──────────────────────────────────────────────────── */}
      <button
        onClick={() => { setAddMode(v => !v); setPending(null); setSelectedPin(null); }}
        className={`absolute top-3 right-3 z-10 px-4 py-2 rounded-full text-sm font-semibold shadow-lg transition-colors ${
          addMode ? "bg-pink-500 text-white" : "bg-[#1a1c24]/90 text-white border border-white/20 hover:bg-[#2a2c34]"
        }`}
      >
        {addMode ? "✕ Cancel" : "+ Pin Item"}
      </button>

      <button
        onClick={() => { setShowList(v => !v); setSelectedPin(null); }}
        className="absolute top-3 left-3 z-10 px-4 py-2 rounded-full text-sm font-semibold bg-[#1a1c24]/90 text-white border border-white/20 shadow-lg hover:bg-[#2a2c34] transition-colors"
      >
        {pins.length > 0 ? `📋 ${pins.length} item${pins.length !== 1 ? "s" : ""}` : "📋 Items"}
      </button>

      {addMode && !pending && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-10 px-4 py-2 rounded-full text-sm bg-black/60 text-white/80 backdrop-blur pointer-events-none">
          Click anywhere on the map to drop a pin
        </div>
      )}

      {/* ── Add item form ─────────────────────────────────────────────── */}
      {pending && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-[#1a0d1a]/95 backdrop-blur border-t border-pink-900/40 rounded-t-2xl p-5">
          <p className="text-white/50 text-xs mb-1">Pinning location</p>
          <h3 className="text-white font-semibold text-base mb-4">What did you leave here?</h3>

          <div className="grid grid-cols-7 gap-2 mb-4">
            {ITEM_TYPES.map(t => (
              <button
                key={t.id}
                onClick={() => setItemType(t.id)}
                className={`flex flex-col items-center gap-1 py-2 rounded-xl transition-colors ${
                  itemType === t.id ? "bg-pink-500/30 ring-1 ring-pink-400" : "bg-white/5 hover:bg-white/10"
                }`}
              >
                <span className="text-xl">{t.emoji}</span>
                <span className="text-[10px] text-white/60">{t.label}</span>
              </button>
            ))}
          </div>

          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Add a note (optional)"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-white text-sm placeholder-white/30 mb-4 outline-none focus:border-pink-400/60"
          />

          <div className="flex gap-3">
            <button
              onClick={() => { setPending(null); }}
              className="flex-1 py-2.5 rounded-xl bg-white/10 text-white/70 text-sm hover:bg-white/15 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={confirmAdd}
              className="flex-1 py-2.5 rounded-xl bg-pink-500 text-white text-sm font-semibold hover:bg-pink-400 transition-colors"
            >
              Save Pin
            </button>
          </div>
        </div>
      )}

      {/* ── Item list sidebar ─────────────────────────────────────────── */}
      {showList && (
        <div className="absolute top-0 right-0 bottom-0 w-64 bg-[#1a0d1a]/95 backdrop-blur border-l border-pink-900/30 z-20 flex flex-col">
          <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
            <h3 className="text-white font-semibold text-sm">Pinned Items</h3>
            <button onClick={() => setShowList(false)} className="text-white/40 hover:text-white text-lg leading-none">✕</button>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {pins.length === 0 && (
              <p className="text-white/30 text-sm text-center pt-8">No items pinned yet.<br />Hit "+ Pin Item" to start.</p>
            )}
            {pins.map(pin => {
              const t = ITEM_TYPES.find(x => x.id === pin.type)!;
              return (
                <div
                  key={pin.id}
                  onClick={() => {
                    mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 15, duration: 800 });
                    setSelectedPin(pin);
                    setShowList(false);
                  }}
                  className="flex items-center gap-3 p-3 rounded-xl bg-white/5 hover:bg-white/10 cursor-pointer group transition-colors"
                >
                  <span className="text-2xl">{t.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-white text-sm font-medium">{t.label}</div>
                    {pin.label && <div className="text-white/40 text-xs truncate">{pin.label}</div>}
                    <div className="text-white/25 text-xs">{new Date(pin.timestamp).toLocaleDateString()}</div>
                  </div>
                  <button
                    onClick={e => { e.stopPropagation(); deletePin(pin.id); }}
                    className="text-white/20 hover:text-pink-400 opacity-0 group-hover:opacity-100 transition-opacity text-sm"
                  >✕</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Selected pin detail ───────────────────────────────────────── */}
      {selectedPin && !pending && !showList && (
        <div className="absolute bottom-4 left-4 right-4 z-20 bg-[#1a0d1a]/95 backdrop-blur border border-pink-900/40 rounded-2xl p-4 flex items-center gap-4 shadow-xl">
          <span className="text-3xl">{typeInfo.emoji}</span>
          <div className="flex-1 min-w-0">
            <div className="text-white font-semibold text-sm">{typeInfo.label}</div>
            {selectedPin.label && <div className="text-white/50 text-xs mt-0.5">{selectedPin.label}</div>}
            <div className="text-white/30 text-xs mt-1">{new Date(selectedPin.timestamp).toLocaleString()}</div>
          </div>
          <button
            onClick={() => deletePin(selectedPin.id)}
            className="px-3 py-1.5 rounded-lg bg-pink-500/20 text-pink-300 text-xs hover:bg-pink-500/40 transition-colors"
          >Remove</button>
          <button
            onClick={() => setSelectedPin(null)}
            className="text-white/30 hover:text-white ml-1"
          >✕</button>
        </div>
      )}
    </div>
  );
}
