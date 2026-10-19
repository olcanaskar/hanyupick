import React, { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter, Platform, StyleSheet, View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { WEB_FRAME_WIDTH } from './components/layout';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeReviewPool, removeWordIds } from './services/reviewPool';
import {
  getPendingWordIdMigrations,
  markWordIdMigrationsApplied,
} from './services/wordIdMigrations';
import { mergeWordStatsIds, removeWordStatsByIds } from './services/statsManager';
import { getSettings } from './services/settingsService';
import HomeScreen from './screens/HomeScreen';
import QuizScreen from './screens/QuizScreen';
import VocabularyScreen from './screens/VocabularyScreen';

const STORAGE_KEY = '@hsk_review_pool';

// Faz 18: splash ekranı (app.json'daki `expo-splash-screen` plugin'i ile yapılandırılır)
// uygulama hazır olana kadar görünür kalır ve en az SPLASH_MIN_MS boyunca sabit durur.
// `preventAutoHideAsync` MODÜL kapsamında çağrılır — bileşen içinde çağrılırsa splash
// çoktan gizlenmiş olabilir (Expo belgeleri). Hata olursa sessizce devam edilir:
// splash davranışı bozulsa bile uygulama açılmalı.
SplashScreen.preventAutoHideAsync().catch(() => {});
SplashScreen.setOptions({ duration: 300, fade: true });

const SPLASH_MIN_MS = 1000;

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
        // Faz 4 + Faz 6 + Faz 7 id göçleri (bkz. services/wordIdMigrations.js). Her faz
        // TEK SEFER ve SIRAYLA uygulanır: kaynak id'ler sonraki fazda BAŞKA kelimeleri
        // gösterdiği için tablo ikinci kez uygulanırsa yeni ilerleme yanlış kelimeye
        // taşınırdı. Bu yüzden yalnızca sürümü geride olan fazlar uygulanır ve en son
        // sürüm işareti yazılır.
        const pendingMigrations = await getPendingWordIdMigrations();
        const migrationPending = pendingMigrations.length > 0;
        for (const migration of pendingMigrations) {
          // İstatistikler: taşınacak kayıt yoksa diske hiç yazılmaz (idempotent).
          await mergeWordStatsIds(migration.map);
          // Hedefi olmayan (artık hiçbir listede bulunmayan) kelimelerin izleri silinir.
          await removeWordStatsByIds(migration.dropped);
        }
        // Bu açılışta hedefi olmayan kelimeler (tüm bekleyen fazların toplamı).
        const droppedIds = pendingMigrations.flatMap((migration) => migration.dropped);

        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          const parsed = JSON.parse(savedData);

          // Faz 3.2 göçü: eski kayıtlar (kelime kopyası taşıyan şekiller) kanonik
          // şekle çevrilir. Veri değişmediği sürece görünür içerik aynı kalır.
          // Faz 4/6/7 id göçleri yalnızca uygulanmamış fazlar için uygulanır.
          let migratedEntries = parsed;
          const migrationMaps = migrationPending ? pendingMigrations.map((m) => m.map) : [null];
          for (const map of migrationMaps) {
            migratedEntries = normalizeReviewPool(migratedEntries, map);
          }
          // Hedefi olmayan (artık hiçbir listede bulunmayan) kelimelerin kayıtları
          // düşer: id'leri sonraki fazda BAŞKA kelimelere verildiği için haritayla
          // ayırt edilemezler, bu yüzden tam id listesiyle silinirler.
          const migrated = removeWordIds(migratedEntries, droppedIds);
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

  // Ayarları açılışta bir kez oku: ses seviyesi ve titreşim `getCachedSettings()`
  // ile SENKRON okunduğu için önbellek ilk sorudan önce dolu olmalı
  // (bkz. services/settingsService.js).
  useEffect(() => {
    getSettings();
  }, []);

  // Faz 18: splash ekranı sabit ~1 sn görünür kalır, sonra gizlenir. Ana ekran bu
  // sürede çizilmiş olur; splash zemini (#FBF5EB) Home'un zeminiyle aynı olduğu
  // için geçiş fark edilmez.
  useEffect(() => {
    const timer = setTimeout(() => {
      SplashScreen.hideAsync().catch((error) => {
        console.warn('Splash ekranı gizlenemedi:', error);
      });
    }, SPLASH_MIN_MS);

    return () => clearTimeout(timer);
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
  const navigationTree = (
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
  );

  // Faz 24 (web istemcisi): uygulama telefon için tasarlandı (Home kaydırmasız,
  // sabit yükseklikler). Masaüstü tarayıcıda tüm pencereye yayılırsa düzen
  // bozulur; bu yüzden web'de içerik ortalanmış, telefon genişliğinde
  // (maxWidth 430) bir "çerçeve" içinde gösterilir. Yerelde ağaç aynen döner —
  // ek bir View yok, dolayısıyla native düzen değişmez.
  return (
    <SafeAreaProvider>
      {Platform.OS === 'web' ? (
        <View style={styles.webStage}>
          <View style={styles.webFrame}>{navigationTree}</View>
        </View>
      ) : (
        navigationTree
      )}
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  // Krem tonun bir kademe koyusu: krem çerçeve zeminden ayrışsın.
  webStage: {
    flex: 1,
    alignItems: 'center',
    backgroundColor: '#EFE7DA',
  },
  webFrame: {
    flex: 1,
    width: '100%',
    maxWidth: WEB_FRAME_WIDTH,
    backgroundColor: '#FBF5EB',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#E2E8F0',
    // react-native-web `boxShadow`'ı CSS olarak yazar; yerelde yok sayılır
    // (bu stil yalnızca web'de kullanılıyor).
    boxShadow: '0 0 32px rgba(44, 62, 80, 0.18)',
  },
});