import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Crosshair,
  Home,
  Layers,
  Loader2,
  Locate,
  Maximize,
  Minus,
  Plus,
  Trash2,
} from 'lucide-react';
import type { Map as MapLibreMap } from 'maplibre-gl';
import {
  MapCompassButton,
  MapControlButton,
  MapControlGroup,
  useMap,
} from '@/components/ui/map';
import { cn } from '@/lib/utils';
import {
  MAP_STYLE_KEYS,
  type MapStyleKey,
} from '@/components/maps/mapStyles';

type Coords = { lng: number; lat: number };

const SELECTED_ZOOM = 14;
const DEFAULT_CENTER: [number, number] = [-3.7038, 40.4168];

function flyMapTo(map: MapLibreMap, coords: Coords, zoom = SELECTED_ZOOM) {
  map.flyTo({
    center: [coords.lng, coords.lat],
    zoom,
    bearing: 0,
    pitch: 0,
    duration: 800,
  });
}

type MapLocationControlsProps = {
  marker: Coords | null;
  userLocation: Coords | null;
  onUserLocation: (coords: Coords | null) => void;
  mapStyle: MapStyleKey;
  onMapStyleChange: (style: MapStyleKey) => void;
  onPick: (coords: Coords) => void;
  onClear: () => void;
  requestUserLocation: () => Promise<Coords | null>;
  fullscreenShellRef: React.RefObject<HTMLDivElement | null>;
};

export function MapLocationControls({
  marker,
  userLocation,
  onUserLocation,
  mapStyle,
  onMapStyleChange,
  onPick,
  onClear,
  requestUserLocation,
  fullscreenShellRef,
}: MapLocationControlsProps) {
  const { t } = useTranslation();
  const { map } = useMap();
  const [locating, setLocating] = useState(false);
  const [styleOpen, setStyleOpen] = useState(false);

  const zoomIn = useCallback(() => {
    map?.zoomTo(map.getZoom() + 1, { duration: 300 });
  }, [map]);

  const zoomOut = useCallback(() => {
    map?.zoomTo(map.getZoom() - 1, { duration: 300 });
  }, [map]);

  const resetNorth = useCallback(() => {
    map?.resetNorthPitch({ duration: 300 });
  }, [map]);

  const centerOnMarker = useCallback(() => {
    if (!map || !marker) return;
    flyMapTo(map, marker);
  }, [map, marker]);

  const resetView = useCallback(() => {
    if (!map) return;
    const go = (coords: Coords) => flyMapTo(map, coords);
    if (userLocation) {
      go(userLocation);
      return;
    }
    setLocating(true);
    void requestUserLocation().then((coords) => {
      onUserLocation(coords);
      if (coords) {
        go(coords);
      } else {
        go({ lng: DEFAULT_CENTER[0], lat: DEFAULT_CENTER[1] });
      }
      setLocating(false);
    });
  }, [map, userLocation, onUserLocation, requestUserLocation]);

  const locateMe = useCallback(() => {
    if (!map) return;
    setLocating(true);
    void requestUserLocation().then((coords) => {
      if (coords) {
        onUserLocation(coords);
        flyMapTo(map, coords);
        onPick(coords);
      }
      setLocating(false);
    });
  }, [map, onPick, onUserLocation, requestUserLocation]);

  const toggleFullscreen = useCallback(() => {
    const shell = fullscreenShellRef.current;
    if (!shell) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void shell.requestFullscreen();
    }
  }, [fullscreenShellRef]);

  return (
    <>
      {/* Herramientas — arriba izquierda */}
      <div className="absolute left-2 top-2 z-10 flex flex-col gap-1.5">
        <MapControlGroup>
          <MapControlButton onClick={centerOnMarker} label={t('createTask.map.centerMarker')} disabled={!marker}>
            <Crosshair className="size-4" />
          </MapControlButton>
          <MapControlButton onClick={resetView} label={t('createTask.map.resetView')}>
            <Home className="size-4" />
          </MapControlButton>
          <MapControlButton onClick={onClear} label={t('createTask.map.clearMarker')} disabled={!marker}>
            <Trash2 className="size-4" />
          </MapControlButton>
        </MapControlGroup>

        <MapControlGroup>
          <MapControlButton
            onClick={() => setStyleOpen((o) => !o)}
            label={t('createTask.map.mapStyle')}
          >
            <Layers className="size-4" />
          </MapControlButton>
        </MapControlGroup>

        {styleOpen ? (
          <div className="border-border bg-background max-h-52 overflow-y-auto rounded-md border shadow-sm">
            {MAP_STYLE_KEYS.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => {
                  onMapStyleChange(key);
                  setStyleOpen(false);
                }}
                className={cn(
                  'block w-full min-w-[9rem] border-b border-border px-3 py-2 text-left text-xs transition-colors last:border-b-0',
                  'hover:bg-accent dark:hover:bg-accent/40',
                  mapStyle === key && 'bg-accent font-semibold dark:bg-accent/40',
                )}
              >
                {t(`createTask.map.style.${key}`)}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Zoom, brújula, ubicación — abajo derecha (estilo mapcn) */}
      <div className="absolute bottom-10 right-2 z-10 flex flex-col gap-1.5">
        <MapControlGroup>
          <MapControlButton onClick={zoomIn} label={t('createTask.map.zoomIn')}>
            <Plus className="size-4" />
          </MapControlButton>
          <MapControlButton onClick={zoomOut} label={t('createTask.map.zoomOut')}>
            <Minus className="size-4" />
          </MapControlButton>
        </MapControlGroup>

        <MapControlGroup>
          <MapCompassButton onClick={resetNorth} />
        </MapControlGroup>

        <MapControlGroup>
          <MapControlButton onClick={locateMe} label={t('createTask.map.myLocation')} disabled={locating}>
            {locating ? <Loader2 className="size-4 animate-spin" /> : <Locate className="size-4" />}
          </MapControlButton>
        </MapControlGroup>

        <MapControlGroup>
          <MapControlButton onClick={toggleFullscreen} label={t('createTask.map.fullscreen')}>
            <Maximize className="size-4" />
          </MapControlButton>
        </MapControlGroup>
      </div>
    </>
  );
}
