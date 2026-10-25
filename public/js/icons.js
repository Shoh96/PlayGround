const PATHS = {
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/><path d="M8 7h8M8 11h5"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.65 17.65l1.42 1.42M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.65 6.35l1.42-1.42"/>',
  waves: '<path d="M2 7c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 13c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/><path d="M2 19c2.5 0 2.5 2 5 2s2.5-2 5-2 2.5 2 5 2 2.5-2 5-2"/>',
  crown: '<path d="m3 8 4 4 5-7 5 7 4-4-2 11H5L3 8Z"/><path d="M5 19h14"/>',
  scroll: '<path d="M8 21h9a3 3 0 0 0 3-3V6a2 2 0 0 0-2-2H7a3 3 0 0 0-3 3v2h4"/><path d="M4 9v9a3 3 0 0 0 3 3h1"/><path d="M8 21V9a3 3 0 0 0-3-3"/><path d="M12 10h5M12 14h5"/>',
  harp: '<path d="M6 3c0 7 3 12 9 15l4 3"/><path d="M6 3v18M10 3c.5 5 2.5 9 5.5 12M18 21l-6-6"/><path d="M9 3h7"/>',
  star: '<path d="m12 2 3.1 6.3 6.9 1-5 4.9 1.2 6.8-6.2-3.3L5.8 21 7 14.2 2 9.3l6.9-1L12 2Z"/>',
  lamp: '<path d="M9 3h6l1 5H8l1-5Z"/><path d="M8 8c0 4-3 5-3 8a7 7 0 0 0 14 0c0-3-3-4-3-8"/><path d="M12 12v8"/><path d="M9 20h6"/>',
  spark: '<path d="m12 3 1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3Z"/><path d="M19 16v4M17 18h4M5 3v3M3.5 4.5h3"/>',
  flame: '<path d="M12 22c4 0 7-3 7-7 0-3-2-5-3.5-7C14 5.5 13 3 13 3c0 3-2 4-3.5 6C8 11 8 12 8 14c0 1 .5 2 1 2.5 0-2 1-3.5 2-4.5-.2 2.5 2 4 2 6 0 1.5-1 2.5-2 3Z"/>',
  vase: '<path d="M9 3h6M10 3v4c0 2-4 3-4 7 0 5 3 7 6 7s6-2 6-7c0-4-4-5-4-7V3"/><path d="M8 14h8"/>',
  lion: '<path d="M12 3c3.5 0 6 2.5 6 6 0 1.2.8 2.2 2 3-1 1.2-1.8 2.5-1.8 4 0 3.3-2.7 5-6.2 5s-6.2-1.7-6.2-5c0-1.5-.8-2.8-1.8-4 1.2-.8 2-1.8 2-3 0-3.5 2.5-6 6-6Z"/><circle cx="9.5" cy="11" r=".8"/><circle cx="14.5" cy="11" r=".8"/><path d="M10 15h4M11 17.5h2"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3V6Z"/><path d="M9 3v15M15 6v15"/><circle cx="12" cy="11" r="2"/>',
  letter: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  seven: '<path d="m7 5 10-2-5 18"/><circle cx="4" cy="4" r="1"/><circle cx="20" cy="4" r="1"/><circle cx="4" cy="20" r="1"/><circle cx="20" cy="20" r="1"/>',
  dove: '<path d="M21 5c-3 0-5-2-5-2 0 4-2 6-6 7 2-2 2-5 1-7-2 1-3 3-3 6l-5 4h7c6 0 9-3 11-8Z"/><path d="M8 13c-1 3 0 6 3 8M10 8 8 6"/>',
  lamb: '<path d="M7 10a3 3 0 1 1 2-5 3 3 0 0 1 5 0 3 3 0 1 1 2 5"/><path d="M7 10c-2 0-3 2-3 4s2 4 4 4h2"/><path d="M13 18h3c2 0 4-2 4-4s-1-4-3-4"/><path d="M8 18v3M15 18v3"/><circle cx="10" cy="12" r=".6"/>',
  eagle: '<path d="M12 6c-3-3-7-3-10-1 3 1 5 4 7 6-2 0-4 1-5 3 3-1 5 0 7 2v4M12 6c3-3 7-3 10-1-3 1-5 4-7 6 2 0 4 1 5 3-3-1-5 0-7 2v4"/>',
  fish: '<path d="M3 12c4-5 9-5 13 0-4 5-9 5-13 0Z"/><path d="M16 12c2-2 4-2 5 0-1 2-3 2-5 0Z"/><circle cx="8" cy="11" r=".7"/>',
  trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4Z"/><path d="M8 6H4v2a4 4 0 0 0 4 4M16 6h4v2a4 4 0 0 1-4 4"/><path d="M12 13v5M8 21h8M9 18h6"/>',
  bolt: '<path d="M13 2 4 14h6l-1 8 9-12h-6l1-8Z"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-2.5 5.5L8 16l2.5-5.5L16 8Z"/>',
  home: '<path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/>',
  grid: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
  user: '<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/>',
  users: '<circle cx="9" cy="8" r="3.5"/><path d="M2 21c0-4 3-6 7-6s7 2 7 6"/><path d="M16 5a3.5 3.5 0 0 1 0 7M18 15c2 .7 4 2.5 4 6"/>',
  wifi: '<path d="M2 8.5a15 15 0 0 1 20 0M5 12a10 10 0 0 1 14 0M8.5 15.5a5 5 0 0 1 7 0"/><circle cx="12" cy="19" r="1"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1.1 1.7 1.7 0 0 0-.3-1.9l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.9.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.9-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.9V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1Z"/>',
  volume: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
  mute: '<path d="M11 5 6 9H2v6h4l5 4V5Z"/><path d="m16 9 5 6M21 9l-5 6"/>',
  play: '<path d="M7 4v16l13-8L7 4Z"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  check: '<path d="m4 12 5 5L20 6"/>',
  x: '<path d="M6 6l12 12M18 6 6 18"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  target: '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/>',
  share: '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 10.5 6.8-4M8.6 13.5l6.8 4"/>',
  copy: '<rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  lock: '<rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  medal: '<circle cx="12" cy="14" r="6"/><path d="m9 3 3 5 3-5M12 11v6M9.5 14h5"/>',
  swords: '<path d="m14 4 6 6-4 4-6-6 4-4ZM4 20l6-6M3 17l4 4M8 8 4 4M4 8l4-4M17 17l-4 4M20 20l-4-4"/>',
  robot: '<rect x="4" y="8" width="16" height="12" rx="3"/><path d="M12 4v4M8 14h.01M16 14h.01M9 17h6"/><circle cx="12" cy="2.5" r="1"/>',
  refresh: '<path d="M20 11a8 8 0 1 0-2 6M20 4v7h-7"/>',
  calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/><path d="M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  eye: '<path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/>',
  feather: '<path d="M20 4c-4 0-8 2-11 5-2 2-3 4-3 6l-3 5M6 15l6-6"/><path d="M18 6c-2 0-4 1-5 2"/>',
  crownSmall: '<path d="m4 9 3 3 5-6 5 6 3-3-2 9H6L4 9Z"/>'
};

export function icon(name, size = 24, className = '') {
  const path = PATHS[name] || PATHS.star;
  return `<svg class="icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${path}</svg>`;
}

export const AVATARS = [
  { id: 'lion', name: 'Lion of Judah', icon: 'lion', color: '#f0b45e' },
  { id: 'dove', name: 'Dove', icon: 'dove', color: '#8fd8ff' },
  { id: 'lamb', name: 'Lamb', icon: 'lamb', color: '#ffd6a0' },
  { id: 'eagle', name: 'Eagle', icon: 'eagle', color: '#b6a8ff' },
  { id: 'flame', name: 'Flame', icon: 'flame', color: '#ff9a6a' },
  { id: 'star', name: 'Morning Star', icon: 'star', color: '#f5c86b' },
  { id: 'harp', name: 'Harp', icon: 'harp', color: '#6fe0c1' },
  { id: 'crown', name: 'Crown', icon: 'crown', color: '#ffcf70' },
  { id: 'scroll', name: 'Scroll', icon: 'scroll', color: '#e4c9a0' },
  { id: 'fish', name: 'Fish', icon: 'fish', color: '#62b6ff' },
  { id: 'vase', name: 'Alabaster Jar', icon: 'vase', color: '#ffb9c8' }
];

export function avatarOf(id) {
  return AVATARS.find(a => a.id === id) || AVATARS[5];
}

export function avatarMark(id, size = 'md') {
  const avatar = avatarOf(id);
  return `<span class="avatar avatar--${size}" style="--avatar-color:${avatar.color}" title="${avatar.name}">${icon(avatar.icon, size === 'sm' ? 18 : size === 'lg' ? 32 : 24)}</span>`;
}

export const ICONS = PATHS;
