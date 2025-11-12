export type LatLng = { lat: number; lng: number };

export type IngestionConfig = {
  selected_wastes: string[];
  selected_area: string;    // "este" | "centro" | "oeste"
  counts_rule: string;
  cocheras: LatLng;
  planta: LatLng;
  source_file: string;
  rows_total: number;
  rows_selected: number;
};

export type StopRow = {
  lat: number;
  lng: number;
  service_s: number;
  w_area?: string;
  w_wastes?: string;
  pueblo?: string;
  municipio?: string;
  fid?: string | number;
  _wp_id?: string;          // created if missing
};

export type OrderedVia = {
  id: string;
  lat: number;
  lng: number;
  service_s: number;
  sequence: number;
};

export type OrderedStopsArtifact = {
  wps_raw: unknown;
  routing_inputs: {
    origin: LatLng;
    destination: LatLng;
    vias: OrderedVia[];
  };
  meta: {
    selected_wastes: string[];
    selected_area: string;
    departure: string;     // ISO Z
    mode: string;          // "fastest;truck;traffic:disabled"
    improveFor: string;    // "time"
  };
};

export type RoutingConfig = {
  transportMode: string;
  return: string;
  spans: string;
  departureTime: string;
  stopDurationFallbackS: number;
  allowUturns: boolean;
  avoidDifficultTurns: boolean;
  useRadiusInsteadOfSnap: boolean;
  snapOrRadiusValue: number;
  shapingBefore: Record<number, LatLng>;
  lightTruckMode: boolean;
  vehicleProfile: Record<string, string>;
  avoidFeatures: string[];
};

export type RoutingArtifact = {
  generated_at: string;
  transportMode: string;
  departureTime: string;
  return: string;
  spans: string;
  avoid_features: string[];
  vehicle_params: Record<string, string>;
  origin: LatLng;
  destination: LatLng;
  via_count: number;
  totals: { length_m: number; duration_s: number };
  section_polylines: string[];
  raw: unknown;
  section_notices: Array<{ section_index: number; notices: unknown }>;
};

export type Step4Data = {
  origin: LatLng;
  destination: LatLng;
  vias: Array<{
    lat: number;
    lng: number;
    service_s: number;
    sequence: number;
    id?: string;
  }>;
  sections: Array<{ polyline?: string }>;
  totals: {
    length_m: number;
    duration_s: number;
  };
};
