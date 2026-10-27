import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDateKey, addDays } from './dateUtils';
import { CATEGORIES, getCategory } from './modes';
// Kelime id'si türü TEK kaynaktan gelir: `services/wordRepository.ts` (HSK id'leri
// sayı, özel deste id'leri 'custom_...' metni). Buradaki kayıtlar ikisini de taşır.
import type { WordId } from './wordRepository';

export type { WordId };

const STATS_STORAGE_KEY = '@hsk_user_stats';

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
// Bir kategorideki (bkz. modes.ts) doğru/yanlış serisi. Alanlar eksik olabilir:
// diskteki kayıt her zaman bu şekille yazılmaz (elle düzenlenmiş/eski veri) ve
// okuma tarafı her alanı `|| 0` ile korur.
export type CategoryStat = { streak?: number; wrongStreak?: number };
// Depodaki tam kayıt (yazma tarafı hep bu şekli üretir).
export type WordStat = { categories: Record<string, CategoryStat> };
// Okuma tarafı: kaydı olmayan ya da eksik kayıtlar da bu tiple sorgulanır.
export type WordStatLike = { categories?: Record<string, CategoryStat> };
export type DailyStat = { correct: number; wrong: number };
export type StatsStreak = { current: number; lastDate: string | null };
// `@hsk_user_stats` kaydının tek şekli.
export type StatsData = {
  wordStats: Record<string, WordStat>;
  dailyStats: Record<string, DailyStat>;
  streak: StatsStreak;
};

const createEmptyStats = (): StatsData => ({
  wordStats: {},
  dailyStats: {},
  streak: { current: 0, lastDate: null },
});

// Yeni kelime kaydı için boş kategori tablosu. Kategoriler artık modes.js'ten gelir
// (Faz 3.3): eskiden üç anahtar burada elle yazılıyordu ve mod→kategori eşlemesi
// 4 tanesi var olmayan 10 mod adı içeriyordu.
const createEmptyCategories = (): Record<string, CategoryStat> =>
  CATEGORIES.reduce<Record<string, CategoryStat>>((acc, category) => {
    acc[category] = { streak: 0, wrongStreak: 0 };
    return acc;
  }, {});

// --- Ustalık / sorun kuralları (Faz 3.6b) -------------------------------------
//
// Bu kurallar eskiden StatsModal içinde yereldi. Özel deste kelimeleri de
// istatistiğe girdiği için tek kaynağa taşındı: kural id'nin türüne bakmaz,
// HSK id'leri (sayı) ve özel deste id'leri ('custom_...' metni) aynı `wordStats`
// tablosunda aynı şekilde tutulur.
export const MASTERY_STREAK = 3;

// Kelime, TÜM kategorilerde 3'lük doğru seriye ulaştıysa ustalaşılmıştır.
export const isMastered = (wordStat?: WordStatLike | null): boolean =>
  CATEGORIES.every((category) => (wordStat?.categories?.[category]?.streak || 0) >= MASTERY_STREAK);

// HERHANGİ bir kategoride 3'lük yanlış seri varsa kelime sorunludur.
export const isProblematic = (wordStat?: WordStatLike | null): boolean =>
  CATEGORIES.some(
    (category) => (wordStat?.categories?.[category]?.wrongStreak || 0) >= MASTERY_STREAK
  );

// Bir havuzun (HSK seviyesi ya da özel deste) ustalık oranı.
export const getMastery = (
  pool: { id: WordId }[] | null | undefined,
  wordStats: Record<string, WordStatLike> = {}
): { count: number; percent: number } => {
  if (!pool || pool.length === 0) return { count: 0, percent: 0 };

  const count = pool.filter((word) => isMastered(wordStats[word.id])).length;
  return { count, percent: Math.round((count / pool.length) * 100) };
};

// Not: gün anahtarları artık yerel saatle ve tek yerden (services/dateUtils.js) üretilir.

// 1. Tüm İstatistik Verisini Getir
export const getStats = async (): Promise<StatsData> => {
  try {
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as StatsData) : createEmptyStats();
  } catch {
    return createEmptyStats();
  }
};

// 2. Tek bir cevabı istatistiğe işler.
//    Doğrudan çağrılmaz; aşağıdaki kuyruk üzerinden sıralı çalışır.
const performRecordAnswer = async ({
  wordId,
  mode,
  isCorrect,
}: {
  wordId: WordId;
  mode: string;
  isCorrect: boolean;
}): Promise<void> => {
  const data = await getStats();
  const category = getCategory(mode); // tanınmayan modda __DEV__ uyarısı + null
  const today = getDateKey();

  // Kelime kaydı yalnızca mod TANINIYORSA oluşturulur/güncellenir: tanınmayan bir
  // modda istatistiği sessizce yanlış kategoriye yazmak ya da boş bir kayıt
  // bırakmak yerine yalnızca günlük/streak kaydı yapılır (getCategory __DEV__'de uyarır).
  //
  // Not: kayda artık `level` yazılmıyor. Alan hiçbir yerde okunmuyordu ve YANLIŞ
  // veri tutuyordu: QuizScreen oturumun seviyesini geçiyordu ('review', 'mixed',
  // 'custom_X'). Bir kelimenin gerçek seviyesi gerekiyorsa tek kaynak:
  // wordRepository.getLevelFromWordId(id).
  if (category) {
    if (!data.wordStats[wordId]) {
      data.wordStats[wordId] = { categories: createEmptyCategories() };
    }

    const categories = data.wordStats[wordId].categories;
    if (!categories[category]) categories[category] = { streak: 0, wrongStreak: 0 };

    const currentCat = categories[category];
    if (isCorrect) {
      // Alanlar diskteki eski kayıtlarda eksik olabilir (bkz. CategoryStat).
      currentCat.streak = (currentCat.streak || 0) + 1;
      currentCat.wrongStreak = 0; // Doğru bilinince yanlış serisi kırılır
    } else {
      currentCat.wrongStreak = (currentCat.wrongStreak || 0) + 1;
      currentCat.streak = 0; // Yanlış yapılınca doğru serisi sıfırlanır
    }
  }

  // Günlük aktivite güncelle
  if (!data.dailyStats[today]) {
    data.dailyStats[today] = { correct: 0, wrong: 0 };
  }
  if (isCorrect) data.dailyStats[today].correct += 1;
  else data.dailyStats[today].wrong += 1;

  // Streak (seri) kontrolü
  if (!data.streak.lastDate) {
    data.streak.current = 1;
    data.streak.lastDate = today;
  } else if (data.streak.lastDate !== today) {
    const yesterday = getDateKey(addDays(new Date(), -1));
    if (data.streak.lastDate === yesterday) {
      data.streak.current += 1;
    } else {
      data.streak.current = 1; // Gün atlandıysa streak sıfırdan başlar
    }
    data.streak.lastDate = today;
  }

  // Diske geri yaz
  await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
};

// 3. Cevap kayıtlarını sıraya alan kuyruk.
//    Aynı anda gelen iki cevabın aynı anlık görüntüyü okuyup birbirinin yazımını
//    ezmesini (lost update / yarış koşulu) engeller: her yazma, bir önceki bitince başlar.
//    Kuyruk aynı zamanda istatistik SİLME işlerini de taşır (aşağıdaki removeWordStatsByIds).
/** Kuyruk: `unknown` — biriken işlerin dönüş tipleri farklı (void/boolean). */
let statsWriteQueue: Promise<unknown> = Promise.resolve();

export const recordAnswer = (payload: { wordId: WordId; mode: string; isCorrect: boolean }) => {
  statsWriteQueue = statsWriteQueue
    .then(() => performRecordAnswer(payload))
    .catch((error) => {
      console.error('İstatistik kaydedilemedi:', error);
    });
  return statsWriteQueue;
};

// 4. Belirli kelime id'lerinin istatistiğini siler (Faz 4: silinen destenin izleri).
//
// Neden gerekli: bir özel deste silindiğinde `wordStats` içindeki `custom_...` kayıtları
// kalırsa "sorunlu kelimeler" listesi var olmayan bir kelimeyi göstermeye devam eder.
//
// Yazma, cevap kayıtlarıyla AYNI kuyruk üzerinden yapılır: aksi halde tam o anda işlenen
// bir cevap (recordAnswer) diskteki eski kopyayı geri yazar ve temizlik kaybolurdu.
//
// Günlük aktivite ve streak KORUNUR: onlar kelimeye değil güne bağlıdır.
// Dönen değer: temizlik gerçekten bir şey sildiyse true.
export const removeWordStatsByIds = (wordIds: WordId[] | WordId) => {
  const ids = Array.isArray(wordIds) ? wordIds : [];
  if (ids.length === 0) return statsWriteQueue;

  const performRemove = async () => {
    const data = await getStats();
    const wordStats = data.wordStats || {};
    let changed = false;

    for (const id of ids) {
      // JSON'dan okunan anahtarlar metindir; sayısal id de metne çevrilerek aranır.
      const key = String(id);
      if (Object.prototype.hasOwnProperty.call(wordStats, key)) {
        delete wordStats[key];
        changed = true;
      }
    }

    if (changed) await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
    return changed;
  };

  statsWriteQueue = statsWriteQueue.then(performRemove).catch((error) => {
    console.error('İstatistik silinemedi:', error);
    return false;
  });

  return statsWriteQueue;
};

// 6. Bir kelimenin id'si değiştiğinde istatistiğini hedef id'ye taşır (Faz 4 + Faz 6).
//
// İki durumda gerekir (bkz. services/wordIdMigrations.js): (a) hsk5'te aynı kelime iki id
// ile bulunuyordu (Faz 4) ve (b) hsk5 kuyruğu resmî listeyle değiştiğinde kelime başka bir
// id'ye (ya da HSK 6'ya) geçti (Faz 6). Her iki durumda kayıtlar TEK kelimeyi gösterdiği
// için kategori serileri TOPLANIR: kullanıcı o kelimeyi toplam kaç kez doğru/yanlış
// bilmişse o kadar sayılır.
//
// Bilinen sınır: araya karışık doğru/yanlış girmişse toplam, gerçek "kesintisiz seri"
// uzunluğundan uzun olabilir. Yalnızca id'si değişen kelimeler için geçerli olduğundan
// kabul edilen bir ödündür (alternatifi veri kaybıdır).
export const mergeWordStatsRecords = (
  target?: WordStatLike | null,
  source?: WordStatLike | null
): WordStat => {
  const categories: Record<string, CategoryStat> = { ...((target && target.categories) || {}) };
  const sourceCategories: Record<string, CategoryStat> = (source && source.categories) || {};

  for (const [category, stat] of Object.entries(sourceCategories)) {
    const current = categories[category] || { streak: 0, wrongStreak: 0 };
    categories[category] = {
      streak: (current.streak || 0) + (stat && stat.streak ? stat.streak : 0),
      wrongStreak: (current.wrongStreak || 0) + (stat && stat.wrongStreak ? stat.wrongStreak : 0),
    };
  }

  // Kaydın diğer (varsa eski) alanları korunur.
  return { ...target, categories };
};

// `idMap`: silinen id (anahtar) → tutulan id (değer). Yazma kuyruğu üzerinden çalışır;
// taşınacak kayıt yoksa diske hiç yazılmaz (idempotent).
export const mergeWordStatsIds = (
  idMap: Record<string, WordId> | Record<number, WordId> | null | undefined
) => {
  // JSON'dan gelen anahtarlar metindir; id'ler tabloda sayı ya da 'custom_...' olabilir.
  const pairs: [string, string][] =
    idMap && typeof idMap === 'object' ? (Object.entries(idMap) as [string, string][]) : [];
  if (pairs.length === 0) return statsWriteQueue;

  const performMerge = async () => {
    const data = await getStats();
    const wordStats = data.wordStats || {};
    let changed = false;

    for (const [fromId, toId] of pairs) {
      const source = wordStats[fromId];
      if (!source) continue;

      const target = wordStats[toId];
      wordStats[toId] = target ? mergeWordStatsRecords(target, source) : source;
      delete wordStats[fromId];
      changed = true;
    }

    if (changed) await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(data));
    return changed;
  };

  statsWriteQueue = statsWriteQueue.then(performMerge).catch((error) => {
    console.error('İstatistik göçü uygulanamadı:', error);
    return false;
  });

  return statsWriteQueue;
};

// 5. TÜM ilerlemeyi siler (Faz 4: kalıcı "İlerlemeyi sıfırla" butonu).
//
// Kelime istatistikleri, günlük aktivite ve streak birlikte sıfırlanır; diske boş kayıt
// yazılır (`getStats` varsayılanıyla aynı şekil). Cevap kayıtlarıyla AYNI kuyruk
// kullanılır: sırada bekleyen bir cevap varsa önce o işlenir, sıfırlama ondan SONRA
// yazılır → sıfırlama her zaman "en son söz" olur.
export const clearAllStats = () => {
  const performClear = async () => {
    const empty = {
      wordStats: {},
      dailyStats: {},
      streak: { current: 0, lastDate: null },
    };
    await AsyncStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(empty));
    return empty;
  };

  statsWriteQueue = statsWriteQueue.then(performClear).catch((error) => {
    console.error('İlerleme sıfırlanamadı:', error);
    return false;
  });

  return statsWriteQueue;
};