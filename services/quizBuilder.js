// Soru şıklarını (doğru cevap + çeldiriciler) oluşturan saf yardımcılar.
//
// Neden ayrı dosya: Bu mantık daha önce QuizScreen içinde gömülüydü ve yalnızca `id`
// ile eleme yapıyordu. Aynı hanzi/pinyin/anlam birden çok kayıtta geçtiği için (bkz.
// data/hsk*.json) ekranda aynı şık iki kez çıkabiliyor ya da bir çeldirici de doğru
// cevabı verebiliyordu. Burada içerik bazlı eleme yapılıyor ve mantık test edilebilir.
//
// UI'dan bağımsız: React import etmez, havuzlar dışarıdan verilir.

// Bir kelimenin şık olarak gösterilebilecek içerik alanları.
const WORD_FIELDS = ['hanzi', 'pinyin', 'meaning'];

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
const collectFromPool = (pool, blockedValues, collected, limit, correctId) => {
  for (const word of shuffle(pool)) {
    if (collected.length >= limit) return;
    if (word.id === correctId) continue;
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
