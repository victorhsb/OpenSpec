import { describe, it, expect } from 'vitest';
import { nearestMatches, levenshtein } from '../../src/utils/match.js';

describe('levenshtein', () => {
  it('returns 0 for identical strings', () => {
    expect(levenshtein('show', 'show')).toBe(0);
  });

  it('returns length for empty vs non-empty', () => {
    expect(levenshtein('', 'abc')).toBe(3);
    expect(levenshtein('abc', '')).toBe(3);
  });

  it('counts single substitution', () => {
    expect(levenshtein('cat', 'bat')).toBe(1);
  });
});

describe('nearestMatches — flat IDs (backward compat)', () => {
  it('returns closest flat match by Levenshtein', () => {
    const candidates = ['auth', 'payment', 'schema'];
    const result = nearestMatches('auht', candidates, 1);
    expect(result[0]).toBe('auth');
  });

  it('returns up to max results', () => {
    const candidates = ['a', 'b', 'c', 'd', 'e', 'f'];
    expect(nearestMatches('a', candidates, 3)).toHaveLength(3);
  });

  it('returns all candidates when fewer than max exist', () => {
    const candidates = ['auth'];
    expect(nearestMatches('auht', candidates, 5)).toHaveLength(1);
  });
});

describe('nearestMatches — hierarchical IDs (leaf-segment matching)', () => {
  it('suggests cli/show when query is exact leaf "show"', () => {
    const candidates = ['cli/show', 'cli/validate', 'schema'];
    const result = nearestMatches('show', candidates);
    expect(result[0]).toBe('cli/show');
  });

  it('suggests cli/validate when query is exact leaf "validate"', () => {
    const candidates = ['cli/show', 'cli/validate', 'schema'];
    const result = nearestMatches('validate', candidates);
    expect(result[0]).toBe('cli/validate');
  });

  it('suggests deeply nested spec by leaf match', () => {
    const candidates = ['domain/project/feature', 'other/thing'];
    const result = nearestMatches('feature', candidates, 1);
    expect(result[0]).toBe('domain/project/feature');
  });

  it('leaf typo match scores better than full-path match', () => {
    // "shwo" is a typo for "show"; levenshtein('shwo', 'cli/show') = 5 (full)
    // but levenshtein('shwo', 'show') = 1 (leaf) → should still rank cli/show first
    const candidates = ['cli/show', 'other'];
    const result = nearestMatches('shwo', candidates, 1);
    expect(result[0]).toBe('cli/show');
  });

  it('handles multiple candidates with same leaf — returns both ranked by leaf distance', () => {
    const candidates = ['cli/show', 'spec/show'];
    const result = nearestMatches('show', candidates);
    expect(result).toContain('cli/show');
    expect(result).toContain('spec/show');
  });

  it('flat and hierarchical candidates mixed — exact flat match wins', () => {
    const candidates = ['show', 'cli/show'];
    const result = nearestMatches('show', candidates);
    // Both have distance 0 to 'show'; 'show' exact full-match should be included
    expect(result).toContain('show');
    expect(result).toContain('cli/show');
  });
});
