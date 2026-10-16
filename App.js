import React, { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeReviewPool, removeWordIds } from './services/reviewPool';
import {
  HSK5_REBALANCE_DROPPED_IDS,
  WORD_ID_MIGRATIONS,
  markWordIdMigrationsApplied,
  needsWordIdMigrations,
} from './services/wordIdMigrations';
import { mergeWordStatsIds, removeWordStatsByIds } from './services/statsManager';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import VocabularyScreen from './screens/VocabularyScreen';

const STORAGE_KEY = '@hsk_review_pool';

const Stack = createStackNavigator();

const AppTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#FBF5EB',
  },
};

export default function App() {
  const [reviewPool, setReviewPool] = useState([]);

  // 1. Uygulama açılışında kayıtlı veriyi yükle
  useEffect(() => {
    const loadReviewPool = async () => {
      try {
        // Faz 4 + Faz 6 id göçleri (bkz. services/wordIdMigrations.js). İkisi de TEK
        // SEFER çalışır: kaynak id'ler artık BAŞKA kelimeleri gösterdiği için tablo
        // ikinci kez uygulanırsa yeni ilerleme yanlış kelimeye taşınırdı. Bu yüzden
        // sürüm işareti okunur, göçler uygulanır ve en son işaret yazılır.
        const migrationPending = await needsWordIdMigrations();
        if (migrationPending) {
          // İstatistikler: taşınacak kayıt yoksa diske hiç yazılmaz (idempotent).
          await mergeWordStatsIds(WORD_ID_MIGRATIONS);
          // Hedefi olmayan (artık hiçbir listede bulunmayan) kelimelerin izleri silinir.
          await removeWordStatsByIds(HSK5_REBALANCE_DROPPED_IDS);
        }

        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          const parsed = JSON.parse(savedData);

          // Faz 3.2 göçü: eski kayıtlar (kelime kopyası taşıyan şekiller) kanonik
          // şekle çevrilir. Veri değişmediği sürece görünür içerik aynı kalır.
          // Faz 4/6 id göçü yalnızca uygulanmamışsa uygulanır (yukarıya bakın).
          const migratedEntries = normalizeReviewPool(
            parsed,
            migrationPending ? WORD_ID_MIGRATIONS : null
          );
          // Hedefi olmayan (artık hiçbir listede bulunmayan) kelimelerin kayıtları
          // düşer: id'leri Faz 6'da BAŞKA kelimelere verildiği için haritayla
          // ayırt edilemezler, bu yüzden tam id listesiyle silinirler.
          const migrated = migrationPending
            ? removeWordIds(migratedEntries, HSK5_REBALANCE_DROPPED_IDS)
            : migratedEntries;
          setReviewPool(migrated);

          // Göç gerçekten bir şey değiştirdiyse diski de güncelle (tek seferlik).
          const migratedRaw = JSON.stringify(migrated);
          if (migratedRaw !== savedData) {
            if (Array.isArray(parsed) && migrated.length !== parsed.length) {
              console.warn(
                `[reviewPool] göç: ${parsed.length - migrated.length} kayıt atlandı (çözülemez/geçersiz).`
              );
            }
            await AsyncStorage.setItem(STORAGE_KEY, migratedRaw);
          }
        }

        // Göç uygulandı olarak işaretlenir (uygulanacak kayıt bulunmasa da).
        if (migrationPending) await markWordIdMigrationsApplied();
      } catch (error) {
        console.error('Kayıtlı veriler yüklenemedi:', error);
      }
    };

    loadReviewPool();
  }, []);

  // 2. reviewPool değiştikçe diske kaydet
  const updateReviewPool = useCallback((updater) => {
    setReviewPool((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)).catch((err) =>
        console.error('Kayıt başarısız:', err)
      );
      return nextState;
    });
  }, []);

  // 3. Bir özel deste silinince o desteye ait yanlışlar da havuzdan düşsün.
  //    Havuzun sahibi burasıdır (kalıcılığı da yukarıdaki update ile olur); istatistik
  //    tarafındaki temizlik `deleteCustomDeck` içinde yapılır.
  // 4. "İlerlemeyi sıfırla" da yanlış havuzunu boşaltır (istatistikler StatsModal'da
  //    silinir, havuz buradadır).
  useEffect(() => {
    const deckDeletedSub = DeviceEventEmitter.addListener('onCustomDeckDeleted', (removedIds) => {
      updateReviewPool((prev) => removeWordIds(prev, removedIds));
    });

    const progressResetSub = DeviceEventEmitter.addListener('onProgressReset', () => {
      updateReviewPool(() => []);
    });

    return () => {
      deckDeletedSub.remove();
      progressResetSub.remove();
    };
  }, [updateReviewPool]);

  // Not: @react-navigation v7 tip tanımları Stack.Navigator'da `id` alanını zorunlu
  // tutuyor (çalışma zamanında opsiyoneldir). Değer yalnızca `navigation.getParent(id)`
  // için anlam taşır; uygulamada kullanılmıyor.
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator
          id="root"
          initialRouteName="Home"
          screenOptions={{
            headerShown: false,
            cardStyleInterpolator: CardStyleInterpolators.forHorizontalIOS,
            cardStyle: { backgroundColor: '#FBF5EB' },
          }}
        >
          <Stack.Screen name="Home">
            {(props) => <HomeScreen {...props} reviewPool={reviewPool || []} />}
          </Stack.Screen>

          <Stack.Screen name="Quiz">
            {(props) => (
              <QuizScreen
                {...props}
                reviewPool={reviewPool || []}
                setReviewPool={updateReviewPool}
              />
            )}
          </Stack.Screen>

          {/* Vocabulary Ekranı eklendi */}
          <Stack.Screen name="Vocabulary" component={VocabularyScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}