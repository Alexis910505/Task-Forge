import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Map, MapMarker, MarkerContent, useMap } from '@/components/ui/map';
import { parseCoords, type Coords } from '@/components/maps/locationCoords';
import { MAP_STYLES, mapThemeForStyle } from '@/components/maps/mapStyles';

const MINI_ZOOM = 14;

async function geocodeAddress(query: string, lang: string): Promise<Coords | null> {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('format', 'json');
  url.searchParams.set('q', query.trim());
  url.searchParams.set('limit', '1');
  const res = await fetch(url.toString(), {
    headers: {
      Accept: 'application/json',
      'Accept-Language': lang,
    },
  });
  if (!res.ok) return null;
  const rows = (await res.json()) as { lat?: string; lon?: string }[];
  const hit = rows[0];
  if (!hit?.lat || !hit.lon) return null;
  const lat = Number(hit.lat);
  const lng = Number(hit.lon);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
  return { lng, lat };
}

function MapResizeOnMount() {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    const resize = () => requestAnimationFrame(() => map.resize());
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(map.getContainer());
    return () => ro.disconnect();
  }, [map, isLoaded]);
  return null;
}

function MapFlyToCoords({ coords }: { coords: Coords }) {
  const { map, isLoaded } = useMap();
  useEffect(() => {
    if (!map || !isLoaded) return;
    map.jumpTo({
      center: [coords.lng, coords.lat],
      zoom: MINI_ZOOM,
      bearing: 0,
      pitch: 0,
    });
  }, [map, isLoaded, coords.lng, coords.lat]);
  return null;
}

type TaskLocationMiniMapProps = {
  location: string;
  className?: string;
};

export function TaskLocationMiniMap({ location, className = '' }: TaskLocationMiniMapProps) {
  const { t, i18n } = useTranslation();
  const shellRef = useRef<HTMLDivElement>(null);
  const parsed = useMemo(() => parseCoords(location), [location]);
  const [coords, setCoords] = useState<Coords | null>(parsed);
  const [geocoding, setGeocoding] = useState(false);

  useEffect(() => {
    if (parsed) {
      setCoords(parsed);
      return;
    }
    const q = location.trim();
    if (!q) {
      setCoords(null);
      return;
    }
    let cancelled = false;
    setGeocoding(true);
    void geocodeAddress(q, i18n.language).then((c) => {
      if (!cancelled) {
        setCoords(c);
        setGeocoding(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [location, parsed, i18n.language]);

  const mapStyle = MAP_STYLES.light;
  const center: [number, number] = coords ? [coords.lng, coords.lat] : [-3.7038, 40.4168];

  return (
    <div ref={shellRef} className={className}>
      <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-outline-variant bg-surface-variant">
        {geocoding ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface-container-low/80 text-sm text-on-surface-variant">
            {t('common.loading')}
          </div>
        ) : null}
        {!coords && !geocoding ? (
          <div className="flex h-full min-h-[160px] items-center justify-center p-4 text-center text-sm text-on-surface-variant">
            {location}
          </div>
        ) : (
          <Map
            center={center}
            zoom={coords ? MINI_ZOOM : 5}
            className="h-full min-h-[160px] w-full"
            theme={mapThemeForStyle('light')}
            styles={{ light: mapStyle, dark: mapStyle }}
            interactive
            dragPan
            scrollZoom
            boxZoom={false}
            dragRotate={false}
            keyboard={false}
            doubleClickZoom
            touchZoomRotate
          >
            <MapResizeOnMount />
            {coords ? (
              <>
                <MapFlyToCoords coords={coords} />
                <MapMarker longitude={coords.lng} latitude={coords.lat}>
                  <MarkerContent>
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary text-on-primary shadow-lg ring-2 ring-white">
                      <span
                        className="material-symbols-outlined text-xl"
                        style={{ fontVariationSettings: "'FILL' 1" }}
                      >
                        location_on
                      </span>
                    </div>
                  </MarkerContent>
                </MapMarker>
              </>
            ) : null}
          </Map>
        )}
      </div>
      <p className="mt-2 text-center text-sm text-on-surface-variant">{location}</p>
    </div>
  );
}
