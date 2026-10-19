import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';

import { speakHanzi, stopSpeaking, warmUpSpeech } from '../services/speechService';
import { getSettings, updateSettings } from '../services/settingsService';

// expo-speech bir yerel modüldür; jest ortamında argümanları inceleyebilmek için taklit edilir.
jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

beforeEach(async () => {
  await AsyncStorage.clear();
  await getSettings(); // ayar önbelleğini varsayılana döndür
  jest.clearAllMocks();
});

describe('speakHanzi', () => {
  test('hanzi metnini Çince sesle, ayarlanmış seviyede okur', async () => {
    await updateSettings({ speechVolume: 0.4 });

    speakHanzi('你好');

    expect(Speech.speak).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith('你好', {
      language: 'zh-CN',
      pitch: 1.0,
      rate: 0.85,
      volume: 0.4,
    });
  });

  test('üst üste okumada önce kuyruğu durdurur', async () => {
    speakHanzi('谢谢');

    expect(Speech.stop).toHaveBeenCalledTimes(1);
  });

  test('boş metin için hiçbir şey yapmaz', () => {
    speakHanzi('');
    speakHanzi(null);
    speakHanzi(undefined);

    expect(Speech.stop).not.toHaveBeenCalled();
    expect(Speech.speak).not.toHaveBeenCalled();
  });

  test('ses seviyesi değişince sonraki okuma yeni seviyeyi kullanır', async () => {
    speakHanzi('你好');
    expect(Speech.speak).toHaveBeenLastCalledWith('你好', expect.objectContaining({ volume: 1 }));

    await updateSettings({ speechVolume: 0.1 });
    speakHanzi('你好');

    expect(Speech.speak).toHaveBeenLastCalledWith('你好', expect.objectContaining({ volume: 0.1 }));
  });
});

describe('stopSpeaking', () => {
  test('motoru durdurur', () => {
    stopSpeaking();

    expect(Speech.stop).toHaveBeenCalledTimes(1);
  });
});

describe('warmUpSpeech', () => {
  test('sesi duyulmadan motoru ısıtır (kullanıcı seviyesinden bağımsız)', async () => {
    await updateSettings({ speechVolume: 0.3 });

    warmUpSpeech();

    expect(Speech.getAvailableVoicesAsync).toHaveBeenCalledTimes(1);
    expect(Speech.speak).toHaveBeenCalledWith(' ', { language: 'zh-CN', volume: 0 });
  });
});
