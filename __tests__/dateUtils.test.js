import { getDateKey, addDays } from '../services/dateUtils';

// Not: bu testler yerel saat diliminden bağımsız olacak şekilde yazıldı
// (tarihler yerel `new Date(y, m, d)` ile kurulur, `getDateKey` da yerel okur).

describe('getDateKey', () => {
  test('yerel saatle YYYY-MM-DD üretir', () => {
    expect(getDateKey(new Date(2026, 2, 5))).toBe('2026-03-05'); // ay 0 tabanlı: 2 = Mart
  });

  test('ay ve günü iki haneye tamamlar', () => {
    expect(getDateKey(new Date(2026, 0, 1))).toBe('2026-01-01');
    expect(getDateKey(new Date(2026, 8, 9))).toBe('2026-09-09');
  });

  test('parametre verilmezse bugünü döndürür', () => {
    expect(getDateKey()).toBe(getDateKey(new Date()));
  });

  test('gece yarısından hemen sonra yerel günü döndürür', () => {
    expect(getDateKey(new Date(2026, 2, 11, 0, 30, 0))).toBe('2026-03-11');
  });

  test('gün sonuna yakın saatte aynı yerel günü döndürür', () => {
    expect(getDateKey(new Date(2026, 2, 11, 23, 59, 59))).toBe('2026-03-11');
  });
});

describe('addDays', () => {
  test('ileri ve geri gün ekler', () => {
    expect(getDateKey(addDays(new Date(2026, 2, 10), 1))).toBe('2026-03-11');
    expect(getDateKey(addDays(new Date(2026, 2, 10), -1))).toBe('2026-03-09');
  });

  test('ay sınırını aşabilir', () => {
    expect(getDateKey(addDays(new Date(2026, 2, 31), 1))).toBe('2026-04-01');
    expect(getDateKey(addDays(new Date(2026, 3, 1), -1))).toBe('2026-03-31');
  });

  test('yıl sınırını aşabilir', () => {
    expect(getDateKey(addDays(new Date(2026, 11, 31), 1))).toBe('2027-01-01');
    expect(getDateKey(addDays(new Date(2027, 0, 1), -1))).toBe('2026-12-31');
  });

  test('orijinal tarihi değiştirmez', () => {
    const original = new Date(2026, 2, 10);
    addDays(original, 5);
    expect(getDateKey(original)).toBe('2026-03-10');
  });

  test('saat bilgisini korur', () => {
    const next = addDays(new Date(2026, 2, 10, 23, 30, 0), 1);
    expect(next.getHours()).toBe(23);
    expect(next.getMinutes()).toBe(30);
    expect(getDateKey(next)).toBe('2026-03-11');
  });
});
