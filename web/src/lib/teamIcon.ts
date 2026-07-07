const ICON_RULES: [RegExp, string][] = [
  [/norte|north/i, 'north'],
  [/sur|south/i, 'south'],
  [/este|east/i, 'east'],
  [/oeste|west/i, 'west'],
  [/campo|field|site/i, 'engineering'],
  [/manten|repair/i, 'build'],
  [/logistic|fleet|transport/i, 'local_shipping'],
  [/nocturn|night/i, 'dark_mode'],
  [/turno|shift/i, 'schedule'],
  [/alpha|beta|gamma|delta/i, 'tag'],
];

const FALLBACK_ICONS = ['groups', 'group', 'diversity_3', 'workspaces'] as const;

export function teamIcon(name: string, id: string): string {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(name)) return icon;
  }
  const idx = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
}
