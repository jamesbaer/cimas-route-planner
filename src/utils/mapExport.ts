import { writeText } from './artifacts';
import type { Step4Data } from '../types';

export function fmtHms(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  return `${h}h ${m}m`;
}

export function fmtServiceTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export async function exportStaticHtml(data: Step4Data): Promise<void> {
  const { origin, destination, vias, sections, totals } = data;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>CIMAS Route Map</title>
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
        body { margin: 0; padding: 0; }
        #map { height: 100vh; }
        .stats-overlay {
            position: absolute;
            top: 10px;
            left: 10px;
            background: rgba(255, 255, 255, 0.95);
            padding: 10px;
            border-radius: 5px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 1000;
            font-family: Arial, sans-serif;
            font-size: 14px;
        }
        .stats-overlay div {
            margin: 2px 0;
        }
        .numbered-marker {
            background: #2196F3;
            color: white;
            border-radius: 50%;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            font-size: 12px;
            border: 2px solid white;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }
    </style>
</head>
<body>
    <div id="map"></div>
    <div class="stats-overlay">
        <div><strong>Distance:</strong> ${(totals.length_m / 1000).toFixed(1)} km</div>
        <div><strong>Duration:</strong> ${fmtHms(totals.duration_s)}</div>
        <div><strong>Stops:</strong> ${vias.length}</div>
    </div>

    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script src="https://unpkg.com/@here/flexpolyline@7.0.0/dist/flexpolyline.js"></script>
    <script>
        // Embedded route data
        const routeData = ${JSON.stringify({
            origin, destination, vias, sections, totals
        }, null, 2)};

        function initMap() {
            const map = L.map('map').setView([routeData.origin.lat, routeData.origin.lng], 12);
            
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                attribution: '© OpenStreetMap contributors'
            }).addTo(map);

            // Decode and render polylines
            const allCoords = [];
            
            routeData.sections.forEach(section => {
                if (section.polyline) {
                    try {
                        const decoded = flexpolyline.decode(section.polyline);
                        const coords = decoded.polyline.map(point => [point.lat, point.lng]);
                        L.polyline(coords, { color: '#2196F3', weight: 4 }).addTo(map);
                        allCoords.push(...coords);
                    } catch (e) {
                        console.warn('Failed to decode polyline:', e);
                    }
                }
            });

            // Origin marker (green)
            L.marker([routeData.origin.lat, routeData.origin.lng], {
                icon: L.divIcon({
                    html: '<div style="background: #4CAF50; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">▶</div>',
                    iconSize: [20, 20],
                    className: ''
                })
            }).addTo(map).bindPopup('Origin (Cocheras)');

            // Destination marker (red)
            L.marker([routeData.destination.lat, routeData.destination.lng], {
                icon: L.divIcon({
                    html: '<div style="background: #F44336; color: white; border-radius: 50%; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; font-weight: bold; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">🏁</div>',
                    iconSize: [20, 20],
                    className: ''
                })
            }).addTo(map).bindPopup('Destination (Planta)');

            // Numbered via markers
            const sortedVias = [...routeData.vias].sort((a, b) => a.sequence - b.sequence);
            sortedVias.forEach((via, index) => {
                const stopNumber = index + 1;
                const serviceTime = routeData.vias.find(v => v.sequence === via.sequence)?.service_s || 0;
                const serviceTimeStr = fmtServiceTime(serviceTime);
                
                L.marker([via.lat, via.lng], {
                    icon: L.divIcon({
                        html: \`<div class="numbered-marker">\${stopNumber}</div>\`,
                        iconSize: [24, 24],
                        className: ''
                    })
                }).addTo(map).bindPopup(\`Stop \${stopNumber}<br>Service: \${serviceTimeStr}<br>ID: \${via.id || 'N/A'}\`);
                
                allCoords.push([via.lat, via.lng]);
            });

            // Add origin and destination to bounds
            allCoords.push([routeData.origin.lat, routeData.origin.lng]);
            allCoords.push([routeData.destination.lat, routeData.destination.lng]);

            // Fit bounds
            if (allCoords.length > 0) {
                const bounds = L.latLngBounds(allCoords);
                map.fitBounds(bounds, { padding: [20, 20] });
            }
        }

        function fmtServiceTime(seconds) {
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return \`\${m}:\${s.toString().padStart(2, '0')}\`;
        }

        // Initialize map when page loads
        document.addEventListener('DOMContentLoaded', initMap);
    </script>
</body>
</html>`;

  await writeText('route_map.html', html);
}
