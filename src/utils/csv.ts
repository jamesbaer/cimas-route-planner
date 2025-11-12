import Papa from 'papaparse';

// Utilities mirror the Colab cell

function unidecodeLite(s: string): string {
  // basic accent strip for our header matching needs
  return s.normalize('NFD').replace(/\p{Diacritic}/gu, '');
}

function norm(s: string): string {
  s = unidecodeLite(String(s)).toLowerCase().trim();
  s = s.replace(/[^a-z0-9]+/g, ' ');
  return s.replace(/\s+/g, ' ').trim();
}

function findCol(headers: string[], want: string, required = true): string | null {
  const wantN = norm(want);
  for (const h of headers) {
    if (norm(h) === wantN) return h;
  }
  if (required) {
    const list = headers.join('\n- ');
    throw new Error(`Missing required column: "${want}".\nFound columns:\n- ${list}`);
  }
  return null;
}

function asBoolSi(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return String(v).trim().toLowerCase() === 'si';
}

function nonblank(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  return String(v).trim() !== '';
}

function serviceSecondsForContainers(n: unknown): number {
  const num = Number(n);
  const count = Number.isFinite(num) ? Math.round(num) : 1;
  const c = Math.max(1, count);
  return 45 + 20 * (c - 1);
}

export type Waste = 'Envases'|'Resto'|'Papel'|'Reutilizables'|'Vidrio'|'Aceite';
export type Area = 'este'|'centro'|'oeste';

export interface ProcessInputs {
  file: File;
  selectedWastes: Waste[];
  area: Area;
  cocheras: { lat: number; lng: number };
  planta: { lat: number; lng: number };
}

export interface ProcessResult {
  summaryLines: string[];
  preview: Array<Record<string, string | number>>;
  stopsCsvBlob: Blob;
  configBlob: Blob;
}

export async function processStep1(inputs: ProcessInputs): Promise<ProcessResult> {
  const { file, selectedWastes, area, cocheras, planta } = inputs;

  const parsed = await parseCsv(file);
  if (!parsed.data.length) throw new Error('CSV appears empty.');

  const headers = parsed.meta.fields ?? Object.keys(parsed.data[0] ?? {});
  if (!headers.length) throw new Error('Could not detect headers.');

  // Column resolution (robust to accents/hyphens/spacing)
  const col_lat    = findCol(headers, 'lat')!;
  const col_lng    = findCol(headers, 'long') ?? findCol(headers, 'lng') ?? findCol(headers, 'lon')!;
  const col_env    = findCol(headers, 'Envase final')!;
  const col_res    = findCol(headers, 'Resto final')!;
  const col_pap    = findCol(headers, 'Papel final')!;
  const col_reu    = findCol(headers, 'Reutilizables final')!;
  const col_vid    = findCol(headers, 'Vidrio final')!;
  const col_ace    = findCol(headers, 'Aceite final')!;
  const col_este   = findCol(headers, 'Orden recogida resto (este)')!;
  const col_centro = findCol(headers, 'Orden recogida resto (centro)')!;
  const col_oeste  = findCol(headers, 'Orden recogida resto (oeste)')!;
  const col_cont_resto = findCol(headers, 'Propuesta cantidad contenedores resto', false);
  const col_cont_env   = findCol(headers, 'Propuesta cantidad contenedores envases', false);
  const col_cont_papel = findCol(headers, 'Propuesta cantidad contenedores papel carton', false);
  const col_pueblo     = findCol(headers, 'PUEBLO', false);
  const col_municipio  = findCol(headers, 'MUNICIPIO', false);
  const col_fid        = findCol(headers, 'fid', false);

  const originalRows = parsed.data.length;

  // Map selection -> column flag
  const wasteFlagMap: Record<Waste, (row: any) => boolean> = {
    Envases: (r) => asBoolSi(r[col_env]),
    Resto: (r) => asBoolSi(r[col_res]),
    Papel: (r) => asBoolSi(r[col_pap]),
    Reutilizables: (r) => asBoolSi(r[col_reu]),
    Vidrio: (r) => asBoolSi(r[col_vid]),
    Aceite: (r) => asBoolSi(r[col_ace]),
  };

  const areaColMap: Record<Area, (row: any) => boolean> = {
    este:   (r) => nonblank(r[col_este]),
    centro: (r) => nonblank(r[col_centro]),
    oeste:  (r) => nonblank(r[col_oeste]),
  };

  // Filter + compute service_s
  const rowsSel: Array<Record<string, any>> = [];
  for (const r of parsed.data as any[]) {
    const lat = Number(r[col_lat]);
    const lng = Number(r[col_lng]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const wasteOk = selectedWastes.some((w) => wasteFlagMap[w](r));
    if (!wasteOk) continue;

    if (!areaColMap[area](r)) continue;

    const containersFor = (wt: Waste): number => {
      if (wt === 'Envases' && col_cont_env) return Number(r[col_cont_env] ?? 1);
      if (wt === 'Papel' && col_cont_papel) return Number(r[col_cont_papel] ?? 1);
      if (wt === 'Resto' && col_cont_resto) return Number(r[col_cont_resto] ?? 1);
      return 1;
    };

    let service = 0;
    for (const wt of selectedWastes) {
      if (wasteFlagMap[wt](r)) service += serviceSecondsForContainers(containersFor(wt));
    }
    service = Math.max(45, service);

    const out: Record<string, any> = {
      lat,
      lng,
      service_s: service,
      w_area: area,
      w_wastes: selectedWastes.join(','),
    };
    if (col_pueblo) out.pueblo = r[col_pueblo];
    if (col_municipio) out.municipio = r[col_municipio];
    if (col_fid) out.fid = r[col_fid];

    rowsSel.push(out);
  }

  // Build CSV and config blobs
  const csvText = Papa.unparse(rowsSel);
  const stopsBlob = new Blob([csvText], { type: 'text/csv;charset=utf-8' });

  const config = {
    selected_wastes: selectedWastes,
    selected_area: area,
    counts_rule: '45s first container +20s each additional (per selected waste)',
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
    `Selected rows:  ${rowsSel.length}  (wastes ANY of [${selectedWastes.join(', ')}], area=${area})`,
    `Saved stops →   /content/stops_filtered.csv` ,
    `Saved config →  /content/ingestion_config.json` ,
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
