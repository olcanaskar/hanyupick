// Arka planda yüzen Hanzi karakterlerinin konum ve hareket matematiği.
//
// Neden servis (Faz 4.3): bu matematik daha önce `components/FloatingBackground.js`
// içindeydi ve orada test edilemiyordu. İki somut sorun vardı:
//   1) Hedef seçimindeki `while` döngüsü SINIRSIZDI. Adaylar doğuş noktasına yakın
//      çıktıkça döngü yeniden deniyordu; kusurlu/şanssız bir rastgelelik dizisinde
//      (ya da çok küçük bir pencerede) JS iş parçacığı kilitlenebilirdi → arayüz donar
//      ve kullanıcı uygulamayı kapatmak zorunda kalır.
//   2) Pencere ölçüsü modül yüklenirken BİR KEZ okunuyordu (`Dimensions.get('window')`);
//      pencere sonradan değişirse (Android çoklu pencere / bölünmüş ekran) karakterler
//      eski ölçüye göre konumlanıyordu.
//
// Rastgelelik dışarıdan verilebilir (`random`) → hem dağılım hem "asla asılı kalma"
// garantisi test edilebilir. Bileşen yalnızca sunum yapar.

import { LEVEL_POOLS } from './wordRepository';

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
//
// Görünüm ölçüsü (bileşen canlı pencere ölçüsünü verir) ve üretilen karakter.
export type Viewport = { width: number; height: number };
export type Point = { x: number; y: number };
export type Particle = {
  char: string;
  size: number;
  duration: number;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
};
// Rastgelelik dışarıdan verilebilir (testler deterministik diziler geçer).
export type RandomFn = () => number;

// Arka planda kaç karakter yüzer.
export const PARTICLE_COUNT = 18;

// Ekran dışı sınır mesafesi (px).
export const MARGIN = 45;

// Kenar ağırlıkları: %40 alt, %20 üst, %20 sağ, %20 sol (alt kenar ağırlıklı).
export const BOTTOM_WEIGHT = 0.4;
export const TOP_WEIGHT = 0.6;
export const RIGHT_WEIGHT = 0.8;

// Yeni doğan karakter, doğduğu kenara çok yakın bir hedefe gitmesin (px).
export const MIN_TARGET_DELTA = 120;

// Hedef için en fazla kaç aday denenecek. Sınırsız döngü yerine bu sınır var:
// hiçbiri yeterince uzak değilse o ana kadarki EN İYİ aday kullanılır → fonksiyon
// her koşulda sonlu sürede döner.
export const MAX_TARGET_ATTEMPTS = 12;

// Karakter boyutu (px) ve hızı (px/saniye) aralıkları.
export const MIN_SIZE = 32;
export const MAX_SIZE = 45;
export const MIN_SPEED = 20;
export const MAX_SPEED = 28;

// Yalnızca tek karakterlik Hanzi'ler (HSK1 havuzu — tek kaynak `wordRepository`).
export const SINGLE_HANZI_WORDS: { hanzi: string }[] = (() => {
  const hsk1 = LEVEL_POOLS.hsk1 || [];
  const single = hsk1.filter((item) => item.hanzi && item.hanzi.length === 1);

  return single.length > 0 ? single : [{ hanzi: '字' }];
})();

const FALLBACK_HANZI = SINGLE_HANZI_WORDS[0] ? SINGLE_HANZI_WORDS[0].hanzi : '字';

// Ekran kenarında, ekranın dışına taşan rastgele bir nokta.
// `viewport`: `{ width, height }`.
export const getRandomBoundaryPoint = (viewport: Viewport, random: RandomFn = Math.random): Point => {
  const { width, height } = viewport;
  const roll = random();

  if (roll < BOTTOM_WEIGHT) return { x: random() * width, y: height + MARGIN }; // alt
  if (roll < TOP_WEIGHT) return { x: random() * width, y: -MARGIN }; // üst
  if (roll < RIGHT_WEIGHT) return { x: width + MARGIN, y: random() * height }; // sağ

  return { x: -MARGIN, y: random() * height }; // sol
};

// Doğuş noktasına yeterince uzak bir hedef seçer: `MIN_TARGET_DELTA` px'ten fazla
// uzaklık iki eksenden en az birinde sağlanmalı. Sınırlı sayıda aday denenir; hiçbiri
// yeterince uzak değilse (örneğin çok küçük pencere) en iyisi döner — bu yüzden
// fonksiyon ASLA sonsuz döngüye girmez.
export const pickTargetPoint = (
  start: Point,
  viewport: Viewport,
  random: RandomFn = Math.random
): Point => {
  let best: Point | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < MAX_TARGET_ATTEMPTS; attempt++) {
    const candidate = getRandomBoundaryPoint(viewport, random);
    const dx = Math.abs(candidate.x - start.x);
    const dy = Math.abs(candidate.y - start.y);

    if (dx >= MIN_TARGET_DELTA || dy >= MIN_TARGET_DELTA) return candidate;

    const score = Math.max(dx, dy);
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }

  // `MAX_TARGET_ATTEMPTS > 0` olduğu için döngü en az bir kez döner ve `best` atanır;
  // yedek dönüş yalnızca tip güvenliği için (strict) — asla sıfır uzunlukta hareket
  // üretmemek adına yeni bir sınır noktası seçilir.
  return best ?? getRandomBoundaryPoint(viewport, random);
};

// Yeni bir yüzen karakter: doğuş/hedef noktası, boyut ve süre.
//
// `isInitial`: ilk açılışta karakterler ekranın geneline dağıtılır (boş ekranda tüm
// karakterlerin aynı anda kenardan süzülmesi yerine); sonraki doğuşlar kenardan başlar.
//
// `viewport`: `{ width, height }` — bileşen bunu canlı pencere ölçüsünden verir.
export const createParticle = (
  isInitial: boolean,
  viewport: Viewport,
  random: RandomFn = Math.random
): Particle => {
  const { width, height } = viewport;
  const word = SINGLE_HANZI_WORDS[Math.floor(random() * SINGLE_HANZI_WORDS.length)];
  const size = Math.floor(random() * (MAX_SIZE - MIN_SIZE + 1)) + MIN_SIZE;

  let startX: number;
  let startY: number;

  if (isInitial) {
    startX = random() * (width - 60) + 30;
    startY = random() * (height - 60) + 30;
  } else {
    const start = getRandomBoundaryPoint(viewport, random);
    startX = start.x;
    startY = start.y;
  }

  const target = isInitial
    ? getRandomBoundaryPoint(viewport, random)
    : pickTargetPoint({ x: startX, y: startY }, viewport, random);

  // Sabit hız mantığı: süre mesafeye göre hesaplanır (20-28 px/saniye → yavaş akış).
  const dx = target.x - startX;
  const dy = target.y - startY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const speed = random() * (MAX_SPEED - MIN_SPEED) + MIN_SPEED;
  const duration = (distance / speed) * 1000;

  return {
    char: word && word.hanzi ? word.hanzi : FALLBACK_HANZI,
    size,
    duration,
    startX,
    startY,
    endX: target.x,
    endY: target.y,
  };
};
