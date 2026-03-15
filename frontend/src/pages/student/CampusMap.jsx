import { useEffect, useMemo, useRef, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  ZoomControl,
  Circle,
  useMapEvents,
  LayersControl,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import "leaflet-control-geocoder/dist/Control.Geocoder.css";
import "leaflet-control-geocoder";

import "../../styles/campusMap.css";

/* ✅ Fix default marker icon issue in Vite/React */
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

/* ✅ Campus places */
const PLACES = [
  { key: "A", short: "A", name: "A Block", pos: [16.232956, 80.5475303] },
  { key: "H", short: "H", name: "H Block", pos: [16.232237, 80.5486618] },
  { key: "N", short: "N", name: "N Block", pos: [16.2326178, 80.5503603] },
  { key: "U", short: "U", name: "U Block", pos: [16.2335496, 80.5507278] },
  { key: "CH", short: "CH", name: "Convocation Hall", pos: [16.2337901, 80.5515656] },
  { key: "VB", short: "VB", name: "Volleyball Court", pos: [16.2341661, 80.5520287] },
  { key: "PG", short: "PG", name: "Playground", pos: [16.2323673, 80.5520361] },
  { key: "PH", short: "PH", name: "Pharmacy College", pos: [16.2306427, 80.5505535] },
];

function getBounds(points, pad = 0.0016) {
  const lats = points.map((p) => p[0]);
  const lngs = points.map((p) => p[1]);
  const minLat = Math.min(...lats) - pad;
  const maxLat = Math.max(...lats) + pad;
  const minLng = Math.min(...lngs) - pad;
  const maxLng = Math.max(...lngs) + pad;
  return L.latLngBounds([minLat, minLng], [maxLat, maxLng]);
}

/* ✅ Custom label marker (big & readable) */
const labelIcon = (text) =>
  L.divIcon({
    className: "campusLabelIcon",
    html: `<div class="campusPin">${text}</div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 44],
    popupAnchor: [0, -38],
  });

/* ✅ Blue dot icon like Google Maps */
const blueDotIcon = L.divIcon({
  className: "gmBlueDotWrap",
  html: `
    <div class="gmBlueDot">
      <div class="gmBlueDotInner"></div>
    </div>
  `,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

/* ✅ Heading arrow icon */
const headingIcon = (deg) =>
  L.divIcon({
    className: "gmHeadingWrap",
    html: `<div class="gmHeading" style="transform: rotate(${deg}deg)"></div>`,
    iconSize: [34, 34],
    iconAnchor: [17, 17],
  });

/* ✅ Haversine distance */
function distanceMeters(a, b) {
  if (!a || !b) return null;
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371000;
  const dLat = toRad(b[0] - a[0]);
  const dLng = toRad(b[1] - a[1]);
  const lat1 = toRad(a[0]);
  const lat2 = toRad(b[0]);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;

  return 2 * R * Math.asin(Math.sqrt(h));
}

function fmtDistance(m) {
  if (m == null) return "-";
  if (m < 1000) return `${Math.round(m)} m`;
  return `${(m / 1000).toFixed(2)} km`;
}

/* ✅ Click/Long press to drop pin (Google maps style) */
function DropPin({ enabled, onDrop }) {
  const pressRef = useRef(null);

  useMapEvents({
    mousedown: (e) => {
      if (!enabled) return;
      pressRef.current = setTimeout(() => {
        onDrop([e.latlng.lat, e.latlng.lng]);
      }, 450); // long press
    },
    mouseup: () => {
      if (pressRef.current) clearTimeout(pressRef.current);
    },
    click: (e) => {
      if (!enabled) return;
      onDrop([e.latlng.lat, e.latlng.lng]);
    },
  });

  return null;
}

/* ✅ Leaflet geocoder control */
function GeocoderControl({ mapRef, bounds }) {
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (map.__geocoder) {
      map.removeControl(map.__geocoder);
      map.__geocoder = null;
    }

    const geocoder = L.Control.geocoder({
      defaultMarkGeocode: true,
      placeholder: "Search (A Block / N Block / etc.)",
    })
      .on("markgeocode", (e) => {
        map.setView(e.geocode.center, 19, { animate: true });
      })
      .addTo(map);

    map.__geocoder = geocoder;

    if (bounds) map.fitBounds(bounds, { padding: [40, 40] });

    return () => {
      if (map.__geocoder) {
        map.removeControl(map.__geocoder);
        map.__geocoder = null;
      }
    };
  }, [mapRef, bounds]);

  return null;
}

export default function CampusMap() {
  const mapRef = useRef(null);

  const [myPos, setMyPos] = useState(null);
  const [myAcc, setMyAcc] = useState(null);
  const [heading, setHeading] = useState(null); // degrees
  const [tracking, setTracking] = useState(false); // watchPosition
  const [followMe, setFollowMe] = useState(true);

  const [dropMode, setDropMode] = useState(true);
  const [droppedPin, setDroppedPin] = useState(null);

  const [selectedKey, setSelectedKey] = useState("");

  const CAMPUS_CENTER = [16.2329, 80.5504];
  const campusBounds = useMemo(() => getBounds(PLACES.map((p) => p.pos)), []);

  // Invalidate size (sidebar/resize)
  useEffect(() => {
    const run = () => mapRef.current?.invalidateSize();
    const t = setTimeout(run, 300);
    window.addEventListener("resize", run);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", run);
    };
  }, []);

  // Heading (mobile mostly)
  useEffect(() => {
    const handler = (e) => {
      // iOS uses webkitCompassHeading
      const deg =
        typeof e.webkitCompassHeading === "number"
          ? e.webkitCompassHeading
          : typeof e.alpha === "number"
          ? 360 - e.alpha
          : null;

      if (deg != null) setHeading(deg);
    };

    window.addEventListener("deviceorientationabsolute", handler, true);
    window.addEventListener("deviceorientation", handler, true);
    return () => {
      window.removeEventListener("deviceorientationabsolute", handler, true);
      window.removeEventListener("deviceorientation", handler, true);
    };
  }, []);

  // WatchPosition for live tracking
  useEffect(() => {
    if (!tracking) return;

    if (!navigator.geolocation) {
      alert("Geolocation not supported.");
      return;
    }

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        const next = [lat, lng];
        setMyPos(next);
        setMyAcc(acc || null);

        if (followMe) {
          mapRef.current?.setView(next, 19, { animate: true });
        }
      },
      () => alert("Please allow location permission."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );

    return () => navigator.geolocation.clearWatch(id);
  }, [tracking, followMe]);

  const locateOnce = () => {
    if (!navigator.geolocation) return alert("Geolocation not supported.");

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy;

        setMyPos([lat, lng]);
        setMyAcc(acc || null);

        mapRef.current?.setView([lat, lng], 19, { animate: true });
      },
      () => alert("Please allow location permission."),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  const openGoogleDir = (lat, lng) =>
    `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

  const jumpToPlace = (key) => {
    setSelectedKey(key);
    if (!key) return;
    const p = PLACES.find((x) => x.key === key);
    if (!p) return;
    mapRef.current?.setView(p.pos, 19, { animate: true });
  };

  const selectedPlace = selectedKey ? PLACES.find((p) => p.key === selectedKey) : null;
  const distanceToSelected = selectedPlace && myPos ? distanceMeters(myPos, selectedPlace.pos) : null;

  const onDropPin = (pos) => {
    setDroppedPin(pos);

    // copy coordinates like google maps "Dropped Pin"
    const txt = `${pos[0].toFixed(6)}, ${pos[1].toFixed(6)}`;
    navigator.clipboard?.writeText?.(txt).catch(() => {});
  };

  return (
    <div className="campusPage">
      <div className="campusHeader">
        <div>
          <h1 className="campusTitle">Campus Map</h1>
        </div>

        <div className="campusActions">
          <select
            className="campusSelect"
            value={selectedKey}
            onChange={(e) => jumpToPlace(e.target.value)}
          >
            <option value="">🔎 Jump to place</option>
            {PLACES.map((p) => (
              <option key={p.key} value={p.key}>
                {p.short} - {p.name}
              </option>
            ))}
          </select>

          <button className="campusBtn" onClick={locateOnce} type="button">
            📍 Locate
          </button>

          <button
            className={`campusBtn ${tracking ? "active" : ""}`}
            onClick={() => setTracking((s) => !s)}
            type="button"
            title="Continuously track your location"
          >
            {tracking ? "🟦 Tracking ON" : "▶ Start Tracking"}
          </button>

          <button
            className={`campusBtn campusBtnGhost ${followMe ? "active" : ""}`}
            onClick={() => setFollowMe((s) => !s)}
            type="button"
            title="Keep map centered on you"
            disabled={!tracking}
          >
            🧭 Follow {followMe ? "ON" : "OFF"}
          </button>

          <button
            className={`campusBtn campusBtnGhost ${dropMode ? "active" : ""}`}
            onClick={() => setDropMode((s) => !s)}
            type="button"
            title="Click map to drop a pin"
          >
            📌 Drop Pin {dropMode ? "ON" : "OFF"}
          </button>
        </div>
      </div>

      {selectedPlace && myPos && (
        <div className="campusHint">
          📍 You → <b>{selectedPlace.name}</b> : <b>{fmtDistance(distanceToSelected)}</b>
        </div>
      )}

      {dropMode && (
        <div className="campusHint">
          ✅ Drop Pin: Click anywhere → coordinates will show + copied (like Google Maps).
        </div>
      )}

      <div className="campusCard">
        <div className="campusMapWrap">
          <MapContainer
            center={CAMPUS_CENTER}
            zoom={18}
            minZoom={16}
            maxZoom={20}
            scrollWheelZoom
            zoomControl={false}
            maxBounds={campusBounds}
            maxBoundsViscosity={0.9}
            style={{ width: "100%", height: "100%" }}
            whenCreated={(map) => {
              mapRef.current = map;
              map.fitBounds(campusBounds, { padding: [40, 40] });
            }}
          >
            <ZoomControl position="bottomright" />

            <GeocoderControl mapRef={mapRef} bounds={campusBounds} />

            <LayersControl position="topright">
              <LayersControl.BaseLayer checked name="Clean Map (CARTO)">
                <TileLayer
                  attribution="&copy; OpenStreetMap contributors, &copy; CARTO"
                  url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Topo (Esri)">
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>

              <LayersControl.BaseLayer name="Satellite (Esri)">
                <TileLayer
                  attribution="Tiles &copy; Esri"
                  url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                />
              </LayersControl.BaseLayer>
            </LayersControl>

            {/* ✅ Drop pin like Google maps */}
            <DropPin enabled={dropMode} onDrop={onDropPin} />

            {/* ✅ Route line: You -> selected place */}
            {myPos && selectedPlace && (
              <Polyline positions={[myPos, selectedPlace.pos]} pathOptions={{ weight: 5 }} />
            )}

            {/* ✅ Dropped pin */}
            {droppedPin && (
              <Marker position={droppedPin}>
                <Popup>
                  <b>Dropped Pin</b>
                  <div className="campusSmall">
                    {droppedPin[0].toFixed(6)}, {droppedPin[1].toFixed(6)}
                  </div>
                  <div className="campusSmall">✅ Copied to clipboard</div>
                  <a
                    className="campusPopupBtn"
                    href={openGoogleDir(droppedPin[0], droppedPin[1])}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Navigate →
                  </a>
                </Popup>
              </Marker>
            )}

            {/* ✅ My location: blue dot + accuracy circle + heading */}
            {myPos && (
              <>
                {myAcc ? (
                  <Circle center={myPos} radius={myAcc} pathOptions={{ weight: 2 }} />
                ) : null}

                {/* Blue dot */}
                <Marker position={myPos} icon={blueDotIcon}>
                  <Popup>
                    <b>My Location</b>
                    {myAcc ? (
                      <div className="campusSmall">Accuracy: ~{Math.round(myAcc)}m</div>
                    ) : null}
                    <a
                      className="campusPopupBtn"
                      href={`https://www.google.com/maps/search/?api=1&query=${myPos[0]},${myPos[1]}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Maps →
                    </a>
                  </Popup>
                </Marker>

                {/* Heading arrow (if available) */}
                {typeof heading === "number" && (
                  <Marker position={myPos} icon={headingIcon(heading)} interactive={false} />
                )}
              </>
            )}

            {/* Campus markers */}
            {PLACES.map((p) => (
              <Marker key={p.key} position={p.pos} icon={labelIcon(p.short)}>
                <Popup>
                  <div className="campusPopup">
                    <div className="campusPopupTitle">
                      {p.short} • {p.name}
                    </div>
                    <div className="campusSmall">
                      {p.pos[0].toFixed(6)}, {p.pos[1].toFixed(6)}
                    </div>

                    {myPos ? (
                      <div className="campusSmall">
                        Distance from you:{" "}
                        <b>{fmtDistance(distanceMeters(myPos, p.pos))}</b>
                      </div>
                    ) : null}

                    <a
                      className="campusPopupBtn"
                      href={openGoogleDir(p.pos[0], p.pos[1])}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Navigate →
                    </a>

                    <button
                      type="button"
                      className="campusPopupBtn campusPopupBtnGhost"
                      onClick={() => jumpToPlace(p.key)}
                      style={{ marginTop: 8 }}
                    >
                      Highlight place →
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
}