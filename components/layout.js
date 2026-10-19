// Faz 24 (web istemcisi) — yerleşim sabitleri.
//
// Uygulama telefon için tasarlandı (Home kaydırmasız, sabit yükseklikler).
// Masaüstü tarayıcıda içerik bu genişlikte, ortalanmış bir "telefon
// çerçevesi" içinde gösterilir (`App.js` → `webFrame`).
//
// `react-native-web`'in `Modal`'ı `document.body`'ye portal açtığı için
// pop-up'lar bu çerçevenin DIŞINA taşar ve tüm sekmeyi kaplar; pop-up
// kartları da aynı genişlikle sınırlanır, böylece çerçeveyle hizalanır.
// Genişlik tek kaynaktan gelir: buradan değiştirilirse hem çerçeve hem
// pop-up kartları birlikte değişir.
export const WEB_FRAME_WIDTH = 430;
