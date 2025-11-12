import { useState } from 'react';
import Papa from 'papaparse';
import { useStep2, useInputs, useStep4 } from '../store';
import { buildWpsUrl } from '../utils/here';
import { readText, readJSON, writeJSON, exists, listStoredArtifacts, deleteArtifact } from '../utils/artifacts';
import { sanitizeStops, type ViaStop } from '../utils/here';
import type { IngestionConfig, StopRow, OrderedVia, OrderedStopsArtifact } from '../types';
import InlineError from './InlineError';

export default function Step2Wps() {
  const { orderedPreview, step2Log, setStep2Log, setOrderedPreview } = useStep2();
  const { apiKey } = useInputs();
  const { runStep4Render } = useStep4();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  const debug = typeof window !== 'undefined' && localStorage.getItem('debug') === '1';

  const runStep2 = async () => {
    setError(null);
    setSuccessMsg('');
    setBusy(true);
    const log: string[] = [];

    try {
      // Check API key from Inputs store
      if (!apiKey.trim()) {
        throw new Error('Please enter a HERE API key in the Input section.');
      }

      // Clear old routing data (from previous run) to prevent showing stale polylines
      const hasOldRouting = await exists('routing_response.json');
      if (hasOldRouting) {
        await deleteArtifact('routing_response.json');
        log.push('🗑️ Cleared old routing data');
        setStep2Log(log);
      }

      // Global error boundary for Step 2
      console.log('🐛 DEBUG: Starting Step 2 with error boundary');
      
      // Wrap entire Step 2 in try-catch with stack trace logging
      try {
      // Check if Step 1 artifacts exist
      log.push('🔍 Checking localStorage for artifacts...');
      const storedArtifacts = listStoredArtifacts();
      log.push(`📦 Found artifacts: [${storedArtifacts.join(', ')}]`);
      
      const hasStops = await exists('stops_filtered.csv');
      const hasConfig = await exists('ingestion_config.json');
      
      log.push(`🔍 Artifact check: stops_filtered.csv exists=${hasStops}, ingestion_config.json exists=${hasConfig}`);
      
      if (!hasStops || !hasConfig) {
        const missing = [];
        if (!hasStops) missing.push('stops_filtered.csv');
        if (!hasConfig) missing.push('ingestion_config.json');
        throw new Error(`Run Step 1 first. Missing artifacts: ${missing.join(', ')}`);
      }

      // Read stops CSV
      log.push('📂 Loading stops_filtered.csv...');
      const stopsCsv = await readText('stops_filtered.csv');
      if (!stopsCsv) throw new Error('Failed to read stops_filtered.csv');

      const parsed = Papa.parse<StopRow>(stopsCsv, {
        header: true,
        skipEmptyLines: 'greedy',
        dynamicTyping: false,
      });

      if (!parsed.data.length) throw new Error('No stops found in CSV');

      // Convert to ViaStop format and sanitize
      const rawStops: ViaStop[] = parsed.data.map((row, i) => ({
        id: row.fid ? String(row.fid) : String(i + 1),
        lat: Number(row.lat),
        lng: Number(row.lng),
        service_s: Number(row.service_s)
      }));

      const validStops = sanitizeStops(rawStops);
      log.push(`✅ Loaded ${parsed.data.length} raw stops, ${validStops.length} valid after sanitization.`);

      // Read ingestion config
      log.push('📂 Loading ingestion_config.json...');
      const config = await readJSON<IngestionConfig>('ingestion_config.json');
      if (!config) throw new Error('Failed to read ingestion_config.json');

      log.push(`✅ Config loaded: wastes [${config.selected_wastes.join(', ')}], area=${config.selected_area}`);

      // Build WPS URL
      log.push('🔗 Building WPS request...');
      const { url, improveFor, mode, departure } = buildWpsUrl({
        cocheras: config.cocheras,
        planta: config.planta,
        stops: validStops.map(s => ({ ...s, _wp_id: s.id })),
        apiKey: apiKey.trim(),
        stepLog: (msg: string) => log.push(msg)
      });

      log.push(`📏 GET URL length: ${url.length.toLocaleString()}`);
      
      // Debug: log destination parameters
      const urlObj = new URL(url);
      const destParams = Array.from(urlObj.searchParams.keys())
        .filter(k => k.startsWith('destination'))
        .sort();
      log.push(`🔍 Destination params: [${destParams.join(', ')}]`);
      
      log.push(`🚀 Calling WPS API...`);

      // Call WPS API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(url, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        log.push(`❌ HTTP ${response.status}`);
        log.push(`📄 Error response: ${errorText}`);
        
        // If we get the 400 error, log all destination parameters for debugging
        if (response.status === 400 && errorText.includes('Bad destination parameter numbering')) {
          log.push(`🐛 DEBUG: All destination parameters:`);
          destParams.forEach(key => {
            const value = urlObj.searchParams.get(key);
            log.push(`  ${key}=${value}`);
          });
        }
        
        throw new Error(`WPS API error (${response.status}): ${errorText}`);
      }

      log.push(`✅ HTTP 200`);
      const wpsRaw = await response.json();

      // Parse WPS response with defensive parsing
      console.log('🐛 DEBUG: WPS response structure:', wpsRaw);
      
      const results = wpsRaw?.results ?? [];
      if (!Array.isArray(results) || results.length === 0) {
        throw new Error('WPS returned no results');
      }

      // Get waypoints from first result
      const waypoints = results[0]?.waypoints ?? [];
      if (!Array.isArray(waypoints) || waypoints.length === 0) {
        throw new Error('WPS: missing waypoints in response');
      }

      console.log('🐛 DEBUG: Processing waypoints:', waypoints.length);

      // Sort by sequence and filter out start/end
      const orderedVias: OrderedVia[] = waypoints
        .filter((r: any) => {
          const id = r?.id ?? '';
          return id !== 'Cocheras' && id !== 'Planta' && typeof id === 'string';
        })
        .map((r: any) => {
          const rawId = r?.id ?? '';
          console.log('🐛 DEBUG: Processing waypoint ID:', rawId);
          const stopId = (rawId ?? '').replace('stop', '');
          const stop = validStops.find(s => s.id === stopId);
          if (!stop) {
            throw new Error(`Stop ${stopId} not found in sanitized data`);
          }
          return {
            id: stopId,
            lat: stop.lat,
            lng: stop.lng,
            service_s: stop.service_s,
            sequence: r?.sequence ?? 0,
          };
        })
        .sort((a, b) => a.sequence - b.sequence);

      log.push(`📍 Ordered vias: ${orderedVias.length}`);

      // Build ordered stops artifact
      const orderedStops: OrderedStopsArtifact = {
        wps_raw: wpsRaw,
        routing_inputs: {
          origin: config.cocheras,
          destination: config.planta,
          vias: orderedVias,
        },
        meta: {
          selected_wastes: config.selected_wastes,
          selected_area: config.selected_area,
          departure,
          mode,
          improveFor,
        },
      };

      // Save artifact
      await writeJSON('ordered_stops.json', orderedStops);
      log.push('💾 Saved → /content/ordered_stops.json');

      // Update store
      setOrderedPreview(orderedVias.slice(0, 10));
      if (debug) setStep2Log(log);

      // Auto-update map with numbered stops
      log.push('🗺️  Auto-rendering stops on map...');
      if (debug) setStep2Log(log);
      await runStep4Render();
      
      // Set user-friendly success message
      setSuccessMsg(`Sequencing complete. ${orderedVias.length} stops ordered.`);
      console.log('[Step2] Success:', orderedVias.length, 'stops ordered');
      
      } catch (innerError: any) {
        console.error('🐛 DEBUG: Inner Step 2 error with stack:', innerError);
        const errorMsg = innerError?.message || String(innerError);
        const stackTrace = innerError?.stack || 'No stack trace available';
        log.push(`❌ Inner Error: ${errorMsg}`);
        log.push(`🐛 Stack: ${stackTrace}`);
        throw innerError;
      }

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[Step2] Error:', e);
      
      // User-friendly error messages
      if (errorMsg.includes('API key')) {
        setError('Please enter your HERE API key in the Input section.');
      } else if (errorMsg.includes('Step 1')) {
        setError('Missing required data. Please run Input section first.');
      } else if (errorMsg.includes('destination')) {
        setError('WPS rejected destinations. Try re-running Input, or reduce stop count.');
      } else {
        setError(`Sequencing failed: ${errorMsg}`);
      }
      
      log.push(`❌ Error: ${errorMsg}`);
      if (debug) setStep2Log(log);
    } finally {
      setBusy(false);
    }
  };

  const downloadOrderedStops = async () => {
    try {
      const data = await readJSON('ordered_stops.json');
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'ordered_stops.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Failed to download ordered_stops.json:', e);
    }
  };

  return (
    <div className="step2-wps">
      <button
        className="primary"
        onClick={runStep2}
        disabled={busy || !apiKey.trim()}
      >
        {busy ? 'Processing…' : 'Run Sequencing'}
      </button>

      <InlineError message={error || ''} />
      
      {successMsg && <div className="inline-success">{successMsg}</div>}

      {debug && step2Log.length > 0 && (
        <div className="log-area">
          <h5>Debug Log</h5>
          <pre className="console-log">{step2Log.join('\n')}</pre>
        </div>
      )}

      {debug && orderedPreview && orderedPreview.length > 0 && (
        <div className="preview-area">
          <h5>Preview (first 10)</h5>
          <div className="console-table">
            <table>
              <thead>
                <tr>
                  <th>sequence</th>
                  <th>id</th>
                  <th>lat</th>
                  <th>lng</th>
                  <th>service_s</th>
                </tr>
              </thead>
              <tbody>
                {orderedPreview.map((via, i) => (
                  <tr key={i}>
                    <td>{via.sequence}</td>
                    <td>{via.id}</td>
                    <td>{via.lat}</td>
                    <td>{via.lng}</td>
                    <td>{via.service_s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button className="btn" onClick={downloadOrderedStops}>
            ⬇️ Download ordered_stops.json
          </button>
        </div>
      )}
    </div>
  );
}
