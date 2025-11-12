import { useState } from 'react';
import { useStep4 } from '../store';
import { readJSON, exists } from '../utils/artifacts';
import type { RoutingArtifact, OrderedStopsArtifact } from '../types';

export default function Step4MapDebug() {
  const { step4Log, setStep4Log, setIsRenderingStep4 } = useStep4();
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const testLoad = async () => {
    setError(null);
    setIsRenderingStep4(true);
    const log: string[] = [];

    try {
      log.push('🔍 Testing artifact loading...');
      
      // Check if artifacts exist
      const hasRoutingResponse = await exists('routing_response.json');
      const hasOrderedStops = await exists('ordered_stops.json');
      
      log.push(`routing_response.json exists: ${hasRoutingResponse}`);
      log.push(`ordered_stops.json exists: ${hasOrderedStops}`);
      
      if (!hasRoutingResponse || !hasOrderedStops) {
        throw new Error('Run Step 2 and Step 3 first.');
      }

      // Load artifacts
      log.push('📂 Loading artifacts...');
      
      const [routingResponse, orderedStops] = await Promise.all([
        readJSON<RoutingArtifact>('routing_response.json'),
        readJSON<OrderedStopsArtifact>('ordered_stops.json')
      ]);

      log.push(`routingResponse loaded: ${!!routingResponse}`);
      log.push(`orderedStops loaded: ${!!orderedStops}`);

      if (!routingResponse) throw new Error('Failed to read routing_response.json');
      if (!orderedStops) throw new Error('Failed to read ordered_stops.json');

      // Debug info
      const debug = {
        routingResponse: {
          hasTotals: !!routingResponse.totals,
          totals: routingResponse.totals,
          hasRaw: !!routingResponse.raw,
          rawType: typeof routingResponse.raw,
          rawKeys: routingResponse.raw ? Object.keys(routingResponse.raw) : [],
          sectionPolylines: routingResponse.section_polylines?.length || 0
        },
        orderedStops: {
          hasRoutingInputs: !!orderedStops.routing_inputs,
          viaCount: orderedStops.routing_inputs?.vias?.length || 0,
          origin: orderedStops.routing_inputs?.origin,
          destination: orderedStops.routing_inputs?.destination
        }
      };

      setDebugInfo(debug);
      log.push('📊 Debug info collected');
      log.push(`Raw response type: ${debug.routingResponse.rawType}`);
      log.push(`Raw response keys: ${debug.routingResponse.rawKeys.join(', ')}`);

      setStep4Log(log);

    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      setError(errorMsg);
      log.push(`❌ Error: ${errorMsg}`);
      setStep4Log(log);
    } finally {
      setIsRenderingStep4(false);
    }
  };

  return (
    <div className="step4-panel">
      <h4>Step 4 — Debug</h4>
      
      <button className="primary" onClick={testLoad}>
        Test Artifact Loading
      </button>

      {error && <div className="error">Error: {error}</div>}

      {step4Log.length > 0 && (
        <div className="log-area">
          <h5>Log</h5>
          <pre className="console-log">{step4Log.join('\n')}</pre>
        </div>
      )}

      {debugInfo && (
        <div className="debug-info">
          <h5>Debug Info</h5>
          <pre style={{ fontSize: '12px', background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
