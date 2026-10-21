// Per-tab settings: who you are (persona) and which A/B version you see.
// They live in sessionStorage, so two tabs can be Mum and Auntie Lin at the same time.
// URL overrides: ?as=mum|auntie-lin|meixin and ?variant=a|b

import { useSyncExternalStore } from 'react';
import { PERSON } from '../shared/seed.ts';

export const PERSONAS = [
  { id: PERSON.meixin, name: 'Mei Xin' },
  { id: PERSON.mum, name: 'Mum' },
  { id: PERSON.auntieLin, name: 'Auntie Lin' },
] as const;

export type PersonaId = (typeof PERSONAS)[number]['id'];
export type Variant = 'a' | 'b';

const PERSONA_KEY = 'kinvo.persona';
const VARIANT_KEY = 'kinvo.variant';

const listeners = new Set<() => void>();
function subscribe(fn: () => void) {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}
function emit() {
  for (const fn of listeners) fn();
}

function readKey(key: string): string | null {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}
function writeKey(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    // Storage blocked: the value lasts until reload.
  }
  memory.set(key, value);
  emit();
}
const memory = new Map<string, string>();

function isPersona(v: string | null): v is PersonaId {
  return PERSONAS.some((p) => p.id === v);
}
function isVariant(v: string | null): v is Variant {
  return v === 'a' || v === 'b';
}

/** Reads ?as= and ?variant= once at start-up. Call before the first render. */
export function applyUrlOverrides() {
  const params = new URLSearchParams(window.location.search);
  const as = params.get('as');
  const variant = params.get('variant')?.toLowerCase() ?? null;
  if (isPersona(as)) writeKey(PERSONA_KEY, as);
  if (isVariant(variant)) writeKey(VARIANT_KEY, variant);
}

export function getPersona(): PersonaId {
  const v = memory.get(PERSONA_KEY) ?? readKey(PERSONA_KEY);
  return isPersona(v) ? v : PERSON.meixin;
}
export function setPersona(id: PersonaId) {
  writeKey(PERSONA_KEY, id);
}

export function getVariant(): Variant {
  const v = memory.get(VARIANT_KEY) ?? readKey(VARIANT_KEY);
  return isVariant(v) ? v : 'a';
}
export function setVariant(v: Variant) {
  writeKey(VARIANT_KEY, v);
}

/** The person this tab acts as. Use it as authorId / by / fromId in actions. */
export function usePersona(): PersonaId {
  return useSyncExternalStore(subscribe, getPersona);
}

/** A/B version for screens 04 and 05. A: ask a helper during save. B: ask after save. */
export function useVariant(): Variant {
  return useSyncExternalStore(subscribe, getVariant);
}
