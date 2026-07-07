const ICON_RULES: [RegExp, string][] = [
  [/logistic|fleet|supply|transport/i, 'local_shipping'],
  [/maint|repair|facility|upkeep/i, 'build'],
  [/field|site|on-?site|technical op/i, 'engineering'],
  [/complian|safety|regulat/i, 'verified_user'],
  [/procure|vendor|purchase|acquisition/i, 'shopping_cart'],
  [/quality|audit|precision/i, 'fact_check'],
  [/security/i, 'security'],
  [/personnel|hr|human/i, 'groups'],
];

const FALLBACK_ICONS = ['domain', 'corporate_fare', 'apartment', 'hub'] as const;

export function departmentIcon(name: string, id: string): string {
  for (const [pattern, icon] of ICON_RULES) {
    if (pattern.test(name)) return icon;
  }
  const idx = id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return FALLBACK_ICONS[idx % FALLBACK_ICONS.length];
}
