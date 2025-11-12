// Formatting utilities matching Python output

export function fmtKm(meters: number): string {
  return `${(meters / 1000).toFixed(2)} km`;
}

export function fmtMin(seconds: number): string {
  return `${(seconds / 60).toFixed(1)} min`;
}

export function fmtHms(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}h ${m}m ${s}s`;
  } else if (m > 0) {
    return `${m}m ${s}s`;
  } else {
    return `${s}s`;
  }
}

export function fmtLatLng(lat: number, lng: number): string {
  return `${lat.toFixed(6)},${lng.toFixed(6)}`;
}

export function fmtTimestamp(): string {
  return new Date().toISOString();
}
