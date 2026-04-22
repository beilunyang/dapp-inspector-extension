import { en, type I18nDict } from './en';
import { zh } from './zh';
import type { Lang } from '../types';

const DICTS: Record<Lang, I18nDict> = { en, zh };

type Path<T, P extends string = ''> = T extends object
  ? { [K in keyof T & string]: T[K] extends object ? Path<T[K], `${P}${K}.`> : `${P}${K}` }[keyof T & string]
  : never;
export type I18nKey = Path<I18nDict>;

export function t(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  const dict = DICTS[lang] ?? en;
  const parts = key.split('.');
  let cur: unknown = dict;
  for (const p of parts) {
    if (cur && typeof cur === 'object' && p in (cur as object)) {
      cur = (cur as Record<string, unknown>)[p];
    } else {
      return key;
    }
  }
  if (typeof cur !== 'string') return key;
  if (!vars) return cur;
  return cur.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? `{${k}}`));
}

export function getKeys(dict: unknown, prefix = ''): string[] {
  if (dict == null || typeof dict !== 'object') return [prefix];
  const out: string[] = [];
  for (const [k, v] of Object.entries(dict as Record<string, unknown>)) {
    const next = prefix ? `${prefix}.${k}` : k;
    if (typeof v === 'object' && v !== null) out.push(...getKeys(v, next));
    else out.push(next);
  }
  return out;
}
