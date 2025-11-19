export type TKey =
  | "inputs" | "csvFile" | "chooseFile" | "noFile"
  | "selected" | "wasteTypes" | "zone"
  | "cocherasLat" | "cocherasLng" | "plantaLat" | "plantaLng"
  | "hereKey" | "enterHereKey" | "processSave"
  | "sequencing" | "routing" | "exportGpx"
  | "routeMap" | "loadingMap" | "noRoute"
  | "language" | "english" | "spanish"
  | "envases" | "resto" | "papel" | "reutilizables" | "vidrio" | "aceite"
  | "este" | "centro" | "oeste"
  | "cocheras" | "planta"
  | "routeInformation" | "totalStops" | "distance" | "time";

export const dict = {
  en: {
    inputs: "Inputs",
    csvFile: "CSV file",
    chooseFile: "Choose File",
    noFile: "No file chosen",
    selected: "Selected",
    wasteTypes: "Waste Types",
    zone: "Zone",
    cocherasLat: "Depot Lat",
    cocherasLng: "Depot Lng",
    plantaLat: "Treatment Plant Lat",
    plantaLng: "Treatment Plant Lng",
    hereKey: "HERE API Key",
    enterHereKey: "Enter your HERE API key",
    processSave: "Process & Save",
    sequencing: "Sequencing",
    routing: "Routing",
    exportGpx: "Export GPX",
    routeMap: "Route Map",
    loadingMap: "Loading map…",
    noRoute: "No route to display",
    language: "Language",
    english: "English",
    spanish: "Spanish",
    envases: "Light Containers",
    resto: "Residual Waste",
    papel: "Paper-Carton",
    reutilizables: "Reusables",
    vidrio: "Glass",
    aceite: "Oil",
    este: "East",
    centro: "Central",
    oeste: "West",
    cocheras: "Depot",
    planta: "Treatment Plant",
    routeInformation: "Route Information",
    totalStops: "Total Stops",
    distance: "Distance",
    time: "Time",
  },
  es: {
    inputs: "Entradas",
    csvFile: "Archivo CSV",
    chooseFile: "Elegir archivo",
    noFile: "Ningún archivo seleccionado",
    selected: "Seleccionado",
    wasteTypes: "Tipos de residuo",
    zone: "Zona",
    cocherasLat: "Latitud de cocheras",
    cocherasLng: "Longitud de cocheras",
    plantaLat: "Latitud de planta",
    plantaLng: "Longitud de planta",
    hereKey: "Clave de API de HERE",
    enterHereKey: "Introduce tu clave de API de HERE",
    processSave: "Procesar y guardar",
    sequencing: "Secuenciación",
    routing: "Enrutamiento",
    exportGpx: "Exportar GPX",
    routeMap: "Mapa de la ruta",
    loadingMap: "Cargando mapa…",
    noRoute: "No hay ruta para mostrar",
    language: "Idioma",
    english: "Inglés",
    spanish: "Español",
    envases: "Envases Ligeros",
    resto: "Fracción Resto",
    papel: "Papel-cartón",
    reutilizables: "Reutilizables",
    vidrio: "Vidrio",
    aceite: "Aceite",
    este: "Este",
    centro: "Centro",
    oeste: "Oeste",
    cocheras: "Cocheras",
    planta: "Planta",
    routeInformation: "Información de Ruta",
    totalStops: "Paradas",
    distance: "Distancia",
    time: "Tiempo",
  },
} as const;

export function useT(lang: "en"|"es") {
  return (k: TKey) => dict[lang][k];
}
