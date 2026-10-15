import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated, Dimensions } from 'react-native';
import * as Speech from 'expo-speech';
import ExampleBox from './ExampleBox';
import { getExampleByWordId } from '../services/exampleService';
import { FIELD_LABELS, getAnswerType, getHintField, getPromptType } from '../services/modes';

const { width } = Dimensions.get('window');

export default function QuestionCard({
  currentWord,
  level, // ---> Seviye parametresi eklendi
  mode,
  options = [],
  isAnswered,
  selectedOption,
  onSelectOption,
  onNextQuestion,
}) {
  const word = currentWord;

  // O anki kelimenin ve seviyenin örnek cümlesini çekiyoruz
  const example = getExampleByWordId(level, word?.id);

  // Animasyon Değerleri
  const translateX = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(1)).current;
  const buttonScale = useRef(new Animated.Value(1)).current;
  const buttonShakeX = useRef(new Animated.Value(0)).current;

  // Seçim yapıldığında doğru/yanlış animasyonu
  useEffect(() => {
    if (!isAnswered || !selectedOption) return;

    const isCorrect = selectedOption.id === word?.id;

    if (isCorrect) {
      Animated.sequence([
        Animated.timing(buttonScale, {
          toValue: 1.06,
          duration: 120,
          useNativeDriver: true,
        }),
        Animated.timing(buttonScale, {
          toValue: 1,
          duration: 120,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.sequence([
        Animated.timing(buttonShakeX, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeX, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeX, { toValue: -8, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeX, { toValue: 8, duration: 50, useNativeDriver: true }),
        Animated.timing(buttonShakeX, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    }
  }, [isAnswered, selectedOption]);

  // Not: burada animasyon değerlerini yeni soru için sıfırlayan bir effect YOKTUR ve
  // olmamalı. QuizScreen bu bileşene her soru için artan bir `key` verir (`questionSeq`),
  // yani kart her soruda sıfırdan kurulur ve `Animated.Value`'ler başlangıç
  // değerleriyle (0 / 1) doğar. Eskiden `[word?.id]`e bağlı bir sıfırlama vardı: aynı
  // kelime arka arkaya gelince hiç çalışmıyor, kart ekranın dışında (translateX
  // ±width*1.25) ve görünmez (opacity 0) kalıyordu — komut satırı görünüyor ama kart
  // gelmiyordu.

  if (!word) return null;

  const playAudio = () => {
    Speech.stop();
    Speech.speak(word.hanzi, {
      language: 'zh-CN',
      rate: 0.85,
    });
  };

  // Karta tıklandığında: Doğruysa sağa, yanlışsa sola kay
  const handleCardPress = () => {
    if (!isAnswered) return;

    const isCorrect = selectedOption?.id === word.id;
    const targetX = isCorrect ? width * 1.25 : -width * 1.25;

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: targetX,
        duration: 220,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onNextQuestion();
    });
  };

  // Modun soru/cevap alanları artık services/modes.js'ten gelir (Faz 3.3);
  // eskiden mod adı `startsWith`/`endsWith` ile ayrıştırılıyordu.
  const promptType = getPromptType(mode);
  const answerType = getAnswerType(mode);

  // Hoparlör hile koruması: sesli okuma cevabı ele verecek modlarda,
  // cevap verilene kadar hoparlörü gizle.
  const isAudioCheat = answerType === 'pinyin' || answerType === 'hanzi';
  const showSpeaker = isAudioCheat ? isAnswered : true;

  // 1. Soru Alanı Metni (Prompt)
  const renderPrompt = () => {
    if (promptType === 'meaning') {
      return (
        <Text style={styles.promptMeaning}>
          {word.meaning || word.en || word.english}
        </Text>
      );
    }

    if (promptType === 'pinyin') {
      return <Text style={styles.promptPinyin}>{word.pinyin}</Text>;
    }

    return <Text style={styles.promptHanzi}>{word.hanzi}</Text>;
  };

  // 2. Seçenek Buton Metni (Options)
  const renderOptionContent = (option) => {
    if (answerType === 'pinyin') {
      return option.pinyin;
    }

    if (answerType === 'hanzi') {
      return option.hanzi;
    }

    return option.meaning || option.en || option.english || option.pinyin;
  };

  // 3. Eksik Parça Dinamik İpucu
  const renderMissingInfo = () => {
    if (!isAnswered) return <View style={styles.hintPlaceholder} />;

    // Kategori, soruda/şıklarda gösterilmeyen üçüncü alanı belirler:
    // hanzi_pinyin → anlam, hanzi_meaning → pinyin, pinyin_meaning → hanzi.
    const hintField = getHintField(mode);
    const missingText = hintField ? `${FIELD_LABELS[hintField]}: ${word[hintField]}` : '';

    if (!missingText) return <View style={styles.hintPlaceholder} />;

    return (
      <View style={styles.hintContainer}>
        <Text style={styles.hintText}>{missingText}</Text>
      </View>
    );
  };

  return (
    <Animated.View
      style={[
        styles.animatedWrapper,
        {
          transform: [{ translateX }],
          opacity,
        },
      ]}
    >
      <TouchableOpacity
        activeOpacity={isAnswered ? 0.9 : 1}
        onPress={handleCardPress}
        disabled={!isAnswered}
        style={styles.card}
      >
        {/* Hoparlör Butonu */}
        {showSpeaker && (
          <TouchableOpacity 
            onPress={playAudio} 
            style={styles.speakerButton}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Text style={styles.speakerIcon}>🔊</Text>
          </TouchableOpacity>
        )}

        {/* Soru ve Altındaki Eksik Bilgi İpucu */}
        <View style={styles.questionSection}>
          {renderPrompt()}
          {renderMissingInfo()}
        </View>

        {/* ÖRNEK CÜMLE KUTUSU: Soru/İpucu alanının altında, seçeneklerin tam üzerinde belirir */}
        {isAnswered && <ExampleBox example={example} />}

        {/* Seçenekler */}
        <View style={styles.optionsGrid}>
          {options.map((option) => {
            const isSelected = selectedOption?.id === option.id;
            const isCorrect = option.id === word.id;

            let buttonDynamicStyle = null;
            let textDynamicStyle = null;

            if (isAnswered) {
              if (isCorrect) {
                buttonDynamicStyle = styles.correctButton;
                textDynamicStyle = styles.correctText;
              } else if (isSelected) {
                buttonDynamicStyle = styles.wrongButton;
                textDynamicStyle = styles.wrongText;
              } else {
                buttonDynamicStyle = styles.dimmedButton;
                textDynamicStyle = styles.dimmedText;
              }
            }

            // Not: `isSelected ? [...] : []` yazıldığında TypeScript iki ayrı nesne
            // şeklinin birleşimini çıkarıp Animated'ın `transform` tipine atanamaz
            // diyordu; diziyi koşullu olarak doldurmak hem tipi hem davranışı net.
            const animatedTransform = [];
            if (isSelected) {
              animatedTransform.push({ scale: buttonScale }, { translateX: buttonShakeX });
            }

            return (
              <Animated.View
                key={option.id}
                style={[{ width: '100%' }, { transform: animatedTransform }]}
              >
                <TouchableOpacity
                  style={[styles.optionButton, buttonDynamicStyle]}
                  disabled={isAnswered}
                  onPress={() => onSelectOption(option)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.optionText, textDynamicStyle]}>
                    {renderOptionContent(option)}
                  </Text>
                </TouchableOpacity>
              </Animated.View>
            );
          })}
        </View>

        {/* Devam Uyarısı */}
        <View style={styles.footerArea}>
          {isAnswered && (
            <Text style={styles.continueText}>Tap card to continue →</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedWrapper: {
    width: '100%',
    alignItems: 'center',
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 36,
    paddingBottom: 16,
    position: 'relative',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
  },
  speakerButton: {
    position: 'absolute',
    top: 18,
    right: 20,
    zIndex: 10,
    padding: 4,
  },
  speakerIcon: {
    fontSize: 22,
  },
  questionSection: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  promptHanzi: {
    fontSize: 54,
    fontWeight: 'bold',
    color: '#2C3E50',
    textAlign: 'center',
  },
  promptPinyin: {
    fontSize: 32,
    fontWeight: '600',
    color: '#34495E',
    textAlign: 'center',
  },
  promptMeaning: {
    fontSize: 28,
    fontWeight: '700',
    color: '#2C3E50',
    textAlign: 'center',
    paddingHorizontal: 12,
  },
  hintContainer: {
    marginTop: 8,
    minHeight: 22,
    justifyContent: 'center',
  },
  hintPlaceholder: {
    height: 10,
  },
  hintText: {
    fontSize: 15,
    fontStyle: 'italic',
    color: '#7F8C8D',
    textAlign: 'center',
  },
  optionsGrid: {
    width: '100%',
    gap: 10,
    marginTop: 12,
  },
  optionButton: {
    width: '100%',
    backgroundColor: '#F8F9FA',
    borderWidth: 2,
    borderColor: '#E9ECEF',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionText: {
    fontSize: 18,
    color: '#2C3E50',
    fontWeight: '500',
    textAlign: 'center',
  },
  correctButton: {
    backgroundColor: '#E8F5E9',
    borderColor: '#2E7D32',
  },
  correctText: {
    color: '#1B5E20',
    fontWeight: '700',
  },
  wrongButton: {
    backgroundColor: '#FFEBEE',
    borderColor: '#D32F2F',
  },
  wrongText: {
    color: '#C62828',
    fontWeight: '700',
  },
  dimmedButton: {
    backgroundColor: '#FAFAFA',
    borderColor: '#E9ECEF',
    opacity: 0.4,
  },
  dimmedText: {
    color: '#9E9E9E',
  },
  footerArea: {
    minHeight: 28,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  continueText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#888',
  },
});