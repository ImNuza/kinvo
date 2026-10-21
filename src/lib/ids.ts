/** New id for an action, e.g. newId('story') -> "story-3f2a9c1e0b7d". Matches the server id rule. */
export function newId(prefix: string): string {
  const random =
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      : Math.random().toString(36).slice(2, 14);
  return `${prefix}-${random}`;
}

/** Timestamp for an action. */
export function nowIso(): string {
  return new Date().toISOString();
}
