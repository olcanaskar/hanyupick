// El yazısı tanıma isteği (Google inputtools) — ağ katmanı.
//
// Neden ayrı dosya: istek daha önce HandwritingModal içinde gömülüydü ve
// ZAMAN AŞIMI YOKTU. `fetch` askıda kalırsa (yakalama portalı, yarım açık
// bağlantı, çok yavaş ağ) promise hiç sonlanmıyor, `finally` hiç çalışmıyor ve
// kullanıcı sonsuza kadar spinner'a bakıyordu. Burada istek `timeoutMs` sonunda
// KESİN olarak sonlanır: `Promise.race` sayesinde sonuç, `abort()` isteği
// gerçekten kesse bile garanti edilir (`abort()` en iyi çaba olarak çağrılır).
//
// `fetchImpl` dışarıdan verilebilir: testler "asla çözülmeyen istek" durumunu
// gerçek ağ olmadan doğrular.

export const HANDWRITING_TIMEOUT_MS = 9000;

const ENDPOINT =
  'https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=mobilesearch';
const DEFAULT_CANVAS_SIZE = 280;

// Zaman aşımını gerçek yanıttan ayıran iç işaret (dışarı sızmaz).
const TIMEOUT = Symbol('handwriting-timeout');

// API'nin beklediği [[[x1, x2], [y1, y2], []], ...] formatı.
export const buildInk = (allPaths = []) =>
  allPaths.map((stroke) => [
    stroke.map((point) => Math.round(point.x)),
    stroke.map((point) => Math.round(point.y)),
    [],
  ]);

const extractCandidates = (data) => {
  const candidates =
    data && data[0] === 'SUCCESS' && data[1] && data[1][0] && data[1][0][1];

  return Array.isArray(candidates) ? candidates : [];
};

// Tanıma isteği atar. Dönen değer: { candidates, error }
// error: null (başarılı) | 'timeout' | 'network'
export const recognizeHandwriting = async (allPaths, options = {}) => {
  const {
    canvasSize = DEFAULT_CANVAS_SIZE,
    timeoutMs = HANDWRITING_TIMEOUT_MS,
    fetchImpl = fetch,
  } = options;

  // Çizim yoksa istek atılmaz.
  if (!allPaths || allPaths.length === 0) {
    return { candidates: [], error: null };
  }

  const controller = new AbortController();
  let timer;

  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      controller.abort(); // En iyi çaba: bağlantıyı boşuna açık tutma.
      resolve(TIMEOUT);
    }, timeoutMs);
  });

  const request = async () => {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        app_version: 0.4,
        api_level: '537.36',
        device: '5.0',
        input_type: '0',
        options: 'enable_homophone_converter',
        requests: [
          {
            writer_size: { width: canvasSize, height: canvasSize },
            ink: buildInk(allPaths),
          },
        ],
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      return { candidates: [], error: 'network' };
    }

    return { candidates: extractCandidates(await response.json()), error: null };
  };

  try {
    const result = await Promise.race([request(), timeout]);

    return result === TIMEOUT ? { candidates: [], error: 'timeout' } : result;
  } catch (error) {
    if (__DEV__) console.warn('El yazısı tanıma isteği başarısız:', error);

    return { candidates: [], error: 'network' };
  } finally {
    clearTimeout(timer);
  }
};
