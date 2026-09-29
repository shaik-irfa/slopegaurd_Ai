/**
 * GIS service (server-side).
 *
 * Data provenance:
 *  - District boundaries: Meghalaya Government GIS,
 *    District_Boundary_2021 FeatureServer (12 district layers, EPSG:4326).
 *  - Landslide records: Meghalaya Government GIS, MBDA_Test/Landslide
 *    FeatureServer (point layer, statewide).
 *
 * Both were queried as GeoJSON and stored as source-derived static snapshots
 * under src/data (boundaries were geometry-simplified for browser performance).
 * The upstream ArcGIS endpoints are not browser-consumable (CORS), so the
 * snapshots are served through this API layer instead of invented data.
 */
import districtsRaw from "../data/meghalaya-districts.json";
import landslidesRaw from "../data/meghalaya-landslides.json";
import type {
  DistrictCollection,
  DistrictFeature,
  LandslideCollection,
  LandslideFeature,
} from "../types/gis";

export const DISTRICT_SOURCE =
  "Meghalaya Government GIS — District_Boundary_2021 FeatureServer (source-derived static data)";
export const LANDSLIDE_SOURCE =
  "Meghalaya Government GIS — MBDA_Test/Landslide FeatureServer (source-derived static data)";

const landslides = landslidesRaw as unknown as LandslideCollection;

function countByDistrict(): Map<string, number> {
  const map = new Map<string, number>();
  for (const f of landslides.features) {
    const d = (f.properties.district ?? "").trim().toLowerCase();
    if (!d) continue;
    map.set(d, (map.get(d) ?? 0) + 1);
  }
  return map;
}

const counts = countByDistrict();

const districts: DistrictCollection = {
  type: "FeatureCollection",
  features: (districtsRaw as unknown as DistrictCollection).features.map((f) => ({
    ...f,
    properties: {
      ...f.properties,
      landslideCount: counts.get(f.properties.name.trim().toLowerCase()) ?? 0,
    },
  })),
};

export function getDistricts(): DistrictCollection {
  return districts;
}

export function getDistrict(id: string): DistrictFeature | undefined {
  const key = id.trim().toLowerCase();
  return districts.features.find(
    (f) => f.properties.id === key || f.properties.name.toLowerCase() === key,
  );
}

export function getLandslides(district?: string): LandslideFeature[] {
  if (!district) return landslides.features;
  const key = district.trim().toLowerCase();
  const byId = getDistrict(key);
  const name = (byId?.properties.name ?? key).toLowerCase();
  return landslides.features.filter((f) => (f.properties.district ?? "").toLowerCase() === name);
}
