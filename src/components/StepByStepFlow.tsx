import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import { getKey as getVaultKey, clearKey as clearVaultKey } from '../security/keyVault';
import { useInputs } from '../store';
// import type { Waste, Zone } from '../store'; // Legacy types, not used in dynamic mode
import { useOutput } from '../store';
import { processStep1, detectSchema } from '../utils/csv';
import Papa from 'papaparse';
import { writeText, writeJSON } from '../utils/artifacts';
import Step2Wps from './Step2Wps';
import Step3Routing from './Step3Routing';
import Step5Gpx from './Step5Gpx';
import { cn } from '../lib/utils';
import { useT } from '../i18n';
import { OptionPill } from './inputs/OptionPill';

// Legacy hard-coded options (kept for backward compatibility)
// const wastes: Waste[] = ["Envases","Resto","Papel","Reutilizables","Vidrio","Aceite"];
// const zones: Zone[] = ["este","centro","oeste"];

// Capitalize zone names for display (legacy - not used in dynamic mode)
// const getZoneDisplayName = (zone: Zone, t: (key: any) => string) => {
//   const translated = t(zone as any);
//   return translated.charAt(0).toUpperCase() + translated.slice(1);
// };

type StepData = {
  id: number;
  title: string;
  description: string;
  isValid: boolean;
  isCompleted: boolean;
};

export default function StepByStepFlow() {
  const {
    // Legacy (not used in dynamic mode)
    // selectedWaste, selectedZone, setSelectedWaste, setSelectedZone,
    cocheras, planta, setCocheras, setPlanta, setApiKey,
    // Dynamic options
    availableWastes, setAvailableWastes, availableRoutes, setAvailableRoutes,
    selectedWastes, setSelectedWastes, selectedRoutes, setSelectedRoutes,
    uploadedFile, setUploadedFile, language, step1Saved, setStep1Saved
  } = useInputs();
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [showApiKey, setShowApiKey] = useState(false);

  const setStep1 = useOutput((s: any) => s.setStep1);
  const t = useT(language);

  const [currentStep, setCurrentStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [autoAdvanceEnabled, setAutoAdvanceEnabled] = useState(true);
  const [userInteracted, setUserInteracted] = useState({
    csv: false,
    waste: false,
    zone: false,
    depot: false,
    plant: false,
    apiKey: false
  });

  // Sync input with vault on mount
  useEffect(() => {
    const vaultKey = getVaultKey();
    if (vaultKey) {
      setApiKeyInput(vaultKey);
    }
  }, []);

  // Validation functions for each step (requires user interaction)
  const validateStep = (stepIndex: number): boolean => {
    switch (stepIndex) {
      case 0: // CSV Upload
        return !!uploadedFile && userInteracted.csv;
      case 1: // Waste Type (dynamic multi-select)
        return selectedWastes.length > 0 && userInteracted.waste;
      case 2: // Routes (dynamic multi-select)
        return selectedRoutes.length > 0 && userInteracted.zone;
      case 3: // Depot Coordinates
        const coLat = Number(cocheras.lat);
        const coLng = Number(cocheras.lng);
        return Number.isFinite(coLat) && Number.isFinite(coLng) && 
               coLat >= -90 && coLat <= 90 && coLng >= -180 && coLng <= 180 &&
               userInteracted.depot;
      case 4: // Treatment Plant Coordinates
        const plLat = Number(planta.lat);
        const plLng = Number(planta.lng);
        return Number.isFinite(plLat) && Number.isFinite(plLng) && 
               plLat >= -90 && plLat <= 90 && plLng >= -180 && plLng <= 180 &&
               userInteracted.plant;
      case 5: // API Key
        const key = getVaultKey();
        return !!key && key.trim().length > 0 && userInteracted.apiKey;
      default:
        return false;
    }
  };

  // Clear inputs on component mount
  useEffect(() => {
    setUploadedFile(undefined);
    setAvailableWastes([]);
    setAvailableRoutes([]);
    setSelectedWastes([]);
    setSelectedRoutes([]);
    setCocheras('', '');
    setPlanta('', '');
    setApiKey('');
    setStep1Saved(false);
    setUploadSuccess(false);
    // Reset step to 0 and user interaction tracking
    setCurrentStep(0);
    setAutoAdvanceEnabled(true);
    setUserInteracted({
      csv: false,
      waste: false, // No default selection, user must interact
      zone: false,  // No default selection, user must interact
      depot: false,
      plant: false,
      apiKey: false
    });
  }, []);

  // Auto-advance when current step becomes valid (only if autoAdvanceEnabled)
  // Skip auto-advance for waste types (step 1) and zones (step 2) to give users control
  useEffect(() => {
    if (!autoAdvanceEnabled) return;
    
    // Don't auto-advance for waste types (step 1) and zones (step 2)
    if (currentStep === 1 || currentStep === 2) return;
    
    const isCurrentStepValid = validateStep(currentStep);
    if (isCurrentStepValid && currentStep < 5) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 800); // Small delay for better UX
      return () => clearTimeout(timer);
    }
  }, [currentStep, uploadedFile, selectedWastes, selectedRoutes, cocheras, planta, autoAdvanceEnabled]);

  // Auto-focus first input when advancing to text input steps
  useEffect(() => {
    const focusTimer = setTimeout(() => {
      if (currentStep === 3) {
        // Focus first coordinate input (depot latitude)
        const latInput = document.querySelector('input[placeholder*="40.4168"]') as HTMLInputElement;
        if (latInput) latInput.focus();
      } else if (currentStep === 4) {
        // Focus first coordinate input (plant latitude)
        const latInput = document.querySelector('input[placeholder*="40.4168"]') as HTMLInputElement;
        if (latInput) latInput.focus();
      } else if (currentStep === 5) {
        // Focus API key input
        const apiInput = document.querySelector('input[placeholder*="HERE API key"]') as HTMLInputElement;
        if (apiInput) apiInput.focus();
      }
    }, 100); // Small delay to ensure DOM is updated

    return () => clearTimeout(focusTimer);
  }, [currentStep]);

  const steps: StepData[] = [
    {
      id: 0,
      title: t("csvFile"),
      description: "",
      isValid: validateStep(0),
      isCompleted: validateStep(0) && currentStep > 0
    },
    {
      id: 1,
      title: t("wasteTypes"),
      description: "",
      isValid: validateStep(1),
      isCompleted: validateStep(1) && currentStep > 1
    },
    {
      id: 2,
      title: t("zone"),
      description: "",
      isValid: validateStep(2),
      isCompleted: validateStep(2) && currentStep > 2
    },
    {
      id: 3,
      title: language === 'es' ? 'Coordenadas de Cocheras' : `${t("cocheras")} Coordinates`,
      description: "",
      isValid: validateStep(3),
      isCompleted: validateStep(3) && currentStep > 3
    },
    {
      id: 4,
      title: language === 'es' ? 'Coordenadas de la Planta' : `${t("planta")} Coordinates`,
      description: "",
      isValid: validateStep(4),
      isCompleted: validateStep(4) && currentStep > 4
    },
    {
      id: 5,
      title: t("hereKey"),
      description: "",
      isValid: validateStep(5),
      isCompleted: validateStep(5)
    }
  ];

  const canGoNext = currentStep < 5;
  const canGoPrev = currentStep > 0;
  const allStepsValid = steps.every(step => step.isValid);

  // Handle Enter key navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        const isCurrentStepValid = validateStep(currentStep);
        if (isCurrentStepValid && canGoNext) {
          handleNext();
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [currentStep, canGoNext]);

  const handleNext = () => {
    if (canGoNext) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    if (canGoPrev) {
      setAutoAdvanceEnabled(false); // Disable auto-advance when user manually navigates back
      setCurrentStep(prev => prev - 1);
    }
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setUploadedFile(f);
    setUploadSuccess(!!f);
    setStep1Saved(false);
    setUserInteracted(prev => ({ ...prev, csv: true }));
    
    // Detect schema from CSV headers
    if (f) {
      try {
        Papa.parse(f, {
          header: true,
          preview: 1, // Only read first row to get headers
          complete: (results) => {
            const headers = results.meta.fields || [];
            const schema = detectSchema(headers);
            setAvailableWastes(schema.wasteCols);
            setAvailableRoutes(schema.routeCols);
            // Reset selections when new file is uploaded
            setSelectedWastes([]);
            setSelectedRoutes([]);
          },
          error: (error) => {
            console.error('Failed to parse CSV for schema detection:', error);
          }
        });
      } catch (error) {
        console.error('Failed to detect schema:', error);
      }
    }
  };

  // Dynamic waste selection (multi-select)
  const onWasteToggle = (waste: string) => {
    const newSelection = selectedWastes.includes(waste)
      ? selectedWastes.filter(w => w !== waste)
      : [...selectedWastes, waste];
    setSelectedWastes(newSelection);
    setStep1Saved(false);
    setUserInteracted(prev => ({ ...prev, waste: true }));
  };

  // Dynamic route selection (multi-select)
  const onRouteToggle = (route: string) => {
    const newSelection = selectedRoutes.includes(route)
      ? selectedRoutes.filter(r => r !== route)
      : [...selectedRoutes, route];
    setSelectedRoutes(newSelection);
    setStep1Saved(false);
    setUserInteracted(prev => ({ ...prev, zone: true }));
  };

  // Legacy handlers (kept for compatibility but not used in dynamic mode)
  // const onWasteSelect = (waste: string) => {
  //   setSelectedWaste(waste as Waste);
  //   setStep1Saved(false);
  //   setUserInteracted(prev => ({ ...prev, waste: true }));
  // };

  // const onZoneSelect = (zone: string) => {
  //   setSelectedZone(zone as Zone);
  //   setStep1Saved(false);
  //   setUserInteracted(prev => ({ ...prev, zone: true }));
  // };

  const onCoordinatesChange = (field: 'cocheras' | 'planta', coord: 'lat' | 'lng', value: string) => {
    if (field === 'cocheras') {
      setCocheras(coord === 'lat' ? value : cocheras.lat, coord === 'lng' ? value : cocheras.lng);
      // Only mark as interacted when both coordinates are provided
      const newLat = coord === 'lat' ? value : cocheras.lat;
      const newLng = coord === 'lng' ? value : cocheras.lng;
      if (newLat && newLng) {
        setUserInteracted(prev => ({ ...prev, depot: true }));
      }
    } else {
      setPlanta(coord === 'lat' ? value : planta.lat, coord === 'lng' ? value : planta.lng);
      // Only mark as interacted when both coordinates are provided
      const newLat = coord === 'lat' ? value : planta.lat;
      const newLng = coord === 'lng' ? value : planta.lng;
      if (newLat && newLng) {
        setUserInteracted(prev => ({ ...prev, plant: true }));
      }
    }
    setStep1Saved(false);
  };

  const onApiKeyChange = (value: string) => {
    setApiKeyInput(value);
    setApiKey(value); // Sets in vault
    setStep1Saved(false);
    setUserInteracted(prev => ({ ...prev, apiKey: true }));
  };

  const handleClearKey = () => {
    clearVaultKey();
    setApiKeyInput('');
    setStep1Saved(false);
    setUserInteracted(prev => ({ ...prev, apiKey: false }));
  };

  const runStep1 = async () => {
    setErr(null);
    if (!allStepsValid) {
      setErr('Please complete all steps before processing.');
      return;
    }

    setBusy(true);
    try {
      const res = await processStep1({
        file: uploadedFile!,
        selectedWastes: selectedWastes,
        routes: selectedRoutes,  // Multi-select routes
        cocheras: { lat: Number(cocheras.lat), lng: Number(cocheras.lng) },
        planta: { lat: Number(planta.lat), lng: Number(planta.lng) },
      });

      const csvText = await res.stopsCsvBlob.text();
      const jsonText = await res.configBlob.text();
      await writeText('stops_filtered.csv', csvText);
      await writeJSON('ingestion_config.json', JSON.parse(jsonText));
      
      res.summaryLines.push('💾 Artifacts saved to pseudo-filesystem for Step 2');

      const stopsUrl = URL.createObjectURL(res.stopsCsvBlob);
      const cfgUrl = URL.createObjectURL(res.configBlob);

      setStep1({
        summaryLines: res.summaryLines,
        preview: res.preview,
        stopsFilteredCsv: stopsUrl,
        ingestionConfigJson: cfgUrl,
      });
      
      setStep1Saved(true);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStep1(undefined);
    } finally {
      setBusy(false);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0: // CSV Upload
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <input 
                type="file" 
                accept=".csv,text/csv" 
                onChange={onFile}
                className={cn(
                  "input-surface w-full rounded-md border border-border bg-input text-foreground",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:border-primary",
                  uploadSuccess && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                )}
              />
            </div>
          </div>
        );

      case 1: // Waste Type (Dynamic Multi-Select)
        return (
          <div>
            {availableWastes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableWastes.map(waste => (
                  <OptionPill
                    key={waste}
                    selected={selectedWastes.includes(waste)}
                    onClick={() => onWasteToggle(waste)}
                    className={cn(
                      selectedWastes.includes(waste) && userInteracted.waste && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                    )}
                  >
                    {waste}
                  </OptionPill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a CSV file to see available waste types</p>
            )}
          </div>
        );

      case 2: // Routes (Dynamic Multi-Select)
        return (
          <div className="space-y-4">
            {availableRoutes.length > 0 ? (
              <div className="grid grid-cols-3 gap-2">
                {availableRoutes.map(route => (
                  <OptionPill
                    key={route}
                    selected={selectedRoutes.includes(route)}
                    onClick={() => onRouteToggle(route)}
                    className={cn(
                      selectedRoutes.includes(route) && userInteracted.zone && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                    )}
                  >
                    {route.charAt(0).toUpperCase() + route.slice(1)}
                  </OptionPill>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Upload a CSV file to see available routes</p>
            )}
          </div>
        );

      case 3: // Depot Coordinates
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("cocherasLat")}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 40.4168"
                  value={cocheras.lat}
                  onChange={(e) => onCoordinatesChange('cocheras', 'lat', e.target.value)}
                  className={cn(
                    validateStep(3) && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                  )}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("cocherasLng")}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. -3.7038"
                  value={cocheras.lng}
                  onChange={(e) => onCoordinatesChange('cocheras', 'lng', e.target.value)}
                  className={cn(
                    validateStep(3) && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 4: // Treatment Plant Coordinates
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">{t("plantaLat")}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. 40.4168"
                  value={planta.lat}
                  onChange={(e) => onCoordinatesChange('planta', 'lat', e.target.value)}
                  className={cn(
                    validateStep(4) && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                  )}
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">{t("plantaLng")}</Label>
                <Input
                  type="number"
                  step="any"
                  placeholder="e.g. -3.7038"
                  value={planta.lng}
                  onChange={(e) => onCoordinatesChange('planta', 'lng', e.target.value)}
                  className={cn(
                    validateStep(4) && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700"
                  )}
                />
              </div>
            </div>
          </div>
        );

      case 5: // API Key
        return (
          <div>
            <Label>{t("hereKey")}</Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showApiKey ? "text" : "password"}
                  placeholder={t("enterHereKey")}
                  value={apiKeyInput}
                  onChange={(e) => onApiKeyChange(e.target.value)}
                  autoComplete="off"
                  inputMode="text"
                  spellCheck={false}
                  className={cn(
                    validateStep(5) && "bg-green-50 dark:bg-green-900/30 border-green-300 dark:border-green-700",
                    "pr-8"
                  )}
                />
                {apiKeyInput && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0"
                    onClick={() => setShowApiKey(!showApiKey)}
                    aria-label={showApiKey ? "Hide key" : "Show key"}
                  >
                    <span className="text-xs">{showApiKey ? "👁" : "👁️‍🗨️"}</span>
                  </Button>
                )}
              </div>
              {apiKeyInput && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleClearKey}
                  className="h-10"
                  aria-label="Clear key"
                >
                  <X className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <>
      <Card className="relative flex flex-col rounded-2xl overflow-hidden h-[265px] shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center justify-between">
            <span>{t("inputs")}</span>
            <div className="flex gap-1">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className={cn(
                    "w-2 h-2 rounded-full transition-colors",
                    index <= currentStep ? "bg-green-500" : "border border-muted bg-transparent"
                  )}
                />
              ))}
            </div>
          </CardTitle>
        </CardHeader>
        
        {/* Scrollable content area */}
        <CardContent className="flex-1 min-h-0 overflow-y-auto pt-2 pb-16 space-y-4 px-6">
          {/* Step Progress */}
          <div>
            <h3 className="font-medium text-lg">{steps[currentStep].title}</h3>
          </div>

          {/* Step Content */}
          <div>
            {renderStepContent()}
          </div>

          {/* Error Display */}
          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
              {err}
            </div>
          )}
        </CardContent>

        {/* Sticky pager footer */}
        <CardFooter className="sticky bottom-0 inset-x-0 h-12 md:h-14 bg-card z-10 px-4 flex items-center justify-between gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={handlePrev}
            disabled={!canGoPrev}
            aria-label="Previous"
            className="h-9 w-9 shrink-0"
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>

          <div className="text-sm md:text-base font-medium tabular-nums">
            {currentStep + 1} / {steps.length}
          </div>

          {allStepsValid ? (
            <Button 
              onClick={runStep1} 
              disabled={busy}
              className={cn(
                "shrink-0 transition-colors",
                "border border-border hover:border-foreground/40",
                step1Saved && "border-2 border-primary ring-1 ring-primary/30"
              )}
              size="sm"
              variant="outline"
              data-selected={step1Saved ? "true" : "false"}
            >
              {busy ? (language === 'es' ? 'Procesando...' : 'Processing...') : (step1Saved ? (language === 'es' ? '✓ Guardado' : '✓ Saved') : t("processSave"))}
            </Button>
          ) : (
            <Button
              variant="ghost"
              size="icon"
              onClick={handleNext}
              disabled={!canGoNext}
              aria-label="Next"
              className="h-9 w-9 shrink-0"
            >
              <ChevronRight className="h-5 w-5" />
            </Button>
          )}
        </CardFooter>
      </Card>
      {/* Hidden components to handle the actual business logic */}
      <div className="hidden">
        <Step2Wps />
        <Step3Routing />
        <Step5Gpx />
      </div>
    </>
  );
}
