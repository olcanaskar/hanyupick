import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_WORDS, LEVEL_POOLS, getWordById, getLevelFromWordId } from '../services/wordRepository';
import {
  HSK5_REBALANCE_DROPPED_IDS,
  HSK5_REBALANCE_ID_MAP,
  MERGED_WORD_ID_MAP,
  WORD_ID_MIGRATIONS,
  WORD_ID_MIGRATION_VERSION,
  WORD_ID_MIGRATION_VERSION_KEY,
  getAppliedWordIdMigrationVersion,
  markWordIdMigrationsApplied,
  needsWordIdMigrations,
} from '../services/wordIdMigrations';

const ALL_IDS = new Set(ALL_WORDS.map((w) => w.id));

// Faz 6: hsk5 kuyruğu (id 1802-2500) resmi listeyle değişti. Bu tablolar diskteki
// ilerlemeyi doğru kelimeye taşır; hedef id'ler veride gerçekten var olmalıdır.
describe('wordIdMigrations - tablo bütünlüğü', () => {
  test('her göç hedefi veride gerçekten var', () => {
    const brokenTargets = Object.entries(WORD_ID_MIGRATIONS).filter(([, to]) => !ALL_IDS.has(to));
    expect(brokenTargets).toEqual([]);
  });

  test('Faz 6 göçü yalnızca hsk5/hsk6 aralığına taşır (hsk1-4 dokunulmaz)', () => {
    const levels = new Set(Object.values(HSK5_REBALANCE_ID_MAP).map(getLevelFromWordId));
    expect([...levels].sort()).toEqual(['hsk5', 'hsk6']);
  });

  test('Faz 6 kaynakları eski kuyruk aralığıdır (1802-2500)', () => {
    const keys = Object.keys(HSK5_REBALANCE_ID_MAP).map(Number);
    expect(Math.min(...keys)).toBeGreaterThanOrEqual(1802);
    expect(Math.max(...keys)).toBeLessThanOrEqual(2500);
  });

  // Anahtarlar ayrık olmalı: Faz 4'ün 17 id'si Faz 6'da BOŞ DEĞİLDİR (yeni kelimeler
  // tutar) ve Faz 6 tablosunda yer almaz; aksi halde bir id iki kez taşınırdı.
  test('Faz 4 ve Faz 6 anahtarları ayrıktır', () => {
    const overlap = Object.keys(MERGED_WORD_ID_MAP).filter(
      (id) => HSK5_REBALANCE_ID_MAP[id] !== undefined
    );
    expect(overlap).toEqual([]);
  });

  test('WORD_ID_MIGRATIONS iki tablonun birleşimidir', () => {
    expect(WORD_ID_MIGRATIONS).toEqual({ ...MERGED_WORD_ID_MAP, ...HSK5_REBALANCE_ID_MAP });
  });

  // Hedefi olmayan kelimeler tam id listesiyle silinir; haritada YER ALMAZLAR.
  test('silinen kelime listesi: göç anahtarı değil, hepsi hsk5 aralığında', () => {
    expect(HSK5_REBALANCE_DROPPED_IDS.length).toBeGreaterThan(0);
    const mappedOrDropped = [
      ...Object.keys(HSK5_REBALANCE_ID_MAP).map(Number),
      ...HSK5_REBALANCE_DROPPED_IDS,
    ];
    // 17 ikiz id dışındaki kuyruk tamamen kapsanır (veri kaybı yok).
    expect(new Set(mappedOrDropped).size).toBe(mappedOrDropped.length);
    expect(HSK5_REBALANCE_DROPPED_IDS.every((id) => getLevelFromWordId(id) === 'hsk5')).toBe(true);
    expect(HSK5_REBALANCE_DROPPED_IDS.every((id) => HSK5_REBALANCE_ID_MAP[id] === undefined)).toBe(true);
  });

  // Tablo elle üretildiği için birkaç örnek pin: hedef id GERÇEKTEN o kelimeyi tutmalı.
  test('örnek pinler: taşınan kelime hedef idde aynı hanzi ile duruyor', () => {
    expect(getWordById(HSK5_REBALANCE_ID_MAP[1802]).hanzi).toBe('执行'); // 执行 -> HSK6 (4855)
    expect(getWordById(HSK5_REBALANCE_ID_MAP[1805]).hanzi).toBe('指导'); // 指导 -> hsk5 içinde (1802)
    expect(getWordById(HSK5_REBALANCE_ID_MAP[1803]).hanzi).toBe('执照'); // 执照 -> hsk5 içinde (2454)
    expect(getWordById(HSK5_REBALANCE_ID_MAP[1842]).hanzi).toBe('挨'); // 挨 -> HSK6 (2501)
    expect(getWordById(2500).hanzi).toBe('作为'); // yeni kuyruk sonu (resmi liste sırası)
  });

  test('göç kaynaklarının hiçbiri hsk1-4 id aralığına düşmez', () => {
    const reserved = Object.keys(WORD_ID_MIGRATIONS).map(Number);
    expect(reserved.every((id) => getLevelFromWordId(id) === 'hsk5')).toBe(true);
  });
});

describe('wordIdMigrations - tek seferlik sürüm işareti', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  test('işaret yoksa göç gereklidir', async () => {
    await expect(getAppliedWordIdMigrationVersion()).resolves.toBe(0);
    await expect(needsWordIdMigrations()).resolves.toBe(true);
  });

  test('göç uygulandıktan sonra işaret yazılır ve bir daha çalışmaz', async () => {
    await markWordIdMigrationsApplied();

    await expect(AsyncStorage.getItem(WORD_ID_MIGRATION_VERSION_KEY)).resolves.toBe(
      String(WORD_ID_MIGRATION_VERSION)
    );
    await expect(needsWordIdMigrations()).resolves.toBe(false);
  });

  test('eski sürüm işareti (Faz 4) göçü yeniden tetikler', async () => {
    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, '1');
    await expect(needsWordIdMigrations()).resolves.toBe(true);
  });

  test('bozuk işaret 0 sayılır (göç çalışır, çökme yok)', async () => {
    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, 'bozuk');
    await expect(getAppliedWordIdMigrationVersion()).resolves.toBe(0);
    await expect(needsWordIdMigrations()).resolves.toBe(true);
  });

  test('daha yeni sürüm işareti göçü tetiklemez', async () => {
    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, String(WORD_ID_MIGRATION_VERSION + 1));
    await expect(needsWordIdMigrations()).resolves.toBe(false);
  });

  test('hsk5 havuzu 1300 kelime ve kuyruk resmi sırada (veri pin)', () => {
    expect(LEVEL_POOLS.hsk5).toHaveLength(1300);
    expect(LEVEL_POOLS.hsk5[601].id).toBe(1802);
    expect(LEVEL_POOLS.hsk5[601].hanzi).toBe('指导');
  });
});
