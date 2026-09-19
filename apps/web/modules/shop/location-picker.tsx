"use client";

import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import markerIcon2x from "leaflet/dist/images/marker-icon-2x.png";
import markerIcon from "leaflet/dist/images/marker-icon.png";
import markerShadow from "leaflet/dist/images/marker-shadow.png";

// Leaflet's default marker image points at a relative path meant for a plain
// <img src>, which breaks once the icons are bundled by Next. Pointing it at
// the bundled URLs instead is the standard fix, done once when this module loads.
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x.src,
  iconUrl: markerIcon.src,
  shadowUrl: markerShadow.src,
});

// Kathmandu — a reasonable starting view before the owner has picked a spot.
const DEFAULT_CENTER: [number, number] = [27.7172, 85.324];

// Turns map clicks into lat/lng. Rendered as an invisible child of
// <MapContainer> because react-leaflet only exposes map events through hooks
// that must run inside the map's own context.
function ClickToSelect({
  onSelect,
}: {
  onSelect: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

type LocationPickerProps = {
  lat: number | undefined;
  lng: number | undefined;
  onSelect: (lat: number, lng: number) => void;
};

// Lets the owner click their shop's spot on an OpenStreetMap tile layer.
// Loaded client-only (see shop-form.tsx): Leaflet reads `window` as soon as
// its module runs, which a server render doesn't have.
export function LocationPicker({ lat, lng, onSelect }: LocationPickerProps) {
  const hasPosition = lat !== undefined && lng !== undefined;
  const center: [number, number] = hasPosition ? [lat, lng] : DEFAULT_CENTER;

  return (
    <div className="overflow-hidden rounded-none border border-hairline">
      <MapContainer
        // Only used for the very first render; clicking afterwards moves the
        // marker but intentionally leaves the view where the owner left it.
        center={center}
        zoom={hasPosition ? 15 : 12}
        style={{ height: 280, width: "100%" }}
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {hasPosition && <Marker position={[lat, lng]} />}
        <ClickToSelect onSelect={onSelect} />
      </MapContainer>
    </div>
  );
}
