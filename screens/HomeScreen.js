import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Pressable,
  DeviceEventEmitter,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import StatsModal from '../components/StatsModal';
import CustomDeckModal from '../components/CustomDeckModal';
import FloatingBackground from '../components/FloatingBackground';
import { getCustomDecks } from '../services/importService';
import { LEVELS, LEVEL_LABELS, LEVEL_POOLS } from '../services/wordRepository';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Seviyeye özgü sunum bilgileri (Çince ad + zorluk seviyesi).
// Kelime sayısı havuzdan türetilir → veri değişince metin kendiliğinden güncel kalır.
const LEVEL_PRESENTATION = {
  hsk1: { hanzi: '一级', difficulty: 'Beginner' },
  hsk2: { hanzi: '二级', difficulty: 'Elementary' },
  hsk3: { hanzi: '三级', difficulty: 'Intermediate' },
  hsk4: { hanzi: '四级', difficulty: 'Upper-Intermediate' },
  hsk5: { hanzi: '五级', difficulty: 'Advanced' },
};

const BASE_LEVELS = [
  ...LEVELS.map((level) => ({
    id: level,
    label: LEVEL_LABELS[level],
    hanzi: LEVEL_PRESENTATION[level].hanzi,
    desc: `${(LEVEL_POOLS[level] || []).length} words · ${LEVEL_PRESENTATION[level].difficulty}`,
  })),
  { id: 'mixed', label: 'Mixed', hanzi: '综合', desc: 'All levels combined' },
];

export default function HomeScreen({ navigation, reviewPool = [] }) {
  const [isStatsVisible, setIsStatsVisible] = useState(false);
  const [isCustomDeckVisible, setIsCustomDeckVisible] = useState(false);
  const [levels, setLevels] = useState(BASE_LEVELS);
  const [selectedLevelIndex, setSelectedLevelIndex] = useState(0);
  const [isMenuVisible, setIsMenuVisible] = useState(false);

  // CustomDeckModal ile birebir aynı Pop-up Animasyon Değerleri
  const menuScaleAnim = useRef(new Animated.Value(0.85)).current;
  const menuTranslateYAnim = useRef(new Animated.Value(35)).current;
  const menuOpacityAnim = useRef(new Animated.Value(0)).current;

  // Pop-up Açılış Animasyonu
  useEffect(() => {
    if (isMenuVisible) {
      menuScaleAnim.setValue(0.85);
      menuTranslateYAnim.setValue(35);
      menuOpacityAnim.setValue(0);

      Animated.parallel([
        Animated.spring(menuScaleAnim, {
          toValue: 1,
          bounciness: 9,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.spring(menuTranslateYAnim, {
          toValue: 0,
          bounciness: 9,
          speed: 12,
          useNativeDriver: true,
        }),
        Animated.timing(menuOpacityAnim, {
          toValue: 1,
          duration: 180,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [isMenuVisible]);

  // Pop-up Kapanış Animasyonu
  const closeMenu = (onFinished) => {
    Animated.parallel([
      Animated.timing(menuScaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(menuTranslateYAnim, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(menuOpacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setIsMenuVisible(false);
      if (onFinished) onFinished();
    });
  };

  // AsyncStorage'daki özel desteleri çekip seviye listesine bağlayan fonksiyon
  const loadLevels = useCallback(async () => {
    try {
      const customDecks = await getCustomDecks();
      const customKeys = Object.keys(customDecks);

      const customItems = customKeys.map((key) => ({
        id: `custom_${key}`,
        label: key,
        hanzi: '自定',
        desc: `${customDecks[key].length} words · Custom Deck`,
      }));

      setLevels([...BASE_LEVELS, ...customItems]);
    } catch (error) {
      console.error('Error loading levels in HomeScreen:', error);
    }
  }, []);

  useEffect(() => {
    loadLevels();

    const importSub = DeviceEventEmitter.addListener('onCustomDeckImported', () => {
      loadLevels();
    });

    const levelChangeSub = DeviceEventEmitter.addListener('onLevelChange', (newLevelId) => {
      setLevels((prevLevels) => {
        const foundIndex = prevLevels.findIndex((lvl) => lvl.id === newLevelId);
        if (foundIndex !== -1) {
          setSelectedLevelIndex(foundIndex);
        }
        return prevLevels;
      });
    });

    return () => {
      importSub.remove();
      levelChangeSub.remove();
    };
  }, [loadLevels]);

  const currentLevel = levels[selectedLevelIndex] || levels[0] || BASE_LEVELS[0];
  const hasWrongs = reviewPool.length > 0;

  const handleSelectLevel = (index) => {
    closeMenu(() => {
      setSelectedLevelIndex(index);
    });
  };

  const startQuiz = (levelId = currentLevel.id) => {
    navigation.navigate('Quiz', { initialLevel: levelId });
  };

  return (
    <View style={{ flex: 1, backgroundColor: '#FBF5EB' }}>
      {/* 1. Katman: Arka planda süzülen Hanzi karakterleri */}
      <FloatingBackground />

      {/* 2. Katman: Ön plandaki kartlar */}
      <SafeAreaView style={[styles.safeArea, { backgroundColor: 'transparent' }]}>
        <StatusBar barStyle="dark-content" backgroundColor="#FBF5EB" translucent={false} />
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Header Section */}
          <View style={styles.header}>
            <View style={styles.topRow}>
              <Text style={styles.badge}>HSK FLASHCARDS</Text>
            </View>
            <Text style={styles.title} accessibilityRole="header">中文 Learning</Text>
            <Text style={styles.subtitle}>Choose your level and start practicing</Text>
          </View>

          {/* İstatistik Pop-up (Modal) */}
          <StatsModal visible={isStatsVisible} onClose={() => setIsStatsVisible(false)} />

          {/* Custom Decks Pop-up (Modal) */}
          <CustomDeckModal
            visible={isCustomDeckVisible}
            onClose={() => setIsCustomDeckVisible(false)}
          />

          {/* Seviye Seçici & Başlat Butonu */}
          <View style={styles.selectorWrapper}>
            <TouchableOpacity
              style={styles.levelSelectArea}
              onPress={() => setIsMenuVisible(true)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Select level: ${currentLevel.label}. Opens the level list`}
            >
              <Text style={styles.selectorLabel}>LEVEL</Text>
              <View style={styles.levelRow}>
                <Text style={styles.selectedLevelText} numberOfLines={1}>
                  {currentLevel.label}
                </Text>
                <View style={styles.hanziBadge}>
                  <Text style={styles.hanziBadgeText}>{currentLevel.hanzi}</Text>
                </View>
                <Text style={styles.dropdownArrow}>▾</Text>
              </View>
              <Text style={styles.selectedLevelDesc} numberOfLines={1}>
                {currentLevel.desc}
              </Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.startArrowArea}
              onPress={() => startQuiz(currentLevel.id)}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel={`Start quiz: ${currentLevel.label}`}
            >
              <Text style={styles.arrowIcon}>➔</Text>
            </TouchableOpacity>
          </View>

          {/* Seviye Seçim Pop-up Menüsü (CustomDeckModal ile aynı animasyon) */}
          <Modal
            visible={isMenuVisible}
            transparent={true}
            animationType="none"
            onRequestClose={() => closeMenu()}
          >
            <View style={styles.modalOverlay}>
              {/* Kararan Arka Plan Overlay */}
              <AnimatedPressable
                style={[styles.modalBackdrop, { opacity: menuOpacityAnim }]}
                onPress={() => closeMenu()}
              />

              {/* Animasyonlu İçerik Kartı */}
              <Animated.View
                style={[
                  styles.menuContainer,
                  {
                    opacity: menuOpacityAnim,
                    transform: [
                      { scale: menuScaleAnim },
                      { translateY: menuTranslateYAnim },
                    ],
                  },
                ]}
                accessibilityViewIsModal={true}
              >
                <Text style={styles.menuHeaderTitle} accessibilityRole="header">Select Level</Text>
                <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
                  {levels.map((lvl, index) => {
                    const isSelected = selectedLevelIndex === index;
                    return (
                      <TouchableOpacity
                        key={lvl.id}
                        style={[styles.menuItem, isSelected && styles.menuItemSelected]}
                        onPress={() => handleSelectLevel(index)}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityLabel={`${lvl.label}, ${lvl.desc}`}
                      >
                        <View style={{ flex: 1 }}>
                          <View style={styles.levelRow}>
                            <Text
                              style={[
                                styles.menuItemLabel,
                                isSelected && styles.menuItemLabelSelected,
                              ]}
                            >
                              {lvl.label}
                            </Text>
                            <View
                              style={[
                                styles.hanziBadge,
                                isSelected && styles.hanziBadgeSelected,
                              ]}
                            >
                              <Text
                                style={[
                                  styles.hanziBadgeText,
                                  isSelected && styles.hanziBadgeTextSelected,
                                ]}
                              >
                                {lvl.hanzi}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.menuItemDesc}>{lvl.desc}</Text>
                        </View>
                        {isSelected && <Text style={styles.checkmark}>✓</Text>}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </View>
          </Modal>

          {/* 1. Review Card */}
          <TouchableOpacity
            style={[styles.reviewCard, !hasWrongs && styles.reviewCardDisabled]}
            onPress={() => hasWrongs && startQuiz('review')}
            activeOpacity={hasWrongs ? 0.8 : 1}
            disabled={!hasWrongs}
            accessibilityRole="button"
            accessibilityLabel="Review the wrongs"
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.reviewTitle}>Review the Wrongs</Text>
                <View style={[styles.countBadge, !hasWrongs && styles.countBadgeZero]}>
                  <Text style={[styles.countText, !hasWrongs && styles.countTextZero]}>
                    {reviewPool.length}
                  </Text>
                </View>
              </View>
              <Text style={styles.reviewDesc}>
                {hasWrongs
                  ? `${reviewPool.length} words waiting for practice`
                  : 'No mistakes to review yet!'}
              </Text>
            </View>
            <Text style={[styles.reviewCardArrow, !hasWrongs && styles.reviewCardArrowDisabled]}>
              →
            </Text>
          </TouchableOpacity>

          {/* 2. Custom Decks Card */}
          <TouchableOpacity
            style={styles.customDeckCard}
            onPress={() => setIsCustomDeckVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Custom word decks"
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.customDeckTitle}>Custom Word Decks</Text>
                <View style={styles.customDeckBadge}>
                  <Text style={styles.customDeckBadgeText}>📁</Text>
                </View>
              </View>
              <Text style={styles.reviewDesc}>
                Import and manage your JSON vocabulary lists
              </Text>
            </View>
            <Text style={styles.customDeckCardArrow}>→</Text>
          </TouchableOpacity>

          {/* 3. Vocabulary & Search Card */}
          <TouchableOpacity
            style={styles.vocabCard}
            onPress={() => navigation.navigate('Vocabulary')}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Vocabulary and search"
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.vocabTitle}>Vocabulary & Search</Text>
                <View style={styles.vocabBadge}>
                  <Text style={styles.vocabBadgeText}>🔍</Text>
                </View>
              </View>
              <Text style={styles.reviewDesc}>
                Search words across HSK & custom decks
              </Text>
            </View>
            <Text style={styles.vocabCardArrow}>→</Text>
          </TouchableOpacity>

          {/* 4. Statistics Card */}
          <TouchableOpacity
            style={styles.statsCard}
            onPress={() => setIsStatsVisible(true)}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Statistics and progress"
          >
            <View style={{ flex: 1, marginRight: 10 }}>
              <View style={styles.reviewHeaderRow}>
                <Text style={styles.statsTitle}>Statistics & Progress</Text>
                <View style={styles.statsBadge}>
                  <Text style={styles.statsBadgeText}>📊</Text>
                </View>
              </View>
              <Text style={styles.reviewDesc}>Mastery, streaks & activity overview</Text>
            </View>
            <Text style={styles.statsCardArrow}>→</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  container: {
    padding: 24,
    paddingBottom: 32,
  },
  header: {
    marginTop: 20,
    marginBottom: 28,
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  badge: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
    letterSpacing: 2,
  },
  title: {
    fontSize: 34,
    fontWeight: '800',
    color: '#2C3E50',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 15,
    color: '#7F8C8D',
  },
  selectorWrapper: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 2,
    borderColor: '#E2E8F0',
    flexDirection: 'row',
    alignItems: 'stretch',
    marginBottom: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    overflow: 'hidden',
  },
  levelSelectArea: {
    flex: 1,
    paddingVertical: 18,
    paddingHorizontal: 20,
    justifyContent: 'center',
  },
  selectorLabel: {
    fontSize: 11,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
  },
  selectedLevelText: {
    fontSize: 22,
    fontWeight: '800',
    color: '#2C3E50',
    marginTop: 2,
    flexShrink: 1,
  },
  selectedLevelDesc: {
    fontSize: 13,
    color: '#7F8C8D',
    marginTop: 2,
  },
  divider: {
    width: 2,
    backgroundColor: '#E2E8F0',
  },
  startArrowArea: {
    width: 80,
    backgroundColor: '#FFF5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arrowIcon: {
    fontSize: 32,
    color: '#DC2626',
    fontWeight: 'bold',
  },
  reviewCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  reviewCardDisabled: {
    backgroundColor: '#F8F9FA',
    borderColor: '#E9ECEF',
    opacity: 0.7,
  },
  reviewHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 4,
  },
  reviewTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#991B1B',
  },
  countBadge: {
    backgroundColor: '#DC2626',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  countBadgeZero: {
    backgroundColor: '#BDC3C7',
  },
  countText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  countTextZero: {
    color: '#FFFFFF',
  },
  reviewDesc: {
    fontSize: 13,
    color: '#7F8C8D',
  },
  reviewCardArrow: {
    fontSize: 22,
    color: '#991B1B',
    fontWeight: 'bold',
  },
  reviewCardArrowDisabled: {
    color: '#BDC3C7',
    opacity: 0.5,
  },
  customDeckCard: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FCD34D',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  customDeckTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#B45309',
  },
  customDeckBadge: {
    backgroundColor: '#FEF3C7',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  customDeckBadgeText: {
    fontSize: 12,
  },
  customDeckCardArrow: {
    fontSize: 22,
    color: '#B45309',
    fontWeight: 'bold',
  },
  vocabCard: {
    backgroundColor: '#ECFDF5',
    borderColor: '#A7F3D0',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#047857',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  vocabTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  vocabBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  vocabBadgeText: {
    fontSize: 12,
  },
  vocabCardArrow: {
    fontSize: 22,
    color: '#047857',
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: '#FFFFFF',
    borderColor: '#E2E8F0',
    borderWidth: 1.5,
    borderRadius: 24,
    padding: 20,
    marginTop: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  statsBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  statsBadgeText: {
    fontSize: 12,
  },
  statsCardArrow: {
    fontSize: 22,
    color: '#2C3E50',
    fontWeight: 'bold',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  menuContainer: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  menuHeaderTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1,
    marginBottom: 14,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    marginBottom: 8,
    backgroundColor: '#F8F9FA',
  },
  menuItemSelected: {
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
  },
  menuItemLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: '#2C3E50',
  },
  menuItemLabelSelected: {
    color: '#DC2626',
  },
  menuItemDesc: {
    fontSize: 12,
    color: '#7F8C8D',
    marginTop: 2,
  },
  checkmark: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#DC2626',
  },
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 2,
  },
  dropdownArrow: {
    fontSize: 18,
    color: '#2C3E50',
    fontWeight: '700',
  },
  hanziBadge: {
    backgroundColor: '#FBF5EB',
    borderColor: '#E2D9C8',
    borderWidth: 1,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  hanziBadgeSelected: {
    backgroundColor: '#FEE2E2',
    borderColor: '#FCA5A5',
  },
  hanziBadgeText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#991B1B',
  },
  hanziBadgeTextSelected: {
    color: '#DC2626',
  },
});