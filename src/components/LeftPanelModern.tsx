import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Upload, Route, Map, FileDown } from 'lucide-react';
import { useInputs, useOutput, useStep2, useStep3, type WasteType, type AreaType } from '../store';
import { processStep1 } from '../utils/csv';
import { writeText, writeJSON } from '../utils/artifacts';
import Step2Wps from './Step2Wps';
import Step3Routing from './Step3Routing';
import Step5Gpx from './Step5Gpx';
import '../tailwind.css';

const WASTE_OPTIONS: WasteType[] = ['Envases','Resto','Papel','Reutilizables','Vidrio','Aceite'];
const AREA_OPTIONS: AreaType[] = ['este','centro','oeste'];

// Inputs Card Component
function InputsCard() {
  const {
    wastes, area, cocheras, planta, apiKey,
    setWastes, setArea, setCocheras, setPlanta, setApiKey,
    uploadedFile, setUploadedFile
  } = useInputs();

  const setStep1 = useOutput((s) => s.setStep1);

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setUploadedFile(f);
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
    if (!wastes.length) { setErr('Select at least one waste type.'); return; }

    setBusy(true);
    try {
      const res = await processStep1({
        file: uploadedFile,
        selectedWastes: wastes,
        area,
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
    } catch (e: any) {
      setErr(e?.message ?? String(e));
      setStep1(undefined);
    } finally {
      setBusy(false);
    }
  };

  const toggleWaste = (waste: WasteType) => {
    const newWastes = wastes.includes(waste) 
      ? wastes.filter(w => w !== waste)
      : [...wastes, waste];
    setWastes(newWastes);
  };

  return (
    <Card className="rounded-2xl shadow-sm h-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Inputs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* CSV Upload */}
        <div className="space-y-2">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Upload className="w-4 h-4" />
            CSV file
          </Label>
          <Input type="file" accept=".csv,text/csv" onChange={onFile} />
          {uploadedFile && <p className="text-sm text-muted-foreground">Selected: {uploadedFile.name}</p>}
        </div>

        {/* Waste Types */}
        <div>
          <div className="text-sm font-medium mb-2">Waste Types</div>
          <div className="grid grid-cols-3 gap-2">
            {WASTE_OPTIONS.map(waste => (
              <Button
                key={waste}
                variant={wastes.includes(waste) ? "secondary" : "outline"}
                size="sm"
                onClick={() => toggleWaste(waste)}
                className="text-xs"
              >
                {waste}
              </Button>
            ))}
          </div>
        </div>

        {/* Area Selection */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Area</Label>
          <div className="flex gap-2">
            {AREA_OPTIONS.map(opt => (
              <Button
                key={opt}
                variant={area === opt ? "secondary" : "outline"}
                size="sm"
                onClick={() => setArea(opt)}
                className="text-xs"
              >
                {opt}
              </Button>
            ))}
          </div>
        </div>

        {/* Coordinates */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cocheras Lat</Label>
              <Input 
                type="number" 
                step="any"
                value={cocheras.lat} 
                onChange={(e) => setCocheras(e.target.value, cocheras.lng)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Cocheras Lng</Label>
              <Input 
                type="number" 
                step="any"
                value={cocheras.lng} 
                onChange={(e) => setCocheras(cocheras.lat, e.target.value)}
                className="text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Planta Lat</Label>
              <Input 
                type="number" 
                step="any"
                value={planta.lat} 
                onChange={(e) => setPlanta(e.target.value, planta.lng)}
                className="text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Planta Lng</Label>
              <Input 
                type="number" 
                step="any"
                value={planta.lng} 
                onChange={(e) => setPlanta(planta.lat, e.target.value)}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* API Key */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">HERE API Key</Label>
          <Input 
            type="password" 
            value={apiKey} 
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="Enter your HERE API key"
            className="text-sm"
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
          className="w-full"
          size="sm"
        >
          {busy ? 'Processing...' : 'Process & Save'}
        </Button>
      </CardContent>
    </Card>
  );
}

// Actions Card Component
function ActionsCard() {
  const step2 = useStep2();
  const step3 = useStep3();

  // Check if steps are enabled based on current state
  const isSequencingEnabled = true; // Always enabled after Step 1
  const isRoutingEnabled = step2?.orderedPreview !== null;
  const isExportEnabled = step3?.routingArtifact !== null;

  return (
    <Card className="rounded-2xl shadow-sm h-fit">
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Actions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Sequencing Button */}
        <Button 
          size="lg"
          className="w-full h-14 justify-start gap-2"
          disabled={!isSequencingEnabled}
          onClick={() => {
            // Step 2 logic is handled by the Step2Wps component
            // The button serves as a visual trigger
          }}
        >
          <Route className="w-5 h-5" /> Sequencing (WPS)
        </Button>

        {/* Routing Button */}
        <Button 
          size="lg"
          className="w-full h-14 justify-start gap-2"
          disabled={!isRoutingEnabled}
          onClick={() => {
            // Step 3 logic is handled by the Step3Routing component
            // The button serves as a visual trigger
          }}
        >
          <Map className="w-5 h-5" /> Routing
        </Button>

        {/* Export GPX Button */}
        <Button 
          size="lg"
          variant="secondary"
          className="w-full h-14 justify-start gap-2"
          disabled={!isExportEnabled}
          onClick={() => {
            // Step 5 logic is handled by the Step5Gpx component
            // The button serves as a visual trigger
          }}
        >
          <FileDown className="w-5 h-5" /> Export GPX
        </Button>
      </CardContent>
    </Card>
  );
}

// Main export component that renders both cards
export default function LeftPanelModern() {
  return (
    <>
      <InputsCard />
      <ActionsCard />
      {/* Hidden components to handle the actual business logic */}
      <div className="hidden">
        <Step2Wps />
        <Step3Routing />
        <Step5Gpx />
      </div>
    </>
  );
}
