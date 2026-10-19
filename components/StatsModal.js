import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { getStats, getMastery, isProblematic } from '../services/statsManager';
import { getCustomDecks } from '../services/importService';
import { WEB_FRAME_WIDTH } from './layout';
import { getDateKey, addDays } from '../services/dateUtils';
import { ALL_WORDS, LEVELS, LEVEL_LABELS, LEVEL_POOLS } from '../services/wordRepository';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

// Seviye renkleri yalnızca bu ekrana özgü sunum bilgisidir; seviye listesi
// wordRepository'den gelir. Faz 12: gökkuşağı yerine uygulamanın kırmızı rampası —
// HSK 1'den 6'ya doğru KOYULAŞIR (ilerleme hissi) ve hepsi `#F8F9FA` zemin üzerinde
// okunur kalır. Çubuk uzunluğu zaten yüzdeyi gösterdiği için renk bilgi taşımaz.
const LEVEL_COLORS = {
  hsk1: '#F87171',
  hsk2: '#EF4444',
  hsk3: '#DC2626',
  hsk4: '#B91C1C',
  hsk5: '#991B1B',
  hsk6: '#7F1D1D',
};

// Özel desteler bir HSK seviyesi değildir: kırmızı rampanın DIŞINDA, uygulamanın
// nötr koyu tonunu alır ki altı seviyeden ayırt edilebilsin (bölümdeki
// "CUSTOM DECKS" ayracı da zaten bunu söyler).
const CUSTOM_DECK_COLOR = '#2C3E50';

// Isı ölçeği (aktivite az → çok): nötr zeminden koyu kırmızıya.
const HEAT_COLORS = ['#E9ECEF', '#FEE2E2', '#FCA5A5', '#DC2626', '#7F1D1D'];

const getHeatColor = (total) => {
  if (total === 0) return '#E9ECEF';       // Aktivite yok
  if (total <= 10) return '#FEE2E2';       // Çok az (kırmızı-100)
  if (total <= 25) return '#FCA5A5';       // Az (kırmızı-300)
  if (total <= 50) return '#DC2626';       // Orta (kırmızı-600)
  return '#7F1D1D';                        // Çok (koyu kırmızı)
};

// Sabit takvim grid'inin ölçüleri: 7 eşit sütun, aralarında `CALENDAR_GAP` px boşluk
// (`styles.calendarWeekRow.gap`) ve `styles.heatmapContainer`'ın `CALENDAR_PADDING` px
// iç boşluğu. Stil tarafı da bu sabitleri kullanır (tek kaynak).
const CALENDAR_COLUMNS = 7;
const CALENDAR_GAP = 4;
const CALENDAR_PADDING = 14;

// Gün detay balonunun (tooltip) doğal genişliği (`styles.tooltip.minWidth`) ve
// hücreye bakan kenarının hücreden uzaklığı: hücre genişliğinin %110'u
// (`styles.tooltipLeft` / `styles.tooltipRight`).
const TOOLTIP_MIN_WIDTH = 140;
const TOOLTIP_OFFSET = 1.1;

/**
 * Gün detay balonunun hangi tarafa açılacağını ve en fazla ne kadar geniş
 * olabileceğini hesaplar.
 *
 * Sağ yarıdaki sütunlar balonu sağa, sol yarıdakiler (ortadaki 4. sütun dâhil)
 * sola doğru açar: ortadaki sütunda sağa açmak balonu kartın/ScrollView'ın dışına
 * taşırıyordu ve kenarı kesiliyordu (Faz 14).
 *
 * Balon bir ScrollView'ın içinde yaşadığı için taşan kısmı KIRPILIR; bu yüzden
 * seçilen tarafta kalan boşluk bir üst sınır olarak verilir. Normal genişliklerde
 * bu sınır `TOOLTIP_MIN_WIDTH`in altına inmez (görünüm değişmez); yalnızca çok dar
 * ekranlarda balon daralıp metin alt satıra kayar, kenar yine kesilmez. Balonun
 * hemen dışında `CALENDAR_PADDING` px daha yer vardır (grid, kabının iç
 * boşluğunun içindedir).
 *
 * @param {number} colIdx 0-6 arası sütun indeksi
 * @param {number} cellWidth Ölçülen hücre genişliği (0 = henüz ölçülmedi)
 * @param {number} gridWidth Ölçülen grid genişliği (0 = henüz ölçülmedi)
 * @returns {{ opensLeft: boolean, width: number|null }} `width`: yalnızca
 *   daraltılması gerektiğinde kesin genişlik (px), yoksa `null` (doğal genişlik).
 */
function getTooltipLayout(colIdx, cellWidth, gridWidth) {
  const opensLeft = colIdx >= Math.floor(CALENDAR_COLUMNS / 2); // 0-2 sağa, 3-6 sola

  if (!cellWidth || !gridWidth) return { opensLeft, width: null }; // ölçüm öncesi varsayılan

  const cellLeft = colIdx * (cellWidth + CALENDAR_GAP);
  const cellRight = cellLeft + cellWidth;
  const anchor = TOOLTIP_OFFSET * cellWidth; // balonun hücreye bakan kenarının dışta kalan payı

  const available = opensLeft
    ? CALENDAR_PADDING + (cellRight - anchor) // sağ kenarından ScrollView'ın sol kenarına kadar
    : CALENDAR_PADDING + (gridWidth - cellLeft - anchor); // sol kenarından ScrollView'ın sağ kenarına

  // Yalnızca gerektiğinde daralt (tam sayıya yuvarla: kırpma sınırında yarım piksel
  // taşmasın). Normal genişliklerde balon doğal genişliğinde kalır → görünüm değişmez.
  return {
    opensLeft,
    width: available < TOOLTIP_MIN_WIDTH ? Math.floor(available) : null,
  };
}

export default function StatsModal({ visible, onClose }) {
  const [statsData, setStatsData] = useState(null);
  const [customDecks, setCustomDecks] = useState({});
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedMonthDate, setSelectedMonthDate] = useState(new Date());
  // Takvim grid'inin ölçülen genişliği: gün detay balonunun yerleşimi (hangi tarafa
  // açılacağı ve en fazla ne kadar geniş olabileceği) bundan hesaplanır — bkz.
  // `getTooltipLayout`. Ölçüm gelene kadar (0) balon varsayılan genişlikte çizilir.
  const [calendarGridWidth, setCalendarGridWidth] = useState(0);

  // Animasyon Değerleri (Ölçek, Dikey Kayma ve Opaklık)
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const translateYAnim = useRef(new Animated.Value(35)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;

  // İçerik (istatistikler + özel desteler) en az bir kez yüklendi mi? Açılış
  // animasyonunun kapısı budur (aşağıdaki iki effect'e bakınız).
  const statsLoadedRef = useRef(false);

  // 1. İçeriği pop-up AÇILMADAN önce ısıt (Faz 14): kart ilk açılışta da DOLU
  //    gelmeli, yoksa animasyon "Loading…" boyutunda başlayıp veri gelince kart
  //    büyür/ortadan kayar → açılış "bug'lı/takılıyor" gibi görünür (Ayarlar ve
  //    özel deste pop-up'larının içeriği sabit olduğu için onlar temiz açılır).
  useEffect(() => {
    let cancelled = false;

    Promise.all([getStats(), getCustomDecks()]).then(([data, decks]) => {
      if (cancelled) return;

      statsLoadedRef.current = true;
      setStatsData(data);
      setCustomDecks(decks);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  // 2. Açılış: animasyon içerik HAZIR olduğunda başlar.
  useEffect(() => {
    if (!visible) return;

    scaleAnim.setValue(0.85);
    translateYAnim.setValue(35);
    opacityAnim.setValue(0);

    let cancelled = false;
    let entranceStarted = false;
    let fallbackTimer = null;

    // Kartın hemen belirmesi Faz 4.1'de bilinçliydi ("İstatistik"e basmak işlemiyor
    // gibi görünmesin). O davranış korunur, ama veri okunana kadar beklemek yerine
    // içerik ÖNCEDEN ısıtıldığı için animasyon normalde veriyle AYNI ANDA oynar.
    const playEntrance = () => {
      if (cancelled || entranceStarted) return;

      entranceStarted = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);

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
    };

    // İçerik hazırsa animasyon HEMEN başlar (kart tam boyutuyla, içerik değişmez).
    // Değilse (ilk açılış) veri gelene kadar beklenir; animasyon içerikle birlikte
    // oynar, böylece kart yarı çizilip sonra büyümez. `fallbackTimer`: okuma çok
    // yavaşlar ya da başarısız olursa kart yine de (yükleme göstergesiyle) belirsin,
    // pop-up görünmez kalmasın.
    if (statsLoadedRef.current) playEntrance();
    else fallbackTimer = setTimeout(playEntrance, 150);

    // İstatistiklerin yanında özel desteler de yüklenir: özel kelimelerin
    // `wordStats` kayıtları zaten vardı (QuizScreen id olarak 'custom_...' yazar),
    // eksik olan yalnızca gösterimdi (Faz 3.6b). Diskteki veri açılışta bir kez
    // daha okunur: ısıtma ile pop-up açılması arasında değişmiş olabilir.
    Promise.all([getStats(), getCustomDecks()]).then(([data, decks]) => {
      if (cancelled) return; // modal kapandıysa state yazma

      statsLoadedRef.current = true;
      setStatsData(data);
      setCustomDecks(decks);
      playEntrance();
    });

    return () => {
      cancelled = true;
      if (fallbackTimer) clearTimeout(fallbackTimer);

      // Ay/gün seçimi BURADA sıfırlanır, açılışta değil: açılışta sıfırlamak kart
      // göründükten sonra bir kare içinde takvimi "zıplatıyordu" (kullanıcı geçmiş
      // bir aya bakıp kapatmışsa). Bu cleanup, kapanış animasyonu BİTTİKTEN sonra
      // (`handleClose` → `onClose`) çalışır; kart artık görünmez, dolayısıyla
      // sıfırlama ekranda hiç görünmez ve bir sonraki açılış temiz başlar.
      setSelectedDay(null);
      setSelectedMonthDate(new Date());
    };
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

  // Not (Faz 11): "İlerlemeyi sıfırla" artık burada değil, Ayarlar pop-up'ındadır
  // (`components/SettingsModal.js`). Aynı akışı kullanır: `clearAllStats()` +
  // yanlış havuzunun sahibi olan App.js'e `onProgressReset` olayı.

  // Referanslar SABİTLENİR: `statsData?.x || {}` her render'da yeni bir nesne üretir ve
  // aşağıdaki `useMemo`ların bağımlılığını değiştirirdi → memoizasyon anlamsız olurdu
  // (`react-hooks/exhaustive-deps` de bunu söylüyordu).
  const wordStats = useMemo(() => statsData?.wordStats || {}, [statsData]);
  const dailyStats = useMemo(() => statsData?.dailyStats || {}, [statsData]);
  const streak = statsData?.streak || { current: 0 };

  // 1. Mastery Hesaplama — kural tek kaynaktan (services/statsManager.js) gelir,
  //    HSK seviyeleri ve özel desteler aynı kurala tabidir (Faz 3.6b).
  //
  // `useMemo` (Faz 4.1): bu hesaplamalar her render'da yeniden yapılıyordu — takvimde
  // bir güne dokunmak (`setSelectedDay`) bile 2.500 kelimelik "sorunlu kelime"
  // taramasını ve 6 ustalık geçişini baştan çalıştırıyordu. Artık yalnızca girdi
  // (istatistikler / desteler / seçilen ay) değiştiğinde hesaplanıyor.
  const masteryRows = useMemo(
    () =>
      LEVELS.map((level) => {
        const pool = LEVEL_POOLS[level] || [];
        return {
          id: level,
          name: LEVEL_LABELS[level],
          total: pool.length,
          color: LEVEL_COLORS[level],
          stat: getMastery(pool, wordStats),
        };
      }),
    [wordStats]
  );

  // Özel desteler: deste başına bir ustalık satırı (deste yoksa bölüm hiç çizilmez).
  const customDeckNames = useMemo(() => Object.keys(customDecks), [customDecks]);

  const customMasteryRows = useMemo(
    () =>
      customDeckNames.map((name) => {
        const pool = customDecks[name] || [];
        return {
          id: `deck_${name}`,
          name,
          total: pool.length,
          color: CUSTOM_DECK_COLOR,
          stat: getMastery(pool, wordStats),
        };
      }),
    [customDeckNames, customDecks, wordStats]
  );

  // 2. Problematic Words — HSK sözlüğü ve özel destelerdeki kelimeler birlikte;
  //    ikisi de aynı `wordStats` tablosundan okunur.
  const problematicWords = useMemo(() => {
    const customWords = customDeckNames.reduce(
      (acc, name) => acc.concat(customDecks[name] || []),
      []
    );

    return [...ALL_WORDS, ...customWords].filter((w) => isProblematic(wordStats[w.id]));
  }, [customDeckNames, customDecks, wordStats]);

  // Ustalık satırı iki bölümde de (HSK + özel deste) aynı görünsün diye tek yerde üretilir.
  const renderMasteryRow = (row) => (
    <View
      key={row.id}
      style={styles.masteryRow}
      accessible={true}
      accessibilityLabel={`${row.name}: ${row.stat.count} of ${row.total} mastered (${row.stat.percent}%)`}
    >
      <View style={styles.masteryLabels}>
        <Text style={styles.masteryName} numberOfLines={1}>
          {row.name}
        </Text>
        <Text style={styles.masteryCount}>
          {row.stat.count}/{row.total} ({row.stat.percent}%)
        </Text>
      </View>
      <View style={styles.progressBarBg}>
        <View
          style={[
            styles.progressBarFill,
            { width: `${row.stat.percent}%`, backgroundColor: row.color },
          ]}
        />
      </View>
    </View>
  );

  // 3. Son 7 Günlük Aktivite Listesi
  const recentDays = useMemo(
    () =>
      Array.from({ length: 7 }).map((_, i) => {
        const d = addDays(new Date(), -(6 - i));
        const dateStr = getDateKey(d);
        const dayLabel = d.toLocaleDateString('en-US', { weekday: 'short' });
        const dayData = dailyStats[dateStr] || { correct: 0, wrong: 0 };
        return { dateStr, dayLabel, ...dayData };
      }),
    [dailyStats]
  );

  // 4. Sabit Takvim Grid Hesaplamaları (`useMemo`: yalnızca ay/veri değişince —
  //    gün seçmek takvimi baştan kurmaz).
  const calendarWeeks = useMemo(() => {
    const year = selectedMonthDate.getFullYear();
    const month = selectedMonthDate.getMonth();

    const firstDayOfMonth = new Date(year, month, 1);
    const startWeekday = (firstDayOfMonth.getDay() + 6) % 7; // 0 = Pzt, 6 = Paz
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const todayStr = getDateKey(new Date());

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
    const weeks = [];
    for (let i = 0; i < gridCells.length; i += 7) {
      weeks.push(gridCells.slice(i, i + 7));
    }

    return weeks;
  }, [dailyStats, selectedMonthDate]);

  // Hücre genişliği grid'den türetilir (ölçüm gelmeden 0 → balon varsayılan).
  const calendarCellWidth =
    calendarGridWidth > 0
      ? (calendarGridWidth - (CALENDAR_COLUMNS - 1) * CALENDAR_GAP) / CALENDAR_COLUMNS
      : 0;

  // Ay gezinme butonu için: seçili ay içinde miyiz?
  const todayObj = new Date();
  const isCurrentMonth =
    selectedMonthDate.getFullYear() === todayObj.getFullYear() &&
    selectedMonthDate.getMonth() === todayObj.getMonth();

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
        {/* Kapatma alanı dekoratiftir: ekran okuyucu ağacının DIŞINDA tutulur, yoksa
            odaklanıp "etiketsiz" diye okunur (kapatma için ✕ ve donanım geri tuşu var). */}
        <AnimatedPressable
          style={[styles.overlay, { opacity: opacityAnim }]}
          onPress={handleClose}
          accessible={false}
          accessibilityElementsHidden={true}
          importantForAccessibility="no"
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
          accessibilityViewIsModal={true}
        >
          <View style={styles.headerRow}>
            <Text style={styles.title} accessibilityRole="header">STATISTICS</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} accessibilityRole="button" accessibilityLabel="Close">
              <Text style={styles.closeBtn}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollBody}>
            {statsData ? (
              <>
                {/* Streak & Günlük Durum */}
                <View
                  style={styles.streakCard}
                  accessible={true}
                  accessibilityLabel={`Streak: ${streak.current} ${streak.current === 1 ? 'day' : 'days'}`}
                >
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

                {/* Mastery Oranları: HSK seviyeleri ve (varsa) özel desteler AYNI bölümde.
                    Özel desteler ayrı bir bölüm başlığı değil, bölüm içi bir alt grup:
                    satırların arasına ince bir ayraç konur (bkz. masteryDivider). */}
                <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
                  MASTERY LEVEL (3 STREAKS IN ALL MODES)
                </Text>
                <View style={styles.masteryList}>
                  {masteryRows.map(renderMasteryRow)}

                  {customMasteryRows.length > 0 && (
                    <View style={styles.masteryDivider}>
                      <View style={styles.masteryDividerLine} />
                      <Text style={styles.masteryDividerLabel}>CUSTOM DECKS</Text>
                      <View style={styles.masteryDividerLine} />
                    </View>
                  )}

                  {customMasteryRows.map(renderMasteryRow)}
                </View>

                {/* 7 Günlük Aktivite Takvimi */}
                <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
                  LAST 7 DAYS ACTIVITY
                </Text>
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
                <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
                  ACTIVITY CALENDAR
                </Text>
                <View style={styles.heatmapContainer}>
                  {/* Ay Başlığı ve Gezinme Butonları */}
                  <View style={styles.calendarMonthHeader}>
                    <TouchableOpacity
                      style={styles.monthNavBtn}
                      onPress={handlePrevMonth}
                      activeOpacity={0.7}
                      accessibilityRole="button"
                      accessibilityLabel="Previous month"
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
                      accessibilityRole="button"
                      accessibilityLabel="Next month"
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

                  {/* Takvim Grid'i (genişliği ölçülür: balon yerleşimi buna göre hesaplanır) */}
                  <View
                    style={styles.heatmapBody}
                    onLayout={(e) => setCalendarGridWidth(e.nativeEvent.layout.width)}
                  >
                    {calendarWeeks.map((week, weekIdx) => (
                      <View key={weekIdx} style={styles.calendarWeekRow}>
                        {week.map((cell, colIdx) => {
                          if (cell.type === 'empty') {
                            return <View key={cell.id} style={styles.calendarCellEmpty} />;
                          }

                          const isSelected = selectedDay?.dateStr === cell.dateStr;
                          const heatColor = getHeatColor(cell.total);
                          const { opensLeft, width: tooltipWidth } = getTooltipLayout(
                            colIdx,
                            calendarCellWidth,
                            calendarGridWidth
                          );

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
                                accessibilityRole="button"
                                accessibilityLabel={
                                  cell.total > 0
                                    ? `${cell.dayShort}, ${cell.correct} correct, ${cell.wrong} wrong`
                                    : `${cell.dayShort}, no activity`
                                }
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
                                    opensLeft ? styles.tooltipLeft : styles.tooltipRight,
                                    // Daraltma gerektiğinde kesin genişlik: `minWidth` ile
                                    // `maxWidth` birlikte verilir ki hangisi önce uygulanırsa
                                    // uygulansın sonuç aynı olsun (Yoga'da ikisi de kırpar).
                                    tooltipWidth ? { minWidth: tooltipWidth, maxWidth: tooltipWidth } : null,
                                  ]}
                                >
                                  <View
                                    style={[
                                      styles.tooltipArrowBorder,
                                      opensLeft
                                        ? styles.tooltipArrowBorderRight
                                        : styles.tooltipArrowBorderLeft,
                                    ]}
                                  />
                                  <View
                                    style={[
                                      styles.tooltipArrow,
                                      opensLeft ? styles.tooltipArrowRight : styles.tooltipArrowLeft,
                                    ]}
                                  />
                                  <Text style={styles.tooltipDate}>{cell.dayShort}</Text>
                                  <View style={styles.tooltipDivider} />
                                  <View style={styles.tooltipRow}>
                                    <View style={[styles.tooltipDot, { backgroundColor: '#047857' }]} />
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
                <Text style={styles.sectionHeader} accessible={true} accessibilityRole="header">
                  PROBLEMATIC WORDS ({problematicWords.length})
                </Text>
                {problematicWords.length === 0 ? (
                  <Text
                    style={styles.emptyText}
                    accessible={true}
                    accessibilityLabel="No problematic words right now. Well done!"
                  >
                    No problematic words right now. Well done!
                  </Text>
                ) : (
                  <View style={styles.problemList}>
                    {problematicWords.map((word) => (
                      <View
                        key={word.id}
                        style={styles.problemItem}
                        accessible={true}
                        accessibilityLabel={`${word.hanzi}, ${word.pinyin}, ${word.meaning}, repeated wrong`}
                      >
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
              </>
            ) : (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="small" color="#DC2626" />
                <Text style={styles.loadingText}>Loading…</Text>
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
    // Faz 24 (web): Modal `document.body`'ye portal açtığı için kart aksi hâlde
    // tüm sekmeyi kaplıyor; çerçeve genişliğiyle sınırlanır (bkz. components/layout.js).
    maxWidth: WEB_FRAME_WIDTH,
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
    borderColor: '#E9ECEF',
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
  // Faz 4.1: veri gelene kadar çizilen kısa yükleme satırı. Kartın boyutu bir kare
  // içinde zıplamasın diye minimum yükseklik verilir (içerik gelince dolar).
  loadingBox: {
    minHeight: 220,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  loadingText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
    letterSpacing: 0.5,
  },
  streakCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
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
    color: '#B91C1C',
  },
  streakSubtitle: {
    fontSize: 12,
    color: '#991B1B',
  },
  sectionHeader: {
    fontSize: 11,
    fontWeight: '800',
    color: '#7F8C8D',
    letterSpacing: 1,
    marginBottom: 10,
    marginTop: 6,
  },
  masteryList: {
    gap: 10,
    marginBottom: 18,
  },
  // Bölüm içi alt grup ayracı: özel desteler "MASTERY LEVEL" bölümünün parçası gibi
  // görünsün diye ayrı bir sectionHeader yerine satır arası ince bir ayraç kullanılır.
  masteryDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  masteryDividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E9ECEF',
  },
  masteryDividerLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#9CA3AF',
    letterSpacing: 1,
  },
  masteryRow: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    borderRadius: 12,
  },
  masteryLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  masteryName: {
    // `flex: 1` + `numberOfLines={1}`: uzun özel deste adları sayaç metnini
    // ekranın dışına itmesin, ad kısalsın (üç nokta ile).
    flex: 1,
    marginRight: 8,
    fontSize: 14,
    fontWeight: '700',
    color: '#2C3E50',
  },
  masteryCount: {
    fontSize: 12,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: '#E9ECEF',
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
    backgroundColor: '#F8F9FA',
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
    backgroundColor: '#F8F9FA',
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
    color: '#047857',
  },
  pillTextWrong: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  pillTextEmpty: {
    fontSize: 12,
    fontWeight: '600',
    color: '#9CA3AF',
  },
  dayText: {
    fontSize: 11,
    color: '#7F8C8D',
    fontWeight: '600',
  },
  // Takvim Alanı Stilleri
  heatmapContainer: {
    backgroundColor: '#F8F9FA',
    padding: CALENDAR_PADDING, // balon yerleşimi bu değeri bilir (CALENDAR_PADDING)
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
    backgroundColor: '#FEF2F2',
  },
  monthNavBtnDisabled: {
    backgroundColor: '#E9ECEF',
    opacity: 0.5,
  },
  monthNavText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#B91C1C',
  },
  monthNavTextDisabled: {
    color: '#9CA3AF',
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
    color: '#7F8C8D',
    letterSpacing: 0.3,
  },
  heatmapBody: {
    gap: 4,
  },
  calendarWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: CALENDAR_GAP, // balon yerleşimi bu değeri bilir (CALENDAR_GAP)
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
    borderColor: '#2C3E50',
    borderWidth: 2,
  },
  calendarDayText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#2C3E50',
  },
  calendarDayTextLight: {
    color: '#FFFFFF',
  },
  calendarDayTextToday: {
    color: '#7F1D1D',
    fontWeight: '800',
  },
  // Tooltip Stilleri
  tooltip: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -40 }],
    backgroundColor: '#FEF2F2',
    borderWidth: 1.5,
    borderColor: '#FCA5A5',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    minWidth: TOOLTIP_MIN_WIDTH,
    zIndex: 100,
    elevation: 12,
    shadowColor: '#991B1B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
  },
  tooltipRight: {
    left: `${TOOLTIP_OFFSET * 100}%`, // hücrenin sağında (balon yerleşimi bu değeri bilir)
  },
  tooltipLeft: {
    right: `${TOOLTIP_OFFSET * 100}%`, // hücrenin solunda
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
    borderRightColor: '#FCA5A5',
  },
  tooltipArrowBorderRight: {
    right: -8,
    borderLeftWidth: 8,
    borderLeftColor: '#FCA5A5',
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
    borderRightColor: '#FEF2F2',
  },
  tooltipArrowRight: {
    right: -6,
    borderLeftWidth: 6,
    borderLeftColor: '#FEF2F2',
  },
  tooltipDate: {
    fontSize: 11,
    fontWeight: '800',
    color: '#B91C1C',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  tooltipDivider: {
    height: 1,
    backgroundColor: '#FEE2E2',
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
    color: '#7F8C8D',
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
    color: '#991B1B',
    marginTop: 5,
    paddingTop: 5,
    borderTopWidth: 1,
    borderTopColor: '#FEE2E2',
    fontStyle: 'italic',
  },
  tooltipEmpty: {
    fontSize: 10,
    color: '#9CA3AF',
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
    color: '#7F8C8D',
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
    color: '#9CA3AF',
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
    color: '#2C3E50',
  },
  problemMeaning: {
    fontSize: 12,
    color: '#7F8C8D',
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