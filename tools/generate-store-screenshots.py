# tools/generate-store-screenshots.py
#
# Mağaza tarzı vitrin görsellerinin ÜRETİCİSİ. `docs/screenshots/*.jpg` bu betikten
# çıkar, elle düzenlenmez (ikonlar için bkz. tools/generate-icons.py, aynı kural).
#
# Kaynak : docs/screenshots/raw/*.jpg  (gerçek cihaz kareleri, sistem çubukları dahil)
# Çıktı  : docs/screenshots/*.jpg      (1080x1920 vitrin görseli, telefon çerçevesi + başlık)
#
# Betik üç iş yapar:
#   1. Sistem çubuklarını (durum + gezinme) temizler -> yalnızca uygulama görünür kalır.
#   2. Kareyi krem zeminli, markalı bir vitrin görseline oturtur (çerçeve, gölge, başlık).
#   3. Statistics karelerine TANITIM VERİSİ çizer (PROGRESS tablosu aşağıda).
#
# ÖNEMLİ: 3. adımdaki ilerleme ÖRNEKTİR, gerçek kullanıcı verisi değildir (README ve
# NOTES bunu açıkça söyler). Sayılar uygulamanın kendi kurallarına uyar: ustalık
# services/statsManager.js (MASTERY_STREAK = 3, altı yönün hepsi), ısı ölçeği ve
# renkler components/StatsModal.js (HEAT_COLORS / LEVEL_COLORS / getHeatColor).
#
# Gerçek verilerle yenilemek için: yeni kareyi raw/ altına aynı adla koy, ölçüleri
# (STATUS_BAR_H, NAV_BAR_TOP, MASTERY_*, PILL_*, CAL_*) yeniden ölç, betiği çalıştır.
#
# Gereksinim: Python 3 + Pillow  ->  python -m pip install pillow
# Çalıştırma:  python tools/generate-store-screenshots.py [--debug] [--only ad]

import argparse
import os
import sys
from collections import Counter

from PIL import Image, ImageDraw, ImageFilter, ImageFont

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW_DIR = os.path.join(REPO_ROOT, "docs", "screenshots", "raw")
OUT_DIR = os.path.join(REPO_ROOT, "docs", "screenshots")
DEBUG_DIR = os.path.join(REPO_ROOT, "dist", "store-debug")

# ---------------------------------------------------------------------------
# Kaynak kare ölçüleri (945x2048, ölçüldü — sabit cihaz)
# ---------------------------------------------------------------------------
SRC_SIZE = (945, 2048)
STATUS_BAR_H = 98      # simgeler y 42..85; 98'den sonra uygulama zemini başlıyor
NAV_BAR_TOP = 1932     # 48dp x 2.41 = 116 px (üç tuşlu gezinme çubuğu)

# Ustalık satırları: (satır üstü, çubuk üstü, çubuk altı, sayacın mürekkep üstü)
MASTERY_ROWS = [
    (649, 739, 756, 684),
    (811, 901, 917, 845),
    (972, 1062, 1079, 1006),
    (1133, 1223, 1240, 1167),
    (1294, 1383, 1400, 1328),
    (1455, 1544, 1562, 1489),
]
MASTERY_CARD_X = (97, 847)     # satır dikdörtgeni (kart iç boşluğu 12dp = 29 px)
BAR_X = (126, 818)             # ustalık çubuğunun yatay aralığı
BAR_RADIUS = 9
COUNT_INK_RIGHT = 818          # sayaç metninin mürekkep sağ kenarı
STREAK_LINE_INK = (245, 409)   # "0 Days Streak" mürekkep kutusunun sol-üstü
STREAK_SUB_INK = (245, 464)    # "Start your streak today!" mürekkep kutusunun sol-üstü
STREAK_ERASE = (238, 394, 839, 514)

# 7 günlük şerit hapları (yatay aralıklar, ölçüldü) + hap üstü (iki karede ayrı)
PILL_X = [(125, 215), (225, 316), (326, 416), (427, 517), (528, 617), (629, 719), (730, 819)]
PILL_INNER_INSET = 4           # 1.5dp kenarlık + payı
PILL_TOP_A = 1737              # statistics-mastery.jpg (modal penceresinin altında kesiliyor)
PILL_CLIP_A = 1805             # o karede kaydırma penceresinin alt kenarı (ölçüldü)
PILL_TOP_B = 447               # statistics-calendar.jpg (tam görünür)

# Aktivite takvimi ızgarası (ölçüldü): 5 hafta x 7 sütun, hücre ~89x85, adım 99.1
CAL_ROWS_Y = [(949, 1034), (1048, 1133), (1147, 1232), (1247, 1332), (1345, 1430)]
CAL_COLS_X = [(130, 219), (230, 319), (328, 417), (428, 517), (527, 616), (627, 716), (726, 815)]
CAL_FIRST_COL = 3              # 1 Ekim 2026 = Perşembe -> hafta 0'ın 3. sütunu (0 tabanlı)

# ---------------------------------------------------------------------------
# Palet (AGENTS.md) ve yazı tipleri
# ---------------------------------------------------------------------------
CREAM = (251, 245, 235)        # #FBF5EB  (Home zemini, splash, navigasyon teması)
INK = (44, 62, 80)             # #2C3E50
RED = (220, 38, 38)            # #DC2626
RED_DARK = (153, 27, 27)       # #991B1B
PINK = (254, 226, 226)         # #FEE2E2
WHITE = (255, 255, 255)

CARD_BG = (254, 242, 242)      # #FEF2F2 (seri kartı; 🔥 geri kazanımının zemini)
BAR_BG = (233, 236, 239)       # #E9ECEF (boş takvim hücresinin zemini)
PILL_BORDER = (226, 232, 240)  # #E2E8F0

LEVEL_COLORS = [(248, 113, 113), (239, 68, 68), (220, 38, 38), (185, 28, 28), (153, 27, 27), (127, 29, 29)]
HEAT_COLORS = [(233, 236, 239), (254, 226, 226), (252, 165, 165), (220, 38, 38), (127, 29, 29)]
GREEN = (4, 120, 87)           # #047857 (doğru)
DAY_TEXT = (44, 62, 80)        # #2C3E50
DAY_TEXT_TODAY = (127, 29, 29)  # #7F1D1D

FONTS = {
    "hanzi": [r"C:\Windows\Fonts\msyhbd.ttc", r"C:\Windows\Fonts\msyh.ttc",
              "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
              "/System/Library/Fonts/PingFang.ttc"],
    "caption": [r"C:\Windows\Fonts\segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "ui": [r"C:\Windows\Fonts\segoeui.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"],
    "ui_semibold": [r"C:\Windows\Fonts\seguisb.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
    "ui_bold": [r"C:\Windows\Fonts\segoeuib.ttf", "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"],
}

# Uygulama içi metin boyutları: hedef, uygulamanın GERÇEK render'ının mürekkep
# kutusudur (cihazın yazı tipi ölçeği büyük: 12dp ~ 30 px em).
#   "0/150 (0%)"  hedefi 145x27 -> Segoe UI Semibold 30 -> 145x26
#   "0 Days Streak" (289x46)    -> Segoe UI Bold 46      -> 295x46
#   "Start your streak today!" (313x30) -> Segoe UI 30   -> 309x30
COUNT_FONT_SIZE = 30
STREAK_FONT_SIZE = 46
STREAK_SUB_FONT_SIZE = 30
PILL_FONT_SIZE = 28

# ---------------------------------------------------------------------------
# Vitrin (showcase) düzeni
# ---------------------------------------------------------------------------
CANVAS = (1080, 1920)
SCREEN_W = 700
BEZEL = 15
SCREEN_RADIUS = 72
DEVICE_RADIUS = 86
PHONE_TOP = 332
BADGE_SIZE = 74
BADGE_TOP = 84
CAPTION_Y = 232
CAPTION_MAX_W = 920

SCREENS = [
    ("home", "5,000 HSK words in your pocket"),
    ("quiz-hanzi-to-pinyin", "Read the character, pick the pinyin"),
    ("quiz-hanzi-to-english", "Read the character, pick the meaning"),
    ("quiz-pinyin-to-english", "Read the pinyin, pick the meaning"),
    ("vocabulary", "Search by hanzi, pinyin or meaning"),
    ("handwriting", "Draw a character to look it up"),
    ("statistics-mastery", "Track your mastery, level by level"),
    ("statistics-calendar", "Keep your streak alive"),
]

# ---------------------------------------------------------------------------
# TANITIM VERİSİ: HSK 1-2 tamamen ustalaşılmış, HSK 3 yarıda (kullanıcı isteği).
# Günlük değerler (doğru, yanlış) — ısı rengi toplamdan çıkar, 7 günlük şerit ve
# takvim AYNI veriyi gösterir (tutarlılık şart).
# ---------------------------------------------------------------------------
MASTERY = [
    (100, "150/150 (100%)"),
    (100, "150/150 (100%)"),
    (50, "150/300 (50%)"),
    (0, "0/600 (0%)"),
    (0, "0/1300 (0%)"),
    (0, "0/2500 (0%)"),
]
ORIGINAL_COUNTS = ["0/150 (0%)", "0/150 (0%)", "0/300 (0%)", "0/600 (0%)", "0/1300 (0%)", "0/2500 (0%)"]
STREAK_DAYS = 38
STREAK_SUBTITLE = "Keep the momentum going!"
# 1-17 Ekim 2026 (bugün 17). Değerler: gün -> (doğru, yanlış)
DAILY = {
    1: (9, 2), 2: (6, 1), 3: (48, 5), 4: (62, 8), 5: (18, 3), 6: (24, 4),
    7: (8, 2), 8: (31, 5), 9: (14, 2), 10: (55, 6), 11: (42, 6), 12: (18, 3),
    13: (55, 9), 14: (27, 4), 15: (9, 2), 16: (62, 7), 17: (24, 5),
}
RECENT = [11, 12, 13, 14, 15, 16, 17]   # şeritteki 7 gün (Pazar..Cumartesi)


def font(kind, size):
    for path in FONTS[kind]:
        if os.path.exists(path):
            return ImageFont.truetype(path, size)
    raise SystemExit(f"{kind} yazı tipi bulunamadı; FONTS sözlüğüne bir yol ekleyin.")


def hex_rgb(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4))


def heat_color(total):
    """components/StatsModal.js -> getHeatColor ile aynı eşikler."""
    if total == 0:
        return HEAT_COLORS[0]
    if total <= 10:
        return HEAT_COLORS[1]
    if total <= 25:
        return HEAT_COLORS[2]
    if total <= 50:
        return HEAT_COLORS[3]
    return HEAT_COLORS[4]


def luminance(color):
    return 0.299 * color[0] + 0.587 * color[1] + 0.114 * color[2]


def rounded_mask(size, radius):
    mask = Image.new("L", size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, size[0] - 1, size[1] - 1), radius, fill=255)
    return mask


def draw_text_ink(draw, text, font, fill, ink_left=None, ink_top_right=None, ink_top=None, center_x=None):
    """Metni, MÜREKKEP kutusu hedeflenen noktaya gelecek şekilde çizer.

    Uygulamanın render'ıyla aynı hizayı yakalamak için mürekkep kutusu esas alınır
    (yazı tipi metrikleri farklı olsa da hizalama kaymaz).
    """
    bb = draw.textbbox((0, 0), text, font=font)
    width = bb[2] - bb[0]
    if ink_top_right is not None:
        x = ink_top_right[0] - width - bb[0]
        y = ink_top_right[1] - bb[1]
    elif center_x is not None:
        x = center_x - width / 2 - bb[0]
        y = ink_top - bb[1]
    else:
        x = ink_left - bb[0]
        y = ink_top - bb[1]
    draw.text((x, y), text, font=font, fill=fill)


# ---------------------------------------------------------------------------
# 1. Sistem çubuklarını temizle
# ---------------------------------------------------------------------------
def spread(color):
    """Rengin kanal yayılımı: düşük değer = nötr (zemin/kart), yüksek = doygun."""
    return max(color) - min(color)


def neutral_mode(px, box, spread_max=16):
    """Bant içindeki NÖTR renklerin en sıkı (doygun pikseller sayılmaz)."""
    colors = Counter(
        px[x, y]
        for y in range(box[1], box[3])
        for x in range(box[0], box[2])
        if spread(px[x, y]) <= spread_max
    )
    return colors.most_common(1)[0][0] if colors else px[box[0], box[1]]


def smooth_colors(colors, window=9):
    """Sütun renklerini yatay medyanla yumuşatır (JPEG gürültüsü şerit yapmasın)."""
    half = window // 2
    smoothed = []
    for i in range(len(colors)):
        neighbours = colors[max(0, i - half):min(len(colors), i + half + 1)]
        smoothed.append(tuple(sorted(c[k] for c in neighbours)[len(neighbours) // 2] for k in range(3)))
    return smoothed


def column_fill_colors(px, width, band, fallback):
    """Sütun başına dolgu rengi: bandın en sık rengi, doygun ise güvenli renk.

    Doygun bir renk (örn. gezinme çubuğunda kesilen renkli bir düğme) sütunu
    boyayamaz; o sütun için görüntünün genel nötr rengi (kart/zemin) kullanılır.
    """
    colors = []
    for x in range(width):
        column = Counter(px[x, y] for y in range(band[0], band[1]))
        base = column.most_common(1)[0][0]
        colors.append(base if spread(base) <= 16 else fallback)
    return smooth_colors(colors)


def strip_system_bars(img):
    """Durum ve gezinme çubuğu simgelerini siler; uygulama tam ekran kalır.

    Dolgu, çubuğun hemen altındaki/üstündeki banttan sütun sütun türetilir:
    düz zeminlerde dikişsiz, kart kenarlarında ise doğru (kart rengi çubuğun
    altına taşınır). Böylece kare "sistem çubukları olmadan" görünür.
    """
    width, height = img.size
    px = img.load()

    top_fallback = neutral_mode(px, (0, STATUS_BAR_H + 2, width, STATUS_BAR_H + 40))
    top_colors = column_fill_colors(px, width, (STATUS_BAR_H + 2, STATUS_BAR_H + 18), top_fallback)
    for x in range(width):
        for y in range(0, STATUS_BAR_H):
            px[x, y] = top_colors[x]

    # Gezinme çubuğunun dolgusu KENDİ zemininden okunur (ikonlar y ~1960'ta
    # başlar, bu yüzden çubuğun üst şeridi temizdir): böylece çubuk ile uygulama
    # penceresi arasındaki sınır korunur, kesilen renkli öğeler şerit yapmaz.
    bottom_fallback = neutral_mode(px, (0, NAV_BAR_TOP + 2, width, NAV_BAR_TOP + 40))
    bottom_colors = column_fill_colors(px, width, (NAV_BAR_TOP + 2, NAV_BAR_TOP + 20), bottom_fallback)
    for x in range(width):
        for y in range(NAV_BAR_TOP, height):
            px[x, y] = bottom_colors[x]

    return img


def unfade(pixel, background, opacity):
    """`opacity` ile soluklaştırılmış bir pikseli geri kazanır (🔥 aktif seri)."""
    return tuple(
        max(0, min(255, round((pixel[i] - (1 - opacity) * background[i]) / opacity)))
        for i in range(3)
    )


# ---------------------------------------------------------------------------
# 2. Tanıtım verisi çizimi
# ---------------------------------------------------------------------------
def patch_color(img, box):
    """Bir bölgenin EN SIK rengi: silme işlemleri görüntünün kendi zeminiyle boyanır."""
    px = img.load()
    colors = Counter()
    for y in range(box[1], box[3]):
        for x in range(box[0], box[2]):
            colors[px[x, y]] += 1
    return colors.most_common(1)[0][0]


def draw_mastery_progress(img):
    """Ustalık çubuklarını doldurur, sayaç metinlerini günceller, seriyi canlandırır."""
    draw = ImageDraw.Draw(img)
    count_font = font("ui_semibold", COUNT_FONT_SIZE)

    # --- Seri kartı: soluk 🔥 + "0 Days Streak" -> aktif seri -----------------
    px = img.load()
    fire_box = (108, 400, 240, 516)
    for y in range(fire_box[1], fire_box[3]):
        for x in range(fire_box[0], fire_box[2]):
            # Yalnızca zeminden belirgin farklı pikseller (🔥) güçlendirilir; JPEG
            # gürültüsü 5 kat büyütülmesin.
            if max(abs(a - b) for a, b in zip(px[x, y], CARD_BG)) > 8:
                px[x, y] = unfade(px[x, y], CARD_BG, 0.2)

    # Yalnızca metin sütunu (🔥 sağı) kart zeminiyle boyanır; kartın kendisine
    # ve kenarlığına dokunulmaz.
    card_bg = patch_color(img, (600, 480, 820, 500))
    draw.rectangle(STREAK_ERASE, fill=card_bg)
    draw_text_ink(draw, f"{STREAK_DAYS} Days Streak", font("ui_bold", STREAK_FONT_SIZE),
                  hex_rgb("#B91C1C"), ink_left=STREAK_LINE_INK[0], ink_top=STREAK_LINE_INK[1])
    draw_text_ink(draw, STREAK_SUBTITLE, font("ui", STREAK_SUB_FONT_SIZE),
                  hex_rgb("#991B1B"), ink_left=STREAK_SUB_INK[0], ink_top=STREAK_SUB_INK[1])

    # --- Ustalık satırları ----------------------------------------------------
    for index, (percent, label) in enumerate(MASTERY):
        row_top, bar_top, bar_bottom, count_ink_top = MASTERY_ROWS[index]
        if label != ORIGINAL_COUNTS[index]:
            # Sayaç bölgesi silinir (isim x < 230'da kalır); yuvarlaklık satırın
            # kendi köşe yarıçapıyla aynıdır ki kartın köşesinden taşmasın.
            row_bg = patch_color(img, (300, row_top + 8, 520, bar_top - 10))
            draw.rounded_rectangle((600, row_top, MASTERY_CARD_X[1], bar_top - 2),
                                   29, fill=row_bg)
            draw_text_ink(draw, label, count_font, hex_rgb("#7F8C8D"),
                          ink_top_right=(COUNT_INK_RIGHT, count_ink_top))
        if percent > 0:
            x1 = BAR_X[0] + round((BAR_X[1] - BAR_X[0]) * percent / 100)
            draw.rounded_rectangle((BAR_X[0], bar_top, x1, bar_bottom),
                                   BAR_RADIUS, fill=LEVEL_COLORS[index])
    return img


def draw_pills(img, pill_top, clip_bottom=None):
    """7 günlük şeridi doldurur (üstte yeşil doğru, altta kırmızı yanlış).

    `clip_bottom`: modalın kaydırma penceresinin alt kenarı. statistics-mastery
    karesinde şerit kartın altında kesilir; uygulama da kırmızı sayıyı orada
    göstermez, bu yüzden çizilmez.
    """
    draw = ImageDraw.Draw(img)
    number_font = font("ui_bold", PILL_FONT_SIZE)
    bottom = pill_top + 112 if clip_bottom is None else min(pill_top + 112, clip_bottom)

    for i, (x0, x1) in enumerate(PILL_X):
        correct, wrong = DAILY[RECENT[i]]
        draw.rounded_rectangle(
            (x0 + PILL_INNER_INSET, pill_top + PILL_INNER_INSET, x1 - PILL_INNER_INSET, bottom),
            30, fill=WHITE)
        cx = (x0 + x1) / 2
        draw_text_ink(draw, str(correct), number_font, GREEN, center_x=cx, ink_top=pill_top + 20)
        # Ayraç: hapın %70 genişliğinde ince çizgi (pillDivider)
        divider_w = round((x1 - x0) * 0.7)
        if pill_top + 59 <= bottom:
            draw.rectangle((cx - divider_w / 2, pill_top + 58, cx + divider_w / 2, pill_top + 59),
                           fill=PILL_BORDER)
        if pill_top + 98 <= bottom:
            draw_text_ink(draw, str(wrong), number_font, hex_rgb("#DC2626"), center_x=cx, ink_top=pill_top + 78)
    return img


def draw_calendar_progress(img):
    """Ekim 2026 takvimini günlük aktiviteye göre ısı rengiyle boyar.

    Gündeki rakam korunur: rakamın kapsama oranı parlaklıktan kestirilip yeni
    zeminle yeniden birleştirilir (yazı tipi birebir aynı kalır, sadece rengi
    değişir). Kapsama, ÖZGÜN koyu rakam rengine göre hesaplanır; hedef renk
    beyaz olsa bile formül aynıdır.
    """
    px = img.load()
    bg_lum = luminance(BAR_BG)
    dark_lum = luminance(DAY_TEXT)

    for day, (correct, wrong) in DAILY.items():
        total = correct + wrong
        index = CAL_FIRST_COL + day - 1
        week, column = divmod(index, 7)
        if week >= len(CAL_ROWS_Y):
            continue
        y0, y1 = CAL_ROWS_Y[week]
        x0, x1 = CAL_COLS_X[column]
        heat = heat_color(total)
        is_today = day == 17
        # Rakam rengi: StatsModal'ın kuralları (kalendarDayText/Light/Today)
        text_color = WHITE if total > 25 else (DAY_TEXT_TODAY if is_today else DAY_TEXT)
        inset = 6 if is_today else 3
        mask = rounded_mask((x1 - x0 - 2 * inset, y1 - y0 - 2 * inset), 9)

        for y in range(y0 + inset, y1 - inset):
            for x in range(x0 + inset, x1 - inset):
                if mask.getpixel((x - x0 - inset, y - y0 - inset)) == 0:
                    continue
                coverage = (bg_lum - luminance(px[x, y])) / (bg_lum - dark_lum)
                coverage = 0.0 if coverage < 0.06 else min(1.0, coverage)
                px[x, y] = tuple(
                    round(coverage * text_color[i] + (1 - coverage) * heat[i]) for i in range(3)
                )
    return img


# ---------------------------------------------------------------------------
# 3. Vitrin görseli
# ---------------------------------------------------------------------------
def build_showcase(screen, caption):
    """Kareyi krem zemin + telefon çerçevesi + marka + başlık ile birleştirir."""
    canvas_w, canvas_h = CANVAS
    scale = SCREEN_W / SRC_SIZE[0]
    screen_h = round(SRC_SIZE[1] * scale)
    device_w = SCREEN_W + 2 * BEZEL
    device_h = screen_h + 2 * BEZEL
    device_x = (canvas_w - device_w) // 2

    background = Image.new("RGB", CANVAS, CREAM)
    decor = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    decor_draw = ImageDraw.Draw(decor)

    # Yumuşak kırmızı hale (telefonun arkasında)
    decor_draw.ellipse((device_x - 120, PHONE_TOP + 120, device_x + device_w + 120, PHONE_TOP + device_h - 60),
                       fill=PINK + (110,))
    # Zeminde soluk 汉字 (uygulamanın kayan karakter dekorasyonuyla aynı dil)
    hanzi_font = font("hanzi", 560)
    for glyph, (gx, gy) in (("\u5b66", (-70, 380)), ("\u8bcd", (735, 1080)), ("\u8bed", (-30, 1560))):
        decor_draw.text((gx, gy), glyph, font=hanzi_font, fill=RED_DARK + (22,))
    decor = decor.filter(ImageFilter.GaussianBlur(14))
    background = Image.alpha_composite(background.convert("RGBA"), decor)

    # Telefon gölgesi
    shadow = Image.new("RGBA", CANVAS, (0, 0, 0, 0))
    ImageDraw.Draw(shadow).rounded_rectangle(
        (device_x, PHONE_TOP + 22, device_x + device_w, PHONE_TOP + device_h + 22),
        DEVICE_RADIUS, fill=INK + (78,))
    background = Image.alpha_composite(background, shadow.filter(ImageFilter.GaussianBlur(26)))

    # Gövde + ekran
    device = Image.new("RGBA", (device_w, device_h), (0, 0, 0, 0))
    device_draw = ImageDraw.Draw(device)
    device_draw.rounded_rectangle((0, 0, device_w - 1, device_h - 1), DEVICE_RADIUS, fill=INK)
    device_draw.rounded_rectangle((2, 2, device_w - 3, device_h - 3), DEVICE_RADIUS - 2,
                                  outline=(62, 84, 106, 255), width=3)
    screen_resized = screen.resize((SCREEN_W, screen_h), Image.LANCZOS)
    device.paste(screen_resized, (BEZEL, BEZEL), rounded_mask((SCREEN_W, screen_h), SCREEN_RADIUS))
    # Delikli kamera (edge-to-edge: uygulamanın üst boşluğuna denk gelir)
    hole_r = 13
    hole_cx = BEZEL + SCREEN_W // 2
    device_draw.ellipse((hole_cx - hole_r, BEZEL + 22, hole_cx + hole_r, BEZEL + 22 + 2 * hole_r),
                        fill=(26, 35, 47, 255))
    background.alpha_composite(device, (device_x, PHONE_TOP))

    # Marka + başlık
    draw = ImageDraw.Draw(background)
    wordmark_font = font("caption", 50)
    wordmark = "HanyuPick"
    wordmark_w = round(draw.textlength(wordmark, font=wordmark_font))
    group_w = BADGE_SIZE + 16 + wordmark_w
    group_x = (canvas_w - group_w) // 2
    draw.rounded_rectangle((group_x, BADGE_TOP, group_x + BADGE_SIZE, BADGE_TOP + BADGE_SIZE),
                           22, fill=RED)
    draw.text((group_x + BADGE_SIZE / 2, BADGE_TOP + BADGE_SIZE / 2 + 2), "\u6c49",
              font=font("hanzi", 52), fill=WHITE, anchor="mm")
    draw.text((group_x + BADGE_SIZE + 16, BADGE_TOP + BADGE_SIZE / 2), wordmark,
              font=wordmark_font, fill=INK, anchor="lm")

    caption_size = 54
    while caption_size > 30 and draw.textlength(caption, font=font("caption", caption_size)) > CAPTION_MAX_W:
        caption_size -= 2
    draw.text((canvas_w / 2, CAPTION_Y), caption, font=font("caption", caption_size),
              fill=INK, anchor="mm")

    return background.convert("RGB")


# ---------------------------------------------------------------------------
def save(img, path, quality=88):
    img.save(path, "JPEG", quality=quality, optimize=True, subsampling=0, progressive=True)
    return os.path.getsize(path)


def debug_save(img, name, box, zoom=2):
    os.makedirs(DEBUG_DIR, exist_ok=True)
    crop = img.crop(box)
    crop = crop.resize((crop.width * zoom, crop.height * zoom), Image.LANCZOS)
    crop.save(os.path.join(DEBUG_DIR, f"{name}.png"))


def process(name, caption, debug):
    raw = Image.open(os.path.join(RAW_DIR, f"{name}.jpg")).convert("RGB")
    screen = strip_system_bars(raw)

    if name == "statistics-mastery":
        draw_mastery_progress(screen)
        draw_pills(screen, PILL_TOP_A, clip_bottom=PILL_CLIP_A)
    elif name == "statistics-calendar":
        draw_pills(screen, PILL_TOP_B)
        draw_calendar_progress(screen)

    if debug:
        if name == "statistics-mastery":
            debug_save(screen, "a_streak", (90, 355, 855, 535))
            debug_save(screen, "a_mastery", (90, 630, 855, 1610), zoom=1)
            debug_save(screen, "a_pills", (100, 1700, 850, 1870))
        if name == "statistics-calendar":
            debug_save(screen, "b_pills", (100, 410, 850, 660))
            debug_save(screen, "b_calendar", (90, 890, 855, 1470), zoom=1)
        debug_save(screen, f"{name}_top", (0, 0, 945, 200))
        debug_save(screen, f"{name}_bottom", (0, 1830, 945, 2048), zoom=1)

    showcase = build_showcase(screen, caption)
    out_path = os.path.join(OUT_DIR, f"{name}.jpg")
    return save(showcase, out_path)


def main():
    parser = argparse.ArgumentParser(description="Mağaza tarzı vitrin görsellerini üretir.")
    parser.add_argument("--debug", action="store_true", help="kırpma/veri bölgelerini dist/store-debug altına yaz")
    parser.add_argument("--only", help="yalnızca bu kareyi üret (ör. home)")
    args = parser.parse_args()

    total = 0
    for name, caption in SCREENS:
        if args.only and args.only != name:
            continue
        size = process(name, caption, args.debug)
        total += size
        print(f"  {name:24s} {size / 1024:7.1f} KB  - {caption}")
    print(f"toplam {total / 1024 / 1024:.2f} MB")
    return 0


if __name__ == "__main__":
    sys.exit(main())
