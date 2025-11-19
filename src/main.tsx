import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import "@fontsource/poppins/300.css"; // Light
import "@fontsource/poppins/400.css"; // Regular
import "@fontsource/poppins/600.css"; // SemiBold for headers/buttons
import 'leaflet/dist/leaflet.css'
import './index.css'
import AppModern from './AppModern.tsx'

// Apply saved theme on app initialization
const savedTheme = (localStorage.getItem("theme") as "light" | "dark") ?? "light";
document.documentElement.classList.toggle("dark", savedTheme === "dark");

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <div className="font-sans">
      <AppModern />
    </div>
  </StrictMode>,
)
