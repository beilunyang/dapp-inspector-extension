import { describe, it, expect } from 'vitest';
import { t, getKeys } from '@shared/i18n';
import { en } from '@shared/i18n/en';
import { zh } from '@shared/i18n/zh';

describe('i18n', () => {
  it('returns English by default', () => {
    expect(t('en', 'panel.empty.waiting.title')).toBe('Waiting for calls');
  });
  it('returns Chinese when requested', () => {
    expect(t('zh', 'panel.empty.waiting.title')).toBe('等待调用');
  });
  it('interpolates variables', () => {
    expect(t('en', 'panel.count', { n: 5 })).toBe('5 calls');
    expect(t('zh', 'panel.count', { n: 5 })).toBe('5 条调用');
  });
  it('falls back to the key when missing', () => {
    expect(t('en', 'totally.unknown.key' as any)).toBe('totally.unknown.key');
  });
  it('has the same keys in both dictionaries', () => {
    const enKeys = getKeys(en).sort();
    const zhKeys = getKeys(zh).sort();
    expect(zhKeys).toEqual(enKeys);
  });
});
