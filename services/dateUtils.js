// Yerel saat dilimini kullanan tarih yardımcıları.
//
// Uygulamadaki tüm gün anahtarları ("YYYY-MM-DD") tek yerden üretilsin diye burada toplandı.
// Not (Faz 2.2): Daha önce `new Date().toISOString()` (UTC) kullanılıyordu. Bu, gece yarısı
// civarında cevabın bir önceki/sonraki güne yazılmasına ve takvimle uyuşmamasına yol açıyordu.

// Verilen tarihi (varsayılan: şimdi) yerel saatle "YYYY-MM-DD" biçiminde döndürür.
export const getDateKey = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Verilen tarihe takvim günü ekler/çıkarır.
// Sabit milisaniye (`Date.now() - n * 86400000`) yerine takvim günü kullandığı için
// yaz saati (DST) geçişlerinde de gün doğru kayar. Girdiyi değiştirmez.
export const addDays = (date, days) => {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
};
