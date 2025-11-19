import { MapContainer, TileLayer, Polyline, Marker, Popup, useMap } from 'react-leaflet'
import { useEffect, useRef } from 'react'
import { LatLngBounds } from 'leaflet'
import L from 'leaflet'
import { decode } from '@here/flexpolyline'
import { useStep4, useInputs } from '../store'
import 'leaflet/dist/leaflet.css'

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

function MapBounds({ data }: { data: any }) {
  const map = useMap();
  
  // biome-ignore lint/correctness/useExhaustiveDependencies: We only want to run this when data changes
  useEffect(() => {
    if (!data) return;
    
    console.log('🗺️ MainMap: Fitting bounds to route');
    
    const allCoords: [number, number][] = [];
    
    // Add decoded polyline coordinates
    data.sections.forEach((section: any, index: number) => {
      if (section.polyline) {
        try {
          const decoded = decode(section.polyline);
          const coords = decoded.polyline.map((point: any) => [point[0], point[1]] as [number, number]);
          allCoords.push(...coords);
        } catch (e) {
          console.warn(`❌ Section ${index} decode failed:`, e);
        }
      }
    });
    
    // Add origin and destination
    allCoords.push([data.origin.lat, data.origin.lng]);
    allCoords.push([data.destination.lat, data.destination.lng]);
    
    // Add via coordinates
    data.vias.forEach((via: any) => {
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
    html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">▶</div>',
    iconSize: [24, 24],
    className: ''
  });
}

function createDestinationIcon() {
  return L.divIcon({
    html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 16px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏁</div>',
    iconSize: [24, 24],
    className: ''
  });
}

export default function MapView() {
  const { step4Data } = useStep4();
  const { theme } = useInputs();
  const mapRef = useRef<L.Map | null>(null);
  
  // Component to handle map reference
  function MapEventHandler() {
    const map = useMap();
    
    useEffect(() => {
      // Store map reference
      mapRef.current = map;
    }, [map]);
    
    return null;
  }
  
  return (
    <MapContainer
            center={step4Data ? [step4Data.origin.lat, step4Data.origin.lng] : [42.98, -2.63]}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
            whenReady={() => {
              // Invalidate size to ensure proper rendering
              setTimeout(() => {
                const mapContainer = document.querySelector('.leaflet-container');
                if (mapContainer) {
                  const leafletMap = (mapContainer as any)._leaflet_map;
                  if (leafletMap) {
                    leafletMap.invalidateSize();
                  }
                }
              }, 100);
            }}
          >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url={theme === 'dark' 
            ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
            : 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png'
          }
        />
        <MapEventHandler />
        
        {step4Data && (
          <>
            {/* Render polylines */}
            {step4Data.sections.map((section: any, index: number) => {
              if (!section.polyline) return null;
              
              try {
                const decoded = decode(section.polyline);
                const coords = decoded.polyline.map((point: any) => [point[0], point[1]] as [number, number]);
                
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
            >
              <Popup>Origin: {step4Data.origin.lat.toFixed(6)}, {step4Data.origin.lng.toFixed(6)}</Popup>
            </Marker>

            {/* Destination marker */}
            <Marker 
              position={[step4Data.destination.lat, step4Data.destination.lng]}
              icon={createDestinationIcon()}
            >
              <Popup>Destination: {step4Data.destination.lat.toFixed(6)}, {step4Data.destination.lng.toFixed(6)}</Popup>
            </Marker>

            {/* Numbered via markers */}
            {step4Data.vias
              .sort((a: any, b: any) => a.sequence - b.sequence)
              .map((via: any, index: number) => {
                const popupContent = `Stop ${index + 1}<br/>Service: ${via.service_s}s<br/>Lat: ${via.lat.toFixed(6)}<br/>Lng: ${via.lng.toFixed(6)}`;
                
                return (
                  <Marker
                    key={`via-${via.id || index}`}
                    position={[via.lat, via.lng]}
                    icon={createNumberedIcon(index + 1)}
                  >
                    <Popup>{popupContent}</Popup>
                  </Marker>
                );
              })}

            <MapBounds data={step4Data} />
          </>
        )}
      </MapContainer>
  )
}
