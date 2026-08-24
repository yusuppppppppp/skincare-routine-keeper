export const ROUTINE_SLOTS = ['morning', 'evening', 'both'] as const;

export type RoutineSlot = (typeof ROUTINE_SLOTS)[number];

export interface SkincareProduct {
  id: string;
  name: string;
  brand: string;
  concern: string;
  routineSlot: RoutineSlot;
  isActive: boolean;
}

export function isRoutineSlot(value: unknown): value is RoutineSlot {
  return typeof value === 'string' && (ROUTINE_SLOTS as readonly string[]).includes(value);
}

export function isSkincareProduct(value: unknown): value is SkincareProduct {
  if (typeof value !== 'object' || value === null) return false;
  const p = value as Record<string, unknown>;
  return (
    typeof p.id === 'string' &&
    p.id.length > 0 &&
    typeof p.name === 'string' &&
    typeof p.brand === 'string' &&
    typeof p.concern === 'string' &&
    isRoutineSlot(p.routineSlot) &&
    typeof p.isActive === 'boolean'
  );
}
