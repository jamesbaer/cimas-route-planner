// In-browser emulation of /content outputs from Colab using localStorage

// Download helpers
export function downloadJSON(filename: string, obj: unknown): void {
  const blob = new Blob([JSON.stringify(obj, null, 2)], { type: 'application/json' });
  downloadBlob(filename, blob);
}

export function downloadCSV(filename: string, csvText: string): void {
  const blob = new Blob([csvText], { type: 'text/csv' });
  downloadBlob(filename, blob);
}

export function downloadGPX(filename: string, gpxXml: string): void {
  const blob = new Blob([gpxXml], { type: 'application/gpx+xml' });
  downloadBlob(filename, blob);
}

function downloadBlob(filename: string, blob: Blob): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Pseudo-filesystem implementation using localStorage
const STORAGE_PREFIX = 'cimas_artifact_';

export async function readText(name: string): Promise<string | null> {
  try {
    const key = STORAGE_PREFIX + name;
    return localStorage.getItem(key);
  } catch (e) {
    console.warn(`Failed to read artifact ${name}:`, e);
    return null;
  }
}

export async function writeText(name: string, text: string): Promise<void> {
  try {
    const key = STORAGE_PREFIX + name;
    localStorage.setItem(key, text);
    console.log(`[Artifact] Saved: ${name}`);
  } catch (e) {
    console.warn(`Failed to write artifact ${name}:`, e);
    throw e;
  }
}

export async function readJSON<T = any>(name: string): Promise<T | null> {
  try {
    const text = await readText(name);
    return text ? JSON.parse(text) : null;
  } catch (e) {
    console.warn(`Failed to read JSON artifact ${name}:`, e);
    return null;
  }
}

export async function writeJSON(name: string, data: any): Promise<void> {
  try {
    const text = JSON.stringify(data, null, 2);
    await writeText(name, text);
  } catch (e) {
    console.warn(`Failed to write JSON artifact ${name}:`, e);
    throw e;
  }
}

export async function exists(name: string): Promise<boolean> {
  try {
    const key = STORAGE_PREFIX + name;
    const exists = localStorage.getItem(key) !== null;
    console.log(`[Artifact] Check ${name}: ${exists ? 'EXISTS' : 'MISSING'}`);
    return exists;
  } catch (e) {
    console.warn(`Failed to check if artifact ${name} exists:`, e);
    return false;
  }
}

export async function deleteArtifact(name: string): Promise<void> {
  try {
    const key = STORAGE_PREFIX + name;
    localStorage.removeItem(key);
    console.log(`[Artifact] Deleted: ${name}`);
  } catch (e) {
    console.warn(`Failed to delete artifact ${name}:`, e);
  }
}

// Debug utility to list all artifacts
export function listStoredArtifacts(): string[] {
  const artifacts: string[] = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith(STORAGE_PREFIX)) {
      artifacts.push(key.replace(STORAGE_PREFIX, ''));
    }
  }
  console.log(`[Artifact] Stored: [${artifacts.join(', ')}]`);
  return artifacts;
}

// In-memory artifact store (optional for debugging)
const artifacts: Map<string, unknown> = new Map();

export function saveArtifact(name: string, data: unknown): void {
  artifacts.set(name, data);
  console.log(`[Artifact] Saved: ${name}`);
}

export function getArtifact(name: string): unknown {
  return artifacts.get(name);
}

export function listArtifacts(): string[] {
  return Array.from(artifacts.keys());
}
