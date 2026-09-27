"use client";

import { useEffect, useMemo } from "react";
import {
  CircleMarker,
  MapContainer,
  Marker,
  Popup,
  TileLayer,
  useMap,
} from "react-leaflet";
import type { DiscoveredShop } from "@repo/types";
import "@/lib/leaflet-setup";

type LatLng = [number, number];

// Kathmandu: the starting view when there's nothing to show yet.
const DEFAULT_CENTER: LatLng = [27.7172, 85.324];

// Re-frames the map whenever the set of points changes (a new filter, or
// "near me" switched on), so every pin is in view. Rendered inside
// <MapContainer> because react-leaflet only exposes the map via a hook.
function FitToPoints({ points }: { points: LatLng[] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 1) {
      map.setView(points[0]!, 15);
    } else if (points.length > 1) {
      map.fitBounds(points, { padding: [32, 32] });
    }
  }, [map, points]);

  return null;
}

type ShopsMapProps = {
  shops: DiscoveredShop[];
  // The visitor's own position, when "near me" is on.
  userLocation: { lat: number; lng: number } | null;
};

// Pins for every result that has a location. Loaded client-only (see
// explore-page.tsx): Leaflet needs `window`.
export function ShopsMap({ shops, userLocation }: ShopsMapProps) {
  const pinned = useMemo(
    () =>
      shops.filter(
        (shop): shop is DiscoveredShop & { lat: number; lng: number } =>
          shop.lat !== null && shop.lng !== null,
      ),
    [shops],
  );

  // Memoised so the map only re-frames when the results or the visitor's
  // location actually change. `shops` keeps the same reference between
  // identical refetches (React Query's structural sharing), and
  // `userLocation` is React state.
  const points = useMemo(() => {
    const shopPoints: LatLng[] = pinned.map((shop) => [shop.lat, shop.lng]);
    return userLocation
      ? [...shopPoints, [userLocation.lat, userLocation.lng] as LatLng]
      : shopPoints;
  }, [pinned, userLocation]);

  return (
    <div className="overflow-hidden border border-hairline">
      <MapContainer
        center={points[0] ?? DEFAULT_CENTER}
        zoom={12}
        style={{ height: 320, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pinned.map((shop) => (
          <Marker key={shop.id} position={[shop.lat, shop.lng]}>
            <Popup>
              <strong>{shop.name}</strong>
              <br />
              <a href={`/s/${shop.slug}`}>Join the queue</a>
            </Popup>
          </Marker>
        ))}
        {userLocation ? (
          <CircleMarker
            center={[userLocation.lat, userLocation.lng]}
            radius={8}
            pathOptions={{ color: "#2563eb", fillOpacity: 0.6 }}
          />
        ) : null}
        <FitToPoints points={points} />
      </MapContainer>
    </div>
  );
}
