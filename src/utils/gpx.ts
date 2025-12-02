import { decode } from '@here/flexpolyline';
import { readJSON } from './artifacts';

interface RoutePoint {
  lat: number;
  lng: number;
}

interface RoutingResponse {
  raw?: {
    routes?: Array<{
      sections?: Array<{
        polyline?: string;
      }>;
    }>;
  };
  totals: {
    length_m: number;
    duration_s: number;
  };
}

interface IngestionConfig {
  selected_wastes?: string[];
  selected_routes?: string[];  // Multi-select routes
}

export function titleRoutes(routes?: string[]): string {
  if (!routes || routes.length === 0) return "";
  // Capitalize and join multiple route names
  return routes.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(", ");
}

export function sanitizeTitle(base: string): string {
  // Keep Spanish characters, spaces, commas, dots, hyphens
  return base.replace(/[^A-Za-z0-9 áéíóúÁÉÍÓÚüÜñÑ,.\-]/g, "_").trim();
}

export function decimate<T>(arr: T[], every = 1): T[] {
  if (every <= 1 || arr.length <= 2) return arr;
  const out = arr.filter((_, i) => i % every === 0);
  if (out.length && out[out.length - 1] !== arr[arr.length - 1]) {
    out.push(arr[arr.length - 1]);
  }
  return out;
}

export function appendNoDupes(points: RoutePoint[], next: RoutePoint[]): void {
  if (points.length === 0 || next.length === 0) {
    points.push(...next);
    return;
  }
  
  const last = points[points.length - 1];
  const first = next[0];
  
  // Check if points are the same (within tolerance)
  const same = Math.abs(last.lat - first.lat) < 1e-7 && Math.abs(last.lng - first.lng) < 1e-7;
  
  if (same) {
    // Skip the first point of next section
    points.push(...next.slice(1));
  } else {
    points.push(...next);
  }
}

export async function buildGpxXml(options: {
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  sectionPolylines: string[];
  name: string;
  description: string;
  decimateEvery?: number;
}): Promise<string> {
  const {
    origin,
    destination,
    sectionPolylines,
    name,
    description,
    decimateEvery = 1
  } = options;

  // Decode and merge all sections
  const allPoints: RoutePoint[] = [];
  
  for (const polylineStr of sectionPolylines) {
    try {
      // decode returns {polyline: [[lat, lng, alt?], ...]}
      const decoded = decode(polylineStr);
      const coords = decoded.polyline.map((point: any) => ({
        lat: point[0],
        lng: point[1]
      }));
      
      // Apply decimation
      const decimated = decimate(coords, decimateEvery);
      
      // Append without duplicates
      appendNoDupes(allPoints, decimated);
    } catch (e) {
      console.warn('Failed to decode polyline:', e);
    }
  }

  // Generate GPX XML manually
  let xml = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="CIMAS Route Planner" xmlns="http://www.topografix.com/GPX/1/1">
  <metadata>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
  </metadata>
`;

  // Add waypoints
  if (origin?.lat && origin?.lng) {
    xml += `  <wpt lat="${origin.lat}" lon="${origin.lng}">
    <name>Cocheras (start)</name>
  </wpt>
`;
  }
  
  if (destination?.lat && destination?.lng) {
    xml += `  <wpt lat="${destination.lat}" lon="${destination.lng}">
    <name>Planta (end)</name>
  </wpt>
`;
  }

  // Add track
  xml += `  <trk>
    <name>${escapeXml(name)}</name>
    <desc>${escapeXml(description)}</desc>
    <trkseg>
`;

  // Add track points
  allPoints.forEach(point => {
    xml += `      <trkpt lat="${point.lat}" lon="${point.lng}"></trkpt>
`;
  });

  xml += `    </trkseg>
  </trk>
</gpx>`;

  return xml;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

interface OrderedStops {
  routing_inputs?: {
    origin?: { lat: number; lng: number };
    destination?: { lat: number; lng: number };
    vias?: Array<{ lat: number; lng: number }>;
  };
  meta?: {
    selected_wastes?: string[];
    selected_routes?: string[];  // Multi-select routes
  };
}

export async function loadGpxData(): Promise<{
  routingResponse: RoutingResponse;
  origin?: { lat: number; lng: number };
  destination?: { lat: number; lng: number };
  viaCount: number;
  selectedWastes: string[];
  selectedRoutes: string[];  // Multi-select routes
}> {
  // Load routing response
  const routingResponse = await readJSON<RoutingResponse>('routing_response.json');
  if (!routingResponse) {
    throw new Error('routing_response.json not found. Please run Step 3 first.');
  }
  
  // Load ordered stops for origin/destination and fallback naming
  const orderedStops = await readJSON<OrderedStops>('ordered_stops.json');
  if (!orderedStops) {
    throw new Error('ordered_stops.json not found. Please run Step 2 first.');
  }
  
  // Load naming config (prefer ingestion_config.json, fallback to ordered_stops.json.meta)
  let selectedWastes: string[] = [];
  let selectedRoutes: string[] = [];
  
  try {
    const ingestionConfig = await readJSON<IngestionConfig>('ingestion_config.json');
    if (ingestionConfig) {
      selectedWastes = ingestionConfig.selected_wastes || [];
      selectedRoutes = ingestionConfig.selected_routes || [];
    }
  } catch (e) {
    // Fallback to ordered_stops.json.meta
    if (orderedStops?.meta) {
      selectedWastes = orderedStops.meta.selected_wastes || [];
      selectedRoutes = orderedStops.meta.selected_routes || [];
    }
  }
  
  return {
    routingResponse,
    origin: orderedStops.routing_inputs?.origin,
    destination: orderedStops.routing_inputs?.destination,
    viaCount: orderedStops.routing_inputs?.vias?.length || 0,
    selectedWastes,
    selectedRoutes
  };
}

export function generateFilename(selectedWastes: string[], selectedRoutes?: string[]): string {
  const wastePart = selectedWastes.length > 0 ? selectedWastes.join(', ') : 'Ruta';
  const routePart = titleRoutes(selectedRoutes);
  
  const baseTitle = routePart ? `${wastePart} Ruta ${routePart}` : `${wastePart} Ruta`;
  const safeTitle = sanitizeTitle(baseTitle);
  
  return `${safeTitle}.gpx`;
}

export function generateTrackName(baseTitle: string): string {
  const ts = new Date().toISOString().replace(/\.\d+Z$/, 'Z').replace('T', ' ').slice(0, 16) + 'Z';
  return `${baseTitle} (${ts})`;
}

export function generateTrackDescription(totals: { length_m: number; duration_s: number }, viaCount: number): string {
  const distance = (totals.length_m / 1000).toFixed(1);
  const duration = (totals.duration_s / 60).toFixed(1);
  return `Distance: ${distance} km | Duration: ${duration} min | Vias: ${viaCount}`;
}
