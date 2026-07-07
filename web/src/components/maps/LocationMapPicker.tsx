import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import { useTranslation } from 'react-i18next';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { Map, MapMarker, MarkerContent, useMap } from '@/components/ui/map';
import { MapLocationControls } from '@/components/maps/MapLocationControls';
import {
  formatCoords,
  parseCoords,
  type Coords,
} from '@/components/maps/locationCoords';
import {
  getMaxZoomForStyle,
  MAP_STYLES,
  mapThemeForStyle,
  type MapStyleKey,
} from '@/components/maps/mapStyles';

/** Centro por defecto (España peninsular). */
const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];
const DEFAULT_ZOOM = 5;
const SELECTED_ZOOM = 14;

function MapClickPicker({ onPick }: { onPick: (coords: Coords) => void }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const handler = (e: { lngLat: { lng: number; lat: number } }) => {
      onPick({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    };
    const canvas = map.getCanvas();
    canvas.style.cursor = 'crosshair';
    map.on('click', handler);
    return () => {
      map.off('click', handler);
      canvas.style.cursor = '';
    };
  }, [map, isLoaded, onPick]);

  return null;
}

function flyMapTo(map: MapLibreMap, coords: Coords, zoom = SELECTED_ZOOM) {
  map.flyTo({
    center: [coords.lng, coords.lat],
    zoom,
    bearing: 0,
    pitch: 0,
    duration: 800,
  });
}

function MapFocusOnCoords({ coords }: { coords: Coords | null }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || !coords) return;
    flyMapTo(map, coords);
  }, [map, isLoaded, coords?.lng, coords?.lat, coords]);

  return null;
}

/** Centra el mapa en la ubicación del usuario al abrir (sin marcar punto). */
function MapFlyToUserOnOpen({
  userLocation,
  mapSession,
  skip,
}: {
  userLocation: Coords | null;
  mapSession: number;
  skip: boolean;
}) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded || skip || !userLocation) return;
    flyMapTo(map, userLocation);
  }, [map, isLoaded, userLocation, mapSession, skip]);

  return null;
}

function requestUserLocation(): Promise<Coords | null> {
  if (!('geolocation' in navigator)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lng: pos.coords.longitude,
          lat: pos.coords.latitude,
        }),
      () => resolve(null),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 30000 },
    );
  });
}

/** Algunos basemaps (p. ej. físico Esri) no tienen tiles por encima de z8. */
function MapClampZoomForStyle({ mapStyle }: { mapStyle: MapStyleKey }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;
    const maxZoom = getMaxZoomForStyle(mapStyle);
    if (map.getZoom() > maxZoom) {
      map.setZoom(maxZoom);
    }
    map.setMaxZoom(maxZoom);
  }, [map, isLoaded, mapStyle]);

  return null;
}

/** MapLibre no redibuja solo al cambiar el tamaño del contenedor (p. ej. pantalla completa). */
function MapResizeOnContainerChange({ watchRef }: { watchRef: RefObject<HTMLElement | null> }) {
  const { map, isLoaded } = useMap();

  useEffect(() => {
    if (!map || !isLoaded) return;

    const resize = () => {
      requestAnimationFrame(() => map.resize());
    };

    const onFullscreen = () => {
      resize();
      window.setTimeout(resize, 100);
      window.setTimeout(resize, 350);
    };

    document.addEventListener('fullscreenchange', onFullscreen);
    window.addEventListener('resize', resize);

    const observed = watchRef.current ?? map.getContainer();
    const ro = observed ? new ResizeObserver(resize) : null;
    if (observed && ro) {
      ro.observe(observed);
    }

    return () => {
      document.removeEventListener('fullscreenchange', onFullscreen);
      window.removeEventListener('resize', resize);
      ro?.disconnect();
    };
  }, [map, isLoaded, watchRef]);

  return null;
}

type LocationMapPickerProps = {
  value: string;
  onChange: (value: string) => void;
};

export function LocationMapPicker({ value, onChange }: LocationMapPickerProps) {
  const { t } = useTranslation();
  const mapShellRef = useRef<HTMLDivElement>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [mapStyle, setMapStyle] = useState<MapStyleKey>('light');
  const [userLocation, setUserLocation] = useState<Coords | null>(null);
  const [mapSession, setMapSession] = useState(0);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === mapShellRef.current);
    };
    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', onFullscreenChange);
  }, []);

  useEffect(() => {
    if (!mapOpen) return;
    setMapSession((s) => s + 1);
    void requestUserLocation().then(setUserLocation);
  }, [mapOpen]);

  const parsed = useMemo(() => parseCoords(value), [value]);
  const [marker, setMarker] = useState<Coords | null>(parsed);

  useEffect(() => {
    setMarker(parsed);
  }, [parsed]);

  const handlePick = useCallback(
    (coords: Coords) => {
      setMarker(coords);
      onChange(formatCoords(coords));
    },
    [onChange],
  );

  const handleClear = useCallback(() => {
    setMarker(null);
    onChange('');
  }, [onChange]);

  const hasSavedCoords = Boolean(marker || parsed);
  const mapCenter: [number, number] = marker
    ? [marker.lng, marker.lat]
    : parsed
      ? [parsed.lng, parsed.lat]
      : userLocation
        ? [userLocation.lng, userLocation.lat]
        : DEFAULT_CENTER;
  const mapZoom = hasSavedCoords || userLocation ? SELECTED_ZOOM : DEFAULT_ZOOM;

  const activeStyle = MAP_STYLES[mapStyle];
  const mapTheme = mapThemeForStyle(mapStyle);

  return (
    <div className="space-y-3">
      <input
        type="text"
        value={value}
        onChange={(ev) => onChange(ev.target.value)}
        placeholder={t('createTask.locationPh')}
        className="w-full rounded-lg border border-outline-variant bg-surface p-3 text-sm outline-none ring-primary focus:ring-2"
      />
      <button
        type="button"
        onClick={() => setMapOpen((o) => !o)}
        className="flex items-center gap-2 text-xs font-bold uppercase text-primary hover:underline"
      >
        <span className="material-symbols-outlined text-base">map</span>
        {mapOpen ? t('createTask.hideMap') : t('createTask.pickOnMap')}
      </button>
      {mapOpen ? (
        <div
          ref={mapShellRef}
          className={[
            'overflow-hidden rounded-xl border border-outline-variant bg-surface-container-lowest',
            isFullscreen ? 'flex h-screen w-screen max-h-screen flex-col rounded-none' : '',
          ].join(' ')}
        >
          <div className={isFullscreen ? 'relative min-h-0 w-full flex-1' : 'relative w-full'}>
            <Map
              center={mapCenter}
              zoom={mapZoom}
              className={isFullscreen ? 'h-full min-h-0 w-full' : 'h-96 w-full'}
              theme={mapTheme}
              styles={{
                light: activeStyle,
                dark: activeStyle,
              }}
            >
              <MapResizeOnContainerChange watchRef={mapShellRef} />
              <MapClampZoomForStyle mapStyle={mapStyle} />
              <MapLocationControls
                marker={marker}
                userLocation={userLocation}
                onUserLocation={setUserLocation}
                mapStyle={mapStyle}
                onMapStyleChange={setMapStyle}
                onPick={handlePick}
                onClear={handleClear}
                requestUserLocation={requestUserLocation}
                fullscreenShellRef={mapShellRef}
              />
              <MapClickPicker onPick={handlePick} />
              <MapFocusOnCoords coords={marker ?? parsed} />
              <MapFlyToUserOnOpen
                userLocation={userLocation}
                mapSession={mapSession}
                skip={hasSavedCoords}
              />
            {marker ? (
              <MapMarker longitude={marker.lng} latitude={marker.lat}>
                <MarkerContent>
                  <div className="flex size-8 items-center justify-center rounded-full bg-primary text-on-primary shadow-md">
                    <span className="material-symbols-outlined text-lg">location_on</span>
                  </div>
                </MarkerContent>
              </MapMarker>
            ) : null}
            </Map>
          </div>
          {!isFullscreen ? (
            <p className="bg-surface-container-low px-3 py-2 text-[11px] text-on-surface-variant">
              {t('createTask.mapPickHint')}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
