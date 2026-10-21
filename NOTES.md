# NOTES — HanyuPick Geliştirme Notları

Bu dosya, projede nerede kaldığımızı ve sıradaki adımları kaydeder.
Yeni bir oturumda/oturumda çalışmaya başlarken **önce bu dosyayı**, sonra `git log`'u oku.

> **İsimler:** uygulama **HanyuPick** · git deposu **`olcanaskar/hanyupick`** · EAS projesi **`@olcanaskar/hanyupick`** (GitHub ve Expo hesapları aynı adı taşır) · **yerel klasör hâlâ `C:\Projects\App\ChineseQuizApp`** (arşiv adları klasörden gelir).

**Faz 25 — v1.1.0 build'i (telefon demo videosu için):** `version` **1.1.0** (+ `package.json`/`package-lock.json` kök sürümü); `preview` profiliyle EAS build `8b4838b3-5706-437b-830e-dda8d13fb9ce` (commit `8c23167`, `versionCode 1`) alındı, APK **`v1.1.0` GitHub release'ine** `hanyupick-1.1.0.apk` olarak eklendi → https://github.com/olcanaskar/hanyupick/releases/tag/v1.1.0. Neden: Faz 22 (TypeScript), Faz 23 (ABOUT: *Developed by Olcan Askar*) ve Faz 24 (web) yayımdaki `v1.0.0` APK'sında **yoktu**; ABOUT/splash native olduğu için Expo Go'da da görünmüyor. Kontroller: lint 0 hata (14 uyarı) · `tsc` 0 hata · 247/247 test. Ayrıntı §30.

Son güncelleme: **Faz 24 — Web istemcisi (Expo'nun web çıktısı)** (ders projesi kriteri *"küçük bir API ya da Expo'nun web çıktısı"*: **API yerine web** seçildi — senkron API'si hesap+sunucu ister ve README'nin "hesap yok, arka uç yok, izleme yok" sözünü bozardı. `react-dom` + `react-native-web` + `@expo/metro-runtime` kuruldu; `app.json`'a `web` kimliği (başlık **HanyuPick — HSK 1-6 Vocabulary Quiz**, `themeColor #FBF5EB`, zemin `#EFE7DA`) eklendi. `App.js` web'de içeriği **ortalanmış, 430 px genişliğinde telefon çerçevesinde** gösteriyor (yerelde ağaç aynen dönüyor, ek View yok). Web'de sessizce kırılan üç yer düzeltildi: **(1)** `react-native-web`'in `Alert`'i bilinçli olarak **boş** → yeni **`services/dialogService.ts`** (`showAlert()`: web'de `window.alert`, yerelde `Alert.alert`) ve `SettingsModal`/`CustomDeckModal`'daki 5 çağrı oradan geçiyor; **(2)** **quiz şıkları web'de tıklanamıyordu** — kartın `TouchableOpacity`'si `disabled={!isAnswered}` yüzünden gerçek bir **`<button disabled>`** olarak çiziliyor, Chromium da devre dışı butonun İÇİNDEKİ butonlara fare olaylarını hiç iletmiyor (pointerdown/up geliyor, mousedown/click gelmiyor) → web'de `disabled={false}` (yerelde değişmedi; `handleCardPress` zaten cevaplanmadan dönüyor); **(3)** `QuestionCard`'daki modül kapsamlı `Dimensions.get('window')` → **`useWindowDimensions()`**. El yazısı "Draw" butonu web'de **gizli** (Google Input Tools'ta CORS + fareyle çizim). Doğrulama **gerçek tarayıcıda** (headless Edge + CDP, görünüm alanı `Emulation.setDeviceMetricsOverride` ile 420×860): Home → Settings/ABOUT ("Developed by Olcan Askar" + sürüm) → HSK 1 quiz → mod sekmesi → şık (Wrong 1 + örnek cümle) → kart (sonraki soru) → Vocabulary (Draw yok, 5000 kelime) — hepsi fareyle geçti. Babel parse ✓ · `tsc` 0 hata · lint 0 hata (14 uyarı) · 247/247 test · web **ve** android export ✓. **Kullanıcı incelemesi (Faz 24b):** pop-up'lar (`settings`, `statistics`, `custom decks`) web'de tüm sekmeyi kaplıyordu → kartlar `maxWidth: 430` (**`components/layout.js` → `WEB_FRAME_WIDTH`**, çerçeveyle tek kaynak) ile hizalandı; quiz'den geri dönülemiyordu → **yalnızca web'de** `←` butonu eklendi (`screens/QuizScreen.js`). **Yayın: EAS Hosting → https://hanyupick.expo.app** (`web.output: "single"`, `eas deploy --prod`; canlı sitede de uçtan uca doğrulandı). Kayıt §28.)

Önceki fazlar (yeniden eskiye):

**Faz 23 — Settings'in en altına "Hakkında" kimlik bloğu (ad, sürüm, lisans)** (ders projesi kriteri *"adının uygulamada görünmesi"*: ayarların zaten var olan **ABOUT** kartına kimlik bloğu eklendi — **HanyuPick** / **Developed by Olcan Askar** / **Version {app.json} · MIT License**, altında mevcut GitHub butonu. Sürüm **`expo-constants`** ile `Constants.expoConfig.version`'dan okunur (`expo-constants ~57.0.22` artık doğrudan bağımlılık; Expo Go'da hazır, native build gerekmez) → sürüm elle yazılmaz, EAS yalnızca `versionCode`/`buildNumber`'ı uzaktan yönetir. Kırmızı palet korundu, kart zaten `ScrollView` içinde. Doğrulama: Babel parse ✓ · `tsc` 0 hata · lint 0 hata (14 uyarı) · 247/247 test · `npx expo export --platform android` ✓. **⏳ cihaz doğrulaması bekliyor** (Settings → ABOUT). Home'a ayrı satır **eklenmedi** (Home bilinçli olarak kaydırmasız). **Bu bölüm yalnızca yeni bir APK'da görünür** — yayımdaki `v1.0.0` APK'sında yoktur; kayıt §27.)
**Faz 22 — TypeScript dönüşümü (mantık modülleri + testler + örnek veriler)** (ders projesi kriteri *"TypeScript migrasyonu — en azından mantık modülleri ve testler"*: `services/` 14 + `__tests__/` 14 + `data/examples/` 6 dosya **`git mv` ile `.ts`'e taşındı** (dosya bazında git geçmişi korundu); `App.js`/`index.js`/`jest.setup.js`/`screens/`/`components/` bilinçli olarak **JS kaldı** ve `checkJs` ile denetlenmeye devam ediyor. Gerçek tipler tek kaynaktan yazıldı: `Word`/`WordId`/`WordLike` + `HskLevel` (`services/wordRepository.ts` — `WordId` artık başka yerde tanımlanmıyor), `MODE_TABLE`'ın `as const`'ından türeyen `QuizMode`/`QuizCategory`/`FieldType` (`services/modes.ts`), istatistik kaydı (`StatsData`/`WordStat`/`WordStatLike`/`CategoryStat`), review kaydı (`ReviewEntry`/`ReviewEntryInput`), el yazısı sonucu, `Settings`, `ExampleRecord`, `CustomDecks`. **Davranış değişmedi**: 247/247 test aynı iddialarla yeşil · lint **0 hata** (14 uyarı) · `tsc` **0 hata** · `npx expo export --platform android` bundle başarılı. Dönüşümün çıkardığı tuzak: **`.ts` dosyalarında JSDoc `@type` assert'leri çalışmaz** → 3 yerde gerçek annotasyon/`as` ile değiştirildi. Dönüşüm öncesi yedek: `ChineseQuizApp-backup-2026-10-19_2030.tar.gz`. **⏳ cihaz doğrulaması bekliyor** (JSX tarafı büyük ölçüde değişmedi). Kayıt §26, sonraki adımlar §29.)
**Faz 21 — mağaza tarzı vitrin görselleri + Statistics'ta örnek ilerleme** (kullanıcı isteği: ham cihaz karelerinde sistem çubukları görünüyordu → `docs/screenshots/*.jpg` artık **telefon çerçeveli, krem zeminli, 汉 HanyuPick rozetli ve tek satır başlıklı** mağaza vitrini; iki Statistics karesine **örnek ilerleme** çizildi — HSK 1/2 **150/150 (100%)**, HSK 3 **150/300 (50%)**, seri **38 Days Streak**, 1–17 Ekim ısı takvimi + 7 günlük şerit aynı günlük veriyi gösterir. Yeni **tek üretici** `tools/generate-store-screenshots.py` (Python + Pillow): sistem çubuklarını sütun sütun temizler, çerçeve/rozet/başlık ekler, tanıtım verisini uygulamanın KENDİ kurallarıyla (`services/statsManager.ts` ustalık + `components/StatsModal.js` renkleri/ölçüleri) çizer; kalibre edilmiş fontlarla yazar. Ham kareler kanıt olarak `docs/screenshots/raw/` altına taşındı, README "çerçeveler mockup + Statistics kareleri örnek veri" notunu taşıyor. **Uygulama koduna dokunulmadı** → cihaz doğrulaması gerekmez; ⏳ §24'teki cihaz kontrolü hâlâ bekliyor. Kayıt §25; kullanıcı görselleri onayladı ve *"known-good'u da sona çek"* dedi → etiket Faz 21 sonuna ilerletildi, tek yedek arşivi tazelendi.)
**Faz 20 — ilk `preview` APK build'i GitHub Release'e yayımlandı (`v1.0.0`)** (build `7f40e0bd` — `preview`/android, **1.0.0 / versionCode 1**, commit `1051b53`, ~10 dk; APK **83,4 MB**, sha256 `cd6acd3a…`; EAS artefakt bağlantısı 31 Ekim'de dolduğu için **kalıcı yol GitHub Release**: `v1.0.0` etiketi + `hanyupick-1.0.0.apk` asset'i — `releases/latest` ve asset bağlantısı **kimliksiz 200** ✓, README'deki indirme rozeti artık çalışıyor. ⚠️ **EAS, Android imzalama anahtarını ve uzak `versionCode`'u PAKET ADINA göre saklar:** önceki build `io.github.olcanasqar.hanyupick` içindi → yeni paket adına **yeni keystore** üretildi, versionCode 1'den başladı; telefondaki eski APK farklı paket **ve** farklı imza olduğu için **elle silinmeli**, Play'e ilk yüklemeden sonra bu anahtar kaybedilirse uygulama bir daha güncellenemez). **⏳ cihazda doğrulanmadı** — Faz 16–18 ile birlikte doğrulanacak; kayıt §24.

**Faz 19 — depo public + açık kaynak vitrini (README, MIT lisansı, CI)** (`fcce135`: **`README.md`** (İngilizce tanıtım: ne/niçin, özellik tablosu, kurulum (Expo Go — native build gerekmez), kontrol komutları, EAS profilleri, ikon üreticisi, proje yapısı, veri kuralları (kelime id'leri kimliktir, özel deste JSON şekli, örnek cümle garantisi), **gizlilik** (cihazdan çıkan tek iki şey: el yazısı için Google Input Tools + sesli okuma için cihazın TTS'i), katkı notları) + **`LICENSE`** (MIT © 2026 Olcan Askar) + **`.github/workflows/ci.yml`** (`npm ci` → lint → tsc → test, Node 22; README'deki CI badge'i ona bakar); depo **public** yapıldı, About açıklaması + 10 topic güncellendi, GitHub lisansı MIT olarak tanıdı · `d1c47d5`: **README'nin ana yolu "APK indir" oldu** (kullanıcı: *"build'i yapınca github'a ekleyeceğiz o yüzden repo'da expo go ile kullanılma kısmına gerek yok, son kullanıcı apk indirip kullanıcak"*): yeni **"Download & install"** bölümü + **Download APK rozeti** → `releases/latest`, Expo Go talimatları **"Building from source"** altına taşındı, Android **7.0+** (`minSdkVersion` 24) yazıldı) · `f40f271`: **README'ye gerçek cihazdan 8 ekran görüntüsü** galerisi eklendi (§23.6). **İlk CI koşusu ✅ başarılı** (`fcce135`); Babel parse ✅ · **247 test yeşil** · lint 0 hata / 14 uyarı · `tsc` 0 hata.

**Faz 18 — ikon karakteri küçültüldü, sabit ~1 sn'lik splash ekranı, GitHub hesabı `olcanasqar` → `olcanaskar`** (`05edc7f`: `tools/generate-icons.py` `GLYPH_SCALE` 0.60 → **0.42** — mürekkep kutusu 603×586 → **423×411** px, güvenli bölge 683 ✓ · `affb4fe`: **splash** — `expo-splash-screen` kuruldu ve `app.json`'da plugin olarak ayarlandı (zemin **`#FBF5EB`** = Home ve `AppTheme` rengi, görsel `assets/splash-icon.png`, `imageWidth` 180, `resizeMode` contain); `App.js` splash'ı **en az 1 sn** tutup 300 ms fade ile gizliyor · `460dd12`: `SettingsModal` bağlantısı yeni hesaba taşındı · `f085820`: paket kimlikleri **`io.github.olcanaskar.hanyupick`**). Babel parse ✅ · **247 test yeşil** · lint 0 hata / 14 uyarı · `tsc` 0 hata · `expo prebuild` splash zeminini `colors.xml`'e yazdı ✓. **⏳ cihazda doğrulanmadı** — splash/ikon/paket kimliği yalnızca bir EAS build'inde görünür; kayıt §22.

**Faz 17 — Ayarlar'daki GitHub bağlantısı standalone APK'da açılmıyordu** (`863b470`: `components/SettingsModal.js` — `Linking.canOpenURL()` ön kontrolü kaldırıldı; Android 11+ paket görünürlüğü o çağrıyı standalone build'de **false** yapıyordu (Expo Go'nun manifest'i `<queries>` bildirdiği için orada çalışıyordu). Artık URL doğrudan `Linking.openURL()` ile açılıyor; olmazsa adres `expo-clipboard` ile panoya kopyalanıp uyarıda gösteriliyor). Babel parse ✅ · **247 test yeşil** · lint 0 hata / 14 uyarı · `tsc` 0 hata. **⏳ cihazda doğrulanmadı** — bu hata Expo Go'da görünmediği için yeni bir `preview` build'i gerekiyor; kayıt §21.

---

## 1. Proje özeti

HSK 1–6 Çince kelime kartlarıyla çalışan Expo/React Native mobil uygulaması — **adı: `HanyuPick`** (paket kimliği **`io.github.olcanaskar.hanyupick`** — Faz 18, §22; Faz 16'da `io.github.olcanasqar.hanyupick` idi, §20; git deposu **`olcanaskar/hanyupick`** — Faz 19'dan beri **public**, MIT lisanslı, README/CI vitrinli (§23), indirilebilir ilk APK **`v1.0.0` GitHub Release'inde** (§24) —, ama **yerel klasör hâlâ `C:\Projects\App\ChineseQuizApp`**).
**5.000 kelimelik** sabit kütüphane (id 1–5000, boşluk yok; **HSK 1–6 resmî Hanban 2012 listeleri** — §10, §9 ve §8), 6 soru yönü, yanlışları tekrar etme (Review),
JSON'dan özel deste içe aktarma, sözlük arama + el yazısı tanıma, istatistik ekranı, ayarlar pop-up'ı (titreşim / ses seviyesi / ilerlemeyi sıfırla / GitHub).

- **Navigasyon:** React Navigation **Stack** (Expo Router DEĞİL — `AGENTS.md` bu konuda yanıltıcı, bkz. Faz 3.4).
- **Giriş:** `index.js` → `App.js`.
- **Ekranlar:** `screens/HomeScreen.js`, `screens/QuizScreen.js`, `screens/VocabularyScreen.js`. (Ayarlar bir **ekran değil**, Home'un sahip olduğu bir pop-up'tır: `components/SettingsModal.js` — Faz 11.)
- **Bileşenler:** `components/` (Header, QuestionCard, ScoreBoard, ExampleBox, StatsModal, **SettingsModal** (Faz 11), CustomDeckModal, HandwritingModal, FloatingBackground).
- **Servisler (hepsi TypeScript — Faz 22, §26):** `services/wordRepository.ts` (**HSK verisinin/seviye eşlemesinin tek kaynağı** + `Word`/`WordId`/`WordLike` tipleri, Faz 3.1), `services/reviewPool.ts` (**yanlış havuzunun tek veri şekli + göç**, Faz 3.2), `services/quizBuilder.ts` (şık üretimi), `services/statsManager.ts`, `services/importService.ts`, `services/exampleService.ts`, `services/dateUtils.ts`, `services/handwritingService.ts`, `services/floatingParticles.ts`, `services/wordIdMigrations.ts` (**kelime id'lerinin tüm göç tabloları** — Faz 4 ikiz birleştirme + Faz 6 hsk5 yeniden dengeleme + Faz 7 hsk1–4 hizalama; fazlar **sürüm sırasıyla** uygulanır, §9, §10), `services/settingsService.ts` (**ayarların tek kaynağı + `@hsk_settings`**, Faz 11), `services/speechService.ts` (**`expo-speech`'e dokunan tek yer** — ses seviyesi ayardan gelir, Faz 11), `services/hapticsService.ts` (**`expo-haptics`'e dokunan tek yer** — kullanıcı ayarı kapalıysa susar, Faz 11). `services/modes.ts` = 6 yönün/kategorinin tek tablosu (+ `QuizMode`/`QuizCategory` tipleri).
- **Veri:** `data/hsk1..6.json` (**5.000 kelime**, id 1–5000 boşluksuz; hsk1–4 = resmî 150/150/300/600, hsk5 = resmî 1300, hsk6 = resmî 2500 — §10, §9, §8), `data/examples/hsk1..6_examples.ts` (id ile anahtarlı örnek cümleler; **hsk1–4 1200/1200** (Faz 8), **hsk5 1300/1300** (Faz 9), **hsk6 2500/2500** (Faz 10) — §13, §12, §11, §10, §9).
- **İkon / varlıklar:** `assets/` içindeki ikonlar **elle düzenlenmez**; `tools/generate-icons.py` (Python + Pillow) tek üreticidir — palet/font değişince betik yeniden çalıştırılır (Faz 15, §19).

### Önemli sabitler / veri akışı

| AsyncStorage anahtarı | İçerik |
|---|---|
| `@hsk_review_pool` | Yanlış yapılan kelimeler (App.js yönetir) |
| `@hsk_user_stats` | `{ wordStats, dailyStats, streak }` |
| `@custom_word_decks` | `{ "Deste Adı": [kelimeler] }` |
| `@hsk_word_id_migration_version` | Uygulanmış id göçü sürümü (kullanıcı ilerlemesi DEĞİL; §9, §10) |
| `@hsk_settings` | `{ haptics, speechVolume }` — kullanıcı ayarları (Faz 11, §14) |

- Navigasyon parametresi: Home → Quiz `{ initialLevel }` (`QuizScreen` `route.params.initialLevel` okur). **Ayarlar bir rota değildir**: Home'daki ⚙️ `SettingsModal`'ı açar (Faz 11).
- DeviceEventEmitter olayları: `onCustomDeckImported`, `onLevelChange`, `onCustomDeckDeleted`, `onProgressReset`, `onSettingsChange` (Faz 11 — `services/settingsService.js` yayar).

---

## 2. Ortam / araç notları

- **Git yeni kuruldu** (winget ile, 2.55.x): `C:\Program Files\Git\cmd\git.exe`.
  - Shell her açılışta PATH'te olmayabilir → komutlardan önce ekle:
    `$env:Path += ";C:\Program Files\Git\cmd"`
- Proje başlangıçta **git deposu değildi**; `git init -b main` ile başlatıldı.
- Git kimliği: `Olcan Askar` / `aabdullaholcan@gmail.com` (global + repo-local).
- **Remote (uzak depo) VAR:** `https://github.com/olcanaskar/hanyupick.git` (**public** — Faz 19'da açıldı; MIT lisanslı, §23. Faz 16'da `olcanasqar/ChineseQuizApp` → `olcanasqar/hanyupick`, Faz 18'de GitHub hesabı `olcanasqar` → `olcanaskar` olarak yeniden adlandırıldı — depo adresi de onu izledi, eski adresler GitHub tarafından bir süre yönlendirilir; yerel `origin` yeni adrese çevrildi ve **2026-10-17'de `git ls-remote origin main` + `git push origin main` ile doğrulandı**). Kimlik: HTTPS + Git Credential Manager (`credential.helper=manager`) — anahtar/token yönetimi yok. **Release'ler:** `v1.0.0` (Faz 20, §24) — `hanyupick-1.0.0.apk`; README'nin "Download APK" rozeti ve *Download & install* bölümü `releases/latest`'e bakar, yani **her yeni build'in buraya bir release olarak eklenmesi** gerekir (§16 kuralı). Push: `git push origin main`; etiket için `git push origin known-good`. **Normalde bunu hook otomatik yapar (aşağıya bak).**
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
- **Yerel arşiv yedek:** `C:\Projects\App\` altında zaman damgalı `ChineseQuizApp-backup-*.tar.gz` (ad **klasörden** gelir; klasör hâlâ `ChineseQuizApp` — en yenisini kullan; **kural: tek arşiv tutulur, yeni alınınca eskisi silinir**). İçerik: `.git` + `known-good` dahil; `node_modules`/`android`/`.expo` hariç. Doğrulama: açıp `git log -1`, `git tag`, `git status` → commit/etiket HEAD ile aynı ve çalışma alanı temiz olmalı.
  - Yeni yedek almak için:
    `tar -czf C:\Projects\App\ChineseQuizApp-backup-<tarih>.tar.gz -C C:\Projects\App --exclude=ChineseQuizApp/node_modules --exclude=ChineseQuizApp/android --exclude=ChineseQuizApp/.expo ChineseQuizApp`
  - **Uyarı:** `C:\Projects\App\backup\` klasöründeki eski elle kopya **bozuk ve eksik** (`data\hsk5.json` 0 bayt, `hsk5_examples.js` yok). Yedek sanılıp güvenilmemeli.
- `android/` ve `ios/` `.gitignore`'da (Expo prebuild çıktısı; elle düzenleme).
- **ESLint VAR (Faz 3.4a):** `eslint` + `eslint-config-expo` (dev) + flat `eslint.config.js` (SDK 53+ düzeni; kaynak: https://docs.expo.dev/guides/using-eslint/). Komut: **`npm run lint`** (= `eslint .`).
  - **`npx expo lint` KULLANILMAZ:** o komut yalnızca `/src`, `/app`, `/components` klasörlerini tarar (Expo Router varsayımı) → bu projede `screens/`, `services/`, `__tests__/`, `App.js` **sessizce atlanır** (18 uyarı gösterir, gerçekte 25 var).
  - Kurulumda: test dosyalarına jest global'leri tanıtıldı (yoksa 330 sahte `no-undef` hatası çıkıyordu); üç kural **bilinçli** gevşetildi — `react-hooks/refs` → **off** (52 yanlış-pozitif: proje RN'in resmî `Animated` ref API'sini kullanıyor, kural bu deseni modelleyemiyor; uzun vadede `react-native`'in `useAnimatedValue()` kancasına geçilirse geri açılabilir), `react-hooks/set-state-in-effect` ve `react/no-unescaped-entities` → **warn**.
  - Güncel durum: **0 hata, 15 uyarı** (8 `set-state-in-effect`, 7 `exhaustive-deps`) — 3.4a'da geçici olarak `warn` yapılan `react/no-unescaped-entities` 3.5'te **error**'a döndürüldü (8 JSX tırnağı kaçırıldı), 3 `no-unused-vars` da 3.5'te temizlendi. (15. uyarı Faz 11'de geldi: `components/SettingsModal.js`'in açılış effect'i `StatsModal` ile aynı `set-state-in-effect` uyarısını veriyor — ikisi de bilinçli, aynı desen.)
  - **npm 11 tuzağı:** `expo install <pkg> --dev` artık `--include=dev` demek; Windows'ta `"--"` ayırıcısı `--dev`'i yutuyor → paketler yanlışlıkla `dependencies`'e düşer (başımıza geldi, elle düzeltildi).
- **`tsconfig.json` VAR (Faz 3.4b)** — `expo customize tsconfig.json` ile üretildi (`expo/tsconfig.base`'i genişletir), komut **`npm run tsc`** (= `tsc --noEmit`). `expo/tsconfig.base` sağlar: `allowJs`, `noEmit` (**kaynak .js üzerine yazma riski yok**), `resolveJsonModule`, `moduleResolution: bundler`, `skipLibCheck`.
  - **Neden `checkJs: true`:** varsayılan (yalnızca `allowJs`) bir `tsc` kapısı **sadece sözdizimini** kontrol eder; ölçüldü — bozuk bir import yolu bile **yakalanmıyor**. `checkJs` açıkken RN/React API'lerine yapılan gerçek çağrı hataları yakalanıyor (3.4b'de tam olarak böyle 3 bulgu çıktı).
  - **Neden `strict: false` + `noImplicitAny: false`:** TS 6 `noImplicitAny`'yi varsayılan olarak **açık** getiriyor; saf JS bir kod tabanında bu **161 `implicit any` hatası** üretiyor (her fonksiyona JSDoc parametresi yazmak gerekir = tam göç işi). Kapıyı "gerçek hataları yakala, anotasyon dilenme" noktasında tutmak için ikisi de kapalı. **Faz 22'de `.ts`'e geçildi ama bu iki bayrak bilerek kapalı bırakıldı** (§26.6) — strict geçiş ayrı bir faz işidir.
  - **`types: ["jest"]`:** TS 6 `@types/*` paketlerini otomatik eklemiyor → bu olmadan test dosyalarında `describe`/`test`/`jest` "bulunamadı" hatası verir. Yeni bir global tip paketi eklenirse buraya da yazılmalı.
  - `include`: `App.js`, `index.js`, `jest.setup.js`, `services/**/*.ts`, `data/examples/**/*.ts`, `screens/**/*.js`, `components/**/*.js`, `__tests__/**/*.ts` (Faz 22'den beri; `data/hsk*.json` import zinciriyle kendiliğinden girer).
  - **Kapının kapsamadığı şeyler:** `data/hsk*.json` içeriğinin şekli, çalışma zamanı (cihaz) davranışı, UI.
  - **Kanıt:** 3.4b'de `checkJs` açıkken 10 hata → 3'ü gerçek hata/ölü kod (`CustomDeckModal` yanlış `Platform` karşılaştırması, `FloatingBackground`'da RN 0.86'da **var olmayan** `StyleSheet.absoluteFillObject`, `QuizScreen`'de Header'ın kabul etmediği ölü `onBackPress` prop'u), kalanı tip sözleşmesi (JSDoc) veya küçük yapı düzeltmesi. Şimdi: **0 hata**.
- **Bağımlılıklar SDK ile tam uyumlu** (`npx expo install --fix`, 2026-10-15). Faz 3.5'te kullanılmayan 4 paket kaldırıldı → güncel doğrudan liste: `@react-native-async-storage/async-storage`, `@react-navigation/native`, `@react-navigation/stack`, `expo`, `expo-clipboard`, `expo-constants` (Faz 23: Hakkında kartındaki sürüm), `expo-document-picker`, `expo-haptics`, `expo-speech`, `react`, `react-native`, `react-native-gesture-handler`, `react-native-safe-area-context`, `react-native-screens`, `react-native-svg`, **`expo-splash-screen`** (Faz 18; splash ekranı — Expo Go'da da hazır geldiği için `expo-dev-client` gerekmedi) (dev: `eslint`, `eslint-config-expo`, `jest`, `jest-expo`, `@types/jest`, `@types/react`, `typescript`). `npx expo-doctor` → **21/21 temiz**; doğrulama: `npm test` **98/98** + `npx expo export --platform android` hatasız.
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
- **Faz 20 (ilk `preview` build + GitHub Release) — depo commit'i YOK:** build `7f40e0bd-caae-4268-b4d4-21a27264e4f8` (`preview`/android · 1.0.0 / versionCode **1** · commit `1051b53` · ~10 dk) ve GitHub tarafında **`v1.0.0` etiketi** + **`hanyupick-1.0.0.apk`** asset'i (release id `415935932`). Etiketi sunucu oluşturdu, yerel depoya `git fetch origin --tags` ile alındı — kod değişmediği için CI'da yeni bir koşu yok (build `1051b53`'ten çıktı).
- **Faz 19 (depo public + README/MIT/CI) commit'i:** `fcce135` (`README.md` + `LICENSE` + `.github/workflows/ci.yml`; ayrıca GitHub API ile depo **public** yapıldı, About açıklaması + 10 topic yazıldı) — **ilk CI koşusu ✅ başarılı**; cihaz doğrulaması gerektirmez (uygulama kodu değişmedi).
- **Faz 18 (ikon boyutu + splash + GitHub hesabı/kimlik) commit'leri:** `05edc7f` (**ikon**: `tools/generate-icons.py` `GLYPH_SCALE` 0.60 → 0.42 + 5 PNG yeniden üretildi) · `affb4fe` (**splash**: `expo-splash-screen` bağımlılığı, `app.json` plugin ayarı, `App.js` min. 1 sn bekleme, `assets/splash-icon.png`) · `460dd12` (`SettingsModal` `REPOSITORY_URL` → `olcanaskar`) · `f085820` (`app.json` paket kimlikleri → `io.github.olcanaskar.hanyupick`) — **⏳ cihaz doğrulaması bekliyor** (ikon/splash/kimlik yalnızca build'de görünür; bkz. §22, §16).
- **Faz 17 (Ayarlar'daki GitHub bağlantısı) commit'i:** `863b470` (`components/SettingsModal.js`: `canOpenURL` ön kontrolü kaldırıldı) — **⏳ cihaz doğrulaması bekliyor** (hata Expo Go'da görünmediği için en az bir yeni `preview` APK gerekir; bkz. §21, §16).
- **Faz 16 (HanyuPick adı + mağaza kimlikleri + `eas.json` + depo taşıma) commit'leri:** `d92efe6` (`app.json`: ad/slug + `android.package`/`ios.bundleIdentifier`) · `bf3e7a2` (`eas.json`) · `972280c` (**EAS projesi bağlandı**: `app.json`'a `owner` + `extra.eas.projectId`, `@olcanaskar/hanyupick`) · `12721ef` (**GitHub deposu yeniden adlandırıldı**: `SettingsModal` `REPOSITORY_URL` + `package.json`/`package-lock.json` adı) — **⏳ cihaz doğrulaması bekliyor** (native alanlar yalnızca EAS build'inde görünür; bkz. §20, §16).
- **Faz 15 (uygulama ikonu) commit'i:** `6ba9312` (`assets/*.png` + `tools/generate-icons.py` + `app.json`) — **⏳ cihaz doğrulaması bekliyor** (Expo Go uygulama ikonunu göstermez; bkz. §19, §16).
- **Faz 14 (İstatistik pop-up'ı: temiz açılış + sığan takvim balonu) commit'leri:** `f5176c7` + `19b097c` (`components/StatsModal.js`) — **cihazda doğrulandı ✅** (2026-10-17; bkz. §18, §16).
- **Faz 13 (hsk1–4'te 6 kaymış örnek düzeltmesi + `expo` 57.0.30) commit'leri:** `5146c40` (`data/examples/hsk1_examples.js`, `hsk3_examples.js`, `hsk4_examples.js` + `__tests__/exampleService.test.js`) · `1692806` (`package.json` + `package-lock.json`: `expo` `~57.0.30`) — **cihazda doğrulandı ✅** (2026-10-17; bkz. §17, §16).
- **Faz 12 (Home kaydırmasız + kırmızı tema + GitHub ikonu) commit'leri:** `ccc7d11` (Home'un dış `ScrollView`'ı → `View`) · `c8e7424` (quiz teması amber → kırmızı: `components/Header.js`, `components/ExampleBox.js`, `components/QuestionCard.js`, `screens/QuizScreen.js`) · `be8bf1a` (sözlük teması amber → kırmızı: `screens/VocabularyScreen.js`) · `c3a644b` (Draw pop-up'ı: `components/HandwritingModal.js`) · `21ede78` (İstatistik pop-up'ı: `components/StatsModal.js`) · `be870a9` (GitHub butonu: emoji → gerçek logo, `components/SettingsModal.js`) — **cihazda doğrulandı ✅** (2026-10-17; bkz. §15, §16).
- **Faz 11 (Ayarlar pop-up'ı) commit'leri:** `54907fb` (`services/settingsService.js` + `__tests__/settingsService.test.js`) · `6379bed` (`services/speechService.js` + `QuestionCard`/`VocabularyScreen`/`QuizScreen` tek noktaya bağlandı + `App.js` açılışta `getSettings()`) · `d962454` (`services/hapticsService.js` + `QuizScreen` kapısı) · `7111834` (ayarlar ekranı + `@react-native-community/slider`) · `f6d4d99` (`StatsModal`'dan reset bölümünün kaldırılması) · `8443912` (`hapticsService`/`speechService` testleri) · `afe51c1` (**ekran → pop-up**: `components/SettingsModal.js`, `screens/SettingsScreen.js` silindi, `Settings` rotası kaldırıldı) — **cihazda doğrulandı ✅** (2026-10-17; bkz. §14, §16).
- **Faz 10 (hsk6 örnek cümleleri, 2500/2500) commit'leri:** 18 batch commit'i (`a36c34b` id 2501–2801 → `37f9307` id 4886–5000; aradaki 9–17: `972bc2d`, `bf9e3ba`, `a035282`, `ee17fea`, `6d6d9f7`, `27d489a`, `bbab9a9`, `53dcfbe`, `b8ec101`) · `e195f8e` (hsk6 **2965** pinyin `uānwǔjié` → `duānwǔjié`) · `8ff35d1` (hsk5 **1774** pinyin `uándàn` → `yuándàn`) · `3ce3529` (`exampleService` testleri + `AGENTS.md` + `NOTES.md`) — **cihazda doğrulandı ✅** (2026-10-17; bkz. §13, §16).
- **Faz 9 (hsk5 eksik örnekler + kaymış/pinyin düzeltmeleri) commit'i:** `b29682f` (638 yeni + 25 düzeltilmiş hsk5 örneği + `exampleService` testleri + `AGENTS.md` + `NOTES.md`) — **cihazda doğrulandı ✅** (2026-10-16; bkz. §12, §16).
- **Faz 8 (hsk1–4 eksik örnekler + 倒 anlamı) commit'leri:** `2fa9a8e` (91 örnek cümle + `exampleService` testleri + `AGENTS.md` + `NOTES.md`) · `d8a5ede` (`data/hsk4.json` #680 **倒** anlamı) — **cihazda doğrulandı ✅** (2026-10-16; bkz. §11, §16).
- **Faz 7 (hsk1–4 resmî liste) commit'i:** `5950ce4` (veri + göç tabloları + **sürüm-farkındalıklı** uygulama + `App.js` + örnekler + testler + `AGENTS.md` + `NOTES.md`) — **cihazda doğrulandı ✅** (2026-10-16; bkz. §10, §16).
- **Faz 6 (hsk5 resmî liste) commit'i:** `b4e8429` (veri + göç tabloları + örnekler + App.js + testler + AGENTS.md) — **cihazda doğrulandı ✅** (2026-10-16; bkz. §9, §16).
- **Faz 5 (HSK 6) commit'leri:** `7d12737` (veri) · `869e8e9` (`level` temizliği) · `07beb1e` (sunum) · `5a15ec3` (repo + testler) · `a3d5f01` ve `b1bbc5a` (doküman) — cihazda **doğrulandı ✅**; `known-good` artık bu doğrulamayı kaydeden doküman commit'inde (doğrulanan kod durumu `b1bbc5a`), yedek `ChineseQuizApp-backup-2026-10-16_1406.tar.gz` (bkz. §8, §9).
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
- **Bilinçli sınırlama:** Eleme **string** eşitliğine dayanır; `"sun, day"` ↔ `"day, sun"` gibi farklı yazılmış eş anlamlılar yakalanmaz (bkz. §16 veri notu).
- **Commit:** `8cfe62e`

> **Faz 2 kapandı.** Sıradaki adım için öneri: Faz 1-2.4 değişikliklerini cihazda bir kez dene (§16'deki kontrol listesi), sonra Faz 3 (mimari) veya Faz 4 (performans).

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
  - **Ölü veri alanı silindi:** `wordStats[wordId].level` (ayrıntı §16).
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
- [x] **Faz 4.2 — `quizBuilder`: şık toplama ve kelime seçimi havuzu kopyalamaz** (`99b3e2a`).
  - **Kök neden:** `collectFromPool` her soruda `shuffle(pool)` çağırıyordu; `shuffle` `[...items]` ile **havuzun tamamını kopyalayıp** Fisher-Yates ile karıştırıyordu. `pickWord` da her soruda `pool.filter(...)` ile havuzun kopyasını çıkarıyordu → soru başına binlerce eleman kopyası (hsk5 seviyesi 1.300; özel deste soruları ve seviyesi bulunamayan inceleme kelimelerinde tek havuz `ALL_WORDS` = 2.500) + çöp toplama baskısı.
  - **Ölçüm (2.000 soru; eski "kopyala+karıştır" yolu vs yeni, geçici `tmp-quizbench.test.js`):** hsk1 (150) **68 µs → 4,4 µs** (%93) · hsk5 (1.300) **556 µs → 4,4 µs** (%99) · `ALL_WORDS` tek havuz (2.500) **1.294 µs → 4,3 µs** (%100) · 2.000 hsk5 sorusu toplam **1.369 ms → 9,9 ms**.
  - **Çözüm:** (1) `collectFromPool` artık **rastgele bir indeksten başlayıp dairesel tarıyor**: tipik durumda ilk birkaç kelimede 3 çeldirici bulunup çıkılır → kopya yok, karıştırma yok, ek bellek O(1). Dairesel olduğu için **garantiler eskisiyle aynı** (tüm havuz görülür, mümkün olan en fazla aday toplanır); değişen tek şey şık seçiminin sırası ("rastgele başlangıç + ilk uygun adaylar" — eskiden tüm uygun adaylar arasından tekdüze seçim). (2) `pickWord` **reddetme ile örnekleme** yapıyor (12 deneme; kabul edilen adaylar üzerinde dağılım tekdüze), yedek olarak kopyasız `find`.
  - **Not:** `shuffle` kaldırılmadı: `buildOptions` dönen 4 şıkkı hâlâ onunla karıştırıyor (4 elemanlık dizi) ve test ediliyor.
  - **Eklenen testler (6 → toplam 157):** Proxy ile **indeks okuma sayan havuz** → 2.500 kelimede 20 soru için toplam okuma < 600 (eski kopyalama yolu 2.500 okurdu, bu testi düşürürdü) · ikiz kayıtlar art arda dizili olsa da dairesel tarama 4 şık bulur (100 tur, çakışma yok) · dar havuzda (3 kelime) eskisi gibi mümkün olan tüm şıklar toplanır (3 şık) · aynı havuz iki kez verilse de şık id'leri tekrar etmez · `Math.random` hep önceki kelimeye denk getirilse bile `pickWord` onu döndürmez (yedek yol) · `pickWord` havuzu değiştirmez.
  - **Doğrulama:** **157 test yeşil** · `tsc` **0** · lint **0 hata / 13 uyarı** · `expo export` hatasız · Babel parse OK.
- [x] **Faz 4.3 — `FloatingBackground`: sınırsız `while` sınırlandı, pencere ölçüsü canlı, matematik servise taşındı** (`1e0831e`).
  - **Kök neden (kilitlenme riski):** hedef seçimi `while (|Δx| < 120 && |Δy| < 120) { yeniden dene }` idi ve **deneme sınırı yoktu**. Adaylar doğuş noktasına yakın çıktıkça döngü dönmeye devam ediyordu; küçük bir pencerede (Android bölünmüş ekran/çoklu pencere) ya da kusurlu bir rastgelelik dizisinde döngünün **çıkış garantisi yoktu** → JS iş parçacığı kilitlenir, arayüz donar ve uygulama kapatılmak zorunda kalır. Test edilemiyordu çünkü rastgelelik `Math.random`'a sabit bağlıydı.
  - **Kök neden (bayat ölçü):** `const { width, height } = Dimensions.get('window')` **modül yüklenirken bir kez** okunuyordu; pencere sonradan değişirse karakterler eski ölçüye göre konumlanıyordu (ekran dışında doğma / hedefin ekran dışına düşmesi).
  - **Çözüm:** geometri ve hareket matematiği yeni `services/floatingParticles.js`'e taşındı (`getRandomBoundaryPoint`, `pickTargetPoint`, `createParticle` + `PARTICLE_COUNT`, `MARGIN`, boyut/hız sınırları) ve **rastgelelik dışarıdan verilebilir** hale geldi (`random = Math.random`). Hedef seçimi artık **en fazla `MAX_TARGET_ATTEMPTS = 12` aday** deniyor; hiçbiri yeterince uzak değilse o ana kadarki **en iyi aday** kullanılıyor → fonksiyon her koşulda sonlu sürede döner (kabul kriteri eskisiyle aynı: iki eksenden en az birinde ≥ 120 px). Bileşen `Dimensions.get` yerine **`useWindowDimensions()`** kullanıyor ve ölçüyü partiküle prop olarak veriyor → yeni doğan karakterler canlı ölçüye göre konumlanır (devam eden bir uçuş bir tur daha eski ölçüyle sürer, sonra kendini düzeltir).
  - **Küçük temizlik:** `createParticle`'ın döndürdüğü kullanılmayan `id` alanı kaldırıldı; yanıltıcı `// 32px - 46px` yorumu gerçek aralıkla (`32..45`) değiştirildi.
  - **Eklenen testler (10 → toplam 167):** kenar ağırlıkları sınır değerlerle (0 / 0,399 / 0,4 / 0,6 / 0,8 / 0,999 → alt-üst-sağ-sol koordinatları) · yeterince uzak ilk aday kullanılır (2 rastgele çağrısı) · **adaylar hep aynı noktaya düşse bile sonlu sayıda denemede döner** (eski sınırsız `while` burada kilitlenirdi; `random()` çağrı sayısı ölçülüyor) · hiçbiri uzak değilse en iyi aday döner · ilk açılışta ekran içine dağılır + hedefi kenarda + `duration = mesafe/hız` tam doğru · sonraki doğuşlar kenardan başlar ve hedef ≥ 120 px · 200 turda boyut 32-45 ve süre aralığı korunur · küçük pencerede + kusurlu rastgelelikte sonlu süre · liste dışı indeks yedek karaktere düşer (çökmez) · `SINGLE_HANZI_WORDS` tek kaynaktan gelir ve hepsi tek karakter.
  - **Doğrulama:** **167 test yeşil** (10 yeni) · `tsc` **0** · lint **0 hata / 13 uyarı** · `expo export` hatasız · geçici bir render kontrolüyle bileşen **18 tek Hanzi** çizdi ve temiz unmount etti (`react-test-renderer`, commit edilmedi).
- [x] **Faz 4.5 — Erişilebilirlik: rol + etiket** (`4bbacf6`).
  - **Neden:** kodda **hiç** `accessibility*` özelliği yoktu. İkon-only butonlar (🔊, ➔, ✕, ‹ ›) ekran okuyucuda **isimsiz** kalıyor, soru kartı/şıklar anlamsız okunuyor, dekoratif 18 yüzen Hanzi ise odaklanabiliyordu.
  - **Kapsam (kullanıcı kararı):** yalnızca `accessibilityRole` + `accessibilityLabel`, **İngilizce** (arayüz diliyle tutarlı: "Statistics", "Correct: 12", "Back"). `accessibilityState`, ipucu ve duyuru katmanı bilinçli olarak kapsam dışı (bkz. sınırlamalar).
  - **Değişen dosyalar (8):** `Header` (3 kategori sekmesi `role="tab"`, seviye butonu, seviye satırları) · `QuestionCard` (kart, hoparlör "Play pronunciation", **şıklar: etiket doğrudan `renderOptionContent(option)` → görünen metnin aynısı**) · `HandwritingModal` (✕ "Close", adaylar "Candidate 日", Undo, Clear) · `CustomDeckModal` (✕, rehber, silme onayı "Delete deck <ad>", üzerine yazma uyarısı Cancel/Replace, deste adı `TextInput` "Deck name", içe aktarma, kopyala) · `StatsModal` (✕, önceki/sonraki ay, **takvim günleri "12 Oct, 3 correct, 1 wrong" / "... no activity"**) · `HomeScreen` (seviye seçici, ➔ "Start quiz: HSK 1", 4 kart) · `VocabularyScreen` (satır hoparlörü "Play pronunciation of 日", geri, aramayı temizle, el yazısı, kategori çipleri) · `FloatingBackground` (`accessibilityElementsHidden` + `importantForAccessibility="no-hide-descendants"` → dekoratif karakterler artık okunmuyor).
  - **Yapı düzeltmesi (iç içe dokunulabilirler):** `TouchableOpacity` **varsayılan olarak bir erişilebilirlik ÖĞESİDİR** (`accessible={this.props.accessible !== false}`, RN 0.86 kaynağında doğrulandı) ve öğe olduğunda **içindeki her şey ekran okuyucudan gizlenir**. `QuestionCard`'da şıklar dış kartın içinde olduğu için ekran okuyucu kullanıcısı **şıkları hiç seçemiyordu**. Çözüm: kart `accessible={isAnswered}` → cevaplanmadan önce şıklar + hoparlör tek tek odaklanabilir; cevaplandıktan sonra kart tek bir "Continue to the next question" öğesi olur (o an şıklar zaten işlevsiz, asıl iş "sonraki soru").
  - **Modallar:** içerik kartlarına `accessibilityViewIsModal={true}` (iOS'ta odak modalla sınırlanır). Karartılmış arka planlar (kapatma alanları) bilinçli olarak etiketlenmedi: kapatma ✕ ve Android geri tuşuyla da yapılabiliyor.
  - **Doğrulama:** `tsc` **0** · lint **0 hata / 13 uyarı** (değişmedi) · **167 test yeşil** · `expo export` hatasız · 8 dosyanın tamamı Babel parse OK · `components/`+`screens/` genelinde **79** `accessibility*` özelliği. Ek olarak **geçici bir render kontrolü** (`react-test-renderer`, commit edilmedi): şık etiketleri `getAnswerType(mode)` ile üretilen görünen metinlerle birebir; dış kart `isAnswered=false` iken `accessible={false}`, `true` iken `true`; kart etiketi doğru öğede.
  - **Tip düzeltmesi (`1894f2b`):** `e98e860` ile eklenen `renderPrompt` içinde `promptStyle`'ın `let promptStyle = styles.promptHanzi` başlangıç ataması `checkJs` altında TS2322 hatası veriyordu (`styles.promptMeaning` 700 ve `styles.promptPinyin` 600 atanamıyordu). Ternary ile union stil tipine (`styles.promptMeaning | styles.promptPinyin | styles.promptHanzi`) geçilerek `npm run tsc` **0 hata**ya döndürüldü.
  - **Sınırlamalar (kapsam dışı bırakıldı):** seçili sekmenin/şıkkın durumu ve **doğru-yanlış geri bildirimi duyurulmuyor** (`accessibilityState` / `announceForAccessibility` yok) · başlıklar `header` rolünde ama başlıklar arası gezinme yok · `ScoreBoard`/`ExampleBox` gibi etkileşimsiz bileşenlere dokunulmadı · modal içinde odak tuzağı (`focus` yönetimi) eklenmedi.
- **Bilinen sınırlama (3.6a dışında bırakıldı):** id'siz bir JSON düzenlenip yeniden içe aktarılırsa (araya kelime ekleme/silme) indeks tabanlı id'ler **kayar** → o destenin eski istatistik/review kayıtları başka kelimelere denk gelebilir. İçerik tabanlı id'ye geçmek göç gerektirir.

---

## 7. Faz 4 — Performans / UX

- [x] **4.1** `StatsModal`: veri yüklenirken `null` dönme (flicker); hesaplamaları `useMemo` → **`593cc0d`**.
- [x] **4.2** `services/quizBuilder.js`: havuz kopyalama + karıştırma kaldırıldı (dairesel tarama + reddetme ile örnekleme) → **`99b3e2a`**.
- [x] **4.3** `FloatingBackground`: hedef seçimindeki sınırsız `while` sınırlandı, pencere ölçüsü canlı (`useWindowDimensions`), matematik `services/floatingParticles.js`'e taşındı → **`1e0831e`**.
- [ ] **4.4** Quiz oturumu: soru sayısı/bitiş ekranı, skor sıfırlama, ilerleme göstergesi.
- [x] **4.5** Erişilebilirlik: rol + etiket (İngilizce) → **`4bbacf6`** (8 dosya, 79 özellik; iç içe `TouchableOpacity` şık gizlemesi düzeltildi). Durum/duyuru katmanı kapsam dışı.
- [x] **4.6** `HandwritingModal`: fetch zaman aşımı → **`d9e8b0b`** (istek `services/handwritingService.js`'e taşındı, `Promise.race` + `abort()`).

### Faz 4 ek temizlikler (kullanıcı seçimi, her biri ayrı commit — cihaz doğrulaması ✅, bkz. §16)

- [x] **A) `Header` ölü prop adları** → **`e0249c4`**. `onSelectLevel`/`onToggleMode` hiçbir çağrıda geçmiyordu (Header yalnızca `QuizScreen`'de, o da `setLevel`/`setMode` veriyor). İkinci biçim kaldırıldı; JSDoc gerekçeyi taşıyor.
- [x] **B) Boş havuzda boş ekran** → **`47a4e7e`**. `QuizScreen` havuz boşsa `currentWord = null` yapıyordu ama boş-durum ekranı **yalnızca `review`** için vardı: özel deste silinirse/boş kalırsa ekran tamamen boş kalıyordu.
  - Eklenenler: `isPoolLoading` bayrağı (özel desteler diskten okunurken "kelime yok" ekranı bir an bile görünmesin; istek sayacı `poolRequestRef` ile yalnızca EN SON isteğin sonucu yazılır), boş-durum ekranı tüm seviyelere genellendi, `services/importService.js`'e `isCustomDeckLevel()` + `CUSTOM_ID_PREFIX` eklendi (`QuizScreen`'deki `startsWith('custom_')` tek kaynağa bağlandı).
  - Not: bu değişiklik `QuizScreen`'de **1 yeni `set-state-in-effect` uyarısı** doğurdu (13 → 14); kural bu projede bilinçli olarak uyarı seviyesinde (bkz. `eslint.config.js`), hata sayısı 0.
- [x] **C) Silinen destenin izleri** → **`9341de4`**. `deleteCustomDeck` yalnızca desteyi siliyordu; o desteye ait `@hsk_user_stats` kayıtları ve `@hsk_review_pool` yanlışları kalıyordu (istatistikte "hayalet" satır / silinmiş kelime "sorunlu kelimeler" listesinde).
  - `deleteCustomDeck` artık silinecek kelime id'lerini **önce** okuyup `{ success, deckName, removedIds }` döner; istatistikleri `statsManager.removeWordStatsByIds` (yazma kuyruğu üzerinden) temizler. Yanlış havuzunun sahibi `App.js` olduğu için `CustomDeckModal` `onCustomDeckDeleted` olayı yayar, `App.js` `reviewPool.removeWordIds` ile temizler ve diske yazar.
  - Eşleşme **tam id listesiyle** yapılır, önek karşılaştırmasıyla DEĞİL: "Ders" destesinin öneki (`custom_Ders_`) "Ders_1" destesinin kelimeleriyle de eşleşirdi (test bunu korur).
  - `removeWordStatsByIds` günlük aktivite/streak'e dokunmaz (onlar kelimeye değil güne bağlı).
- [x] **D) Kalıcı "İlerlemeyi sıfırla"** → **`c53141c`**. `StatsModal`'ın en altında, üst çizgiyle ayrılmış tehlikeli bölge: buton → modalın kendi temasıyla çizilen **iki adımlı onay** (`Alert` kullanılmaz; uygulamanın geri kalanı da uyarıları kendi temasıyla çizer).
  - `statsManager.clearAllStats()` (kelime istatistikleri + günlük aktivite + streak; yazma kuyruğunun SONUNDA çalışır, yani sırada bekleyen bir cevap varsa sıfırlama yine "en son söz" olur) + `onProgressReset` olayı ile `App.js` yanlış havuzunu boşaltır. Modal tazelenir, onay kapanır. **Özel desteler SİLİNMEZ** (yalnızca ilerleme).
- [x] **E) `hsk5.json` 17 ikiz kayıt + id göçü** → **`9044490`**. Aynı hanzi + aynı pinyin ile iki kez bulunan 17 kelime tek kayda indirildi: **küçük id korundu** (liste sırası ve mevcut kayıtlar değişmesin), **anlam metni iki kayıttan daha açıklayıcısı** seçildi (uydurulmadı). 2.500 → **2.483** kayıt; `data/examples/hsk5_examples.js` içindeki 17 ölü örnek de silindi.
  - Silinen id'ler artık veride yok; kullanıcının diskindeki kayıtlar sessizce düşmesin diye **göç** eklendi: yeni `services/wordIdMigrations.js` (`MERGED_WORD_ID_MAP`: 1889→1206, … 2454→1579) + `statsManager.mergeWordStatsIds` (kategori serileri **toplanır**, kayıt hedefte yoksa olduğu gibi taşınır) + `reviewPool.normalizeReviewPool(pool, idMap)` (taşıma **çözümleme filtresinden ÖNCE**; sonra aynı `(wordId, mod)` çifti tekilleşir). İkisi de **idempotent** (yazacak bir şey yoksa diske yazmaz) ve `App.js` açılışında bir kez çalışır.
  - Bilinen ödün: bölünmüş kayıtlarda toplama, araya karışık doğru/yanlış girmişse "kesintisiz seri"yi olduğundan uzun sayabilir (yalnızca 17 kelime; alternatifi veri kaybıydı).
  - Yeni kalıcı testler: seviye içinde **aynı hanzi iki kez geçmez**, id'ler 1..2500 arasında ve **eksikler tam olarak göç tablosundakiler**, göç hedefleri gerçekten veride; `mergeWordStatsIds` (toplama/taşıma/idempotentlik), `normalizeReviewPool` + harita (taşıma, tekilleşme, özel deste kayıtları etkilenmez).
  - Not: `quizBuilder`'ın "ikiz kayıtlarda şıklar temiz" testleri BOZULMADI — seviyeler ARASI hanzi tekrarı bilinçli olarak var (49 grup, örn. 过 hsk2/3/4), test `ALL_WORDS` üzerinden çalışıyor.

---

## 8. Faz 5 — HSK 6 entegrasyonu (TAMAMLANDI — cihazda doğrulandı ✅)

**Kaynak:** `C:\Projects\App\hsk6\HSK-6-Vocabulary.pdf` (MandarinBean, 60 sayfa, tablo: `No. | Chinese | Pinyin | English`). Projeye giren çıktı: **2.500 kelime**.

- **Çıkarım (harici bağımlılık YOK, `7d12737`):** PDF metin tabanlıydı (gömülü DengXian + `ToUnicode` CMap'leri, `Identity-H`). Kendi yazdığımız tek seferlik çıkarıcı PDF nesnelerini ayıkladı, `FlateDecode` akışlarını açtı, **font başına** `bfchar`/`bfrange` eşlemesini uygulayıp `Tf` ile aktif fontu izledi ve `Tm`/`Td` konumlarına göre satır/kolon kurgusunu yeniden kurdu (Çince + tonlu pinyin ayrı fontlardan birleşiyor, örn. `á` + `i`).
  - **Doğrulama:** 2.500 satır, numaralar **1–2.500 kesintisiz**, **çözülemeyen glif 0**, ikiz kayıt yok, boş pinyin yok.
  - Metne sarılan **5 uzun anlam** otomatik birleştirildi (örn. id 4309: "…and the interests of the collectives").
  - Hanzi uzunluğu: 1 karakter **169** · 2 → **2169** · 3 → **46** · 4 → **116** (5+ karakterli deyim yok; ≥4 karakterli 117 deyim var).
- **`7d12737` — `data/hsk6.json`:** id **2501–5000**, biçim hsk5 ile birebir (`{id, hanzi, pinyin, meaning}`, LF, satır başına bir kayıt, sonunda yeni satır yok). İstenen kopya ayrıca **repo dışında** `C:\Projects\App\hsk6\hsk6.json`.
  - **PDF'te English kolonu 5 kelimede BOŞTU** (丙 bǐng, 丁 dīng, 嘿 hēi, 啦 la, 嘛 ma). Bu bir çözümleme eksiği değil: o satırlarda anlam kolonunda **hiç çizim yok** (tamamı `ToUnicode` ile çözüldü, 0 çözülemeyen glif). Uygulamanın "anlam boş olamaz" kuralı (`__tests__/wordRepository.test.js`) ve `meaning` soruları nedeniyle **kullanıcı onayıyla kısa karşılıklar eklendi**: "third/fourth of the ten heavenly stems", "hey", "(sentence-final particle)", "(modal particle)". Bunlar **PDF'ten gelmedi**, tarafımızdan yazıldı.
  - **2 kaynak düzeltmesi** (ikisi de aynı script içinde, NOTES'ta kayıtlı): id **4383** hanzi `喂（叹词）` → `喂` (listenin tek parantezli açıklaması; aksi halde tek "CJK olmayan karakter içeren hanzi" olurdu) · id **3455** anlam `"By (time）"` → `"By (time)"` (uyumsuz kapanış parantezi).
  - Pinyin'de **4 kayıtta boşluk** var (`将就 jiāng jiù`, `侃侃而谈 kǎnkǎn ér tán`, `气质 qì zhì`, `之际 zhī jì`) — **PDF yazımı birebir korundu** (hsk5'te de 5 kayıtta boşluk var, tutarlı).
  - İkiz kayıt olmadığı için **göç (`wordIdMigrations`) gerekmedi**.
- **`869e8e9` — `level` alanı hsk1–4'ten kaldırıldı (tek veri modeli).** Kanıt: alanı **okuyan hiçbir kod yok** (seviye zaten `wordRepository.getLevelFromWordId` ile `id` aralığından çözülür), değerler tutarsızdı (sayı `1..4`, `'hsk1'` bile değil) ve hsk5'te hiç yoktu. Özel destelerin `level: 'custom'` alanı (`importService`, kullanıcı JSON'undan) **etkilenmedi**. Dönüşümde her dosyanın kendi biçimi/satır sonu korundu (hsk3 çok satırlı; kaldırma sırasında `meaning` satırının sonundaki virgül de düşürüldü); tüm dosyalar JSON parse + alan-alan karşılaştırma ile doğrulandı.
- **`07beb1e` — HSK 6 sunumu:** `screens/HomeScreen.js` `LEVEL_PRESENTATION` (六级 / **Proficient**) ve `components/StatsModal.js` `LEVEL_COLORS` (`#0891B2`). **Kritik:** `LEVEL_PRESENTATION[level].hanzi` zincirleme erişimi vardı → hsk6 girdisi olmadan seviye listesi kurulurken **çökme** olurdu. Seviye menüleri (`HomeScreen` `maxHeight: 360` + `Header`) `ScrollView` olduğu için 7 satır (6 HSK + Mixed) sorunsuz.
  - Bu commit, `wordRepository`'ye HSK 6 eklenmeden **önce** atıldı: böylece **her commit'te uygulama tutarlı** kaldı (aradaki state'te çöken bir sürüm yok).
- **`5a15ec3` — `wordRepository` + testler:** `data/hsk6.json` import'u, `LEVELS`'e `hsk6`, `LEVEL_LABELS['hsk6'] = 'HSK 6'`, `LEVEL_POOLS.hsk6`, `ID_RANGES` → `hsk5: max 2500`, `hsk6: max Infinity`. Testler: `LEVELS` 6 eleman, `ALL_WORDS.length` **4.983**, aralık testi **1..5000** (eksikler yine TAM OLARAK 17 göç id'si), sınır testleri `2500 → hsk5` / `2501 → hsk6`. → **Faz 6 notu (§9):** hsk5 1300'e tamamlandığı için o 17 id yeniden doldu, `ALL_WORDS.length` **5.000** ve "eksikler = göç tablosu" testi kaldırıldı (yerine "id'ler boşluksuz").
- **Doğrulama:** **188 test yeşil** (artışın nedeni: `quizBuilder.test.js` `test.each(Object.entries(LEVEL_POOLS))` → HSK 6 için bir gerçek-veri testi daha), lint **0 hata / 14 uyarı**, `tsc` **0 hata**, değişen 3 JS dosyası Babel parse OK, `npx expo export --platform android` **hatasız** (3,1 MB bundle; `dist/` silindi).
- **Bilinçli sınırlama — HSK 6 örnek cümleleri YOKTU:** `exampleService` `EXAMPLES_MAP`'te hsk6 yoktu → `getExampleByWordId` `null` döner, `ExampleBox` `null`'da hiç çizilmez. Sonuç: HSK 6'da yanlış cevapta örnek kutusu boş kalır (**çökme yok**). → **Faz 6'da kısmen değişti (§9): eski hsk5 kuyruğundan taşınan 555 örnek artık `data/examples/hsk6_examples.js` içinde** (2500 kelimenin 555'i örnekli); kalanlar için hâlâ kaynak/tel gerekir.
- **Performans notu:** `ALL_WORDS` 2.500 → **4.983** (Mixed ve çözülemeyen review kelimeleri). Şık üretimi dairesel tarama olduğu için maliyet havuz boyutundan neredeyse bağımsız (bkz. §7 "4.2"); `quizBuilder.js` yorumlarındaki sabit sayılar güncellendi.

---

## 9. Faz 6 — HSK 5 resmî 1300 kelimelik listeyle değiştirildi (**cihazda doğrulandı ✅** (2026-10-16))

**Başlangıç isteği:** "internette araştırıp hsk5 listesini 1300'e tamamlayacak 17 kelimeyi bulup ekleyebilir misin" (17, Faz 4'te birleştirilen ikizlerin bıraktığı boşluktu). Araştırma, sorunun bundan **çok daha büyük** olduğunu gösterdi; kullanıcı onayıyla seviye tamamen resmî listeyle değiştirildi.

**Referans:** resmî **Hanban 2012** listeleri (hskhsk.com'un yayınladığı `HSK Official ... 2012 L1..L6`) + **MandarinBean HSK 5 sayfası** — ikisi HSK 5'te **1300/1300 birebir aynı** (hsk6 dosyamız da resmî L6 ile 2500/2500 aynı ✓). Kaynaklar: `C:\Users\Olcan Askar\AppData\Local\Temp\opencode\hsk5-sources\` (`mb-full.txt`, `hskhsk-L*-def.txt`), üretim betikleri aynı klasörde (`build-hsk5-rebalance.js`, `generate-migration-tables.js`, `audit-all-levels.js`).

**Faz 6 öncesi `data/hsk5.json` (1283 kelime):**

- id **1201–1801** (601 kelime): resmî HSK 5'in ilk 601 satırı — birebir doğruydu ✔
- id **1802–2500** (682 kelime): **555'i aslında HSK 6 kelimesi** (uygulamanın kendi hsk6 listesinde de var: 执行, 制造, 挨 …), 61'i HSK 5'in sonundaki kelime (执照, 指导, 咨询 …), 17'si Faz 4'te birleştirilen ikizlerin *diğer* kopyası, **66'sı hiçbir resmî listede yok** (ör. `言而喻` = `不言而喻`'in kopmuş hâli, `人人为我，我为人人`, `鼻梯`, `料`).
- Sonuç: seviyedeki kelimelerin **621'i HSK 5 değildi** ve resmî listeden **638 kelime eksikti** (哎, 安装, 把握, 包括, 病毒, 播放, 脖子, 编辑 …).

**Resmî listelere göre örtüşme (Faz 6 öncesi):** hsk1 %95 · hsk2 %97 · hsk3 %94 · **hsk4 %85** · hsk5 **%51** · hsk6 %100. Kütüphanede resmî 5001 kelimeden **702'si hiç yoktu**; 84 kelime hiçbir resmî listede yoktu. → **hsk1–4 hâlâ farklı bir kaynaktan geliyor; hsk4'ün %85'i (79 resmî kelime eksik) ayrı ve açık bir iştir** (kullanıcıya bildirildi, bu fazın kapsamı dışında bırakıldı).

**Yapılan (`b4e8429`):** resmî HSK 5 satır **602–1300 = tam 699 kelime**, id 1802–2500 ise tam **699 slot** → ilk 601 kelimeye hiç dokunulmadan kuyruk resmî sırayla dolduruldu.

- `data/hsk5.json`: **1300 kelime**, id 1201–2500; Faz 4'te boşalan 17 id (1889, 1894, …) kendiliğinden doldu → kütüphane **5.000 kelime, boşluk yok**. hsk5 artık resmî Hanban 2012 HSK 5 listesinin aynısı (kelime **ve** sıra). İlk 601 kaydın metni birebir korundu (`head deep-equal` doğrulaması).
- Metin kaynağı MandarinBean (hsk6 ile aynı kaynak). **Tek boş anlam** (`乙`, id 2401) tarafımızdan yazıldı: "second of the ten heavenly stems" (hsk6'daki `丙` ile aynı üslup); ayrıca **tipografik kesme `’` → `'`** normalleştirildi (`bù'ān`, `Ma'am`).
- `services/wordIdMigrations.js`: **`HSK5_REBALANCE_ID_MAP`** (616 kayıt: eski kuyruk id → kelimenin bugünkü id'si; **555'i hsk6'ya**, **61'i hsk5 içinde başka id'ye**) + **`HSK5_REBALANCE_DROPPED_IDS`** (66 kayıt: kelime artık hiçbir listede yok) + **`WORD_ID_MIGRATIONS`** (Faz 4 + Faz 6 birleşik, anahtarlar ayrık).
- **Tek seferlik göç:** kaynak id'ler artık **başka** kelimeleri gösteriyor; tablolar ikinci kez uygulanırsa *yeni* ilerleme yanlış kelimeye taşınırdı. Bu yüzden `needsWordIdMigrations()` / `markWordIdMigrationsApplied()` + `@hsk_word_id_migration_version` işareti eklendi ve `App.js` göçü yalnızca işaret eskiyse uygular. Faz 4'ün 17 id'si de aynı kapıdan geçer (Faz 4 öncesinden gelen kullanıcı önce ikiz göçünü alır, sonra tablo bir daha çalışmaz).
- **Örnek cümleler** id ile anahtarlanır → kelimeyle birlikte taşındı: hsk5 **662/1300** (601 baş + 61 taşınan), yeni **`data/examples/hsk6_examples.js`** (eski kuyruktan gelen **555/2500** — hsk6 artık kısmen örnekli), hedefi olmayan **66** örnek silindi. `exampleService` `EXAMPLES_MAP`'e `hsk6` eklendi. Yeni test **"yetim örnek kaydı yok"** kuralını altı seviyede doğrular.
- **Kütüphaneden tamamen çıkan 60 kelime** (66 kaybolan − 6'sı app hsk1–4'te zaten var). Bunların **7'si resmî HSK kelimesiydi** (至少, 自信, 总结, 戴, 法律, 脾气, 办法); **6'sı app'in hsk3/hsk4'ünde zaten bulunduğu için kaybolmadı**, yalnızca **`自信`** (resmî L4) artık hiçbir yerde yok. Kök neden hsk3/hsk4'ün kaynağının resmî listelerden farklı olması; hsk4 düzeltilirse bu kelimeler geri gelir. Kütüphaneden çıkan 60 kelimenin **59'u** `鼻梯`/`言而喻` gibi yanlış kaynaklı artıktı; **tek gerçek kayıp `自信`** (resmî L4, app'in hsk4'ünde de yoktu).
- **Testler:** `ALL_WORDS.length` 4.983 → **5.000**, "id'ler boşluksuz" testi (eski "eksikler = göç tablosu" testi geçersiz: o id'ler artık dolu), yeni `__tests__/wordIdMigrations.test.js` (tablo bütünlüğü + örnek pinler + tek seferlik sürüm işareti), `reviewPool` göç testleri güncellendi (haritasız kayıt artık düşmez, **korunur**), `exampleService` testine hsk6 + yetim testi eklendi. **207 test / 11 suite**.
- **Doğrulama:** `npm test` **207 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · değişen JS/JSX dosyaları Babel parse OK · `npx expo export --platform android` hatasız (3,1 MB; `dist/` silindi).
- **Geri dönüş notu:** göç geri alınamaz (bkz. §16); cihazda doğrulandı ✅ (2026-10-16), `known-good` ilerletildi.

---

## 10. Faz 7 — hsk1–4 resmî HSK 2012 listeleriyle hizalandı (**cihazda doğrulandı ✅** (2026-10-16))

**Başlangıç isteği:** "önce hsk1–4'ü resmî 2012 listesiyle hizala, sonra HSK 6 örnek cümlelerini tamamla" (sırayı kullanıcı belirledi). Faz 6'nın kapanışında hsk1–4'ün **farklı bir kaynaktan** geldiği ve hsk4'ün resmî listeyle yalnızca **%85** örtüştüğü zaten işaretlenmişti (§9).

**Referans:** resmî **Hanban 2012** L1–L4 listeleri. Ana kaynak **MandarinBean HSK 1–4** (hsk5/hsk6 ile aynı kaynak); çapraz doğrulama için `hanzistroke` sayfalarına gömülü **`official_vocab:hsk20`** JSON'u ve **hskhsk** L1–L4 tanımları. Kaynaklar `…\hsk5-sources\`; üretim betiği `…\opencode\faz7-build.js` (`--write` çıktısı `…\faz7-out\`; doğrulama `faz7-verify.js`, kaynak karşılaştırması `faz7-official.js`).

**Faz 7 öncesi hsk1–4 (resmî listeye göre):** L1 145/150 · L2 141/150 · L3 272/300 · L4 511/600 kelimeyi tutuyordu; **84 kelime** resmî L1–L4'te yoktu → 55'i resmî **HSK 5/6** kelimesi, 13'ü resmî **kalıp/ikiz**, **16'sı hiçbir resmî seviyede yok**: 河, 鞋, 信, 兴趣, 孤单, 请客, 食品, 算, 弹, 停止, 洗衣机, 修, 研究生, 增长, 做生意, 礼拜. hsk4 ayrıca **Kamp A** kaynaklıydı (eski liste).

**Yapılan:**

- `data/hsk1..4.json`: her seviye resmî liste sırasıyla yeniden kuruldu → **150 / 150 / 300 / 600**. Sıra, kelimenin kendi ton işaretli pinyin'inden türetilen **hece anahtarına** göre (elle yazılmış ~400 heceli tablo; eski sırada 67 gerçek pinyin ihlali vardı). İd aralıkları ve `{id, hanzi, pinyin, meaning}` biçimi aynı kaldı → kütüphane yine **tam 5000, boşluksuz**.
- **Biçim kararı:** uygulamanın biçimleri korundu — **饭馆** (MB 饭店), **里** (MB 里面; resmî biçim de 里). Birebir eşleşen kelimelerde uygulamanın pinyin/anlamı aynen korundu; yeni kelimelerde MB metni normalize edildi (tamamen küçük harf, `；`→`;`, POS etiketleri atıldı, fiillerde hskhsk'ın "to …" biçimi).
- **Resmî kalıplar tek kayıt:** 因为……所以……, 虽然……但是……, 不但……而且……, 只有……才……. Resmî listeyi birebir izleyen **aynı seviye ikizleri** korundu: 对 (hsk2), 花 ve 只 (hsk3) — `wordRepository` testi artık yalnızca bu üçüne izin verir.
- `services/wordIdMigrations.js`: **`HSK14_REALIGN_ID_MAP`** (983 kayıt) + **`HSK14_REALIGN_DROPPED_IDS`** (16) + sürüm **3**. Göçün dağılımı: **55'i hsk5/hsk6** (54 hsk5 + 1 hsk6: 暗→1843, 表达→1223, 访问→3031), **13'ü kalıba/varyanta emilir** (因为/所以, 虽然/但是, 不但/而且, 才, 这儿, 那儿, 分之, 刚刚, 恐慌), kalanı seviye içi sıralama kayması ya da seviye değişimi (零/日/说话 L1→L2, 宾馆/面条/晴 L3→L2, 对/过/往 L4→L2, 词典/笔记本/起来 … L4→L3, 出现/眼镜/云 … L3→L4). `from === to` çifti **yok**.
- **Sürüm-farkındalıklı göç (bu fazda eklendi):** `WORD_ID_MIGRATIONS_BY_VERSION` = `{1: Faz 4, 2: Faz 6, 3: Faz 7}` + `getPendingWordIdMigrations()`; `App.js` yalnızca işaretten **yeni** fazları **yükselen sırayla** uygular. **Neden zorunlu:** **30 id hem Faz 6 kaynağı hem Faz 7 hedefidir** (ör. 1843: Faz 6'da eski hsk5 kelimesinin id'siydi, Faz 7'de 暗'nin id'si). Birleşik tablo ya da ters sıra, Faz 6'yı çoktan uygulamış cihazda yeni hsk5/hsk6 kelimelerinin ilerlemesini yanlış id'ye taşırdı. `needsWordIdMigrations()` korunur (test eder); uygulama artık bekleyen faz listesini kullanır.
- **Örnek cümleler** id ile anahtarlanır → hedef id'nin **kendi seviyesine** yeniden anahtarlandı: seviye değiştiren kelimenin cümlesi onunla geldi (零 hsk1#57→hsk2#214, 笔记本 hsk4#617→hsk3#318, 欢迎 hsk2#300→hsk3#400), üst seviyeye taşınanların örneği düştü. Kapsam **1200/1200 → 1109/1200** (hsk1 145/150 · hsk2 150/150 · hsk3 292/300 · hsk4 522/600). Yeni kelimeler örneksiz: `ExampleBox` hiçbir şey çizmez, yetim anahtar yok.
- **Testler:** `wordIdMigrations.test.js`'e Faz 7 blokları (tablo bütünlüğü, 55 üst seviye / 13 emilme / 16 silme pinleri, hsk1–4 boyut ve sıra pinleri, **sürüm-farkındalıklı bekleyen göçler**, "Faz 7 hedefi Faz 6 kaynağı olabilir → sıra yükselendir" ve **zincirli id'nin uçtan uca göçü**), `wordRepository.test.js`'te ikiz izin listesi, `exampleService.test.js`'te taşınan örnek pinleri → **220 test / 11 suite**.
- **Doğrulama:** `npm test` **220 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `npx expo export --platform android` hatasız (`dist/` silindi).
- **Bilinçli sapmalar / sınırlar:** MB L2'de **男人/女人** yazar (resmî/hskhsk: 男/女) ve **没** (resmî: 没有) — uygulamanın mevcut biçimi korundu (gereksiz göçü önlemek için). **hsk6 hâlâ eski kaynaktan** (sıradaki iş), bu yüzden hsk1–4 ile hsk6 arasında 喂 gibi tekrarlar olabilir; HSK 6 işi bunu kapatacak. Örnek kapsamı bilinçli olarak düştü (yeni kelimeler örneksiz).
- **Geri dönüş notu:** göç geri alınamaz (bkz. §16); cihazda doğrulandı ✅ (2026-10-16), `known-good` ilerletildi.

---

## 11. Faz 8 — hsk1–4'ün eksik örnek cümleleri yazıldı (hsk1–4 artık 1200/1200)

**Başlangıç isteği (kullanıcı):** "manuel olarak kontrol ettiğimde hsk3 örnek cümlelerinde bile eksikler var. şimdi hsk3 ve hsk4 için eksik olan örnek cümleleri yap."

**Neden eksik kaldı:** Faz 7'de hsk1–4 resmî listeyle yeniden kurulunca örneksiz kelimeler oluştu: **hsk1 5, hsk3 8, hsk4 78** (toplam **91**). Bu cümleler **elle yazıldı**; kaynaklarda hazır örnek yok (MandarinBean / hskhsk / hewgill / `chv-old-*` tabloları yalnızca kelime + pinyin + anlam verir, `drkameleon-complete.json` sözlüktür).

**Yazılan (91 cümle):**

- `data/examples/hsk1_examples.js`: 狗, 字, 昨天, 做, 坐 (5) → **150/150**
- `data/examples/hsk3_examples.js`: 担心, 感兴趣, 公斤, 还是, 花, 还, 长, 只 (8) → **300/300**
- `data/examples/hsk4_examples.js`: 78 kelime (棒, 包子, 比如 … 左右, 作家) → **600/600**
- Biçim mevcut dosyalarla aynı: `"hanzi"` (tam noktalama), `"pinyin"` (ton işaretli, kelime kelime, 一/不 ton kumeleri uygulanmış), `"meaning"` (İngilizce çeviri). Kayıtlar id sırasına eklendi; son kayıt virgülsüz, dosyalar CRLF ve sonunda newline yok.
- Doğrulama: hsk1–4 **1200/1200**, yetim/tekrar anahtar yok, boş alan yok, sıra artan (`…\opencode\faz8-verify.js` + `exampleService` testleri).
- **Testler:** `exampleService.test.js`'te "hsk1-4 kapsamı tam" + yeni yazılan örnekler için pin testleri → **221 test / 11 suite**.
- **Doğrulama:** `npm test` **221 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `npx expo export --platform android` hatasız.
- **Sınır:** hsk5 (662/1300) ve hsk6 (555/2500) hâlâ kısmi — sıradaki iş.

**Yan bulgu (ayrı commit):** Faz 7'nin "MB anlamı `to ` ile başlamıyorsa hskhsk'ın ilk anlamını kullan" kuralı **倒** için yanlış anlam getirmişti: kayıttaki pinyin `dào`, ama "to collapse" aslında `dǎo` okunuşuna aittir. `data/hsk4.json`'da anlam **"inverted, upside down"** olarak düzeltildi (MandarinBean glossu; sözlük: 倒 `dào` = to invert, to place upside down). Aynı denetimde 91 kelimenin tamamı MB pinyin'iyle karşılaştırıldı, başka uyuşmazlık yok.

---

## 12. Faz 9 — hsk5'in eksik örnek cümleleri yazıldı (hsk5 artık 1300/1300)

**Başlangıç isteği (kullanıcı):** "hsk5'te (varsa) eksik kelime ve eksik örnek cümleleri tamamlayıp birbirleriyle eşleştiklerini kontrol etmeni istiyorum."

**Kelime listesi doğrulaması — eksik kelime YOK:** `data/hsk5.json` 1300 kelime (id 1201–2500). Hanzi kümesi iki bağımsız kaynakla **birebir aynı**: MandarinBean (`mandarinbean-hsk5.html`, 1300 satır) ve hskhsk (`hskhsk-L5-def.txt`, 1300 satır) → eksik/fazla kelime yok. Sıra MandarinBean'i izler (Faz 6 kararı); hskhsk'ın sırası farklıdır (ilk satır 哎, veride 唉).

**Örnek kaynağı yok → elle yazıldı:** hsk5 için hazır örnek cümle kaynağı bulunamadı (MandarinBean hsk5 sayfasında örnek yok; hskhsk düz kelime listesi; `mb-full.txt` / `app-minus-mb.txt` örnek içermiyor) → **638 cümle elle yazıldı**.

**Mevcut 662 kaydın denetiminde bulunan ve düzeltilen veri hataları:**
- **22 kaymış kayıt:** Faz 6 öncesi hsk5 sıralamasına ait, id'si artık başka kelimeye denk gelen cümleler (ör. `1916 词汇` → "这是纯粹的学术交流…", `1954 钓` → "…他发抖得连话都说不清楚。"). Cümlenin hangi kelimeye ait olduğu kesin olmadığı için taşınmadı; **o id'ler için yeni cümle yazıldı**. Üçü ayrıca kelimeyi birebir içermiyordu (`1629 事物` "万事万物", `1654 台阶` "石阶", `1826 姿势` "坐姿") — onlar da yenilendi.
- **2 bozuk pinyin:** `1256 程序` ve `1874 步骤` örneklerinde 按照 pinyin'i `ànz照` olarak bozulmuştu → `ànzhào` yapıldı.
- **1 ton uyumsuzluğu:** `1748 一致` örneği `yīzhì` yazıyordu, kelime kaydı `yízhì` → örnek kelimeyle hizalandı.

**Yazılan:** `data/examples/hsk5_examples.js` → **1300/1300** (638 yeni + 25 değişen kayıt; dosyanın geri kalanı aynen korundu). Biçim dosyanın kendi biçimi: 2 boşluk girinti, `{ "hanzi": …, "pinyin": …, "meaning": … }`, id sırası artan, son kayıt virgülsüz, **CRLF**, sonunda newline (hsk5/hsk6 dosyalarının mevcut biçimi). Pinyin dosyanın baskın üslubuyla **sözlük biçimi**: `一` → `yī`; `不` yalnızca sözlükte kalıplaşmış kelimelerde `bú` (不要 `búyào`, 不断 `búduàn`, 不见得 `bújiàndé` …).

**Doğrulama (tümü 0 sorun):** 1300/1300 kapsam · yetim/tekrar anahtar yok · boş alan yok · id sırası artan · **her örneğin cümlesi kendi kelimesini birebir içerir (1300/1300)** · **her örneğin pinyin'i kelimenin pinyin'ini içerir** · pinyin/meaning içinde CJK veya rakam yok · yalnızca CRLF.

**Testler:** `exampleService.test.js` — "hsk1-5 kapsamı tam" (hsk5 eklendi), Faz 9 pinleri (yeni cümleler doğru kelimeye bağlı; `1256` `ànzhào`, `1748` `yízhì`) ve **"hsk5: her örneğin cümlesi kendi kelimesini içerir"** regresyon testi → **223 test / 11 suite**.

**Doğrulama:** `npm test` **223 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `npx expo export --platform android` hatasız.

**Sınır / sıradaki iş — hsk6 örnekleri GÜVENİLMEZ (2026-10-16 ölçümü):** `hsk6_examples.js`'teki **555** kaydın yalnızca **177**'si kendi kelimesini birebir içeriyor; kalan **378**'i Faz 6'da eski hsk5 kuyruğundan taşınmış ve **başka bir kelimeye ait** (bkz. §16). Yani iş "1945 eksik cümle" değil, **~2323 cümlenin yeniden yazılması**. → **ÇÖZÜLDÜ (Faz 10, §13): 2330 kayıt yazıldı, hsk6 artık 2500/2500.** hsk6 **kelime listesi** sağlamdır (resmî `HSK-6-Vocabulary.pdf`, 2500 kelime).

**Cihaz doğrulaması:** ✅ 2026-10-16 (kullanıcı, Expo Go: "tamamdır çalışıyor") — §16'teki kontrol listesiyle birlikte.

**Not:** §16'teki Faz 6 kontrol listesinin "HSK 5'te örneği olmayan yeni kelimelerde örnek kutusu hiç çizilmesin" maddesi artık geçersiz — hsk5'te örneksiz kelime kalmadı.

---

## 13. Faz 10 — hsk6'nın eksik örnek cümleleri yazıldı (hsk6 artık 2500/2500)

**Başlangıç isteği (kullanıcı):** §12 sonundaki "hsk6 örnekleri GÜVENİLMEZ" bulgusunu kapatmak — hsk6 örnek cümlelerini tamamlayıp kelimelerle birebir eşleştirmek.

**Ölçüm:** `data/examples/hsk6_examples.js`'teki mevcut **555** kaydın yalnızca **177**'si kendi kelimesini birebir içeriyordu; kalan **378** kayıt Faz 6'da eski hsk5 kuyruğundan taşınmış ve **başka bir kelimenin** cümlesini taşıyordu (ör. `2746 沉闷` → 沉重'in cümlesi). Yeniden yazılan id kümesi **385** kayıt (378 kaymış + 7 ek kusurlu), olduğu gibi korunan **170** kayıt; toplam yazılan **2330** kayıt (385 değişen + 1945 eksik). Bu yüzden iş "1945 eksik" değil, **2330 kaydın** elle yazılmasıydı. `data/hsk6.json` (kelime listesi) bu işten etkilenmedi.

**Yöntem (Faz 9 ile aynı):** yazılacak 2330 id, artan sırayla **18 batch**'e bölündü (her biri ~130 kayıt). Her batch geçici bir `module.exports = { <id>: { hanzi, pinyin, meaning } }` dosyasında toplandı (`%TEMP%\opencode\faz10-hsk6-batch-NN.js`); bir betik bunları **id sırasıyla** veri dosyasına merge etti (çakışmada hata verir), ayrı bir betik her aşamada doğruladı. Her batch **ayrı commit** edildi. Biçim dosyanın kendi biçimi: başlık `// src/data/examples/hsk6_examples.js`, boş satır, `const hsk6Examples = {`, 2 boşluk girintili tek satır kayıtlar, son kayıt virgülsüz, `};`, `export default hsk6Examples;`; id artan, **CRLF**, sonunda newline.

**Yan bulgular / pinyin düzeltmeleri (ayrı commit'ler):**
- hsk6 **2965 端午节**: pinyin `uānwǔjié` → **`duānwǔjié`** (kullanıcı onayı; örnek cümlede de doğru yazıldı).
- Aynı sınıf taramasında hsk5 **1774 元旦**: `uándàn` → **`yuándàn`** (kullanıcı onayı). Altı seviyede yapılan `u`/`ü` taraması yalnızca bu iki kaydı buldu.
- hsk6 3425 将就 pinyin'i `jiāngjiu` → `jiāngjiù` (ton duyarlı denetim); 3421 舰艇 cümlesi sadeleştirildi.

**Doğrulama (tümü 0 sorun):** 2500/2500 kapsam · yetim/tekrar anahtar yok · boş alan yok · id sırası artan · **her örneğin cümlesi kendi kelimesini birebir içerir (2500/2500)** · **her örneğin pinyin'i kelimenin pinyin'ini ton duyarlı biçimde içerir** · pinyin/meaning içinde CJK veya rakam yok · hanzi içinde Latin harf/rakam yok · eğri tırnak yok · yalnızca CRLF.

**Testler:** `exampleService.test.js` — "hsk1-6 örnek kapsamı tam" (hsk6 eklendi), "Faz 10 pinleri" (3585 口气, 3615 啦, 3705 络绎不绝, 3714 嘛, 3999 全力以赴, 5000 作息) ve "hsk5 + hsk6: her örneğin cümlesi kendi kelimesini içerir" regresyon testi → **224 test / 11 suite**.

**Doğrulama:** `npm test` **224 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `npx expo export --platform android` hatasız.

**Cihaz doğrulaması:** ✅ 2026-10-17 (kullanıcı, Expo Go: "tamamdır çalışıyor") — §16'teki kontrol listesiyle birlikte. `known-good` bu doğrulama kaydını taşıyan doküman commit'ine ilerletildi.

**Not:** §16'teki Faz 5/6/9 kontrol listelerinin "HSK 6'da örnek kutusu yalnız 555 kelimede dolu / eksik olabilir" maddeleri artık geçersiz — hsk6'da örneksiz kelime kalmadı.

---

## 14. Faz 11 — Ayarlar pop-up'ı (titreşim / ses seviyesi / ilerlemeyi sıfırla / GitHub)

**Başlangıç isteği (kullanıcı):** "Uygulamaya bir ayarlar bölümü ekleyip içine reset progress, titreşimlerin açılıp kapanması, kartların üzerindeki hoparlöre basınca okunan karakterin ses seviyesini ayarlama ve uygulamanın GitHub sayfasına yönlendiren bir buton koymayı düşünüyorum."

**Kararlar (kullanıcı onayı):** giriş noktası **Home başlığındaki ⚙️** (sekme değil) · İstatistikler gibi **pop-up** (`Modal`) olarak açılır — kullanıcı isteği üzerine ayrı ekran/rota değil · ses seviyesi **gerçek slider** (`@react-native-community/slider`, SDK 57'de `inExpoGo: true`) · reset progress **yalnızca Ayarlar'da** (`StatsModal`'dan taşındı) · ses seviyesi **hem quiz kartı hem sözlük** hoparlörünü etkiler · GitHub butonu **mevcut private URL**'i kullanır (repo ileride public yapılırsa aynı buton çalışır).

**Yapılan (her biri ayrı commit):**
1. `services/settingsService.js` — ayarların tek kaynağı: `DEFAULT_SETTINGS` (`{ haptics: true, speechVolume: 1 }`), `@hsk_settings` anahtarı, `getSettings()` (diskten okur; **eksik/bozuk alan alan varsayılana düşer**, bilinmeyen alan atılır), `updateSettings(patch)` (birleştirir → `onSettingsChange` yayar → diske yazar), `clampSpeechVolume` (0–1) ve **senkron** `getCachedSettings()`.
   - Neden senkron: `Speech.speak` anında çağrılır, ses seviyesi için AsyncStorage beklenemez → bellek içi kopya; `App.js` açılışta `getSettings()` ile önbelleği doldurur.
2. `services/speechService.js` — `expo-speech`'e dokunan **tek** yer (`speakHanzi`, `stopSpeaking`, `warmUpSpeech`); `volume` ayardan eklenir. `QuestionCard` (kart 🔊, `rate 0.85`), `VocabularyScreen` (sözlük 🔊, `pitch 1.0 + rate 0.85`) ve `QuizScreen` (sessiz ısınma, `volume: 0` — ayardan **bağımsız**) buraya bağlandı. Davranış değişmedi: okuma parametreleri birleştirildi (`zh-CN`, `pitch 1.0`, `rate 0.85`).
3. `services/hapticsService.js` — `expo-haptics`'e dokunan **tek** yer: `selectionFeedback()` (doğru) ve `failureFeedback()` (yanlış, 140 ms arayla iki darbe). `settings.haptics === false` iken ikisi de hiçbir şey yapmaz.
4. `components/SettingsModal.js` (başta ayrı bir `screens/SettingsScreen.js` olarak yazılmıştı; `afe51c1` ile **İstatistikler ile aynı pop-up kabuğuna** çevrildi: `Modal` + karartılmış zemin (`Pressable` ile kapatma) + ölçek/kayma animasyonu + sağ üstte ✕) + `HomeScreen` üst satırında ⚙️ (`isSettingsVisible` state'i; **rota yok**, `App.js` değişmedi). Bölümler: **FEEDBACK** (Switch) · **SOUND** (yüzde göstergesi + slider `step 0.05` + "Test volume" → 你好 okur) · **DATA** (iki adımlı onaylı RESET PROGRESS) · **ABOUT** (GitHub butonu + URL metni). Slider sürüklenirken yalnız ekran güncellenir, **diske yazım parmak kaldırılınca** (`onSlidingComplete`) yapılır. `Linking.canOpenURL` başarısızsa `Alert` ile uyarılır. İçerik `ScrollView` içindedir (küçük ekranda kart `maxHeight: 85%` sınırına girerse kaydırılır).
5. `components/StatsModal.js` — reset bölümü, onay kutusu, `handleResetProgress`, `resetConfirm`/`isResetting` state'i ve ilgili stiller **kaldırıldı**; `clearAllStats`/`DeviceEventEmitter` import'ları düştü. Aynı akış (`clearAllStats()` + `onProgressReset`) Ayarlar'da sürüyor; `App.js` değişmedi.
6. Testler — `__tests__/settingsService.test.js` (12), `__tests__/hapticsService.test.js` (4, `expo-haptics` taklit), `__tests__/speechService.test.js` (6, `expo-speech` taklit) → **246 test / 14 suite**.

**Doğrulama:** `npm test` **246 yeşil** · lint **0 hata / 15 uyarı** (yeni uyarı: `SettingsModal`'ın açılış effect'i — `StatsModal` ile aynı `set-state-in-effect` deseni) · `tsc` **0 hata** · değişen `.js` dosyaları Babel parse ✓ · `npx expo export --platform android` hatasız.

**Cihaz kontrol listesi (✅ doğrulandı — 2026-10-17, kullanıcı, Expo Go):**
1. Home'da ⚙️ → Ayarlar **İstatistikler gibi pop-up** olarak açılmalı (karartılmış zemin + ölçek animasyonu); **✕**, karartılmış alana dokunma ve **donanım geri tuşu** ile kapanmalı.
2. Pop-up içeriği gerekirse kaydırılabilmeli (küçük ekranda ABOUT bölümü görünmeli).
3. SOUND → ses seviyesini %20'ye çek → "Test volume" 你好'yu kısık okumalı; Quiz'e geçip karttaki 🔊 ve Sözlük'teki 🔊 **aynı** kısık seviyede okumalı.
4. Ses seviyesini **%0**'a çek → okuma duyulmamalı (uygulama çökmemeli) ve açıklama "Muted" olmalı.
5. FEEDBACK → titreşimi **kapat** → quiz'de doğru/yanlış cevapta **hiç** titreşim olmamalı; tekrar açınca titreşim geri gelmeli.
6. DATA → RESET PROGRESS → CANCEL hiçbir şeyi silmemeli; **YES, RESET** istatistikleri **ve** yanlış havuzunu silmeli, **özel desteler kalmalı**.
7. `StatsModal`'da artık RESET butonu **olmamalı**.
8. ABOUT → GitHub butonu tarayıcıda repo sayfasını açmalı (private repo: giriş yapılmış hesapta açılır).
9. Uygulamayı kapatıp aç → ayarlar (ses seviyesi + titreşim) **korunmalı**.

**Sonuç:** ✅ **cihazda doğrulandı** (2026-10-17, kullanıcı, Expo Go). `known-good` bu doğrulama commit'ine ilerletildi (önceki: `6ceea02`) ve tek yedek arşivi tazelendi (bkz. §29).

---

## 15. Faz 12 — Home kaydırmasız, tüm ekran/pop-up'lar kırmızı temalı, gerçek GitHub ikonu

**Başlangıç isteği (kullanıcı):** (1) "home ekranındaki her şey ekrana sığıyor zaten, orada ekranı kaydırabilmenin bir anlamı yok" · (2) "quiz ekranındaki renk teması da uygulamanın diğer bölümlerindeki kırmızı ve tonları olarak değişse daha iyi olabilir" · (3) "bu değişikliği vocabulary kısmı içinde yapmanı istiyorum" · (4) "settings kısmındaki github butonundaki emoji yerine asıl github icon'unu eklemeni istiyorum" · (5) "draw ve statistics kısmını da bu kırmızı tonlarına getir".

**1. Home artık kaydırmıyor** (`ccc7d11`) — `screens/HomeScreen.js`'te dış `ScrollView` yerine düz `View style={styles.container}` kullanılır (`showsVerticalScrollIndicator` ve `bounces` yok). İçerik zaten tek ekrana sığıyordu; sürüklenip yerinden oynayan ekran yanlış hissettiriyordu. **Dikkat:** içerik artık kırpılır, kaydırılmaz — Home'a yeni kart eklenirse yükseklik gözetilmeli (seviye menüsündeki `ScrollView` yerinde duruyor, o liste hâlâ kaydırılabilir).

**2. Quiz ekranı amber teması → uygulamanın kırmızı paleti** (`c8e7424`; aynı işlem sözlük için `be8bf1a`):

| Dosya | Önce | Sonra |
|---|---|---|
| `components/Header.js` (mod sekmeleri, seviye menüsü, Review şeridi) | amber: `#D97706` · `#B45309` · `#FCD34D` · `#FEF3C7` · `#92400E` · `#FFFBEB` | kırmızı: `#DC2626` (vurgu) · `#B91C1C` / `#991B1B` (metin, gölge) · `#FCA5A5` (kenarlık) · `#FEF2F2` (zemin) |
| `screens/QuizScreen.js` | `#B45309` (ipucu satırı), `#78350F` (boş-durum alt metni) | `#B91C1C`, `#7F1D1D` |
| `components/ExampleBox.js` (örnek cümle kutusu) | `#FFFBEB` · `#FCD34D` · `#B45309` · `#D97706` + slate metinler | `#FEF2F2` · `#FCA5A5` · `#991B1B` · `#DC2626` + `#2C3E50`/`#7F8C8D` |
| `components/QuestionCard.js` (şık geri bildirimi) | Material: `#E8F5E9`/`#2E7D32`/`#1B5E20` (doğru), `#FFEBEE`/`#D32F2F`/`#C62828` (yanlış), `#9E9E9E`, `#888` | `ScoreBoard` ile **birebir aynı**: doğru `#ECFDF5`/`#059669`/`#047857`, yanlış `#FEF2F2`/`#DC2626`/`#B91C1C`, `#BDC3C7`, `#7F8C8D` |
| `screens/VocabularyScreen.js` (arama kutusu, "Draw" butonu, seviye çipleri, kart etiketi, pinyin, 🔊 butonu) | amber: `#FCD34D` · `#B45309` · `#FEF3C7` · `#D97706` · `#FFFBEB` + Tailwind grileri (`#1F2937`, `#374151`, `#4B5563`, `#6B7280`, `#78716C`) | kırmızı: `#FCA5A5` · `#B91C1C` · `#991B1B` · `#FEF2F2` · `#DC2626` + uygulama grileri (`#2C3E50`, `#7F8C8D`; `#9CA3AF`/`#E2E8F0` zaten paletdeydi) |
| `components/HandwritingModal.js` (Draw / el yazısı pop-up'ı) | amber: `#FFFBEB` · `#FCD34D` · `#D97706` + slate grileri (`#CBD5E1`, `#FAFAF9`, `#F3F4F6`, `#4B5563`) | kırmızı: `#FEF2F2` · `#FCA5A5` · `#DC2626` + uygulama grileri (`#BDC3C7`, `#F8F9FA`, `#E9ECEF`, `#2C3E50`). **Hata durumu** (`candidatesBarError`) normal çubukla karışmasın diye bir kademe koyu: `#FEE2E2` zemin + `#991B1B` kenarlık (metin de `#991B1B`) |
| `components/StatsModal.js` (İstatistik pop-up'ı) | amber tema: streak `#FFF7ED`/`#FFEDD5`/`#C2410C`/`#9A3412`; ay gezinme + balon `#FEF3C7`/`#FCD34D`/`#B45309`/`#92400E`/`#FFFBEB`; spinner `#D97706` — ayrıca **gökkuşağı** seviye renkleri (`#EA580C`, `#2563EB`, `#7C3AED`, `#0891B2`), teal özel-deste rengi, amber ısı ölçeği ve Tailwind grileri | kırmızı: streak `#FEF2F2`/`#FEE2E2`/`#B91C1C`/`#991B1B`; gezinme + balon `#FEF2F2`/`#FCA5A5`/`#B91C1C`/`#991B1B`; spinner `#DC2626`; **seviye renkleri kırmızı rampası** (`#F87171` → `#7F1D1D`, HSK 1'den 6'ya koyulaşır), özel desteler nötr `#2C3E50`; ısı ölçeği `#E9ECEF` → `#7F1D1D`; "doğru" yeşili `#16A34A` → `#047857`; griler `#2C3E50`/`#7F8C8D`/`#9CA3AF`/`#E9ECEF`/`#F8F9FA` |

**Kural:** "doğru = yeşim (emerald), yanlış = mühür kırmızısı" renk çifti artık tek yerde tanımlı bir palettir; `QuestionCard` ile `ScoreBoard` **aynı** değerleri kullanmalıdır. Amber/altın tonları yalnızca Home'daki **Custom Word Decks** kartında kalır — quiz yüzeyinde (Header, QuestionCard, ExampleBox, QuizScreen), sözlükte ve iki pop-up'ta (Draw, İstatistik) amber/gökkuşağı yoktur.

**Bilinçli istisna (StatsModal):** seviye çubukları ve ısı takvimi *sıralı* birer ölçektir, bu yüzden tek renk yerine **kırmızı rampası** kullanır (HSK 1 → 6 ve "az → çok" aktivite koyulaşır); özel desteler bir HSK seviyesi olmadığı için rampanın dışındaki nötr `#2C3E50` tonunu alır. "Correct/Wrong" yeşil/kırmızı ayrımı bu bölümde de korunur (yeşil `#047857`/`#059669`).

**3. Ayarlar'daki GitHub butonu: emoji yerine gerçek logo** (`be870a9`) — `components/SettingsModal.js`'te 🐙 yerine GitHub'ın resmi "mark-github" (octicon) vektör yolu, `react-native-svg` ile çizilir (yeni bağımlılık YOK; `react-native-svg` zaten `HandwritingModal` için kurulu ve Expo Go'da hazır gelir). `GitHubMark` bileşeni tek renk `fill` alır (`#2C3E50`, buton metniyle aynı ton) ve dekoratiftir — erişilebilirlik etiketi butonun kendisindedir. Kullanılmayan `linkButtonIcon` stili silindi.

**Doğrulama:** `npm test` **246 yeşil** · lint **0 hata / 15 uyarı** · `tsc` **0 hata** · değişen `.js` dosyaları Babel parse ✓.

**Cihaz kontrol listesi (✅ doğrulandı — 2026-10-17, kullanıcı, Expo Go):**
1. Home'da ekranı sürükle → hiçbir şey kaymamalı/oynamamalı.
2. Quiz'e gir → mod sekmeleri, aktif sekme göstergesi, "Level:" menüsü, seviye dropdown'ı ve Review şeridi **kırmızı** olmalı (amber kalmamalı).
3. Doğru şık yeşil, yanlış şık kırmızı görünmeli; renkler üstteki Correct/Wrong rozetleriyle **aynı** olmalı.
4. Cevap sonrası çıkan "EXAMPLE SENTENCE" kutusu kırmızı tonlu olmalı (eskiden krem/altın sarısıydı).
5. Boş havuz / "All Clear!" durum ekranı okunaklı olmalı.
6. Sözlüğe gir → arama kutusu kenarı, ✏️ Draw butonu, seçili seviye çipi, kart üstündeki seviye etiketi, pinyin ve 🔊 butonu **kırmızı** olmalı (amber kalmamalı); arama ve harfler okunaklı olmalı.
7. Ayarlar → ABOUT bölümündeki GitHub butonunda **gerçek GitHub logosu** görünmeli (🐙 değil), metinle aynı koyu tonda ve ortalanmış durmalı.
8. Sözlükte ✏️ Draw → pop-up'ın aday çubuğu, harf çipleri ve tuval çerçevesi kırmızı olmalı. Uçak modunda (internet yok) **hata çubuğu belirgin şekilde daha koyu kırmızı** görünmeli — normal çubukla karışmamalı.
9. Home → 📊 İstatistik → streak kartı, ‹ › ay butonları, bir güne dokununca çıkan detay balonu ve ustalık çubukları kırmızı tonlarında olmalı; takvimde "az" açık kırmızı, "çok" koyu kırmızı, "aktivite yok" gri kalmalı; balondaki Correct yeşil / Wrong kırmızı ayrımı korunmalı.
10. Bu iki pop-up'ın metinleri okunaklı olmalı (koyu kırmızı üstüne beyaz gün rakamları vb.).

**Sonuç:** ✅ **cihazda doğrulandı** (2026-10-17, kullanıcı, Expo Go) — Home sürüklenmiyor, quiz/sözlük/Draw/İstatistik kırmızı temada, GitHub butonunda gerçek logo görünüyor. `known-good` bu doğrulama commit'ine ilerletildi (önceki: `6ceea02`) ve tek yedek arşivi tazelendi (bkz. §29).

---

## 16. Bilinen açık riskler / notlar

- **Home artık KAYDIRMIYOR (Faz 12):** `screens/HomeScreen.js`'teki dış `ScrollView` düz bir `View`'dır; içerik ekrana sığmazsa **kırpılır**. Home'a yeni kart/bölüm eklerken yükseklik gözetilmeli. (Seviye seçim menüsündeki `ScrollView` duruyor — o liste hâlâ kaydırılabilir.)
- **Quiz, sözlük ve pop-up'lar kırmızı palettedir (Faz 12):** `Header.js`, `QuestionCard.js`, `ExampleBox.js`, `QuizScreen.js`, `VocabularyScreen.js`, `HandwritingModal.js`, `StatsModal.js` kırmızı rampasını (`#991B1B`, `#DC2626`, `#B91C1C`, `#FCA5A5`, `#FEE2E2`, `#FEF2F2`; StatsModal'da ayrıca `#F87171`/`#EF4444`/`#7F1D1D`), nötr grileri (`#2C3E50`, `#7F8C8D`, `#9CA3AF`, `#BDC3C7`, `#E2E8F0`/`#E9ECEF`, `#F8F9FA`) ve "doğru" için yeşimi (`#047857`/`#059669`/`#ECFDF5`) kullanır. Doğru/yanlış renkleri `QuestionCard` ve `ScoreBoard`'da **aynı** olmalıdır. Amber/altın tonları yalnızca Home'daki Custom Word Decks kartına aittir.
  - `StatsModal`'da seviye çubukları ve ısı takvimi bilinçli olarak tek renk değil **rampadır** (HSK 1→6 ve az→çok koyulaşır); özel desteler rampanın dışında `#2C3E50` alır. Heat eşikleri `getHeatColor()` + `HEAT_COLORS` içinde **iki yerde** duruyor — değiştirirken ikisini birlikte güncelle.
- **GitHub logosu elle çizilir (Faz 12):** `components/SettingsModal.js`'teki `GitHubMark` bileşeni resmi "mark-github" (octicon) yolunu `react-native-svg` ile çizer — ikon fontu/emoji yok, yeni bağımlılık yok. `react-native-svg` zaten `HandwritingModal` için kuruluydu (Expo Go'da hazır gelir); ikon dekoratif olduğu için erişilebilirlik etiketi butonun kendisindedir.
- **`npx expo-doctor` artık 21/21 DEĞİL — Faz 13'ten sonra 20/21.** Tek başarısız kontrol uygulama kodundan bağımsızdır: `package.json`'daki `tsc` script'i `node_modules/.bin` ile isim çakışıyor (uzun süredir var, dokümandaki "21/21" notu bu yüzden yanıltıcıydı; `npm run tsc` sorunsuz çalışır). ~~**(b)** `expo` patch sürümü **57.0.29** ↔ beklenen **`~57.0.30`**~~ → **ÇÖZÜLDÜ (Faz 13, `1692806`)**: `npx expo install --fix` ile `expo` **`~57.0.30`**'a yükseltildi (tek değişen paket). Bu bağımlılık değişikliği **✅ cihazda doğrulandı** (Faz 13, 2026-10-17; §17).
- **Android 11+ (SDK 30) paket görünürlüğü — `Linking.canOpenURL` tuzagı (Faz 17, §21):** `canOpenURL` içeride `intent.resolveActivity()` çağırır ve bu, uygulamanın manifest'i bir `<queries>` bloğuyla tarayıcıyı bildirmediği sürece **standalone build'de `false` döner** (Expo Go'nun manifest'i bildirdiği için orada çalışır → hata yalnızca APK'da görünür). Bu yüzden basit "şu adresi aç" işlerinde **ön kontrol yapılmaz**: `Linking.openURL()` doğrudan çağrılır (niyeti `startActivity` ile başlatır, filtreden etkilenmez). Adres açılamazsa `expo-clipboard` ile panoya kopyalanır. Aynı tuzak `expo-web-browser`/`Linking` kullanan her yeni özellikte de geçerlidir.
- **Uygulama adı ve paket kimlikleri sabitlendi (Faz 16 → güncellendi Faz 18, §20 + §22):** görünen ad **`HanyuPick`**, slug `hanyupick`, `android.package` = `ios.bundleIdentifier` = **`io.github.olcanaskar.hanyupick`** (Faz 16'da `io.github.olcanasqar.hanyupick` idi; GitHub hesabı `olcanasqar` → `olcanaskar` yeniden adlandırıldığı için `f085820`'de değiştirildi). ⚠️ **Paket adı mağazaya ilk yayından sonra değiştirilemez** (değiştirmek yeni bir uygulama demektir); o yüzden build yokken sabitlendi. Git deposu **`olcanaskar/hanyupick`**, `components/SettingsModal.js`'teki `REPOSITORY_URL` bu adresi gösterir. ⚠️ **Eski GitHub adını (`olcanasqar`) başka biri alabilir** — depo adresi de yeni hesabı izlemeli, eski adrese güvenilmemeli. Değişmeyen tek şey **yerel klasör adıdır** (`C:\Projects\App\ChineseQuizApp`, kullanıcı "şimdilik kalsın" dedi) — yedek arşivleri bu yüzden hâlâ `ChineseQuizApp-backup-*.tar.gz`.
- **Splash ekranı artık yapılandırılmış (Faz 18, §22):** `expo-splash-screen` bağımlılığı + `app.json`'daki plugin ayarı (`backgroundColor` **`#FBF5EB`** — Home ve `AppTheme` ile aynı, `image` `assets/splash-icon.png`, `imageWidth` 180). `App.js` `preventAutoHideAsync()`'i **modül kapsamında** çağırır (bileşen içinde çağrılırsa splash çoktan gizlenmiş olabilir) ve splash'ı **en az `SPLASH_MIN_MS` = 1000 ms** tutar, sonra 300 ms fade ile gizler. Yeni bir splash görseli gerekirse **elle çizilmez**: `tools/generate-icons.py` üretir (ikon + yuvarlatılmış köşe). Native değer olduğu için **Expo Go'da değil**, yalnızca build'de doğrulanır.
- **İkon karakteri bilinçli küçültüldü (Faz 18, `05edc7f`):** `GLYPH_SCALE` **0.42** (0.60 değil) — mürekkep kutusu 423×411 px (güvenli bölge 683 px). İkonu büyütmek/küçültmek gerekirse tek yol `tools/generate-icons.py`'deki bu sabiti değiştirip betiği çalıştırmak.
- **Depo artık public ve açık kaynak vitrini var (Faz 19, §23):** `README.md` (İngilizce, kullanıcıya dönük tanıtım: kurulum, özellikler, gizlilik, veri kuralları), `LICENSE` (**MIT © 2026 Olcan Askar**), `.github/workflows/ci.yml` (**Node 22** üzerinde `npm ci` → `npm run lint` → `npm run tsc` → `npm test`; README'deki CI badge'i bu iş akışına bakar) ve GitHub About açıklaması + 10 topic. ⚠️ **Bunlar canlı dokümandır:** komut/betik/bağımlılık/test sayısı değişirse README de güncellenmeli ve **CI yeşil kalmalı** (her push + her PR'da üç kontrol koşar). Yan etki: Ayarlar'daki GitHub satırı artık herkes için gerçek depo sayfasını açar (private iken "sign in / 404" gösteriyordu, §22) ve commit yazarı e-postası (`aabdullaholcan@gmail.com`) genel geçmişte görünür — GitHub'da *Keep my email addresses private* açılırsa arayüzde gizlenir, ama git metadata'sında kalır.
- **⚠️ EAS, Android kimlik bilgilerini ve uzak sürümü PAKET ADINA göre saklar (Faz 20, §24):** Faz 16'nın build'i `io.github.olcanasqar.hanyupick` içindi; Faz 18'de paket adı `io.github.olcanaskar.hanyupick` olunca EAS o paket adı için **yeni bir keystore üretti** ve uzak `versionCode` **1'den** başladı ("Initializing versionCode with 1"). Sonuçlar: (a) telefonda duran eski APK farklı paket **ve** farklı imza taşır → yanına kurulur, elle silinmeli; (b) bundan sonraki tüm build'ler ve Play'e gidecek AAB **bu** anahtarla imzalanır — **Play'e ilk yüklemeden sonra bu anahtar kaybolursa uygulama bir daha güncellenemez**; anahtar EAS'ta durur, `npx eas-cli@latest credentials` ile görüntülenir/dışa alınır; (c) `versionCode` uzaktan sayılır (`autoIncrement`), `app.json`'a elle yazılmaz.
- **Yeni build = yeni GitHub Release (Faz 20, §24):** EAS artefakt bağlantısı ~30 gün geçerlidir (bu build: 2026-10-31), bu yüzden kullanıcıya giden **kalıcı** indirme yolu **release asset'i**. Akış: `npx eas-cli@latest build --profile preview --platform android --non-interactive --no-wait --json` → `npx eas-cli@latest build:view <id> --json` (durum + `artifacts.buildUrl`) → APK'yı indir → GitHub API ile `vX.Y.Z` etiketli release + asset (`?name=hanyupick-X.Y.Z.apk`; README `hanyupick-*.apk` diyor) → `releases/latest`'i doğrula. Yayımlamadan önce APK'yı doğrula: ZIP imzası (`PK`), girdi sayısı, `AndroidManifest.xml` string pool'unda paket adı — **UTF-16** olarak kodlanır, 8-bit aramada bulunamaz — ve sha256'yı release notlarına yaz.
- **`eas.json` VAR (Faz 16, §20):** `preview` (internal dağıtım → paylaşılabilir **APK**; Expo Go'nun göstermediği ikonu/adı telefonda görmenin en kısa yolu) ve `production` (mağaza + `autoIncrement`) profilleri. **`development` profili bilinçli olarak YOK**: `developmentClient: true` `expo-dev-client` bağımlılığını şart koşar ve o kurulmadı. **EAS Update (`expo-updates`) de yok** — OTA düzeltme göndermek istenirse kurulur, ama ilk kurulum yine yeni bir build gerektirir. **EAS projesi bağlandı** (Faz 16, `972280c`): `@olcanaskar/hanyupick`, ID `ea29583b-1b9a-43c1-8d61-6915c3745c27`; `app.json`'daki `owner` + `extra.eas.projectId` **CLI'nin yazdığı alanlardır** (elle düzenlenmez; yeniden bağlamak için `npx eas-cli@latest init`). Not: **Expo hesabı `olcanaskar`, GitHub hesabı da artık `olcanaskar`** (Faz 18'de eşitlendi; paket adı GitHub'ı izler).
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
- **Cihaz testi (Faz 3.6b: özel desteler istatistikte) ✅ KABUL EDİLDİ** — `known-good` bu noktanın ötesine ilerledi (Faz 5 → Faz 9), ayrı bir tur yapılmadı. Kontrol listesi (regresyon olursa yeniden bakılabilir):
  1. En az bir özel deste aktar, birkaç sorusunu çöz (hem doğru hem yanlış).
  2. İstatistik ekranını aç → **`MASTERY LEVEL`** bölümünün *içinde*, HSK satırlarının altında ince bir ayraç + soluk **`CUSTOM DECKS`** etiketi ve altında deste satırları (ad + `x/y (%)` + teal çubuk) görünsün. **Ayrı bir bölüm başlığı gibi durmamalı**; hiç özel deste yoksa ayraç da hiç çizilmemeli.
  3. Bir kelimeyi 3 kez yanlış yap → aynı kelime **`PROBLEMATIC WORDS`** listesinde görünsün (HSK kelimeleriyle aynı listede).
  4. Bir kelimeyi üç kategoride de (üç farklı mod yönünde) üst üste 3 kez doğru bil → o destenin yüzdesi artsın.
  5. Uzun adlı bir deste (30 karakter) → ustalık satırında ad tek satırda kısalsın, `x/y (%)` sayacı sağda dursun.
  6. HSK mastery satırları ve aktivite takvimi eskisi gibi çalışsın (regresyon yok).
- **Cihaz testi (kart hatası düzeltmesi, `c3e3032`) ✅ KABUL EDİLDİ** — `known-good` bu noktanın ötesine ilerledi, ayrı bir tur yapılmadı:
  1. **Küçük bir havuz** seç (5–6 kelimelik özel deste) ve arka arkaya ~20 soru cevapla: **aynı kelime üst üste geldiğinde bile kart her seferinde gelmeli** (komut satırıyla birlikte).
  2. Şık seçince kayma, kartın üstüne dokununca ekrandan kayıp yeni sorunun gelmesi eskisi gibi akıcı olsun.
  3. Doğru/yanlış animasyonları (yeşil büyüme / kırmızı sarsılma) hâlâ çalışsın.
  4. **Aynı kart art arda gelmemeli** (`2d995c1`): 5 kelimelik destede üst üste sorularda kelime değişmeli. (Havuzda tek kelime kaldıysa — örn. review'da 1 yanlış — tekrar normaldir.)
- **Cihaz testi (Faz 4.6: el yazısı zaman aşımı, `d9e8b0b`) ✅ TAMAMLANDI** — çevrimdışı hızlı hata, çevrimiçi aday/Undo/Clear, 9 sn timeout.
- **Cihaz testi (Faz 4.1: istatistik modalı, `593cc0d`) ✅ TAMAMLANDI** — anında açılma, `Loading…` placeholder, `useMemo` hesaplamalar, `cancelled` bayrağı.
- **Cihaz testi (Faz 4.2: şık üretimi, `99b3e2a`) ✅ TAMAMLANDI** — havuz kopyası yok, ölçülen ~556-1294 µs → ~4 µs; ardışık tekrar engellendi.
- **Cihaz testi (Faz 4.3: yüzen Hanzi arka planı, `1e0831e`) ✅ TAMAMLANDI** — sınırlı hedef denemesi (12), canlı pencere ölçüsü, 18 Hanzi düzgün akıyor.
- **Cihaz testi (Faz 4.5: erişilebilirlik, `4bbacf6` + `e98e860`) ✅ TAMAMLANDI** — TalkBack/VoiceOver: tüm metinler okunuyor, şıklar tek tek odaklanıyor, kart davranışı doğru (cevaplanmadan önce şıklar odaklanabilir, cevaplandıktan sonra "Continue" öğesi), karartmalar "etiketsiz" demiyor.
  - **Nasıl açılır — Android/TalkBack:** Ayarlar → Erişilebilirlik → TalkBack → aç (kısayol: **iki ses tuşuna birlikte ~3 sn bas**). Gezinme: tek parmakla **sağa kaydır** = sonraki öğe, **sola** = önceki, **çift dokun** = etkinleştir, **iki parmakla kaydır** = kaydır. **iOS/VoiceOver:** Ayarlar → Erişilebilirlik → VoiceOver → aç (kısayol: yan tuşa **üç kez bas**). Gezinme: tek parmak sağa/sola kaydır = sonraki/önceki, **çift dokun** = etkinleştir. Test bitince kapatmayı unutma.
  1. **Quiz (en önemli):** 4 şık **tek tek** odaklanabilmeli ve her biri görünen metnini okumalı; hoparlör "Play pronunciation" demeli. **Cevaplamadan önce** kart büyük bir "Continue to the next question" öğesi **olmamalı**; cevaplandıktan sonra **olmalı** (ve şıklar artık odaklanmaz).
  2. **Home:** seviye seçici "Select level: HSK 1. Opens the level list" · ➔ "Start quiz: HSK 1" · 4 kart (Review the wrongs / Custom word decks / Vocabulary and search / Statistics and progress).
  3. **Header:** 3 sekme `sekme` olarak yön adını okumalı; seviye butonu mevcut seviyeyi söylemeli.
  4. **İstatistik modali:** ✕ "Close" · ‹ › "Previous/Next month" · takvim günleri "12 Oct, 3 correct, 1 wrong" ya da "... no activity" · odak modalla sınırlı kalmalı (`accessibilityViewIsModal`). Modal kapanınca başlıklar/butonlar yine odaklanabilmeli.
  5. **Kelime arama:** satır hoparlörü "Play pronunciation of 我" · geri "Go back" · ✕ "Clear search" · el yazısı "Search by handwriting" · kategori çipleri.
  6. **El yazısı + özel deste modalları:** adaylar "Candidate 日", Undo/Clear/Close, "Deck name", "Delete deck <ad>", içe aktarma; üzerine yazma uyarısında Cancel/Replace.
  7. **Dekoratif arka plan:** yüzen 18 Hanzi **hiç odaklanmamalı** (okunmamalı).
  8. Ekran okuyucu kapalıyken **tüm dokunuşlar eskisi gibi** çalışmalı (regresyon yok).
- **Cihaz testi (Faz 4 ek temizlikler, `e0249c4` / `47a4e7e` / `9341de4` / `c53141c` / `9044490`) ✅ TAMAMLANDI** (kullanıcı: "hepsi sorunsuz") — `known-good` = **`832cdec`** (doğrulamayı kaydeden doküman commit'i; doğrulanan kod durumu `341d49e`). Kontrol listesi (gelecekte regresyon olursa yeniden bakılabilir):
  1. **Boş havuz ekranı:** özel bir deste aktar, quiz'de o desteyi seç, sonra deste silinip boş kalırsa (ya da 0 kelimeli bir JSON aktarılırsa) quiz ekranı **boş kalmamalı**: "This deck has no words" + "Import it again from Home, or pick another level above." görünmeli. Üstteki seviye menüsünden başka bir seviyeye geçince soru normal gelmeli. Ayrıca uygulama açılışında/özel desteye geçerken **anlık "kelime yok" titremesi olmamalı**.
  2. **Silinen destenin izleri:** bir özel desteyi çöz (birkaç doğru + en az 3 kez yanlış yap → `PROBLEMATIC WORDS`'te görünsün), sonra desteyi sil. İstatistik ekranında **o destenin ustalık satırı kalmamalı**, silinen kelime "Problematic Words" listesinde **görünmemeli**; HSK istatistikleri ve günlük aktivite **bozulmamalı**. Review'da o desteye ait yanlışlar da düşmeli (kalan yanlışlar durmalı).
  3. **İlerlemeyi sıfırla:** İstatistik modalinin en altındaki "RESET PROGRESS" → onay kutusu ("CANCEL" / "YES, RESET"). Sıfırla: tüm HSK + özel deste yüzdeleri & "Problematic Words" boşalmalı, takvim/streak sıfırlanmalı, Home'daki Review sayacı **0** olmalı. **Özel desteler silinmemeli** (liste ve kelimeleri durmalı). Modal kapanıp açıldığında onay kutusu **kapalı** başlamalı.
  4. **hsk5 ikizleri + göç:** `包含`/`宝贵`/`财产`… gibi kelimeler artık **tek kez** gelmeli (anlamları daha açık: "contain, embody" vb.). Bu kelimelerden birini 3 kez doğru/yanlış yapıp istatistiğin **tek satır** altında biriktiğini gör (kelime başına tek kayıt). Göç: uygulamayı eski sürümle açıp bu 17 kelimeden birini çalıştıysan, yeni sürüme geçince ilerleme **kaybolmamalı** (hedef id'ye taşınır).
  5. **Regresyon:** header seviye/mode sekmeleri, quiz soru/şık/ipucu akışı ve elde yazı modali eskisi gibi çalışmalı.
- **Cihaz testi (Faz 5: HSK 6 entegrasyonu, `7d12737` / `869e8e9` / `07beb1e` / `5a15ec3` / `a3d5f01` / `b1bbc5a`) ✅ TAMAMLANDI** (kullanıcı: "hsk6 kelimeleri gelmiş düzgünce çalışıyor" — 8 maddenin tamamı sorunsuz; `known-good` = doğrulanan kod durumu **`b1bbc5a`** + bu doğrulama kaydını taşıyan doküman commit'i). Kontrol listesi (gelecekte regresyon olursa yeniden bakılabilir):
  1. **Home seviye listesi:** menüde **HSK 6** görünsün — "六级" + "2500 words · Proficient". Menü 7 satır (HSK 1–6 + Mixed) ile kaydırılabilir kalsın, taşma/kesilme olmasın.
  2. **Header seviye menüsü:** quiz içinde seviye menüsünden HSK 6 seçilebilsin; sorular HSK 6'dan gelsin (ör. ilk kelimeler 挨 / 癌症 / 爱不释手).
  3. **6 mod:** HSK 6'da hanzi→anlam, anlam→hanzi, pinyin modları ve ters yönleri çalışsın; şıklar **aynı seviyeden** gelsin, aynı şık iki kez görünmesin. Uzun anlamlar ("So much that one cannot bear to part with it") taşmadan okunabilsin.
  4. **Örnek kutusu:** HSK 6'da yanlış cevapta örnek cümle **görünmemeli** (beklenen davranış), uygulama **çökmemeli**. HSK 1–5'te örnek kutusu eskisi gibi çalışmalı (regresyon yok).
  5. **İstatistik:** `MASTERY LEVEL` altında **HSK 6** satırı kendi rengiyle (cyan) görünsün; birkaç HSK 6 kelimesi çözünce yüzde artsın. Problematic Words'te HSK 6 kelimesi 3 yanlıştan sonra görünsün.
  6. **Mixed:** Mixed modunda HSK 6 kelimeleri de çıkabilsin (toplam 4.983 kelime).
  7. **Review:** HSK 6'da yanlış yap → Home'daki Review sayacı artsın; Review'da o kelime HSK 6 örnek cümlesi olmadan normal sorulsun.
  8. **Regresyon:** HSK 1–5 soruları, özel desteler, sözlük arama, "İlerlemeyi sıfırla" ve 17 ikiz göçü eskisi gibi çalışsın.
- **Cihaz testi (Faz 6: hsk5 resmî 1300 listesi, `b4e8429`) ✅ TAMAMLANDI** (2026-10-16; kullanıcı, Expo Go — Faz 6+7+8+9 birlikte). Kontrol listesi (gelecekte regresyon olursa yeniden bakılabilir):
   1. **HSK 5 içeriği:** resmî listede olup eskiden olmayan kelimeler gelmeli (ör. 安装, 把握, 包括, 病毒, 播放, 脖子, 编辑). Eskiden kuyrukta yanlışlıkla duran **HSK 6 kelimeleri artık HSK 5'te çıkmamalı** (执行, 制造, 挨 …).
   2. **HSK 6:** o kelimeler HSK 6'da normal sorulsun; HSK 6'da yanlış cevapta **örnek cümle kutusu artık dolu gelebilir** (555 kelimede var).
   3. **İstatistik göçü:** eski sürümde HSK 5 kuyruğundan bir kelimeyi (ör. 执行) çalıştıysan ilerleme **kaybolmamalı**; kelime HSK 6'ya taşındığı için ustalık HSK 6 satırına geçer.
   4. **Hata havuzu (Review):** eski yanlışlar yeni id'lere taşınmış olmalı; kütüphaneden çıkan kelimelerin (ör. 言而喻) kayıtları düşmeli.
   5. **Göçün tekrar çalışmaması (en önemli):** yeni sürümde HSK 5 kuyruğundan bir kelimeyi birkaç kez doğru/yanlış yap, uygulamayı kapatıp aç → ilerleme **aynı kelimede** kalsın (yanlış kelimeye kaymasın). Aynısını 17 eski boş id'den biriyle dene (ör. 包含 artık HSK 5'te başka bir id'de).
   6. **Örnek kutusu:** HSK 5'te örneği olmayan yeni kelimelerde kutu **hiç çizilmesin** (çökme yok); örneği olanlar eskisi gibi çalışsın. *(Faz 9'dan sonra geçersiz: hsk5'te örneksiz kelime kalmadı.)*
   7. **Regresyon:** Mixed / Review / özel desteler / sözlük arama / "İlerlemeyi sıfırla" ve HSK 1–4 soruları eskisi gibi çalışsın.
- **Cihaz testi (Faz 7: hsk1–4 resmî 2012 listeleri) ✅ TAMAMLANDI** (2026-10-16; kullanıcı, Expo Go — Faz 6+7+8+9 birlikte). Kontrol listesi (gelecekte regresyon olursa yeniden bakılabilir):
    1. **HSK 1 içeriği:** resmî listede olup eskiden olmayan kelimeler gelmeli (狗, 字, 昨天, 做, 坐 — son üçü sıralı olarak listenin sonunda, örnekleri yok). Eskiden hsk1'de duran **零 / 日 / 说话 artık HSK 2'de** sorulsun.
    2. **Kalıplar:** HSK 2'de **因为……所以……** ve **虽然……但是……**, HSK 3'te **不但……而且……** ve **只有……才……** tek kart olarak çıksın (因为/所以/虽然/但是/才 artık ayrı kelime değil; "Continue"dan sonra ipucu satırı kalıbı göstermeli).
    3. **Seviye kaymaları:** HSK 2'de 宾馆 / 面条 / 晴 (eskiden HSK 3'te) ve 对 / 过 / 往 (eskiden HSK 4'te); HSK 3'te 词典 / 笔记本 / 起来 / 欢迎 gibi eskiden HSK 2/4'te olan kelimeler.
    4. **HSK 5/6'ya taşınanlar:** eskiden HSK 4'te olan **暗 / 表达 artık HSK 5'te**, **访问 HSK 6'da** sorulsun.
    5. **Kütüphaneden çıkanlar:** **河 / 鞋 / 信 / 兴趣** gibi kelimeler artık hiçbir seviyede sorulmamalı; eski yanlışları Review'da görünmemeli.
    6. **İstatistik / havuz göçü:** eski sürümde bu kelimelerden birini çalıştıysan ilerleme **kaybolmamalı** (seviye değiştiyse yeni seviyenin satırında görünür); "Problematic Words" ve Review sayacı tutarlı kalmalı.
    7. **Göçün tekrar çalışmaması (en önemli):** yeni sürümde HSK 1–4'ten bir kelimeyi birkaç kez doğru/yanlış yap, kapat-aç → ilerleme **aynı kelimede** kalsın. Özellikle **HSK 5'ten 暗** ve **HSK 6'dan 访问** ile dene: Faz 6 + Faz 7 zinciri (30 ortak id) yüzünden yanlış kelimeye kaymamalı.
    8. **Örnek kutusu:** hsk1–4'te **artık her kelimenin örneği var** (Faz 8, 1200/1200) — eskiden örneksiz olan 狗 / 字 / 昨天 / 做 / 坐 (HSK 1), 担心 / 只 / 还 (HSK 3) ve HSK 4'ün yeni kelimeleri artık cümle göstermeli; seviye değiştiren kelimede örnek yeni seviyede gelsin (ör. HSK 2'de 零, HSK 3'te 笔记本).
    9. **Regresyon:** Mixed / Review / özel desteler / sözlük arama / "İlerlemeyi sıfırla" ve HSK 5–6 soruları eskisi gibi çalışsın.
- **Cihaz testi (Faz 9: hsk5 örnek cümleleri) ✅ TAMAMLANDI** (2026-10-16; kullanıcı, Expo Go — "tamamdır çalışıyor"). Kontrol listesi (gelecekte regresyon olursa yeniden bakılabilir):
   1. **Örnek kutusu:** HSK 5'te yanlış cevapta örnek cümle **her kelimede** çıkmalı (eskiden 638 kelimede hiç çıkmıyordu) — ör. 制定, 智慧, 总统, 合影.
   2. **Eşleşme (en önemli):** birkaç HSK 5 kelimesini bilerek yanlış yap; çıkan cümlede **o kelimenin** geçtiğini gör (ör. 商业 → "这是一个商业中心。", 发抖 → "他冷得全身发抖。"). Faz 6 öncesinden kalan kaymış cümleler artık görünmemeli.
   3. **Pinyin:** cümle pinyin'i kelimenin okunuşuyla tutarlı olsun (ör. 按照 `ànzhào`, 一致 `yízhì`).
   4. **Regresyon:** HSK 1–4 soruları, HSK 6 (örneği olan 555 kelimede kutu dolu, kalanında boş), Mixed / Review / özel desteler / sözlük arama ve "İlerlemeyi sıfırla" eskisi gibi çalışsın.
- **Cihaz testi (Faz 10: hsk6 örnek cümleleri) ✅ TAMAMLANDI** (2026-10-17; kullanıcı, Expo Go — "tamamdır çalışıyor"). Kontrol listesi (geçmişte regresyon olursa yeniden bakılabilir):
   1. **Örnek kutusu:** HSK 6'da yanlış cevapta örnek cümle **her kelimede** çıkmalı (eskiden yalnız 555 kayıtta vardı) — ör. 口气, 络绎不绝, 全力以赴, 作息.
   2. **Eşleşme (en önemli):** birkaç HSK 6 kelimesini bilerek yanlış yap; çıkan cümlede **o kelimenin** geçtiğini gör (ör. 3615 啦 → "时间不早啦，我们该走了。"). Faz 6'dan kalan kaymış cümleler artık görünmemeli (ör. 沉闷 için 沉重'in cümlesi gelmemeli).
   3. **Pinyin:** cümle pinyin'i kelimenin okunuşuyla tutarlı olsun (ör. 端午节 `duānwǔjié`, 元旦 `yuándàn`).
   4. **Regresyon:** HSK 1–5 soruları, Mixed / Review / özel desteler / sözlük arama ve "İlerlemeyi sıfırla" eskisi gibi çalışsın.
- **Cihaz testi (Faz 13: hsk1–4 örnek düzeltmesi + `expo` 57.0.30) ✅ TAMAMLANDI** (2026-10-17; kullanıcı, Expo Go — "bu sorunlar çözüldü" / "tamamdır çalışıyor"). Kontrol listesi (geçmişte regresyon olursa yeniden bakılabilir):
   1. **Düzeltilen cümleler:** HSK 1'de **二** (id 27) bilerek yanlış cevaplanınca "我有二十个苹果。" görünmeli; HSK 3'te **帮忙** → "他很愿意帮忙。", **只有……才……** → "只有努力，才能成功。"; HSK 4'te **百分之** → "百分之三十的学生没来。", **合格** → "他考试合格了。", **内** → "请在三天内完成。".
   2. **Kalıplar bozulmadı:** HSK 2'de 因为……所以…… / 虽然……但是……, HSK 3'te 不但……而且…… cümleleri eskisi gibi kalıbı göstermeli.
   3. **Uygulama açılışı ve regresyon:** `expo` 57.0.30 ile uygulama sorunsuz açılmalı; quiz / sözlük arama + el yazısı / istatistik / ayarlar / özel deste aktarma eskisi gibi çalışmalı.
- **Cihaz testi (Faz 14: İstatistik pop-up'ı + takvim balonu) ✅ TAMAMLANDI** (2026-10-17; kullanıcı, Expo Go — pop-up açılışı: "bu sorunlar çözüldü", takvim balonu: "tamamdır çalışıyor"). Kontrol listesi (geçmişte regresyon olursa yeniden bakılabilir):
   1. **Temiz açılış (asıl konu):** Home'dan 📊 İstatistikler'e bas → kart **tek parça hâlinde, içeriği dolu olarak** yaylanarak açılmalı; önce küçük/"Loading…" hâlinde belirip sonra büyümesi ya da ortada kayması **olmamalı** (Ayarlar ve özel deste pop-up'ları gibi temiz).
   2. **Tekrar açılışlar:** kapat → birkaç kez yeniden aç; her seferinde aynı temiz açılış olmalı. Ayrıca birkaç soru doğru/yanlış cevaplayıp tekrar aç → sayılar **güncel** gelmeli (bayat kalmamalı).
   3. **Ay/gün sıfırlaması:** geri okuyla geçmiş bir aya git, takvimde bir güne dokun (balon açılsın), sonra pop-up'ı kapat → yeniden aç: **bu ay** ve **balonsuz** başlamalı (eskisi gibi). Kapanış animasyonu bozulmamalı.
   4. **Kapanış:** ✕ ve boş alana dokunma ile kapanma eskisi gibi (aşağı kayma + solma) olmalı.
   5. **Boş veri:** Ayarlar → "İlerlemeyi sıfırla" sonrası İstatistikler → "No problematic words right now. Well done!" görünmeli ve kart yine temiz açılmalı.
   6. **Takvim balonu (bu turun 2. konusu):** bütün ayı gösteren takvimde **ortadaki sütundan** bir güne dokun → gün balonu **sola** açılmalı ve **hiçbir kenarı kesilmemeli** (eskiden sağa açılıp kartın dışına taşıyor, kenarı kesiliyordu). Soldaki sütunlar sağa, sağdaki sütunlar sola açılmaya devam etmeli; balon seçili hücrenin yanında ok işaretiyle durmalı. Çok dar bir ekranda balon biraz daralıp son satırı alt satıra kayabilir — kesilme olmamalı.
- **Bilinçli olarak kapsam dışı (4.5):** `accessibilityState` (seçili sekme/şık), doğru-yanlış **duyurusu** (`announceForAccessibility`) ve modal içinde odak yönetimi eklenmedi. Bunlar istenirse ayrı bir "4.5b" olarak yapılabilir (durum + duyuru katmanı).
- **Bileşenler için otomatik test yok** (jest yalnızca `services/`'i çalıştırır). Faz 4.1'de `react-test-renderer` ile **geçici** bir render kontrolü yapıldı (yükleme→içerik + aç/kapa) ve dosya silindi — `react-test-renderer` bildirilmiş bir bağımlılık değil ve React 19'da kullanımdan kaldırıldı. Kalıcı istatistiksel kontrol istenirse `@testing-library/react-native` bilinçli olarak eklenip birkaç ekran için duman testi yazılabilir (ayrı karar).
- ~~**Ölü prop adları** (`Header` `onSelectLevel`/`onToggleMode`)~~ → **ÇÖZÜLDÜ (`e0249c4`)** · ~~**`hsk5.json`'da 17 ikiz kayıt**~~ → **ÇÖZÜLDÜ (`9044490`)**: küçük id korunarak tek kayda indirildi, anlam metni daha açıklayıcı olan seçildi, silinen id'ler için göç yazıldı (§7 "ek temizlikler E").
- ~~**hsk1–4 resmî listelerden farklı bir kaynaktan geliyordu** (hsk4 resmî listeyle yalnızca %85 örtüşüyordu; 84 kelime resmî L1–L4'te yoktu)~~ → **ÇÖZÜLDÜ (Faz 7, §10)**: hsk1–4 resmî Hanban 2012 L1–L4 listeleriyle birebir hizalandı (150/150/300/600, pinyin sırası), 16 resmî olmayan kelime kütüphaneden çıktı, 55'i HSK 5/6'ya taşındı, ilerleme göçü + örnek yeniden anahtarlama yapıldı. **hsk6'nın kaynağı hâlâ eski** (resmî L6 ile aynı olduğu Faz 6'da doğrulanmıştı); **hsk5 örnekleri Faz 9'da tamamlandı (1300/1300)**, **hsk6 örnekleri de Faz 10'da tamamlandı (2500/2500)** — böylece altı seviyenin tamamında örnek kapsamı tamdır.
- ~~**hsk6 örnek cümleleri GÜVENİLMEZ (2026-10-16'da ölçüldü)** — `data/examples/hsk6_examples.js`'teki **555** kaydın yalnızca **177**'si kendi kelimesini birebir içeriyor. Kalan **378** kayıt Faz 6'da eski hsk5 kuyruğundan gelmiş ve **başka bir kelimenin cümlesini** taşıyor (ör. `2746 沉闷` → "听到这个沉重的消息，大家都沉默了。" aslında `2748 沉重`; `2748 沉重` → 衬衫'in cümlesi; `2753 衬托` → `2759 承办`). Dağılım: **134** kayıt cümlede geçen tek bir hsk6 kelimesiyle *eşlenebiliyor* ama sahipler tekrarlı ve 555 anahtarın dışına taşıyor → **yeniden anahtarlama güvenli değil**; **50** kayıt birden fazla hsk6 kelimesi içeriyor (belirsiz); **194** kayıt hiçbir hsk6 kelimesini içermiyor. **Sonuç:** hsk6 örneği işi "1945 eksik" değil, **~2323 cümlenin yeniden yazılması** (177 doğrulanmış kayıt korunabilir). hsk6 **kelime listesi** bu bulgudan etkilenmez: resmî `HSK-6-Vocabulary.pdf`'ten geliyor, küme resmî L6 ile birebir aynı (2500/2500; yalnızca sıra hskhsk'tan ~%50 farklı — resmî PDF esas alındığı için değiştirilmedi). Ölçüm betikleri: `%TEMP%\opencode\hsk6-owner.js` / `hsk6-shift.js`, çıktılar `hsk6-owner.txt` / `hsk6-mismatch.txt`.~~ → **ÇÖZÜLDÜ (Faz 10, §13): 385 kaymış/kusurlu kayıt yeniden yazıldı, 1945 eksik tamamlandı → hsk6 2500/2500.**
- **Kelime id göçü TEK YÖNLÜ (Faz 4 `9044490` + Faz 6 `b4e8429` + Faz 7)**: ne ikiz birleştirme, ne hsk5 yeniden dengelemesi, ne de hsk1–4 hizalaması geri alınabilir. Eski bir sürüme dönülürse: (1) hsk5 kuyruğu eski (yanlış) kelimeleri gösterir, göç haritası olmadığı için yeni id'lerdeki ilerleme orada kalır; (2) **Faz 4 sürümündeki kapısız göç** (her açılışta çalışırdı) 17 id'nin *yeni* kelimelerinin ilerlemesini baş kısımdaki id'lere taşır → geri dönüş gerekirse kullanıcı verisi de (`@hsk_user_stats` + `@hsk_review_pool`) geri alınmalı ya da sıfırlanmalı. Faz 7'den sonra göç bir daha çalışmaz: `@hsk_word_id_migration_version` = **3** işareti tutulur (§10).
- **`wordStats[].level` alanı SİLİNDİ (Faz 3.3, `ef10c3a`)** — iki sorunluydu: (1) **hiç okunmuyordu** (`StatsModal` yalnızca `categories` kullanır), (2) **yanlış veri** tutuyordu: `QuizScreen` oturumun seviyesini geçiyordu, yani değer `hsk1` değil `'review'` / `'mixed'` / `'custom_X'` olabiliyordu. Bir kelimenin gerçek seviyesi gerekiyorsa **tek kaynak** `wordRepository.getLevelFromWordId(id)`. Diskteki eski kayıtlarda alan duruyor ama artık yazılmıyor ve hiçbir yerde okunmuyor (zararsız); göç gerekmez.
- ~~`hsk5.json` kayıtlarında `level` alanı yok (hsk1–4'te var) — veri modeli tutarsızlığı~~ → **ÇÖZÜLDÜ (`869e8e9`, §8)**: alan **hsk1–4'ten kaldırıldı** (hiçbir kod okumuyordu; değerler `1..4` sayıydı), artık altı dosya da tek biçim: `{id, hanzi, pinyin, meaning}`. Seviye tespiti tek kaynaktan (`id` aralığı, `wordRepository`) yapılır (§5, 2.4).
- ~~**`hsk5.json`'da 17 ikiz kayıt** var (aynı hanzi iki kez, farklı id): 2'si birebir aynı (`财产` 1237/2002, `插` 1242/2024), 15'i yalnızca anlam yazımı farklı (`包含` 1206/1889). Kod artık bu ikizleri şık olarak göstermiyor ama istatistikler iki ayrı id'de birikiyor; veri temizliği ayrı bir iş.~~ → **ÇÖZÜLDÜ (`9044490` + `b4e8429`, §9)**: Faz 4'te tek kayda indirildi, Faz 6'da o 17 id resmî HSK 5 kelimeleriyle yeniden doldu.
- ~~`exampleService` ile `QuizScreen`'deki `id`→seviye aralıkları **iki yerde tekrar ediyor**~~ → **ÇÖZÜLDÜ (Faz 3.1, `816cb2f`)**: aralıklar artık yalnızca `services/wordRepository.js` içinde.
- **`reviewPool` göçü TEK YÖNLÜ (Faz 3.2, `ea48c61`)** — `@hsk_review_pool` artık `{ wordId, wrongMode [, snapshot] }` saklar. 3.2 öncesi bir sürüme dönülürse eski kod bu şekli okuyamaz (`item.word || item` boş kelime üretir). Geri dönüş gerekirse `@hsk_review_pool` temizlenmeli (o ana kadar biriken yanlışlar gider); dönmeden önce `known-good` etiketinin hangi commit'te olduğuna bak.
- **`HandwritingModal` harici Google `inputtools` servisine bağımlı** (çevrimdışı → `⚠️ No connection` uyarısı). İstek artık `services/handwritingService.js` üzerinden gidiyor ve **9 sn'lik garantili zaman aşımı** var (`⚠️ Timed out (internet slow?)`): yavaş/askıda kalan bağlantıda spinner sonsuza kadar dönmüyor. Hizmet kapanırsa/sözleşmesi değişirse tek dokunulacak yer bu servis.

---

## 17. Faz 13 — hsk1–4'te kelimesini göstermeyen 6 örnek cümle düzeltildi + `expo` 57.0.30

Faz 9 (hsk5) ve Faz 10 (hsk6) "cümle kendi kelimesini birebir içerir" kuralını tam sağladı; hsk1–4'te ise Faz 7 öncesinden kalan **6 kayıt** başka bir kelimenin cümlesini gösteriyordu. Kapsamları tam olduğu için kapsam testine takılmıyorlardı. Genel bütünlük taramasında listelendi ve hepsi yeniden yazıldı (`5146c40`):

| id | kelime | eski cümle (sorun) | yeni cümle |
| --- | --- | --- | --- |
| 27 (hsk1) | 二 | 我有两个苹果。 (kelimede 两 var) | 我有二十个苹果。 |
| 312 (hsk3) | 帮忙 | 请帮我一个忙。 (ayrık kullanım 帮…忙) | 他很愿意帮忙。 |
| 585 (hsk3) | 只有……才…… | 他昨天才回来。 (kalıbın yalnız `才` yarısı) | 只有努力，才能成功。 |
| 606 (hsk4) | 百分之 | 三分之一的学生没来。 (kelimede 三分之一) | 百分之三十的学生没来。 |
| 772 (hsk4) | 合格 | 他考及格了。 (kelimede 及格) | 他考试合格了。 |
| 914 (hsk4) | 内 | 请到里面坐。 (kelimede 里面) | 请在三天内完成。 |

- **Test genişletildi:** `__tests__/exampleService.test.js`'e "Faz 13 pinleri" testi eklendi (altı cümlenin doğru kelimeye bağlı olduğunu kilitler) ve cümle-kelime kuralı **hsk5 + hsk6 → altı seviye** oldu.
- **Kalıp istisnası:** `hanzi`'sinde "……" taşıyan çok parçalı kelimeler kuralın dışında tutulur (250 `虽然……但是……`, 283 `因为……所以……`, 325 `不但……而且……`, 585 `只有……才……`) — notasyon cümlede birebir geçemez. Bu dördünün cümleleri kalıbı zaten doğru gösteriyor; yalnız 585'in cümlesi kalıbı göstermediği için yukarıdaki tabloda yeniden yazıldı.

**Ek olarak `expo` yükseltildi** (`1692806`): `npx expo install --fix` ile **57.0.29 → `~57.0.30`** (SDK 57 patch). Tek değişen paket; `npx expo-doctor` **19/21 → 20/21** (kalan tek kontrol `tsc` script adı çakışması, kod kaynaklı değil — §16).

**Doğrulama:** `npm test` **247 yeşil** (14 suite, +1 yeni test) · lint **0 hata / 15 uyarı** · `tsc` **0 hata** · değişen `.js` dosyaları Babel parse ✅ · `npx expo export --platform android` hatasız.

**Cihaz doğrulaması:** ✅ 2026-10-17 (kullanıcı, Expo Go: "tamamdır çalışıyor") — §16'daki kontrol listesiyle birlikte. `known-good` bu doğrulama kaydını taşıyan doküman commit'ine ilerletildi.

---

## 18. Faz 14 — İstatistik pop-up'ı: temiz açılış + sığan takvim balonu

Kullanıcı bildirimi: *"statistics bölümü açılırken sanki anlık bir bug gibi bir şey oluyor, custom decks veya settings kadar temiz açılmıyor; kapanırken sorun yok."*

**Neden (teşhis):** kartın yüksekliği içeriğe göre belirlenir (`contentCard`: `maxHeight: '85%'`, `modalContainer` içinde ortalanmış). İçerik ise asenkron gelir:

1. Açılışta `statsData` ya **önceki açılıştan kalan** veriydi ya da `null`'du; effect onu `null`'a çekiyordu → kart sırayla **dolu** → **"Loading…" boyutunda küçük** → **dolu** hâle geçiyor, boyut/konum sıçrıyordu.
2. Açılış animasyonu bu **küçük kartta** başlıyor, veri gelince kart büyüyüp yeniden ortalanıyordu → "bozuk/takılıyor" hissi. Ayarlar ve özel deste pop-up'larının içeriği sabit olduğu için onlar temiz açılıyordu.

**Çözüm** (`components/StatsModal.js`, `f5176c7`):

- **Isıtma:** modal Home ile birlikte zaten mount olduğu için `getStats()` + `getCustomDecks()` **pop-up açılmadan önce** yüklenir → kart **ilk açılışta da dolu** gelir.
- **Animasyon kapısı:** içerik hazırsa animasyon **hemen** başlar (kart tam boyutuyla belirir — Faz 4.1'in "hemen belirsin" davranışı korunur). Hazır değilse (nadir: açılışın ilk milisaniyelerinde basıldıysa) animasyon **içerikle birlikte** oynar, kart yarı çizilip sonra büyümez. **150 ms fallback**: okuma çok yavaşlar/başarısız olursa kart yine de (yükleme göstergesiyle) belirir → pop-up **asla görünmez kalmaz**.
- **Bayat veriyi temizleme kaldırıldı:** içerik açılışta `null`'a çekilmez (asıl sıçramanın kaynağı buydu); diskten bir kez daha okunup tazelenir. Aynı düzen, yalnız değerler → boyut değişmez.
- **Ay/gün sıfırlaması açılıştan kapanış sonrasına taşındı** (effect cleanup): açılışta **hiçbir React state güncellemesi kalmaz** ve geçmiş aya bakıp kapatmışken oluşan takvim "zıplaması" da gider; sıfırlama çıkış animasyonu bittikten sonra (kart görünmezken) yapılır.

### Takvim gün balonu kartın dışına taşıyordu (aynı oturumda, doğrulama sırasında bulundu — `19b097c`)

Kullanıcı bildirimi: *"bütün ayı içeren takvimde ortadaki sütüna tıklayınca sağa doğru açılan günlük bilgi kutucuğunun bir kenarı sığmıyor, onu sığan hale getir ve sola doğru açılır yap."*

- **Neden:** balon hücrenin kardeşi olarak `position: 'absolute'` konumlanır ve takvim bir `ScrollView` içindedir — ScrollView taşan kısmı **kırpar**. Yön kuralı `colIdx >= 4 ? sola : sağa` idi; ortadaki sütun (7 sütunun 4.'sü, `colIdx = 3`) sağa açılıyor ve 140 px'lik balon sağ kenardan taşıp kesiliyordu (390 px ekranda ~7 px, 360 px'te ~20 px).
- **Çözüm:** yön ve genişlik artık **ölçülen** grid'den hesaplanır (`heatmapBody` → `onLayout` → `calendarGridWidth`; saf yardımcı `getTooltipLayout`): 0-2. sütunlar sağa, **3-6. sütunlar sola** (ortadaki dâhil) açılır. Seçilen tarafta kalan boşluk 140 px'in altındaysa balon **tam o boşluğa** daraltılır → kenarı hiçbir genişlikte kesilmez (çok dar ekranlarda son satır alt satıra kayar). `minWidth` + `maxWidth` birlikte verilir: Yoga ikisini de kırptığı için sıralama belirsizliği kalmaz.
- **Tek kaynak:** `CALENDAR_COLUMNS`, `CALENDAR_GAP`, `CALENDAR_PADDING`, `TOOLTIP_MIN_WIDTH`, `TOOLTIP_OFFSET` sabitleri hem stil sayfasında hem hesapta kullanılır — stil ile matematik ayrışamaz.
- **Doğrulama:** 320-1024 px arası 13 ekran genişliğinde 7 sütunun tamamı için taşma yok (geçici betik: `%TEMP%\opencode\tooltip-check.js`). 412 px ve üzerinde balon yine doğal **140 px** genişliğinde; yalnızca daha dar ekranlarda daralır.

**Kural (açılış):** bu kart içeriğine göre boyutlandığı için **açılış animasyonu içerik hazır olmadan başlatılmamalıdır**; ileride veri yükleyen yeni bir pop-up eklenirse aynı desen kullanılmalı (ısıt + içerik kapısı + fallback).

**Kural (balon):** bir `ScrollView` içinde `absolute` konumlanan kutu (takvim gün balonu, ileride benzerleri) taşarsa **kırpılır**; yön/genişliği sabit varsaymak yerine ölçülen kutuya göre hesaplayın (`getTooltipLayout` gibi) ve stil sabitlerini tek kaynaktan besleyin.

**Doğrulama:** `npm test` **247 yeşil** · lint **0 hata / 14 uyarı** (StatsModal'ın `set-state-in-effect` uyarısı kalktı) · `tsc` **0 hata** · Babel parse ✅ · `npx expo export --platform android` hatasız.

**Cihaz doğrulaması:** ✅ 2026-10-17 (kullanıcı, Expo Go: "bu sorunlar çözüldü" → temiz açılış · "tamamdır çalışıyor" → takvim balonu) — §16'daki kontrol listesiyle birlikte. `known-good` bu doğrulama kaydını taşıyan doküman commit'ine ilerletildi.

---

## 19. Faz 15 — uygulama ikonu: varsayılan Expo ikonları değiştirildi

Kullanıcı isteği: *"uygulamada hâlâ varsayılan uygulama ikonu kullanılıyor, sıfırdan bir ikon tasarlayabilir misin?"*

**Tasarım:** uygulamanın kırmızı rampasından köşegen geçiş (**#DC2626 → #991B1B**) üzerine krem (**#FBF5EB**) **汉** (hàn = Çince/Çinli) karakteri — Microsoft YaHei Bold, mürekkep kutusu tuvale tam ortalı, 4× supersampling (48 px'te de okunur). Üç aday (kırmızı + 汉 · beyaz kart + kırmızı 汉 · 汉 + tik rozeti) 1024 px taslak olarak çizildi, kullanıcı **A**'yı seçti.

**Üretilen dosyalar (`assets/`; dördü 1024×1024, favicon 96×96):**

| Dosya | İçerik | Not |
| --- | --- | --- |
| `icon.png` | kırmızı geçiş + krem 汉 | **alfa kanalı yok** (RGB) — App Store saydamlığı kabul etmez |
| `android-icon-background.png` | yalnızca kırmızı geçiş | adaptive icon zemini (RGB) |
| `android-icon-foreground.png` | saydam zeminde krem 汉 | mürekkep kutusu 603×586 px → **72/108 dp güvenli bölgesinin (683 px) içinde** |
| `android-icon-monochrome.png` | saydam zeminde **beyaz** 汉 | themed icon; renkli piksel yok (tonu Android uygular) |
| `favicon.png` | yuvarlatılmış köşeli ikon | web |

- **Tek üretici:** `tools/generate-icons.py` — PNG'ler **elle düzenlenmez** (kural `AGENTS.md`'de). Betik `FONT_CANDIDATES` ile platformlar arası font arar, her katmanı 4× çizip LANCZOS ile küçültür; gereksinim `python -m pip install pillow`.
- **`app.json`:** `android.adaptiveIcon.backgroundColor` `#E6F4FE` → **`#B91C1C`** (palet kırmızısı). Zemin görseli de verildiği için launcher onu kullanır; renk, görseli yok sayan durumlar için yedektir.
- **Kod tarafı doğrulama:** `npm test` **247 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `npx expo config --type public` beş asset yolunu da çözüyor · üretilen PNG'lerin boyut/mod/saydamlık/güvenli bölge kontrolü geçti (geçici betik: `%TEMP%\opencode\verify-icons.py`).

**⚠️ Bu değişiklik cihazda doğrulanamaz (Expo Go):** Expo Go her zaman **kendi** ikonunu gösterir; yeni ikon yalnızca bir **EAS build**'inde (Faz 16'dan sonra en kolay yol: `npx eas-cli@latest build --profile preview --platform android` → paylaşılabilir APK) veya store build'inde görünür (web favicon'u hemen değişir). Bu yüzden `known-good` **bu commit için ilerletilmedi** (Faz 16 ile aynı build'de doğrulanacak — §20).

---

## 20. Faz 16 — HanyuPick adı, mağaza kimlikleri, EAS Build yapılandırması ve depo adı

> **⚠️ Bu fazdan sonra iki şey değişti (Faz 18, §22):** GitHub hesabı **`olcanasqar` → `olcanaskar`** olarak yeniden adlandırıldı, dolayısıyla depo adresi **`olcanaskar/hanyupick`** ve paket kimlikleri **`io.github.olcanaskar.hanyupick`** oldu (`f085820`). Aşağıdaki metin o günkü durumu anlatır (tarihsel kayıt).

Kullanıcı EAS Build'in başka ne işe yaradığını sordu; anlatım sonrası istedi: *"tamamdır bunu da halledelim, işimize yarayacak bir şey gibi duruyor"*.

### Ad ve paket kimliği (`d92efe6`) — `app.json`

| Alan | Eskiden | Şimdi |
| --- | --- | --- |
| `expo.name` (ikonun altındaki ad) | `ChineseQuizApp` | **`HanyuPick`** |
| `expo.slug` (Expo/EAS proje adresi) | `ChineseQuizApp` | **`hanyupick`** |
| `android.package` + `ios.bundleIdentifier` | *yok* (EAS ilk build'de sorardı) | **`io.github.olcanasqar.hanyupick`** |

- Ad kullanıcıdan geldi: **汉语 (Hànyǔ = Çince) + pick** — "doğru şıkkı seç".
- Paket adı GitHub hesabının (`olcanasqar`) **ters-DNS** biçimidir (`io.github.olcanasqar` ← `olcanasqar.github.io`): GitHub kullanıcı adları global olarak tek olduğu için bu ad gerçekten benzersizdir (alan adı sahibi olmayanlar için standart yöntem).
- ⚠️ **Paket adı ilk mağaza yayınından sonra değiştirilemez** (yeni paket adı = yeni uygulama; ilerleme/yorumlar taşınmaz). Bu yüzden hiç build yokken sabitlendi — **build/publish öncesi hâlâ değiştirilebilir**.
- **Git deposu da yeni isme taşındı** — adres değişikliği ve uygulama tarafındaki yansıması için bir sonraki başlığa bakın.

### GitHub deposu yeniden adlandırıldı (`12721ef`)

- Depo, **mevcut git kimliğiyle GitHub REST API** üzerinden `olcanasqar/ChineseQuizApp` → **`olcanasqar/hanyupick`** olarak yeniden adlandırıldı (`gh` CLI makinede kurulu değil; token hiçbir çıktıya basılmadı). Private kaldı, varsayılan dal `main`.
- Açıklama: **"HanyuPick - HSK 1-6 Chinese vocabulary quiz app built with Expo and React Native"**; topics: `expo`, `react-native`, `chinese`, `hsk`, `vocabulary`, `language-learning`, `quiz`.
- GitHub eski adresi **yönlendirir** (eski linkler çalışmaya devam eder), ama yerel `origin` yine de yeni adrese çevrildi: `git remote set-url origin https://github.com/olcanasqar/hanyupick.git` (hook'un push'u yeni adresle doğrulandı).
- Uygulama tarafı: `components/SettingsModal.js` `REPOSITORY_URL` → yeni adres; `package.json` + `package-lock.json` adı → `hanyupick` (npm adı yalnızca kozmetik: `npm test` çıktısında görünür, davranışı etkilemez).
- **Yerel klasör adı DEĞİŞMEDİ** (`C:\Projects\App\ChineseQuizApp`): Windows, çalışan bir terminalin içinde durduğu klasörün adlandırılmasına izin vermez; ayrıca klasör adı tüm yedek komutunu ve doküman yollarını etkiler. Kullanıcı isterse (terminal klasörden çıktıktan sonra) ayrı bir iş olarak yapılabilir — o zaman yedek arşiv adı da `hanyupick-backup-*.tar.gz` olur.

### `eas.json` (`bf3e7a2`)

- **`preview`** → **internal dağıtım**: paylaşılabilir **APK** (indirme linki/QR; Play Store gerekmez). Yeni ikonu, uygulama adını ve paket adını telefonda görmenin en kısa yolu.
- **`production`** → mağaza build'i (Android'de **AAB**) + `autoIncrement`. `cli.appVersionSource: "remote"` ile `versionCode`/`buildNumber` **EAS'te** tutulur (yerelde hiç yoksa EAS ilk build'de 1'den başlatır) → `app.json`'da elle sürüm artırma yok.
- **`submit.production.android.track: "internal"`** → ilk Play yüklemesi internal testing track'ine gider (vitrine çıkmak için track değiştirilir). iOS tarafı ilk submit'te `appleId`/`ascAppId` gibi bilgileri interaktif sorar.
- **Neden `development` profili yok:** `developmentClient: true` **`expo-dev-client`** bağımlılığını şart koşar; kullanıcı şimdilik istemedi (test döngüsü Expo Go'da kalıyor). Native modül eklenmesi gerekince: `npx expo install expo-dev-client` + profil tanımı.
- **Neden EAS Update (`expo-updates`) yok:** kurulması yeni bir build gerektirir (kanal/runtime version build'in içine gömülür); şimdilik gerek yok. İstenirse ayrı bir iş olarak yapılır.

### Doğrulama

`npm test` **247 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `app.json` + `eas.json` JSON geçerli · `npx expo config --type public` adı/slug'ı/`package`/`bundleIdentifier`'ı çözüyor · `npx expo-doctor` **20/21** (tek başarısız kontrol yine `tsc` script adı çakışması — §16; ilk denemede iki kontrol "server response" hatasıyla düştü, `--verbose` ile tekrarlandıklarında **geçtiler** → şema denetimi temiz).

**⚠️ Cihaz doğrulaması (Expo Go) mümkün değil:** Expo Go kendi adını/ikonunu gösterir. Ad/paket/ikon yalnızca bir **EAS build**'inde görünür → `known-good` bu commit'ler için ilerletilmedi (§16).

### EAS projesi bağlandı (`972280c`, 2026-10-17)

- `npx eas-cli@latest login` → hesap **`olcanaskar`** (Expo; GitHub hesabı `olcanasqar` ile **bir harf farklı**).
- `npx eas-cli@latest init` → **`@olcanaskar/hanyupick`** oluşturuldu/bağlandı, ID **`ea29583b-1b9a-43c1-8d61-6915c3745c27`** (`https://expo.dev/accounts/olcanaskar/projects/hanyupick`). CLI `app.json`'a **`owner`** + **`extra.eas.projectId`** yazdı ve **proje ikonunu uygulama config'inden ayarladı** (yani `assets/icon.png` EAS tarafında da geçerli/okunur). İlk build için EAS projesinin ikon/asset'lerini hazırlamak gerekmez: adımlar tamam.

### Kullanıcıda bekleyen sonraki adımlar

```bash
npx eas-cli@latest build --profile preview --platform android    # ikon + ad telefonda; APK linki paylaşılabilir
npx eas-cli@latest build --profile production --platform android # mağaza için AAB
npx eas-cli@latest submit --platform android                     # ilk yükleme: internal track
```

APK build'i sırasında "Generate a new Android Keystore?" sorusuna **evet** denir (imza anahtarı EAS'te saklanır).

---

## 21. Faz 17 — Ayarlar'daki GitHub bağlantısı standalone APK'da açılmıyordu

Kullanıcı bildirimi (preview APK, cihazda): *"settings kısmında github reposu kısmına tıklayınca could not open link / no app on this device can open the repository page diye uyarı veriyor."* — telefonda tarayıcı olmasına rağmen.

**Kök neden (kanıtlı):** uyarı `components/SettingsModal.js`'in **`Linking.canOpenURL()` ön kontrolünden** geliyordu (o dal `false` dönerse "No app on this device…" çıkar; kod `catch`'e düşseydi mesaj "Please try again later." olurdu — görülen mesaj dallanmayı kesinleştirir).

- RN kaynağı (`node_modules/react-native/ReactAndroid/.../IntentModule.kt`): `canOpenURL` → `intent.resolveActivity(packageManager) != null`.
- **Android 11+ (SDK 30) paket görünürlüğü:** `resolveActivity`/`queryIntentActivities` sonuçları filtrelenir; uygulamanın manifest'i tarayıcıyı bir `<queries>` bloğuyla bildirmiyorsa sonuç **null** → `canOpenURL` **false**.
- **Neden Expo Go'da çalışıyordu:** Expo Go'nun kendi manifest'i https/VIEW sorgusunu bildirir; standalone APK'nın manifest'i (CNG şablonu) bunu garanti etmiyor. Yani hata Expo Go'da **hiç görünmez**, ilk standalone build'de çıkar.

**Çözüm (`863b470`):** ön kontrol **kaldırıldı**, URL doğrudan `Linking.openURL()` ile açılıyor. `openURL` bu filtreden etkilenmez: niyeti `startActivity` ile başlatır ve `resolveActivity`'yi yalnızca NEW_TASK bayrağına karar vermek için kullanır (aynı kaynak dosyada görüldü). `openURL` yine de reddederse (gerçekten hiçbir tarayıcı yoksa) adres **`expo-clipboard` ile panoya kopyalanır** (paket zaten bağımlılık; `CustomDeckModal` kullanıyor) ve uyarı adresi gösterir → kullanıcı adresi tarayıcıya yapıştırabilir. Hiçbir yeni bağımlılık, manifest/config değişikliği veya plugin eklenmedi.

**Kural (AGENTS.md'de):** `Linking.openURL` asla `Linking.canOpenURL` ön kontrolünün arkasına konmaz — Android 11+'da standalone build'de yanlış negatif verir; gerekirse `<queries>` gerekir, ama basit bağlantılar için doğrudan `openURL` + `catch` yeterlidir.

**Doğrulama:** Babel parse ✅ · `npm test` **247 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata**.

**⚠️ Cihaz doğrulaması yeni bir build gerektirir:** değişiklik JS tarafında ama Expo Go'da bu hata **zaten görünmüyor** (yukarıdaki neden), dolayısıyla yeni bir `preview` APK ile denenmeli. Repo **private** olduğu için telefonda GitHub "sign in / 404" gösterebilir — bu beklenen davranış (buton yalnızca adresi açar).

---

## 22. Faz 18 — İkon karakteri küçültüldü, sabit splash ekranı, GitHub hesabı `olcanaskar`

Kullanıcı preview APK'yı kurduktan sonra dört isteği birlikte iletti: *"uygulama iconuncaki karakter biraz büyük kalıyor kaylaşık yüzde 70 seviyesine küçülürse daha iyi olur, uygulama açılırken anlık bir expo go'dakine benzer bir ekran gelip gidiyor ve uygulama düzgünce çalışıyor, bunun yerine yaklaşık 1 saniyelik sabit bir ekranda uygulama icon'unun olduğu yükleme ekranı olsa daha iyi olur, bu yükleme ekranının da arka planı uygulamanın home ekranının arka planıyla aynı renk olursa güzel durur. onun dışında github hessabımın ismini olcanasqar'dan olcanaskar'a değiştirip uygulamamnın içindeki github reposuna yollayan linki de ona göre düzenler misin."*

### 1. İkon karakteri %70'e küçültüldü (`05edc7f`)

`tools/generate-icons.py` içindeki `GLYPH_SCALE` **0.60 → 0.42**; mürekkep kutusu **603×586 → 423×411** px. İstenen oran tam tutuyor (423 / 603 = **0.70**) ve Android'in 72/108 dp güvenli bölgesine (683 px) bol pay kalıyor; mürekkep kutusu yine tam ortada (merkez 512.5, 511.5). `assets/` içindeki PNG'lerin hepsi (bu fazda eklenen `splash-icon.png` dahil) **tek üreticiden** çıkar — elle düzenlenmez. Doğrulama: `icon.png` **RGB, alfa yok** ✓ · ön katman güvenli bölgede ✓ · monochrome **tek renk** (beyaz) ✓.

### 2. Sabit ~1 saniyelik splash ekranı (`affb4fe`)

Eskiden `app.json`'da hiç splash ayarı yoktu; CNG şablonunun stok ekranı bir an görünüp kayboluyordu ("anlık gelip giden ekran"). Yapılanlar:

- **`npx expo install expo-splash-screen`** (Expo Go'da da hazır gelen bir Expo modülü → test döngüsü bozulmadı, `expo-dev-client` gerekmedi).
- **`app.json` plugin ayarı:** `backgroundColor` **`#FBF5EB`** (Home'un zemini ve `AppTheme.background`/`cardStyle` ile **aynı** → splash'tan ana ekrana geçişte renk sıçraması yok), `image` `./assets/splash-icon.png` (ikonun yuvarlatılmış köşeli hâli, üretici betikten), `imageWidth` 180, `resizeMode` `contain`.
- **`App.js`:** `SplashScreen.preventAutoHideAsync()` **modül kapsamında** çağrılır (Expo dokümanı: bileşen içinde çağrılırsa splash çoktan gizlenmiş olabilir), `setOptions({ duration: 300, fade: true })`, sonra `SPLASH_MIN_MS = 1000` sonra `hideAsync()`. Her iki çağrı da hata yutar → splash sorunu uygulamanın açılmasını **asla** engellemez.
- **Doğrulama (native taraf):** `npx expo prebuild --platform android` → `colors.xml`: `splashscreen_background #FBF5EB`; `styles.xml`: `windowSplashScreenBackground` + `windowSplashScreenAnimatedIcon = @drawable/splashscreen_logo` + `postSplashScreenTheme` ✓.
- **Beklenen fark:** Android 12+ sistem splash ikonunu **daireye kırpar** (kırmızı disk üzerinde krem 汉), iOS'ta yuvarlatılmış köşeli ikon görünür. İkisi de tasarımla uyumludur.
- Not: prebuild sırasında çıkan `userInterfaceStyle: Install expo-system-ui` uyarısı bu fazdan **önce de vardı** (bağımsız; `app.json`'daki `userInterfaceStyle: "light"`).

### 3. GitHub hesabı `olcanasqar` → `olcanaskar` ve kimliklerin uyarlanması (`460dd12` + `f085820`)

- **Hesap adı yalnızca tarayıcıdan değiştirilebilir:** GitHub API'de kullanıcı adını değiştiren bir alan yoktur (`PATCH /user` yalnızca `name` gibi görünen alanları yazar). `olcanaskar` adının **müsait** olduğu `GET https://api.github.com/users/olcanaskar` → **404** ile önceden doğrulandı. Adım: `github.com/settings/admin` → *Change username*.
- **`components/SettingsModal.js`** `REPOSITORY_URL` → **`https://github.com/olcanaskar/hanyupick`** (`460dd12`). Adres ancak hesap yeniden adlandırıldıktan sonra çözülür.
- **Paket kimlikleri** (kullanıcı onayıyla): `io.github.olcanasqar.hanyupick` → **`io.github.olcanaskar.hanyupick`** (`f085820`, hem `android.package` hem `ios.bundleIdentifier`). `io.github.` öneki **korundu**: GitHub adları global tek olduğu için bu, ad alanının sana ait olduğunu garanti eder ve açık kaynak uygulamaların standardıdır (kullanıcı "sadece olcanaskar.hanyupick olsa olmaz mı" diye sordu; teknik olarak geçerli ama o garantiyi kaybettirdiği için öneri `io.github.` oldu ve kullanıcı onayladı). App **yayınlanmadığı için** bu değişim hâlâ serbestti — ilk mağaza yayınından sonra **asla** değiştirilemez.
- **Etki:** paket adı değiştiği için yeni APK telefonda **ayrı bir uygulama** olarak kurulur; eski preview APK'sı silinmelidir (ilerleme verisi de taşınmaz).
- ✅ **Hesap değişimi yapıldı, yerel depo uyumlandı (2026-10-17):** kullanıcı hesabı `github.com/settings/admin` → *Change username* ile `olcanasqar` → **`olcanaskar`** yaptı. Doğrulama: `GET /users/olcanaskar` → **200** ("Olcan Askar"), `GET /users/olcanasqar` → **404**; `git remote set-url origin https://github.com/olcanaskar/hanyupick.git` sonrası `git ls-remote origin main` ve `git push origin main` (`Everything up-to-date`) **başarılı** — depo private olduğu için bu, GCM kimliğinin yeni adreste de çalıştığını kanıtlar. `known-good` etiketi yeni adresten de görünüyor (`7372699`). `post-commit` hook'ta **sabit adres yok**, `origin` kullanılıyor → otomatik push artık yeni adrese gidiyor. ⚠️ Eski ad (`olcanasqar`) artık bir kullanıcıya ait görünmüyor; eski adrese giden yer imleri yeni adresle değiştirilmeli (uygulama içi link zaten yeni adresi gösteriyor).

**Doğrulama:** Babel parse ✅ · `npm test` **247 yeşil** · lint **0 hata / 14 uyarı** · `tsc` **0 hata** · `expo prebuild` splash zeminini ve drawable'ı üretti ✅.

**⚠️ Cihaz doğrulaması bir sonraki `preview` build'ini bekler:** ikon boyutu, splash ve paket kimliği **native değerlerdir** — Expo Go'da görünmezler (§19, §20 ile aynı sınır).

---

## 23. Faz 19 — Depo public: README, MIT lisansı, CI ve GitHub vitrini

Kullanıcı: *"github reposunu uygulamayı tanıtacak şekilde diğer opensource uygulamalarda olduğu gibi yapabilir misin"* — depo artık yalnızca bir kod kasası değil, uygulamanın vitrini.

### 1. `README.md` — front page (`fcce135`)

**İngilizce** yazıldı (arayüz de İngilizce; vitrin uluslararası okunur). Bölümler: tanıtım + rozetler · "neden başka bir HSK uygulaması" · **özellik tablosu** (6 yön / 3 sekme, şıklar aynı seviyeden ve tekrarsız, Review the Wrongs, özel desteler, sözlük + el yazısı, istatistik, 🔊, ayarlar) · **kurulum** (`npm install` + `npx expo start --go` — **native build gerekmez**, özel native modül yok) · kontrol komutları · EAS profilleri · ikon/splash üreticisi · **proje yapısı tablosu** · **veri kuralları** (kelime id'leri kimliktir → göç tabloları; özel deste JSON şekli örnekle; "her örnek cümle kendi kelimesini içerir" garantisi ve desen kelimesi istisnası) · **gizlilik** · katkı · teşekkür · lisans.

- **Gizlilik bölümü bilinçli olarak var:** cihazdan çıkan **iki** şey açıkça yazılı — el yazısı pedi (`Draw`) kargıyı **Google Input Tools**'a gönderir, 🔊 **cihazın TTS motorunu** kullanır. Hesap, sunucu, analitik yok; ilerleme cihazda (AsyncStorage).
- Rozetler: **CI** (kendi iş akışımız), **MIT**, **Expo SDK 57**, **React Native 0.86**, platformlar. Test sayısı rozeti **bilinçli olarak yok** (her test değişiminde elle güncellenmesi gerekirdi).
- **Ekran görüntüleri bölümü sonradan eklendi** — kullanıcı kendi telefonundan 8 kare gönderdi (§23.6).

### 2. `LICENSE` — MIT

Kullanıcı seçti: **MIT © 2026 Olcan Askar**. GitHub depoyu MIT olarak tanıdı (`GET /repos/olcanaskar/hanyupick` → `license.spdx_id = "MIT"`).

### 3. `.github/workflows/ci.yml` — otomatik kapı

`main`'e her push ve her PR'da: `actions/checkout@v4` + `actions/setup-node@v4` (**Node 22**, npm cache) → `npm ci` → `npm run lint` → `npm run tsc` → `npm test`. **İlk koşu ✅ başarılı** (`fcce135`, run `39047634716`, ~3 dk). Açık kaynak projelerde katkıdan önce beklenen kapı budur ve README'deki CI rozeti gerçek durumu gösterir.
- `expo-doctor` **bilinçli olarak iş akışında yok**: bilinen `tsc` script adı çakışması yüzünden 20/21 dönüp exit 1 verir (§16).
- Windows'ta üretilen `package-lock.json` Linux runner'da sorunsuz çalıştı: platforma özel opsiyonel paketler zaten lock dosyasında durur, `npm ci` doğru olanları kurar.

### 4. Depo ayarları (GitHub API)

Token GCM'den (`git credential fill`) alındı, hiçbir çıktıya basılmadı. `PATCH /repos/olcanaskar/hanyupick` → **`private: false`** + yeni About açıklaması + `has_issues: true`; `PUT /repos/.../topics` → `expo, react-native, chinese, hsk, vocabulary, language-learning, quiz, flashcards, offline, javascript`.

- **Public yapmadan önce sır taraması** yapıldı (`git grep -i` ile token/parola/anahtar desenleri, `package-lock.json` hariç): bulunan tek şey HSK kelime örnekleriydi (密码 "password", 秘密 "secret") ✓. `.gitignore` zaten `node_modules`, `dist`, `android/`, `ios/` ve anahtar uzantılarını dışlıyor (72 izlenen dosya).
- ⚠️ **Yan etkiler:** kod + commit geçmişi herkese açık — commit yazarı e-postası (`aabdullaholcan@gmail.com`) geçmişte görünür (GitHub'da e-posta gizliliği açılırsa arayüzde gizlenir, git metadata'sında kalır). Ayarlar'daki **GitHub satırı artık herkes için gerçek depo sayfasını açar** (private iken "sign in / 404" gösterirdi, §22).
- **API'den yapılamayanlar (elle):** GitHub *social preview* görseli yalnızca web arayüzünden yüklenir — istenirse Settings → *Social preview*'e `assets/icon.png` konabilir.

### 5. README yeniden düzenlendi — kullanıcı yolu artık **APK indirmek** (`d1c47d5`)

Kullanıcı: *"build'i yapınca github'a ekleyeceğiz o yüzden repo'da expo go ile kullanılma kısmına gerek yok, son kullanıcı apk indirip kullanıcak"*. Yani repo'nun ilk okuyucusu **geliştirici değil, kullanıcı**: sıradaki `preview` build'i bir **GitHub Release**'e APK olarak eklenecek ve indirme yolu README'nin en başında duracak.

- **Yeni `## Download & install` bölümü** (ilk bölüm): "Download APK" rozeti → `https://github.com/olcanaskar/hanyupick/releases/latest` + 3 adımlık akış — APK'yı indir (Android **7.0+**; `minSdkVersion` **24**), dosyayı aç, "bilinmeyen kaynaklardan kurulum" iznini ver; hesap/kayıt yok, **kütüphane APK'nın içinde**, her şey çevrimdışı.
- **Expo Go artık yalnızca geliştirici bölümünde:** eski `## Getting started` → `## Building from source` ("yalnızca geliştirme, katkı veya iOS build'i için — uygulamayı kullanmak için yukarıdaki APK yeterli"); Expo Go/QR talimatları ve "özel native modül yok" açıklaması buraya taşındı.
- **`### Checks`** altında üç komutun **CI'da da** koştuğu yazılı; eski "Building with EAS" → **`### Releasing`** ve **Releases sayfasındaki APK'nın `preview` profilinden çıktığı** açıkça belirtiliyor (build → APK → GitHub Release zinciri dokümanda bağlandı).
- **Platform iddiası dürüstleştirildi:** eski "Android | iOS" rozeti yerine **"Download APK (release)"** ve metinde "iOS build'i henüz yok, kaynaktan derlenmeli". Ekran görüntüleri bölümü hâlâ yok (cihaz yok, §23.1).
- ⚠️ **Bağlantı şu an boş:** `releases/latest` ilk release yayınlanana kadar GitHub'ın "no releases" sayfasını gösterir — **sıradaki iş build sonrası release'i oluşturmak** (APK'yı release asset'i olarak ekle; EAS'ın indirme linki ~30 gün sonra dolar, kalıcı yol release'dir).

### 6. Ekran görüntüleri bölümü — gerçek cihazdan (`f40f271`)

Kullanıcı telefonundan **8 kare** gönderdi (`C:\Users\Olcan Askar\Pictures\app`; WhatsApp JPEG'leri, 945×2048, 65–97 KB). Repoya anlamlı adlarla kopyalandı (`docs/screenshots/`): `home`, `quiz-hanzi-to-pinyin`, `quiz-hanzi-to-english`, `quiz-pinyin-to-english`, `vocabulary`, `handwriting`, `statistics-mastery`, `statistics-calendar` — toplam **646 KB**.

- Kareler uygulamanın **tamamını** kapsıyor: Home (seviye seçici + Review / özel deste / sözlük / istatistik kartları), üç quiz yönü (Header'ın üç sekmesi), sözlük listesi (arama + seviye çipleri + 🔊), **el yazısı pedi** (你 elle çizilmiş, aday satırı görünür) ve istatistik pop-up'ının iki yarısı (seri rozeti + seviye başına ustalık çubukları; 7 günlük şerit + takvim + ısı lejantı).
- README'de **4×2 HTML tablo**, görseller `width="200"` (satır genişliği taşmasın diye), altlarında `<sub>` başlıklar; bölüm **"Download & install"dan hemen sonra** duruyor ki indirme yolu ilk sırada kalsın.
- Not satırı eklendi: *"Screenshots taken on a phone running the APK published above. The levels are empty because the phone had a fresh install."* — karelerde ilerleme %0 göründüğü için yanlış izlenim doğmasın.
- ⚠️ **Bu klasör uygulama varlığı değil:** `assets/` ikon/splash içindir ve tek üreticisi `tools/generate-icons.py`; README galerisi `docs/screenshots/` altında durur ve elle eklenir (AGENTS.md yapı tablosuna yazıldı). Yeni kare gerekirse kullanıcıdan istenir — makinede cihaz/emülatör yok.
- Dürüstlük notu: kareler **WhatsApp'tan geçtiği için yeniden sıkıştırılmış** (orijinal 1080×2400 PNG değil) — README vitrini için yeterli, ama **Play mağaza görseli** gerektiğinde orijinal çözünürlükte PNG istenmeli.

**Doğrulama:** README/LICENSE/CI commit'i `fcce135`, APK-öncelikli README commit'i `d1c47d5`, ekran görüntüsü galerisi `f40f271` · CI **✅ success** (`fcce135`, `2a692ac` yeşil) · **247 test yeşil** · lint 0 hata / 14 uyarı · `tsc` 0 hata. Uygulama kodu değişmediği için **cihaz doğrulaması gerekmez**.

---

## 24. Faz 20 — ilk `preview` APK build'i ve GitHub Release (`v1.0.0`)

Faz 19'un ardından kullanıcı: *"build'i yapınca github'a ekleyeceğiz o yüzden repo'da expo go ile kullanılma kısmına gerek yok, son kullanıcı apk indirip kullanıcak"* dedi ve build'i başlatma onayını verdi. Zincir: **build → APK → GitHub Release → kullanıcı telefona kurar**.

### 1. Build

`npx eas-cli@latest build --profile preview --platform android --non-interactive --no-wait --json`

| | |
| --- | --- |
| Build ID | `7f40e0bd-caae-4268-b4d4-21a27264e4f8` |
| Durum | **FINISHED** (~10 dk; 19:33 → 19:43) |
| Sürüm | 1.0.0 / versionCode **1** |
| Paket | `io.github.olcanaskar.hanyupick` |
| Commit | `1051b53` |
| APK | 87.416.435 bayt (83,4 MB) · sha256 `cd6acd3ac5977b9abe7d88e7087cf60ec0d637ffcedf3ca449c1f69e1ddcefe3` |
| Loglar | https://expo.dev/accounts/olcanaskar/projects/hanyupick/builds/7f40e0bd-caae-4268-b4d4-21a27264e4f8 |

**"Created keystore" uyarısı açıklandı:** EAS, Android imzalama anahtarını ve uzak `versionCode`'u **paket adına** göre saklar; önceki build `io.github.olcanasqar.hanyupick` içindi (Faz 16) → yeni paket adına yeni keystore üretildi ve versionCode 1'den başladı (§16). Sonuç: yeni APK telefonda **ayrı uygulama** + farklı imza → eski test APK'sı **elle silinmeli**, veri taşınmaz. Bundan sonraki tüm build'ler ve Play AAB'si **bu** anahtarla imzalanır.

### 2. APK'yı yayımlamadan önce doğrulama

- `PK` ZIP imzası ✓ · 1234 girdi · `META-INF/androidx.core_core-splashscreen.version` var (splash entegrasyonu paketin içinde) ✓.
- **Paket adı kontrolü `AndroidManifest.xml` string pool'unda yapılmalı:** ad AXML'de **UTF-16** kodlanır, 8-bit (`ISO-8859-1`) aramada **bulunamaz** — ilk denemede "paket adı yok" yanlış alarmı bu yüzden çıktı. UTF-16 aramada `io.github.olcanaskar.hanyupick` **var**, `io.github.olcanasqar.hanyupick` **yok** ✓.
- APK, EAS artefakt bağlantısından indirildi — bağlantı **kimlik doğrulaması istemez**, imzalı CDN adresine yönlenir (test edildi).

### 3. GitHub Release

- Release **id `415935932`**, etiket **`v1.0.0`** → commit `1051b53`; ad *"HanyuPick 1.0.0 - first APK release"*; **draft/prerelease değil** (README'nin `releases/latest` bağlantısı yalnızca tam sürümü görür).
- Asset **`hanyupick-1.0.0.apk`** (87.416.435 bayt) — README "`hanyupick-*.apk`" dediği için ad bilinçli bu biçimde; yükleme `POST /repos/.../releases/{id}/assets?name=…` ile yapıldı.
- Notlar: kurulum (Android **7.0+**), "yeni paket adı → eski build'i elle sil" uyarısı, özellik listesi, gizlilik, **build bilgileri tablosu** (sürüm/commit/paket/minSdk/boyut/sha256/imza profili) ve iOS'un indirilebilir olmadığı notu.
- **Doğrulama:** `GET /releases/latest` → `v1.0.0` ✓ · `github.com/.../releases/latest` → `…/releases/tag/v1.0.0` (HTTP 200) ✓ · asset bağlantısı kimliksiz **HTTP 200 / 87.416.435 bayt** ✓ · yerel `v1.0.0` etiketi `git fetch origin --tags` ile alındı ✓.

### 4. Sıradaki cihaz doğrulaması (kullanıcı)

Telefondan `https://github.com/olcanaskar/hanyupick/releases/latest` → `hanyupick-1.0.0.apk` → "bilinmeyen kaynaklardan kurulum" izni. **Eski APK (farklı paket adı + imza) önce silinmeli.** Kontrol listesi §16'daki Faz 16–18 listesiyle aynı; bu build'in yenileri: **~1 sn krem splash** (renk sıçraması yok; Android 12+'da ikon daire içinde), ikon karakterinin küçüklüğü, ad **HanyuPick**, Ayarlar → GitHub satırı **public depoyu** açıyor (artık giriş/404 yok).

**CI notu:** bu fazda CI koşmadı ve gerekmiyor — depo commit'i yok; build, CI'ın yeşil olduğu `1051b53`'ten çıktı.

---

## 25. Faz 21 — mağaza tarzı vitrin görselleri + Statistics'ta örnek ilerleme

Kullanıcı Faz 20'deki galeriyi **mağaza vitrinine** çevirmek istedi. İki istek: (1) karelerde **telefonun sistem çubukları görünmesin** (saat/bildirim üstte, üç tuşlu gezinme çubuğu altta) ve görseller *"başka bir telefondan çekilmiş gibi"* dursun — yani çerçeve + başlık; (2) **Statistics karesi boş kalmasın**, ilk iki HSK seviyesi tamamen ustalaşılmış ve HSK 3 yarıda olan gerçekçi bir ilerleme görünsün.

### 1. Tek üretici betik (ikon kuralının aynısı)

`tools/generate-icons.py` gibi: görseller **elle düzenlenmez**. Yeni **`tools/generate-store-screenshots.py`** (Python 3 + Pillow) `docs/screenshots/*.jpg` dosyalarını üretir; **ham cihaz kareleri `docs/screenshots/raw/`** altında kanıt olarak durur (git geçmişi `git mv` ile korundu). Çıktı: **1080×1920 JPEG** — krem (#FBF5EB) zemin, soluk 汉字 dekoru, 汉 rozeti + "HanyuPick" + tek satır İngilizce başlık, telefon çerçevesi (ekran oranı **0.461** korunur, yani kare kırpılmaz).

| Adım | Ne yapar |
| --- | --- |
| Sistem çubukları | Durum çubuğu (y 0–98) ve gezinme çubuğu (y 1932–2048) **sütun sütun** doldurulur. Üstte dolgu, çubuğun hemen altındaki banttan; altta **çubuğun kendi zemininden** (y 1934–1952; simgeler ~1960'ta başlar) okunur ki uygulama penceresi ile çubuk arasındaki sınır korunsun. Doygun renkli sütunlar (ör. gezinme çubuğunda **kesilen** renkli düğme, sözlükteki 🔊) güvenli nötr renge düşer ve sütunlar yatay medyanla yumuşatılır — yoksa aşağı doğru renkli bir şerit oluşuyordu. |
| Çerçeve + başlık | 945×2048 kare 700×1517'ye ölçeklenir (LANCZOS), yuvarlak köşeli ekran + 15 px çerçeve + 2 px iç çizgi + gölge + delikli kamera; kare tamamen KORUNUR (kırpma yok). |
| Tanıtım verisi | Yalnızca iki Statistics karesinde (aşağıda). Diğer 6 kare uygulamanın gerçek ekranıdır. |

### 2. Örnek ilerleme (yalnızca Statistics kareleri)

Veriler uygulamanın **kendi kurallarına** uyar — kaynak `services/statsManager.js` (MASTERY_STREAK = 3, altı yönün hepsi) ve `components/StatsModal.js` (renkler, ölçüler, metinler):

- **Ustalık:** HSK 1 **150/150 (100%)**, HSK 2 **150/150 (100%)**, HSK 3 **150/300 (50%)**, HSK 4–6 **0** (kullanıcı isteği). Çubuk renkleri `LEVEL_COLORS`, sayaç `#7F8C8D`, sağa hizalı.
- **Seri:** **38 Days Streak** + "Keep the momentum going!". Uygulamada `streak.current <= 1` iken ateş `opacity: 0.2` ile **soluk**; görselde ateş `(p − 0.8·zemin) / 0.2` ile **geri kazanılır** — yani kare uygulamanın kendi emojisini taşır, yeniden çizilmez.
- **7 günlük şerit (11–17 Ekim) ve Ekim takvimi (1–17 Ekim) AYNI günlük veriyi gösterir** (tutarlılık şart): ısı renkleri `HEAT_COLORS` eşiklerinden (0 / ≤10 / ≤25 / ≤50 / >50) çıkar, böylece açık pembeden koyu kırmızıya karışık ve inandırıcı bir desen oluşur. 17 Ekim (bugün, Cumartesi) uygulamanın kendi kırmızı çerçevesini taşır.
- Koyu hücrelerdeki rakamlar **beyaza** döner: rakam yeniden çizilmez — parlaklıktan **kapsama oranı** kestirilip hedef renkle birleştirilir, yazı tipi birebir aynı kalır. (İlk denemede formül `text_lum`'a bölüyordu; beyaz hedefte bölen işaret değiştirip rakamı siliyordu → `bg − dark` ile düzeltildi.)
- **Font kalibrasyonu:** betik, uygulamanın gerçek render'ının **mürekkep kutusunu** hedefler (cihazın yazı tipi ölçeği büyük: 12dp ≈ 30 px em). Seçim: sayaç `"0/150 (0%)" 145×27` → **Segoe UI Semibold 30**; seri `"0 Days Streak" 289×46` → **Segoe UI Bold 46**; alt yazı `313×30` → **Segoe UI 30**; şerit sayıları 11dp → **Segoe UI Bold 28**. Metinler `draw_text_ink()` ile mürekkep kutusuna hizalanır (aşağı/yukarı kaymaz). Kare içindeki 汉字 (başlık rozeti) Microsoft YaHei Bold.
- **Kesilen şerit:** `statistics-mastery.jpg` karesinde şerit, modalın kaydırma penceresinin (y 1805) altında kalır → uygulamanın gösterdiği gibi **yalnızca yeşil sayı + ayraç** çizilir, kırmızı sayı çizilmez.

### 3. Dürüstlük kuralı

README'deki galeri notu bunu açıkça söyler: **çerçeveler/başlıklar mockup**, **iki Statistics karesi örnek veri** taşır (uygulama boş başlar), ham kareler `docs/screenshots/raw/` altındadır. **Sahte veri uygulamanın içine hiç girmedi** — yalnızca görüntüye çizildi; hiçbir `services/`/`screens/`/`components/` dosyası değişmedi.

### 4. Doğrulama

Betik `.js`/JSX'e dokunmadığı için Babel parse gerekmedi; `npm test` (247) + `npm run lint` (0 hata) + `npm run tsc` (0 hata) yeşil. Görseller üretildikten sonra gözle doğrulandı; `--debug` ile kırpma/veri bölgeleri `dist/store-debug/` altına yazılır (gitignored). Yeni kare gerektiğinde: ham dosyayı `raw/` altına koy, ölçüleri (`STATUS_BAR_H`, `NAV_BAR_TOP`, `MASTERY_ROWS`, `PILL_*`, `CAL_*`) yeniden ölç, betiği çalıştır.

**Kullanıcı onayı (2026-10-17):** görseller beğenildi. Kullanıcı görsellerin **uygulama dosyası gibi değil, yalnızca deponun tanıtım bölümünde** kullanılmasını istedi → `docs/` altında kalırlar, `assets/` klasörüne girmezler, hiçbir uygulama/`app.json`/`eas.json` referansı yoktur; bu kural AGENTS.md + README'ye yazıldı (`3b0b797`). Aynı mesajda *"known-good'u da sona çekebilirsin"* dedi → etiket bu fazın sonuna ilerletildi (§29) ve tek yedek arşivi tazelendi.

**Commit'ler:** `10ac80c` (betik + 8 vitrin görseli + README/AGENTS/NOTES) · `3b0b797` (galeri uygulamaya girmez). CI **✅ success** (`10ac80c`, `3b0b797`).

**2026-10-17 (ek, düzeltme):** Kullanıcı "bu yeni 3 screenshot answered dosyaları değildi" dedi ve mod seçme ekranındaki **yön okunun farklı** olduğunu (kategori sekmeleri aynı ama iç mod forward/reverse farklı) açıkladı. Piksel kanıtıyla da doğrulandı: mod sekmeleri aynı kategoriyi gösteriyor, ama soru/options bölgesi mevcut 3 modun *ters* yönüne (pinyin→hanzi, english→hanzi, english→pinyin) ait. Dolayısıyla 3 yeni ekran **farklı modlar** (eksik 3 mod), "yanıtlanmış varyant" değil. Dosyalar yeniden adlandırıldı: `quiz-hanzi-to-{pinyin,english}-answered` → `quiz-{pinyin,english}-to-{hanzi,hanzi,pinyin}` (raw + showcase). README galeri tablosu yeniden düzenlendi: 6 mod sıralı (hanzi→pinyin, pinyin→hanzi, hanzi→english, english→hanzi, pinyin→english, english→pinyin) + home/vocabulary/handwriting/2 stats = 11 görsel. Betik `SCREENS` listesi güncellendi. CI yeşil. known-good bu commit'e ilerletildi (docs-only).

---

## 26. Faz 22 — TypeScript dönüşümü (mantık modülleri + testler + örnek veriler)

Amaç ders projesi kriterlerinden biriydi (*"TypeScript migrasyonu — en azından mantık modülleri ve testler"*). Kapsam bilinçli olarak **mantıkla** sınırlandı: `services/` (14 dosya), `__tests__/` (14 dosya) ve `data/examples/` (6 dosya) `.ts` oldu; `App.js`, `index.js`, `jest.setup.js`, `screens/` ve `components/` **JS kalır** — hepsi zaten `checkJs` ile tam tip kontrolünden geçiyor, JSX/`Animated` tabanlı kodda kazanç küçük. **34 dosya** `git mv` ile taşındı, yani git geçmişi dosya bazında korundu. Dönüşüm sırasında davranış **hiç değişmedi**: 247 testin tamamı aynı iddialarla geçti.

### 1. Neden `.js` + `checkJs` yeterli değildi (ve neden "bozar" demek yanlıştı)

`checkJs` dosyaları gerçekten denetler, ama JSDoc yorumlarıyla yazılan tipler **dosya içinde kırılgan** ve tüketiciye taşınmıyordu. `.ts`'e geçince (a) mod a/adları gerçek birleşim tipi oldu, (b) ortak tip tanımı tek yere taşındı ve **ürün kodu ile testler aynı tipi** paylaşıyor. Dönüşüm bir *maliyet/fayda* kararıdır; TS derleme zamanında silindiği için çalışma zamanı riski yoktu — "uygulama bozulur" gerekçesi doğru değildi.

### 2. Yapılandırma

- `tsconfig.json` `include`: `services/**/*.ts`, `data/examples/**/*.ts`, `__tests__/**/*.ts` (JS girişleri aynen duruyor; `checkJs` açık).
- `eslint.config.js`: jest globalleri bloğu artık `__tests__/**/*.{js,ts}` + `jest.setup.js`.
- Jest/`jest-expo` + Babel (`babel-preset-expo`) `.ts`'i olduğu gibi derler; ek ayar gerekmedi.

### 3. Yazılan gerçek tipler (tek kaynak ilkesi korunarak)

| Dosya | Tip(ler) |
| --- | --- |
| `services/wordRepository.ts` | `Word` (JSON kaydı), `WordId` (`number \| string`), `WordLike` (kimlik + isteğe bağlı 3 metin alanı), `HskLevel` — `WordId`'nin **tek evi** burasıdır (başka yerde yeniden tanımlanmaz) |
| `services/modes.ts` | `MODE_TABLE` artık `as const` → `QuizMode`, `QuizCategory`, `FieldType` **gerçek birleşim tipleri**; yazım hatası derleme hatası olur |
| `services/statsManager.ts` | `StatsData`, `WordStat`, `WordStatLike`, `CategoryStat`, `StatsStreak`, `DailyStat`; `WordId` buradan **yeniden dışa aktarılır** (tanım wordRepository'de) |
| `services/reviewPool.ts` | `ReviewEntry`, `ReviewEntryInput` (modu eksik eski kayıtlar), `ReviewSnapshot`, `ResolvedWord` |
| `services/handwritingService.ts` | `InkPoint`/`InkStroke`, `HandwritingResult`, `HandwritingOptions`, `HandwritingFetch` (testlerin daraltılmış `fetch` imzası) |
| `services/importService.ts` | `CustomDeckWord`, `CustomDecks`, `RawDeckWord` (ham JSON; doğrulama burada yapılır) |
| `services/quizBuilder.ts` | `pickWord` artık `<T extends { id: WordId }>` — seçilen öğenin tipi korunur, testler yalnızca `{ id }` taşıyan sahte havuz geçebilir |
| `services/settingsService.ts`, `exampleService.ts`, `floatingParticles.ts`, `dateUtils.ts` | `Settings`, `ExampleRecord`/`ExampleMap`, `Viewport`/`Point`/`Particle`/`RandomFn`, `Date` imzaları |

`any` yalnızca **gerçek güven sınırlarında** kaldı (disk/JSON'dan gelen ham kayıt: `toCanonicalEntry(raw: any)`, `sanitizeSettings(raw: any)`), her biri gerekçesiyle yorumlandı.

### 4. Dönüşümün çıkardığı üç tuzak (bunlar `checkJs`'te görünmüyordu)

1. **`.ts` dosyalarında JSDoc tip assert'leri çalışmaz** — `/** @type {X} */ (expr)` orada sadece yorumdur. 3 yerde işi o yapıyordu: `statsManager`'daki `/** @type {Promise<unknown>} */ let statsWriteQueue` (annotasyon düşünce kuyruk `Promise<void>` oldu ve `removeWordStatsByIds` zinciri tip hatası verdi), `importService.test.ts`'teki `jest.Mock` çevrimi ve `handwritingService.test.ts`'teki `jest.Mock` çevrimi → hepsi gerçek annotasyon/`as` ile değiştirildi.
2. **Kısmi/bozuk kayıt şekilleri gerçek sözleşmeydi.** `isMastered({})`, `{ streak: 3 }` (wrongStreak yok), `{ wordId }` (mod yok) gibi girdiler testlerle belgelenmiş "savunmalı okuma" davranışıydı; bu yüzden `WordStatLike` / `ReviewEntryInput` okuma tipleri ayrı yazıldı, yazma tipleri (`WordStat`/`ReviewEntry`) sıkı kaldı.
3. **Bazı yerlerde çıkarım birleşimi çökertiyordu**: `handwritingService`'teki `request()` ve `statsManager`'daki `createEmptyCategories()` dönüş/iç tip annotasyonu istedi (aksi halde `{candidates: never[], error: string}` gibi genişlemiş bir birleşim oluşuyordu).

Testlerde **tek bir iddia bile gevşetilmedi**; yalnızca iki mock ifadesi TS'e uyarlandı (`as unknown as jest.Mock`, `new Promise<never>(...)`).

### 5. Doğrulama

`npm run tsc` 0 hata · `npm run lint` **0 hata** (14 uyarı — dönüşüm öncesiyle aynı; `Array<T>` yerine `T[]` yazıldı) · `npm test` **247/247, 14/14 suite** · `npx expo export --platform android` bundle başarılı (Metro/Babel `.ts`'i sorunsuz derledi, `dist/` sonra silindi). **Cihaz doğrulaması bekliyor** (JSX dosyalarının büyük kısmı değişmedi ama tüketiciler yeni tiplerle derlendi). Dokümantasyon aynı fazda güncellendi: `AGENTS.md` (JS/TS ayrımı, Testing + Type checking bölümleri, yeni kural) ve `README.md` (checks, proje yapısı).

**Yedek:** `C:\Projects\App\ChineseQuizApp-backup-2026-10-19_2030.tar.gz` (dönüşümden **önce**, `.git` dahil) — eski arşiv silindi, tek arşiv kuralı korundu.

### 6. Bilinçli olarak yapılmayanlar

- Ekranlar/bileşenler `.tsx`'e çevrilmedi (React Navigation + `Animated`; kriter "mantık + testler" idi).
- `strict` / `noImplicitAny` **açılmadı** (açılırsa yüzlerce `implicit any` hatası gelir; dönüşümün amacı tip *kazancı*, tam strict geçişi değil). İstenirse ayrı bir faz işi.
- `wordIdMigrations.ts`'in 1841 satırlık id tabloları olduğu gibi bırakıldı (şekil `Record<number, number>` zaten çıkarımdan doğru geliyor, satır satır annotasyon gürültü olurdu).

---

## 27. Faz 23 — Hakkında kartı: uygulama adı, geliştirici, sürüm ve lisans

Ders projesi kriteri: *"derlenip çalışması ve **adının uygulamada görünmesi**"*. Settings pop-up'ının en altında zaten bir **ABOUT** kartı vardı ama yalnızca GitHub bağlantısını taşıyordu; kimlik bilgisi (ad/sürüm/lisans) uygulamanın hiçbir yerinde görünmüyordu.

### 1. Ne eklendi

`components/SettingsModal.js` → ABOUT kartının en üstüne **kimlik bloğu** (altında mevcut GitHub butonu ve repo adresi aynen duruyor):

```
        HanyuPick
  Developed by Olcan Askar
Version 1.0.0 · MIT License
```

- Adlar **İngilizce** (arayüzün geri kalanı gibi; `accessibility` etiketleri de İngilizce kuralına uyuyor).
- Kırmızı palet korundu: uygulama adı `#2C3E50`, geliştirici adı `#B91C1C` (vurgu), sürüm/lisans `#9CA3AF`; bloğun altında `#F3F4F6` ayırıcı.
- Kart zaten `ScrollView` içinde ve `contentCard` `maxHeight: 85%` → kısa ekranlarda içerik kaydırılır, taşma/kırpılma yok.

### 2. Sürüm nereden geliyor (elle yazılmıyor)

**`expo-constants`** eklendi (`npx expo install expo-constants` → `~57.0.22`; Expo Go'nun içinde hazır, **native build gerekmez**). Değer `Constants.expoConfig?.version`'dan okunur, yani tek kaynak `app.json`'dır: `eas.json`'da `cli.appVersionSource: "remote"` yalnızca **`versionCode`/`buildNumber`**'ı uzaktan yönetir, `version` alanı `app.json`'da kalır. Böylece sürümü iki yerde güncelleme tuzağı yok. `expoConfig` yoksa (ör. eski bir host) `'1.0.0'`a düşer.

### 3. Neden Home'a ayrı satır eklenmedi

Home **bilinçli olarak kaydırmasız** (AGENTS "Rules"): sabit yükseklikte bir ekran, taşan içerik kırpılır. Adı oraya sıkıştırmak yerine Settings'in ABOUT kartı seçildi; kullanıcı da bu yeri istedi (*"settings'in en alt kısmına bir about kısmı ekleriz"*). Web istemcisinde aynı bileşen görüneceği için kriter web tarafında da karşılanır.

### 4. Doğrulama

Babel parse ✓ · `npm run tsc` 0 hata · `npm run lint` **0 hata** (14 uyarı — değişmedi) · `npm test` 247/247 · `npx expo export --platform android` ✓ (bağımlılık eklendiği için yeniden alındı). **⏳ Cihaz doğrulaması bekliyor:** Settings'i aç → ABOUT kartında "Developed by Olcan Askar" ve sürüm satırı görünmeli.

⚠️ **Bu bölüm yayımdaki APK'da yoktur.** `v1.0.0` APK'sı Faz 20'de alındı; kimlik bloğu ancak yeni bir `preview` build'i (planlanan **`v1.1.0`**) yayımlanınca kullanıcıya ulaşır. Expo Go'da ise hemen görünür.

### 5. Bilinçli olarak yapılmayanlar

- Ayrı bir "About" **rotası/ekranı** açılmadı (Settings bir pop-up, rota değil — aynı kural).
- Sürüm/commit bilgisi `app.json` dışında bir dosyaya yazılmadı; `expo-constants` tek kaynağı okuyor.

---

## 28. Faz 24 — Web istemcisi (Expo'nun web çıktısı)

Ders projesi kriteri: *"küçük bir API (ör. ilerleme senkronu) ya da **Expo'nun web çıktısı**"*. Web çıktısı seçildi: bir senkron API'si hesap + sunucu ister ve README'nin **"hesap yok, arka uç yok, izleme yok"** sözünü bozardı; web çıktısı aynı kodu ikinci bir platformda çalıştırır.

### 1. Kurulum

`npx expo install react-dom react-native-web @expo/metro-runtime` (SDK 57'nin uyumlu sürümleri: `react-dom 19.2.3`, `react-native-web ^0.21.2`, `@expo/metro-runtime ~57.0.17`). `app.json` → `web` bloğu: `output: "single"` (tek sayfa; EAS Hosting bunu bekler), `name` (sekme başlığı: **HanyuPick — HSK 1-6 Vocabulary Quiz**), `shortName`, `lang`, `themeColor #FBF5EB`, `backgroundColor #EFE7DA`, `display: standalone`.

```bash
npx expo export --platform web   # dist/ (gitignored) — statik çıktı
npx expo start --web             # geliştirme sunucusu
```

### 2. Masaüstünde telefon çerçevesi

Uygulama telefon için tasarlandı (Home bilinçli olarak kaydırmasız, sabit yükseklikler). `App.js`'te navigasyon ağacı `navigationTree` adında bir değişkene alındı; **web'de** `webStage` (krem zemin `#EFE7DA`, ortalı) içinde `webFrame` (`maxWidth: 430`, krem `#FBF5EB`, ince kenarlık + `boxShadow`) ile sarılıyor, **yerelde ağaç eskisi gibi doğrudan dönüyor** — native düzende tek bir ek View yok.

### 3. Web'de sessizce kırılan yerler (ve düzeltmeleri)

| Sorun | Neden | Düzeltme |
| --- | --- | --- |
| Bildirimler hiç görünmüyordu | `react-native-web`'in `Alert`'i **bilinçli olarak boş** (`static alert() {}`) | yeni **`services/dialogService.ts`** → `showAlert()` web'de `window.alert`, yerelde `Alert.alert`; `SettingsModal` + `CustomDeckModal`'daki **5 çağrı** buradan geçiyor (tek kapı) |
| **Quiz şıkları tıklanamıyordu** | kartın `TouchableOpacity`'si `accessibilityRole="button"` + `disabled={!isAnswered}` yüzünden gerçek bir **`<button disabled>`** olarak çiziliyor; **Chromium devre dışı bir `<button>`ın İÇİNDEKİ butonlara fare olaylarını hiç iletmiyor** (pointerdown/up geliyor, `mousedown`/`click` gelmiyor → RNW'nin basış mantığı hiç tetiklenmiyor) | `disabled={Platform.OS === 'web' ? false : !isAnswered}` — `handleCardPress` zaten cevaplanmadan ilk satırda dönüyor, yani web'de `disabled`'a gerek yok |
| Modül yüklenirken okunan genişlik | `QuestionCard`'da modül kapsamında `Dimensions.get('window')` (pencere yeniden boyutlandırılınca bayat) | `useWindowDimensions()` (bileşen içinde, canlı) |
| El yazısı araması | `inputtools.google.com`'a `fetch` → tarayıcıda CORS; fare ile çizim de pedin amacına uygun değil | "Draw" butonu **web'de gizli** (`Platform.OS !== 'web'`), arama kutusu + liste tam çalışıyor |

**Haptik gizlenmedi:** `expo-haptics` 57 web'de kendi uygulamasını getiriyor (desteklemeyen tarayıcıda sessiz no-op). `expo-speech` (SpeechSynthesis), `expo-clipboard`, `expo-document-picker`, `react-native-svg`, `@react-native-community/slider` (web bileşeni var) ve `DeviceEventEmitter` web'de çalışıyor. `expo-splash-screen`'in web karşılığı zaten güvenli bir stub (`setOptions` no-op).

### 4. Doğrulama — headless Edge (CDP) ile uçtan uca

Web çıktısı **gerçek bir tarayıcıda** sürüldü (`msedge --headless=new --remote-debugging-port`), `Page.captureScreenshot` + `Input.dispatchMouseEvent` ile: **Home → Settings (ABOUT: "Developed by Olcan Askar" + "Version 1.0.0 · MIT License") → kapat → HSK 1 quiz → mod sekmesi (Pinyin → EN) → şık (Wrong 1 + örnek cümle) → karta tıkla (sonraki soru) → Vocabulary (Draw yok, 5000 kelime listesi)** — hepsi fareyle, programatik `.click()` olmadan geçti.

⚠️ **İki tuzak** (bir daha aynı yere düşmemek için):

1. **Headless pencerenin gerçek görünüm alanı `--window-size`'a uymuyor** (bu makinede 500×320'ye kırpıldı). Ekran görüntüsü 1400 px yüksek çıkabildiği için sorun görünmüyor; ama y=320'nin altına yapılan "tıklamalar" hiçbir yere düşmüyor ve **uygulama bozuk sanılıyor**. Çözüm: `Emulation.setDeviceMetricsOverride({ width: 420, height: 860, deviceScaleFactor: 1 })`.
2. **`Alert` sessizliği** ve **`<button disabled>` içindeki butonlar** yalnızca web'de ortaya çıkıyor; ikisi de yukarıda düzeltildi.

### 5. Kullanıcı incelemesi → üç düzeltme (Faz 24b)

Kullanıcı tarayıcıda denedi ve üç şeyi işaretledi: *"vocabulary, practice gibi ekranlar home ekranı gibi bir aspect ratio'ya sahipken setting, statistics ve custom decks kısımları tüm sekmeyi kaplıyor, kontrolleri zorlaştırıyor; ve telefonda eksikliğini hissetmediğimiz geri dönüş tuşunun olmaması burada sorun oluşturuyor, practice ekranından geri gelemiyorum."*

| Sorun | Neden | Düzeltme |
| --- | --- | --- |
| Pop-up'lar tüm sekmeyi kaplıyordu | `react-native-web`'in `Modal`'ı `document.body`'ye **portal** açıyor → kart çerçevenin dışına taşıyor; `contentCard` `width: '100%'` olduğu için 1280 px'lik sekmede 1240 px genişliğinde bir kart çıkıyordu | pop-up kartlarına **`maxWidth: WEB_FRAME_WIDTH`** (`components/StatsModal.js`, `SettingsModal.js`, `CustomDeckModal.js` + Home'un seviye menüsü `menuContainer`) → ölçüldü: **430 px, ortalanmış** (`left: 425`), çerçeveyle aynı hizada |
| Quiz'den geri dönülemiyordu | geri dönüş telefonda **kaydırma jestiyle** (Android'de donanım tuşuyla) yapılıyor; masaüstü tarayıcıda ikisi de yok. Vocabulary'de geri butonu vardı, Quiz'de yoktu | `screens/QuizScreen.js` → **yalnızca web'de** çizilen `←` butonu (Vocabulary'nin `backBtn` paletiyle aynı); yerel düzende ek satır yok |

Yeni dosya **`components/layout.js`**: `WEB_FRAME_WIDTH = 430` — hem `App.js`'teki çerçevenin hem pop-up kartlarının genişliği artık tek kaynaktan geliyor, ikisi bir daha ayrışamaz.

Ek olarak doğrulandı: Home'un **SELECT LEVEL** pop-up'ı ve Quiz başlığındaki **seviye menüsü** (Header'ın `measureInWindow` ile konumlanan dropdown'ı) 1280 px'lik sekmede de doğru yerde/doğru genişlikte — portal koordinatları pencere koordinatı olduğu için kayma yok.

### 6. Yayın: EAS Hosting (canlı)

Kullanıcı **EAS Hosting**'i seçti (`eas deploy`; alt yol/CORS sorunu yok, HTTPS hazır). `app.json` → `web.output: "single"` (tek sayfalık SPA — hosting'in beklediği çıktı) açıkça yazıldı.

```bash
npx expo export -p web            # dist/ (gitignored)
npx eas-cli@latest deploy --prod  # üretim: https://hanyupick.expo.app
```

- **Üretim adresi: https://hanyupick.expo.app** (deployment: `https://hanyupick--hxe124tc4y.expo.app`, panel: `https://expo.dev/projects/ea29583b-…/hosting/deployments`).
- `--prod` olmadan çalıştırılırsa PR tarzı bir **önizleme** adresi üretir (kullanıcıya göstermek için yararlı).
- Geri bildirim sonrası **canlı sitede tekrar uçtan uca** doğrulandı (headless Edge, 420×860): Home → Settings/ABOUT → quiz (geri butonu görünür) → mod sekmesi → şık (Wrong 1) → karta tıkla (yeni soru: 饭馆) → Vocabulary ✓.

### 7. Doğrulama özeti ve sonraki adım

Babel parse ✓ · `npm run tsc` 0 hata · `npm run lint` **0 hata** (14 uyarı — değişmedi) · `npm test` 247/247 · `npx expo export --platform android` ✓ · `npx expo export --platform web` ✓ · **canlı site** ✓.

**⏳ Kullanıcı kontrolü bekliyor:** Expo Go'da Settings → ABOUT (Faz 22/23) ve tarayıcıda **https://hanyupick.expo.app** (Faz 24). Sıradaki adımlar: README'nin web bölümüyle güncellenmesi + 1-2 dakikalık demo videosu, ardından **v1.1.0** `preview` APK'sının GitHub release'ine eklenmesi.

---

## 29. Yeni oturumda nasıl devam edilir

1. Bu dosyayı oku (`NOTES.md`).
2. `git log --oneline` ve `git status` ile durumu doğrula.
3. Çalışılacak maddeyi seç (kural: **her düzeltme ayrı commit**, mesajı açıklayıcı).
4. Bitince: doğrula (`npm test`, `npm run lint`, `npm run tsc`, varsa Babel parse) → commit → bu dosyadaki ilgili kutuyu işaretle ve "Son güncelleme" satırını değiştir.
5. Bir şey ters giderse: `git reset --hard known-good` (veya ilgili commit'i `git revert`).

**`known-good` durumu:** **Faz 21 sonu** (`10ac80c` vitrin görselleri + `3b0b797` galeri notu, 2026-10-17) — kullanıcı talimatıyla ilerletildi: *"known-good'u da sona çekebilirsin"*. Önceki değer Faz 13 + Faz 14 doğrulama commit'i (`docs: mark Faz 13 and Faz 14 as device-verified`) idi; ondan önce `5d0b991` (Faz 11 + Faz 12). Tek yedek arşivi `C:\Projects\App\ChineseQuizApp-backup-2026-10-19_2030.tar.gz` olarak tazelendi (Faz 22 öncesi, `.git` dahil), eskisi silindi; yalnızca `known-good` etiketi değiştiğinde bu satır güncellenir — ayrıntı için §16. **İlk EAS `preview` build'i yapıldı ve uygulama telefona kuruldu** (2026-10-17): kullanıcı "sorun yok" dedi ve ikonu gördü (karakterin büyüklüğünden şikâyet etti) → Faz 15 (ikon) ve Faz 16 (ad + paket kimliği + EAS) **fiilen doğrulandı**, ama Faz 17 (GitHub bağlantısı, `863b470` — hatası yalnızca APK'da görünür, §21) ve Faz 18'e kadar verilen commit'ler (`05edc7f` ikon oranı + `affb4fe` splash + `460dd12` bağlantı adresi + `f085820` paket kimliği, §22) o build'de **yoktu**. Bu yüzden o build Faz 17–18'i kapsamıyordu; eksik **Faz 20'deki `v1.0.0` build'i ile kapandı** — ⚠️ Paket kimliği değiştiği için sıradaki APK telefonda **ayrı bir uygulama** olarak kurulur (eskisi silinmeli). **Faz 19** (`fcce135` — README/LICENSE/CI/depo ayarları; ardından `d1c47d5` README'yi APK-öncelikli yaptı) uygulama koduna dokunmadığı için **cihaz doğrulaması gerektirmez**; kapısı CI'dır ve **✅ koşular başarılı** (§23). **Faz 20** (build `7f40e0bd`, §24) doğrulanan APK'yı üretti: **`v1.0.0` GitHub Release'i** hazır, indirme bağlantısı `https://github.com/olcanaskar/hanyupick/releases/latest`. **Neden ilerletilebildi:** Faz 17'nin GitHub-bağlantı düzeltmesi (`863b470`) ve Faz 18'in ikon/splash/paket değişiklikleri (`05edc7f`, `affb4fe`, `460dd12`, `f085820`) **`v1.0.0` APK'sının içindedir** (build Faz 20'de, yani bu commit'lerden sonra alındı) ve kullanıcı o APK'yı kullandı; Faz 19–21 ise uygulama koduna **hiç dokunmadı** (README/LICENSE/CI + `docs/screenshots`). Kullanıcı cihazda bir sorun bildirmedi ve etiketin ilerletilmesini açıkça istedi. ⚠️ Cihazı yalnızca kullanıcı doğrular: sıradaki bir APK'da splash/ikon/ad veya Ayarlar → GitHub satırı sorun çıkarırsa bu kayıt güncellenir.

---

## 30. Faz 25 — v1.1.0 build'i (telefon demo videosu için)

**Neden:** Faz 22 (TypeScript), Faz 23 (ABOUT bloğu: *Developed by Olcan Askar*) ve Faz 24 (web istemcisi) yayımdaki **`v1.0.0` APK'sında yok**. ABOUT bloğu ve splash gibi değerler **native** olduğu için Expo Go'da da görünmez → kullanıcı demo videosunu **gerçek APK ile** çekecek. (Bu adım, "README ve yeni build sonra" planının build kısmıdır; README hâlâ kullanıcıda.)

**Sürüm:** `app.json` `version` **1.0.0 → 1.1.0** (+ tutarlılık için `package.json` ve `package-lock.json` kök sürümü). `versionCode`/`buildNumber` EAS'ta **uzaktan** yönetildiği için `app.json`'da yok — bu build `versionCode: 1`.

**Build:** `npx eas-cli@latest build --profile preview --platform android --non-interactive --no-wait --json`
- build `8b4838b3-5706-437b-830e-dda8d13fb9ce`, commit `8c23167`, `appVersion 1.1.0`
- profil `preview` (INTERNAL) → paylaşılabilir **APK**, imza EAS'teki `io.github.olcanaskar.hanyupick` anahtarıyla (Faz 20'de oluşan keystore — **kaybedilmemeli**)
- artifact: `https://expo.dev/artifacts/eas/oFJJrqslnb3Uv1iBCmGiANbCLqRadZ6gDg3l9bSxWUY.apk` (EAS artifact adresleri ~30 gün sonra düşer → APK **GitHub release'ine** eklendi: `v1.1.0` / `hanyupick-1.1.0.apk`)

**Notlar**
- Paket kimliği `v1.0.0` ile aynı olduğu için bu APK, telefondaki eski test build'inin **üzerine** kurulur (silme gerekmez, ilerleme korunur).
- EAS'ın `--json` çıktısı **stderr'e ilerleme satırı** yazıyor; PowerShell'de `ConvertFrom-Json` bu yüzden patlıyor → ilk `{` karakterinden sonrasını ayrıştır (`2>$null` tek başına yetmez).
- Bu build'den sonra **cihaz doğrulaması** kullanıcıda: iPhone değil **Android**; Settings → ABOUT'da sürümün **1.1.0** görünmesi build'in doğrulamasıdır.
- Demo verisi (video için): telefonun kendi deposu — `Settings → Reset progress` temiz başlangıç verir (deste ve ayarlar korunur); örnek deste dosyası `C:\Projects\App\hanyupick-ders1.json` (8 kelime, Import JSON Deck ile içe aktarılır).
