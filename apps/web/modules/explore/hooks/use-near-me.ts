import { useState } from "react";

export type NearMeStatus = "off" | "locating" | "on" | "denied" | "unavailable";

type Location = { lat: number; lng: number };

// Asks the browser for the visitor's location, once, when they press
// "Near me". The location stays in memory only: it's never put in the URL
// or stored, since it would say where someone is.
export function useNearMe() {
  const [status, setStatus] = useState<NearMeStatus>("off");
  const [location, setLocation] = useState<Location | null>(null);

  function locate() {
    if (!("geolocation" in navigator)) {
      setStatus("unavailable");
      return;
    }

    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
        setStatus("on");
      },
      (error) => {
        setLocation(null);
        setStatus(
          error.code === error.PERMISSION_DENIED ? "denied" : "unavailable",
        );
      },
      // A rough position is enough to sort shops, and faster to get.
      { enableHighAccuracy: false, timeout: 10_000, maximumAge: 60_000 },
    );
  }

  function clear() {
    setLocation(null);
    setStatus("off");
  }

  return { status, location, locate, clear };
}
