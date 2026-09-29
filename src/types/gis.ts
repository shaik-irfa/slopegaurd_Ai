/**
 * Shared GIS types for SLOPEGUARD AI (Phase 1 — Meghalaya pilot).
 * Geometry types follow the GeoJSON spec (RFC 7946).
 */

export type Position = [number, number];

export type PolygonGeometry = {
  type: "Polygon";
  coordinates: Position[][];
};

export type MultiPolygonGeometry = {
  type: "MultiPolygon";
  coordinates: Position[][][];
};

export type PointGeometry = {
  type: "Point";
  coordinates: Position;
};

export type AreaGeometry = PolygonGeometry | MultiPolygonGeometry;

/** [minLon, minLat, maxLon, maxLat] */
export type BBox = [number, number, number, number];

export interface DistrictProperties {
  id: string;
  name: string;
  /** Approximate area computed from the simplified boundary geometry. */
  areaKm2: number | null;
  bbox: BBox;
  source: string;
  /** Number of landslide records in the source dataset for this district. */
  landslideCount: number | null;
}

export interface DistrictFeature {
  type: "Feature";
  id: string;
  geometry: AreaGeometry;
  properties: DistrictProperties;
}

export interface DistrictCollection {
  type: "FeatureCollection";
  features: DistrictFeature[];
}

/** Only fields that genuinely exist in the source dataset are typed here. */
export interface LandslideProperties {
  objectid?: number;
  state_name?: string;
  district?: string;
  slide_id?: string;
  source?: string;
  landslide_name?: string;
  location?: string;
  nh_sh_affected?: string;
  year?: string;
  /** Epoch milliseconds, as delivered by the source service. */
  date_of_event?: number;
  casualty?: number;
  rainfall_24hr_mm?: number;
  status?: string;
}

export interface LandslideFeature {
  type: "Feature";
  id: number | string;
  geometry: PointGeometry;
  properties: LandslideProperties;
}

export interface LandslideCollection {
  type: "FeatureCollection";
  features: LandslideFeature[];
}

export interface ApiMeta {
  /** Human readable provenance string shown in the UI. */
  source: string;
  /** True when data is source-derived static GeoJSON rather than a live query. */
  staticSnapshot: boolean;
  count: number;
}

export interface DistrictsResponse {
  meta: ApiMeta;
  data: DistrictCollection;
}

export interface LandslidesResponse {
  meta: ApiMeta;
  data: LandslideCollection;
}

export type SelectedFeature =
  | { kind: "district"; feature: DistrictFeature }
  | { kind: "landslide"; feature: LandslideFeature }
  | null;

export interface LayerState {
  districts: boolean;
  landslides: boolean;
  /** Model-derived prototype risk grid (Phase 2). */
  riskGrid: boolean;
  terrain: boolean;
  satellite: boolean;
  /** Nearby public-map assets from OpenStreetMap (Phase 3 exposure). */
  assets: boolean;
  /** Field / citizen verification reports stored by this prototype (Phase 3). */
  reports: boolean;
}
