import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import MapView from './MapView';
import { useEffect } from 'react';

export default function MapCard() {
  // Handle window resize for Leaflet
  useEffect(() => {
    const handleResize = () => {
      const mapContainer = document.querySelector('.leaflet-container');
      if (mapContainer) {
        const leafletMap = (mapContainer as any)._leaflet_map;
        if (leafletMap) {
          leafletMap.invalidateSize();
        }
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle>Route Map</CardTitle>
      </CardHeader>
      <CardContent>
        <div id="map-root" className="h-[70vh] md:h-[76vh] rounded-xl overflow-hidden">
          <MapView />
        </div>
      </CardContent>
    </Card>
  );
}
