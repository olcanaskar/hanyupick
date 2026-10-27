import { HSK_AUDIO_PATH, getBundledAudioUrl, hasBundledAudio } from '../services/audioFiles';

describe('hasBundledAudio', () => {
  test('kütüphanedeki HSK kelimesi için true', () => {
    expect(hasBundledAudio(1)).toBe(true);
    expect(hasBundledAudio(125)).toBe(true);
    expect(hasBundledAudio(5000)).toBe(true);
  });

  test('kütüphanede olmayan ya da sayı olmayan id için false', () => {
    expect(hasBundledAudio(0)).toBe(false);
    expect(hasBundledAudio(5001)).toBe(false);
    expect(hasBundledAudio(-3)).toBe(false);
    expect(hasBundledAudio(1.5)).toBe(false);
    expect(hasBundledAudio('custom_Ders_1')).toBe(false);
    expect(hasBundledAudio(null)).toBe(false);
    expect(hasBundledAudio(undefined)).toBe(false);
  });
});

describe('getBundledAudioUrl', () => {
  test('id ile göreceli yol üretir', () => {
    expect(getBundledAudioUrl(125)).toBe('audio/hsk/125.mp3');
    expect(HSK_AUDIO_PATH).toBe('audio/hsk');
  });

  test('yol görecelidir (alt yol dağıtımında da çalışsın)', () => {
    expect(getBundledAudioUrl(1).startsWith('/')).toBe(false);
  });
});
