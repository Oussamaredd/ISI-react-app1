import { describe, expect, it } from 'vitest';

import { DEFAULT_API_PORT, resolveApiPort, resolveApiPortValue } from '../config/api-port.js';

describe('api port resolution', () => {
  it('prefers API_PORT over PORT and trims surrounding whitespace', () => {
    expect(
      resolveApiPortValue({
        API_PORT: ' 4100 ',
        PORT: '3200',
      }),
    ).toBe('4100');
  });

  it('falls back to PORT when API_PORT is blank', () => {
    expect(
      resolveApiPortValue({
        API_PORT: '   ',
        PORT: '3200',
      }),
    ).toBe('3200');
  });

  it('accepts finite numeric API_PORT values from a generic env record', () => {
    expect(
      resolveApiPortValue({
        API_PORT: 8080,
      }),
    ).toBe('8080');
  });

  it('returns the default port when neither API_PORT nor PORT is usable', () => {
    expect(resolveApiPort({})).toBe(DEFAULT_API_PORT);
    expect(resolveApiPort({ API_PORT: null })).toBe(DEFAULT_API_PORT);
    expect(resolveApiPort({ API_PORT: 'invalid' })).toBe(DEFAULT_API_PORT);
    expect(resolveApiPort({ API_PORT: '-1' })).toBe(DEFAULT_API_PORT);
    expect(resolveApiPort({ API_PORT: '70000' })).toBe(DEFAULT_API_PORT);
  });

  it('returns a valid positive integer port when API_PORT or PORT is set', () => {
    expect(resolveApiPort({ API_PORT: '3001' })).toBe(3001);
    expect(resolveApiPort({ PORT: '10000' })).toBe(10000);
  });
});
