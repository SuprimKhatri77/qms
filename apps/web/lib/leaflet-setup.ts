// One-time Leaflet setup shared by every map in the app. Import it for its
// side effect (`import "@/lib/leaflet-setup"`) from client-only components:
// Leaflet reads `window` as soon as its module runs.
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Leaflet looks for its default marker images next to its own script, which
// doesn't exist once Next has bundled it, so pins show as broken images.
// The three images are copied from leaflet/dist/images into public/leaflet/
// and served as plain static files, so their URLs are the same whichever
// bundler builds the app. (Importing the PNGs instead gave a different value
// shape under Turbopack than Next's typings promise, and the URLs came out
// as "undefined".)
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "/leaflet/marker-icon-2x.png",
  iconUrl: "/leaflet/marker-icon.png",
  shadowUrl: "/leaflet/marker-shadow.png",
});
