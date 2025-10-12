import { fetchJson } from './network-utils';
import { z } from 'zod';
import { AppErrorCodes } from '../types/error-codes';

// Mock for global.fetch
const mockFetch = jest.fn();
global.fetch = mockFetch;

// Zod schema for testing
const TestSchema = z.object({
  id: z.number(),
  name: z.string(),
});

describe('fetchJson', () => {
  beforeEach(() => {
    mockFetch.mockClear();
  });

  it('parses and returns a valid response', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchJson('https://example.com');
    expect(result).toEqual(mockData);
    expect(mockFetch).toHaveBeenCalledWith('https://example.com', {
      signal: expect.any(AbortSignal),
    });
  });

  it('throws an error when response ok is false', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
    });

    await expect(fetchJson('https://example.com')).rejects.toThrow(
      AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
    );
  });

  it('throws an error when status is not in okStatuses', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      status: 201,
    });

    await expect(
      fetchJson('https://example.com', {}, { okStatuses: [200] }),
    ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
  });

  it('succeeds when status is in okStatuses', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: false, // Even if ok: false, success if status is in okStatuses
      status: 201,
      json: async () => mockData,
    });

    const result = await fetchJson(
      'https://example.com',
      {},
      { okStatuses: [201] },
    );
    expect(result).toEqual(mockData);
  });

  it('throws an error if JSON parsing fails', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => {
        throw new Error('JSON Parse Error');
      },
    });

    await expect(fetchJson('https://example.com')).rejects.toThrow(
      AppErrorCodes.EXTERNAL_API_REQUEST_FAILED,
    );
  });

  it('validates successfully with Zod schema', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const result = await fetchJson(
      'https://example.com',
      {},
      { validate: TestSchema },
    );
    expect(result).toEqual(mockData);
  });

  it('throws an error if Zod schema validation fails', async () => {
    const mockData = { id: '1', name: 123 }; // Invalid data
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    await expect(
      fetchJson('https://example.com', {}, { validate: TestSchema }),
    ).rejects.toThrow(AppErrorCodes.INVALID_FORMAT);
  });

  it('validates/transforms successfully with a custom validator', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const customValidator = (data: any) => ({
      ...data,
      name: data.name.toUpperCase(),
    });

    const result = await fetchJson(
      'https://example.com',
      {},
      { validate: customValidator },
    );
    expect(result).toEqual({ id: 1, name: 'TEST' });
  });

  it('throws an error if custom validator throws', async () => {
    const mockData = { id: 1, name: 'Test' };
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    const customValidator = (data: any) => {
      throw new Error('Custom validation failed');
    };

    await expect(
      fetchJson('https://example.com', {}, { validate: customValidator }),
    ).rejects.toThrow(AppErrorCodes.EXTERNAL_API_REQUEST_FAILED);
  });

  it('catches AbortError on timeout and throws an error', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((_, reject) => {
          const err = new Error('Aborted');
          err.name = 'AbortError';
          reject(err);
        }),
    );

    await expect(
      fetchJson('https://example.com', {}, { timeoutMs: 10 }),
    ).rejects.toThrow(AppErrorCodes.CONNECTION_ERROR);
  });
});
