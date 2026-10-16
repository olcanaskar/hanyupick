import AsyncStorage from '@react-native-async-storage/async-storage';
import { getDateKey, addDays } from './dateUtils';
import { CATEGORIES, getCategory } from './modes';

const STATS_STORAGE_KEY = '@hsk_user_stats';

// Yeni kelime kaydı için boş kategori tablosu. Kategoriler artık modes.js'ten gelir
// (Faz 3.3): eskiden üç anahtar burada elle yazılıyordu ve mod→kategori eşlemesi
// 4 tanesi var olmayan 10 mod adı içeriyordu.
const createEmptyCategories = () =>
  CATEGORIES.reduce((acc, category) => {
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
export const isMastered = (wordStat) =>
  CATEGORIES.every((category) => (wordStat?.categories?.[category]?.streak || 0) >= MASTERY_STREAK);

// HERHANGİ bir kategoride 3'lük yanlış seri varsa kelime sorunludur.
export const isProblematic = (wordStat) =>
  CATEGORIES.some(
    (category) => (wordStat?.categories?.[category]?.wrongStreak || 0) >= MASTERY_STREAK
  );

// Bir havuzun (HSK seviyesi ya da özel deste) ustalık oranı.
export const getMastery = (pool, wordStats = {}) => {
  if (!pool || pool.length === 0) return { count: 0, percent: 0 };

  const count = pool.filter((word) => isMastered(wordStats[word.id])).length;
  return { count, percent: Math.round((count / pool.length) * 100) };
};

// Not: gün anahtarları artık yerel saatle ve tek yerden (services/dateUtils.js) üretilir.

// 1. Tüm İstatistik Verisini Getir
export const getStats = async () => {
  try {
    const raw = await AsyncStorage.getItem(STATS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : { wordStats: {}, dailyStats: {}, streak: { current: 0, lastDate: null } };
  } catch {
    return { wordStats: {}, dailyStats: {}, streak: { current: 0, lastDate: null } };
  }
};

// 2. Tek bir cevabı istatistiğe işler.
//    Doğrudan çağrılmaz; aşağıdaki kuyruk üzerinden sıralı çalışır.
const performRecordAnswer = async ({ wordId, mode, isCorrect }) => {
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
      currentCat.streak += 1;
      currentCat.wrongStreak = 0; // Doğru bilinince yanlış serisi kırılır
    } else {
      currentCat.wrongStreak += 1;
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
/** @type {Promise<unknown>} */
let statsWriteQueue = Promise.resolve();

export const recordAnswer = (payload) => {
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
export const removeWordStatsByIds = (wordIds) => {
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