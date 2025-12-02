import Papa from 'papaparse';

// ============ Dynamic Schema Detection Logic ============

// Helper: Check if header is blank, "Unnamed:...", or Papa Parse default (_1, _2, etc.)
function headerIsBlank(s: string): boolean {
  if (!s || s.trim() === '') return true;
  if (s.startsWith('Unnamed:')) return true;
  // Exclude Papa Parse default column names (_1, _2, _3, etc.)
  if (/^_\d+$/.test(s)) return true;
  return false;
}

// Helper: Check if value is non-blank
function nonblank(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return String(v).trim() !== '';
}

// Parse container count matching Colab logic
export function parseContainerCount(x: unknown): number {
  if (x === null || x === undefined) return 0;
  const s = String(x).trim();
  if (!s) return 0;
  const low = s.toLowerCase();
  // blank / NaN / "no" | "n" | "none" | "0" => 0
  if (['no', 'n', 'none', '0'].includes(low)) return 0;
  // "yes" | "si" | "sí" | "s" | "y" | "1" => 1
  if (['yes', 'si', 'sí', 's', 'y', '1'].includes(low)) return 1;
  // integer ≥ 2 => that number
  const n = Number(s.replace(',', '.'));
  // other nonblank text => 1
  return Number.isFinite(n) ? Math.max(0, Math.trunc(n)) : 1;
}

// Service time calculation: 45s first container + 20s each additional
export function serviceSecondsForContainers(n: number): number {
  return 45 + 20 * Math.max(0, Math.round(n) - 1);
}

// Detect schema from headers
export interface DetectedSchema {
  latCol: string;
  lngCol: string;
  wasteCols: string[];
  routeCols: string[];
}

export function detectSchema(headers: string[]): DetectedSchema {
  const latCol = headers[0] || 'lat';
  const lngCol = headers[1] || 'lng';
  const wasteCols = headers.slice(2, 8).filter(h => !headerIsBlank(h));
  const routeCols = headers.slice(8, 18).filter(h => !headerIsBlank(h));
  return { latCol, lngCol, wasteCols, routeCols };
}

// ============ CSV Processing (Dynamic Schema) ============

export interface ProcessInputs {
  file: File;
  selectedWastes: string[];   // Dynamic from CSV headers (multi-select)
  routes: string[];           // Dynamic from CSV headers (multi-select, replaces single route)
  cocheras: { lat: number; lng: number };
  planta: { lat: number; lng: number };
  baseStopTime: number;       // Base time in seconds (configurable)
  timePerAdditionalContainer: number; // Time per additional container in seconds (configurable)
}

export interface ProcessResult {
  summaryLines: string[];
  preview: Array<Record<string, string | number>>;
  stopsCsvBlob: Blob;
  configBlob: Blob;
}

export async function processStep1(inputs: ProcessInputs): Promise<ProcessResult> {
  const { file, selectedWastes, routes, cocheras, planta, baseStopTime, timePerAdditionalContainer } = inputs;

  // Parse CSV
  const parsed = await parseCsv(file);
  if (!parsed.data.length) throw new Error('CSV appears empty.');

  const headers = parsed.meta.fields ?? Object.keys(parsed.data[0] ?? {});
  if (!headers.length) throw new Error('Could not detect headers.');

  // Dynamic schema detection
  const schema = detectSchema(headers);
  const originalRows = parsed.data.length;

  // Optional pass-through columns (try to find them by normalized name)
  const findOptionalCol = (name: string): string | null => {
    const normalizedName = name.toLowerCase();
    for (const h of headers) {
      if (h.toLowerCase() === normalizedName || h.toLowerCase().includes(normalizedName)) {
        return h;
      }
    }
    return null;
  };

  const col_pueblo = findOptionalCol('pueblo');
  const col_municipio = findOptionalCol('municipio');
  const col_fid = findOptionalCol('fid');

  // Filter rows by: total containers > 0 AND belongs to at least one selected route
  const rowsSel: Array<Record<string, any>> = [];
  
  for (const r of parsed.data as any[]) {
    const lat = Number(r[schema.latCol]);
    const lng = Number(r[schema.lngCol]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    // Check if stop belongs to at least one selected route (OR logic)
    let belongsToAnyRoute = false;
    for (const routeCol of routes) {
      if (nonblank(r[routeCol])) {
        belongsToAnyRoute = true;
        break;
      }
    }
    if (!belongsToAnyRoute) continue;

    // Compute total containers across selected waste columns
    let totalContainers = 0;
    for (const wasteCol of selectedWastes) {
      const cellValue = r[wasteCol];
      totalContainers += parseContainerCount(cellValue);
    }

    // Include row if total containers > 0
    if (totalContainers <= 0) continue;

    // Compute service_s using configurable parameters
    const service_s = baseStopTime + timePerAdditionalContainer * Math.max(0, Math.round(totalContainers) - 1);

    const out: Record<string, any> = {
      lat,
      lng,
      service_s,
      w_route: routes.join(','),  // Store all selected routes
      w_wastes: selectedWastes.join(','),
      containers: totalContainers,
    };
    
    // Add optional pass-through columns
    if (col_pueblo && r[col_pueblo]) out.pueblo = r[col_pueblo];
    if (col_municipio && r[col_municipio]) out.municipio = r[col_municipio];
    if (col_fid && r[col_fid]) out.fid = r[col_fid];

    rowsSel.push(out);
  }

  // Build CSV and config blobs
  const csvText = Papa.unparse(rowsSel);
  const stopsBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });

  const config = {
    selected_wastes: selectedWastes,
    selected_routes: routes,  // Multi-select routes array
    base_stop_time: baseStopTime,
    time_per_additional_container: timePerAdditionalContainer,
    counts_rule: `${baseStopTime}s first container +${timePerAdditionalContainer}s each additional container`,
    cocheras,
    planta,
    source_file: file.name,
    rows_total: originalRows,
    rows_selected: rowsSel.length,
  };
  const jsonText = JSON.stringify(config, null, 2);
  const cfgBlob = new Blob([jsonText], { type: 'application/json;charset=utf-8' });

  const summaryLines = [
    '✅ Ingestion complete.',
    `Total rows:     ${originalRows}`,
    `Selected rows:  ${rowsSel.length}  (wastes: [${selectedWastes.join(', ')}], routes: [${routes.join(', ')}])`,
    `Saved stops →   /content/stops_filtered.csv`,
    `Saved config →  /content/ingestion_config.json`,
  ];

  const preview = rowsSel.slice(0, 10);

  return {
    summaryLines,
    preview,
    stopsCsvBlob: stopsBlob,
    configBlob: cfgBlob,
  };
}

function parseCsv(file: File): Promise<Papa.ParseResult<Record<string, any>>> {
  return new Promise((resolve, reject) => {
    Papa.parse<Record<string, any>>(file, {
      header: true,
      skipEmptyLines: 'greedy',
      dynamicTyping: false,
      complete: (res) => resolve(res),
      error: (err) => reject(err),
    });
  });
}
