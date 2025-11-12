import LeftPanel from './components/LeftPanel';
// import OutputConsole from './components/OutputConsole'; // Kept for future debug use
import MapView from './components/MapView';

export default function App() {
  return (
    <div className="app-grid">
      <LeftPanel />
      <div className="right-col">
        <div className="map-wrap">
          <MapView />
        </div>
      </div>
    </div>
  );
}
