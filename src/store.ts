import { create } from 'zustand';
import { setKey as setVaultKey } from './security/keyVault';
import type { OrderedVia, RoutingArtifact, Step4Data } from './types';

export type Waste = "Envases"|"Resto"|"Papel"|"Reutilizables"|"Vidrio"|"Aceite";
export type Zone = "este"|"centro"|"oeste";

// Legacy types for backward compatibility
export type WasteType = 'Envases' | 'Resto' | 'Papel' | 'Reutilizables' | 'Vidrio' | 'Aceite';
export type Lang = "en" | "es";
export type Theme = "light" | "dark";
export type AreaType = 'este' | 'centro' | 'oeste';

export interface InputsState {
  wastes: WasteType[];
  area: AreaType;
  selectedWaste: Waste | null;
  setSelectedWaste: (w: Waste) => void;
  selectedZone: Zone | null;
  setSelectedZone: (z: Zone) => void;
  // Dynamic options from CSV
  availableWastes: string[];
  setAvailableWastes: (w: string[]) => void;
  availableRoutes: string[];
  setAvailableRoutes: (r: string[]) => void;
  selectedWastes: string[];
  setSelectedWastes: (w: string[]) => void;
  selectedRoutes: string[];  // Multi-select routes
  setSelectedRoutes: (r: string[]) => void;
  // Stop time configuration
  baseStopTime: number;     // Base time in seconds (default 45)
  timePerAdditionalContainer: number; // Time per additional container in seconds (default 20)
  setBaseStopTime: (time: number) => void;
  setTimePerAdditionalContainer: (time: number) => void;
  // Existing
  cocheras: { lat: string; lng: string };
  planta: { lat: string; lng: string };
  setWastes: (w: WasteType[]) => void;
  setArea: (a: AreaType) => void;
  setCocheras: (lat: string, lng: string) => void;
  setPlanta: (lat: string, lng: string) => void;
  setApiKey: (key: string) => void; // calls keyVault, doesn't store in state
  uploadedFile?: File;
  setUploadedFile: (f?: File) => void;
  language: Lang;
  setLanguage: (lang: Lang) => void;
  theme: Theme;
  setTheme: (theme: Theme) => void;
  step1Saved: boolean;
  setStep1Saved: (saved: boolean) => void;
}

export interface Step1Artifacts {
  stopsFilteredCsv?: string; // object URL
  ingestionConfigJson?: string; // object URL
  summaryLines: string[];
  preview: Array<Record<string, string | number>>;
}

export interface Step2State {
  orderedPreview: OrderedVia[] | null;
  step2Log: string[];
  isProcessing: boolean;
  setStep2Log: (lines: string[] | ((prev:string[])=>string[])) => void;
  setOrderedPreview: (vias: OrderedVia[] | null) => void;
  setIsProcessing: (processing: boolean) => void;
}

export interface OutputState {
  step1?: Step1Artifacts;
  setStep1: (a?: Step1Artifacts) => void;
}

export const useInputs = create<InputsState>((set) => ({
  wastes: ['Envases'],
  area: 'este',
  selectedWaste: null, // Start with no selection
  selectedZone: null,  // Start with no selection
  // Dynamic options from CSV
  availableWastes: [],
  setAvailableWastes: (w) => set({ availableWastes: w }),
  availableRoutes: [],
  setAvailableRoutes: (r) => set({ availableRoutes: r }),
  selectedWastes: [],
  setSelectedWastes: (w) => set({ selectedWastes: w }),
  selectedRoutes: [],  // Multi-select routes
  setSelectedRoutes: (r) => set({ selectedRoutes: r }),
  // Stop time configuration
  baseStopTime: 45,     // Default 45 seconds
  timePerAdditionalContainer: 20, // Default 20 seconds
  setBaseStopTime: (time) => set({ baseStopTime: time }),
  setTimePerAdditionalContainer: (time) => set({ timePerAdditionalContainer: time }),
  // Existing
  cocheras: { lat: '', lng: '' },
  planta: { lat: '', lng: '' },
  setWastes: (w) => set({ wastes: w }),
  setArea: (a) => set({ area: a }),
  setSelectedWaste: (w) => set({ selectedWaste: w }),
  setSelectedZone: (z) => set({ selectedZone: z, area: z }),
  setCocheras: (lat, lng) => set({ cocheras: { lat, lng } }),
  setPlanta: (lat, lng) => set({ planta: { lat, lng } }),
  setApiKey: (key) => { setVaultKey(key); }, // stores in memory-only vault
  uploadedFile: undefined,
  setUploadedFile: (f) => set({ uploadedFile: f }),
  language: (localStorage.getItem("lang") as Lang) ?? "en",
  setLanguage: (lang) => {
    set({ language: lang });
    try { localStorage.setItem("lang", lang); } catch {}
  },
  theme: (localStorage.getItem("theme") as Theme) ?? "light",
  setTheme: (theme) => {
    set({ theme });
    try { localStorage.setItem("theme", theme); } catch {}
    // apply to <html> immediately
    const root = document.documentElement;
    if (theme === "dark") root.classList.add("dark");
    else root.classList.remove("dark");
  },
  step1Saved: false,
  setStep1Saved: (saved) => set({ step1Saved: saved }),
}));

export const useStep2 = create<Step2State>((set) => ({
  orderedPreview: null,
  step2Log: [],
  isProcessing: false,
  setStep2Log: (lines) => set((state) => ({
    step2Log: typeof lines === 'function' ? lines(state.step2Log) : lines
  })),
  setOrderedPreview: (vias) => set({ orderedPreview: vias }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
}));

export interface Step3State {
  routingArtifact?: RoutingArtifact;
  step3Log: string[];
  isRunningStep3: boolean;
  setStep3Log: (lines: string[] | ((prev:string[])=>string[])) => void;
  setRoutingArtifact: (artifact?: RoutingArtifact) => void;
  setIsRunningStep3: (running: boolean) => void;
  runStep3: () => Promise<void>;
}

export interface Step5State {
  isExporting: boolean;
  setIsExporting: (exporting: boolean) => void;
}

export const useStep3 = create<Step3State>((set) => ({
  routingArtifact: undefined,
  step3Log: [],
  isRunningStep3: false,
  setStep3Log: (lines) => set((state) => ({
    step3Log: typeof lines === 'function' ? lines(state.step3Log) : lines
  })),
  setRoutingArtifact: (artifact) => set({ routingArtifact: artifact }),
  setIsRunningStep3: (running) => set({ isRunningStep3: running }),
  runStep3: async () => {
    // This will be implemented in the component
    // For now, just a placeholder
    set({ isRunningStep3: true, step3Log: ['🚀 Starting Step 3...'] });
    setTimeout(() => set({ isRunningStep3: false }), 1000);
  }
}));

export interface Step4State {
  step4Data?: Step4Data;
  step4Log: string[];
  isRenderingStep4: boolean;
  setStep4Log: (lines: string[] | ((prev:string[])=>string[])) => void;
  setStep4Data: (data?: Step4Data) => void;
  setIsRenderingStep4: (rendering: boolean) => void;
  runStep4Render: () => Promise<void>;
}

export const useStep4 = create<Step4State>((set) => ({
  step4Data: undefined,
  step4Log: [],
  isRenderingStep4: false,
  setStep4Log: (lines) => set((state) => ({
    step4Log: typeof lines === 'function' ? lines(state.step4Log) : lines
  })),
  setStep4Data: (data) => set({ step4Data: data }),
  setIsRenderingStep4: (rendering) => set({ isRenderingStep4: rendering }),
  runStep4Render: async () => {
    set({ isRenderingStep4: true, step4Log: [] });
    const log: string[] = [];
    
    try {
      log.push('🚀 Starting map render...');
      set({ step4Log: log });

      // Import here to avoid circular dependencies
      const { exists, readJSON } = await import('./utils/artifacts');
      
      // Check if ordered_stops exists
      const hasOrderedStops = await exists('ordered_stops.json');
      
      if (!hasOrderedStops) {
        throw new Error('Run Step 2 (Sequencing) first.');
      }

      // Load ordered stops
      const orderedStops = await readJSON('ordered_stops.json');
      if (!orderedStops) throw new Error('Failed to read ordered_stops.json');

      const { origin, destination, vias } = orderedStops.routing_inputs;
      
      // Check if routing response exists (optional - might not exist yet after Step 2)
      const hasRoutingResponse = await exists('routing_response.json');
      
      let sections: any[] = [];
      let totals: any = { length_m: 0, duration_s: 0 };
      
      if (hasRoutingResponse) {
        log.push('📂 Loading routing_response.json...');
        const routingResponse = await readJSON('routing_response.json');
        
        if (routingResponse) {
          sections = (routingResponse.raw as any)?.routes?.[0]?.sections ?? [];
          totals = routingResponse.totals;
          log.push(`✅ Loaded: vias=${vias.length}, sections=${sections.length}`);
        }
      } else {
        log.push('ℹ️ No routing data yet (run Step 3 to add polylines)');
        log.push(`✅ Loaded: vias=${vias.length}`);
      }
      
      console.log(`📊 Loaded ${sections.length} sections with ${vias.length} vias`);

      // Prepare Step4Data
      const step4Data = {
        origin,
        destination,
        vias: vias.map((via: any) => ({
          lat: via.lat,
          lng: via.lng,
          service_s: via.service_s,
          sequence: via.sequence,
          id: via.id
        })),
        sections: sections.map((section: any) => ({
          polyline: section.polyline
        })),
        totals
      };

      log.push('🧭 Centering and fitting bounds...');
      set({ step4Data, step4Log: log });

      const sortedVias = [...vias].sort((a, b) => a.sequence - b.sequence);
      
      if (sections.length > 0) {
        log.push(`🗺️ Rendered map with ${sections.length} polylines and ${sortedVias.length} numbered stops.`);
      } else {
        log.push(`🗺️ Rendered map with ${sortedVias.length} numbered stops (no polylines yet).`);
      }

      set({ step4Log: log });

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      log.push(`❌ Error: ${errorMsg}`);
      set({ step4Log: log });
    } finally {
      set({ isRenderingStep4: false });
    }
  }
}));

export const useStep5 = create<Step5State>((set) => ({
  isExporting: false,
  setIsExporting: (exporting) => set({ isExporting: exporting }),
}));

export const useOutput = create<OutputState>((set) => ({
  step1: undefined,
  setStep1: (a) => set({ step1: a }),
}));
