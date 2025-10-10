import { DiscordAppService } from './discord-app.service';

describe('DiscordAppService - isoToDiscordTimestamp', () => {
  const svc = new DiscordAppService({} as any);

  test('microsecond precision trimmed to milliseconds', () => {
    const iso = '2025-10-10T14:49:59.994525Z';
    const expected = Math.floor(Date.parse('2025-10-10T14:49:59.994Z') / 1000);
    expect(svc.isoToDiscordTimestamp(iso)).toBe(expected);
  });

  test('no fractional seconds', () => {
    const iso = '2025-10-10T14:49:59Z';
    const expected = Math.floor(Date.parse(iso) / 1000);
    expect(svc.isoToDiscordTimestamp(iso)).toBe(expected);
  });

  test('with timezone offset +09:00', () => {
    const iso = '2025-10-10T14:49:59.123+09:00';
    const expected = Math.floor(Date.parse(iso) / 1000);
    expect(svc.isoToDiscordTimestamp(iso)).toBe(expected);
  });

  test('invalid input throws', () => {
    expect(() => svc.isoToDiscordTimestamp('not-a-timestamp')).toThrow();
  });
});
