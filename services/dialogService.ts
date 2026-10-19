// Faz 24 (web istemcisi): Platformlar arası bildirim diyaloğunun TEK kapısı.
//
// Neden gerekli: `react-native-web`'in `Alert`'i BİLİNÇLİ olarak boştur
// (kaynak: react-native-web/dist/exports/Alert → `static alert() {}`). Yani
// `Alert.alert(...)` web'de ne bir şey gösterir ne bir hata verir: içe aktarma
// hatası, geçersiz destek adı ya da kayıt hatası kullanıcıya HİÇ görünmezdi —
// sessiz bir kırılma. Bu modül web'de tarayıcının kendi diyaloğunu, yerelde
// React Native'in `Alert`'ini kullanır; bileşenler artık `Alert`'i doğrudan
// çağırmaz (AGENTS.md kuralı).
//
// Kapsam bilinçli olarak dar: yalnızca TEK düğmeli BİLDİRİM. Onaylı işlemlerin
// hepsi (ilerlemeyi sıfırla, desteyi sil, üzerine yaz) uygulamanın kendi
// temasıyla çizilen modal içi onay ekranlarını kullanıyor; `window.confirm`
// onların yerine geçmez, o yüzden bir `showConfirm` eklenmedi.

import { Alert, Platform } from 'react-native';

/**
 * Tek düğmeli bildirim gösterir.
 *
 * - Yerel (iOS/Android): `Alert.alert(title, message)`.
 * - Web: `window.alert`, başlık ve mesaj tek metinde birleştirilir (tarayıcının
 *   diyaloğu başlık kavramını bilmez).
 *
 * Ekran okuyucular `Alert`'i zaten kendiliğinden duyurur; ek bir çalışma gerekmez.
 */
export function showAlert(title: string, message?: string): void {
  if (Platform.OS === 'web') {
    // SSR/statik çıktıda `window` yoksa sessizce çıkılır (bu modül yalnızca
    // kullanıcı etkileşiminde çağrılır, ama yine de korunuyor).
    if (typeof window === 'undefined' || typeof window.alert !== 'function') return;
    window.alert(message ? `${title}\n\n${message}` : title);
    return;
  }

  Alert.alert(title, message);
}
