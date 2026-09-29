import { useEffect, useMemo } from "react";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  GeoJSON,
  CircleMarker,
  Rectangle,
  Popup,
  useMap,
  useMapEvents,
} from "react-leaflet";
import { LEVEL_HEX } from "@/lib/risk/level-style";
import { ASSET_ICONS, ASSET_LABELS, REPORT_TYPE_LABELS } from "@/lib/decision/types";
import type { NearbyAsset, ReportRecord } from "@/lib/decision/types";
import type { RiskGridCell, RiskLevel } from "@/lib/risk/types";
import type {
  BBox,
  DistrictCollection,
  DistrictFeature,
  LandslideFeature,
  LayerState,
} from "@/types/gis";

const MEGHALAYA_CENTER: [number, number] = [25.5, 91.3];
const MEGHALAYA_BOUNDS = L.latLngBounds([24.9, 89.7], [26.2, 92.9]);

export interface AssessedPoint {
  lat: number;
  lon: number;
  level: RiskLevel | null;
  score: number | null;
}

interface Props {
  districts: DistrictCollection | null;
  landslides: LandslideFeature[];
  layers: LayerState;
  selectedDistrictId: string | null;
  focusBBox: BBox | null;
  onSelectDistrict: (feature: DistrictFeature) => void;
  onSelectLandslide: (feature: LandslideFeature) => void;
  locateRequestId: number;
  riskCells: RiskGridCell[];
  assessedPoint: AssessedPoint | null;
  onMapClick: (lat: number, lon: number) => void;
  onSelectRiskCell: (cell: RiskGridCell) => void;
  /** Real OpenStreetMap assets near the assessed point (Phase 3 exposure). */
  assets?: NearbyAsset[];
  /** Field-verification reports stored by this prototype. */
  reports?: ReportRecord[];
}

function FitToBBox({ bbox }: { bbox: BBox | null }) {
  const map = useMap();
  // The map is mounted inside a flex layout, so make sure Leaflet knows its
  // final pixel size before fitting the state bounds (otherwise small screens
  // fit the wrong area).
  useEffect(() => {
    const refit = () => {
      map.invalidateSize();
      if (!bbox) map.fitBounds(MEGHALAYA_BOUNDS, { padding: [16, 16] });
    };
    const t = setTimeout(refit, 250);
    window.addEventListener("resize", refit);
    return () => {
      clearTimeout(t);
      window.removeEventListener("resize", refit);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map]);
  useEffect(() => {
    if (!bbox) {
      map.fitBounds(MEGHALAYA_BOUNDS, { padding: [16, 16] });
      return;
    }
    map.fitBounds(
      L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]),
      { padding: [24, 24], animate: true },
    );
  }, [bbox, map]);
  return null;
}

function LocateControl({ requestId }: { requestId: number }) {
  const map = useMap();
  useEffect(() => {
    if (requestId === 0 || typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const ll = L.latLng(pos.coords.latitude, pos.coords.longitude);
        map.setView(ll, 12);
        L.circleMarker(ll, {
          radius: 7,
          color: "#1d4ed8",
          weight: 2,
          fillColor: "#3b82f6",
          fillOpacity: 0.9,
        })
          .addTo(map)
          .bindPopup("Your approximate location (device GPS)")
          .openPopup();
      },
      () => {
        map.fitBounds(MEGHALAYA_BOUNDS);
      },
      { enableHighAccuracy: false, timeout: 8000 },
    );
  }, [requestId, map]);
  return null;
}

function ClickCapture({ onMapClick }: { onMapClick: (lat: number, lon: number) => void }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

function DistrictLabels({ districts }: { districts: DistrictCollection | null }) {
  const map = useMap();
  useEffect(() => {
    if (!districts) return;
    const group = L.layerGroup().addTo(map);
    for (const f of districts.features) {
      const [minX, minY, maxX, maxY] = f.properties.bbox;
      L.marker([(minY + maxY) / 2, (minX + maxX) / 2], {
        interactive: false,
        icon: L.divIcon({
          className: "district-label",
          html: f.properties.name,
          iconSize: [120, 16],
          iconAnchor: [60, 8],
        }),
      }).addTo(group);
    }
    return () => {
      group.remove();
    };
  }, [districts, map]);
  return null;
}

export default function MeghalayaMap({
  districts,
  landslides,
  layers,
  selectedDistrictId,
  focusBBox,
  onSelectDistrict,
  onSelectLandslide,
  locateRequestId,
  riskCells,
  assessedPoint,
  onMapClick,
  onSelectRiskCell,
  assets = [],
  reports = [],
}: Props) {
  // The source dataset repeats coordinates for recurring events at the same
  // site, so co-located records are drawn as one marker that states its count.
  const landslideGroups = useMemo(() => {
    const map = new Map<string, { key: string; primary: LandslideFeature; features: LandslideFeature[] }>();
    for (const f of landslides) {
      const [lon, lat] = f.geometry.coordinates;
      const key = `${lon.toFixed(4)},${lat.toFixed(4)}`;
      const existing = map.get(key);
      if (existing) existing.features.push(f);
      else map.set(key, { key, primary: f, features: [f] });
    }
    return [...map.values()];
  }, [landslides]);

  const districtStyle = useMemo(
    () => (feature?: { properties?: { id?: string } }) => {
      const selected = feature?.properties?.id === selectedDistrictId;
      return {
        color: selected ? "#b45309" : "#334e7a",
        weight: selected ? 2.5 : 1.1,
        fillColor: selected ? "#f59e0b" : "#5b7bb4",
        fillOpacity: selected ? 0.18 : 0.07,
      };
    },
    [selectedDistrictId],
  );

  return (
    <MapContainer
      center={MEGHALAYA_CENTER}
      zoom={8}
      minZoom={6}
      maxZoom={17}
      preferCanvas
      scrollWheelZoom
      className="h-full w-full"
      attributionControl
    >
      {layers.satellite ? (
        <TileLayer
          key="esri-imagery"
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
          attribution="Imagery &copy; Esri, Maxar, Earthstar Geographics"
          maxZoom={17}
        />
      ) : layers.terrain ? (
        <TileLayer
          key="opentopo"
          url="https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenTopoMap (CC-BY-SA), data &copy; OpenStreetMap contributors"
          maxZoom={16}
        />
      ) : (
        <TileLayer
          key="osm"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution="&copy; OpenStreetMap contributors"
          maxZoom={19}
        />
      )}

      {layers.riskGrid
        ? riskCells.map((cell) => (
            <Rectangle
              key={cell.id}
              bounds={[
                [cell.bbox[1], cell.bbox[0]],
                [cell.bbox[3], cell.bbox[2]],
              ]}
              pathOptions={{
                color: LEVEL_HEX[cell.risk_level],
                weight: 0.6,
                fillColor: LEVEL_HEX[cell.risk_level],
                fillOpacity: 0.42,
              }}
              eventHandlers={{ click: () => onSelectRiskCell(cell) }}
            />
          ))
        : null}

      {layers.districts && districts ? (
        <>
          <GeoJSON
            key={`districts-${selectedDistrictId ?? "none"}`}
            data={districts as unknown as GeoJSON.GeoJsonObject}
            style={districtStyle as never}
            onEachFeature={(feature, layer) => {
              layer.on("click", () => onSelectDistrict(feature as unknown as DistrictFeature));
            }}
          />
          <DistrictLabels districts={districts} />
        </>
      ) : null}

      {layers.landslides
        ? landslideGroups.map((group) => {
            const f = group.primary;
            return (
              <CircleMarker
                key={group.key}
                center={[f.geometry.coordinates[1], f.geometry.coordinates[0]]}
                radius={group.features.length > 1 ? 7 : 5}
                pathOptions={{
                  color: "#7c2d12",
                  weight: 1,
                  fillColor: "#ea580c",
                  fillOpacity: 0.85,
                }}
                eventHandlers={{ click: () => onSelectLandslide(f) }}
              >
                <Popup>
                  <strong className="font-display">
                    {f.properties.landslide_name ?? "Landslide record"}
                  </strong>
                  <br />
                  {f.properties.location ?? "Location not available in prototype"}
                  <br />
                  <span className="text-muted-foreground">
                    {f.properties.district ?? "District not available"} ·{" "}
                    {f.properties.year ?? "Year not available"}
                  </span>
                  <br />
                  {group.features.length > 1 ? (
                    <>
                      <span className="text-muted-foreground">
                        {group.features.length} records at these coordinates in the source dataset
                      </span>
                      <br />
                    </>
                  ) : null}
                  <span className="text-muted-foreground">Source: Meghalaya GIS</span>
                </Popup>
              </CircleMarker>
            );
          })
        : null}

      {assessedPoint ? (
        <CircleMarker
          center={[assessedPoint.lat, assessedPoint.lon]}
          radius={11}
          pathOptions={{
            color: assessedPoint.level ? LEVEL_HEX[assessedPoint.level] : "#334e7a",
            weight: 3,
            fillColor: assessedPoint.level ? LEVEL_HEX[assessedPoint.level] : "#94a3b8",
            fillOpacity: 0.6,
          }}
        >
          <Popup>
            <strong className="font-display">Assessed location</strong>
            <br />
            {assessedPoint.lat.toFixed(4)}, {assessedPoint.lon.toFixed(4)}
            <br />
            {assessedPoint.level ? (
              <span>
                Model-derived risk: {assessedPoint.score} / 100 — {assessedPoint.level}
              </span>
            ) : (
              <span className="text-muted-foreground">Not assessed yet — tap “Assess risk”.</span>
            )}
          </Popup>
        </CircleMarker>
      ) : null}

      {layers.assets
        ? assets
            .filter((a) => a.latitude !== null && a.longitude !== null)
            .map((a, i) => (
              <CircleMarker
                key={`asset-${a.type}-${i}`}
                center={[a.latitude as number, a.longitude as number]}
                radius={5}
                pathOptions={{
                  color: "#1e3a8a",
                  weight: 1.5,
                  fillColor: "#60a5fa",
                  fillOpacity: 0.9,
                }}
              >
                <Popup>
                  <strong className="font-display">
                    <span aria-hidden>{ASSET_ICONS[a.type]}</span> {a.name}
                  </strong>
                  <br />
                  {ASSET_LABELS[a.type]}
                  <br />
                  {a.distance_km !== null ? (
                    <span>{a.distance_km.toFixed(2)} km from the assessed point</span>
                  ) : (
                    <span className="text-muted-foreground">Distance not available</span>
                  )}
                  <br />
                  <span className="text-muted-foreground">Source: OpenStreetMap contributors</span>
                </Popup>
              </CircleMarker>
            ))
        : null}

      {layers.reports
        ? reports.map((r) => (
            <CircleMarker
              key={`report-${r.id}`}
              center={[r.latitude, r.longitude]}
              radius={7}
              pathOptions={{
                color: "#312e81",
                weight: 2,
                fillColor: r.status === "verified" ? "#22c55e" : "#a855f7",
                fillOpacity: 0.85,
              }}
            >
              <Popup>
                <strong className="font-display">
                  Field report — {REPORT_TYPE_LABELS[r.report_type]}
                </strong>
                <br />
                {r.description}
                <br />
                <span className="text-muted-foreground">
                  {new Date(r.created_at).toLocaleString()} · {r.status}
                </span>
                <br />
                <span className="text-muted-foreground">
                  Prototype field report — does not change the model-derived risk score.
                </span>
              </Popup>
            </CircleMarker>
          ))
        : null}

      <ClickCapture onMapClick={onMapClick} />
      <FitToBBox bbox={focusBBox} />
      <LocateControl requestId={locateRequestId} />
    </MapContainer>
  );
}

export { LocateControl };
