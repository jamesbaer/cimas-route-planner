import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet';
import { LatLngBounds } from 'leaflet';
import L from 'leaflet';
import { useStep4 } from '../store';

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

// Import CSS with error handling
try {
  require('leaflet/dist/leaflet.css');
} catch (e) {
  console.warn('Failed to load Leaflet CSS:', e);
}

function TestMapBounds() {
  const map = useMap();
  
  useEffect(() => {
    console.log('🗺️ TestMapBounds effect triggered');
    
    // Test with hardcoded coordinates
    const testCoords: [number, number][] = [
      [42.873681, -2.644691], // Origin
      [42.86, -2.65], // Middle point
      [42.834237, -2.746259] // Destination
    ];
    
    console.log('📍 Test coordinates:', testCoords);
    
    try {
      const bounds = new LatLngBounds(testCoords);
      console.log('🗺️ Fitting test bounds to:', bounds.toBBoxString());
      map.fitBounds(bounds, { padding: [20, 20] });
      console.log('✅ Test bounds fitted successfully');
    } catch (e) {
      console.error('❌ Failed to fit test bounds:', e);
    }
  }, [map]);
  
  return null;
}

export default function Step4MapTest() {
  const { step4Log, setStep4Log } = useStep4();
  const [error, setError] = useState<string | null>(null);

  const testMap = () => {
    setError(null);
    const log: string[] = [];
    
    try {
      log.push('🗺️ Testing map with hardcoded coordinates...');
      
      // Test coordinates from your debug output
      const testPolyline: [number, number][] = [
        [42.873681, -2.644691],
        [42.87, -2.65],
        [42.86, -2.66],
        [42.85, -2.70],
        [42.834237, -2.746259]
      ];
      
      log.push(`📍 Test polyline has ${testPolyline.length} points`);
      setStep4Log(log);
      
    } catch (e: any) {
      const errorMsg = e?.message || String(e);
      setError(errorMsg);
      log.push(`❌ Error: ${errorMsg}`);
      setStep4Log(log);
    }
  };

  return (
    <div className="step4-panel">
      <h4>Step 4 — Map Test</h4>
      
      <button className="primary" onClick={testMap}>
        Test Map with Hardcoded Data
      </button>

      {error && <div className="error">Error: {error}</div>}

      {step4Log.length > 0 && (
        <div className="log-area">
          <h5>Log</h5>
          <pre className="console-log">{step4Log.join('\n')}</pre>
        </div>
      )}

      <div className="map-container">
        <div className="map-wrapper">
          <MapContainer
            center={[42.873681, -2.644691]}
            zoom={12}
            style={{ height: '500px', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />
            
            {/* Test hardcoded polyline */}
            <Polyline
              positions={[
                [42.873681, -2.644691],
                [42.87, -2.65],
                [42.86, -2.66],
                [42.85, -2.70],
                [42.834237, -2.746259]
              ]}
              color="#2196F3"
              weight={4}
            />

            {/* Test markers */}
            <Marker position={[42.873681, -2.644691]}>
              <Popup>Origin (Cocheras)</Popup>
            </Marker>
            
            <Marker position={[42.834237, -2.746259]}>
              <Popup>Destination (Planta)</Popup>
            </Marker>

            <TestMapBounds />
          </MapContainer>
        </div>

        {/* Stats overlay */}
        <div className="stats-overlay">
          <div><strong>Distance:</strong> 117.3 km</div>
          <div><strong>Duration:</strong> 4h 1m</div>
          <div><strong>Stops:</strong> 65</div>
        </div>
      </div>
    </div>
  );
}
