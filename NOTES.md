# NOTES — ChineseQuizApp Geliştirme Notları

Bu dosya, projede nerede kaldığımızı ve sıradaki adımları kaydeder.
Yeni bir oturumda/oturumda çalışmaya başlarken **önce bu dosyayı**, sonra `git log`'u oku.

Son güncelleme: **Faz 4.1 tamamlandı** (`593cc0d`: istatistik modalı artık veriyi beklemeden açılıyor — animasyon veriden bağımsız çalışıyor, bayat veri temizleniyor, ağır hesaplamalar `useMemo` ile sabitlendi) ve **4.6** (`d9e8b0b`: el yazısı tanıma isteğine `Promise.race` ile garantili zaman aşımı) → **151 test yeşil**, cihaz kontrolü bekliyor (bkz. §8). Sıradaki: **4.2** (`quizBuilder.buildOptions`: havuzu tamamen kopyalayıp karıştırmak yerine örnekleme). Öncesinde **kullanıcı geri bildirimi turu onaylandı** (`known-good` = `6c25ad5`): ardışık sorularda aynı kartın tekrarı giderildi (`2d995c1`: `quizBuilder.pickWord` önceki kelimeyi eler) ve istatistikte özel desteler ayrı bölüm başlığı olmaktan çıkıp **mastery bölümü içinde alt grup ayracı** oldu (`37ab3dd`). Öncesinde: **Faz 3.6b** (özel desteler istatistikte: `CUSTOM DECKS` ustalık satırları + "sorunlu kelimeler" listesine özel deste kelimeleri; ustalık kuralları `statsManager`'a taşınıp test edildi) ve **kart kaybolması hatasının düzeltilmesi** (`c3e3032`: aynı kelime arka arkaya gelince kart görünmez kalıyordu → kart artık her soruda `key` ile yeniden kurulur). Onaylanana kadar `known-good` = Faz 3.6a (`cd0713c`). Öncesinde: Faz 3.6a (sessiz üzerine yazma + kelime id çakışması engellendi, bildirimler temalı ekranlara taşındı), Faz 3.3 (`services/modes.js`: 6 mod ve 3 kategori tek kaynak; 4 hayalet mod silindi, ölü `wordStats.level` kaldırıldı), Faz 3.4b (TypeScript + `tsconfig.json` + `npm run tsc` tip kapısı; 2 gerçek hata + 1 ölü prop bulundu), Faz 3.5 (ölü kod + bağımlılık temizliği, lint **0 hata / 14 uyarı**), Faz 3.4a (ESLint + `AGENTS.md` yeniden yazımı), Faz 3.2 (review havuzu tek şekle indi: `{ wordId, wrongMode [, snapshot] }`), Faz 3.1 (ortak veri katmanı `services/wordRepository.js`), Faz 2 (2.1–2.4) — cihazda Expo Go ile denendi, GitHub remote kuruldu, geçmiş yeniden yazıldı, **otomatik push hook'u** eklendi, **expo-doctor 21/21**. Sıradaki: Faz 4 (performans/UX) — Faz 3 kapandı. Öncesinde: Faz 3.3 (`services/modes.js`: 6 mod ve 3 kategori tek kaynak; 4 hayalet mod silindi, ölü `wordStats.level` kaldırıldı), Faz 3.4b (TypeScript + `tsconfig.json` + `npm run tsc` tip kapısı; 2 gerçek hata + 1 ölü prop bulundu), Faz 3.5 (ölü kod + bağımlılık temizliği, lint **0 hata / 14 uyarı**), Faz 3.4a (ESLint + `AGENTS.md` yeniden yazımı), Faz 3.2 (review havuzu tek şekle indi: `{ wordId, wrongMode [, snapshot] }`), Faz 3.1 (ortak veri katmanı `services/wordRepository.js`), Faz 2 (2.1–2.4) — cihazda Expo Go ile denendi, GitHub remote kuruldu, geçmiş yeniden yazıldı, **otomatik push hook'u** eklendi, **expo-doctor 21/21**. Sıradaki: Faz 3.6b (özel desteleri istatistiğe ekle) veya Faz 4 (performans).

---

## 1. Proje özeti

HSK 1–5 Çince kelime kartlarıyla çalışan Expo/React Native mobil uygulaması.
2.500 kelimelik sabit kütüphane, 6 soru yönü, yanlışları tekrar etme (Review),
JSON'dan özel deste içe aktarma, sözlük arama + el yazısı tanıma, istatistik ekranı.

- **Navigasyon:** React Navigation **Stack** (Expo Router DEĞİL — `AGENTS.md` bu konuda yanıltıcı, bkz. Faz 3.4).
- **Giriş:** `index.js` → `App.js`.
- **Ekranlar:** `screens/HomeScreen.js`, `screens/QuizScreen.js`, `screens/VocabularyScreen.js`.
- **Bileşenler:** `components/` (Header, QuestionCard, ScoreBoard, ExampleBox, StatsModal, CustomDeckModal, HandwritingModal, FloatingBackground).
- **Servisler:** `services/wordRepository.js` (**HSK verisinin/seviye eşlemesinin tek kaynağı**, Faz 3.1), `services/reviewPool.js` (**yanlış havuzunun tek veri şekli + göç**, Faz 3.2), `services/quizBuilder.js` (şık üretimi), `services/statsManager.js`, `services/importService.js`, `services/exampleService.js`, `services/dateUtils.js`.
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
    - **Emniyet ağı temizlendi (2026-10-15):** `pre-rewrite` etiketi + `refs/original/*` silindi, ardından `git reflog expire --expire=now --all` + `git gc --prune=now` çalıştırıldı → eski (yanlış e-postalı) geçmiş artık depoda **yok** (`.git` 1,31 MB → 0,90 MB). `git push --tags` artık güvenli (yayınlanacak eski etiket kalmadı).
- **Otomatik push hook'u VAR** (`.git/hooks/post-commit`; **yerel** — uzak repoya gitmez, sadece bu makinede çalışır): her commit'ten sonra `main` dalını **ve** `known-good` etiketini GitHub'a gönderir.
  - Tasarım güvenceleri: **`main` dalı asla zorlanmaz** → uzaktaki kod geçmişi ezilemez, reddedilen push sadece başarısız olur. Yalnızca **`known-good` etiketi** zorlanır (tek ref): git var olan bir etiketi force'suz kabul etmez (`rejected … tag already exists`) ve bu etiket bilinçli olarak *taşınabilir* bir geri dönüş noktasıdır. `post-commit` commit'ten *sonra* çalıştığı için push başarısız olsa bile **commit bozulmaz**. Kimlik istemi açmaz (`credential.interactive=false`) → çevrimdışıysan sadece uyarı basar, takılmaz.
  - Sadece `main` dalında çalışır → kazara uzakta yeni dal açmaz.
  - Tek seferlik atlama: `SKIP_AUTOPUSH=1 git commit -m "..."` · kalıcı kaldırma: `rm .git/hooks/post-commit`.
  - **Elle `git push` hâlâ gerekir:** (1) `amend` / `rebase` / geçmiş yeniden yazımı → hook çalışmaz *ve* `main` için force gerekir, (2) çevrimdışı kalınan commit'ler (internet gelince `git push origin main`), (3) hook kaldırılmışsa.
  - Doğrulandı (2026-10-15): commit sonrası uzak gerçekten güncellendi (`origin/main` = yerel); `known-good` hem ileri hem geri taşınıp senkronlandı; `SKIP_AUTOPUSH=1` hook'u sessizce atlıyor.
- **Yerel arşiv yedek:** `C:\Projects\App\` altında zaman damgalı `ChineseQuizApp-backup-*.tar.gz` (en yenisini kullan; **kural: tek arşiv tutulur, yeni alınınca eskisi silinir**). İçerik: `.git` + `known-good` dahil; `node_modules`/`android`/`.expo` hariç. Doğrulama: açıp `git log -1`, `git tag`, `git status` → commit/etiket HEAD ile aynı ve çalışma alanı temiz olmalı.
  - Yeni yedek almak için:
    `tar -czf C:\Projects\App\ChineseQuizApp-backup-<tarih>.tar.gz -C C:\Projects\App --exclude=ChineseQuizApp/node_modules --exclude=ChineseQuizApp/android --exclude=ChineseQuizApp/.expo ChineseQuizApp`
  - **Uyarı:** `C:\Projects\App\backup\` klasöründeki eski elle kopya **bozuk ve eksik** (`data\hsk5.json` 0 bayt, `hsk5_examples.js` yok). Yedek sanılıp güvenilmemeli.
- `android/` ve `ios/` `.gitignore`'da (Expo prebuild çıktısı; elle düzenleme).
- **ESLint VAR (Faz 3.4a):** `eslint` + `eslint-config-expo` (dev) + flat `eslint.config.js` (SDK 53+ düzeni; kaynak: https://docs.expo.dev/guides/using-eslint/). Komut: **`npm run lint`** (= `eslint .`).
  - **`npx expo lint` KULLANILMAZ:** o komut yalnızca `/src`, `/app`, `/components` klasörlerini tarar (Expo Router varsayımı) → bu projede `screens/`, `services/`, `__tests__/`, `App.js` **sessizce atlanır** (18 uyarı gösterir, gerçekte 25 var).
  - Kurulumda: test dosyalarına jest global'leri tanıtıldı (yoksa 330 sahte `no-undef` hatası çıkıyordu); üç kural **bilinçli** gevşetildi — `react-hooks/refs` → **off** (52 yanlış-pozitif: proje RN'in resmî `Animated` ref API'sini kullanıyor, kural bu deseni modelleyemiyor; uzun vadede `react-native`'in `useAnimatedValue()` kancasına geçilirse geri açılabilir), `react-hooks/set-state-in-effect` ve `react/no-unescaped-entities` → **warn**.
  - Güncel durum: **0 hata, 14 uyarı** (7 `set-state-in-effect`, 7 `exhaustive-deps`) — 3.4a'da geçici olarak `warn` yapılan `react/no-unescaped-entities` 3.5'te **error**'a döndürüldü (8 JSX tırnağı kaçırıldı), 3 `no-unused-vars` da 3.5'te temizlendi.
  - **npm 11 tuzağı:** `expo install <pkg> --dev` artık `--include=dev` demek; Windows'ta `"--"` ayırıcısı `--dev`'i yutuyor → paketler yanlışlıkla `dependencies`'e düşer (başımıza geldi, elle düzeltildi).
- **`tsconfig.json` VAR (Faz 3.4b)** — `expo customize tsconfig.json` ile üretildi (`expo/tsconfig.base`'i genişletir), komut **`npm run tsc`** (= `tsc --noEmit`). `expo/tsconfig.base` sağlar: `allowJs`, `noEmit` (**kaynak .js üzerine yazma riski yok**), `resolveJsonModule`, `moduleResolution: bundler`, `skipLibCheck`.
  - **Neden `checkJs: true`:** varsayılan (yalnızca `allowJs`) bir `tsc` kapısı **sadece sözdizimini** kontrol eder; ölçüldü — bozuk bir import yolu bile **yakalanmıyor**. `checkJs` açıkken RN/React API'lerine yapılan gerçek çağrı hataları yakalanıyor (3.4b'de tam olarak böyle 3 bulgu çıktı).
  - **Neden `strict: false` + `noImplicitAny: false`:** TS 6 `noImplicitAny`'yi varsayılan olarak **açık** getiriyor; saf JS bir kod tabanında bu **161 `implicit any` hatası** üretiyor (her fonksiyona JSDoc parametresi yazmak gerekir = tam göç işi). Kapıyı "gerçek hataları yakala, anotasyon dilenme" noktasında tutmak için ikisi de kapalı. **İleride TS'e göç edilirse** yeni `.ts` dosyaları için açılmalı.
  - **`types: ["jest"]`:** TS 6 `@types/*` paketlerini otomatik eklemiyor → bu olmadan test dosyalarında `describe`/`test`/`jest` "bulunamadı" hatası verir. Yeni bir global tip paketi eklenirse buraya da yazılmalı.
  - `include`: `App.js`, `index.js`, `jest.setup.js`, `services/`, `screens/`, `components/`, `__tests__/` (veri dosyaları import zinciriyle kendiliğinden girer).
  - **Kapının kapsamadığı şeyler:** `data/hsk*.json` içeriğinin şekli, çalışma zamanı (cihaz) davranışı, UI.
  - **Kanıt:** 3.4b'de `checkJs` açıkken 10 hata → 3'ü gerçek hata/ölü kod (`CustomDeckModal` yanlış `Platform` karşılaştırması, `FloatingBackground`'da RN 0.86'da **var olmayan** `StyleSheet.absoluteFillObject`, `QuizScreen`'de Header'ın kabul etmediği ölü `onBackPress` prop'u), kalanı tip sözleşmesi (JSDoc) veya küçük yapı düzeltmesi. Şimdi: **0 hata**.
- **Bağımlılıklar SDK ile tam uyumlu** (`npx expo install --fix`, 2026-10-15). Faz 3.5'te kullanılmayan 4 paket kaldırıldı → güncel doğrudan liste: `@react-native-async-storage/async-storage`, `@react-navigation/native`, `@react-navigation/stack`, `expo`, `expo-clipboard`, `expo-document-picker`, `expo-haptics`, `expo-speech`, `react`, `react-native`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg` (dev: `eslint`, `eslint-config-expo`, `jest`, `jest-expo`, `@types/jest`, `@types/react`, `typescript`). `npx expo-doctor` → **21/21 temiz**; doğrulama: `npm test` **98/98** + `npx expo export --platform android` hatasız.
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

- [x] **3.1 Ortak veri katmanı** — `services/wordRepository.js` oluşturuldu: seviye bilgisinin **tek kaynağı**. Dışa aktarılanlar: `LEVELS`, `LEVEL_LABELS`, `LEVEL_POOLS`, `ALL_WORDS`, `getWordPool(level)`, `getLevelFromWordId(id)`.
  - Bağlanan tüketiciler: `QuizScreen`, `exampleService`, `VocabularyScreen`, `StatsModal`, `FloatingBackground` **+ `Header` ve `HomeScreen`** (bu ikisi de tam seviye listesini kopyalıyordu). `id`→seviye aralıkları (150/300/600/1200) artık **yalnızca tek yerde**; eskiden `QuizScreen` ve `exampleService`'te ayrı ayrı duruyordu.
  - Örnek cümle verisi (`data/examples/*`) kavramsal olarak ayrı olduğu için `exampleService`'te kaldı; yalnızca seviye çözümlemesini artık `wordRepository`'den alıyor.
  - `HomeScreen`'deki "150 words · Beginner" metnindeki kelime sayısı havuzdan türetiliyor; üretilen metinlerin birebir aynı kaldığı doğrulandı (150/150/300/600/1300).
  - **Doğrulama:** yeni `__tests__/wordRepository.test.js` (10 test) — gerçek verideki her kelimenin `id`'si kendi dosyasının seviyesine çözülüyor mu; `id`'ler 1..2500 kesintisiz ve benzersiz mi; sınır değerler (150/151, 300/301, 600/601, 1200/1201) doğru mu; `getWordPool('mixed')` tüm havuzu mu döndürüyor. Ayrıca 8 dosya babel ile parse edilip doğrulandı. Suite: **70 test yeşil**.
  - Davranış değişmedi (saf refactor); tek fark: NaN `id` için artık `null` dönüyor (önceden `'hsk5'`).
  - **Commit:** `816cb2f`
- [x] **3.2 `reviewPool` veri şekli** — `services/reviewPool.js` oluşturuldu: havuz kayıtlarının **tek şekli** + tek seferlik göç.
  - **Yeni şekil:** HSK kelimesi → `{ wordId, wrongMode }`; özel deste → `{ wordId, wrongMode, snapshot }`. Özel id'ler `data/hsk*.json`'da yok ve `index` tabanlı üretilebildiği için (aynı isimle farklı dosya aktarılırsa aynı id BAŞKA kelimeyi gösterir) yalnızca onlar kendi metnini taşır → deste silinse bile doğru kelime görünür. Sayısal id'li kayıtta `snapshot` **asla** yok.
  - **Kazanç:** kayıt başına ~183 → ~45 bayt (~%75 küçülme). Asıl fayda: kopya veri **bayatlamıyor** (veri düzeltilince Review ve şık çakışma kontrolü kanonik/taze metni kullanır) ve UI'daki `item.word || item` / `item.id || item.word?.id` savunmaları **tamamen kalktı** (QuizScreen'de 7 nokta tek satırlık yardımcılara indi). **Kullanıcıya görünür davranış değişmedi.**
  - **Göç:** `App.js` açılışta `normalizeReviewPool()` çağırır. Eski iki şekli de (`{...word, wrongMode}` ve `{...word, word, wrongMode}`) kabul eder, idempotenttir, çözülemeyen/bozuk kaydı atlar (böylece "N bekliyor yazıp Review'da soru çıkmaması" olmaz), sırayı korur. Disk **yalnızca içerik gerçekten değiştiyse** yazılır.
  - **Eklenenler:** `wordRepository.getWordById(id)` (O(1) id → kanonik kelime) + `normalizeReviewPool`, `toCanonicalEntry`, `resolveReviewWord`, `makeReviewEntry`, `filterByMode`, `countForMode`, `addEntry`, `removeEntry`, `getWrongMode`, `isCustomWordId`.
  - **Doğrulama:** yeni `__tests__/reviewPool.test.js` (28 test) — şekil dönüşümü, bozuk kayıtlar, çözümleme kuralı, göç (sıra korunur · görünür içerik değişmez · bayat kopya yerine kanonik metin · idempotentlik · boyut), havuz yardımcıları. Suite: **98 test yeşil**; 5 dosya babel ile parse edildi; `npx expo export --platform android` hatasız.
  - **Commit:** `ea48c61`
- [x] **3.3 Mod/kategori tutarlılığı** — `services/modes.js` oluşturuldu: soru yönlerinin **tek kaynağı**.
  - **Nasıl tek kaynak:** dosyada **tek bir tablo** var (6 satır: `{ mode, category, prompt, answer }`); `MODES`, `CATEGORIES`, `MODE_CATEGORY`, `MODES_BY_CATEGORY`, `MODE_LABELS`, `DEFAULT_MODE` ve tüm yardımcılar **bu tablodan türetilir** → yeni mod eklemek = tek satır. Mod adı (`hanzi-to-pinyin`) artık **hiçbir yerde ayrıştırılmıyor**: `startsWith` / `endsWith` / `includes` ile mod okuma tamamen kalktı, soru/cevap tipi tabloda açıkça durur.
  - **Model:** 3 kategori × 2 yön = 6 mod (kategori = Header'daki sekme). Yardımcılar: `getCategory`, `getCategoryIndex` (sekme indeksi 0–2), `getPromptType` (soruda gösterilen alan), `getAnswerType` (seçilecek alan), `getReverseMode` (sekmeye tekrar basınca yön çevirme), `getHintField` (cevaptan sonra gösterilen üçüncü alan), `FIELD_LABELS`.
  - **Silinen 4 hayalet mod:** `hanzi-to-en`, `en-to-hanzi`, `pinyin-to-en`, `en-to-pinyin` — `statsManager`'daki mod map'inde duruyorlardı ama **hiçbir zaman üretilmiyorlardı**.
  - **Sessiz varsayılan kaldırıldı:** eskiden tanınmayan bir mod istatistikte **sessizce `hanzi_pinyin`** sayılıyordu (fark edilmeden veri bozulması). Şimdi `getCategory()` tanınmayan modda `__DEV__`'de `console.warn` basar ve `null` döner; `statsManager` bu durumda kelime kategorisini **güncellemez** (boş kelime kaydı da açmaz) ama **günlük aktivite ve seri işlenir** → veri kaybı yok.
  - **Birleşen kopyalar:** `statsManager.getCategoryFromMode` (10 modlu map), `Header.getModeIndex` (aynı eşlemenin kopyası) + 3 sekme etiketi ternary'si, `QuestionCard`'daki üç ayrı mod ayrıştırma bloğu (`renderPrompt` / `renderOptionContent` / `renderMissingInfo`), `QuizScreen.getSubText` (`endsWith`), `StatsModal`'daki elle yazılmış 3 kategori anahtarı. Ayrıca `DEFAULT_MODE` artık `reviewPool`'dan değil `modes.js`'ten geliyor.
  - **Ayrıca (aynı dosyada kopya temizliği):** Header'daki 3 kopyala-yapıştır sekme bloğu tek `CATEGORIES.map(...)` döngüsüne indi — **aynı JSX, aynı davranış**.
  - **Ölü veri alanı silindi:** `wordStats[wordId].level` (ayrıntı §8).
  - **Doğrulama:** yeni `__tests__/modes.test.js` (**17 test**: tablo bütünlüğü, hayalet modlar, kategori/sekme indeksi, `getReverseMode` involüsyonu, kategori↔alan tutarlılığı, sekme etiketi türetimi, ipucu alanı, `__DEV__` uyarısı) + `statsManager.test.js`'e "tanınmayan mod" testi. Suite **115 test yeşil** (98 → 115) · `npm run tsc` **0 hata** · lint **0 hata / 14 uyarı** (değişmedi) · `npx expo export --platform android` hatasız · kodda mod string'i yalnızca `services/modes.js`'te kaldı (doğrulandı).
  - **Commit:** `ef10c3a`
- [x] **3.4a AGENTS.md + ESLint:** `AGENTS.md` gerçek yapıya göre **yeniden yazıldı** — Expo Router/`src/app` iddiası kaldırıldı (React Navigation **Stack**, ekranlar `screens/`), test/lint komutları, `services/` tek-kaynak listesi, jest'in **ekranları kapsamadığı** uyarısı + babel parse önerisi, git/`known-good`/yedek akışı eklendi. ESLint kuruldu (ayrıntı: §2). **Doğrulama:** `npm run lint` → **0 hata** (25 uyarı), `npm test` → **98/98**, `npx expo-doctor` → **21/21** (git PATH'te değilse `.expo` kontrolü sahte hata verir — 19/21 görünür).
- [x] **3.4b `tsconfig` + tip denetimi** — karar: **`allowJs` + `checkJs` ile gerçek denetim**, ama `strict`/`noImplicitAny` kapalı (yukarıda §2'de ölçümler ve gerekçeler var). `npx expo customize tsconfig.json` ile üretildi; `tsc` script'i eklendi; `typescript` + `@types/react` `devDependencies`'e taşındı.
  - **Ölçüm (kararın dayanağı):** `checkJs` **kapalıyken** `tsc --noEmit` → **0 hata** ama bozuk import'u/sözdizimini bile yakalamıyor (sözdizimini ESLint ve Babel zaten yakalıyor) = "yeşil ama anlamsız". `checkJs` **açık + `noImplicitAny` kapalı** → **10 hata**. `checkJs` + `noImplicitAny` açık → **528 hata** (161'i `implicit any`, 331'i test dosyalarında jest global'leri) = orantısız.
  - **Kapının bulduğu gerçek hatalar (hepsi düzeltildi):**
    1. `components/CustomDeckModal.js` → `fontFamily: 'Platform' === 'ios' ? ...` — **iki string literal** karşılaştırılıyordu, sonuç her zaman `false` → kod bloğu fontu iOS'ta da `monospace` kalıyordu; `Platform` **import bile edilmemişti**. Artık `Platform.OS === 'ios'`.
    2. `components/FloatingBackground.js` → `StyleSheet.absoluteFillObject` **RN 0.86'da artık yok** (JS kaynağında ve tiplerde doğrulandı; yerine `absoluteFill` geçmiş, ikisi de aynı nesne) → stil `undefined` kalıyordu. Görünür semptom **yoktu** (partiküller `left:0/top:0` + piksel `translate` kullandığı için), yani gizli/istikrar hatasıydı.
    3. `screens/QuizScreen.js` → Header'a `onBackPress` geçiliyordu ama `Header` bu prop'u **hiç kabul etmiyor** (ölü prop, kaldırıldı). Ek bulgu: Header'ın `onSelectLevel`/`onToggleMode` alternatifleri de **hiçbir çağrıda geçmiyor** — Header yalnızca `QuizScreen`'de kullanılıyor ve o da yalnızca `setLevel`/`setMode` veriyor.
  - **Tip sözleşmesi düzeltmeleri (davranış değişmedi):** `Header` ve `QuizScreen` prop'ları JSDoc ile gerçeğe uygun yazıldı (`Header`: ikili prop adları opsiyonel, `level` zorunlu; `QuizScreen`: `setReviewPool` güncelleyici tipi — eski `() => {}` varsayılanı `tsc`'de "0 argüman bekliyor" hatası veriyordu, yani varsayılan **sessizce güncelleme yutardı**); `QuestionCard`'da `Animated` `transform` dizisi koşullu doldurmaya çevrildi (birleşim tipi çıkarımı RN tipiyle çakışıyordu); `App.js`'te `Stack.Navigator`'a `id="root"` eklendi (**@react-navigation v7 tip tanımları `id`'yi zorunlu tutuyor**, çalışma zamanında opsiyonel ve uygulamada kullanılmıyor — `navigation.getParent(id)` dışında anlamı yok); test mock'u `jest.Mock`'a çevrildi ve `global.fetch` → `globalThis.fetch`.
  - **Doğrulama:** `npm run tsc` **0 hata** · `npm test` **98/98** · `npm run lint` **0 hata / 14 uyarı** (değişmedi) · `npx expo export --platform android` hatasız (2,9 MB bundle) · `git status` temiz.
  - **Commit'ler:** `93529ef` (CustomDeckModal), `d0ef5dd` (FloatingBackground), `0c758c1` (QuizScreen), `5459fa8` (diğer tip bulguları), `5037e85` (tsconfig + script + devDeps).
  - **Cihaz kontrolü bekliyor:** `QuestionCard`'daki animasyon dizisi ve `FloatingBackground` kapsayıcısı değişti (ikisi de davranış korunarak). Cihazda onaylanana kadar `known-good` ilerletilmedi.
- [x] **3.5 Bağımlılık/ölü kod temizliği:** kaldırılan **bağımlılıklar** (hiçbiri kaynakta import edilmiyordu): `@react-navigation/native-stack`, `expo-notifications`, `expo-status-bar`, `expo-file-system`.
  - `expo-file-system` aslında **`expo` paketinin kendi bağımlılığı** → `node_modules`'ta kalır (kanıt: `npm ls expo-file-system` → `expo@57.0.29 └── expo-file-system@57.0.7`); bizim doğrudan listelememiz gereksizdi.
  - **Sakın kaldırma:** `react-native-gesture-handler` ve `react-native-screens` import edilmese de `@react-navigation/stack`'in **peerDependency**'sidir (kurulu pakette doğrulandı: `>= 2.0.0` / `>= 4.0.0`) → kaldırılırsa uygulama çöker. `jest-expo` de `package.json` → `"preset": "jest-expo"` ile kullanılıyor (import edilmediği için "kullanılmıyor" gibi görünür).
  - **Ölü kod / dosya:** `words.json` (90 kayıt; hiçbir gerçek referans yok — testte geçen `hsk.1.words.json` yalnızca bir dosya-adı metni), `assets/splash-icon.png` (`app.json`'da splash yapılandırması yok; özel splash istenirse git geçmişinden geri alınır), `App.js` `isLoaded` state'i (yazılıyor, **hiç okunmuyordu** → boşalan `finally` bloğu da kalktı), `Header.js` `Dimensions` importu, `importService.js`'te kullanılmayan `catch (e)` bağlaması (`catch {`).
  - **Ayrıca:** `CustomDeckModal`'daki 8 kaçırılmamış `"` JSX metni `&quot;` yapıldı → `react/no-unescaped-entities` kuralı **varsayılana (error)** döndürüldü.
  - **Doğrulama:** lint **0 hata / 14 uyarı** (kalanlar yalnızca bilinçli kabul edilen `exhaustive-deps` ×7 + `set-state-in-effect` ×7), `npm test` **98/98**, değişen 4 dosya babel ile parse edildi, `npx expo export --platform android` hatasız (2,9 MB bundle), `npx expo-doctor` **21/21**.
  - **Cihaz kontrolü gerekiyor:** kaldırılan paketler Expo Go'da zaten gömülü olduğu için beklenen etki yok, ama yine de bir kez açılıp 6 modda soru çözülmeli (özellikle özel deste içe aktarma — `expo-document-picker` duruyor).
- [x] **3.6a Özel deste: sessiz üzerine yazma + kelime id çakışması** — `importService.saveCustomDeck` artık üç durumu ayırıyor.
  - **Bildirim, sistem `Alert`'i değil temalı bir ekran (`0888d2b`):** üzerine yazma onayı ve id çakışması mesajı modalın kendi içinde, silme onayıyla **aynı kalıpta** çiziliyor (`saveNotice` state'i + `confirmContainer`/`confirmDesc`/`confirmActions`/`cancelBtn`). Üzerine yazmada başlık amber (`warnConfirmTitle`) ve butonlar **Cancel / Replace**; id çakışmasında tek **OK** butonu var. Kırmızı (`confirmTitle`/`deleteConfirmBtn`) yalnızca silmeye ayrıldı → "silme" ile "kaydetmeye devam" görsel olarak ayrışıyor. `saveNotice` yalnızca `pendingDeck` varken kurulabildiği için alttaki "+ Import JSON Deck" düğmesi ve rehber bağlantısı kendiliğinden gizli kalıyor. (Import Error / Invalid Name / Save Error gibi **eski** `Alert`'ler bilerek kapsam dışı.)
  - **Sessiz üzerine yazma kaldırıldı:** aynı adla bir deste varsa kayıt yapılmaz, `{ reason: 'exists' }` döner; `CustomDeckModal` onay ister ve yalnızca onaydan sonra `{ overwrite: true }` ile tekrar çağırır. Buton artık parametresiz `handleConfirmSave()` sarmalayıcısını çağırıyor → `onPress` olay nesnesi yanlışlıkla `overwrite` sayılıp onayın atlanması imkânsız.
  - **id çakışması engellendi:** id şeması `custom_<önek>_<item.id ?? index>`, önek = adın alfanümerik olmayan karakterlerinin `_` olması. Bu yüzden **iki farklı ad aynı öneki üretebiliyor** (`Ders 1` ↔ `Ders_1`; Latin dışı adlarda daha kötüsü: `中文` ve `汉字` → ikisi de `__`) → iki deste **aynı kelime id'lerini** paylaşıp istatistik/review kayıtlarını karıştırırdı. Artık kayıt öncesi **gerçek id kümesi** karşılaştırılıyor: başka bir deste aynı id'yi üretiyorsa kayıt `{ reason: 'id-conflict', conflictWith }` ile reddedilir ve kullanıcıya farklı ad seçmesi söylenir. Önek değil **fiilen çakışan id** kontrol edildiği için, aynı önekli ama kesişmeyen id'lere sahip desteler yan yana yaşayabilir.
  - **Neden id şeması değiştirilmedi:** id'ler diskteki kayıtların kimliğidir; önek kuralı değişirse mevcut destelerin id'leri de değişir ve o destelere ait review-pool kayıtları (`wordId` ile aranır) **çözülemez hale gelip sessizce düşer**. Bu yüzden şema sabit tutuldu ve çakışma engellendi; ileride göç yazılırsa "anahtar = sanitize ad" birleştirmesi yapılabilir.
  - **Ek sağlamlaştırma:** `item.id` yalnızca sayı ya da **boş olmayan** metin ise kullanılır, aksi halde indekse düşer (yoksa id'si boş olan kelimeler `custom_X_` id'sini paylaşırdı). Ad `trim()` edilir, boş ad reddedilir. Kuralı test edilebilir kılmak için `getDeckIdPrefix()` dışa açıldı.
  - **Eklenen testler (7):** onay olmadan üzerine yazmama, `overwrite: true` ile yazma (önek aynı kaldığı için geçmiş korunur), boş ad reddi, id çakışmasının reddi, aynı önek + çakışmayan id'lerin birlikte yaşaması, boş/geçersiz id'nin indekse düşmesi, önek kuralı. Suite **122 test yeşil** (115 → 122) · `tsc` **0 hata** · lint **0 hata / 14 uyarı** · `npx expo export` hatasız.
  - **Commit'ler:** `1602fcb` (servis + testler) · `0888d2b` (temalı bildirim ekranı)
- [x] **3.6b Özel desteler istatistikte** — teşhis: özel kelimeler `wordStats`'a **zaten yazılıyordu** (`QuizScreen` `wordId: currentWord.id` = `custom_...` geçiyor); eksik olan yalnızca **gösterimdi**.
  - **`StatsModal` artık özel desteleri de okuyor:** `getStats()` ile birlikte `getCustomDecks()` çekiliyor (`Promise.all`, aynı açılış animasyonunun içinde).
  - **Yeni bölüm `CUSTOM DECKS (3 STREAKS IN ALL MODES)`:** HSK satırlarıyla **aynı** kuralla deste başına bir ustalık satırı (ad + `x/y (%)` + teal `#0F766E` çubuk). Deste yoksa bölüm hiç çizilmez. Satır işaretlemesi tek yerde üretiliyor (`renderMasteryRow`) → HSK ve özel deste satırları görsel olarak ayrışamaz. *(Sonradan `37ab3dd` ile ayrı bölüm başlığı olmaktan çıkarıldı: aynı listede bölüm içi ayraç oldu — aşağıya bakınız.)*
  - **"Sorunlu kelimeler" artık HSK sözlüğü + özel deste kelimelerinin birleşimi** (`[...ALL_WORDS, ...customWords]`); düzleştirme `concat` ile yapıldı (motor uyumluluğu için `flatMap`'e gerek yok).
  - **Ustalık kuralları `services/statsManager.js`'e taşındı** (`MASTERY_STREAK`, `isMastered`, `isProblematic`, `getMastery(pool, wordStats)`): kural bileşenin içine gömülüydü, yani **hiç test edilmiyordu** (jest yalnızca `services/`'i çalıştırır). Artık tek kaynak ve test edilebilir; `StatsModal`'daki `CATEGORIES` importu gereksiz kaldığı için kaldırıldı.
  - **Küçük düzeltme:** uzun deste adları sayaç metnini dışarı itmesin diye `masteryName`'e `flex: 1` + `numberOfLines={1}` verildi.
  - **Eklenen testler (8):** `isMastered` (üç kategori şartı · geride kalan tek kategori · eksik/boş kayıt), `isProblematic` (tek kategoride 3 yanlış · 2 yanlış · kayıt yok), `getMastery` (boş havuz · yüzde yuvarlama · **özel destenin metin id'leri**). Suite **130 test yeşil** (122 → 130) · `tsc` **0** · lint **0 hata / 14 uyarı** · `npx expo export` hatasız.
  - **Commit:** `821f2a8`
- [x] **Hata düzeltmesi (kullanıcı cihaz testinde buldu): aynı kelime arka arkaya gelince kart kayboluyor** — `fix(quiz)`.
  - **Belirti:** 5 kelimelik bir destede mod komutu ("Choose the correct pinyin") görünüyor ama **hiç kart gelmiyor**.
  - **Kök neden:** `QuestionCard`'daki sıfırlama effect'inin bağımlılığı `[word?.id]` idi, yani yalnızca **kelime değiştiğinde** çalışıyordu. "Sonraki soruya geç" ise `handleCardPress` ile kartı `translateX: ±width*1.25` **ekranın dışına** kaydırıp `opacity`yi **0** yapıyor. Sıradaki soru aynı kelimeye denk gelirse (`Math.random` ile seçiliyor → 5 kelimede her soruda ~1/5) effect tetiklenmiyor, kart ekran dışında ve görünmez kalıyordu. `QuizScreen`'deki komut satırı yalnızca `currentWord`e baktığı için **çiziliyor**, kart ise mount edilmiş ama görünmez olduğu için **gelmiyordu** — yani hata "veri yok" değil, **bayat animasyon durumu**. Aynı hata HSK seviyelerinde de vardı (1/150), 5 kelimede ise sürekli görülüyordu.
  - **Düzeltme:** `QuizScreen` her soru için artan bir `questionSeq` tutuyor ve `<QuestionCard key={questionSeq} …>` veriyor → React kartı **her soruda sıfırdan kurar**, `Animated.Value`'ler başlangıç değerleriyle doğar. Böylece bayat animasyon durumu **yapı gereği** imkânsız (effect zamanlamasına bağlı değil). `QuestionCard`'daki artık gereksiz sıfırlama effect'i kaldırıldı, yerine sözleşmeyi açıklayan not bırakıldı.
  - **Neden effect'e sayaç vermek yerine `key`:** effect boyamadan **sonra** çalıştığı için kart bir kare boyunca görünmez kalırdı; `key` ile kart doğrudan doğru değerlerle doğar.
  - **Doğrulama:** lint **0 hata / 13 uyarı** (kaldırılan effect'in `exhaustive-deps` uyarısı gitti) · `tsc` **0** · **130 test yeşil** · `expo export` hatasız. Bu bir animasyon/yaşam döngüsü hatası olduğu için **jest kapsamaz** → cihazda doğrulanmalı (bkz. §8).
  - **Commit:** `c3e3032`
- [x] **Ardışık tekrarda aynı kart + istatistikte özel deste gruplaması** (kullanıcı geri bildirimi).
  - **Ardışık tekrar (düzeltme, `2d995c1`):** soru seçimi havuzdan `Math.random` ile yapılıyordu ve **hiçbir kısıt yoktu** → 5 kelimelik bir destede her soruda ~1/5 olasılıkla aynı kelime üst üste geliyordu. Seçim mantığı test edilebilir saf bir yardımcıya taşındı: `quizBuilder.pickWord(pool, previousId)`, havuzda alternatif varsa önceki kelimeyi **eler**; alternatif yoksa (tek kelimelik havuz) mecburen o kelime döner — kilitlenme/sonsuz döngü yok. `QuizScreen` son gösterilen kelimenin id'sini **ref**te tutar (`lastWordIdRef`): state olsaydı `generateQuestion`'ın bağımlılıklarına girip soruyu yeniden üretirdi.
    - **Kapsam notu:** bu "**ardışık** tekrar yok" garantisidir, "tur başına her kelime bir kez" (**shuffle bag**) değildir; o bir oturum kavramı gerektirir ve istenirse ayrı iş olarak yapılır.
    - **Eklenen testler (7):** boş havuz · önceki verilmezse normal rastgele seçim · 2 kelimeli havuzda **asla** önceki gelmez · 5 kelimede önceki elenir, diğerleri eşit şanslı · tek kelimelik havuz · havuzda olmayan önceki id · özel destenin metin id'leri.
  - **İstatistik gruplaması (`37ab3dd`):** `CUSTOM DECKS` ayrı bir `sectionHeader` olduğu için kendi başına bir bölüm gibi duruyordu. Artık **aynı `masteryList`** içinde: HSK satırları → ince ayraç (`masteryDivider`: çizgi + soluk `CUSTOM DECKS` etiketi + çizgi) → özel deste satırları. Yani özel desteler "MASTERY LEVEL" bölümünün **parçası** olarak okunuyor.
  - **Doğrulama:** **137 test yeşil** (130 → 137) · `tsc` **0** · lint **0 hata / 13 uyarı** · `expo export` hatasız. Gruplama değişikliği sunum olduğu için cihazda bakılmalı.
- [x] **Faz 4.6 — `HandwritingModal` isteğine zaman aşımı** (`d9e8b0b`).
  - **Kök neden:** istek bileşenin içinde gömülü `await fetch(...)` ile atılıyordu ve **zaman aşımı yoktu**. `catch` yalnızca hızlı hataları (uçak modu, DNS, HTTP hatası) yakalıyordu; `fetch` **askıda kalırsa** (yakalama portalı, yarım açık bağlantı, çok yavaş ağ) promise hiç sonlanmıyor → `finally` hiç çalışmıyor → `loading` **sonsuza kadar açık** kalıyor, kullanıcı boş bir spinner'a bakıyordu.
  - **Çözüm — istek `services/handwritingService.js`'e taşındı:** `recognizeHandwriting(allPaths, { canvasSize, timeoutMs, fetchImpl })` → `{ candidates, error }`, `error` ∈ `null | 'timeout' | 'network'`. Zaman aşımı **`Promise.race`** ile kuruluyor, yani sonuç **`timeoutMs` (9 sn) içinde garantili**: RN'de `AbortController.abort()`'un isteği her zaman gerçekten iptal etmediği bilinen bir sorun olduğu için tek başına `abort()`'a güvenilmedi (`abort()` yine de en iyi çaba olarak çağrılıyor → bağlantı boşuna açık tutulmuyor). Zamanlayıcı `finally`'de temizleniyor; gövde okuması (`response.json()`) askıda kalırsa da aynı zaman aşımı devreye giriyor.
  - **`fetchImpl` neden parametre:** testler gerçek ağ olmadan "**asla çözülmeyen** istek" ve "gövdesi hiç dönmeyen yanıt" durumlarını kurabilsin diye (jest yalnızca `services/`'i çalıştırır).
  - **Kullanıcıya görünen:** kırmızı uyarı çubuğu artık iki durumu ayırıyor — `⚠️ Timed out (internet slow?)` ve `⚠️ No connection (Internet required)`. Eski davranış (uçak modu → anında uyarı) korunuyor; değişen şey, "askıda kalan" isteğin artık **sonsuz olmaması**. `loading` bileşende de `finally` ile kapanıyor → beklenmeyen bir hatada bile spinner takılı kalmıyor.
  - **`buildInk` dışa açıldı** (API'nin `[[x…],[y…],[]]` biçimi + yuvarlama) ve test ediliyor.
  - **Eklenen testler (14):** `buildInk` (yuvarlama · çok çizgili · boş girdi) · çizim yoksa istek atılmaz · başarılı yanıt + gönderilen gövde ve `signal` · `SUCCESS` olmayan yanıt · adaylar bozuk biçimde (dizi değil) · HTTP 500 · `fetch` reddi · **askıda kalan istek → `timeout`** · **zaman aşımında `signal.aborted`** · `json()` askıda kalırsa · `timeoutMs` ayarlanabilir · yanıt zamanında gelirse zamanlayıcı temizlenir (`jest.getTimerCount() === 0`).
  - **Doğrulama:** **151 test yeşil** (137 → 151) · `tsc` **0** · lint **0 hata / 13 uyarı** · `expo export` hatasız.
- [x] **Faz 4.1 — `StatsModal`: veriyi beklemeden açılma + hesaplamaların memoize edilmesi** (`593cc0d`).
  - **Kök neden (gecikme "flicker"):** `Animated.parallel(...)` yalnızca `Promise.all([getStats(), getCustomDecks()])` çözüldüğünde çağrılıyordu ve veri gelene kadar bileşen `return null` yapıyordu → **Modal veri okunana kadar hiç mount edilmiyordu**. Disk yavaşladıkça (çok istatistik/deste) "İstatistik"e basmak **işlemiyor gibi** görünüyordu.
  - **Kök neden (boşa iş):** türetilmiş her şey (`getMastery` × 6 + deste başına bir kez, 2.500 kelimelik "sorunlu kelime" taraması, 7 günlük liste, aylık takvim ızgarası) **her render'da** yeniden hesaplanıyordu. Takvimde bir güne dokunmak (`setSelectedDay`) bile bu işin tamamını tekrarlatıyordu.
  - **Çözüm:** (1) animasyon **veriden bağımsız** başlar → kart anında belirir; (2) açılışta `setStatsData(null)` ile **bayat veri temizlenir** (kart hemen göründüğü için eski sayılar bir an görünüp değişebilirdi) ve yerine küçük bir `Loading…` satırı çizilir (`loadingBox`; kartın boyu zıplamasın diye `minHeight`); (3) tüm ağır hesaplamalar `useMemo` — `wordStats`/`dailyStats` referansları da memoize edilir, çünkü `|| {}` her render'da yeni nesne üretip memoizasyonu boşuna kılardı; (4) modal veri yüklenirken kapanırsa state yazılmasın diye `cancelled` bayrağı.
  - **Yapı değişikliği:** `if (!statsData) return null` kaldırıldı → hook sırası artık koşulsuz; bileşen her zaman mount, içerik yalnızca taze veri varken çizilir.
  - **Doğrulama:** **151 test yeşil** · `tsc` **0** · `expo export` hatasız · lint **0 hata / 13 uyarı** (yeni `useMemo`lar 5 yeni `exhaustive-deps` uyarısı doğurdu — "referansı memoize et" — bu düzeltmeyle kapatıldı, sayı yine 13). Ek olarak **geçici bir render kontrolü** (`react-test-renderer`, commit edilmedi): yükleme→içerik akışı ve kapat/aç döngüsü gerçekten çizildi.
- **Bilinen sınırlama (3.6a dışında bırakıldı):** id'siz bir JSON düzenlenip yeniden içe aktarılırsa (araya kelime ekleme/silme) indeks tabanlı id'ler **kayar** → o destenin eski istatistik/review kayıtları başka kelimelere denk gelebilir. İçerik tabanlı id'ye geçmek göç gerektirir.

---

## 7. Faz 4 — Performans / UX

- [x] **4.1** `StatsModal`: veri yüklenirken `null` dönme (flicker); hesaplamaları `useMemo` → **`593cc0d`**.
- [ ] **4.2** `services/quizBuilder.js` / `QuizScreen`: havuz kopyalama + karıştırmayı önbelleğe al veya örnekleme (O(k)) ile değiştir — şu an her soruda seçilen havuz kopyalanıp karıştırılıyor.
- [ ] **4.3** `FloatingBackground`: `while` döngüsüne maksimum deneme; `Dimensions` değişimini dinle.
- [ ] **4.4** Quiz oturumu: soru sayısı/bitiş ekranı, skor sıfırlama, ilerleme göstergesi.
- [ ] **4.5** Erişilebilirlik: `accessibilityRole/Label`.
- [x] **4.6** `HandwritingModal`: fetch zaman aşımı → **`d9e8b0b`** (istek `services/handwritingService.js`'e taşındı, `Promise.race` + `abort()`).

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
- **Cihaz testi ✅ YAPILDI** (kullanıcı, Expo Go): **Faz 3.4b + 3.3 + 3.6a** sorunsuz — `known-good` = **`cd0713c`**.
  - Doğrulananlar: `FloatingBackground` / `QuestionCard` animasyonları, ekran geçişleri (`id="root"`), özel deste aktarma + **aynı adla aktarmada temalı onay ekranı** (Cancel içeriği değiştirmiyor, Replace değiştiriyor) + kırmızı silme onayı, Header'ın 3 sekmesi (yön çevirme dahil), 6 modda soru/şık/ipucu alanları.
- **Cihaz testi (Faz 3.6b: özel desteler istatistikte) ⏳ BEKLİYOR** — geri dönüş gerekirse `known-good` = **`cd0713c`**. Kontrol listesi:
  1. En az bir özel deste aktar, birkaç sorusunu çöz (hem doğru hem yanlış).
  2. İstatistik ekranını aç → **`MASTERY LEVEL`** bölümünün *içinde*, HSK satırlarının altında ince bir ayraç + soluk **`CUSTOM DECKS`** etiketi ve altında deste satırları (ad + `x/y (%)` + teal çubuk) görünsün. **Ayrı bir bölüm başlığı gibi durmamalı**; hiç özel deste yoksa ayraç da hiç çizilmemeli.
  3. Bir kelimeyi 3 kez yanlış yap → aynı kelime **`PROBLEMATIC WORDS`** listesinde görünsün (HSK kelimeleriyle aynı listede).
  4. Bir kelimeyi üç kategoride de (üç farklı mod yönünde) üst üste 3 kez doğru bil → o destenin yüzdesi artsın.
  5. Uzun adlı bir deste (30 karakter) → ustalık satırında ad tek satırda kısalsın, `x/y (%)` sayacı sağda dursun.
  6. HSK mastery satırları ve aktivite takvimi eskisi gibi çalışsın (regresyon yok).
- **Cihaz testi (kart hatası düzeltmesi, `c3e3032`) ⏳ BEKLİYOR** — aynı turda bakılabilir:
  1. **Küçük bir havuz** seç (5–6 kelimelik özel deste) ve arka arkaya ~20 soru cevapla: **aynı kelime üst üste geldiğinde bile kart her seferinde gelmeli** (komut satırıyla birlikte).
  2. Şık seçince kayma, kartın üstüne dokununca ekrandan kayıp yeni sorunun gelmesi eskisi gibi akıcı olsun.
  3. Doğru/yanlış animasyonları (yeşil büyüme / kırmızı sarsılma) hâlâ çalışsın.
  4. **Aynı kart art arda gelmemeli** (`2d995c1`): 5 kelimelik destede üst üste sorularda kelime değişmeli. (Havuzda tek kelime kaldıysa — örn. review'da 1 yanlış — tekrar normaldir.)
- **Cihaz testi (Faz 4.6: el yazısı zaman aşımı, `d9e8b0b`) ⏳ BEKLİYOR:**
  1. Sözlükte el yazısı modalını aç, **uçak modunda** bir karakter çiz → kırmızı uyarı çubuğu hızlıca gelmeli (`⚠️ No connection (Internet required)`) ve **spinner durmalı** (bu davranış eskisiyle aynı, regresyon kontrolü).
  2. Çevrimiçi bir karakter çiz → adaylar eskisi gibi gelmeli; adaya dokununca kelime aramaya yazılmalı, `Undo`/`🗑 Clear` çalışmalı.
  3. *(Zorlukla tekrarlanır)* Çok yavaş bir bağlantıda çizim → yaklaşık **9 saniye** içinde `⚠️ Timed out (internet slow?)` gelmeli; eskiden bu durumda spinner **sonsuza kadar** dönüyordu. Bu yol asıl olarak jest testiyle kanıtlanıyor (`__tests__/handwritingService.test.js`: "asla çözülmeyen istek → timeout").
- **Cihaz testi (Faz 4.1: istatistik modalı, `593cc0d`) ⏳ BEKLİYOR:**
  1. İstatistik ikonuna bas → kart **anında** (gecikmesiz) belirmeli, içeriği veri gelince doldurmalı. Çok kısa bir `Loading…` satırı görülebilir (normal).
  2. Art arda aç/kapa → **eski sayılar bir an görünüp değişmemeli** (bayat veri yok).
  3. Takvimde günlere ve aylara dokun → geçişler akıcı olsun; aynı güne tekrar dokunmak seçimi kaldırsın; gelecek ay butonu devre dışı kalsın.
  4. Diğer bölümler (streak, mastery + `CUSTOM DECKS` ayracı, 7 günlük liste, `PROBLEMATIC WORDS`) eskisi gibi görünsün; ✕ / arka tuş / karartılmış alana dokunma kapatma animasyonuyla çalışsın.
- **Bileşenler için otomatik test yok** (jest yalnızca `services/`'i çalıştırır). Faz 4.1'de `react-test-renderer` ile **geçici** bir render kontrolü yapıldı (yükleme→içerik + aç/kapa) ve dosya silindi — `react-test-renderer` bildirilmiş bir bağımlılık değil ve React 19'da kullanımdan kaldırıldı. Kalıcı istatistiksel kontrol istenirse `@testing-library/react-native` bilinçli olarak eklenip birkaç ekran için duman testi yazılabilir (ayrı karar).
- **Ölü prop adları** (Faz 3.4b'de `tsc` sayesinde bulundu, temizlik adayı): `Header` iki prop adı çiftini destekliyor (`setLevel`/`onSelectLevel`, `setMode`/`onToggleMode`) ama `onSelectLevel`/`onToggleMode` **hiçbir çağrıda geçmiyor** (Header yalnızca `QuizScreen`'de kullanılıyor; o da `setX` biçimini veriyor). Tek biçime indirilebilir.
- **`wordStats[].level` alanı SİLİNDİ (Faz 3.3, `ef10c3a`)** — iki sorunluydu: (1) **hiç okunmuyordu** (`StatsModal` yalnızca `categories` kullanır), (2) **yanlış veri** tutuyordu: `QuizScreen` oturumun seviyesini geçiyordu, yani değer `hsk1` değil `'review'` / `'mixed'` / `'custom_X'` olabiliyordu. Bir kelimenin gerçek seviyesi gerekiyorsa **tek kaynak** `wordRepository.getLevelFromWordId(id)`. Diskteki eski kayıtlarda alan duruyor ama artık yazılmıyor ve hiçbir yerde okunmuyor (zararsız); göç gerekmez.
- `hsk5.json` kayıtlarında `level` alanı yok (hsk1–4'te var) — veri modeli tutarsızlığı (düşük öncelik). Seviye tespiti bu yüzden `id` aralığından yapılıyor (§5, 2.4).
- **`hsk5.json`'da 17 ikiz kayıt** var (aynı hanzi iki kez, farklı id): 2'si birebir aynı (`财产` 1237/2002, `插` 1242/2024), 15'i yalnızca anlam yazımı farklı (`包含` 1206/1889). Kod artık bu ikizleri şık olarak göstermiyor ama istatistikler iki ayrı id'de birikiyor; veri temizliği ayrı bir iş.
- ~~`exampleService` ile `QuizScreen`'deki `id`→seviye aralıkları **iki yerde tekrar ediyor**~~ → **ÇÖZÜLDÜ (Faz 3.1, `816cb2f`)**: aralıklar artık yalnızca `services/wordRepository.js` içinde.
- **`reviewPool` göçü TEK YÖNLÜ (Faz 3.2, `ea48c61`)** — `@hsk_review_pool` artık `{ wordId, wrongMode [, snapshot] }` saklar. 3.2 öncesi bir sürüme dönülürse eski kod bu şekli okuyamaz (`item.word || item` boş kelime üretir). Geri dönüş gerekirse `@hsk_review_pool` temizlenmeli (o ana kadar biriken yanlışlar gider); dönmeden önce `known-good` etiketinin hangi commit'te olduğuna bak.
- **`HandwritingModal` harici Google `inputtools` servisine bağımlı** (çevrimdışı → `⚠️ No connection` uyarısı). İstek artık `services/handwritingService.js` üzerinden gidiyor ve **9 sn'lik garantili zaman aşımı** var (`⚠️ Timed out (internet slow?)`): yavaş/askıda kalan bağlantıda spinner sonsuza kadar dönmüyor. Hizmet kapanırsa/sözleşmesi değişirse tek dokunulacak yer bu servis.

---

## 9. Yeni oturumda nasıl devam edilir

1. Bu dosyayı oku (`NOTES.md`).
2. `git log --oneline` ve `git status` ile durumu doğrula.
3. Çalışılacak maddeyi seç (kural: **her düzeltme ayrı commit**, mesajı açıklayıcı).
4. Bitince: doğrula (`npm test`, `npm run lint`, `npm run tsc`, varsa Babel parse) → commit → bu dosyadaki ilgili kutuyu işaretle ve "Son güncelleme" satırını değiştir.
5. Bir şey ters giderse: `git reset --hard known-good` (veya ilgili commit'i `git revert`).
