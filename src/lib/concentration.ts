import type { Combatant, StatusEffect } from "../types";

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** "Concentración", or a custom status like "Concentrado en Bendecir". */
export const isConcentrationStatus = (s: StatusEffect) => norm(s.name).startsWith("concentr");

export const isConcentrating = (c: Pick<Combatant, "statuses">) => c.statuses.some(isConcentrationStatus);

/** DC of the Constitution save to keep concentration after a hit: 10 or half the damage, whichever is higher (30 at most). */
export const concentrationDC = (damage: number) => Math.min(30, Math.max(10, Math.floor(damage / 2)));

/**
 * The combatant after taking `damage`: a concentrating one gets one pending save per hit,
 * which the initiative row shows until the DM resolves it.
 */
export function withConcentrationCheck<T extends Combatant>(c: T, damage: number): T {
  if (damage <= 0 || !isConcentrating(c)) return c;
  return { ...c, concentrationChecks: [...(c.concentrationChecks || []), concentrationDC(damage)] };
}
