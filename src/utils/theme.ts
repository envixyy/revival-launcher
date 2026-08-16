function adjustBrightness(hex: string, amount: number) {
  let cleanHex = hex.replace('#', '');
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  
  let R = parseInt(cleanHex.substring(0, 2), 16) || 0;
  let G = parseInt(cleanHex.substring(2, 4), 16) || 0;
  let B = parseInt(cleanHex.substring(4, 6), 16) || 0;

  R = Math.min(255, Math.max(0, R + amount));
  G = Math.min(255, Math.max(0, G + amount));
  B = Math.min(255, Math.max(0, B + amount));

  const rHex = R.toString(16).padStart(2, '0');
  const gHex = G.toString(16).padStart(2, '0');
  const bHex = B.toString(16).padStart(2, '0');

  return `#${rHex}${gHex}${bHex}`;
}

export function applyTheme(config: { theme_bg?: string; theme_accent?: string; theme_grad_end?: string }) {
  const root = document.documentElement;
  const bg = config?.theme_bg || '#111216';
  const accent = config?.theme_accent || '#facc15';
  const gradEnd = config?.theme_grad_end || '#eab308';

  root.style.setProperty('--revival-dark', bg);
  root.style.setProperty('--revival-accent', accent);
  root.style.setProperty('--revival-grad-end', gradEnd);
  root.style.setProperty('--revival-text', '#ffffff');

  root.style.setProperty('--revival-sidebar', adjustBrightness(bg, -5));
  root.style.setProperty('--revival-panel', adjustBrightness(bg, 8));
  root.style.setProperty('--revival-card', adjustBrightness(bg, 16));
}
