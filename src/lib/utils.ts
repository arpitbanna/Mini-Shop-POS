export function formatDateTime(isoString: string) {
  if (!isoString) return '';
  
  const d = new Date(isoString);
  
  // Format to "17 Mar, 10:45 PM"
  return d.toLocaleString('en-US', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

// Convert "2026-03-18T15:30:00.000Z" to HTML5 datetime-local format "2026-03-18T15:30"
export function getLocalDatetimeStr() {
  const d = new Date();
  const offset = d.getTimezoneOffset() * 60000;
  const localIso = new Date(d.getTime() - offset).toISOString();
  return localIso.substring(0, 16);
}
