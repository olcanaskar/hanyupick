import AsyncStorage from '@react-native-async-storage/async-storage';

const STATS_STORAGE_KEY = '@hsk_user_stats';

// Mod eşleştirmesi: Header'dan gelen tüm mod varyasyonlarını yakalar
const getCategoryFromMode = (mode) => {
  if (mode === 'hanzi-to-pinyin' || mode === 'pinyin-to-hanzi') return 'hanzi_pinyin';
  if (
    mode === 'hanzi-to-meaning' || 
    mode === 'meaning-to-hanzi' || 
    mode === 'hanzi-to-en' || 
    mode === 'en-to-hanzi'
  ) {
    return 'hanzi_meaning';
  }
  if (
    mode === 'pinyin-to-meaning' || 
    mode === 'meaning-to-pinyin' || 
    mode === 'pinyin-to-en' || 
    mode === 'en-to-pinyin'
  ) {
    return 'pinyin_meaning';
  }
  return 'hanzi_pinyin';
};

// Bugünün tarih formatı: YYYY-MM-DD
const getTodayDateString = () => new Date().toISOString().split('T')[0];

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
const performRecordAnswer = async ({ wordId, level, mode, isCorrect }) => {
  const data = await getStats();
  const category = getCategoryFromMode(mode);
  const today = getTodayDateString();

  // Kelime objesi yoksa başlat
  if (!data.wordStats[wordId]) {
    data.wordStats[wordId] = {
      level,
      categories: {
        hanzi_pinyin: { streak: 0, wrongStreak: 0 },
        hanzi_meaning: { streak: 0, wrongStreak: 0 },
        pinyin_meaning: { streak: 0, wrongStreak: 0 },
      },
    };
  }

  const currentCat = data.wordStats[wordId].categories[category];

  if (isCorrect) {
    currentCat.streak += 1;
    currentCat.wrongStreak = 0; // Doğru bilinince yanlış serisi kırılır
  } else {
    currentCat.wrongStreak += 1;
    currentCat.streak = 0; // Yanlış yapılınca doğru serisi sıfırlanır
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
    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
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
let statsWriteQueue = Promise.resolve();

export const recordAnswer = (payload) => {
  statsWriteQueue = statsWriteQueue
    .then(() => performRecordAnswer(payload))
    .catch((error) => {
      console.error('İstatistik kaydedilemedi:', error);
    });
  return statsWriteQueue;
};