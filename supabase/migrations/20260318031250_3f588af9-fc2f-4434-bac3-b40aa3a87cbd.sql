UPDATE bike_ride_events 
SET route_waypoints = '[
  {"lat": 39.6732, "lng": -105.3526, "label": "Evergreen, CO (Buchanan Park)"},
  {"lat": 39.7302, "lng": -105.5186, "label": "Idaho Springs"},
  {"lat": 39.642, "lng": -105.871, "label": "Loveland Pass"},
  {"lat": 39.638, "lng": -106.059, "label": "Keystone"},
  {"lat": 39.623, "lng": -106.052, "label": "Dillon"},
  {"lat": 39.625, "lng": -106.142, "label": "Frisco"},
  {"lat": 39.6105, "lng": -106.2713, "label": "Vail Pass"},
  {"lat": 39.6405, "lng": -106.3742, "label": "Vail"},
  {"lat": 39.648, "lng": -106.463, "label": "Avon, CO"}
]'::jsonb
WHERE id = '5584fec4-e674-4bbd-82c4-6fabb8f8ee80';