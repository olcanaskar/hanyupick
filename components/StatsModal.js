import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
} from 'react-native';
import { getStats } from '../services/statsManager';
import { getDateKey, addDays } from '../services/dateUtils';
import { ALL_WORDS, LEVELS, LEVEL_LABELS, LEVEL_POOLS } from '../services/wordRepository';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Seviye renkleri yalnızca bu ekrana özgü sunum bilgisidir; seviye listesi
// wordRepository'den gelir.
const LEVEL_COLORS = {
  hsk1: '#DC2626',
  hsk2: '#EA580C',
  hsk3: '#D97706',
  hsk4: '#2563EB',
  hsk5: '#7C3AED',
};

const HEAT_COLORS = ['#F1F5F9', '#FEF3C7', '#FCD34D', '#D97706', '#92400E'];

const getHeatColor = (total) => {
  if (total === 0) return '#F1F5F9';       // Aktivite yok
  if (total <= 10) return '#FEF3C7';       // Çok az (açık krem)
  if (total <= 25) return '#FCD34D';       // Az (altın sarısı)
  if (total <= 50) return '#D97706';       // Orta (kehribar)
  return '#92400E';                        // Çok (koyu bronz)
};

export default function StatsModal({ visible, onClose }) {
  const [statsData, setStatsData] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());

  // Animasyon Değerleri (Ölçek, Dikey Kayma ve Opaklık)
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(35)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      scaleAnim.setValue(0.85);
      translateYAnim.setValue(35);
      opacityAnim.setValue(0);
      setSelectedDay(null);
      setSelectedMonthDate(new Date());

      getStats().then((data) => {
        setStatsData(data);
        Animated.parallel([
          Animated.spring(scaleAnim, {
            toValue: 1,
            bounciness: 9,
            speed: 12,
            useNativeDriver: true,
          }),
          Animated.spring(translateYAnim, {
            toValue: 0,
            bounciness: 9,
            speed: 12,
            useNativeDriver: true,
          }),
          Animated.timing(opacityAnim, {
            toValue: 1,
            duration: 180,
            useNativeDriver: true,
          }),
        ]).start();
      });
    }
  }, [visible]);

  const handleClose = () => {
    Animated.parallel([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(translateYAnim, {
        toValue: 120,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onClose();
    });
  };

  const handlePrevMonth = () => {
    setSelectedDay(null);
    setSelectedMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDay(null);
    setSelectedMonthDate((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  if (!statsData) return null;

  const { wordStats = {}, dailyStats = {}, streak = { current: 0 } } = statsData;

  // 1. Mastery Hesaplama
  const calculateMastery = (pool) => {
    if (!pool.length) return { count: 0, percent: 0 };
    const masteredCount = pool.filter((w) => {
      const stat = wordStats[w.id];
      if (!stat?.categories) return false;
      const { hanzi_pinyin, hanzi_meaning, pinyin_meaning } = stat.categories;
      return (
        (hanzi_pinyin?.streak || 0) >= 3 &&
        (hanzi_meaning?.streak || 0) >= 3 &&
        (pinyin_meaning?.streak || 0) >= 3
      );
    }).length;
    return {
      count: masteredCount,
      percent: Math.round((masteredCount / pool.length) * 100),
    };
  };

  const masteryRows = LEVELS.map((level) => {
    const pool = LEVEL_POOLS[level] || [];
    return {
      id: level,
      name: LEVEL_LABELS[level],
      total: pool.length,
      color: LEVEL_COLORS[level],
      stat: calculateMastery(pool),
    };
  });

  // 2. Problematic Words
  const problematicWords = ALL_WORDS.filter((w) => {
    const stat = wordStats[w.id];
    if (!stat?.categories) return false;
    const { hanzi_pinyin, hanzi_meaning, pinyin_meaning } = stat.categories;
    return (
      (hanzi_pinyin?.wrongStreak || 0) >= 3 ||
      (hanzi_meaning?.wrongStreak || 0) >= 3 ||
      (pinyin_meaning?.wrongStreak || 0) >= 3
    );
  });

  // 3. Son 7 Günlük Aktivite Listesi
  const recentDays = Array.from({ length: 7 }).map((_, i) => {
    const d = addDays(new Date(), -(6 - i));
    const dateStr = getDateKey(d);
    const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
    const dayData = dailyStats[dateStr] || { correct: 0, wrong: 0 };
    return { dateStr, dayLabel, ...dayData };
  });

  // 4. Sabit Takvim Grid Hesaplamaları
  const year = selectedMonthDate.getFullYear();
  const month = selectedMonthDate.getMonth();

  const firstDayOfMonth = new Date(year, month, 1);
  const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Pzt, 6 = Paz
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const todayObj = new Date();
  const todayStr = getDateKey(todayObj);
  const isCurrentMonth =
    selectedMonthDate.getFullYear() === todayObj.getFullYear() &&
    selectedMonthDate.getMonth() === todayObj.getMonth();

  const gridCells = [];

  // Ayın başından önceki boş günler
  for (let i = 0; i < startWeekday; i++) {
    gridCells.push({ type: 'empty', id: `empty-start-${i}` });
  }

  // Ayın günleri
  for (let dayNum = 1; dayNum <= daysInMonth; dayNum++) {
    const d = new Date(year, month, dayNum);
    const dateStr = getDateKey(d);

    const dayData = dailyStats[dateStr] || { correct: 0, wrong: 0 };
    const total = dayData.correct + dayData.wrong;
    const isToday = dateStr === todayStr;

    const dayShort = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short' });

    gridCells.push({
      type: 'day',
      id: dateStr,
      dayNum,
      dateStr,
      dayShort,
      correct: dayData.correct,
      wrong: dayData.wrong,
      total,
      isToday,
    });
  }

  // Ay sonunu tamamlayan boş günler (7'nin katı olacak şekilde)
  const remainder = gridCells.length % 7;
  if (remainder !== 0) {
    const trailingCount = 7 - remainder;
    for (let i = 0; i < trailingCount; i++) {
      gridCells.push({ type: 'empty', id: `empty-end-${i}` });
    }
  }

  // Günleri haftalara (7'li satırlara) böl
  const calendarWeeks = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    calendarWeeks.push(gridCells.slice(i, i + 7));
  }

  const handleDayPress = (day) => {
    if (selectedDay?.dateStr === day.dateStr) {
      setSelectedDay(null);
    } else {
      setSelectedDay(day);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="none" onRequestClose={handleClose}>
      <View style={styles.modalContainer}>
        <AnimatedPressable
          style={[styles.overlay, { opacity: opacityAnim }]}
          onPress={handleClose}
        />

        <Animated.View
          style={[
            styles.contentCard,
            {
              opacity: opacityAnim,
              transform: [{ scale: scaleAnim }, { translateY: translateYAnim }],
            },
          ]}
          onStartShouldSetResponder={() => {
            if (selectedDay) setSelectedDay(null);
            return false;
          }}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title}>STATISTICS</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {/* Streak & Günlük Durum */}
            <View style={styles.streakCard}>
              <Text
                style={[
                  styles.streakFire,
                  streak.current <= 1 && styles.streakFireInactive,
                ]}
              >
                🔥
              </Text>
              <View>
                <Text style={styles.streakValue}>{streak.current} Days Streak</Text>
                <Text style={styles.streakSubtitle}>
                  {streak.current === 0
                    ? 'Start your streak today!'
                    : 'Keep the momentum going!'}
                </Text>
              </View>
            </View>

            {/* Mastery Oranları */}
            <Text style={styles.sectionHeader}>MASTERY LEVEL (3 STREAKS IN ALL MODES)</Text>
            <View style={styles.masteryList}>
              {masteryRows.map((lvl) => (
                <View key={lvl.id} style={styles.masteryRow}>
                  <View style={styles.masteryLabels}>
                    <Text style={styles.masteryName}>{lvl.name}</Text>
                    <Text style={styles.masteryCount}>
                      {lvl.stat.count}/{lvl.total} ({lvl.stat.percent}%)
                    </Text>
                  </View>
                  <View style={styles.progressBarBg}>
                    <View
                      style={[
                        styles.progressBarFill,
                        { width: `${lvl.stat.percent}%`, backgroundColor: lvl.color },
                      ]}
                    />
                  </View>
                </View>
              ))}
            </View>

            {/* 7 Günlük Aktivite Takvimi */}
            <Text style={styles.sectionHeader}>LAST 7 DAYS ACTIVITY</Text>
            <View style={styles.calendarRow}>
              {recentDays.map((day) => {
                const total = day.correct + day.wrong;
                return (
                  <View key={day.dateStr} style={styles.dayCol}>
                    <View style={[styles.dayPillBox, total === 0 && styles.dayPillBoxEmpty]}>
                      {total > 0 ? (
                        <>
                          <View style={styles.pillTop}>
                            <Text style={styles.pillTextCorrect}>{day.correct}</Text>
                          </View>
                          <View style={styles.pillDivider} />
                          <View style={styles.pillBottom}>
                            <Text style={styles.pillTextWrong}>{day.wrong}</Text>
                          </View>
                        </>
                      ) : (
                        <Text style={styles.pillTextEmpty}>-</Text>
                      )}
                    </View>
                    <Text style={styles.dayText}>{day.dayLabel}</Text>
                  </View>
                );
              })}
            </View>

            {/* Sabit Aylık Aktivite Takvimi */}
            <Text style={styles.sectionHeader}>ACTIVITY CALENDAR</Text>
            <View style={styles.heatmapContainer}>
              {/* Ay Başlığı ve Gezinme Butonları */}
              <View style={styles.calendarMonthHeader}>
                <TouchableOpacity
                  style={styles.monthNavBtn}
                  onPress={handlePrevMonth}
                  activeOpacity={0.7}
                >
                  <Text style={styles.monthNavText}>‹</Text>
                </TouchableOpacity>

                <Text style={styles.calendarMonthTitle}>
                  {selectedMonthDate
                    .toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    .toUpperCase()}
                </Text>

                <TouchableOpacity
                  style={[styles.monthNavBtn, isCurrentMonth && styles.monthNavBtnDisabled]}
                  onPress={handleNextMonth}
                  disabled={isCurrentMonth}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.monthNavText, isCurrentMonth && styles.monthNavTextDisabled]}>
                    ›
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Gün İsimleri Satırı */}
              <View style={styles.weekdayRow}>
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName, idx) => (
                  <View key={idx} style={styles.weekdayCell}>
                    <Text style={styles.weekdayText}>{dayName}</Text>
                  </View>
                ))}
              </View>

              {/* Takvim Grid'i */}
              <View style={styles.heatmapBody}>
                {calendarWeeks.map((week, weekIdx) => (
                  <View key={weekIdx} style={styles.calendarWeekRow}>
                    {week.map((cell, colIdx) => {
                      if (cell.type === 'empty') {
                        return <View key={cell.id} style={styles.calendarCellEmpty} />;
                      }

                      const isSelected = selectedDay?.dateStr === cell.dateStr;
                      const heatColor = getHeatColor(cell.total);

                      return (
                        <View
                          key={cell.id}
                          style={[
                            styles.calendarCellWrapper,
                            isSelected && styles.calendarCellWrapperSelected,
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              styles.calendarCell,
                              { backgroundColor: heatColor },
                              cell.isToday && styles.calendarCellToday,
                              isSelected && styles.calendarCellSelected,
                            ]}
                            onPress={() => handleDayPress(cell)}
                            activeOpacity={0.75}
                          >
                            <Text
                              style={[
                                styles.calendarDayText,
                                cell.total > 25 && styles.calendarDayTextLight,
                                cell.isToday && cell.total <= 25 && styles.calendarDayTextToday,
                              ]}
                            >
                              {cell.dayNum}
                            </Text>
                          </TouchableOpacity>

                          {/* Detay Balonu (Tooltip) */}
                          {isSelected && (
                            <View
                              style={[
                                styles.tooltip,
                                colIdx >= 4 ? styles.tooltipLeft : styles.tooltipRight,
                              ]}
                            >
                              <View
                                style={[
                                  styles.tooltipArrowBorder,
                                  colIdx >= 4
                                    ? styles.tooltipArrowBorderRight
                                    : styles.tooltipArrowBorderLeft,
                                ]}
                              />
                              <View
                                style={[
                                  styles.tooltipArrow,
                                  colIdx >= 4
                                    ? styles.tooltipArrowRight
                                    : styles.tooltipArrowLeft,
                                ]}
                              />
                              <Text style={styles.tooltipDate}>{cell.dayShort}</Text>
                              <View style={styles.tooltipDivider} />
                              <View style={styles.tooltipRow}>
                                <View style={[styles.tooltipDot, { backgroundColor: '#16A34A' }]} />
                                <Text style={styles.tooltipLabel}>Correct</Text>
                                <Text style={styles.tooltipValueCorrect}>{cell.correct}</Text>
                              </View>
                              <View style={styles.tooltipRow}>
                                <View style={[styles.tooltipDot, { backgroundColor: '#DC2626' }]} />
                                <Text style={styles.tooltipLabel}>Wrong</Text>
                                <Text style={styles.tooltipValueWrong}>{cell.wrong}</Text>
                              </View>
                              {cell.total > 0 && (
                                <Text style={styles.tooltipTotal}>
                                  {cell.total} total · {Math.round((cell.correct / cell.total) * 100)}% accuracy
                                </Text>
                              )}
                              {cell.total === 0 && (
                                <Text style={styles.tooltipEmpty}>No activity</Text>
                              )}
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                ))}
              </View>

              {/* Renk Açıklaması */}
              <View style={styles.heatmapLegend}>
                <Text style={styles.heatmapLegendLabel}>Less</Text>
                {HEAT_COLORS.map((c) => (
                  <View key={c} style={[styles.heatmapLegendCell, { backgroundColor: c }]} />
                ))}
                <Text style={styles.heatmapLegendLabel}>More</Text>
              </View>

              <Text style={styles.heatmapHint}>Tap any day to see details</Text>
            </View>

            {/* Problematic Words (Kara Liste) */}
            <Text style={styles.sectionHeader}>
              PROBLEMATIC WORDS ({problematicWords.length})
            </Text>
            {problematicWords.length === 0 ? (
              <Text style={styles.emptyText}>No problematic words right now. Well done!</Text>
            ) : (
              <View style={styles.problemList}>
                {problematicWords.map((word) => (
                  <View key={word.id} style={styles.problemItem}>
                    <Text style={styles.problemHanzi}>{word.hanzi}</Text>
                    <View style={styles.problemInfo}>
                      <Text style={styles.problemPinyin}>{word.pinyin}</Text>
                      <Text style={styles.problemMeaning}>{word.meaning}</Text>
                    </View>
                    <Text style={styles.warningTag}>3x Wrong</Text>
                  </View>
                ))}
              </View>
            )}
          </ScrollView>
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  contentCard: {
    width: '100%',
    maxHeight: '85%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 20,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderColor: '#F3F4F6',
  },
  title: {
    fontSize: 16,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1.5,
  },
  closeBtn: {
    fontSize: 18,
    color: '#9CA3AF',
    fontWeight: 'bold',
    paddingHorizontal: 4,
  },
  scrollBody: {
    paddingBottom: 10,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF7ED',
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    borderRadius: 16,
    padding: 14,
    marginBottom: 18,
  },
  streakFire: {
    fontSize: 28,
    marginRight: 12,
  },
  streakFireInactive: {
    opacity: 0.2,
  },
  streakValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#C2410C',
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#9A3412',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#6B7280',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
  masteryList: {
    gap: 10,
    marginBottom: 18,
  },
  masteryRow: {
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 12,
  },
  masteryLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  masteryName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
  },
  masteryCount: {
    fontSize: 12,
    color: '#6B7280',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E5E7EB',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: '#F9FAFB',
    padding: 12,
    borderRadius: 14,
    marginBottom: 18,
  },
  dayCol: {
    alignItems: 'center',
    gap: 4,
  },
  dayPillBox: {
    width: 38,
    borderRadius: 14,
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
    marginBottom: 6,
    overflow: 'hidden',
  },
  dayPillBoxEmpty: {
    height: 48,
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  pillTop: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 1,
  },
  pillBottom: {
    width: '100%',
    alignItems: 'center',
    paddingVertical: 1,
  },
  pillDivider: {
    width: '70%',
    height: 1,
    backgroundColor: '#E2E8F0',
    marginVertical: 2,
  },
  pillTextCorrect: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },
  pillTextWrong: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  pillTextEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#94A3B8',
  },
  dayText: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  // Takvim Alanı Stilleri
  heatmapContainer: {
    backgroundColor: '#F9FAFB',
    padding: 14,
    borderRadius: 14,
    marginBottom: 18,
  },
  calendarMonthHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  monthNavBtn: {
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderRadius: 8,
    backgroundColor: '#FEF3C7',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#F1F5F9',
    opacity: 0.5,
  },
  monthNavText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B45309',
  },
  monthNavTextDisabled: {
    color: '#94A3B8',
  },
  calendarMonthTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#991B1B',
    letterSpacing: 1,
  },
  weekdayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
    paddingHorizontal: 2,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
  },
  weekdayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6B7280',
    letterSpacing: 0.3,
  },
  heatmapBody: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 4,
  },
  calendarCellEmpty: {
    flex: 1,
    aspectRatio: 1,
  },
  calendarCellWrapper: {
    flex: 1,
    aspectRatio: 1,
    position: 'relative',
    zIndex: 1,
  },
  calendarCellWrapperSelected: {
    zIndex: 50,
    elevation: 20,
  },
  calendarCell: {
    width: '100%',
    height: '100%',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarCellToday: {
    borderColor: '#DC2626',
    borderWidth: 2,
  },
  calendarCellSelected: {
    borderColor: '#1E293B',
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#334155',
  },
  calendarDayTextLight: {
    color: '#FFFFFF',
  },
  calendarDayTextToday: {
    color: '#DC2626',
    fontWeight: '800',
  },
  // Tooltip Stilleri
  tooltip: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -40 }],
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FCD34D',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: 140,
    zIndex: 100,
    elevation: 12,
    shadowColor: '#B45309',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  tooltipRight: {
    left: '110%',
  },
  tooltipLeft: {
    right: '110%',
  },
  tooltipArrowBorder: {
    position: 'absolute',
    top: '50%',
    marginTop: -8,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 8,
    borderBottomWidth: 8,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tooltipArrowBorderLeft: {
    left: -8,
    borderRightWidth: 8,
    borderRightColor: '#FCD34D',
  },
  tooltipArrowBorderRight: {
    right: -8,
    borderLeftWidth: 8,
    borderLeftColor: '#FCD34D',
  },
  tooltipArrow: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    width: 0,
    height: 0,
    borderStyle: 'solid',
    borderTopWidth: 6,
    borderBottomWidth: 6,
    borderTopColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  tooltipArrowLeft: {
    left: -6,
    borderRightWidth: 6,
    borderRightColor: '#FFFBEB',
  },
  tooltipArrowRight: {
    right: -6,
    borderLeftWidth: 6,
    borderLeftColor: '#FFFBEB',
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: '#FEF3C7',
    marginBottom: 6,
  },
  tooltipRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  tooltipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    marginRight: 6,
  },
  tooltipLabel: {
    fontSize: 11,
    color: '#78716C',
    flex: 1,
  },
  tooltipValueCorrect: {
    fontSize: 11,
    fontWeight: '800',
    color: '#059669',
  },
  tooltipValueWrong: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  tooltipTotal: {
    fontSize: 10,
    color: '#92400E',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#FEF3C7',
    fontStyle: 'italic',
  },
  tooltipEmpty: {
    fontSize: 10,
    color: '#A8A29E',
    marginTop: 3,
    fontStyle: 'italic',
  },
  heatmapLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
    marginTop: 12,
  },
  heatmapLegendLabel: {
    fontSize: 10,
    color: '#6B7280',
    fontWeight: '600',
    marginHorizontal: 4,
  },
  heatmapLegendCell: {
    width: 12,
    height: 12,
    borderRadius: 3,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  heatmapHint: {
    fontSize: 10,
    color: '#94A3B8',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  emptyText: {
    fontSize: 13,
    color: '#9CA3AF',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  problemList: {
    gap: 8,
  },
  problemItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FEE2E2',
    padding: 10,
    borderRadius: 12,
  },
  problemHanzi: {
    fontSize: 22,
    fontWeight: '800',
    color: '#991B1B',
    width: 44,
  },
  problemInfo: {
    flex: 1,
  },
  problemPinyin: {
    fontSize: 13,
    fontWeight: '700',
    color: '#374151',
  },
  problemMeaning: {
    fontSize: 12,
    color: '#6B7280',
  },
  warningTag: {
    fontSize: 11,
    fontWeight: '700',
    color: '#DC2626',
    backgroundColor: '#FFFFFF',
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
});