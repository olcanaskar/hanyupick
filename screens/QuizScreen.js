import React, { useState, useEffect, useCallback, useRef } from 'react';
import { StyleSheet, View, Text, StatusBar, ScrollView, DeviceEventEmitter } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { recordAnswer } from '../services/statsManager';
import { CUSTOM_ID_PREFIX, getCustomDecks, isCustomDeckLevel } from '../services/importService';
import Header from '../components/Header';
import QuestionCard from '../components/QuestionCard';
import ScoreBoard from '../components/ScoreBoard';

import { buildOptions, pickWord } from '../services/quizBuilder';
import {
  ALL_WORDS,
  LEVEL_POOLS,
  getLevelFromWordId,
  getWordPool,
} from '../services/wordRepository';
import {
  addEntry,
  countForMode,
  filterByMode,
  getWrongMode,
  makeReviewEntry,
  removeEntry,
  resolveReviewWord,
} from '../services/reviewPool';
import { DEFAULT_MODE, getAnswerType } from '../services/modes';
import { warmUpSpeech } from '../services/speechService';

/**
 * @param {{
 *   route?: any,
 *   navigation?: any,
 *   reviewPool?: any[],
 *   setReviewPool?: (updater: any) => void,
 * }} props
 */
export default function QuizScreen({
  route,
  navigation,
  reviewPool = [],
  setReviewPool = () => {}
}) {
  const initialLevel = route?.params?.initialLevel || 'hsk1';
  const initialMode = route?.params?.initialMode || DEFAULT_MODE;

  const [level, setLevel] = useState(initialLevel);
  const [mode, setMode] = useState(initialMode);
  const [score, setScore] = useState({ correct: 0, wrong: 0 });

  const [currentWord, setCurrentWord] = useState(null);
  const [options, setOptions] = useState([]);
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOption, setSelectedOption] = useState(null);

  // Havuz çözülene kadar geçen süre. Özel desteler AsyncStorage'dan okunduğu için
  // `generateQuestion` asenkrondur; bayrak olmasaydı ilk karede (henüz kelime yokken)
  // "bu seviyede kelime yok" ekranı bir an görünüp kaybolurdu. Aynı anda birden çok
  // istek (hızlı seviye/mod değişimi) olursa yalnızca EN SON isteğin sonucu yazılır.
  const [isPoolLoading, setIsPoolLoading] = useState(true);
  const poolRequestRef = useRef(0);

  // Her yeni soruda artan sayaç. QuestionCard'a `key` olarak verilir, böylece kart her
  // soruda SIFIRDAN kurulur. Kartı yeniden kullanmak güvenli değildi: "sonraki soruya
  // geç" animasyonu kartı ekranın dışına kaydırıp opaklığını 0 yapıyor, sıfırlama ise
  // yalnızca kelime id'si DEĞİŞTİĞİNDE çalışıyordu. Aynı kelime arka arkaya gelince
  // (5 kelimelik bir destede her soruda ~1/5 olasılık) kart bir daha görünmüyordu:
  // komut satırı çiziliyor ama kart ekranın dışında ve görünmez kalıyordu.
  const [questionSeq, setQuestionSeq] = useState(0);

  // reviewPool'u ref üzerinden tutuyoruz ki generateQuestion dependency'sini kirletmesin
  const reviewPoolRef = useRef(reviewPool);
  useEffect(() => {
    reviewPoolRef.current = reviewPool;
  }, [reviewPool]);

  // Son gösterilen kelimenin id'si. Yine ref: generateQuestion'ın bağımlılıklarına
  // girerse (state olsaydı) effect her soruda yeniden tetiklenip soruyu iki kez
  // üretirdi. Ardışık sorularda aynı kartın tekrar gelmemesi için kullanılır.
  const lastWordIdRef = useRef(null);

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

  // Soru ve şıkları oluşturur (Asenkron destekli)
  const generateQuestion = useCallback(async (targetLevel = level, targetMode = mode) => {
    const requestId = poolRequestRef.current + 1;
    poolRequestRef.current = requestId;

    let currentPool = [];

    if (targetLevel === 'review') {
      currentPool = filterByMode(reviewPoolRef.current, targetMode)
        .map(resolveReviewWord)
        .filter(Boolean);
    } else if (isCustomDeckLevel(targetLevel)) {
      // Özel deste diskten okunur: bu bekleme sırasında "kelime yok" ekranı
      // görünmesin diye bayrak burada kaldırılır/indirilir.
      setIsPoolLoading(true);
      const deckName = targetLevel.replace(CUSTOM_ID_PREFIX, '');
      const customDecks = await getCustomDecks();
      currentPool = customDecks[deckName] || [];
    } else {
      currentPool = getWordPool(targetLevel);
    }

    // Bu arada daha yeni bir istek yapıldıysa (seviye/mod değişti) sonucu yazma.
    if (poolRequestRef.current !== requestId) return;

    if (!currentPool || currentPool.length === 0) {
      setCurrentWord(null);
      setOptions([]);
      setAnswered(false);
      setSelectedOption(null);
      setIsPoolLoading(false);
      return;
    }

    // Ardışık iki soruda aynı kelime gösterilmez (havuzda alternatif varsa).
    const correctWord = pickWord(currentPool, lastWordIdRef.current);
    lastWordIdRef.current = correctWord.id;

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
    setIsPoolLoading(false);
    // Yeni soru: kartın `key`i değişir ve kart temiz animasyon değerleriyle kurulur.
    setQuestionSeq((prev) => prev + 1);
  }, [level, mode, setAnswered]);

  // Ses motorunu arka planda önceden ısıtma (Warm-up) — tek servis üzerinden.
  useEffect(() => {
    warmUpSpeech();
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

    const hasItemsInMode = countForMode(reviewPool, mode) > 0;
    if (!hasItemsInMode) {
      setMode(getWrongMode(reviewPool[0]));
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

        setReviewPool((prev) => removeEntry(prev, currentWord.id, mode));
      } else {
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
      }
    } else {
      if (isCorrect) {
        setScore((prev) => ({ ...prev, correct: prev.correct + 1 }));
      } else {
        setScore((prev) => ({ ...prev, wrong: prev.wrong + 1 }));
        setReviewPool((prev) => addEntry(prev, makeReviewEntry(currentWord, mode)));
      }
    }
  };

  const handleNextQuestion = () => {
    if (level === 'review') {
      const remaining = filterByMode(reviewPoolRef.current, mode);
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
    // Mod adı ayrıştırılmaz; cevap tipi modes.js'ten gelir (Faz 3.3).
    const answerType = getAnswerType(mode);
    if (answerType === 'pinyin') return 'Choose the correct pinyin';
    if (answerType === 'hanzi') return 'Choose the correct character';
    return 'Choose the correct English meaning';
  };

  // Review modunda, içinde bulunulan moda ait kalan yanlış sayısı
  const reviewCountForMode = countForMode(reviewPool, mode);

  // Havuz boşsa gösterilecek metin (seviye 'review' DEĞİLKEN). Özel deste silinmiş ya
  // da boş olabilir: deste adı seviye listesinden kalkar ama quiz o seviyede kalırsa
  // havuz boş çözülür. Eskiden bu durumda ekran TAMAMEN BOŞ kalıyordu (boş-durum
  // ekranı yalnızca review için vardı).
  const isCustomLevel = isCustomDeckLevel(level);
  const emptyPoolTitle = isCustomLevel ? 'This deck has no words' : 'No words in this level';
  const emptyPoolSubtitle = isCustomLevel
    ? 'It may have been emptied or deleted. Import it again from Home, or pick another level above.'
    : 'Pick another level from the level menu above.';

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
          />

          <ScoreBoard correct={score.correct} wrong={score.wrong} />

          <ScrollView
            style={styles.scrollStyle}
            contentContainerStyle={styles.scrollContentContainer}
            showsVerticalScrollIndicator={false}
            bounces={true}
          >
            {currentWord && !isAnswered && (
              <Text style={styles.subText} accessible={true}>{getSubText()}</Text>
            )}

            {!isPoolLoading && !currentWord && (
              <View style={styles.emptyContainer}>
                {level === 'review' ? (
                  <>
                    <Text style={styles.emptyTitle} accessible={true}>
                      {reviewPool.length === 0 ? 'All Clear! 🎉' : 'No Mistakes in this Mode! ✨'}
                    </Text>
                    <Text style={styles.emptySubtitle} accessible={true}>
                      {reviewPool.length === 0
                        ? "You've cleared all incorrect answers!"
                        : 'Switch to other tabs above to practice mistakes in other question modes.'}
                    </Text>
                  </>
                ) : (
                  <>
                    <Text style={styles.emptyTitle} accessible={true}>
                      {emptyPoolTitle}
                    </Text>
                    <Text style={styles.emptySubtitle} accessible={true}>
                      {emptyPoolSubtitle}
                    </Text>
                  </>
                )}
              </View>
            )}

            {currentWord && (
              <QuestionCard
                key={questionSeq}
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