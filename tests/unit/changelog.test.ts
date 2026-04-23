import { describe, it, expect } from 'vitest';
import pkg from '../../package.json';
import { CHANGELOG } from '../../src/shared/changelog';

describe('CHANGELOG', () => {
  it('has at least one entry', () => {
    expect(CHANGELOG.length).toBeGreaterThan(0);
  });

  it('top entry version matches package.json version', () => {
    // Guard against shipping a release whose version bump forgot to
    // land a matching changelog entry.
    expect(CHANGELOG[0].version).toBe(pkg.version);
  });

  it('entries are in descending version order', () => {
    const versions = CHANGELOG.map(e => e.version);
    const sorted = [...versions].sort(compareSemver).reverse();
    expect(versions).toEqual(sorted);
  });

  it('every entry has both EN and ZH text', () => {
    for (const e of CHANGELOG) {
      expect(e.en.length).toBeGreaterThan(0);
      expect(e.zh.length).toBeGreaterThan(0);
    }
  });
});

function compareSemver(a: string, b: string): number {
  const pa = a.split('.').map(Number);
  const pb = b.split('.').map(Number);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const d = (pa[i] ?? 0) - (pb[i] ?? 0);
    if (d !== 0) return d;
  }
  return 0;
}
