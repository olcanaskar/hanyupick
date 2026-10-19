// El yazısı tanıma isteği (Faz 4.6).
//
// Asıl senaryo: `fetch` askıda kalırsa (yakalama portalı / yarım açık bağlantı /
// çok yavaş ağ) istek hiç sonlanmıyor, `finally` çalışmıyor ve kullanıcı sonsuza
// kadar spinner'a bakıyordu. Bu testler "asla çözülmeyen istek" durumunu gerçek
// ağ olmadan (fetch enjekte edilerek) doğrular.

import {
  HANDWRITING_TIMEOUT_MS,
  buildInk,
  recognizeHandwriting,
} from '../services/handwritingService';

// API'nin gerçek yanıt şekli: ['SUCCESS', [['字', [...adaylar]]]]
const successResponse = (candidates) => ({
  ok: true,
  status: 200,
  json: async () => ['SUCCESS', [['字', candidates]]],
});

const STROKE = [
  { x: 10.4, y: 20.6 },
  { x: 30.2, y: 40.9 },
];
const PATHS = [STROKE];

afterEach(() => {
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe('buildInk', () => {
  test('API formatını üretir ve koordinatları yuvarlar', () => {
    expect(buildInk(PATHS)).toEqual([[[10, 30], [21, 41], []]]);
  });

  test('her çizgi ayrı bir öğe olur', () => {
    expect(buildInk([[{ x: 1.2, y: 2.8 }], [{ x: 3, y: 4 }]])).toEqual([
      [[1], [3], []],
      [[3], [4], []],
    ]);
  });

  test('boş girdide boş dizi döner', () => {
    expect(buildInk()).toEqual([]);
    expect(buildInk([])).toEqual([]);
  });
});

describe('recognizeHandwriting', () => {
  test('çizim yoksa istek atılmaz', async () => {
    const fetchImpl = jest.fn();

    await expect(recognizeHandwriting([], { fetchImpl })).resolves.toEqual({
      candidates: [],
      error: null,
    });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  test('başarılı yanıtta adayları döner ve doğru gövdeyi gönderir', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(successResponse(['你', '伲']));

    const result = await recognizeHandwriting(PATHS, { fetchImpl, canvasSize: 280 });

    expect(result).toEqual({ candidates: ['你', '伲'], error: null });

    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain('inputtools.google.com');
    expect(init.method).toBe('POST');

    const body = JSON.parse(init.body);
    expect(body.requests[0].writer_size).toEqual({ width: 280, height: 280 });
    expect(body.requests[0].ink).toEqual(buildInk(PATHS));
    expect(init.signal).toBeDefined(); // istek iptal edilebilir olmalı
  });

  test('SUCCESS olmayan yanıtta aday yok, hata da yok', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['FAILED', []],
    });

    await expect(recognizeHandwriting(PATHS, { fetchImpl })).resolves.toEqual({
      candidates: [],
      error: null,
    });
  });

  test('adaylar beklenen biçimde değilse boş liste döner (çökmez)', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({
      ok: true,
      json: async () => ['SUCCESS', [['字', 'dizi-degil']]],
    });

    await expect(recognizeHandwriting(PATHS, { fetchImpl })).resolves.toEqual({
      candidates: [],
      error: null,
    });
  });

  test('HTTP hatası ağ hatası olarak döner', async () => {
    const fetchImpl = jest.fn().mockResolvedValue({ ok: false, status: 500 });

    await expect(recognizeHandwriting(PATHS, { fetchImpl })).resolves.toEqual({
      candidates: [],
      error: 'network',
    });
  });

  test('fetch reddi ağ hatası olarak döner', async () => {
    const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
    const fetchImpl = jest.fn().mockRejectedValue(new Error('Network request failed'));

    await expect(recognizeHandwriting(PATHS, { fetchImpl })).resolves.toEqual({
      candidates: [],
      error: 'network',
    });
    expect(warn).toHaveBeenCalled();
  });

  describe('zaman aşımı', () => {
    beforeEach(() => jest.useFakeTimers());

    test('ASLA çözülmeyen istek zaman aşımıyla sonlanır (sonsuz spinner yok)', async () => {
      const fetchImpl = jest.fn(() => new Promise<never>(() => {}));

      const promise = recognizeHandwriting(PATHS, { fetchImpl });
      jest.advanceTimersByTime(HANDWRITING_TIMEOUT_MS);

      await expect(promise).resolves.toEqual({ candidates: [], error: 'timeout' });
    });

    test('zaman aşımında istek iptal edilir (signal.aborted)', async () => {
      // İkinci parametre tiplenir: `mock.calls` üzerinden gönderilen `signal`e
      // erişebilmek için (Faz 22: JSDoc assert'i TS dosyasında çalışmıyor).
      const fetchImpl = jest.fn(
        (_url: string, _init?: { signal?: AbortSignal }) => new Promise<never>(() => {})
      );

      const promise = recognizeHandwriting(PATHS, { fetchImpl });

      const signal = fetchImpl.mock.calls[0][1]?.signal;

      expect(signal.aborted).toBe(false);
      jest.advanceTimersByTime(HANDWRITING_TIMEOUT_MS);

      await promise;
      expect(signal.aborted).toBe(true);
    });

    test('gövde okuması (json) askıda kalırsa da zaman aşımı devreye girer', async () => {
      const fetchImpl = jest.fn().mockResolvedValue({
        ok: true,
        json: () => new Promise(() => {}),
      });

      const promise = recognizeHandwriting(PATHS, { fetchImpl });
      jest.advanceTimersByTime(HANDWRITING_TIMEOUT_MS);

      await expect(promise).resolves.toEqual({ candidates: [], error: 'timeout' });
    });

    test('zaman aşımı süresi ayarlanabilir', async () => {
      const fetchImpl = jest.fn(() => new Promise<never>(() => {}));

      const promise = recognizeHandwriting(PATHS, { fetchImpl, timeoutMs: 500 });
      jest.advanceTimersByTime(500);

      await expect(promise).resolves.toEqual({ candidates: [], error: 'timeout' });
    });

    test('yanıt zamanında gelirse zamanlayıcı temizlenir', async () => {
      const fetchImpl = jest.fn().mockResolvedValue(successResponse(['好']));

      await expect(recognizeHandwriting(PATHS, { fetchImpl })).resolves.toEqual({
        candidates: ['好'],
        error: null,
      });
      expect(jest.getTimerCount()).toBe(0);
    });
  });
});
