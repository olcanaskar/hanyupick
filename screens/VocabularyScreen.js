import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  StatusBar,
  DeviceEventEmitter,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FloatingBackground from '../components/FloatingBackground';
import HandwritingModal from '../components/HandwritingModal';
import { getCustomDecks } from '../services/importService';
import { speakHanzi } from '../services/speechService';

// HSK seviye listesi ve kelime havuzları tek kaynaktan (Faz 3.1)
import { LEVELS, LEVEL_LABELS, LEVEL_POOLS } from '../services/wordRepository';

/**
 * @typedef {import('../services/importService').CustomDecks} CustomDecks
 * @typedef {import('../services/wordRepository').WordId} WordId
 */

// Sözlük listesindeki tek satır: HSK kaydı ya da özel deste kelimesi + kaynak etiketi.
/**
 * @typedef {{
 *   id: WordId,
 *   hanzi: string,
 *   pinyin: string,
 *   meaning: string,
 *   categoryId: string,
 *   sourceTag: string,
 *   level?: string,
 * }} VocabularyItem
 */

const BASE_CATEGORIES = [
  { id: 'all', label: 'All Words' },
  ...LEVELS.map((level) => ({ id: level, label: LEVEL_LABELS[level] })),
];

/**
 * @param {{ navigation: { goBack: () => void } }} props
 */
export default function VocabularyScreen({ navigation }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [customDecks, setCustomDecks] = useState(/** @type {CustomDecks} */ ({}));
  const [isHandwritingVisible, setIsHandwritingVisible] = useState(false);

  // Özel desteleri AsyncStorage'dan yükle
  const loadCustomDecks = async () => {
    const data = await getCustomDecks();
    setCustomDecks(data);
  };

  useEffect(() => {
    loadCustomDecks();
    const sub = DeviceEventEmitter.addListener('onCustomDeckImported', loadCustomDecks);
    return () => sub.remove();
  }, []);

  // Tüm kelime havuzunu birleştir ve kaynak etiketi ekle
  const allWordsPool = useMemo(() => {
    const staticWords = LEVELS.flatMap((level) =>
      (LEVEL_POOLS[level] || []).map((w) => ({
        ...w,
        categoryId: level,
        sourceTag: LEVEL_LABELS[level],
      }))
    );

    /** @type {VocabularyItem[]} */
    const customWords = [];
    Object.keys(customDecks).forEach((deckName) => {
      const categoryId = `custom_${deckName}`;
      customDecks[deckName].forEach((word) => {
        customWords.push({
          ...word,
          categoryId: categoryId,
          sourceTag: `📁 ${deckName}`,
        });
      });
    });

    return [...staticWords, ...customWords];
  }, [customDecks]);

  // Dinamik Kategori Butonları
  const categoriesList = useMemo(() => {
    const customItems = Object.keys(customDecks).map((key) => ({
      id: `custom_${key}`,
      label: `📁 ${key}`,
    }));
    return [...BASE_CATEGORIES, ...customItems];
  }, [customDecks]);

  // Filtreleme Mantığı (Arama kelimesi + Seçili kategori)
  const filteredWords = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return allWordsPool.filter((item) => {
      // 1. Kategori Kontrolü
      if (selectedCategory !== 'all' && item.categoryId !== selectedCategory) {
        return false;
      }

      // 2. Arama Kontrolü
      if (!query) return true;

      const hanziMatch = item.hanzi?.includes(query);
      const pinyinMatch = item.pinyin?.toLowerCase().includes(query);
      const meaningMatch = item.meaning?.toLowerCase().includes(query);

      return hanziMatch || pinyinMatch || meaningMatch;
    });
  }, [allWordsPool, searchQuery, selectedCategory]);

  // Çince seslendirme tek servisten (services/speechService.js) — ses seviyesi
  // kullanıcı ayarından gelir.
  /**
   * @param {{ item: VocabularyItem }} props
   */
  const renderWordItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardMain}>
        <View style={styles.hanziRow}>
          <Text style={styles.hanziText} accessible={true}>{item.hanzi}</Text>
          <View style={styles.tagBadge}>
            <Text style={styles.tagText}>{item.sourceTag}</Text>
          </View>
        </View>
        <Text style={styles.pinyinText} accessible={true}>{item.pinyin}</Text>
        <Text style={styles.meaningText} accessible={true}>{item.meaning}</Text>
      </View>

      <TouchableOpacity
        style={styles.soundBtn}
        onPress={() => speakHanzi(item.hanzi)}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={`Play pronunciation of ${item.hanzi}`}
      >
        <Text style={styles.soundIcon}>🔊</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: '#FBF5EB' }}>
      <FloatingBackground />

      <SafeAreaView style={styles.safeArea}>
        <StatusBar barStyle="dark-content" backgroundColor="#FBF5EB" translucent={false} />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Text style={styles.backBtnText}>←</Text>
          </TouchableOpacity>
          <View>
            <Text style={styles.headerTitle} accessibilityRole="header">VOCABULARY</Text>
            <Text style={styles.headerSubtitle}>{allWordsPool.length} words in library</Text>
          </View>
        </View>

        {/* Search Bar & Descriptive Draw Button */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search Hanzi, Pinyin..."
            placeholderTextColor="#9CA3AF"
            value={searchQuery}
            onChangeText={setSearchQuery}
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} style={{ marginRight: 6 }} accessibilityRole="button" accessibilityLabel="Clear search">
              <Text style={styles.clearIcon}>✕</Text>
            </TouchableOpacity>
          )}

          {/* Açıklayıcı Çizim Butonu — yalnızca yerelde: el yazısı tanıma harici
              bir servise (inputtools.google.com) `fetch` atar ve tarayıcıda CORS
              nedeniyle sessizce başarısız olur; fare ile çizim de pedin amacına
              uygun değil. Web'de arama kutusu + liste tam çalışır (Faz 24). */}
          {Platform.OS !== 'web' && (
            <TouchableOpacity
              style={styles.drawBtn}
              onPress={() => setIsHandwritingVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="Search by handwriting"
            >
              <Text style={styles.drawBtnIcon}>✍️</Text>
              <Text style={styles.drawBtnText}>Draw</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Kategori Filtre Çubukları (Horizontally Scrollable) */}
        <View style={styles.categoriesWrapper}>
          <FlatList
            horizontal
            data={categoriesList}
            keyExtractor={(item) => item.id}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoriesContainer}
            renderItem={({ item }) => {
              const isSelected = selectedCategory === item.id;
              return (
                <TouchableOpacity
                  style={[styles.categoryChip, isSelected && styles.categoryChipSelected]}
                  onPress={() => setSelectedCategory(item.id)}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={item.label}
                >
                  <Text
                    style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            }}
          />
        </View>

        {/* Sonuç Sayısı Bilgisi */}
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsCountText}>
            Found <Text style={styles.boldText}>{filteredWords.length}</Text> words
          </Text>
        </View>

        {/* Kelime Listesi */}
        <FlatList
          data={filteredWords}
          keyExtractor={(item, index) => item.id?.toString() || index.toString()}
          renderItem={renderWordItem}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyIcon}>🔍</Text>
              <Text style={styles.emptyTitle}>No words found</Text>
              <Text style={styles.emptySubtext}>
                Try searching with a different character, pinyin, or English word.
              </Text>
            </View>
          }
        />

        {/* Çizim Modalı */}
        <HandwritingModal
          visible={isHandwritingVisible}
          onClose={() => setIsHandwritingVisible(false)}
          onSelectHanzi={(selectedChar) => setSearchQuery(selectedChar)}
        />
      </SafeAreaView>
    </View>
  );
}

// Renk paleti (Faz 12): quiz yüzeyiyle aynı — kırmızı rampası (#991B1B / #DC2626 /
// #B91C1C / #FCA5A5 / #FEF2F2) + nötr griler (#2C3E50 / #7F8C8D / #9CA3AF / #E2E8F0).
// Amber/altın tonları yalnızca Home'daki Custom Word Decks kartında kalır.
const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 16,
    gap: 16,
  },
  backBtn: {
    padding: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  backBtnText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#2C3E50',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  searchIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#2C3E50',
  },
  clearIcon: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  drawBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FCA5A5',
    marginLeft: 4,
  },
  drawBtnIcon: {
    fontSize: 13,
  },
  drawBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#B91C1C',
  },
  categoriesWrapper: {
    marginTop: 14,
    marginBottom: 8,
  },
  categoriesContainer: {
    paddingHorizontal: 20,
    gap: 8,
  },
  categoryChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FCA5A5',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#7F8C8D',
  },
  categoryChipTextSelected: {
    color: '#B91C1C',
  },
  resultsInfo: {
    paddingHorizontal: 22,
    marginBottom: 8,
  },
  resultsCountText: {
    fontSize: 12,
    color: '#7F8C8D',
  },
  boldText: {
    fontWeight: '800',
    color: '#B91C1C',
  },
  listContainer: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardMain: {
    flex: 1,
    marginRight: 12,
  },
  hanziRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  hanziText: {
    fontSize: 24,
    fontWeight: '800',
    color: '#2C3E50',
  },
  tagBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FCA5A5',
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B91C1C',
  },
  pinyinText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 2,
  },
  meaningText: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  soundBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  soundIcon: {
    fontSize: 18,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 48,
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#2C3E50',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 12,
    color: '#9CA3AF',
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});