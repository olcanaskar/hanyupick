import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { normalizeReviewPool } from './services/reviewPool';
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
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          const parsed = JSON.parse(savedData);

          // Faz 3.2 göçü: eski kayıtlar (kelime kopyası taşıyan şekiller) kanonik
          // şekle çevrilir. Veri değişmediği sürece görünür içerik aynı kalır.
          const migrated = normalizeReviewPool(parsed);
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
      } catch (error) {
        console.error('Kayıtlı veriler yüklenemedi:', error);
      }
    };

    loadReviewPool();
  }, []);

  // 2. reviewPool değiştikçe diske kaydet
  const updateReviewPool = (updater) => {
    setReviewPool((prev) => {
      const nextState = typeof updater === 'function' ? updater(prev) : updater;
      AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(nextState)).catch((err) =>
        console.error('Kayıt başarısız:', err)
      );
      return nextState;
    });
  };

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