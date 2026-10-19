import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Haptics from 'expo-haptics';

import { failureFeedback, selectionFeedback } from '../services/hapticsService';
import { getSettings, updateSettings } from '../services/settingsService';

// expo-haptics bir yerel modüldür; jest ortamında çağrıları sayabilmek için taklit edilir.
jest.mock('expo-haptics', () => ({
  selectionAsync: jest.fn(),
  impactAsync: jest.fn(),
  ImpactFeedbackStyle: { Heavy: 'heavy' },
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  await getSettings(); // ayar önbelleğini varsayılana döndür
  jest.clearAllMocks();
});

describe('hapticsService — titreşim ayarı açıkken', () => {
  test('doğru cevap hafif "seçim" geri bildirimi verir', async () => {
    await updateSettings({ haptics: true });

    selectionFeedback();

    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
    expect(Haptics.impactAsync).not.toHaveBeenCalled();
  });

  test('yanlış cevap iki darbe verir (ikincisi 140 ms sonra)', async () => {
    jest.useFakeTimers();
    await updateSettings({ haptics: true });

    failureFeedback();
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(1);

    jest.advanceTimersByTime(140);
    expect(Haptics.impactAsync).toHaveBeenCalledTimes(2);
    expect(Haptics.impactAsync).toHaveBeenCalledWith('heavy');
    jest.useRealTimers();
  });
});

describe('hapticsService — titreşim ayarı kapalıyken', () => {
  test('doğru cevap sessiz kalır', async () => {
    await updateSettings({ haptics: false });

    selectionFeedback();

    expect(Haptics.selectionAsync).not.toHaveBeenCalled();
  });

  test('yanlış cevap hiç darbe vermez (gecikmeli olan dahil)', async () => {
    jest.useFakeTimers();
    await updateSettings({ haptics: false });

    failureFeedback();
    jest.advanceTimersByTime(500);

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    jest.useRealTimers();
  });
});
