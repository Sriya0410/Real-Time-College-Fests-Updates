import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Tooltip,
  ZoomControl,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import { useMemo, useState, useEffect } from "react";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

import "../../styles/campusMap.css";

const icon = (color) =>
  new L.Icon({
    iconUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    iconRetinaUrl: `https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-${color}.png`,
    shadowUrl: markerShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

const ICONS = {
  A: icon("blue"),
  H: icon("red"),
  N: icon("green"),
  U: icon("violet"),
  C: icon("orange"),
  V: icon("grey"),
  PG: icon("gold"),
  PH: icon("yellow"),
  ME: icon("black"),
};

const PLACES = [
  { key: "A", short: "A", name: "A Block", pos: [16.232956, 80.5475303], icon: "A" },
  { key: "H", short: "H", name: "H Block", pos: [16.232237, 80.5486618], icon: "H" },
  { key: "N", short: "N", name: "N Block", pos: [16.2326178, 80.5503603], icon: "N" },
  { key: "U", short: "U", name: "U Block", pos: [16.2335496, 80.5507278], icon: "U" },
  { key: "C", short: "CH", name: "Convocation Hall", pos: [16.2337901, 80.5515656], icon: "C" },
  { key: "V", short: "VB", name: "Volleyball Court", pos: [16.2341661, 80.5520287], icon: "V" },
  { key: "PG", short: "PG", name: "Playground", pos: [16.2323673, 80.5520361], icon: "PG" },
  { key: "PH", short: "PH", name: "Pharmacy College", pos: [16.2306427, 80.5505535], icon: "PH" },
];

function getBounds(points, pad = 0.0015) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
}

function FitToCampus({ bounds }) {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(bounds, { padding: [40, 40] });
  }, [map, bounds]);
  return null;
}

/* ✅ IMPORTANT FIX: when sidebar opens/closes map container width changes.
   Leaflet needs invalidateSize() to render properly. */
function InvalidateSizeOnResize() {
  const map = useMap();

  useEffect(() => {
    const run = () => map.invalidateSize();

    // call once after mount
    const t = setTimeout(run, 250);

    // on window resize
    window.addEventListener("resize", run);

    // also observe DOM size changes (sidebar open/close triggers this)
    const ro = new ResizeObserver(() => {
      // small debounce
      setTimeout(run, 100);
    });
    ro.observe(map.getContainer());

    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", run);
      ro.disconnect();
    };
  }, [map]);

  return null;
}

function useZoom() {
  const [zoom, setZoom] = useState(18);
  useMapEvents({
    zoomend: (e) => setZoom(e.target.getZoom()),
  });
  return zoom;
}

function LegendCard() {
  const items = [
    { k: "A", label: "A Block" },
    { k: "H", label: "H Block" },
    { k: "N", label: "N Block" },
    { k: "U", label: "U Block" },
    { k: "CH", label: "Convocation" },
    { k: "VB", label: "Volleyball" },
    { k: "PG", label: "Playground" },
    { k: "PH", label: "Pharmacy" },
  ];

  return (
    <div className="campusLegend">
      <div className="campusLegendTitle">Legend</div>
      <div className="campusLegendList">
        {items.map((it) => (
          <div key={it.k} className="campusLegendItem">
            <span className="campusLegendTag">{it.k}</span>
            <span className="campusLegendText">{it.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ZoomedMarkers() {
  const zoom = useZoom();
  const showLabels = zoom >= 18;
  if (!showLabels) return null;

  return (
    <>
      {PLACES.map((p) => (
        <Marker key={`label-${p.key}`} position={p.pos} opacity={0}>
          <Tooltip direction="top" offset={[0, -26]} opacity={1} permanent>
            <span className="campusLabelPill">{p.short}</span>
          </Tooltip>
        </Marker>
      ))}
    </>
  );
}

export default function CampusMapLeaflet() {
  const [myPos, setMyPos] = useState(null);

  const campusBounds = useMemo(() => getBounds(PLACES.map((p) => p.pos), 0.0016), []);
  const CAMPUS_CENTER = [16.2329, 80.5504];

  const locateMe = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");
    navigator.geolocation.getCurrentPosition(
      (pos) => setMyPos([pos.coords.latitude, pos.coords.longitude]),
      () => alert("Please allow location permission."),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="campusMapWrap">
      <div className="campusTopBar">
        <div className="campusTopTitle">Campus</div>
        <button type="button" onClick={locateMe} className="campusBtnPrimary">
          Locate Me
        </button>
      </div>

      <MapContainer
        center={CAMPUS_CENTER}
        zoom={18}
        maxZoom={20}
        minZoom={16}
        style={{ width: "100%", height: "100%" }}
        scrollWheelZoom
        maxBounds={campusBounds}
        maxBoundsViscosity={0.9}
        zoomControl={false}
      >
        {/* ✅ makes map re-render correct after sidebar open/close */}
        <InvalidateSizeOnResize />

        <ZoomControl position="bottomright" />

        <TileLayer
          attribution="&copy; OpenStreetMap contributors, &copy; CARTO"
          url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        />

        <FitToCampus bounds={campusBounds} />

        <LegendCard />
        <ZoomedMarkers />

        {myPos && (
          <Marker position={myPos} icon={ICONS.ME}>
            <Popup>
              <b>My Location</b>
            </Popup>
          </Marker>
        )}

        {PLACES.map((p) => (
          <Marker key={p.key} position={p.pos} icon={ICONS[p.icon]}>
            <Popup>
              <div style={{ minWidth: 240 }}>
                <div style={{ fontWeight: 900, fontSize: 14 }}>{p.name}</div>
                <div style={{ marginTop: 10 }}>
                  <a
                    className="campusPopupBtn"
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.pos[0]},${p.pos[1]}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Navigate →
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}