/** Quiet basemap shared by every Google map: no business icons or transit clutter, brand-tinted water. */
export const MAP_STYLES: google.maps.MapTypeStyle[] = [
  { featureType: 'poi', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', stylers: [{ visibility: 'on' }] },
  { featureType: 'poi.park', elementType: 'labels', stylers: [{ visibility: 'off' }] },
  { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#E1EDE0' }] },
  { featureType: 'transit', stylers: [{ visibility: 'off' }] },
  { featureType: 'landscape', elementType: 'geometry', stylers: [{ color: '#F5F6F7' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#BDD6F2' }] },
  { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#18568F' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#FFFFFF' }] },
  { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#E4E8EC' }] },
  { featureType: 'road', elementType: 'labels.icon', stylers: [{ visibility: 'off' }] },
  { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#56606B' }] },
  { featureType: 'administrative', elementType: 'labels.text.fill', stylers: [{ color: '#56606B' }] },
];
