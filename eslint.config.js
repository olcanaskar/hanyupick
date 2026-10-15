// Expo ESLint yapılandırması (flat config).
// Kaynak: https://docs.expo.dev/guides/using-eslint/
const { defineConfig, globalIgnores } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  // Üretilen/derlenen çıktılar taranmaz (gitignore ile aynı mantık):
  // dist/ = bundler çıktısı, android|ios = Expo prebuild çıktısı.
  globalIgnores(['dist/**', 'android/**', 'ios/**', 'coverage/**']),

  expoConfig,

  // Testler jest ortamında çalışır: jest global'lerini tanıt
  // (yoksa testlerde 330 adet sahte "no-undef" hatası çıkar).
  {
    files: ['__tests__/**/*.js', 'jest.setup.js'],
    languageOptions: {
      globals: {
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        jest: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },

  // Bilinçli olarak gevşetilen kurallar — gerekçeleriyle.
  {
    rules: {
      // Bu proje React Native'in resmî `Animated` API'sini kullanıyor:
      // `useRef(new Animated.Value(0)).current` ve PanResponder için
      // "en güncel değeri tutan ref" (`pathsRef.current = paths`) desenleri.
      // eslint-config-expo 57 ile gelen React Compiler tabanlı kural bu deseni
      // modelleyemediği için 52 yanlış-pozitif üretiyor. Kapatıldı.
      // Uzun vade: `react-native`'in `useAnimatedValue()` kancasına geçilirse
      // bu kural yeniden açılabilir.
      'react-hooks/refs': 'off',

      // Aşağıdakiler mevcut (çalışan) desenler için uyarı düzeyinde:
      // hata değil, temizlik adayı — kilitlemez ama görünür kalır.
      // (`react/no-unescaped-entities` Faz 3.5'te düzeltildiği için varsayılana,
      // yani "error"a döndürüldü: yeni kaçırılmamış tırnaklar artık hata verir.)
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/exhaustive-deps': 'warn',
    },
  },
]);
