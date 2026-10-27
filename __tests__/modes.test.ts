import {
  CATEGORIES,
  CATEGORY_FIELDS,
  DEFAULT_MODE,
  FIELD_LABELS,
  MODES,
  MODES_BY_CATEGORY,
  MODE_CATEGORY,
  MODE_LABELS,
  getAnswerType,
  getCategory,
  getCategoryIndex,
  getHintField,
  getPromptType,
  getReverseMode,
} from '../services/modes';

// Sekme etiketlerindeki kısa gösterim (Header ile aynı olmalı).
const TYPE_SHORT = { hanzi: '字', pinyin: 'Pinyin', meaning: 'EN' };

// Eski `statsManager` map'inde duran, gerçekte var olmayan 4 mod adı (Faz 3.3'te silindi).
const PHANTOM_MODES = ['hanzi-to-en', 'en-to-hanzi', 'pinyin-to-en', 'en-to-pinyin'];

// Tanınmayan mod çağrıları __DEV__'de uyarı basar; test çıktısını kirletmemek için
// varsayılan olarak sessize alıp yalnızca ilgili testte iddia ediyoruz.
let warnSpy: jest.SpyInstance;

beforeEach(() => {
  warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
});

afterEach(() => {
  warnSpy.mockRestore();
});

describe('mod tablosu', () => {
  test('6 gerçek mod var ve tekrar yok', () => {
    expect(MODES).toHaveLength(6);
    expect(new Set(MODES).size).toBe(6);
    expect(MODES).toEqual([
      'hanzi-to-pinyin',
      'pinyin-to-hanzi',
      'hanzi-to-meaning',
      'meaning-to-hanzi',
      'pinyin-to-meaning',
      'meaning-to-pinyin',
    ]);
  });

  test('DEFAULT_MODE tablodaki geçerli bir mod', () => {
    expect(MODES).toContain(DEFAULT_MODE);
    expect(getCategory(DEFAULT_MODE)).toBe(CATEGORIES[0]);
  });

  test('hayalet modlar artık tanınmıyor', () => {
    PHANTOM_MODES.forEach((phantom) => {
      expect(getCategory(phantom)).toBeNull();
      expect(getPromptType(phantom)).toBeNull();
      expect(getAnswerType(phantom)).toBeNull();
    });
  });

  test('3 kategori var ve her mod tam olarak bir kategoriye çözülür', () => {
    expect(CATEGORIES).toHaveLength(3);
    MODES.forEach((mode) => {
      expect(CATEGORIES).toContain(MODE_CATEGORY[mode]);
      expect(getCategory(mode)).toBe(MODE_CATEGORY[mode]);
    });
  });

  test('her kategori tam 2 mod içerir ve modlar kategorilere tam dağıtılmıştır', () => {
    expect(Object.keys(MODES_BY_CATEGORY).sort()).toEqual([...CATEGORIES].sort());

    CATEGORIES.forEach((category) => {
      expect(MODES_BY_CATEGORY[category]).toHaveLength(2);
      MODES_BY_CATEGORY[category].forEach((mode) => {
        expect(getCategory(mode)).toBe(category);
      });
    });

    expect(CATEGORIES.flatMap((category) => MODES_BY_CATEGORY[category]).sort()).toEqual(
      [...MODES].sort()
    );
  });

  test('kategori alan çifti modun soru/cevap tipleriyle tutarlı', () => {
    MODES.forEach((mode) => {
      const category = getCategory(mode);
      const prompt = getPromptType(mode);
      const answer = getAnswerType(mode);
      if (!category) throw new Error(`kategori bulunamadı: ${mode}`);

      expect(prompt).not.toBe(answer);
      expect([...CATEGORY_FIELDS[category]].sort()).toEqual([prompt, answer].sort());
    });
  });

  test('sekme etiketi soru/cevap tiplerinden türetiliyor', () => {
    MODES.forEach((mode) => {
      const prompt = getPromptType(mode);
      const answer = getAnswerType(mode);
      if (!prompt || !answer) throw new Error(`soru/cevap tipi bulunamadı: ${mode}`);

      expect(MODE_LABELS[mode]).toBe(`${TYPE_SHORT[prompt]} → ${TYPE_SHORT[answer]}`);
    });
  });
});

describe('getCategoryIndex', () => {
  test('kategori sırası = sekme sırası (0, 1, 2)', () => {
    CATEGORIES.forEach((category, index) => {
      MODES_BY_CATEGORY[category].forEach((mode) => {
        expect(getCategoryIndex(mode)).toBe(index);
      });
    });
  });

  test('tanınmayan modda 0 (ilk sekme) döner', () => {
    expect(getCategoryIndex('boyle-bir-mod-yok')).toBe(0);
    expect(getCategoryIndex(undefined)).toBe(0);
  });
});

describe('getReverseMode', () => {
  test('aynı kategori içinde ters yöne çevirir; iki kez uygulanınca başa döner', () => {
    MODES.forEach((mode) => {
      const reverse = getReverseMode(mode);

      expect(reverse).not.toBe(mode);
      expect(getCategory(reverse)).toBe(getCategory(mode));
      expect(getReverseMode(reverse)).toBe(mode);
    });
  });

  test('tanınmayan modda null', () => {
    expect(getReverseMode('hanzi-to-en')).toBeNull();
  });
});

describe('getHintField', () => {
  test('kategorinin eğitmediği üçüncü alanı döner', () => {
    expect(getHintField('hanzi-to-pinyin')).toBe('meaning');
    expect(getHintField('hanzi-to-meaning')).toBe('pinyin');
    expect(getHintField('pinyin-to-meaning')).toBe('hanzi');
  });

  test('her mod için geçerli bir alan adı döner', () => {
    MODES.forEach((mode) => {
      expect(Object.keys(FIELD_LABELS)).toContain(getHintField(mode));
    });
  });

  test('tanınmayan modda null', () => {
    expect(getHintField('bilinmeyen')).toBeNull();
  });
});

describe('tanınmayan mod uyarısı', () => {
  test('getCategory uyarır ve null döner (eskiden sessizce hanzi_pinyin sayıyordu)', () => {
    expect(getCategory('hayali-mod')).toBeNull();
    expect(warnSpy).toHaveBeenCalledTimes(1);
    expect(String(warnSpy.mock.calls[0][0])).toContain('hayali-mod');
  });

  test('geçerli modda uyarı yok', () => {
    MODES.forEach((mode) => {
      expect(getCategory(mode)).toBeTruthy();
    });
    expect(warnSpy).not.toHaveBeenCalled();
  });
});
