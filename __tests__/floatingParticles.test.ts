import {
  MARGIN,
  MAX_SIZE,
  MAX_SPEED,
  MAX_TARGET_ATTEMPTS,
  MIN_SIZE,
  MIN_SPEED,
  SINGLE_HANZI_WORDS,
  createParticle,
  getRandomBoundaryPoint,
  pickTargetPoint,
} from '../services/floatingParticles';

const VIEWPORT = { width: 400, height: 800 };
const BOTTOM_Y = 800 + MARGIN; // 845
const TOP_Y = -MARGIN; // -45

// Verilen değerleri sırayla döndüren sahte rastgelelik üreteci; son değer tekrar eder.
// `calls()` kaç kez çağrıldığını verir → "sonlu sürede döndü" iddiası ölçülebilir olur.
const scriptedRandom = (...values) => {
  let index = 0;
  const random = () => {
    const value = values[Math.min(index, values.length - 1)];
    index += 1;
    return value;
  };

  random.calls = () => index;

  return random;
};

const isOnBoundary = ({ x, y }, { width, height }) =>
  x === -MARGIN || y === -MARGIN || x === width + MARGIN || y === height + MARGIN;

describe('getRandomBoundaryPoint — kenar ağırlıkları (%40 alt, %20 üst, %20 sağ, %20 sol)', () => {
  test('kenar seçimi ve koordinatlar', () => {
    const cases = [
      [0, { x: 200, y: BOTTOM_Y }],
      [0.399, { x: 200, y: BOTTOM_Y }],
      [0.4, { x: 200, y: TOP_Y }],
      [0.599, { x: 200, y: TOP_Y }],
      [0.6, { x: 400 + MARGIN, y: 400 }],
      [0.799, { x: 400 + MARGIN, y: 400 }],
      [0.8, { x: -MARGIN, y: 400 }],
      [0.999, { x: -MARGIN, y: 400 }],
    ];

    for (const [roll, expected] of cases) {
      expect(getRandomBoundaryPoint(VIEWPORT, scriptedRandom(roll, 0.5))).toEqual(expected);
    }
  });
});

describe('pickTargetPoint — sınırlı deneme (eski sınırsız `while` döngüsünün yerine)', () => {
  test('yeterince uzak ilk adayı kullanır', () => {
    const start = { x: 0, y: BOTTOM_Y };
    const random = scriptedRandom(0.8, 0.5); // sol kenar, y = 400 → |dy| = 445 ≥ 120

    expect(pickTargetPoint(start, VIEWPORT, random)).toEqual({ x: -MARGIN, y: 400 });
    expect(random.calls()).toBe(2); // tek aday yetti
  });

  test('adaylar hep doğuş noktasına düşse bile sonlu sayıda denemede döner', () => {
    // Kusurlu rastgelelik: her aday doğuş noktasının aynısı → uzaklık 0.
    // Eski sınırsız `while` döngüsünün bu durumda çıkışı YOKTU (aynı senaryo küçük bir
    // pencerede de olası): döngü sonlanmaz, JS iş parçacığı kilitlenir ve arayüz donar.
    // Artık deneme sayısı sınırlı → fonksiyon her koşulda döner.
    const start = { x: 0, y: BOTTOM_Y };
    const random = scriptedRandom(0, 0);

    expect(pickTargetPoint(start, VIEWPORT, random)).toEqual(start);
    expect(random.calls()).toBe(MAX_TARGET_ATTEMPTS * 2); // deneme sınırı aşılmadı
  });

  test('hiçbiri yeterince uzak değilse en iyi adayı döndürür', () => {
    const start = { x: 0, y: BOTTOM_Y };
    // Sırayla: 0 px (en kötü) · 100 px · 50 px → en iyisi 100 px'lik aday.
    const random = scriptedRandom(0, 0, 0, 0.25, 0, 0.125);

    expect(pickTargetPoint(start, VIEWPORT, random)).toEqual({ x: 100, y: BOTTOM_Y });
    expect(random.calls()).toBe(MAX_TARGET_ATTEMPTS * 2);
  });
});

describe('createParticle', () => {
  test('ilk açılışta ekranın içine dağılır, hedefi kenardadır', () => {
    // Sıra: kelime · boyut · startX · startY · hedef (kenar + koordinat) · hız
    const random = scriptedRandom(0, 0.5, 0.5, 0.5, 0.8, 0.5, 0.5);
    const particle = createParticle(true, VIEWPORT, random);

    expect(particle.char).toBe(SINGLE_HANZI_WORDS[0].hanzi);
    expect(particle.size).toBe(39); // floor(0.5 * 14) + 32
    expect(particle.startX).toBe(200); // 0.5 * (400 - 60) + 30
    expect(particle.startY).toBe(400); // 0.5 * (800 - 60) + 30
    expect(particle.endX).toBe(-MARGIN);
    expect(particle.endY).toBe(400);

    const distance = Math.hypot(particle.endX - particle.startX, particle.endY - particle.startY);
    expect(distance).toBe(245);
    expect(particle.duration).toBeCloseTo((distance / 24) * 1000); // hız = 0.5 * 8 + 20
    expect(isOnBoundary({ x: particle.endX, y: particle.endY }, VIEWPORT)).toBe(true);
  });

  test('sonraki doğuşlar kenardan başlar, hedef yeterince uzaktır', () => {
    // Sıra: kelime · boyut · doğuş (kenar + koordinat) · hedef (kenar + koordinat) · hız
    const random = scriptedRandom(0, 0, 0, 0.5, 0.8, 0.5, 0.999);
    const particle = createParticle(false, VIEWPORT, random);

    expect(particle.startX).toBe(200); // alt kenar, x = 0.5 * 400
    expect(particle.startY).toBe(BOTTOM_Y);
    expect(particle.endX).toBe(-MARGIN); // hedef: sol kenar
    expect(particle.endY).toBe(400);
    expect(isOnBoundary({ x: particle.startX, y: particle.startY }, VIEWPORT)).toBe(true);
    expect(
      Math.max(Math.abs(particle.endX - particle.startX), Math.abs(particle.endY - particle.startY))
    ).toBeGreaterThanOrEqual(120);
  });

  test('boyut ve süre aralıkları korunur', () => {
    for (let i = 0; i < 200; i++) {
      const particle = createParticle(false, VIEWPORT);
      const distance = Math.hypot(
        particle.endX - particle.startX,
        particle.endY - particle.startY
      );

      expect(particle.size).toBeGreaterThanOrEqual(MIN_SIZE);
      expect(particle.size).toBeLessThanOrEqual(MAX_SIZE);
      expect(Number.isInteger(particle.size)).toBe(true);
      expect(particle.duration).toBeGreaterThanOrEqual((distance / MAX_SPEED) * 1000);
      expect(particle.duration).toBeLessThanOrEqual((distance / MIN_SPEED) * 1000);
    }
  });

  test('çok küçük pencerede ve kusurlu rastgelelikte de sonlu sürede biter', () => {
    const tiny = { width: 200, height: 120 };
    // Tüm adaylar aynı noktaya düşer → hedef seçimi sınıra dayanır ama asla asılı kalmaz.
    const random = scriptedRandom(0, 0);

    const particle = createParticle(false, tiny, random);

    // 2 (kelime + boyut) + 2 (doğuş) + denemeler + 1 (hız) çağrıdan fazlası olamaz.
    expect(random.calls()).toBeLessThanOrEqual(2 + 2 + MAX_TARGET_ATTEMPTS * 2 + 1);
    expect(isOnBoundary({ x: particle.endX, y: particle.endY }, tiny)).toBe(true);
    expect(particle.duration).toBeGreaterThanOrEqual(0);
  });

  test('kelime listesi dışına düşen indeks yedek karaktere döner (çökmez)', () => {
    const particle = createParticle(true, VIEWPORT, scriptedRandom(1, 0));

    expect(typeof particle.char).toBe('string');
    expect(particle.char.length).toBe(1);
  });
});

describe('SINGLE_HANZI_WORDS', () => {
  test('tek kaynaktan (hsk1) gelir ve yalnızca tek karakterlik Hanzi içerir', () => {
    expect(SINGLE_HANZI_WORDS.length).toBeGreaterThan(0);

    for (const word of SINGLE_HANZI_WORDS) {
      expect(typeof word.hanzi).toBe('string');
      expect(word.hanzi.length).toBe(1);
    }
  });
});
