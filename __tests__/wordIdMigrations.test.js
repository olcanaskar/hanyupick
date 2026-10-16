import AsyncStorage from '@react-native-async-storage/async-storage';
import { ALL_WORDS, LEVEL_POOLS, getWordById, getLevelFromWordId } from '../services/wordRepository';
import {
  HSK14_REALIGN_DROPPED_IDS,
  HSK14_REALIGN_ID_MAP,
  HSK5_REBALANCE_DROPPED_IDS,
  HSK5_REBALANCE_ID_MAP,
  MERGED_WORD_ID_MAP,
  WORD_ID_MIGRATIONS,
  WORD_ID_MIGRATIONS_BY_VERSION,
  WORD_ID_MIGRATION_VERSION,
  WORD_ID_MIGRATION_VERSION_KEY,
  getAppliedWordIdMigrationVersion,
  getPendingWordIdMigrations,
  markWordIdMigrationsApplied,
  needsWordIdMigrations,
} from '../services/wordIdMigrations';

const ALL_IDS = new Set(ALL_WORDS.map((w) => w.id));

// Faz 4/6/7 tabloları elle üretildi; hedef id'ler veride gerçekten var olmalıdır.
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

  test('WORD_ID_MIGRATIONS üç tablonun birleşimidir', () => {
    expect(WORD_ID_MIGRATIONS).toEqual({
      ...MERGED_WORD_ID_MAP,
      ...HSK5_REBALANCE_ID_MAP,
      ...HSK14_REALIGN_ID_MAP,
    });
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

  test('Faz 4/6 göç kaynaklarının hiçbiri hsk1-4 id aralığına düşmez', () => {
    const reserved = [
      ...Object.keys(MERGED_WORD_ID_MAP).map(Number),
      ...Object.keys(HSK5_REBALANCE_ID_MAP).map(Number),
    ];
    expect(reserved.every((id) => getLevelFromWordId(id) === 'hsk5')).toBe(true);
  });
});

// Faz 7: hsk1-4 resmi HSK 2012 listeleriyle (150/150/300/600) yeniden kuruldu.
describe('wordIdMigrations - Faz 7 (hsk1-4 hizalaması)', () => {
  const keys = Object.keys(HSK14_REALIGN_ID_MAP).map(Number);

  test('kaynak id\'ler hsk1-4 aralığındadır (1-1200)', () => {
    expect(Math.min(...keys)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...keys)).toBeLessThanOrEqual(1200);
    const hsk14 = ['hsk1', 'hsk2', 'hsk3', 'hsk4'];
    expect(keys.every((id) => hsk14.includes(getLevelFromWordId(id)))).toBe(true);
  });

  // from === to çifti mergeWordStatsIds'te kaydı SİLER (bkz. statsManager), bu yüzden
  // tabloda hiç bulunmamalıdır.
  test('from === to çifti yok', () => {
    expect(keys.filter((id) => HSK14_REALIGN_ID_MAP[id] === id)).toEqual([]);
  });

  test('hedef id\'ler veride var ve kaynakla aynı değil', () => {
    const broken = Object.entries(HSK14_REALIGN_ID_MAP).filter(
      ([from, to]) => !ALL_IDS.has(to) || Number(from) === to
    );
    expect(broken).toEqual([]);
  });

  // Resmi listede olup HSK5/HSK6'ya ait 55 kelime hsk1-4'ten çıkarıldı; ilerleme
  // üst seviyedeki kayda taşınır (ör. 暗 -> hsk5#1843, 访问 -> hsk6#3031).
  test('üst seviyeye taşınanlar: 55 kelime hsk5/hsk6 hedefine gider', () => {
    const up = Object.entries(HSK14_REALIGN_ID_MAP).filter(
      ([, to]) => getLevelFromWordId(to) === 'hsk5' || getLevelFromWordId(to) === 'hsk6'
    );
    expect(up).toHaveLength(55);
    expect(getWordById(HSK14_REALIGN_ID_MAP[604]).hanzi).toBe('暗');
    expect(getWordById(HSK14_REALIGN_ID_MAP[604]).id).toBe(1843);
    expect(getWordById(HSK14_REALIGN_ID_MAP[621]).hanzi).toBe('表达');
    expect(getLevelFromWordId(HSK14_REALIGN_ID_MAP[712])).toBe('hsk6'); // 访问 -> HSK6
    expect(getWordById(HSK14_REALIGN_ID_MAP[712]).hanzi).toBe('访问');
  });

  // Resmi listede kalıp olarak bulunan tek kelimeler kalıp kaydına emilir (因为 ->
  // 因为……所以……); ilerleme kalıba taşınır, kelime ayrı kayıt olarak kalmaz.
  test('kalıba emilenler doğru kalıp kaydına gider', () => {
    expect(getWordById(HSK14_REALIGN_ID_MAP[278]).hanzi).toBe('因为……所以……'); // 因为
    expect(getWordById(HSK14_REALIGN_ID_MAP[279]).hanzi).toBe('因为……所以……'); // 所以
    expect(getWordById(HSK14_REALIGN_ID_MAP[245]).hanzi).toBe('虽然……但是……'); // 虽然
    expect(getWordById(HSK14_REALIGN_ID_MAP[246]).hanzi).toBe('虽然……但是……'); // 但是
    expect(getWordById(HSK14_REALIGN_ID_MAP[326]).hanzi).toBe('不但……而且……'); // 不但
    expect(getWordById(HSK14_REALIGN_ID_MAP[328]).hanzi).toBe('只有……才……'); // 才
  });

  // Resmi HSK 2.0 listesinin hiçbir seviyesinde olmayan 16 kelime kütüphaneden
  // çıkarıldı; ilerlemeleri ve hata havuzu kayıtları silinir.
  test('silinen kelimeler: hsk1-4 id\'si, haritada yok, 16 kayıt', () => {
    expect(HSK14_REALIGN_DROPPED_IDS).toHaveLength(16);
    const levels = new Set(HSK14_REALIGN_DROPPED_IDS.map(getLevelFromWordId));
    expect([...levels].sort()).toEqual(['hsk3', 'hsk4']);
    expect(HSK14_REALIGN_DROPPED_IDS.every((id) => HSK14_REALIGN_ID_MAP[id] === undefined)).toBe(true);
    expect(new Set(HSK14_REALIGN_DROPPED_IDS).size).toBe(HSK14_REALIGN_DROPPED_IDS.length);
    // Pin: 河/鞋/信/兴趣 resmi listede yoktu.
    expect([395, 545, 548, 550].every((id) => HSK14_REALIGN_DROPPED_IDS.includes(id))).toBe(true);
  });

  test('hsk1-4 havuzları resmi boyutlarda ve sıralı', () => {
    expect(LEVEL_POOLS.hsk1).toHaveLength(150);
    expect(LEVEL_POOLS.hsk2).toHaveLength(150);
    expect(LEVEL_POOLS.hsk3).toHaveLength(300);
    expect(LEVEL_POOLS.hsk4).toHaveLength(600);
    // Resmi liste pinyin sırasındadır; ilk/son kayıtlar pinlenir.
    expect(LEVEL_POOLS.hsk1[0].hanzi).toBe('爱');
    expect(LEVEL_POOLS.hsk1[149].hanzi).toBe('坐');
    expect(LEVEL_POOLS.hsk4[599].hanzi).toBe('作者');
    // Faz 7'de eklenen kalıp kayıtları tek satırdır (…… biçimiyle).
    expect(LEVEL_POOLS.hsk2.find((w) => w.id === 283).hanzi).toBe('因为……所以……');
    expect(LEVEL_POOLS.hsk3.find((w) => w.id === 585).hanzi).toBe('只有……才……');
  });

  // Sıra önemli: bir Faz 7 HEDEFİ, Faz 6 KAYNAĞI olabilir (1843 eski hsk5 kelimesinin
  // id'siydi, şimdi 暗'nin). Bekleyen fazlar YÜKSELEN sırayla uygulanmalıdır, aksi
  // halde 暗'nin ilerlemesi Faz 6 tarafından yanlış yere taşınır.
  test('Faz 7 hedefi Faz 6 kaynağı olabilir; sıra yükselendir', async () => {
    expect(HSK5_REBALANCE_ID_MAP[1843]).toBeDefined();
    expect(HSK14_REALIGN_ID_MAP[604]).toBe(1843);
    await AsyncStorage.clear();
    const versions = (await getPendingWordIdMigrations()).map((m) => m.version);
    expect(versions).toEqual([1, 2, 3]);
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
    await expect(getPendingWordIdMigrations()).resolves.toEqual([]);
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

  // Sürüm-farkındalık: cihaz hangi fazları uygulamışsa yalnızca SONRAKİLER uygulanır.
  // Faz 6'nın 1802-2500 aralığı artık yeni resmi kelimeleri tutar; birleşik tablo
  // ikinci kez uygulanırsa o kelimelerin ilerlemesi yanlış id'ye taşınırdı.
  test('bekleyen göçler uygulanmış sürüme göre filtrelenir', async () => {
    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, '0');
    expect((await getPendingWordIdMigrations()).map((m) => m.version)).toEqual([1, 2, 3]);

    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, '1');
    expect((await getPendingWordIdMigrations()).map((m) => m.version)).toEqual([2, 3]);

    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, '2');
    expect((await getPendingWordIdMigrations()).map((m) => m.version)).toEqual([3]);

    await AsyncStorage.setItem(WORD_ID_MIGRATION_VERSION_KEY, '3');
    expect(await getPendingWordIdMigrations()).toEqual([]);
  });

  test('her bekleyen göç kendi harita ve silme listesini taşır', async () => {
    const pending = await getPendingWordIdMigrations();

    expect(pending.map((m) => m.map)).toEqual([
      MERGED_WORD_ID_MAP,
      HSK5_REBALANCE_ID_MAP,
      HSK14_REALIGN_ID_MAP,
    ]);
    expect(pending.map((m) => m.dropped)).toEqual([
      [],
      HSK5_REBALANCE_DROPPED_IDS,
      HSK14_REALIGN_DROPPED_IDS,
    ]);
    expect(Object.keys(WORD_ID_MIGRATIONS_BY_VERSION).map(Number)).toEqual([1, 2, 3]);
  });

  test('hsk5 havuzu 1300 kelime ve kuyruk resmi sırada (veri pin)', () => {
    expect(LEVEL_POOLS.hsk5).toHaveLength(1300);
    expect(LEVEL_POOLS.hsk5[601].id).toBe(1802);
    expect(LEVEL_POOLS.hsk5[601].hanzi).toBe('指导');
  });
});
