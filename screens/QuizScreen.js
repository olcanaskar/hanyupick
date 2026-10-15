import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, StatusBar, ScrollView, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import * as Speech from 'expo-speech';

import { recordAnswer } from '../services/statsManager';
import { getCustomDecks } from '../services/importService';
import Header from '../components/Header';
import QuestionCard from '../components/QuestionCard';
import ScoreBoard from '../components/ScoreBoard';

import hsk1Data from '../data/hsk1.json';
import hsk2Data from '../data/hsk2.json';
import hsk3Data from '../data/hsk3.json';
import hsk4Data from '../data/hsk4.json';
import hsk5Data from '../data/hsk5.json';
import { buildOptions } from '../services/quizBuilder';

// Seviye -> kelime havuzu eşlemesi (tek yerde).
const LEVEL_POOLS = {
  hsk1: hsk1Data,
  hsk2: hsk2Data,
  hsk3: hsk3Data,
  hsk4: hsk4Data,
  hsk5: hsk5Data,
};

const ALL_WORDS = [...hsk1Data, ...hsk2Data, ...hsk3Data, ...hsk4Data, ...hsk5Data];

// Bir kelimenin id'sinden seviyesini çıkarır.
// hsk5 kayıtlarında `level` alanı yok; id aralıkları ise kesintisiz ve benzersizdir.
// Not: exampleService'teki aralıklarla aynı — Faz 3.1'de ortak bir modüle taşınacak.
const getLevelFromWordId = (id) => {
  if (typeof id !== 'number') return null;
  if (id <= 150) return 'hsk1';
  if (id <= 300) return 'hsk2';
  if (id <= 600) return 'hsk3';
  if (id <= 1200) return 'hsk4';
  return 'hsk5';
};

export default function QuizScreen({ 
  route, 
  navigation, 
  reviewPool = [], 
  setReviewPool = () => {} 
}) {
  const initialLevel = route?.params?.initialLevel || 'hsk1';
  const initialMode = route?.params?.initialMode || 'hanzi-to-pinyin';

  const [level, setLevel] = useState(initialLevel);
  const [mode, setMode] = useState(initialMode);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  // reviewPool'u ref üzerinden tutuyoruz ki generateQuestion dependency'sini kirletmesin
  const reviewPoolRef = useRef(reviewPool);
  useEffect(() => {
    reviewPoolRef.current = reviewPool;
  }, [reviewPool]);

  // Review moduna yalnızca İLK girişte yanlışı olan bir modu seçmek için kullanılan bayrak
  const didInitReviewMode = useRef(false);

  // Aynı cevabın çok hızlı iki kez işlenmesini (çift dokunma) engelleyen bayrak.
  // React state güncellemesi gecikmeli olduğundan kontrol için state değil ref kullanılır.
  const isAnsweredRef = useRef(false);
  const setAnswered = useCallback((value) => {
    isAnsweredRef.current = value;
    setIsAnswered(value);
  }, []);

  // Ana menüden veya harici bir nav değişiminden gelen initialLevel güncellenirse state'i senkronize et
  useEffect(() => {
    if (route?.params?.initialLevel) {
      setLevel(route.params.initialLevel);
    }
  }, [route?.params?.initialLevel]);

  // Kelime havuzunu seviyeye göre seçer (Standart HSK Seviyeleri)
  const getWordPool = useCallback((targetLevel = level) => {
    return LEVEL_POOLS[targetLevel] || ALL_WORDS;
  }, [level]);

  // Soru ve şıkları oluşturur (Asenkron destekli)
  const generateQuestion = useCallback(async (targetLevel = level, targetMode = mode) => {
    let currentPool = [];

    if (targetLevel === 'review') {
      const matchingItems = (reviewPoolRef.current || []).filter(
        (item) => (item.wrongMode || 'hanzi-to-pinyin') === targetMode
      );
      currentPool = matchingItems.map((item) => item.word || item);
    } else if (targetLevel.startsWith('custom_')) {
      const deckName = targetLevel.replace('custom_', '');
      const customDecks = await getCustomDecks();
      currentPool = customDecks[deckName] || [];
    } else {
      currentPool = getWordPool(targetLevel);
    }

    if (!currentPool || currentPool.length === 0) {
      setCurrentWord(null);
      setOptions([]);
      setAnswered(false);
      setSelectedOption(null);
      return;
    }

    const randomIndex = Math.floor(Math.random() * currentPool.length);
    const correctWord = currentPool[randomIndex];

    // Çeldiriciler önce doğru cevapla AYNI seviyeden seçilir; yeterli benzersiz aday
    // bulunamazsa tüm kelimelerden tamamlanır. Review'da kelimenin seviyesi id'den bulunur.
    const sameLevelPool =
      LEVEL_POOLS[targetLevel] ||
      (targetLevel === 'review' ? LEVEL_POOLS[getLevelFromWordId(correctWord.id)] : null);
    const distractorPools = sameLevelPool ? [sameLevelPool, ALL_WORDS] : [ALL_WORDS];

    const combinedOptions = buildOptions(correctWord, distractorPools);

    setCurrentWord(correctWord);
    setOptions(combinedOptions);
    setAnswered(false);
    setSelectedOption(null);
  }, [level, mode, getWordPool, setAnswered]);

  // Ses motorunu arka planda önceden ısıtma (Warm-up)
  useEffect(() => {
    Speech.getAvailableVoicesAsync().catch(() => {});
    Speech.speak(' ', { language: 'zh-CN', volume: 0 });
  }, []);

  // Seviye veya mod değiştiğinde yeni soru üret
  useEffect(() => {
    generateQuestion(level, mode);
  }, [level, mode, generateQuestion]);

  // Review modunda mod seçimi:
  // - Review'a İLK girişte, yanlışı olan bir mod otomatik seçilir (tek seferlik).
  // - Sonrasında mod sekmeleri SERBESTÇE değiştirilebilir; mod asla zorla geri alınmaz.
  // - Yanlışı olmayan bir moda geçilirse aşağıdaki "No Mistakes in this Mode!" uyarısı görünür.
  useEffect(() => {
    if (level !== 'review') {
      didInitReviewMode.current = false; // Review'dan çıkınca bayrağı sıfırla
      return;
    }
    if (didInitReviewMode.current) return;
    didInitReviewMode.current = true;

    if (!reviewPool || reviewPool.length === 0) return;

    const hasItemsInMode = reviewPool.some(
      (item) => (item.wrongMode || 'hanzi-to-pinyin') === mode
    );
    if (!hasItemsInMode) {
      setMode(reviewPool[0].wrongMode || 'hanzi-to-pinyin');
    }
  }, [level, reviewPool, mode]);

  // Seçenek tıklama mantığı
  const handleSelectOption = (option) => {
    // ref bayrağı: state gecikmesinden bağımsız olarak çift dokunmayı engeller
    if (isAnsweredRef.current || !currentWord) return;

    setAnswered(true);
    setSelectedOption(option);

    const isCorrect = option.id === currentWord.id;

    recordAnswer({
      wordId: currentWord.id,
      level: level,
      mode: mode,
      isCorrect: isCorrect,
    });

    if (isCorrect) {
      Haptics.selectionAsync();
    } else {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      setTimeout(() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }, 140);
    }

    if (level === 'review') {
      if (isCorrect) {
        setScore((prev) => ({
          correct: prev.correct + 1,
          wrong: Math.max(0, prev.wrong - 1),
        }));

        setReviewPool((prev) =>
          prev.filter(
            (item) =>
              !(
                (item.id || item.word?.id) === currentWord.id &&
                (item.wrongMode || 'hanzi-to-pinyin') === mode
              )
          )
        );
      } else {
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      }
    } else {
      if (isCorrect) {
        setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      } else {
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        setReviewPool((prev) => {
          const exists = prev.some(
            (item) =>
              (item.id || item.word?.id) === currentWord.id &&
              (item.wrongMode || 'hanzi-to-pinyin') === mode
          );
          if (exists) return prev;
          return [...prev, { ...currentWord, word: currentWord, wrongMode: mode }];
        });
      }
    }
  };

  const handleNextQuestion = () => {
    if (level === 'review') {
      const remaining = (reviewPoolRef.current || []).filter(
        (item) => (item.wrongMode || 'hanzi-to-pinyin') === mode
      );
      if (remaining.length === 0) {
        setCurrentWord(null);
        setOptions([]);
        setAnswered(false);
        setSelectedOption(null);
        return;
      }
    }
    generateQuestion(level, mode);
  };

  const getSubText = () => {
    if (level === 'review' && reviewPool.length === 0) {
      return 'No words to review!';
    }
    if (mode.endsWith('to-pinyin')) return 'Choose the correct pinyin';
    if (mode.endsWith('to-hanzi')) return 'Choose the correct character';
    return 'Choose the correct English meaning';
  };

  // Review modunda, içinde bulunulan moda ait kalan yanlış sayısı
  const reviewCountForMode = (reviewPool || []).filter(
    (item) => (item.wrongMode || 'hanzi-to-pinyin') === mode
  ).length;

  // Seviye değiştiğinde HomeScreen'i bilgilendiren dinleyici tetikleyicisi
  const handleLevelChange = (newLevel) => {
    setLevel(newLevel);
    DeviceEventEmitter.emit('onLevelChange', newLevel);
  };

  return (
    <View style={styles.screenBackground}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <StatusBar barStyle="dark-content" backgroundColor="#FBF5EB" translucent={false} />
        <View style={styles.container}>
          <Header
            level={level}
            setLevel={handleLevelChange}
            mode={mode}
            setMode={setMode}
            reviewCount={level === 'review' ? reviewCountForMode : reviewPool.length}
            onBackPress={() => navigation.goBack()}
          />

          <ScoreBoard correct={score.correct} wrong={score.wrong} />

          <ScrollView
            style={styles.scrollStyle}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {currentWord && !isAnswered && (
              <Text style={styles.subText}>{getSubText()}</Text>
            )}

            {level === 'review' && !currentWord && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyTitle}>
                  {reviewPool.length === 0 ? 'All Clear! 🎉' : 'No Mistakes in this Mode! ✨'}
                </Text>
                <Text style={styles.emptySubtitle}>
                  {reviewPool.length === 0
                    ? "You've cleared all incorrect answers!"
                    : 'Switch to other tabs above to practice mistakes in other question modes.'}
                </Text>
              </View>
            )}

            {currentWord && (
              <QuestionCard
                currentWord={currentWord}
                level={level}
                mode={mode}
                isAnswered={isAnswered}
                selectedOption={selectedOption}
                options={options}
                onSelectOption={handleSelectOption}
                onNextQuestion={handleNextQuestion}
              />
            )}
          </ScrollView>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screenBackground: {
    flex: 1,
    backgroundColor: '#FBF5EB',
  },
  safeArea: {
    flex: 1,
    backgroundColor: '#FBF5EB',
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    backgroundColor: '#FBF5EB',
  },
  scrollStyle: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 12,
  },
  subText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#B45309',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  emptyContainer: {
    padding: 30,
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#FEE2E2',
    width: '100%',
    shadowColor: '#DC2626',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 3,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#DC2626',
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#78350F',
    textAlign: 'center',
    lineHeight: 22,
  },
});