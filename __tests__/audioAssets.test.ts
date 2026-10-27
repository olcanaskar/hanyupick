import fs from 'fs';
import path from 'path';

import { ALL_WORDS } from '../services/wordRepository';

// Web ses dosyaları `tools/generate-audio.py` ile üretilir ve depoya işlenir
// (public/audio/hsk/<id>.mp3). Kelime id'leri kimliktir: veri yeniden
// düzenlendiğinde (services/wordIdMigrations.ts) bu test eksik/fazla dosyayı
// yakalar — yoksa web'de o kelime sessiz kalır.
const AUDIO_DIR = path.join(__dirname, '..', 'public', 'audio', 'hsk');

describe('önceden üretilmiş web ses dosyaları', () => {
  test('her HSK kelimesi için boş olmayan bir ses dosyası var', () => {
    const missing = ALL_WORDS.filter((word) => {
      const file = path.join(AUDIO_DIR, `${word.id}.mp3`);
      return !fs.existsSync(file) || fs.statSync(file).size === 0;
    }).map((word) => word.id);

    expect(missing).toEqual([]);
  });

  test('kütüphanede olmayan ses dosyası yok', () => {
    const known = new Set(ALL_WORDS.map((word) => `${word.id}.mp3`));
    const extra = fs
      .readdirSync(AUDIO_DIR)
      .filter((name) => name.endsWith('.mp3') && !known.has(name));

    expect(extra).toEqual([]);
  });

  test('dosya adları yalnızca kelime kimliğidir', () => {
    const names = fs.readdirSync(AUDIO_DIR).filter((name) => name.endsWith('.mp3'));

    expect(names).toHaveLength(ALL_WORDS.length);
    names.forEach((name) => expect(name).toMatch(/^\d+\.mp3$/));
  });
});
