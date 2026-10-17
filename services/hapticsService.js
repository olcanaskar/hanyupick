// src/services/hapticsService.js
//
// Dokunsal geri bildirim için TEK nokta. Kullanıcı ayarı kapalıysa
// (services/settingsService.js içindeki `haptics: false`) hiçbir şey yapılmaz;
// çağıran ekranlar bu kontrolü tekrarlamaz. Böylece "titreşimleri kapat"
// ayarı uygulamanın her yerinde geçerli olur.

import * as Haptics from 'expo-haptics';
import { getCachedSettings } from './settingsService';

const isEnabled = () => getCachedSettings().haptics !== false;

// Doğru cevap: hafif "seçim" geri bildirimi.
export const selectionFeedback = () => {
  if (!isEnabled()) return;
  Haptics.selectionAsync();
};

// Yanlış cevap: iki kısa darbe (Faz 4'ten beri süren davranış).
// Ayarları okumak için tek bir kontrol yeterli: iki darbenin aynı ayara
// uyması garantidir (çağrılar arasında ayar değişse bile ikisi de aynı
// kapıdan geçer).
export const failureFeedback = () => {
  if (!isEnabled()) return;

  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  setTimeout(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
  }, 140);
};
