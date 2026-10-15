# NOTES — ChineseQuizApp Geliştirme Notları

Bu dosya, projede nerede kaldığımızı ve sıradaki adımları kaydeder.
Yeni bir oturumda/oturumda çalışmaya başlarken **önce bu dosyayı**, sonra `git log`'u oku.

Son güncelleme: Faz 2.3 (`importService` regex + `defaultName`) tamamlandı; **41 test yeşil**. Sıradaki: Faz 2.4 (çeldirici tekilliği).

---

## 1. Proje özeti

HSK 1–5 Çince kelime kartlarıyla çalışan Expo/React Native mobil uygulaması.
2.500 kelimelik sabit kütüphane, 6 soru yönü, yanlışları tekrar etme (Review),
JSON'dan özel deste içe aktarma, sözlük arama + el yazısı tanıma, istatistik ekranı.

- **Navigasyon:** React Navigation **Stack** (Expo Router DEĞİL — `AGENTS.md` bu konuda yanıltıcı, bkz. Faz 3.4).
- **Giriş:** `index.js` → `App.js`.
- **Ekranlar:** `screens/HomeScreen.js`, `screens/QuizScreen.js`, `screens/VocabularyScreen.js`.
- **Bileşenler:** `components/` (Header, QuestionCard, ScoreBoard, ExampleBox, StatsModal, CustomDeckModal, HandwritingModal, FloatingBackground).
- **Servisler:** `services/statsManager.js`, `services/importService.js`, `services/exampleService.js`.
- **Veri:** `data/hsk1..5.json` (2.500 kelime, id 1–2500), `data/examples/hsk1..5_examples.js`.

### Önemli sabitler / veri akışı

| AsyncStorage anahtarı | İçerik |
|---|---|
| `@hsk_review_pool` | Yanlış yapılan kelimeler (App.js yönetir) |
| `@hsk_user_stats` | `{ wordStats, dailyStats, streak }` |
| `@custom_word_decks` | `{ "Deste Adı": [kelimeler] }` |

- Navigasyon parametresi: Home → Quiz `{ initialLevel }` (`QuizScreen` `route.params.initialLevel` okur).
- DeviceEventEmitter olayları: `onCustomDeckImported`, `onLevelChange`.

---

## 2. Ortam / araç notları

- **Git yeni kuruldu** (winget ile, 2.55.x): `C:\Program Files\Git\cmd\git.exe`.
  - Shell her açılışta PATH'te olmayabilir → komutlardan önce ekle:
    `$env:Path += ";C:\Program Files\Git\cmd"`
- Proje başlangıçta **git deposu değildi**; `git init -b main` ile başlatıldı.
- Yerel git kimliği: `Olcan Askar` / `developer@localhost` (repoya özel; istersen `git config --local user.email ...`).
- **Remote (uzak depo) YOK** → commit'ler yalnızca bu diskte. Gerçek yedek için ileride GitHub vb. eklenmeli.
- `android/` ve `ios/` `.gitignore`'da (Expo prebuild çıktısı; elle düzenleme).
- **`tsconfig.json` ve ESLint yapılandırması YOK** → `AGENTS.md`'nin istediği `tsc` / `expo lint` çalışmaz (bkz. Faz 3.4).
- **Test altyapısı VAR** (Faz 2.1 sonrası eklendi): `jest` + `jest-expo`.
  - Komut: `npm test` (tek seferlik) veya `npm run test:watch`.
  - `jest.setup.js` → AsyncStorage'ın resmi jest mock'unu bağlar (`jest.mock(...)`).
  - Kapsam: **servisler** (saf iş mantığı, tarih/streak, veri doğrulama). UI/dokunma/animasyon hâlâ cihazda elle test edilir.
- Derleme/emülatör yok → UI doğrulaması statik (Babel parse) + cihazda elle; **mantık doğrulaması `npm test` ile.**
- Geçici doğrulama scriptleri (artık gerekmiyor, duruyor): `%TEMP%\opencode\*.js`.

---

## 3. Git durumu

```
91d3597  fix(import): strip file extension for default deck name and prefill it
0ea3c62  docs: mark Faz 2.2 done in NOTES.md
c2de580  fix(date): use local date keys for daily stats and calendar
6ea6c87  docs: move known-good tag to the verified test-covered state
610c768  docs: record test setup and green suite in NOTES.md
163b3f9  test: add unit tests for stats, import and example services
cf46bbb  chore(test): add jest-expo setup with AsyncStorage mock
46e3279  docs: mark Faz 2.1 done in NOTES.md
bc97841  fix(stats): serialize stat writes to prevent lost updates; add ref-based double-tap guard
f51ebe9  docs: add NOTES.md (phase plan and handoff notes)
e6c1d18  fix(review): free mode switching in Review (one-shot mode init), per-mode remaining count
2a7e4e4  fix: P0 quiz bugs (hsk5 examples export, mixed hsk5 pool, review mode lock, missing hint in meaning modes)
4191644  chore: baseline commit (pre-fix snapshot)
```

- **`known-good` etiketi** = test edilip "çalışıyor" denilen hâl. Nerede olduğunu görmek için: `git show -s known-good`.
- Güncel HEAD için: `git log --oneline -1`.
- Her şey ters giderse dönüş: `git reset --hard known-good`
- Tek commit geri alma: `git revert <hash>`
- Kaydedilmemiş dosya geri alma: `git restore <dosya>`

---

## 4. Tamamlananlar

### Faz 0 — Altyapı
- [x] Git kurulumu + `git init` + baseline commit.
- [x] Mevcut hataların cihazda gözlemlenmesi (baseline).

### Faz 1 — P0 (kırık işlevler)
- [x] **HSK5 örnek cümleleri** — `data/examples/hsk5_examples.js` içinde eksik olan `export default hsk5Examples;` eklendi.
- [x] **Mixed modunda HSK5** — `screens/QuizScreen.js` mixed havuzuna `...hsk5Data` eklendi (artık 2.500 kelime).
- [x] **Review mod kilidi** — mod sekmeleri artık serbestçe değişiyor (aşağıya bakınız).
- [x] **Eksik ipucu** — `components/QuestionCard.js` içindeki `includes('en')` → `includes('meaning')`; ölü `startsWith('en')` kontrolleri temizlendi.

### Faz 1 ek / Review davranışı (kullanıcı isteği)
- **İstenen davranış:** mod bazlı filtreleme kalsın; yanlışı olmayan sekmeye geçilince "No Mistakes in this Mode!" uyarısı görünsün; doğru cevaplanan kelime **sadece o modun** kaydından çıksın.
- **Yapılan:** `QuizScreen.js` içinde review mod seçimi **tek seferlik init**'e çevrildi (`didInitReviewMode` ref).
  - Review'a ilk girişte yanlışı olan bir mod otomatik seçilir.
  - Sonrasında mod asla zorla geri alınmaz; kullanıcı sekmeler arasında serbestçe gezer.
- **Ek:** Header'daki kalan kelime sayacı artık **o moda özel** (`reviewCountForMode`).

### Test altyapısı (Faz 2.1 sonrası)
- [x] `jest` + `jest-expo` kuruldu. Kurulum komutu (Windows): `npx expo install jest-expo jest @types/jest "--" --dev`.
- [x] `package.json` → `"jest": { "preset": "jest-expo", "setupFilesAfterEnv": ["<rootDir>/jest.setup.js"] }`, `"test": "jest"`.
- [x] `jest.setup.js` → AsyncStorage resmi jest mock'u.
- [x] `__tests__/`: `statsManager.test.js` (10) + `importService.test.js` (10) + `exampleService.test.js` (8) = **28 test**.
- **Not:** `importService`'te `defaultName` testi `test.failing` olarak işaretli — **Faz 2.3 hatası bilinçli belgeleniyor**. 2.3 düzeltilince bu testi normal `test(...)` yapıp yeşile çevir.
- **Commit:** `cf46bbb` (altyapı), `163b3f9` (testler)

---

## 5. Sıradaki: Faz 2 — Veri bütünlüğü / yarış koşulları

Her maddeyi **ayrı commit** olarak yap.

### 2.1 ✅ TAMAMLANDI — İstatistik yarış koşulu (P1)
- **Sorun:** `services/statsManager.js` her cevapta tüm `@hsk_user_stats`'ı okuyup yeniden yazar; `QuizScreen` çağrısı `await` etmez → hızlı ardışık cevaplarda kayıp (lost update).
- **Yapıldı:**
  - `recordAnswer`, yazmaları sıralayan bir **kuyruk** üzerinden çalışıyor (`statsWriteQueue` + `performRecordAnswer`). Her yazma bir önceki bitince başlar.
  - `QuizScreen`: çift dokunmayı engelleyen **ref bayrağı** (`isAnsweredRef`) + `setAnswered` yardımcısı eklendi (React state gecikmesinden bağımsız).
- **Doğrulama:** Mock'lu test — kuyruklu sürüm 20/20 cevabı kaydetti; kuyruksuz (eski) hâl taklidi 20 cevaptan yalnızca 1'ini tuttu.
- **Commit:** `bc97841`

### 2.2 ✅ TAMAMLANDI — UTC / yerel tarih tutarsızlığı (P1)
- **Sorun:** `statsManager` günlük/streak anahtarlarını `toISOString()` (**UTC**) üretirken `StatsModal` "bugün"ü ve takvimi **yerel** kuruyordu → gece yarısı civarı verilen cevap yanlış güne düşüyor, takvimle uyuşmuyordu.
- **Yapıldı:**
  - Yeni `services/dateUtils.js`: `getDateKey(date)` (yerel `YYYY-MM-DD`) + `addDays(date, n)` (takvim günü; yaz saati/DST güvenli, girdiyi değiştirmez).
  - `services/statsManager.js`: `today` ve `yesterday` artık yerel ve bu yardımcıdan geliyor.
  - `components/StatsModal.js`: 7 günlük şerit ve aylık takvim grid'i aynı yerel anahtarları kullanıyor (hafta günü etiketi de aynı `d`'den).
- **Doğrulama:** `__tests__/dateUtils.test.js` (10 test) + `statsManager.test.js`'e eklenen **gece yarısı regresyon testi** (sahte saat 11 Mart 00:30 → anahtar `2026-03-11`; eski UTC kod `2026-03-10` yazardı). Suite: **39 test yeşil**.
- **Not (veri göçü):** Anahtarlar UTC'den yerele geçtiği için eski kayıtlarda akşam saatlerine ait birkaç gün anahtarı kayabilir. Küçük ve tek seferlik; ayrı bir göç kodu eklenmedi.
- **Commit:** `c2de580`

### 2.3 ✅ TAMAMLANDI — `importService` regex + default isim (P1)
- **Sorun:** `/\.[^/.]+\$/` bozuk (sondaki `\$` yüzünden hiç eşleşmiyordu) → dosya uzantısı `defaultName`'den kırpılmıyordu; ayrıca üretilen `defaultName` `CustomDeckModal` tarafından hiç kullanılmıyordu.
- **Yapıldı:**
  - `services/importService.js`: regex `/\.[^/.]+$/` olarak düzeltildi; ad kırpılıp `trim()` edilir, boş kalırsa eski `'Custom Deck'` yedeğine düşer.
  - `components/CustomDeckModal.js`: `handlePickFile` artık isim alanını `result.defaultName` ile önceden doldurur (`setCustomDeckName(result.defaultName || '')`).
- **Doğrulama:** `test.failing` normal teste çevrildi; uzantısız ad ve çok noktalı ad senaryoları eklendi. Suite: **41 test yeşil**.
- **Commit:** `91d3597`

### 2.4 Tekrarlanan hanzi / çeldirici tekilliği (P1)
- **Sorun:** 66 hanzi birden çok seviyede var; çeldiriciler yalnızca `id` ile eleniyor → aynı/çok benzer şık gelebilir.
- **Çözüm:** çeldiricileri `hanzi|pinyin|meaning` içerik anahtarına göre ele; Meaning modunda `meaning` çakışmasını da dışla.
- **Doğrulama:** Mixed/Custom'da aynı hanzi iki şıkta görünmemeli.

---

## 6. Faz 3 — Mimari / bakım kolaylığı (refactor, daha yüksek risk)

- [ ] **3.1 Ortak veri katmanı:** `services/wordRepository.js` → `hsk1..5` import'ları, `ALL_WORDS`, `getWordPool(level)`, `getExample(...)` tek yerde. `QuizScreen`, `VocabularyScreen`, `StatsModal`, `FloatingBackground`, `exampleService` bunu kullansın.
- [ ] **3.2 `reviewPool` veri şekli:** `{ ...currentWord, word, wrongMode }` → `{ wordId, wrongMode }`; açılışta eski şekli normalize eden göç kodu ekle.
- [ ] **3.3 Mod/kategori tutarlılığı:** istatistik yönleri birleştirirken review yön bazlı ayrı tutuyor; tek bir `MODE_CATEGORY` map'i (`services/modes.js`) ile netleştir. Bilinmeyen mod sessizce varsayılana düşmesin.
- [ ] **3.4 AGENTS.md + araçlar:** AGENTS.md'yi gerçek yapıya göre güncelle (React Navigation, `src/app` yok). `tsconfig.json` + ESLint ekle; `tsc --noEmit` ve lint çalışsın. (Expo SDK 57 dokümanlarını doğrula: https://docs.expo.dev/llms.txt)
- [ ] **3.5 Bağımlılık/ölü kod temizliği:** kullanılmayanları kaldır (`expo-notifications`, `expo-file-system`, `expo-status-bar`, `@react-navigation/native-stack`); `words.json` (referanssız), `App.js isLoaded`, `Header.js Dimensions` importu; `app.json` splash yapılandırması (`assets/splash-icon.png` kullanılmıyor).
- [ ] **3.6 Özel desteler:** aynı isimde üzerine yazmadan önce onay; sanitize edilmiş adı hem anahtar hem ID öneki olarak kullan; özel desteleri istatistiğe ekle.

---

## 7. Faz 4 — Performans / UX

- [ ] **4.1** `StatsModal`: veri yüklenirken `null` dönme (flicker); hesaplamaları `useMemo`.
- [ ] **4.2** `QuizScreen`: çeldirici havuzunu `useMemo` ile önbelleğe al (her soruda 2.500'lük dizi kopyası + sıralama).
- [ ] **4.3** `FloatingBackground`: `while` döngüsüne maksimum deneme; `Dimensions` değişimini dinle.
- [ ] **4.4** Quiz oturumu: soru sayısı/bitiş ekranı, skor sıfırlama, ilerleme göstergesi.
- [ ] **4.5** Erişilebilirlik: `accessibilityRole/Label`.
- [ ] **4.6** `HandwritingModal`: fetch zaman aşımı.

---

## 8. Bilinen açık riskler / notlar

- **Remote yedek yok** — tüm geçmiş bu diskte. Uygun olduğunda GitHub (veya benzeri) eklenmeli.
- **Derleme/emülatör yok** — Faz 1 değişikliklerinin cihazda son teyidi kullanıcıda:
  1. HSK5 kelimesini yanlış cevapla → örnek cümle görünmeli.
  2. Mixed modunda HSK5 (id 1201+) gelmeli.
  3. Review'da sekmeler arasında serbest geçiş; yanlışsız modda uyarı.
  4. 6 modun hepsinde cevap sonrası ipucu satırı çıkmalı.
- `hsk5.json` kayıtlarında `level` alanı yok (hsk1–4'te var) — veri modeli tutarsızlığı (düşük öncelik).
- `HandwritingModal` harici Google `inputtools` servisine bağımlı (çevrimdışı → hata mesajı).

---

## 9. Yeni oturumda nasıl devam edilir

1. Bu dosyayı oku (`NOTES.md`).
2. `git log --oneline` ve `git status` ile durumu doğrula.
3. Çalışılacak maddeyi seç (kural: **her düzeltme ayrı commit**, mesajı açıklayıcı).
4. Bitince: doğrula (`npm test`, varsa Babel parse) → commit → bu dosyadaki ilgili kutuyu işaretle ve "Son güncelleme" satırını değiştir.
5. Bir şey ters giderse: `git reset --hard known-good` (veya ilgili commit'i `git revert`).
