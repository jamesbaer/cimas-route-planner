import { useState } from 'react';
import { useInputs, useOutput, type WasteType, type AreaType } from '../store';
import { processStep1 } from '../utils/csv';
import { writeText, writeJSON } from '../utils/artifacts';
import Step2Wps from './Step2Wps';
import Step3Routing from './Step3Routing';
import Step5Gpx from './Step5Gpx';

const WASTE_OPTIONS: WasteType[] = ['Envases','Resto','Papel','Reutilizables','Vidrio','Aceite'];
const AREA_OPTIONS: AreaType[] = ['este','centro','oeste'];

export default function LeftPanel() {
  const [inputCollapsed, setInputCollapsed] = useState(false);
  const [sequencingCollapsed, setSequencingCollapsed] = useState(true);
  const [routingCollapsed, setRoutingCollapsed] = useState(true);
  const [gpxCollapsed, setGpxCollapsed] = useState(true);
  
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

  return (
    <aside className="left-panel">
      {/* Section 1: Input */}
      <div className="step-section">
        <button 
          className="collapsible"
          onClick={() => setInputCollapsed(!inputCollapsed)}
        >
          <span>{inputCollapsed ? '▶' : '▼'}</span>
          Input
        </button>
        {!inputCollapsed && (
          <div className="collapsible-content">
            <label className="field">
              <span>CSV file</span>
              <input type="file" accept=".csv,text/csv" onChange={onFile} />
              {uploadedFile && <small>Selected: {uploadedFile.name}</small>}
            </label>

            <fieldset className="field">
              <legend>Waste types</legend>
              <div className="chips">
                {WASTE_OPTIONS.map((w) => {
                  const on = wastes.includes(w);
                  return (
                    <button
                      key={w}
                      type="button"
                      className={`chip ${on ? 'on' : ''}`}
                      aria-pressed={on}
                      onClick={() => {
                        if (on) setWastes(wastes.filter(x => x !== w));
                        else setWastes([...wastes, w]);
                      }}
                    >
                      {w}
                    </button>
                  );
                })}
              </div>
            </fieldset>

            <label className="field">
              <span>Area</span>
              <select value={area} onChange={(e) => setArea(e.target.value as AreaType)}>
                {AREA_OPTIONS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </label>

            <fieldset className="field">
              <legend>Cocheras</legend>
              <div className="row">
                <input type="number" step="any" placeholder="lat" value={cocheras.lat}
                       onChange={(e) => setCocheras(e.target.value, cocheras.lng)} />
                <input type="number" step="any" placeholder="lng" value={cocheras.lng}
                       onChange={(e) => setCocheras(cocheras.lat, e.target.value)} />
              </div>
            </fieldset>

            <fieldset className="field">
              <legend>Planta</legend>
              <div className="row">
                <input type="number" step="any" placeholder="lat" value={planta.lat}
                       onChange={(e) => setPlanta(e.target.value, planta.lng)} />
                <input type="number" step="any" placeholder="lng" value={planta.lng}
                       onChange={(e) => setPlanta(planta.lat, e.target.value)} />
              </div>
            </fieldset>

            <label className="field">
              <span>HERE API Key</span>
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your HERE API key"
              />
            </label>

            {err && <div className="error">{err}</div>}

            <button className="primary" onClick={runStep1} disabled={busy}>
              {busy ? 'Processing…' : 'Process & Save'}
            </button>
          </div>
        )}
      </div>

      {/* Section 2: Sequencing */}
      <div className="step-section">
        <button 
          className="collapsible"
          onClick={() => setSequencingCollapsed(!sequencingCollapsed)}
        >
          <span>{sequencingCollapsed ? '▶' : '▼'}</span>
          Sequencing
        </button>
        {!sequencingCollapsed && (
          <div className="collapsible-content">
            <Step2Wps />
          </div>
        )}
      </div>

      {/* Section 3: Routing */}
      <div className="step-section">
        <button 
          className="collapsible"
          onClick={() => setRoutingCollapsed(!routingCollapsed)}
        >
          <span>{routingCollapsed ? '▶' : '▼'}</span>
          Routing
        </button>
        {!routingCollapsed && (
          <div className="collapsible-content">
            <Step3Routing />
          </div>
        )}
      </div>

      {/* Section 4: GPX Export */}
      <div className="step-section">
        <button 
          className="collapsible"
          onClick={() => setGpxCollapsed(!gpxCollapsed)}
        >
          <span>{gpxCollapsed ? '▶' : '▼'}</span>
          GPX Export
        </button>
        {!gpxCollapsed && (
          <div className="collapsible-content">
            <Step5Gpx />
          </div>
        )}
      </div>
    </aside>
  );
}
