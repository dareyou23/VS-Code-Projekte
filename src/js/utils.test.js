// src/js/utils.test.js
import { describe, it, expect } from 'vitest';
import { add } from './utils.js';

describe('Die Additions-Funktion', () => {
  it('sollte zwei positive Zahlen korrekt addieren', () => {
    expect(add(2, 3)).toBe(5);
  });

  it('sollte eine positive und eine negative Zahl korrekt addieren', () => {
    expect(add(10, -5)).toBe(5);
  });
});