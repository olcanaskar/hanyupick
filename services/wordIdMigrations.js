// hsk5 verisindeki İKİZ KAYITLARIN göç tablosu (Faz 4 veri temizliği).
//
// Sorun: `data/hsk5.json` içinde 17 kelime AYNI hanzi + AYNI pinyin ile iki kez
// bulunuyordu (iki farklı içe aktarım; anlam metinleri farklı: "Contain" / "contain,
// embody"). Kod bu ikizleri şık üretiminde çakışmasız göstermeyi başarıyordu (bkz.
// quizBuilder) ama sonuç yine de kötüydü:
//
//   - İstatistikler iki id'ye BÖLÜNÜYORDU ("3 doğru seri" kuralı iki ayrı kelime gibi
//     işliyordu, bir yarısı ustalaşmış görünürken diğeri görünmüyordu).
//   - Yanlış havuzu aynı kelimeyi iki farklı id ile taşıyabiliyordu.
//
// Çözüm: her çift TEK kayda indirildi. Kimlik olarak KÜÇÜK id korundu (liste sırası ve
// mevcut kayıtların çoğu değişmesin), anlam metni ise iki kayıttan daha açıklayıcı olan
// seçildi. Silinen (büyük) id'ler artık veride yok; ANCAK kullanıcının diskindeki
// istatistik/yanlış kayıtları o id'leri taşıyorsa sessizce kaybolmamalı. Bu yüzden:
//
//   @hsk_user_stats  -> `services/statsManager.mergeWordStatsIds` (seriler TOPLANIR)
//   @hsk_review_pool -> `services/reviewPool.normalizeReviewPool(pool, MERGED_WORD_ID_MAP)`
//
// Her iki göç de açılışta App.js'ten çağrılır ve İDEMPOTENTTİR: taşınacak kayıt kalmazsa
// hiçbir yazma yapılmaz.
//
// Tabloyu DEĞİŞTİRMEK gerekirse: `wordRepository` tarafında hedef id gerçekten var
// olmalı (test bunu doğrular) ve göç testleri birlikte güncellenmelidir.

// Silinen id → tutulan id
export const MERGED_WORD_ID_MAP = {
  1889: 1206, // 包含 bāohán
  1894: 1207, // 宝贵 bǎoguì
  2002: 1237, // 财产 cáichǎn
  2010: 1241, // 操场 cāochǎng
  2024: 1242, // 插 chā
  2021: 1243, // 叉子 chāzi
  2025: 1244, // 拆 chāi
  2110: 1275, // 传染 chuánrǎn
  2132: 1280, // 次要 cìyào
  2151: 1288, // 打工 dǎgōng
  2288: 1326, // 罚款 fákuǎn
  2293: 1328, // 繁荣 fánróng
  2310: 1333, // 方案 fāng'àn
  2331: 1545, // 培养 péiyǎng
  2380: 1556, // 期待 qīdài
  2431: 1571, // 亲切 qīnqiè
  2454: 1579, // 权力 quánlì
};
