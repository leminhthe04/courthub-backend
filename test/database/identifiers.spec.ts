import { describe, expect, it } from '@jest/globals';
import { v7 as uuidv7, validate, version } from 'uuid';

describe('Database identifiers', () => {
  it('generates valid UUID v7 identifiers', () => {
    const id = uuidv7();

    expect(validate(id)).toBe(true);
    expect(version(id)).toBe(7);
  });
});
