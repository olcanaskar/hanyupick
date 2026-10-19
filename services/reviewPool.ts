// Yanlış cevaplanan kelimelerin havuzu ("review pool") için TEK veri şekli (Faz 3.2).
//
// Neden ayrı dosya: Eskiden her kayıt kelimenin TAM kopyasını taşıyordu
// (`{ ...word, word, wrongMode }`) — yani aynı kelime hem düzleştirilmiş alanlar
// hem de `word` alt-nesnesi olarak iki kez saklanıyordu. Bu üç soruna yol açıyordu:
//
//   1. Bayatlama: kopya, kaydedildiği andaki verinin fotoğrafıydı. `data/hsk*.json`
//      içinde bir anlam/pinyin düzeltildiğinde Review eski metni göstermeye devam
//      ediyor, üstelik şık üretimi (quizBuilder) bayat alanlarla çalışıyordu.
//   2. Dağınık şekil: aynı dizide `word` alanlı ve alansız kayıtlar bir arada
//      duruyordu; UI kodu her yerde `item.word || item` / `item.id || item.word?.id`
//      diye savunma yapmak zorundaydı.
//   3. Gereksiz boyut: kayıt başına ~183 bayt yerine ~45 bayt yeterli (~%75 küçülme).
//
// Yeni şekil:
//   HSK kelimesi  → { wordId: <sayı>,         wrongMode }            (kanonik kaynak)
//   Özel deste    → { wordId: <'custom_...'>, wrongMode, snapshot }  (kanonik kaynağı yok)
//
// Özel deste kelimelerinin id'si `data/hsk*.json` içinde BULUNMAZ (bkz. importService);
// üstelik id'ler `index` tabanlı üretilebildiği için aynı isimle farklı bir dosya
// yeniden içe aktarılırsa aynı id BAŞKA bir kelimeyi gösterebilir. Bu yüzden yalnızca
// bu kayıtlar kendi metnini yanında taşır: deste silinse bile doğru kelime görünür.
// Sayısal id'li kayıtta `snapshot` ASLA bulunmaz (test bunu garanti eder).
//
// UI'dan bağımsız: React import etmez; tüm fonksiyonlar saf ve test edilebilir.

import { getWordById } from './wordRepository';
import type { WordId } from './wordRepository';
import { DEFAULT_MODE } from './modes';

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
//
// Kanonik kayıt şekli (dosya başındaki karar): yalnızca `wordId` + `wrongMode`;
// `snapshot` SADECE özel deste kelimelerinde bulunur (kanonik kaynağı yoktur).
export type ReviewSnapshot = { hanzi: string; pinyin: string; meaning: string };
export type ReviewEntry = { wordId: WordId; wrongMode: string; snapshot?: ReviewSnapshot };
// Okuma tarafı: modu eksik/bozuk (hatta hiç olmayan) kayıtlar da gelebilir —
// `getWrongMode` bunları varsayılan moda düşürür (Faz 3.3 öncesi kayıtlar).
export type ReviewEntryInput = { wordId: WordId; wrongMode?: string; snapshot?: ReviewSnapshot };
// Havuz kaydından çözülen gösterilebilir kelime: HSK kaydı (sayı id) ya da özel
// deste kelimesinin anlık görüntüsü (metin id) — ikisi de aynı alanları taşır.
export type ResolvedWord = { id: WordId; hanzi: string; pinyin: string; meaning: string };

// Modu belirtilmemiş eski kayıtlar için varsayılan mod.
// Tek kaynak: services/modes.js (Faz 3.3).
export { DEFAULT_MODE };

const CUSTOM_ID_PREFIX = 'custom_';

// Özel deste kelimesi mi? (HSK id'leri sayısal, özel desteler string.)
export const isCustomWordId = (id: unknown): id is string =>
  typeof id === 'string' && id.startsWith(CUSTOM_ID_PREFIX);

// Kaydın modu; alan yoksa/bozuksa varsayılana düşer.
// Parametre yalnızca `wrongMode` okur: kayıt kısmen bozuk olabilir (`{}` dahil).
export const getWrongMode = (entry?: { wrongMode?: string } | null): string =>
  (entry && entry.wrongMode) || DEFAULT_MODE;

// id gerçekten kullanılabilir bir sayı mı? (NaN/Infinity dışlanır.)
const isUsableNumberId = (id: unknown): id is number =>
  typeof id === 'number' && Number.isFinite(id);

// Gösterim için gereken üç alan. Biri eksikse kayıt kullanılamaz sayılır.
const normalizeSnapshot = (source: unknown): ReviewSnapshot | null => {
  if (!source || typeof source !== 'object') return null;
  const { hanzi, pinyin, meaning } = source as Partial<ReviewSnapshot>;
  if (!hanzi || !pinyin || !meaning) return null;
  return { hanzi, pinyin, meaning };
};

// Tek bir kaydı kanonik şekle çevirir; çevrilemeyen (bozuk) kayıt için null.
// Hem yeni şekli hem iki eski şekli kabul eder ve idempotenttir.
//
// `raw` bilinçli olarak `any`: girdi diskteki rastgele/eski bir kayıttır ve bu
// fonksiyonun işi zaten onu doğrulamak (bu yüzden tipli bir parametre yalan olurdu).
export const toCanonicalEntry = (raw: any): ReviewEntry | null => {
  if (!raw || typeof raw !== 'object') return null;

  const wrongMode = getWrongMode(raw);

  // 1) Yeni şekil: zaten `wordId` taşır.
  if (raw.wordId !== undefined) {
    if (isCustomWordId(raw.wordId)) {
      const snapshot = normalizeSnapshot(raw.snapshot);
      return snapshot ? { wordId: raw.wordId, wrongMode, snapshot } : null;
    }
    return isUsableNumberId(raw.wordId) ? { wordId: raw.wordId, wrongMode } : null;
  }

  // 2) Eski şekiller: `{ ...word, wrongMode }` veya `{ ...word, word, wrongMode }`.
  const legacyWord = raw.word && typeof raw.word === 'object' ? raw.word : null;
  const wordId = legacyWord && legacyWord.id !== undefined ? legacyWord.id : raw.id;
  if (wordId === undefined || wordId === null) return null;

  if (isCustomWordId(wordId)) {
    const snapshot = normalizeSnapshot(legacyWord || raw);
    return snapshot ? { wordId, wrongMode, snapshot } : null;
  }
  return isUsableNumberId(wordId) ? { wordId, wrongMode } : null;
};

// Havuz kaydını gösterilebilir kelimeye çevirir; çözülemezse null.
// - Sayısal id  → kanonik veri (her zaman güncel; kopya yok, bayatlama yok).
// - Özel deste  → kaydın yanında taşıdığı anlık görüntü (deste silinse de çalışır).
export const resolveReviewWord = (entry?: ReviewEntry | null): ResolvedWord | null => {
  if (!entry) return null;

  if (isCustomWordId(entry.wordId)) {
    const snapshot = normalizeSnapshot(entry.snapshot);
    return snapshot ? { id: entry.wordId, ...snapshot } : null;
  }

  return getWordById(entry.wordId) || null;
};

// Yanlış cevaplanan kelimeden yeni havuz kaydı üretir; üretilemezse null.
// Özel deste kelimeleri kendi metnini yanında taşır (bkz. dosya başı).
export const makeReviewEntry = (
  word: (Partial<ReviewSnapshot> & { id?: WordId }) | null | undefined,
  wrongMode: string = DEFAULT_MODE
): ReviewEntry | null => {
  if (!word || word.id === undefined || word.id === null) return null;

  if (isCustomWordId(word.id)) {
    const snapshot = normalizeSnapshot(word);
    return snapshot ? { wordId: word.id, wrongMode, snapshot } : null;
  }
  return isUsableNumberId(word.id) ? { wordId: word.id, wrongMode } : null;
};

const entryKey = (wordId: WordId, wrongMode: string): string => `${wordId}::${wrongMode}`;

// AsyncStorage'dan gelen ham diziyi kanonik havuza çevirir (tek seferlik göç).
// - Tanınmayan/bozuk kayıtlar atlanır.
// - Çözülemeyen kayıtlar (örn. artık var olmayan sayısal id) atlanır; böylece
//   "ana ekranda N bekliyor yazıp Review'da hiç soru çıkmaması" durumu oluşmaz.
// - Aynı (wordId, wrongMode) çifti tekilleşir; ilk görülen kayıt ve SIRA korunur.
// - `idMap` verilirse (silinen id → tutulan id) kayıtlar ÖNCE yeni id'ye taşınır. Bu
//   adım çözümlemeden ÖNCE olmak zorundadır: birleştirilen eski id artık veride
//   bulunmadığı için kayıt aksi halde sessizce düşerdi (bkz. services/wordIdMigrations.js).
export const normalizeReviewPool = (
  raw: unknown,
  idMap: Record<string | number, WordId> | null = null
): ReviewEntry[] => {
  if (!Array.isArray(raw)) return [];

  const seen = new Set<string>();
  const result: ReviewEntry[] = [];

  for (const item of raw) {
    let entry = toCanonicalEntry(item);
    if (!entry) continue;

    if (idMap && idMap[entry.wordId] !== undefined) {
      entry = { ...entry, wordId: idMap[entry.wordId] };
    }

    if (!resolveReviewWord(entry)) continue;

    const key = entryKey(entry.wordId, entry.wrongMode);
    if (seen.has(key)) continue;

    seen.add(key);
    result.push(entry);
  }

  return result;
};

// Verilen moda ait kayıtlar.
export const filterByMode = (
  pool: ReviewEntryInput[] | null | undefined,
  mode: string
): ReviewEntryInput[] =>
  (Array.isArray(pool) ? pool : []).filter((entry) => getWrongMode(entry) === mode);

// Verilen moda ait kayıt sayısı.
export const countForMode = (pool: ReviewEntryInput[] | null | undefined, mode: string): number =>
  filterByMode(pool, mode).length;

// Aynı kelime + mod zaten havuzda mı?
export const hasEntry = (
  pool: ReviewEntryInput[] | null | undefined,
  wordId: WordId,
  wrongMode: string
): boolean => filterByMode(pool, wrongMode).some((entry) => entry.wordId === wordId);

// Kaydı ekler. Zaten varsa AYNI diziyi döner (gereksiz state/yazma tetiklenmez).
export const addEntry = <T extends ReviewEntryInput>(
  pool: T[] | null | undefined,
  entry: T | null | undefined
): T[] => {
  const list = Array.isArray(pool) ? pool : [];
  if (!entry) return list;
  if (hasEntry(list, entry.wordId, entry.wrongMode)) return list;
  return [...list, entry];
};

// Kelime + mod eşleşen kaydı siler. Eşleşme yoksa AYNI diziyi döner.
export const removeEntry = <T extends ReviewEntryInput>(
  pool: T[] | null | undefined,
  wordId: WordId,
  wrongMode: string
): T[] => {
  const list = Array.isArray(pool) ? pool : [];
  const next = list.filter(
    (entry) => !(entry.wordId === wordId && getWrongMode(entry) === wrongMode)
  );
  return next.length === list.length ? list : next;
};

// Verilen kelime id'lerine ait TÜM kayıtları (her modda) havuzdan çıkarır.
// Kullanım: bir özel deste silindiğinde o desteye ait yanlışlar da düşsün (Faz 4).
// Prefix eşleştirmesi YERİNE tam id listesi verilir: "Ders" destesinin öneki
// ("custom_Ders_"), "Ders_1" destesinin kelimeleriyle de eşleşirdi.
// Eşleşme yoksa AYNI diziyi döner (gereksiz yazma/state tetiklenmez).
export const removeWordIds = (
  pool: ReviewEntry[] | null | undefined,
  wordIds: Iterable<WordId> | null | undefined
): ReviewEntry[] => {
  const list = Array.isArray(pool) ? pool : [];
  const ids: Set<WordId> =
    wordIds instanceof Set ? wordIds : new Set(Array.isArray(wordIds) ? wordIds : []);
  if (ids.size === 0) return list;

  const next = list.filter((entry) => !ids.has(entry && entry.wordId));
  return next.length === list.length ? list : next;
};
