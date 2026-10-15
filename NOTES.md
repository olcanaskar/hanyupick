# NOTES — ChineseQuizApp Geliştirme Notları

Bu dosya, projede nerede kaldığımızı ve sıradaki adımları kaydeder.
Yeni bir oturumda/oturumda çalışmaya başlarken **önce bu dosyayı**, sonra `git log`'u oku.

Son güncelleme: Faz 2 tamamlandı (2.1–2.4), **cihazda Expo Go ile denendi — sorun yok**, **GitHub remote kuruldu**, **geçmiş yeniden yazıldı** (commit e-postaları düzeltildi, tüm hash'ler değişti). **60 test yeşil.** Sıradaki: Faz 3 (mimari) veya Faz 4 (performans).

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
- Git kimliği: `Olcan Askar` / `aabdullaholcan@gmail.com` (global + repo-local).
- **Remote (uzak depo) VAR:** `https://github.com/olcanasqar/ChineseQuizApp.git` (private). Kimlik: HTTPS + Git Credential Manager (`credential.helper=manager`) — anahtar/token yönetimi yok. Push: `git push origin main`; etiket için `git push origin known-good`. **Normalde bunu hook otomatik yapar (aşağıya bak).**
  - **Geçmiş yeniden yazıldı** (2026-10-15, `git filter-branch --env-filter`): ilk 19 commit'in `developer@localhost` e-postası `aabdullaholcan@gmail.com` yapıldı → **20/20 commit** artık GitHub hesabına bağlı. GitHub'ın dokümanına göre `@localhost` gibi generic adresler hesaba **eklenemez**, bu yüzden tek çözüm buydu.
    - Kanıt: rewrite öncesi/sonrası **tree hash birebir aynı** (`8ac1a016…`) → dosya içeriği değişmedi; 20 commit mesajı da korundu; `npm test` 60/60 yeşil.
    - Yan etki: **tüm commit hash'leri değişti** (bkz. §3), `known-good` yeni karşılığına taşındı, uzak tarafa **force push** gerekti.
    - Yerel emniyet ağı hâlâ duruyor: `refs/original/*` + `pre-rewrite` etiketi **eski geçmişi** tutar. Emin olduktan sonra sil:
      `git tag -d pre-rewrite` · `git update-ref -d refs/original/refs/heads/main` · `git update-ref -d refs/original/refs/tags/known-good`
    - ⚠️ `pre-rewrite` silinmeden `git push --tags` yapılırsa eski (yanlış e-postalı) geçmiş de GitHub'a gider.
- **Otomatik push hook'u VAR** (`.git/hooks/post-commit`; **yerel** — uzak repoya gitmez, sadece bu makinede çalışır): her commit'ten sonra `main` dalını **ve** `known-good` etiketini GitHub'a gönderir.
  - Tasarım güvenceleri: **`main` dalı asla zorlanmaz** → uzaktaki kod geçmişi ezilemez, reddedilen push sadece başarısız olur. Yalnızca **`known-good` etiketi** zorlanır (tek ref): git var olan bir etiketi force'suz kabul etmez (`rejected … tag already exists`) ve bu etiket bilinçli olarak *taşınabilir* bir geri dönüş noktasıdır. `post-commit` commit'ten *sonra* çalıştığı için push başarısız olsa bile **commit bozulmaz**. Kimlik istemi açmaz (`credential.interactive=false`) → çevrimdışıysan sadece uyarı basar, takılmaz.
  - Sadece `main` dalında çalışır → kazara uzakta yeni dal açmaz.
  - Tek seferlik atlama: `SKIP_AUTOPUSH=1 git commit -m "..."` · kalıcı kaldırma: `rm .git/hooks/post-commit`.
  - **Elle `git push` hâlâ gerekir:** (1) `amend` / `rebase` / geçmiş yeniden yazımı → hook çalışmaz *ve* `main` için force gerekir, (2) çevrimdışı kalınan commit'ler (internet gelince `git push origin main`), (3) hook kaldırılmışsa.
  - Doğrulandı (2026-10-15): commit sonrası uzak gerçekten güncellendi (`origin/main` = yerel); `known-good` hem ileri hem geri taşınıp senkronlandı; `SKIP_AUTOPUSH=1` hook'u sessizce atlıyor.
- **Yerel arşiv yedek:** `C:\Projects\App\` altında zaman damgalı `ChineseQuizApp-backup-*.tar.gz` (en yenisini kullan). İçerik: `.git` + `known-good` dahil; `node_modules`/`android`/`.expo` hariç. Doğrulama: açıp `git log -1`, `git tag`, `git status` → commit/etiket HEAD ile aynı ve çalışma alanı temiz olmalı.
  - Yeni yedek almak için:
    `tar -czf C:\Projects\App\ChineseQuizApp-backup-<tarih>.tar.gz -C C:\Projects\App --exclude=ChineseQuizApp/node_modules --exclude=ChineseQuizApp/android --exclude=ChineseQuizApp/.expo ChineseQuizApp`
  - **Uyarı:** `C:\Projects\App\backup\` klasöründeki eski elle kopya **bozuk ve eksik** (`data\hsk5.json` 0 bayt, `hsk5_examples.js` yok). Yedek sanılıp güvenilmemeli.
- `android/` ve `ios/` `.gitignore`'da (Expo prebuild çıktısı; elle düzenleme).
- **`tsconfig.json` ve ESLint yapılandırması YOK** → `AGENTS.md`'nin istediği `tsc` / `expo lint` çalışmaz (bkz. Faz 3.4).
- **Test altyapısı VAR** (Faz 2.1 sonrası eklendi): `jest` + `jest-expo`.
  - Komut: `npm test` (tek seferlik) veya `npm run test:watch`.
  - `jest.setup.js` → AsyncStorage'ın resmi jest mock'unu bağlar (`jest.mock(...)`).
  - Kapsam: **servisler** (saf iş mantığı, tarih/streak, veri doğrulama). UI/dokunma/animasyon hâlâ cihazda elle test edilir.
- **Çalıştırma yolu (DOĞRULANDI): Expo Go.** Kullanılan tüm native modüller Expo Go'da geliyor; `expo-notifications` kodda hiç kullanılmıyor (tek kısıt oydu). Komut:
  - `npx expo start --go --clear` → terminalde `a` (emülatör) veya telefonda QR tara.
  - Tek satır: `npx expo start --go --android`
  - Bundle ön kontrolü: `npx expo export --platform android` → 1086 modül, hatasız (SDK 57 / RN 0.86).
- **Yerel native build (`expo run:android`) denenmedi** ve şimdilik gerekmiyor: Java 25 kurulu (AGP genelde Java 17/21 ister) + yerelde eski bir `android/` klasörü var (gitignore'da, üretilen). Expo Go bu risklerin hepsini atlar.
- UI/dokunma/animasyon cihazda elle; **mantık doğrulaması `npm test` ile.**
- Geçici doğrulama scriptleri (artık gerekmiyor, duruyor): `%TEMP%\opencode\*.js`.

---

## 3. Git durumu

```
7e9f9c5  docs: record GitHub remote setup in NOTES.md
85efa40  docs: describe backup archive generically in NOTES.md
37b4790  docs: record verified local backup archive in NOTES.md
7e395db  docs: record successful Expo Go device verification in NOTES.md
a0df1cd  docs: mark Faz 2.4 done in NOTES.md
8cfe62e  fix(quiz): prevent duplicate/ambiguous options and pick same-level distractors
8333a74  docs: mark Faz 2.3 done in NOTES.md
7fbebf7  fix(import): strip file extension for default deck name and prefill it
8da172a  docs: mark Faz 2.2 done in NOTES.md
95d7667  fix(date): use local date keys for daily stats and calendar
a97719f  docs: move known-good tag to the verified test-covered state
e5bd49f  docs: record test setup and green suite in NOTES.md
59a0b1a  test: add unit tests for stats, import and example services
8863a34  chore(test): add jest-expo setup with AsyncStorage mock
7565348  docs: mark Faz 2.1 done in NOTES.md
b4b973f  fix(stats): serialize stat writes to prevent lost updates; add ref-based double-tap guard
3bf63f6  docs: add NOTES.md (phase plan and handoff notes)
34c8370  fix(review): free mode switching in Review (one-shot mode init), per-mode remaining count
c97b903  fix: P0 quiz bugs (hsk5 examples export, mixed hsk5 pool, review mode lock, missing hint in meaning modes)
a1af3af  chore: baseline commit (pre-fix snapshot)
```
> **Not:** Bu hash'ler 2026-10-15'teki **geçmiş yeniden yazımından sonradır** (e-posta düzeltmesi); daha eski hash'ler geçersiz. Blok `7e9f9c5` anlık görüntüsüdür — güncel tam liste için `git log --oneline`.

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
- **Commit:** `8863a34` (altyapı), `59a0b1a` (testler)

---

## 5. Faz 2 — Veri bütünlüğü / yarış koşulları (2.1–2.4 tamamlandı)

Her maddeyi **ayrı commit** olarak yap.

### 2.1 ✅ TAMAMLANDI — İstatistik yarış koşulu (P1)
- **Sorun:** `services/statsManager.js` her cevapta tüm `@hsk_user_stats`'ı okuyup yeniden yazar; `QuizScreen` çağrısı `await` etmez → hızlı ardışık cevaplarda kayıp (lost update).
- **Yapıldı:**
  - `recordAnswer`, yazmaları sıralayan bir **kuyruk** üzerinden çalışıyor (`statsWriteQueue` + `performRecordAnswer`). Her yazma bir önceki bitince başlar.
  - `QuizScreen`: çift dokunmayı engelleyen **ref bayrağı** (`isAnsweredRef`) + `setAnswered` yardımcısı eklendi (React state gecikmesinden bağımsız).
- **Doğrulama:** Mock'lu test — kuyruklu sürüm 20/20 cevabı kaydetti; kuyruksuz (eski) hâl taklidi 20 cevaptan yalnızca 1'ini tuttu.
- **Commit:** `b4b973f`

### 2.2 ✅ TAMAMLANDI — UTC / yerel tarih tutarsızlığı (P1)
- **Sorun:** `statsManager` günlük/streak anahtarlarını `toISOString()` (**UTC**) üretirken `StatsModal` "bugün"ü ve takvimi **yerel** kuruyordu → gece yarısı civarı verilen cevap yanlış güne düşüyor, takvimle uyuşmuyordu.
- **Yapıldı:**
  - Yeni `services/dateUtils.js`: `getDateKey(date)` (yerel `YYYY-MM-DD`) + `addDays(date, n)` (takvim günü; yaz saati/DST güvenli, girdiyi değiştirmez).
  - `services/statsManager.js`: `today` ve `yesterday` artık yerel ve bu yardımcıdan geliyor.
  - `components/StatsModal.js`: 7 günlük şerit ve aylık takvim grid'i aynı yerel anahtarları kullanıyor (hafta günü etiketi de aynı `d`'den).
- **Doğrulama:** `__tests__/dateUtils.test.js` (10 test) + `statsManager.test.js`'e eklenen **gece yarısı regresyon testi** (sahte saat 11 Mart 00:30 → anahtar `2026-03-11`; eski UTC kod `2026-03-10` yazardı). Suite: **39 test yeşil**.
- **Not (veri göçü):** Anahtarlar UTC'den yerele geçtiği için eski kayıtlarda akşam saatlerine ait birkaç gün anahtarı kayabilir. Küçük ve tek seferlik; ayrı bir göç kodu eklenmedi.
- **Commit:** `95d7667`

### 2.3 ✅ TAMAMLANDI — `importService` regex + default isim (P1)
- **Sorun:** `/\.[^/.]+\$/` bozuk (sondaki `\$` yüzünden hiç eşleşmiyordu) → dosya uzantısı `defaultName`'den kırpılmıyordu; ayrıca üretilen `defaultName` `CustomDeckModal` tarafından hiç kullanılmıyordu.
- **Yapıldı:**
  - `services/importService.js`: regex `/\.[^/.]+$/` olarak düzeltildi; ad kırpılıp `trim()` edilir, boş kalırsa eski `'Custom Deck'` yedeğine düşer.
  - `components/CustomDeckModal.js`: `handlePickFile` artık isim alanını `result.defaultName` ile önceden doldurur (`setCustomDeckName(result.defaultName || '')`).
- **Doğrulama:** `test.failing` normal teste çevrildi; uzantısız ad ve çok noktalı ad senaryoları eklendi. Suite: **41 test yeşil**.
- **Commit:** `7fbebf7`

### 2.4 ✅ TAMAMLANDI — Çeldirici tekilliği + seviye bazlı çeldirici (P1)
- **Sorun:** Çeldiriciler yalnızca `id` ile eleniyordu ve **her zaman 2.500 kelimelik genel havuzdan** seçiliyordu. Sonuç:
  - (a) `id` farklı ama içeriği aynı kayıtlar (66 ikiz hanzi, 126 ikiz pinyin, 50 ikiz anlam) yan yana gelip soruyu **cevaplanamaz** yapabiliyordu (örn. iki tane `bā`, iki tane `morning`).
  - (b) HSK 1 çalışırken şıkların **~%83'ü** HSK 3–5 kelimesiydi → cevap bedava veriliyordu.
- **Ölçüm (eski kod, Mixed, 20.000 soru/mod):** aynı şık iki kez → **%0,01–0,06** (kabaca 1.700–10.000 soruda bir). Özel destelerde doğru cevabın ikizi havuzda **garantili** olduğu için oran daha yüksek.
- **Yapıldı:**
  - Yeni `services/quizBuilder.js` (**saf, test edilebilir**): `buildOptions(correctWord, pools, count)`. Bir kelime doğru cevapla **hanzi VEYA pinyin VEYA anlam** alanlarından birini paylaşıyorsa çeldirici olamaz; çeldiriciler kendi aralarında da benzersiz. Karıştırma adil hale getirildi (Fisher-Yates).
  - `screens/QuizScreen.js`: çeldirici havuzları `[aynı seviye, tüm kelimeler]` — yeterli aday yoksa genelden tamamlanır. **Review**'da kelimenin seviyesi `id` aralığından bulunur; Mixed ve özel deste tüm havuzu kullanır. `getWordPool` da sadeleşti.
- **Doğrulama:**
  - `__tests__/quizBuilder.test.js`: fixture + **gerçek veri** (tüm ikiz hanzi/pinyin/anlam grupları ve her seviye için 200 soru) → hiçbir şıkta çakışma yok.
  - Önce/sonra simülasyonu: bozuk şık **%0,01–0,06 → %0,00**; hsk1 modunda çeldiricilerin seviyesi **%9 → %100 hsk1**.
  - Suite: **60 test yeşil**.
- **Bilinçli sınırlama:** Eleme **string** eşitliğine dayanır; `"sun, day"` ↔ `"day, sun"` gibi farklı yazılmış eş anlamlılar yakalanmaz (bkz. §8 veri notu).
- **Commit:** `8cfe62e`

> **Faz 2 kapandı.** Sıradaki adım için öneri: Faz 1–2.4 değişikliklerini cihazda bir kez dene (§8'deki kontrol listesi), sonra Faz 3 (mimari) veya Faz 4 (performans).

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
- [ ] **4.2** `services/quizBuilder.js` / `QuizScreen`: havuz kopyalama + karıştırmayı önbelleğe al veya örnekleme (O(k)) ile değiştir — şu an her soruda seçilen havuz kopyalanıp karıştırılıyor.
- [ ] **4.3** `FloatingBackground`: `while` döngüsüne maksimum deneme; `Dimensions` değişimini dinle.
- [ ] **4.4** Quiz oturumu: soru sayısı/bitiş ekranı, skor sıfırlama, ilerleme göstergesi.
- [ ] **4.5** Erişilebilirlik: `accessibilityRole/Label`.
- [ ] **4.6** `HandwritingModal`: fetch zaman aşımı.

---

## 8. Bilinen açık riskler / notlar

- **Uzak yedek (remote) KURULDU** — `origin` = GitHub private repo (bkz. §2). Geçmiş artık tek diskte değil; ama **düzenli `git push` unutulmamalı** (yerel commit'ler otomatik gitmez).
- **Cihaz testi ✅ YAPILDI** (kullanıcı, Expo Go, SDK 57): uygulama açıldı, **sorun görülmedi**. Yerel native build (Gradle/Java) denenmedi.
  - Madde madde tekrar doğrulamak istenirse:
  1. HSK5 kelimesini yanlış cevapla → örnek cümle görünmeli.
  2. Mixed modunda HSK5 (id 1201+) gelmeli.
  3. Review'da sekmeler arasında serbest geçiş; yanlışsız modda `No Mistakes in this Mode!` uyarısı.
  4. 6 modun hepsinde cevap sonrası ipucu satırı çıkmalı.
  5. HSK 1'de şıklar aynı seviyeden gelmeli; aynı şık iki kez görünmemeli.
- `hsk5.json` kayıtlarında `level` alanı yok (hsk1–4'te var) — veri modeli tutarsızlığı (düşük öncelik). Seviye tespiti bu yüzden `id` aralığından yapılıyor (§5, 2.4).
- **`hsk5.json`'da 17 ikiz kayıt** var (aynı hanzi iki kez, farklı id): 2'si birebir aynı (`财产` 1237/2002, `插` 1242/2024), 15'i yalnızca anlam yazımı farklı (`包含` 1206/1889). Kod artık bu ikizleri şık olarak göstermiyor ama istatistikler iki ayrı id'de birikiyor; veri temizliği ayrı bir iş.
- `exampleService` ile `QuizScreen`'deki `id`→seviye aralıkları **iki yerde tekrar ediyor** → Faz 3.1'de ortak modüle taşınmalı.
- `HandwritingModal` harici Google `inputtools` servisine bağımlı (çevrimdışı → hata mesajı).

---

## 9. Yeni oturumda nasıl devam edilir

1. Bu dosyayı oku (`NOTES.md`).
2. `git log --oneline` ve `git status` ile durumu doğrula.
3. Çalışılacak maddeyi seç (kural: **her düzeltme ayrı commit**, mesajı açıklayıcı).
4. Bitince: doğrula (`npm test`, varsa Babel parse) → commit → bu dosyadaki ilgili kutuyu işaretle ve "Son güncelleme" satırını değiştir.
5. Bir şey ters giderse: `git reset --hard known-good` (veya ilgili commit'i `git revert`).
