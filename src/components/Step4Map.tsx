import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import { decode } from '@here/flexpolyline';
import { useStep4 } from '../store';
import { readJSON, exists } from '../utils/artifacts';
import { exportStaticHtml, fmtHms } from '../utils/mapExport';
import type { RoutingArtifact, OrderedStopsArtifact, Step4Data } from '../types';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default icon issue
try {
  delete (L.Icon.Default.prototype as any)._getIconUrl;
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
  });
} catch (e) {
  console.warn('Leaflet icon setup failed:', e);
}

function MapBounds({ data }: { data: Step4Data }) {
  const map = useMap();
  
  useEffect(() => {
    console.log('🗺️ MapBounds: Fitting bounds to route');
    
    const allCoords: [number, number][] = [];
    
    // Add decoded polyline coordinates
    data.sections.forEach((section, index) => {
      if (section.polyline) {
        try {
          // decode() returns {polyline: [[lat, lng, alt?], ...]}
          const decoded = decode(section.polyline);
          const coords = decoded.polyline.map((point: any) => [point[0], point[1]] as [number, number]);
          console.log(`✅ Section ${index}: decoded ${coords.length} points`);
          allCoords.push(...coords);
        } catch (e) {
          console.warn(`❌ Failed to decode section ${index}:`, e);
        }
      }
    });
    
    // Add origin and destination
    allCoords.push([data.origin.lat, data.origin.lng]);
    allCoords.push([data.destination.lat, data.destination.lng]);
    
    // Add via coordinates
    data.vias.forEach((via) => {
      allCoords.push([via.lat, via.lng]);
    });
    
    console.log(`📍 Total coordinates: ${allCoords.length}`);
    
    if (allCoords.length > 0) {
      const bounds = new LatLngBounds(allCoords);
      map.fitBounds(bounds, { padding: [50, 50] });
      console.log('✅ Bounds fitted successfully');
    }
  }, [map, data]);
  
  return null;
}

function createNumberedIcon(number: number) {
  return L.divIcon({
    html: `<div style="background: #2196F3; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${number}</div>`,
    iconSize: [24, 24],
    className: ''
  });
}

function createOriginIcon() {
  return L.divIcon({
    html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">▶</div>',
    iconSize: [20, 20],
    className: ''
  });
}

function createDestinationIcon() {
  return L.divIcon({
    html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏁</div>',
    iconSize: [20, 20],
    className: ''
  });
}

function fmtServiceTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function Step4Map() {
  const { 
    step4Data, 
    step4Log, 
    isRenderingStep4, 
    setStep4Log, 
    setStep4Data, 
    setIsRenderingStep4 
  } = useStep4();
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<any>(null);

  const runStep4Render = async () => {
    setError(null);
    setIsRenderingStep4(true);
    const log: string[] = [];

    try {
      // Check if artifacts exist
      const hasRoutingResponse = await exists('routing_response.json');
      const hasOrderedStops = await exists('ordered_stops.json');
      
      if (!hasRoutingResponse || !hasOrderedStops) {
        throw new Error('Run Step 2 and Step 3 first.');
      }

      // Load artifacts
      log.push('📂 Loading routing_response.json & ordered_stops.json...');
      
      const [routingResponse, orderedStops] = await Promise.all([
        readJSON<RoutingArtifact>('routing_response.json'),
        readJSON<OrderedStopsArtifact>('ordered_stops.json')
      ]);

      if (!routingResponse) throw new Error('Failed to read routing_response.json');
      if (!orderedStops) throw new Error('Failed to read ordered_stops.json');

      const { origin, destination, vias } = orderedStops.routing_inputs;
      // Access sections from raw.routes[0].sections
      const sections = (routingResponse.raw as any)?.routes?.[0]?.sections ?? [];
      const totals = routingResponse.totals;
      
      console.log(`📊 Loaded ${sections.length} sections with ${vias.length} vias`);
      
      log.push(`✅ Loaded: vias=${vias.length}, sections=${sections.length}`);

      // Prepare Step4Data
      const step4Data: Step4Data = {
        origin,
        destination,
        vias: vias.map(via => ({
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

      console.log('📊 Step4Data prepared:', {
        origin: step4Data.origin,
        destination: step4Data.destination,
        viaCount: step4Data.vias.length,
        sectionCount: step4Data.sections.length,
        polylineCount: step4Data.sections.filter(s => !!s.polyline).length
      });

      log.push('🧭 Centering and fitting bounds...');
      setStep4Data(step4Data);

      const sortedVias = [...vias].sort((a, b) => a.sequence - b.sequence);
      log.push(`🗺️ Rendered map with ${sections.length} sections and ${sortedVias.length} numbered stops.`);

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

  const saveHtml = async () => {
    if (!step4Data) return;
    
    try {
      await exportStaticHtml(step4Data);
      const log = [...step4Log, '💾 Saved → /content/route_map.html'];
      setStep4Log(log);
      
      // Trigger download
      const data = await readJSON('route_map.html');
      if (data) {
        const blob = new Blob([data], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'route_map.html';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      setError(errorMsg);
    }
  };

  return (
    <div className="step4-panel">
      <h4>Step 4 — Render Map</h4>
      
      <button
        className="primary"
        onClick={runStep4Render}
        disabled={isRenderingStep4}
      >
        {isRenderingStep4 ? 'Rendering…' : 'Render Map'}
      </button>

      {error && <div className="error">{error}</div>}

      {step4Log.length > 0 && (
        <div className="log-area">
          <h5>Log</h5>
          <pre className="console-log">{step4Log.join('\n')}</pre>
        </div>
      )}

      {step4Data && (
        <div className="map-container">
          <div className="map-wrapper">
            <MapContainer
              ref={mapRef}
              center={[step4Data.origin.lat, step4Data.origin.lng]}
              zoom={12}
              style={{ height: '500px', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />
              
              {/* Render polylines */}
              {step4Data.sections.map((section, index) => {
                if (!section.polyline) return null;
                
                try {
                  // decode() returns {polyline: [[lat, lng, alt?], ...]}
                  const decoded = decode(section.polyline);
                  const coords = decoded.polyline.map((point: any) => [point[0], point[1]] as [number, number]);
                  
                  if (index === 0) {
                    console.log(`✅ First section: ${coords.length} points`);
                  }
                  
                  return (
                    <Polyline
                      key={`polyline-${index}`}
                      positions={coords}
                      color="#2196F3"
                      weight={4}
                    />
                  );
                } catch (e) {
                  console.warn(`❌ Section ${index} decode failed:`, e);
                  return null;
                }
              })}

              {/* Origin marker */}
              <Marker 
                position={[step4Data.origin.lat, step4Data.origin.lng]}
                icon={createOriginIcon()}
              />

              {/* Destination marker */}
              <Marker 
                position={[step4Data.destination.lat, step4Data.destination.lng]}
                icon={createDestinationIcon()}
              />

              {/* Numbered via markers */}
              {[...step4Data.vias]
                .sort((a, b) => a.sequence - b.sequence)
                .map((via, index) => {
                  const stopNumber = index + 1;
                  const popupContent = `Stop ${stopNumber}<br/>Service: ${fmtServiceTime(via.service_s)}<br/>ID: ${via.id || 'N/A'}`;
                  
                  try {
                    return (
                      <Marker
                        key={`via-${via.sequence}`}
                        position={[via.lat, via.lng]}
                        icon={createNumberedIcon(stopNumber)}
                      >
                        <Popup>{popupContent}</Popup>
                      </Marker>
                    );
                  } catch (e) {
                    console.warn('Failed to create marker for via:', via, e);
                    return null;
                  }
                })}

              <MapBounds data={step4Data} />
            </MapContainer>
          </div>

          {/* Stats overlay */}
          <div className="stats-overlay">
            <div><strong>Distance:</strong> {(step4Data.totals.length_m / 1000).toFixed(1)} km</div>
            <div><strong>Duration:</strong> {fmtHms(step4Data.totals.duration_s)}</div>
            <div><strong>Stops:</strong> {step4Data.vias.length}</div>
          </div>

          <div className="map-actions">
            <button className="btn" onClick={saveHtml}>
              💾 Save HTML
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
