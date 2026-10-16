import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_DECKS_KEY = '@custom_word_decks';

// Deste adından kelime id öneki üretir (alfanümerik olmayan her karakter '_').
//
// UYARI: Bu kural BİLEREK değiştirilmiyor. Üretilen id diskteki kayıtların
// kimliğidir; kural değişirse mevcut destelerin id'leri de değişir ve o destelere
// ait review-pool kayıtları (wordId ile aranır) çözülemez hale gelir → kullanıcının
// biriktirdiği yanlışlar sessizce düşer. Bu yüzden iki farklı adın aynı öneki
// ürettiği durum (örn. "Ders 1" ve "Ders_1", ya da Latin dışı adlar) sessizce
// kabul edilmez; aşağıdaki çakışma kontrolüyle reddedilir.
export const getDeckIdPrefix = (deckName) => String(deckName).replace(/[^a-zA-Z0-9]/g, '_');

// Özel deste kimliklerinin öneki. Kelime id'leri `custom_<önek>_<itemId>` biçimindedir;
// bir destenin SEVİYE kimliği ise `custom_<önek>` (aynı ad alanının kısası).
export const CUSTOM_ID_PREFIX = 'custom_';

// Seviye kimliği özel bir desteye mi ait? (Aksi halde 'hsk1'..'hsk5', 'mixed' ya da 'review'.)
export const isCustomDeckLevel = (level) =>
  typeof level === 'string' && level.startsWith(CUSTOM_ID_PREFIX);

// Yeni kelimelerin id'lerini üretir. `item.id` yalnızca kullanılabilir bir sayı ya da
// boş olmayan bir metin ise kullanılır, aksi halde dosyadaki sıraya düşer — yoksa
// id'si boş olan birden çok kelime `custom_X_` id'sini PAYLAŞIRDI.
const formatDeckWords = (deckName, validWords) => {
  const prefix = getDeckIdPrefix(deckName);

  return validWords.map((item, index) => {
    const rawId = item.id;
    const itemId =
      typeof rawId === 'number' || (typeof rawId === 'string' && rawId.trim() !== '')
        ? rawId
        : index;

    return {
      id: `custom_${prefix}_${itemId}`,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaning: item.meaning,
      level: item.level || 'custom',
    };
  });
};

// Yeni id'ler mevcut BAŞKA bir desteyle çakışıyor mu? (aynı ad hariç)
// Çakışma olursa iki deste aynı kelime id'lerini paylaşır; istatistik ve review
// kayıtları hangi desteye ait olduğu bilinmeden karışır.
const findIdConflict = (customDecks, words, ignoreName) => {
  const newIds = new Set(words.map((word) => word.id));

  return (
    Object.keys(customDecks).find(
      (name) =>
        name !== ignoreName &&
        Array.isArray(customDecks[name]) &&
        customDecks[name].some((word) => newIds.has(word.id))
    ) || null
  );
};

// 1. JSON dosyasını seçme ve okuma
export const pickAndParseJSON = async () => {
  try {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', '*/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return { success: false, reason: 'canceled' };

    const file = result.assets[0];

    // Android dosya okuma izin hatasını aşmak için fetch kullanımı
    const response = await fetch(file.uri);
    const fileContent = await response.text();

    let parsedWords = [];
    try {
      parsedWords = JSON.parse(fileContent);
    } catch {
      throw new Error('Invalid JSON format. Please select a valid JSON file.');
    }

    if (!Array.isArray(parsedWords)) {
      throw new Error('JSON file must contain an array of word objects.');
    }

    // hanzi, pinyin ve meaning kontrolü
    const validWords = parsedWords.filter(
      (item) => item && typeof item === 'object' && item.hanzi && item.pinyin && item.meaning
    );

    if (validWords.length === 0) {
      throw new Error('No valid word entries found. Ensure items contain "hanzi", "pinyin", and "meaning".');
    }

    // Dosya adından uzantıyı kırp (örn. "kelimeler.json" -> "kelimeler").
    const rawName = file.name ? file.name.replace(/\.[^/.]+$/, '').trim() : '';
    const defaultName = rawName || 'Custom Deck';

    return { success: true, defaultName, validWords };
  } catch (error) {
    console.error('Pick JSON error:', error);
    return { success: false, error: error.message };
  }
};

// 2. Özel isimle kaydetme
//
// Sessiz üzerine yazma YOKTUR: aynı adla bir deste varsa kaydetmez, `{ reason: 'exists' }`
// döner; çağıran (CustomDeckModal) kullanıcıdan onay alıp `{ overwrite: true }` ile
// tekrar çağırır. `overwrite: true` iken bile BAŞKA bir desteyle id çakışması olursa
// kayıt `{ reason: 'id-conflict' }` ile reddedilir.
export const saveCustomDeck = async (deckName, validWords, { overwrite = false } = {}) => {
  try {
    const name = String(deckName ?? '').trim();
    if (!name) return { success: false, reason: 'invalid-name' };

    const existingData = await AsyncStorage.getItem(CUSTOM_DECKS_KEY);
    const customDecks = existingData ? JSON.parse(existingData) : {};
    const alreadyExists = Object.prototype.hasOwnProperty.call(customDecks, name);

    if (alreadyExists && !overwrite) {
      return { success: false, reason: 'exists', deckName: name };
    }

    const formattedWords = formatDeckWords(name, validWords);

    const conflictWith = findIdConflict(customDecks, formattedWords, name);
    if (conflictWith) {
      return { success: false, reason: 'id-conflict', deckName: name, conflictWith };
    }

    customDecks[name] = formattedWords;

    await AsyncStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customDecks));

    return { success: true, deckName: name, count: formattedWords.length };
  } catch (error) {
    console.error('Save deck error:', error);
    return { success: false, error: error.message };
  }
};

export const getCustomDecks = async () => {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_DECKS_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error fetching custom decks:', error);
    return {};
  }
};

export const deleteCustomDeck = async (deckName) => {
  try {
    const data = await AsyncStorage.getItem(CUSTOM_DECKS_KEY);
    const customDecks = data ? JSON.parse(data) : {};
    delete customDecks[deckName];
    await AsyncStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customDecks));
    return true;
  } catch (error) {
    console.error('Error deleting custom deck:', error);
    return false;
  }
};