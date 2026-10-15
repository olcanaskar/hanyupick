import React, { useRef, useEffect, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Animated,
  DeviceEventEmitter,
  ScrollView,
  Modal,
  Pressable,
} from 'react-native';
import { getCustomDecks } from '../services/importService';
import { LEVELS, LEVEL_LABELS } from '../services/wordRepository';
import {
  CATEGORIES,
  DEFAULT_MODE,
  MODES_BY_CATEGORY,
  MODE_LABELS,
  getCategory,
  getCategoryIndex,
  getReverseMode,
} from '../services/modes';

const BASE_LEVELS = [
  ...LEVELS.map((level) => ({ id: level, label: LEVEL_LABELS[level] })),
  { id: 'mixed', label: 'Mixed' },
];

/**
 * Not: Header iki farklı prop adını destekliyor (`setLevel`/`onSelectLevel`,
 * `setMode`/`onToggleMode`); uygulamada yalnızca `setX` biçimi kullanılıyor,
 * yine de ikisi de opsiyonel olarak tanımlı (bkz. handleLevelChange/handleModeChange).
 *
 * @param {{
 *   level: any,
 *   setLevel?: any,
 *   onSelectLevel?: any,
 *   mode?: string,
 *   setMode?: any,
 *   onToggleMode?: any,
 *   reviewCount?: number,
 * }} props
 */
export default function Header({
  level,
  setLevel,
  onSelectLevel,
  mode = DEFAULT_MODE,
  setMode,
  onToggleMode,
  reviewCount = 0,
}) {
  const handleLevelChange = setLevel || onSelectLevel;
  const handleModeChange = setMode || onToggleMode;

  const [containerWidth, setContainerWidth] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [levelsList, setLevelsList] = useState(BASE_LEVELS);

  // Butonun ekrandaki X, Y ve genişlik konumunu dinamik ölçmek için Ref ve State
  const buttonRef = useRef(null);
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  // AsyncStorage'daki özel desteleri çekip seviye listesine bağlar
  const loadCustomDecks = async () => {
    try {
      const customDecks = await getCustomDecks();
      const customKeys = Object.keys(customDecks);

      const customItems = customKeys.map((key) => ({
        id: `custom_${key}`,
        label: `📁 ${key}`,
      }));

      setLevelsList([...BASE_LEVELS, ...customItems]);
    } catch (error) {
      console.error('Error loading custom decks in Header:', error);
    }
  };

  useEffect(() => {
    loadCustomDecks();

    const subscription = DeviceEventEmitter.addListener('onCustomDeckImported', () => {
      loadCustomDecks();
    });

    return () => subscription.remove();
  }, []);

  // Sekme indeksi ve kategori bilgisi artık services/modes.js'ten gelir (Faz 3.3);
  // eskiden burada mod→indeks eşlemesinin bir KOPYASI tutuluyordu.
  const currentCategory = getCategory(mode);
  const currentIndex = getCategoryIndex(mode);

  // Sekmede gösterilecek mod: kategori aktifse mevcut yön, değilse ileri yön.
  const getTabMode = (category) =>
    category === currentCategory ? mode : MODES_BY_CATEGORY[category][0];

  // Kayan Gösterge Animasyonu
  const slideAnim = useRef(new Animated.Value(currentIndex)).current;

  // 3D Kart Çevirme Animasyonu
  const flipAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: currentIndex,
      useNativeDriver: true,
      bounciness: 4,
      speed: 16,
    }).start();
  }, [currentIndex]);

  const buttonWidth = containerWidth > 0 ? (containerWidth - 8) / 3 : 0;

  const translateX = slideAnim.interpolate({
    inputRange: [0, 1, 2],
    outputRange: [0, buttonWidth, buttonWidth * 2],
  });

  const animateFlip = (onMidpoint) => {
    flipAnim.setValue(0);
    Animated.timing(flipAnim, {
      toValue: 90,
      duration: 110,
      useNativeDriver: true,
    }).start(() => {
      if (onMidpoint) onMidpoint();
      flipAnim.setValue(-90);
      Animated.timing(flipAnim, {
        toValue: 0,
        duration: 110,
        useNativeDriver: true,
      }).start();
    });
  };

  const handleTabPress = (targetIndex) => {
    if (isDropdownOpen) setIsDropdownOpen(false);

    const targetCategory = CATEGORIES[targetIndex];
    if (!targetCategory) return;

    // Aynı sekmeye tekrar basmak: kategori içinde yönü çevirir (字→Pinyin ⇄ Pinyin→字)
    if (currentIndex === targetIndex) {
      const nextMode = getReverseMode(mode) || MODES_BY_CATEGORY[targetCategory][0];
      animateFlip(() => {
        if (handleModeChange) handleModeChange(nextMode);
      });
      return;
    }

    // Farklı sekme: o kategorinin ileri yönü
    if (handleModeChange) handleModeChange(MODES_BY_CATEGORY[targetCategory][0]);
  };

  // Butona basıldığında tam konumunu ölçüp menüyü altına yerleştirir
  const handleOpenDropdown = () => {
    if (buttonRef.current) {
      buttonRef.current.measureInWindow((x, y, width, height) => {
        setDropdownPos({
          top: y + height + 6,
          left: x,
          width: width,
        });
        setIsDropdownOpen(true);
      });
    } else {
      setIsDropdownOpen(true);
    }
  };

  const currentLevelObj =
    levelsList.find((item) => item.id === level) || {
      id: level,
      label: level.startsWith('custom_')
        ? `📁 ${level.replace('custom_', '')}`
        : level.toUpperCase(),
    };

  const handleSelectLevel = (levelId) => {
    if (handleLevelChange) handleLevelChange(levelId);
    setIsDropdownOpen(false);
  };

  const flipStyle = {
    transform: [
      {
        rotateY: flipAnim.interpolate({
          inputRange: [-90, 0, 90],
          outputRange: ['-90deg', '0deg', '90deg'],
        }),
      },
    ],
  };

  return (
    <View style={styles.header}>
      {/* 1. Üçlü Mod Seçici Bar */}
      <View
        style={styles.toggleContainer}
        onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}
      >
        {containerWidth > 0 && buttonWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingIndicator,
              {
                width: buttonWidth,
                transform: [{ translateX }],
              },
            ]}
          />
        )}

        {CATEGORIES.map((category, index) => (
          <TouchableOpacity
            key={category}
            style={styles.toggleBtn}
            onPress={() => handleTabPress(index)}
            activeOpacity={0.85}
            accessibilityRole="tab"
            accessibilityLabel={MODE_LABELS[getTabMode(category)]}
          >
            <Animated.View style={currentIndex === index ? flipStyle : null}>
              <Text
                style={[
                  styles.toggleText,
                  currentIndex === index ? styles.toggleTextActive : styles.toggleTextInactive,
                ]}
                numberOfLines={1}
              >
                {MODE_LABELS[getTabMode(category)]}
              </Text>
            </Animated.View>
          </TouchableOpacity>
        ))}
      </View>

      {/* 2. Seviye Seçim Butonu veya Review Bilgisi */}
      <View style={styles.controlsRow}>
        {level === 'review' ? (
          <View style={[styles.reviewBtn, styles.reviewBtnActive, { width: '100%' }]}>
            <View style={styles.activeDot} />
            <Text style={[styles.reviewBtnText, styles.reviewBtnTextActive]}>
              Reviewing Wrongs ({reviewCount} words remaining)
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            ref={buttonRef}
            style={[styles.dropdownButton, isDropdownOpen && styles.dropdownButtonActive]}
            onPress={handleOpenDropdown}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={`Current level: ${currentLevelObj.label}. Opens the level list`}
          >
            <View style={styles.dropdownButtonLeft}>
              <Text style={styles.dropdownPrefix}>Level:</Text>
              <Text style={styles.dropdownSelectedText} numberOfLines={1}>
                {currentLevelObj.label}
              </Text>
            </View>
            <Text style={styles.dropdownArrow}>{isDropdownOpen ? '▲' : '▼'}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* 3. Dinamik Konumlandırılan Mini Dropdown Menü */}
      <Modal
        visible={isDropdownOpen}
        transparent={true}
        animationType="none"
        onRequestClose={() => setIsDropdownOpen(false)}
      >
        <Pressable style={styles.modalBackdrop} onPress={() => setIsDropdownOpen(false)}>
          <Pressable
            style={[
              styles.dropdownMenuCard,
              {
                position: 'absolute',
                top: dropdownPos.top,
                left: dropdownPos.left,
                width: dropdownPos.width,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
            accessibilityViewIsModal={true}
          >
            <ScrollView
              nestedScrollEnabled={true}
              style={{ maxHeight: 220 }}
              showsVerticalScrollIndicator={true}
            >
              {levelsList.map((item, index) => {
                const isSelected = level === item.id;
                const isFirst = index === 0;
                const isLast = index === levelsList.length - 1;

                return (
                  <TouchableOpacity
                    key={item.id}
                    style={[
                      styles.dropdownItem,
                      isFirst && styles.dropdownItemFirst,
                      isLast && styles.dropdownItemLast,
                      isSelected && styles.dropdownItemSelected,
                    ]}
                    onPress={() => handleSelectLevel(item.id)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={item.label}
                  >
                    <View style={styles.dropdownItemContent}>
                      <Text
                        style={[
                          styles.dropdownItemText,
                          isSelected && styles.dropdownItemTextSelected,
                        ]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    width: '100%',
    marginBottom: 16,
  },
  toggleContainer: {
    position: 'relative',
    flexDirection: 'row',
    backgroundColor: '#FEF3C7',
    borderRadius: 14,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  slidingIndicator: {
    position: 'absolute',
    top: 4,
    left: 4,
    bottom: 4,
    backgroundColor: '#D97706',
    borderRadius: 10,
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 3,
  },
  toggleBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  toggleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  toggleTextInactive: {
    color: '#B45309',
  },
  toggleTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  controlsRow: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dropdownButton: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
  },
  dropdownButtonActive: {
    borderColor: '#D97706',
  },
  dropdownButtonLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  dropdownPrefix: {
    fontSize: 13,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dropdownSelectedText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#D97706',
    flexShrink: 1,
  },
  dropdownArrow: {
    fontSize: 10,
    color: '#D97706',
    fontWeight: '700',
    marginLeft: 2,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownMenuCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 12,
    overflow: 'hidden',
  },
  dropdownItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#FFFBEB',
  },
  dropdownItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    marginRight: 8,
  },
  dropdownItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  dropdownItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  dropdownItemSelected: {
    backgroundColor: '#FEF3C7',
  },
  dropdownItemText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4B5563',
  },
  dropdownItemTextSelected: {
    color: '#D97706',
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 13,
    color: '#D97706',
    fontWeight: '700',
  },
  reviewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 11,
    paddingHorizontal: 6,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#FCD34D',
  },
  reviewBtnActive: {
    backgroundColor: '#FEF3C7',
    borderColor: '#D97706',
    shadowColor: '#D97706',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 2,
  },
  activeDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#D97706',
  },
  reviewBtnText: {
    fontSize: 12.5,
    fontWeight: '600',
    color: '#B45309',
    textAlign: 'center',
  },
  reviewBtnTextActive: {
    color: '#92400E',
    fontWeight: '700',
  },
});