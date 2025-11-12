import type { LatLng, RoutingArtifact, RoutingConfig, OrderedVia } from '../types';

export type ViaStop = { id: string; lat: number; lng: number; service_s: number };

export function sanitizeStops(input: ViaStop[]): ViaStop[] {
  const out: ViaStop[] = [];
  for (const s of input || []) {
    const lat = Number(s?.lat);
    const lng = Number(s?.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    let svc = Number(s?.service_s);
    if (!Number.isFinite(svc) || svc <= 0) svc = 45;

    let id = String(s?.id ?? '').trim();
    if (!id) id = String(out.length + 1);

    out.push({ id, lat, lng, service_s: Math.round(svc) });
  }
  return out;
}

export function dedupeIds(stops: ViaStop[]): ViaStop[] {
  const seen = new Map<string, number>();
  return stops.map(s => {
    const k = s.id;
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return n === 1 ? s : { ...s, id: `${k}___${n}` };
  });
}

export function buildWpsUrl(params: {
  cocheras: {lat:number; lng:number};
  planta: {lat:number; lng:number};
  stops: Array<{lat:number; lng:number; service_s:number; _wp_id:string;}>;
  apiKey: string;
  improveFor?: string;  // default "time"
  mode?: string;        // default "fastest;truck;traffic:disabled"
  departureISO?: string;// default now UTC Z
  stepLog?: (msg: string) => void;
}): { url: string; improveFor: string; mode: string; departure: string } {
  const {
    cocheras,
    planta,
    stops,
    apiKey,
    improveFor = "time",
    mode = "fastest;truck;traffic:disabled",
    departureISO = (new Date().toISOString() ?? '').replace(/\.\d{3}Z$/, 'Z'),
    stepLog
  } = params;

  // Console.log all values we call .replace on
  console.log('🐛 DEBUG: departureISO before replace:', new Date().toISOString());
  console.log('🐛 DEBUG: departureISO after replace:', departureISO);
  console.log('🐛 DEBUG: improveFor:', improveFor);
  console.log('🐛 DEBUG: mode:', mode);

  // Convert input stops to ViaStop format and sanitize
  const rawStops: ViaStop[] = (stops || []).map(s => ({
    id: s._wp_id,
    lat: s.lat,
    lng: s.lng,
    service_s: s.service_s
  }));

  const valid = dedupeIds(sanitizeStops(rawStops));

  stepLog?.(`Stops before sanitize: ${stops?.length ?? 0}`);
  stepLog?.(`Stops after sanitize: ${valid.length}`);

  valid.slice(0, 3).forEach((s, i) => {
    stepLog?.(`dest preview #${i+1}: stop${s.id};${s.lat.toFixed(6)},${s.lng.toFixed(6)};st:${s.service_s}`);
  });

  if (valid.length === 0) {
    throw new Error("No valid stops after sanitization. Check Step 1 filters and data.");
  }

  const parts: string[] = [];
  parts.push(`start=Cocheras;${cocheras.lat},${cocheras.lng}`);

  // Build contiguous destination numbering
  for (let i = 0; i < valid.length; i++) {
    const s = valid[i];
    parts.push(
      `destination${i+1}=` +
      `stop${encodeURIComponent(s.id)};${s.lat.toFixed(6)},${s.lng.toFixed(6)};st:${Math.max(1, s.service_s | 0)}` 
    );
  }

  // Sanity check: contiguous numbering
  const destKeys = parts
    .filter(p => p.startsWith("destination"))
    .map(p => p.split("=")[0])
    .sort((a,b) => parseInt(a.replace('destination','')) - parseInt(b.replace('destination','')));
  
  stepLog?.('Destination params (numeric): ' + JSON.stringify(destKeys));
  
  const contiguous = destKeys.every((k, i) => k === `destination${i+1}`);
  if (!contiguous) {
    stepLog?.('❌ Gap in destination numbering: ' + JSON.stringify(destKeys));
    throw new Error("Bad destination numbering: non-contiguous destinationN keys.");
  }

  const last = valid[valid.length - 1];
  stepLog?.(`dest preview last: stop${last.id};${last.lat.toFixed(6)},${last.lng.toFixed(6)};st:${last.service_s}`);

  parts.push(`end=Planta;${planta.lat},${planta.lng}`);
  parts.push(`improveFor=${improveFor}`);
  parts.push(`mode=${mode}`);
  parts.push(`departure=${departureISO}`);
  parts.push(`apiKey=${apiKey}`);

  const url = `https://wps.hereapi.com/v8/findsequence2?${parts.join('&')}`;
  
  return { url, improveFor, mode, departure: departureISO };
}

// Routing helpers for Step 3
export function encodeBracketed(key: string): string {
  return encodeURIComponent(key);
}

export function waypointParam(
  kind: 'origin' | 'via' | 'destination',
  lat: number,
  lng: number,
  opts: {
    snapRadius?: number;
    radius?: number;
    passThrough?: boolean;
    stopDuration?: number;
  } = {}
): string {
  const { snapRadius = 30, radius, passThrough = false, stopDuration } = opts;
  
  let param = `${kind}=${lat},${lng}`;
  
  if (radius !== undefined) {
    param += `;radius=${radius}`;
  } else {
    param += `;snapRadius=${snapRadius}`;
  }
  
  if (passThrough) {
    param += ';passThrough=true';
  }
  
  if (stopDuration !== undefined) {
    param += `!stopDuration=${stopDuration}`;
  }
  
  return param;
}

export function buildRouterGetUrlStep3(params: {
  origin: LatLng;
  destination: LatLng;
  vias: OrderedVia[];
  config: RoutingConfig;
  apiKey: string;
  stepLog?: (msg: string) => void;
}): { url: string; config: RoutingConfig } {
  const {
    origin,
    destination,
    vias,
    config,
    apiKey,
    stepLog
  } = params;

  const parts: string[] = [];
  
  // Basic parameters
  parts.push(`transportMode=${config.transportMode}`);
  parts.push(`return=${config.return}`);
  parts.push(`spans=${config.spans}`);
  parts.push(`departureTime=${config.departureTime}`);
  
  // Origin
  parts.push(waypointParam('origin', origin.lat, origin.lng, {
    snapRadius: config.snapOrRadiusValue
  }));
  
  // Sort vias by sequence
  const sortedVias = [...vias].sort((a, b) => a.sequence - b.sequence);
  
  // Add shaping waypoints (passThrough)
  Object.entries(config.shapingBefore).forEach(([idxStr, point]) => {
    const idx = parseInt(idxStr);
    if (idx >= 0 && idx < sortedVias.length) {
      parts.push(waypointParam('via', point.lat, point.lng, {
        snapRadius: config.snapOrRadiusValue,
        passThrough: true
      }));
    }
  });
  
  // Add actual vias with stopDuration
  sortedVias.forEach((via) => {
    const serviceS = Number(via.service_s);
    const stopDuration = Number.isFinite(serviceS) && serviceS > 0 
      ? Math.round(serviceS) 
      : config.stopDurationFallbackS;
    
    parts.push(waypointParam('via', via.lat, via.lng, {
      snapRadius: config.snapOrRadiusValue,
      stopDuration
    }));
  });
  
  // Destination
  parts.push(waypointParam('destination', destination.lat, destination.lng, {
    snapRadius: config.snapOrRadiusValue
  }));
  
  // Avoid features
  config.avoidFeatures.forEach((feature) => {
    parts.push(`${encodeBracketed('avoid[features]')}=${encodeURIComponent(feature)}`);
  });
  
  // Vehicle parameters
  Object.entries(config.vehicleProfile).forEach(([key, value]) => {
    parts.push(`${encodeBracketed(`vehicle[${key}]`)}=${encodeURIComponent(value)}`);
  });
  
  // API key
  parts.push(`apiKey=${apiKey}`);
  
  const url = `https://router.hereapi.com/v8/routes?${parts.join('&')}`;
  
  stepLog?.(`📏 GET URL length: ${url.length.toLocaleString()}`);
  if (url.length > 14000) {
    stepLog?.(`⚠️ Warning: URL length ${url.length.toLocaleString()} exceeds 14k characters`);
  }
  
  return { url, config };
}

export function parseRoutingResponse(response: any, config: RoutingConfig, origin: LatLng, destination: LatLng, viaCount: number): RoutingArtifact {
  const routes = response?.routes ?? [];
  if (!Array.isArray(routes) || routes.length === 0) {
    throw new Error('No routes returned from Router API');
  }
  
  const sections = routes[0]?.sections ?? [];
  if (!Array.isArray(sections)) {
    throw new Error('Invalid sections in routing response');
  }
  
  // Aggregate totals
  let totalLengthM = 0;
  let totalDurationS = 0;
  const sectionPolylines: string[] = [];
  const sectionNotices: Array<{ section_index: number; notices: unknown[] }> = [];
  
  sections.forEach((section: any, index: number) => {
    const summary = section?.summary ?? {};
    const length = Number(summary?.length) ?? 0;
    const duration = Number(summary?.duration) ?? 0;
    
    if (Number.isFinite(length)) totalLengthM += length;
    if (Number.isFinite(duration)) totalDurationS += duration;
    
    const polyline = section?.polyline;
    if (polyline) {
      sectionPolylines.push(polyline);
    }
    
    const notices = section?.notices;
    if (Array.isArray(notices) && notices.length > 0) {
      sectionNotices.push({
        section_index: index,
        notices
      });
    }
  });
  
  return {
    generated_at: new Date().toISOString(),
    transportMode: config.transportMode,
    departureTime: config.departureTime,
    return: config.return,
    spans: config.spans,
    avoid_features: config.avoidFeatures,
    vehicle_params: config.vehicleProfile,
    origin,
    destination,
    via_count: viaCount,
    totals: {
      length_m: totalLengthM,
      duration_s: totalDurationS
    },
    section_polylines: sectionPolylines,
    raw: response,
    section_notices: sectionNotices
  };
}
