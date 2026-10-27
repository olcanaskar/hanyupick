// Soru yönlerinin (modların) TEK kaynağı (Faz 3.3).
//
// Neden ayrı dosya: mod bilgisi 5 dosyaya dağılmıştı ve her yer kendi kuralını
// uyguluyordu:
//   - services/statsManager.js   → kategori map'i (+ 4 HAYALET mod + sessiz varsayılan)
//   - components/Header.js       → sekme indeksi (aynı map'in kopyası) + sekme etiketleri
//   - components/QuestionCard.js → `startsWith` / `endsWith` ile mod adı ayrıştırma
//   - screens/QuizScreen.js      → `endsWith` ile ipucu metni
//   - components/StatsModal.js   → kategori anahtarları elle yazılmış
// Sonuç: bir mod eklendiğinde/değiştiğinde bazı yerler SESSİZCE yanlış
// davranıyordu — örn. tanınmayan bir mod istatistikte hep `hanzi_pinyin`
// sayılıyordu (sessiz varsayılan) ve var olmayan 4 mod adı map'te duruyordu.
//
// Model: 3 kategori (Header'daki 3 sekme) × 2 yön = 6 mod.
// Mod adı her zaman `<soru>-to-<cevap>` biçimindedir; soru/cevap tipi tabloda
// AÇIKÇA durur, böylece hiçbir tüketici mod adını ayrıştırmak zorunda kalmaz.
//
// UI'dan bağımsız: React import etmez; tüm fonksiyonlar saf ve test edilebilir.

// Kullanıcıya gösterilen alan adları (ipucu satırı: "Meaning: ...").
export const FIELD_LABELS = {
  hanzi: 'Hanzi',
  pinyin: 'Pinyin',
  meaning: 'Meaning',
};

// --- Tipler (Faz 22: TS dönüşümü) ---------------------------------------------
//
// Mod/kategori/alan adları TEK tablodan türetilir: aşağıdaki `MODE_TABLE` `as const`
// olduğu için `QuizMode` gerçek bir birleşim tipidir ve yazım hatası artık derleme
// hatasıdır (eskiden burada yalnızca `string` vardı ve `endsWith` doğrulamasına
// güveniliyordu).
export type FieldType = keyof typeof FIELD_LABELS;
export type QuizMode = (typeof MODE_TABLE)[number]['mode'];
export type QuizCategory = (typeof MODE_TABLE)[number]['category'];

// Sekme etiketlerindeki kısa gösterim.
const TYPE_SHORT = {
  hanzi: '字',
  pinyin: 'Pinyin',
  meaning: 'EN',
};

// Kategori → eğittiği iki alan. Üçüncü alan cevaptan sonra ipucu olarak gösterilir.
export const CATEGORY_FIELDS: Record<QuizCategory, FieldType[]> = {
  hanzi_pinyin: ['hanzi', 'pinyin'],
  hanzi_meaning: ['hanzi', 'meaning'],
  pinyin_meaning: ['pinyin', 'meaning'],
};

// TEK tablo: her satır bir mod. Yeni mod eklemek = buraya bir satır eklemek.
// Sıra önemlidir: kategori sırası = Header'daki sekme sırası ve her kategorinin
// İLK satırı o kategorinin ileri yönüdür.
// `as const` (Faz 22): mod/kategori adları `QuizMode`/`QuizCategory` birleşim tipi olur.
const MODE_TABLE = [
  { mode: 'hanzi-to-pinyin', category: 'hanzi_pinyin', prompt: 'hanzi', answer: 'pinyin' },
  { mode: 'pinyin-to-hanzi', category: 'hanzi_pinyin', prompt: 'pinyin', answer: 'hanzi' },
  { mode: 'hanzi-to-meaning', category: 'hanzi_meaning', prompt: 'hanzi', answer: 'meaning' },
  { mode: 'meaning-to-hanzi', category: 'hanzi_meaning', prompt: 'meaning', answer: 'hanzi' },
  { mode: 'pinyin-to-meaning', category: 'pinyin_meaning', prompt: 'pinyin', answer: 'meaning' },
  { mode: 'meaning-to-pinyin', category: 'pinyin_meaning', prompt: 'meaning', answer: 'pinyin' },
] as const;

// Prototipsiz tablo: aksi halde `MODE_CATEGORY['toString']` bir fonksiyon dönerdi
// ve "bilinmeyen mod" kontrolü sessizce yanlış sonuç verirdi.
// Dönen tip `Record<string, V>`: bilinmeyen bir mod adı `undefined` verir, çağıran
// karar verir (bu yüzden `Record<QuizMode, V>` DEĞİL — eksik anahtar tipi yalan olurdu).
const toLookup = <V>(pairs: [string, V][]): Record<string, V> =>
  Object.assign(Object.create(null), Object.fromEntries(pairs));

export const MODES: QuizMode[] = MODE_TABLE.map((row) => row.mode);

// Kategori sırası = Header'daki sekme sırası.
export const CATEGORIES: QuizCategory[] = [...new Set(MODE_TABLE.map((row) => row.category))];

export const MODE_CATEGORY: Record<string, QuizCategory> = toLookup(
  MODE_TABLE.map((row) => [row.mode, row.category])
);

const MODE_PROMPT = toLookup(MODE_TABLE.map((row) => [row.mode, row.prompt]));
const MODE_ANSWER = toLookup(MODE_TABLE.map((row) => [row.mode, row.answer]));

export const MODES_BY_CATEGORY: Record<QuizCategory, QuizMode[]> = CATEGORIES.reduce(
  (acc, category) => {
    acc[category] = MODE_TABLE.filter((row) => row.category === category).map((row) => row.mode);
    return acc;
  },
  {} as Record<QuizCategory, QuizMode[]>
);

// Header sekme metni, ör. '字 → Pinyin'.
export const MODE_LABELS = toLookup(
  MODE_TABLE.map((row) => [row.mode, `${TYPE_SHORT[row.prompt]} → ${TYPE_SHORT[row.answer]}`])
);

// Varsayılan mod: ilk kategorinin ileri yönü.
export const DEFAULT_MODE: QuizMode = MODES[0];

// Mod → kategori ('hanzi_pinyin' | 'hanzi_meaning' | 'pinyin_meaning').
// Tanınmayan mod: geliştirmede gürültülü uyarı + `null` (çağıran karar verir).
// ESKİ DAVRANIŞ sessizce `hanzi_pinyin` saymaktı → istatistik yanlış kategoriye yazılıyordu.
export const getCategory = (mode: string | null | undefined): QuizCategory | null => {
  const category = mode === null || mode === undefined ? undefined : MODE_CATEGORY[mode];
  if (!category && __DEV__) {
    console.warn(`[modes] Bilinmeyen mod, kategori bulunamadı: ${JSON.stringify(mode)}`);
  }
  return category || null;
};

// Header'daki sekme indeksi (0..2). Tanınmayan modda 0 (ilk sekme).
export const getCategoryIndex = (mode: string | null | undefined): number =>
  Math.max(0, CATEGORIES.indexOf(getCategory(mode) as QuizCategory));

// Ekranda GÖSTERİLEN alan tipi ('hanzi' | 'pinyin' | 'meaning').
export const getPromptType = (mode: string): FieldType | null =>
  (MODE_PROMPT[mode] as FieldType) || null;

// Kullanıcının SEÇMESİ gereken alan tipi ('hanzi' | 'pinyin' | 'meaning').
export const getAnswerType = (mode: string): FieldType | null =>
  (MODE_ANSWER[mode] as FieldType) || null;

// Aynı kategorideki ters yön (Header'da sekmeye tekrar basınca yön değiştirir).
export const getReverseMode = (mode: string | null | undefined): QuizMode | null => {
  const category = getCategory(mode);
  if (!category) return null;
  const [forward, reverse] = MODES_BY_CATEGORY[category];
  return (mode === forward ? reverse : forward) ?? null;
};

// Soruda gösterilmeyen üçüncü alan → cevaptan sonra "ipucu" olarak basılır.
// (hanzi_pinyin → 'meaning', hanzi_meaning → 'pinyin', pinyin_meaning → 'hanzi')
export const getHintField = (mode: string): FieldType | null => {
  const category = getCategory(mode);
  if (!category) return null;
  const pair = CATEGORY_FIELDS[category];
  return (Object.keys(FIELD_LABELS) as FieldType[]).find((field) => !pair.includes(field)) || null;
};
