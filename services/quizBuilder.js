// Soru seçimini ve şıkları (doğru cevap + çeldiriciler) oluşturan saf yardımcılar.
//
// Neden ayrı dosya: Bu mantık daha önce QuizScreen içinde gömülüydü ve yalnızca `id`
// ile eleme yapıyordu. Aynı hanzi/pinyin/anlam birden çok kayıtta geçtiği için (bkz.
// data/hsk*.json) ekranda aynı şık iki kez çıkabiliyor ya da bir çeldirici de doğru
// cevabı verebiliyordu. Burada içerik bazlı eleme yapılıyor ve mantık test edilebilir.
//
// UI'dan bağımsız: React import etmez, havuzlar dışarıdan verilir.
//
// Faz 4.2: şık toplama havuzu KOPYALAMAZ (rastgele başlangıçlı dairesel tarama) —
// bkz. `collectFromPool`.

// Bir kelimenin şık olarak gösterilebilecek içerik alanları.
const WORD_FIELDS = ['hanzi', 'pinyin', 'meaning'];

// Havuzdan rastgele bir kelime seçer; havuzda birden fazla kelime varsa bir öncekiyle
// AYNI olanı atlar. Küçük bir destede (5 kelime) `Math.random` ardışık iki soruda aynı
// kartı ~1/5 olasılıkla getiriyordu ve bu kullanıcıya "takıldı" hissi veriyordu.
//
// Tek kelimelik havuzda (ya da hepsi öncekiyle aynıysa) mecburen o kelime döner.
//
// Faz 4.2: eskiden her soruda `pool.filter(...)` ile havuzun tamamının kopyası
// çıkarılıyordu (o gün hsk5 seviyesinde 1.300 eleman). Artık reddetme ile örnekleme
// yapılır: tipik durumda tek bir rastgele deneme yeter (kabul edilen adaylar
// üzerinde dağılım yine tekdüzedir), tam tarama yalnızca çok şanssız durumda
// yedek olarak çalışır.
const MAX_PICK_ATTEMPTS = 12;

export const pickWord = (pool, previousId = null) => {
  if (!pool || pool.length === 0) return null;
  if (pool.length === 1) return pool[0];

  for (let attempt = 0; attempt < MAX_PICK_ATTEMPTS; attempt++) {
    const candidate = pool[Math.floor(Math.random() * pool.length)];
    if (candidate.id !== previousId) return candidate;
  }

  // 12 denemenin hepsi önceki kelimeye denk geldi (ya da tek farklı aday kalmadı):
  // kopya çıkarmadan ilk farklı kelimeye düş.
  return pool.find((word) => word.id !== previousId) || pool[0];
};

// Fisher-Yates karıştırma. (Array.prototype.sort(() => 0.5 - Math.random()) yanlı
// sonuç üretir.) Girdiyi değiştirmez, yeni dizi döndürür.
export const shuffle = (items) => {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Aday kelime, daha önce seçilmiş bir şıkla (veya doğru cevapla) hanzi, pinyin ya da
// anlam alanlarından herhangi birini paylaşıyorsa çeldirici olamaz.
const hasConflict = (word, blockedValues) =>
  WORD_FIELDS.some((field) => word[field] && blockedValues.has(word[field]));

// Tek bir havuzdan benzersiz çeldirici toplar.
//
// Faz 4.2: eskiden havuz `shuffle(pool)` ile TAMAMEN kopyalanıp karıştırılıyordu, yani
// her soruda havuzun bir kopyası çıkarılıyordu. Ölçülen maliyet (2.000 soru, aynı
// donanım; ölçüm HSK 6 eklenmeden önce, o günkü havuz boyutlarıyla): hsk5 havuzu
// (1.300) ~556 µs/soru, `ALL_WORDS` (2.500) ~1.294 µs/soru. Dairesel tarama ile
// maliyet havuz boyutundan neredeyse bağımsız hale geldi (~4 µs/soru). Güncel
// boyutlar: hsk5 1.283, ALL_WORDS 4.983 (HSK 6 eklendi).
// `ALL_WORDS` tek havuz olarak şu durumlarda kullanılır: özel deste soruları
// (`sameLevelPool` yok → `[ALL_WORDS]`) ve seviyesi bulunamayan inceleme kelimeleri.
// Artık rastgele bir noktadan başlanıp DAİRESEL taranıyor: tipik durumda ilk birkaç
// kelimede 3 çeldirici bulunur ve döngüden çıkılır (~4 µs/soru) → kopya yok,
// karıştırma yok, ek bellek O(1).
//
// Garantiler eskisiyle aynı: tarama tüm havuzu gördüğü için çakışmalı/küçük
// havuzlarda mümkün olan en fazla aday bulunur; rastgele başlangıç noktası da
// (karıştırmanın yerine) hangi adayların seçileceğini çeşitlendirir.
const collectFromPool = (pool, blockedValues, collected, limit, correctId) => {
  const poolSize = pool.length;
  const startIndex = Math.floor(Math.random() * poolSize);

  for (let offset = 0; offset < poolSize && collected.length < limit; offset++) {
    const word = pool[(startIndex + offset) % poolSize];

    if (!word || word.id === correctId) continue;
    if (collected.some((picked) => picked.id === word.id)) continue;
    if (hasConflict(word, blockedValues)) continue;

    WORD_FIELDS.forEach((field) => {
      if (word[field]) blockedValues.add(word[field]);
    });
    collected.push(word);
  }
};

// Doğru cevap + çeldiricilerden oluşan karışık şık listesi döndürür.
//
// `pools`: tercih sırasına göre havuz dizisi. Örn. bir HSK seviyesi için
// `[seviyeHavuzu, tumKelimeler]` → önce aynı seviyeden, yetmezse genelden tamamlar.
//
// Garanti: dönen şıkların hiçbiri bir diğeriyle hanzi, pinyin veya anlam alanını
// paylaşmaz (doğru cevap dahil).
export const buildOptions = (correctWord, pools, distractorCount = 3) => {
  const blockedValues = new Set(
    WORD_FIELDS.map((field) => correctWord[field]).filter(Boolean)
  );
  const distractors = [];

  for (const pool of pools) {
    if (distractors.length >= distractorCount) break;
    if (!pool || pool.length === 0) continue;
    collectFromPool(pool, blockedValues, distractors, distractorCount, correctWord.id);
  }

  return shuffle([...distractors, correctWord]);
};
