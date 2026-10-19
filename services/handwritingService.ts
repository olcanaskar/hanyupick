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

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
//
// Çizim noktası: tuval içindeki piksel koordinatı.
export type InkPoint = { x: number; y: number };
// Bir vuruş (parmak kaldırılana kadar toplanan noktalar). `allPaths` = vuruş listesi.
export type InkStroke = InkPoint[];
export type HandwritingError = 'timeout' | 'network';
// Çağıranın gördüğü sonuç: `error` null ise istek başarılıdır (adaylar boş olabilir).
export type HandwritingResult = { candidates: string[]; error: HandwritingError | null };
// İstek yapan fonksiyonun testler için daraltılmış imzası (gerçek `fetch` uyar).
export type HandwritingFetch = (
  url: string,
  init?: { method?: string; headers?: Record<string, string>; body?: string; signal?: AbortSignal }
) => Promise<{ ok: boolean; json: () => Promise<unknown> }>;
export type HandwritingOptions = {
  canvasSize?: number;
  timeoutMs?: number;
  fetchImpl?: HandwritingFetch;
};
// Google inputtools yanıtı: ["SUCCESS", [[girdi, adaylar, ...]]].
type InputToolsResponse = [status: string, payload?: unknown[][]];

// Zaman aşımını gerçek yanıttan ayıran iç işaret (dışarı sızmaz).
const TIMEOUT = Symbol('handwriting-timeout');

// API'nin beklediği [[[x1, x2], [y1, y2], []], ...] formatı.
export const buildInk = (allPaths: InkStroke[] = []): number[][][] =>
  allPaths.map((stroke) => [
    stroke.map((point) => Math.round(point.x)),
    stroke.map((point) => Math.round(point.y)),
    [],
  ]);

const extractCandidates = (data: unknown): string[] => {
  const response = Array.isArray(data) ? (data as InputToolsResponse) : null;
  const candidates =
    response && response[0] === 'SUCCESS' ? response[1]?.[0]?.[1] : undefined;

  return Array.isArray(candidates) ? (candidates as string[]) : [];
};

// Tanıma isteği atar. Dönen değer: { candidates, error }
// error: null (başarılı) | 'timeout' | 'network'
export const recognizeHandwriting = async (
  allPaths: InkStroke[],
  options: HandwritingOptions = {}
): Promise<HandwritingResult> => {
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
  let timer: ReturnType<typeof setTimeout> | undefined;

  const timeout = new Promise<typeof TIMEOUT>((resolve) => {
    timer = setTimeout(() => {
      controller.abort(); // En iyi çaba: bağlantıyı boşuna açık tutma.
      resolve(TIMEOUT);
    }, timeoutMs);
  });

  const request = async (): Promise<HandwritingResult> => {
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
