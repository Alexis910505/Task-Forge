import type { StyleSpecification } from 'maplibre-gl';

/** Estilo raster MapLibre a partir de plantilla XYZ. */
function rasterStyle(tileUrl: string, attribution: string, maxzoom = 19): StyleSpecification {
  return {
    version: 8,
    sources: {
      basemap: {
        type: 'raster',
        tiles: [tileUrl],
        tileSize: 256,
        attribution,
        maxzoom,
      },
    },
    layers: [{ id: 'basemap-layer', type: 'raster', source: 'basemap' }],
  };
}

/** Satélite con etiquetas (imagen + nombres de lugares). */
const SATELLITE_STYLE: StyleSpecification = {
  version: 8,
  sources: {
    imagery: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      attribution: '© Esri',
      maxzoom: 19,
    },
    labels: {
      type: 'raster',
      tiles: [
        'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
      ],
      tileSize: 256,
      maxzoom: 19,
    },
  },
  layers: [
    { id: 'imagery-layer', type: 'raster', source: 'imagery' },
    { id: 'labels-layer', type: 'raster', source: 'labels' },
  ],
};

/** CARTO GL + Esri/OSM. Revisar licencias en uso comercial. */
export const MAP_STYLES = {
  light: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
  dark: 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
  voyager: 'https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json',
  streets: rasterStyle(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    '© Esri',
  ),
  topo: rasterStyle(
    'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    '© Esri',
  ),
  natgeo: rasterStyle(
    'https://server.arcgisonline.com/ArcGIS/rest/services/NatGeo_World_Map/MapServer/tile/{z}/{y}/{x}',
    '© Esri · National Geographic',
  ),
  satellite: SATELLITE_STYLE,
  osm: rasterStyle('https://tile.openstreetmap.org/{z}/{x}/{y}.png', '© OpenStreetMap', 19),
} as const;

export type MapStyleKey = keyof typeof MAP_STYLES;

export const MAP_STYLE_KEYS: MapStyleKey[] = [
  'light',
  'dark',
  'voyager',
  'streets',
  'topo',
  'natgeo',
  'satellite',
  'osm',
];

export function mapThemeForStyle(key: MapStyleKey): 'light' | 'dark' {
  return key === 'dark' ? 'dark' : 'light';
}

export function getMaxZoomForStyle(_key: MapStyleKey): number {
  return 19;
}
