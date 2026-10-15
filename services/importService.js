import * as DocumentPicker from 'expo-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';

const CUSTOM_DECKS_KEY = '@custom_word_decks';

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
export const saveCustomDeck = async (deckName, validWords) => {
  try {
    const sanitizedDeckName = deckName.replace(/[^a-zA-Z0-9]/g, '_');

    const formattedWords = validWords.map((item, index) => ({
      id: `custom_${sanitizedDeckName}_${item.id ?? index}`,
      hanzi: item.hanzi,
      pinyin: item.pinyin,
      meaning: item.meaning,
      level: item.level || 'custom',
    }));

    const existingData = await AsyncStorage.getItem(CUSTOM_DECKS_KEY);
    const customDecks = existingData ? JSON.parse(existingData) : {};

    customDecks[deckName] = formattedWords;

    await AsyncStorage.setItem(CUSTOM_DECKS_KEY, JSON.stringify(customDecks));

    return { success: true, deckName, count: formattedWords.length };
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