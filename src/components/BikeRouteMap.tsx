/// <reference types="google.maps" />
import { useEffect, useRef, useState } from "react";
import { useGoogleMapsScript } from "@/hooks/useGoogleMapsScript";
import { Loader2 } from "lucide-react";

interface Waypoint {
  lat: number;
  lng: number;
  label?: string;
}

interface BikeRouteMapProps {
  apiKey: string;
  startLocation: string;
  endLocation: string;
  waypoints: Waypoint[];
}

export function BikeRouteMap({ apiKey, startLocation, endLocation, waypoints }: BikeRouteMapProps) {
  const { isLoaded } = useGoogleMapsScript(apiKey);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<google.maps.Map | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoaded || !mapContainerRef.current || !waypoints.length) return;

    // Initialize map centered on first waypoint
    const center = { lat: waypoints[0].lat, lng: waypoints[0].lng };
    const map = new google.maps.Map(mapContainerRef.current, {
      zoom: 10,
      center,
      mapTypeId: "roadmap",
      styles: [
        { featureType: "poi", stylers: [{ visibility: "off" }] },
      ],
    });
    mapRef.current = map;

    const directionsService = new google.maps.DirectionsService();
    const directionsRenderer = new google.maps.DirectionsRenderer({
      map,
      suppressMarkers: false,
      polylineOptions: {
        strokeColor: "#e67e22",
        strokeWeight: 4,
        strokeOpacity: 0.8,
      },
    });

    // Build waypoints for directions (exclude first and last which are origin/destination)
    const intermediateWaypoints = waypoints.slice(1, -1).map(wp => ({
      location: new google.maps.LatLng(wp.lat, wp.lng),
      stopover: false,
    }));

    // Use first/last waypoints as origin/destination if no text locations
    const origin = startLocation || new google.maps.LatLng(waypoints[0].lat, waypoints[0].lng);
    const destination = endLocation || new google.maps.LatLng(waypoints[waypoints.length - 1].lat, waypoints[waypoints.length - 1].lng);

    directionsService.route(
      {
        origin,
        destination,
        waypoints: intermediateWaypoints,
        travelMode: google.maps.TravelMode.BICYCLING,
        optimizeWaypoints: false,
      },
      (result, status) => {
        if (status === google.maps.DirectionsStatus.OK && result) {
          directionsRenderer.setDirections(result);
        } else {
          console.error("Directions request failed:", status);
          // Fallback: draw polyline through waypoints
          const path = waypoints.map(wp => new google.maps.LatLng(wp.lat, wp.lng));
          new google.maps.Polyline({
            path,
            map,
            strokeColor: "#e67e22",
            strokeWeight: 4,
            strokeOpacity: 0.8,
          });

          // Fit bounds
          const bounds = new google.maps.LatLngBounds();
          path.forEach(p => bounds.extend(p));
          map.fitBounds(bounds);

          // Add markers for start/end
          new google.maps.Marker({
            position: path[0],
            map,
            label: "S",
          });
          new google.maps.Marker({
            position: path[path.length - 1],
            map,
            label: "F",
          });
        }
      }
    );
  }, [isLoaded, waypoints, startLocation, endLocation]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-[400px] bg-muted/30">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <div ref={mapContainerRef} style={{ width: "100%", height: 400 }} />;
}
