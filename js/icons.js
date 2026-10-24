const ICONS = {
  dashboard:
    '<rect x="3.2" y="3.2" width="7.2" height="7.2" rx="2.1"/><rect x="13.6" y="3.2" width="7.2" height="7.2" rx="2.1"/><rect x="3.2" y="13.6" width="7.2" height="7.2" rx="2.1"/><rect x="13.6" y="13.6" width="7.2" height="7.2" rx="2.1"/>',
  sales:
    '<path d="M6 3h12v18l-2.4-1.4L13.2 21l-2.4-1.4L8.4 21 6 19.6V3Z"/><path d="M9.5 8h5M9.5 11.5h5"/>',
  expenses:
    '<rect x="3" y="6" width="18" height="13" rx="3"/><path d="M3 10h18"/><path d="M16 14h2"/>',
  menu:
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16.2H6.5A2.5 2.5 0 0 0 4 21.7V5.5Z"/><path d="M20 19v2H6.5"/><path d="M8 7.5h8M8 11h5"/>',
  reports: '<path d="M4 20v-6M10 20V6M16 20v-5M22 20H2"/>',
  settings:
    '<path d="M4 21v-6M4 11V3M12 21v-9M12 8V3M20 21v-5M20 12V3"/><circle cx="4" cy="13" r="2"/><circle cx="12" cy="10" r="2"/><circle cx="20" cy="14" r="2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.2-3.2"/>',
  bell: '<path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/>',
  calendar:
    '<rect x="3" y="5" width="18" height="16" rx="2.5"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  arrowUpRight: '<path d="M7 17 17 7M8 7h9v9"/>',
  arrowDownRight: '<path d="M7 7l10 10M17 8v9H8"/>',
  trash:
    '<path d="M4 7h16M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2M6.5 7l.8 12a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9l.8-12"/><path d="M10 11v6M14 11v6"/>',
  edit: '<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  download: '<path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 19h16"/>',
  upload: '<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 20h16"/>',
  check: '<path d="m4.5 12.5 5 5 10-11"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  cash:
    '<rect x="2.5" y="6" width="19" height="12" rx="2.5"/><circle cx="12" cy="12" r="2.6"/><path d="M6 9.5h.01M18 14.5h.01"/>',
  card: '<rect x="2.5" y="5" width="19" height="14" rx="3"/><path d="M2.5 10h19M6 15.2h3"/>',
  phone: '<rect x="6.5" y="2.5" width="11" height="19" rx="2.6"/><path d="M10.5 18.5h3"/>',
  basket:
    '<path d="M4 10h16l-1.6 9a2.2 2.2 0 0 1-2.2 1.8H7.8A2.2 2.2 0 0 1 5.6 19L4 10Z"/><path d="m8 10 2.2-6M16 10l-2.2-6M9 13.5v3.5M15 13.5v3.5"/>',
  box: '<path d="m12 3 8 4.4v9.2L12 21l-8-4.4V7.4L12 3Z"/><path d="m4 7.4 8 4.4 8-4.4M12 11.8V21"/>',
  users:
    '<path d="M16 20v-1.6a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4V20"/><circle cx="9" cy="7" r="3.6"/><path d="M22 20v-1.6a4 4 0 0 0-3-3.9M16.5 3.6a3.6 3.6 0 0 1 0 6.8"/>',
  store:
    '<path d="M4 9.5V20h16V9.5"/><path d="M3 9.5 5 4h14l2 5.5H3Z"/><path d="M9 20v-5h6v5"/>',
  bolt: '<path d="M13 2.5 4.5 14H11l-1 7.5L19 10h-6.5l.5-7.5Z"/>',
  megaphone: '<path d="M3 11.5 20 5v14L3 12.5v-1Z"/><path d="M7 13.5v4a2 2 0 0 0 4 0v-3.2"/>',
  tool: '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3.5 17.3a2 2 0 0 0 2.8 2.8l5.8-5.8a4 4 0 0 0 5.2-5.4l-2.5 2.5-2.4-2.4 2.3-2.7Z"/>',
  dots: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
  sparkles:
    '<path d="m12 3 1.7 4.8L18.5 9.5l-4.8 1.7L12 16l-1.7-4.8L5.5 9.5l4.8-1.7L12 3Z"/><path d="m18.5 15.5.9 2.4 2.1.8-2.1.8-.9 2.4-.9-2.4-2.1-.8 2.1-.8.9-2.4Z"/>',
  alert: '<path d="M12 3 2.5 20h19L12 3Z"/><path d="M12 9v5M12 17.5h.01"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  refresh: '<path d="M20.5 12a8.5 8.5 0 1 1-2.5-6M20.5 4v5h-5"/>',
  database:
    '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/><path d="M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  file: '<path d="M6 3h8l4 4v14H6V3Z"/><path d="M14 3v5h4"/><path d="M9 13h6M9 16.5h4"/>',
  shield:
    '<path d="M12 3 5 6v5.5c0 4.4 3 7.6 7 9.5 4-1.9 7-5.1 7-9.5V6l-7-3Z"/><path d="m9 12 2 2 4-4"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 7.5h.01"/>',
  coins:
    '<ellipse cx="9" cy="6.5" rx="5" ry="2.5"/><path d="M4 6.5v4c0 1.4 2.2 2.5 5 2.5s5-1.1 5-2.5v-4"/><path d="M4 10.5v4c0 1.4 2.2 2.5 5 2.5 1.1 0 2.1-.2 3-.5"/><ellipse cx="15.5" cy="14" rx="4.5" ry="2.3"/><path d="M11 14v3.7c0 1.3 2 2.3 4.5 2.3s4.5-1 4.5-2.3V14"/>',
  bag: '<path d="M6 8h12l1 12H5L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/>',
  flame:
    '<path d="M12 3c.5 3.5 4 5 4 9a4 4 0 0 1-8 0c0-2 1-3 1-3s0 2 1.5 2S12 7 12 3Z"/>',
  burger:
    '<path d="M4 10a8 8 0 0 1 16 0H4Z"/><path d="M4 10h16"/><path d="M5 13.5h14"/><path d="M5.5 17a3.5 3.5 0 0 0 3.5 3h6a3.5 3.5 0 0 0 3.5-3"/>',
  fries:
    '<path d="M6.5 10h11l-1 9.5a1.5 1.5 0 0 1-1.5 1.3H9a1.5 1.5 0 0 1-1.5-1.3L6.5 10Z"/><path d="M8 10V4.5M11 10V3M14 10V4M16.5 10V6"/>',
  drink:
    '<path d="M5.5 8h13l-1.4 12.2a1.5 1.5 0 0 1-1.5 1.3H8.4a1.5 1.5 0 0 1-1.5-1.3L5.5 8Z"/><path d="M4.5 8h15"/><path d="M13.5 8 16 3.5"/>',
  combo:
    '<path d="M5.5 8h13l1 12H4.5l1-12Z"/><path d="M8.5 8V6a3.5 3.5 0 0 1 7 0v2"/><path d="M9 13h6"/>',
  rings:
    '<circle cx="12" cy="9.5" r="3"/><circle cx="8.3" cy="16" r="2.7"/><circle cx="15.7" cy="16" r="2.7"/>',
  wrap:
    '<path d="M6 8a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/><path d="M9.5 8h5M9.5 12h5M9.5 16h5"/>',
};

function icon(name, size = 18, cls = "") {
  const body = ICONS[name] || ICONS.info;
  return `<svg class="icon ${cls}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
}
