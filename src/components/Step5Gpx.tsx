import { useState } from 'react';
import { 
  loadGpxData, 
  buildGpxXml, 
  generateFilename, 
  generateTrackName, 
  generateTrackDescription,
  titleArea 
} from '../utils/gpx';
import InlineError from './InlineError';

export default function Step5Gpx() {
  const [isExporting, setIsExporting] = useState(false);
  const [decimation, setDecimation] = useState(1);
  const [log, setLog] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string>('');
  
  const debug = typeof window !== 'undefined' && localStorage.getItem('debug') === '1';

  const addLog = (message: string) => {
    setLog(prev => [...prev, message]);
  };

  const clearLog = () => {
    setLog([]);
    setError(null);
    setSuccessMsg('');
  };

  const downloadFile = (content: string, filename: string) => {
    const blob = new Blob([content], { type: 'application/gpx+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportGpx = async () => {
    clearLog();
    setIsExporting(true);
    
    try {
      addLog('🚀 Starting GPX export...');
      
      // Load data
      const { routingResponse, origin, destination, viaCount, selectedWastes, selectedArea } = await loadGpxData();
      addLog('📂 Loaded routing_response.json and naming config');
      
      // Extract polylines from routing response
      const sections = (routingResponse.raw as any)?.routes?.[0]?.sections ?? [];
      const sectionPolylines = sections
        .filter((section: any) => section.polyline)
        .map((section: any) => section.polyline);
      
      if (sectionPolylines.length === 0) {
        throw new Error('No polylines found in routing_response.json. Re-run Step 3.');
      }
      
      addLog(`✅ Found ${sectionPolylines.length} section polylines`);
      
      // Generate filename and track info
      const filename = generateFilename(selectedWastes, selectedArea);
      const wastePart = selectedWastes.length > 0 ? selectedWastes.join(', ') : 'Ruta';
      const areaPart = titleArea(selectedArea);
      const baseTitle = areaPart ? `${wastePart} Ruta ${areaPart}` : `${wastePart} Ruta`;
      const trackName = generateTrackName(baseTitle);
      const trackDescription = generateTrackDescription(routingResponse.totals, viaCount);
      
      addLog(`📝 Filename: ${filename}`);
      addLog(`🏷️ Track: ${trackName}`);
      
      // Build GPX
      addLog('🔧 Building GPX XML...');
      const gpxXml = await buildGpxXml({
        origin,
        destination,
        sectionPolylines,
        name: trackName,
        description: trackDescription,
        decimateEvery: decimation
      });
      
      // Download
      addLog('💾 Triggering download...');
      downloadFile(gpxXml, filename);
      
      const distance = (routingResponse.totals.length_m / 1000).toFixed(1);
      const duration = (routingResponse.totals.duration_s / 60).toFixed(1);
      
      // Set user-friendly success message
      setSuccessMsg(`GPX exported: ${filename}`);
      console.log('[Step5] GPX exported:', filename, distance, 'km,', duration, 'min');
      
      if (debug) {
        addLog(`✅ GPX exported successfully!`);
        addLog(`📄 ${filename}`);
        addLog(`📏 ${distance} km | ⏱️ ${duration} min | 📍 ${viaCount} vias`);
      }
      
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      console.error('[Step5] Error:', e);
      
      // User-friendly error messages
      if (errorMsg.includes('No polylines')) {
        setError('No polylines found. Please run Routing to generate the route.');
      } else if (errorMsg.includes('routing_response')) {
        setError('No routing data found. Please run Routing first.');
      } else if (errorMsg.includes('ordered_stops')) {
        setError('No stops data found. Please run Sequencing first.');
      } else {
        setError(`GPX export failed: ${errorMsg}`);
      }
      
      if (debug) addLog(`❌ Error: ${errorMsg}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="step5-gpx">
      <div className="step5-controls">
        <div className="options-row">
          <label htmlFor="decimation">Decimation:</label>
          <input
            id="decimation"
            type="number"
            min="1"
            max="100"
            value={decimation}
            onChange={(e) => setDecimation(Math.max(1, parseInt(e.target.value) || 1))}
            disabled={isExporting}
          />
          <span className="decimation-hint">(1 = keep all points)</span>
        </div>
        
        <button
          className="primary"
          onClick={exportGpx}
          disabled={isExporting}
        >
          {isExporting ? 'Exporting...' : '📤 Export GPX'}
        </button>
      </div>

      <InlineError message={error || ''} />
      
      {successMsg && <div className="inline-success">{successMsg}</div>}

      {debug && log.length > 0 && (
        <div className="log-area">
          <h5>Debug Log</h5>
          <pre className="console-log">{log.join('\n')}</pre>
        </div>
      )}
    </div>
  );
}
