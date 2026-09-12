import { describe, expect, it } from 'vitest';
import { canonicalDmId } from './types';

describe('canonicalDmId', () => {
  it('uses the same stable ID for either order of the same users', () => {
    expect(canonicalDmId('user-42', 'user-7')).toBe('user-7:user-42');
    expect(canonicalDmId('user-7', 'user-42')).toBe('user-7:user-42');
  });

  it('keeps the same DM conversation for repeated requests', () => {
    expect(canonicalDmId('abc', 'def')).toBe(canonicalDmId('def', 'abc'));
  });
});
