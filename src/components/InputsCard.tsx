import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload } from 'lucide-react';
import { useInputs } from '../store';
import type { Waste, Zone } from '../store';
import { useOutput } from '../store';
import { processStep1 } from '../utils/csv';
import { writeText, writeJSON } from '../utils/artifacts';
import Step2Wps from './Step2Wps';
import Step3Routing from './Step3Routing';
import Step5Gpx from './Step5Gpx';
import { cn } from '../lib/utils';
import { useT } from '../i18n';
import { OptionPill } from './inputs/OptionPill';
import '../tailwind.css';

const wastes: Waste[] = ["Envases","Resto","Papel","Reutilizables","Vidrio","Aceite"];
const zones: Zone[] = ["este","centro","oeste"];


export default function InputsCard() {
  const {
    selectedWaste, selectedZone, cocheras, planta, apiKey,
    setSelectedWaste, setSelectedZone, setCocheras, setPlanta, setApiKey,
    uploadedFile, setUploadedFile, language, step1Saved, setStep1Saved
  } = useInputs();

  const setStep1 = useOutput((s: any) => s.setStep1);
  const t = useT(language);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);

  
  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setUploadedFile(f);
    setUploadSuccess(!!f);
    setStep1Saved(false); // Reset step1Saved when new file uploaded
  };

  const onWasteSelect = (waste: string) => {
    setSelectedWaste(waste as Waste);
    setStep1Saved(false); // Reset step1Saved when inputs change
  };

  const onZoneSelect = (zone: string) => {
    setSelectedZone(zone as Zone);
    setStep1Saved(false); // Reset step1Saved when inputs change
  };

  const onCoordinatesChange = (field: 'cocheras' | 'planta', coord: 'lat' | 'lng', value: string) => {
    if (field === 'cocheras') {
      setCocheras(coord === 'lat' ? value : cocheras.lat, coord === 'lng' ? value : cocheras.lng);
    } else {
      setPlanta(coord === 'lat' ? value : planta.lat, coord === 'lng' ? value : planta.lng);
    }
    
    setStep1Saved(false); // Reset step1Saved when inputs change
  };

  const onApiKeyChange = (value: string) => {
    setApiKey(value);
    setStep1Saved(false); // Reset step1Saved when inputs change
  };

  const runStep1 = async () => {
    setErr(null);
    if (!uploadedFile) { setErr('Please upload a CSV first.'); return; }
    const coLat = Number(cocheras.lat), coLng = Number(cocheras.lng);
    const plLat = Number(planta.lat), plLng = Number(planta.lng);
    if (!Number.isFinite(coLat) || !Number.isFinite(coLng) || !Number.isFinite(plLat) || !Number.isFinite(plLng)) {
      setErr('Please enter numeric lat/lng for Cocheras and Planta.');
      return;
    }
    if (!selectedWaste) { setErr('Select a waste type.'); return; }
    if (!selectedZone) { setErr('Select a zone.'); return; }

    setBusy(true);
    try {
      const res = await processStep1({
        file: uploadedFile,
        selectedWastes: [selectedWaste],
        area: selectedZone,
        cocheras: { lat: coLat, lng: coLng },
        planta: { lat: plLat, lng: plLng },
      });

      // Save artifacts to pseudo-filesystem for Step 2
      const csvText = await res.stopsCsvBlob.text();
      const jsonText = await res.configBlob.text();
      await writeText('stops_filtered.csv', csvText);
      await writeJSON('ingestion_config.json', JSON.parse(jsonText));
      
      // Update summary to show artifacts were saved
      res.summaryLines.push('💾 Artifacts saved to pseudo-filesystem for Step 2');

      // Create object URLs for downloads
      const stopsUrl = URL.createObjectURL(res.stopsCsvBlob);
      const cfgUrl = URL.createObjectURL(res.configBlob);

      setStep1({
        summaryLines: res.summaryLines,
        preview: res.preview,
        stopsFilteredCsv: stopsUrl,
        ingestionConfigJson: cfgUrl,
      });
      
      // Set success state
      setStep1Saved(true);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStep1(undefined);
    } finally {
      setBusy(false);
    }
  };

  
  return (
    <>
      <Card className="rounded-2xl">
        <CardHeader>
          <CardTitle>{t("inputs")}</CardTitle>
        </CardHeader>
      <CardContent className="space-y-4">
        {/* CSV Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4" />
            {t("csvFile")}
          </Label>
          <input 
            type="file" 
            accept=".csv,text/csv" 
            onChange={onFile}
            className={cn(
              "input-surface",
              "w-full rounded-md border border-border bg-background text-foreground",
              "focus-visible:ring-2 focus-visible:ring-[hsl(var(--cimas-accent))] focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              uploadSuccess ? "border-[hsl(var(--cimas-accent))] bg-[hsl(var(--cimas-accent))/0.08]" : ""
            )}
          />
        </div>

        {/* Waste Types */}
        <div>
          <div className="text-sm font-medium mb-2">{t("wasteTypes")}</div>
          <div className="grid grid-cols-3 gap-2">
            {wastes.map(w => {
              const wasteKey = w.toLowerCase() as "envases" | "resto" | "papel" | "reutilizables" | "vidrio" | "aceite";
              return (
                <OptionPill
                  key={w}
                  selected={selectedWaste === w}
                  onClick={() => onWasteSelect(w)}
                >
                  {t(wasteKey)}
                </OptionPill>
              );
            })}
          </div>
        </div>

        {/* Area Selection */}
        <h3 className="text-sm font-medium text-muted-foreground mt-4 mb-1">{t("zone")}</h3>
        <div className="flex flex-wrap gap-2" role="group" aria-label="Zone">
          {zones.map(z => {
              const zoneKey = z as "este" | "centro" | "oeste";
              return (
                <OptionPill
                  key={z}
                  selected={selectedZone === z}
                  onClick={() => onZoneSelect(z)}
                >
                  {t(zoneKey)}
                </OptionPill>
              );
            })}
        </div>

        {/* Coordinates */}
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("cocherasLat")}</Label>
            <Input 
              type="number" 
              step="any"
              value={cocheras.lat} 
              onChange={(e) => onCoordinatesChange('cocheras', 'lat', e.target.value)}
              data-valid={Number.isFinite(parseFloat(String(cocheras.lat)))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("cocherasLng")}</Label>
            <Input 
              type="number" 
              step="any"
              value={cocheras.lng} 
              onChange={(e) => onCoordinatesChange('cocheras', 'lng', e.target.value)}
              data-valid={Number.isFinite(parseFloat(String(cocheras.lng)))}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("plantaLat")}</Label>
            <Input 
              type="number" 
              step="any"
              value={planta.lat} 
              onChange={(e) => onCoordinatesChange('planta', 'lat', e.target.value)}
              data-valid={Number.isFinite(parseFloat(String(planta.lat)))}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium">{t("plantaLng")}</Label>
            <Input 
              type="number" 
              step="any"
              value={planta.lng} 
              onChange={(e) => onCoordinatesChange('planta', 'lng', e.target.value)}
              data-valid={Number.isFinite(parseFloat(String(planta.lng)))}
            />
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">{t("hereKey")}</Label>
          <Input 
            type="password" 
            value={apiKey} 
            onChange={(e) => onApiKeyChange(e.target.value)}
            placeholder={t("enterHereKey")}
            data-valid={Boolean(apiKey?.trim())}
          />
        </div>

        {/* Error Display */}
        {err && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
            {err}
          </div>
        )}

        {/* Process Button */}
        <Button 
          onClick={runStep1} 
          disabled={busy || !uploadedFile}
          className={cn(
            "w-full transition-colors",
            "border border-border hover:border-foreground/40",
            step1Saved && "border-2 border-primary ring-1 ring-primary/30"
          )}
          size="lg"
          variant="outline"
          data-selected={step1Saved ? "true" : "false"}
        >
          {busy ? 'Processing...' : (step1Saved ? '✓ Processed & Saved' : t("processSave"))}
        </Button>
      </CardContent>
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
