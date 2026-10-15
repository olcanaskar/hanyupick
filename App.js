import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createStackNavigator, CardStyleInterpolators } from '@react-navigation/stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  const [isLoaded, setIsLoaded] = useState(false);

  // 1. Uygulama açılışında kayıtlı veriyi yükle
  useEffect(() => {
    const loadReviewPool = async () => {
      try {
        const savedData = await AsyncStorage.getItem(STORAGE_KEY);
        if (savedData !== null) {
          setReviewPool(JSON.parse(savedData));
        }
      } catch (error) {
        console.error('Kayıtlı veriler yüklenemedi:', error);
      } finally {
        setIsLoaded(true);
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

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={AppTheme}>
        <Stack.Navigator
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