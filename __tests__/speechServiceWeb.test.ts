// Web yolunu sınar: `Platform.OS === 'web'` iken kütüphane kelimesi için
// `Speech.speak` (tarayıcının speechSynthesis'i) HİÇ çağrılmaz, önceden
// üretilmiş ses dosyası çalınır. Native yol ayrı dosyada
// (__tests__/speechService.test.ts) sınanır; Platform mock'u oraya sızmasın.

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Speech from 'expo-speech';
import { Platform } from 'react-native';

import { getSettings, updateSettings } from '../services/settingsService';
import { speakHanzi, stopSpeaking, warmUpSpeech } from '../services/speechService';

// Jest ortamı native kabul edilir (Platform.OS = 'ios'). Web davranışını
// sınamak için GERÇEK Platform nesnesinin OS'i değiştirilir; modül mock'u
// kullanılmaz çünkü expo-modules-core gibi tüketiciler mock'lanmış Platform'da
// patlıyor (import sırasında `Platform.select` çağırıyorlar).
Object.defineProperty(Platform, 'OS', { value: 'web', configurable: true });

jest.mock('expo-speech', () => ({
  speak: jest.fn(),
  stop: jest.fn(),
  getAvailableVoicesAsync: jest.fn(() => Promise.resolve([])),
}));

const mockPlay = jest.fn<Promise<void>, []>(() => Promise.resolve());
const mockPause = jest.fn();

// `new Audio(url)` tarayıcıda vardır, jest ortamında yoktur: taklit edilir.
const played: MockAudio[] = [];

class MockAudio {
  src: string;
  volume = 1;
  currentTime = 0;

  constructor(src: string) {
    this.src = src;
    played.push(this);
  }

  play = mockPlay;
  pause = mockPause;
}

Object.defineProperty(globalThis, 'Audio', { value: MockAudio, writable: true, configurable: true });

beforeEach(async () => {
  await AsyncStorage.clear();
  await getSettings(); // ayar önbelleğini varsayılana döndür
  stopSpeaking(); // önceki testten kalan ses öğesini bırakma (sayaçlar sonra sıfırlanır)
  jest.clearAllMocks();
  played.length = 0;
});

describe('speakHanzi (web)', () => {
  test('kütüphane kelimesinde ses dosyasını çalar, tarayıcı motorunu kullanmaz', () => {
    speakHanzi('谢谢', 125);

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(played).toHaveLength(1);
    expect(played[0].src).toBe('audio/hsk/125.mp3');
    expect(mockPlay).toHaveBeenCalledTimes(1);
  });

  test('ses seviyesi kullanıcı ayarından gelir', async () => {
    await updateSettings({ speechVolume: 0.35 });

    speakHanzi('谢谢', 125);

    expect(played[0].volume).toBe(0.35);
  });

  test('özel deste kelimesinde (metin id) tarayıcı motoruna düşer', () => {
    speakHanzi('测试', 'custom_Ders_1');

    expect(played).toHaveLength(0);
    expect(Speech.speak).toHaveBeenCalledWith(
      '测试',
      expect.objectContaining({ language: 'zh-CN', volume: 1 })
    );
  });

  test('id verilmezse tarayıcı motoruna düşer', () => {
    speakHanzi('你好');

    expect(played).toHaveLength(0);
    expect(Speech.speak).toHaveBeenCalledTimes(1);
  });

  test('dosya çalınamazsa (ses üretilmemiş export) motor yoluna düşer', async () => {
    mockPlay.mockRejectedValueOnce(new Error('404'));

    speakHanzi('谢谢', 125);
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(Speech.speak).toHaveBeenCalledWith('谢谢', expect.objectContaining({ language: 'zh-CN' }));
  });

  test('üst üste dokunuşta önceki ses durdurulur', () => {
    speakHanzi('谢谢', 125);
    speakHanzi('再见', 139);

    expect(mockPause).toHaveBeenCalledTimes(1);
    expect(played[1].src).toBe('audio/hsk/139.mp3');
  });

  test('boş metin için hiçbir şey yapmaz', () => {
    speakHanzi('', 125);
    speakHanzi(null, 125);

    expect(played).toHaveLength(0);
    expect(Speech.speak).not.toHaveBeenCalled();
    expect(Speech.stop).not.toHaveBeenCalled();
  });
});

describe('stopSpeaking (web)', () => {
  test('çalan dosyayı da durdurur', () => {
    speakHanzi('谢谢', 125);

    stopSpeaking();

    expect(mockPause).toHaveBeenCalledTimes(1);
    // speakHanzi de önce durdurur; asıl ölçtüğümüz şey motorun da durdurulması.
    expect(Speech.stop).toHaveBeenCalled();
  });
});

describe('warmUpSpeech (web)', () => {
  test('tarayıcı motorunu ısıtmaz (ses dosyası doğrudan çalınır)', () => {
    warmUpSpeech();

    expect(Speech.speak).not.toHaveBeenCalled();
    expect(Speech.getAvailableVoicesAsync).not.toHaveBeenCalled();
  });
});
