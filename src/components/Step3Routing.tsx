import { useState } from 'react';
import { useStep3, useStep4 } from '../store';
import { getKey as getVaultKey } from '../security/keyVault';
import { safeConsole, scrubUrl } from '../security/safeConsole';
import { buildRouterGetUrlStep3, parseRoutingResponse } from '../utils/here';
import { readJSON, writeJSON, exists } from '../utils/artifacts';
import type { OrderedStopsArtifact, RoutingConfig } from '../types';
import InlineError from './InlineError';

export default function Step3Routing() {
  const { 
    routingArtifact, 
    step3Log, 
    isRunningStep3, 
    setStep3Log, 
    setRoutingArtifact, 
    setIsRunningStep3 
  } = useStep3();
  const { runStep4Render } = useStep4();
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  const debug = typeof window !== 'undefined' && localStorage.getItem('debug') === '1';

  const runStep3 = async () => {
    setError(null);
    setSuccessMsg('');
    // Clear previous routing artifact immediately to refresh the Route info card
    setRoutingArtifact(undefined);
    setIsRunningStep3(true);
    const log: string[] = [];

    try {
      // Check if Step 2 artifacts exist and API key is available
      const hasOrderedStops = await exists('ordered_stops.json');
      
      if (!hasOrderedStops) {
        throw new Error('Run Step 2 first.');
      }
      
      const apiKey = getVaultKey();
      if (!apiKey?.trim()) {
        throw new Error('HERE API key not found. Please enter a HERE API key.');
      }

      // Load ordered stops from Step 2
      log.push('📂 Loading ordered_stops.json...');
      const orderedStops = await readJSON<OrderedStopsArtifact>('ordered_stops.json');
      if (!orderedStops) {
        throw new Error('Failed to read ordered_stops.json');
      }

      const { origin, destination, vias } = orderedStops.routing_inputs;
      log.push(`✅ Loaded routing inputs → origin + ${vias.length} vias + destination`);

      // Default routing config (matching Colab)
      const config: RoutingConfig = {
        transportMode: 'truck',
        return: 'polyline,summary',
        spans: 'notices',
        departureTime: 'any',
        stopDurationFallbackS: 90,
        allowUturns: true,
        avoidDifficultTurns: false,
        useRadiusInsteadOfSnap: false,
        snapOrRadiusValue: 30,
        shapingBefore: {},
        lightTruckMode: false,
        vehicleProfile: {},
        avoidFeatures: ['dirtRoad']
      };

      // Build avoid features based on config
      const avoidFeatures = ['dirtRoad'];
      if (!config.allowUturns) avoidFeatures.push('uTurns');
      if (config.avoidDifficultTurns) avoidFeatures.push('difficultTurns');
      config.avoidFeatures = avoidFeatures;

      log.push('🔧 Building Router v8 GET...');
      
      const { url } = buildRouterGetUrlStep3({
        origin,
        destination,
        vias,
        config,
        apiKey: apiKey.trim(),
        stepLog: (msg: string) => log.push(msg)
      });

      log.push(`🔗 URL: ${scrubUrl(url)}`);
      log.push('🚀 Calling Router v8...');
      setStep3Log(log);
      safeConsole.log('Routing Request URL:', url);

      // Call Router API with timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000);

      const response = await fetch(url, {
        method: 'GET',
        signal: controller.signal,
        referrerPolicy: 'no-referrer',
        cache: 'no-store',
        mode: 'cors',
        credentials: 'omit',
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        log.push(`❌ HTTP ${response.status}`);
        log.push(`📄 Error response: ${errorText}`);
        throw new Error(`Router API error (${response.status}): ${errorText}`);
      }

      log.push(`✅ HTTP ${response.status}`);
      const routerRaw = await response.json();

      // Parse routing response
      const routingArtifact = parseRoutingResponse(routerRaw, config, origin, destination, vias.length);
      
      const { totals } = routingArtifact;
      const km = (totals.length_m / 1000).toFixed(1);
      const min = Math.round(totals.duration_s / 60);
      log.push(`== Routing summary ==`);
      log.push(`Sections: ${routerRaw.routes?.[0]?.sections?.length ?? 0} | Vias: ${vias.length} | Total: ${km} km / ${min} min`);

      // Save artifact
      await writeJSON('routing_response.json', routingArtifact);
      log.push('💾 Saved → /content/routing_response.json');

      // Check for notices
      if (routingArtifact.section_notices.length > 0) {
        log.push('⚠️ Notices present (see artifact)');
      }

      // Update store
      setRoutingArtifact(routingArtifact);
      if (debug) setStep3Log(log);

      // Auto-update map with polylines
      log.push('🗺️  Auto-rendering polylines on map...');
      if (debug) setStep3Log(log);
      await runStep4Render();
      
      // Set user-friendly success message
      setSuccessMsg(`Routing complete. ${km} km, ${min} min.`);
      console.log('[Step3] Success:', km, 'km,', min, 'min');

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[Step3] Error:', e);
      
      // User-friendly error messages
      if (errorMsg.includes('Step 2')) {
        setError('Missing sequencing data. Please run Sequencing first.');
      } else if (errorMsg.includes('snap') || errorMsg.includes('radius')) {
        setError('Routing failed. Try lowering snap radius or toggling U-turns.');
      } else if (errorMsg.includes('API key')) {
        setError('Please enter your HERE API key in the Input section.');
      } else {
        setError(`Routing failed: ${errorMsg}`);
      }
      
      setStep3Log(log);
    } finally {
      setIsRunningStep3(false);
    }
  };

  const downloadRoutingResponse = async () => {
    try {
      const data = await readJSON('routing_response.json');
      if (data) {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'routing_response.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e) {
      console.error('Failed to download routing_response.json:', e);
    }
  };

  return (
    <div className="step3-panel">
      <button
        data-step3-trigger
        className="primary"
        onClick={runStep3}
        disabled={isRunningStep3}
      >
        {isRunningStep3 ? 'Processing…' : 'Run Routing'}
      </button>

      <InlineError message={error || ''} />
      
      {successMsg && <div className="inline-success">{successMsg}</div>}

      {debug && step3Log.length > 0 && (
        <div className="log-area">
          <h5>Debug Log</h5>
          <pre className="console-log">{step3Log.join('\n')}</pre>
        </div>
      )}

      {debug && routingArtifact && (
        <div className="preview-area">
          <h5>Routing Summary</h5>
          <div className="routing-summary">
            <div>Vias: {routingArtifact.via_count}</div>
            <div>Distance: {(routingArtifact.totals.length_m / 1000).toFixed(1)} km</div>
            <div>Duration: {Math.round(routingArtifact.totals.duration_s / 60)} min</div>
            <div>Sections: {routingArtifact.section_polylines.length}</div>
            {routingArtifact.section_notices.length > 0 && (
              <div>Notices: {routingArtifact.section_notices.length} sections</div>
            )}
          </div>
          <button className="btn" onClick={downloadRoutingResponse}>
            ⬇️ Download routing_response.json
          </button>
        </div>
      )}
    </div>
  );
}
