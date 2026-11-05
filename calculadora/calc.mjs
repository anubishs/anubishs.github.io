export const num = v => v !== '' && v !== null && Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
export function calculate(p) {
  const printing = p.printingEnabled !== false;
  const extras = p.extras ?? [];
  if (!Array.isArray(extras) || extras.some(item => !item.name?.trim() || num(item.amount) === null)) return null;
  if (!printing && extras.length === 0) return null;
  const keys = printing ? ['filamentPrice', 'filamentUsed', 'printHours', 'printerPower', 'energyRate', 'markup', 'quantity'] : [];
  const quantity = printing ? Number(p.quantity) : 1;
  if (keys.some(k => num(p[k]) === null) || !Number.isInteger(quantity) || quantity < 1) return null;
  if (printing && num(p.depreciationRate ?? 0) === null) return null;
  const material = printing ? Number(p.filamentPrice) / 1000 * Number(p.filamentUsed) : 0;
  const energy = printing ? Number(p.printerPower) / 1000 * Number(p.printHours) * Number(p.energyRate) : 0;
  const depreciation = printing ? Number(p.depreciationRate ?? 0) * Number(p.printHours) : 0;
  const cost = material + energy + depreciation;
  const rawUnit = material * (1 + Number(p.markup) / 100) + energy + depreciation;
  const unitCents = printing ? (p.roundUnit ? Math.round(rawUnit) * 100 : Math.round((rawUnit + Number.EPSILON) * 100)) : 0;
  const serviceCents = extras.reduce((sum, item) => sum + Math.round((Number(item.amount) + Number.EPSILON) * 100), 0);
  const printTotal = unitCents * quantity / 100;
  const subtotal = (unitCents * quantity + serviceCents) / 100;
  const total = p.roundTotal ? Math.round(subtotal) : subtotal;
  const roundingAdjustment = Math.round((total - subtotal) * 100) / 100;
  if (![material, energy, cost, unitCents, total].every(Number.isFinite) || unitCents > Number.MAX_SAFE_INTEGER / quantity) return null;
  if (!Number.isSafeInteger(serviceCents) || !Number.isSafeInteger(Math.round(total * 100))) return null;
  return { material, energy, depreciation, cost, unitPrice: unitCents / 100, printTotal, servicesTotal: serviceCents / 100, roundingAdjustment, total, totalCost: cost * quantity, profit: printTotal - cost * quantity };
}
