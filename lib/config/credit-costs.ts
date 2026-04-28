export const CREDIT_COSTS: Record<string, number> = {
  'content.generate.short':      5,
  'content.generate.long':       15,
  'content.generate.thread':     10,
  'content.generate.blog':       20,
  'content.image.generate':      25,
  'content.seo.analyze':         8,
  'content.research.brief':      12,
} as const;

export function getCreditCost(actionType: string): number {
  const cost = CREDIT_COSTS[actionType];
  if (cost === undefined) throw new Error(`Unknown action type: ${actionType}`);
  return cost;
}
