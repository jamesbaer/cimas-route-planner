// localStorage persistence utilities

const API_KEY_STORAGE_KEY = 'cimas_here_api_key';
const PREFS_STORAGE_KEY = 'cimas_ui_prefs';

export function saveApiKey(key: string): void {
  try {
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
  } catch (e) {
    console.warn('Failed to save API key to localStorage:', e);
  }
}

export function loadApiKey(): string {
  try {
    return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
  } catch (e) {
    console.warn('Failed to load API key from localStorage:', e);
    return '';
  }
}

export function clearApiKey(): void {
  try {
    localStorage.removeItem(API_KEY_STORAGE_KEY);
  } catch (e) {
    console.warn('Failed to clear API key from localStorage:', e);
  }
}

export interface UIPrefs {
  snapRadius?: number;
  avoidFeatures?: string[];
  vehicleParams?: Record<string, string>;
}

export function saveUIPrefs(prefs: UIPrefs): void {
  try {
    localStorage.setItem(PREFS_STORAGE_KEY, JSON.stringify(prefs));
  } catch (e) {
    console.warn('Failed to save UI prefs to localStorage:', e);
  }
}

export function loadUIPrefs(): UIPrefs {
  try {
    const data = localStorage.getItem(PREFS_STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (e) {
    console.warn('Failed to load UI prefs from localStorage:', e);
    return {};
  }
}
