# tools/generate-icons.py
#
# Uygulama ikonlarının ÜRETİCİSİ: `assets/` içindeki PNG'ler bu betikten çıkar,
# elle düzenlenmez. Palet ya da font değişirse betiği yeniden çalıştır.
#
# Konsept: uygulamanın kırmızı rampasından köşegen geçiş (sol üst #DC2626 ->
# sağ alt #991B1B) üzerine krem (#FBF5EB) "汉" (hàn = Çince/Çinli) karakteri.
# Karakter Microsoft YaHei Bold ile, mürekkep kutusu tuvale tam ortalanarak ve
# 4x büyütüp küçültme (supersampling) ile çizilir; 48 px'te de okunur.
#
# Gereksinim: Python 3 + Pillow  ->  python -m pip install pillow
# Çalıştırma:  python tools/generate-icons.py     (her yerden)
#
# Çıktılar (hepsi 1024x1024, favicon 96x96, splash 512x512):
#   assets/icon.png                      iOS + genel ikon (saydamlık YOK -> RGB şart)
#   assets/android-icon-background.png   adaptive icon zemini (kırmızı geçiş)
#   assets/android-icon-foreground.png   adaptive icon ön katmanı (krem 汉, saydam)
#   assets/android-icon-monochrome.png   themed icon katmanı (beyaz 汉, saydam)
#   assets/favicon.png                   web favicon (yuvarlatılmış köşe, saydam)
#   assets/splash-icon.png               splash ekranı (Faz 18; aynı ikon, yuvarlatılmış köşe)

import os
from PIL import Image, ImageDraw, ImageFont

RED_LIGHT = (220, 38, 38)    # #DC2626
RED_DARK = (153, 27, 27)     # #991B1B
CREAM = (251, 245, 235)      # #FBF5EB
WHITE = (255, 255, 255)

GLYPH = "\u6c49"             # 汉
GLYPH_SCALE = 0.42           # mürekkep kutusu / tuval oranı (Android güvenli bölgesi: 0.667).
                             # Faz 18: 0.60 -> 0.42 (kullanıcı: karakter ikonda %30 fazla büyüktü).
FAVICON_SIZE = 96
SPLASH_SIZE = 512            # splash ekranı görseli (expo-splash-screen image)
SPLASH_RADIUS = 0.22         # splash görselinin köşe yuvarlaklığı (icon ile aynı dil)
ICON_SIZE = 1024
SS = 4                       # supersampling çarpanı

FONT_CANDIDATES = [
    r"C:\Windows\Fonts\msyhbd.ttc",   # Microsoft YaHei Bold
    r"C:\Windows\Fonts\msyh.ttc",     # Microsoft YaHei
    "/usr/share/fonts/opentype/noto/NotoSansCJK-Bold.ttc",
    "/System/Library/Fonts/PingFang.ttc",
]

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ASSETS = os.path.join(REPO_ROOT, "assets")


def pick_font_path():
    for path in FONT_CANDIDATES:
        if os.path.exists(path):
            return path
    raise SystemExit("Hanzi fontu bulunamadı; FONT_CANDIDATES listesine bir yol ekleyin.")


def gradient(size, c1, c2):
    """Sol üstten sağ alta yumuşak renk geçişi (küçük tuvalde hesaplanıp büyütülür)."""
    n = 96
    small = Image.new("RGB", (n, n))
    px = small.load()
    for y in range(n):
        for x in range(n):
            t = (x + y) / (2 * (n - 1))
            px[x, y] = (
                round(c1[0] + (c2[0] - c1[0]) * t),
                round(c1[1] + (c2[1] - c1[1]) * t),
                round(c1[2] + (c2[2] - c1[2]) * t),
            )
    return small.resize((size, size), Image.BICUBIC)


def glyph_layer(size, target, color, font_path):
    """Mürekkep kutusunun en büyük kenarı `target` olacak, tuvale tam ortalanmış
    ve verilen renkte Hanzi katmanı (saydam zemin)."""
    lo, hi = 8, 4000
    best = None
    while lo <= hi:
        mid = (lo + hi) // 2
        font = ImageFont.truetype(font_path, mid)
        box = font.getbbox(GLYPH)
        if max(box[2] - box[0], box[3] - box[1]) <= target:
            best = (font, box)
            lo = mid + 1
        else:
            hi = mid - 1
    if best is None:
        raise SystemExit("Font ölçeklenemedi (hedef boyut çok küçük).")
    font, box = best
    w, h = box[2] - box[0], box[3] - box[1]
    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    ImageDraw.Draw(layer).text(
        ((size - w) / 2 - box[0], (size - h) / 2 - box[1]), GLYPH, font=font, fill=color
    )
    return layer


def rounded(img, radius_frac):
    """Görüntüye yuvarlatılmış köşe maskesi uygular (favicon için)."""
    n = img.size[0]
    mask = Image.new("L", (n, n), 0)
    ImageDraw.Draw(mask).rounded_rectangle(
        [0, 0, n - 1, n - 1], radius=int(radius_frac * n), fill=255
    )
    out = img.convert("RGBA")
    out.putalpha(mask)
    return out


def downscale(img, size):
    return img.resize((size, size), Image.LANCZOS)


def save(img, name):
    path = os.path.join(ASSETS, name)
    img.save(path, "PNG", optimize=True)
    mode = "RGBA" if img.mode == "RGBA" else "RGB"
    print("  %-32s %4dx%-5d %-5s %6.1f KB" % (name, img.size[0], img.size[1], mode, os.path.getsize(path) / 1024))


def main():
    font_path = pick_font_path()
    os.makedirs(ASSETS, exist_ok=True)
    print("font: %s" % font_path)
    print("çıktılar: %s" % ASSETS)

    big = ICON_SIZE * SS

    # Zemin: köşegen kırmızı geçiş
    background = gradient(big, RED_LIGHT, RED_DARK).convert("RGBA")

    # 汉 katmanları (krem = normal ikon, beyaz = themed icon)
    glyph_cream = glyph_layer(big, GLYPH_SCALE * big, CREAM, font_path)
    glyph_white = glyph_layer(big, GLYPH_SCALE * big, WHITE, font_path)

    # icon.png: zemin + 汉, saydamlık yok (App Store ikonlarında alfa kabul edilmez)
    icon = background.copy()
    icon.alpha_composite(glyph_cream)
    icon_rgb = downscale(icon, ICON_SIZE).convert("RGB")
    save(icon_rgb, "icon.png")

    # Android adaptive icon: zemin ve ön katman ayrı dosyalar, 汉 güvenli bölgede
    save(downscale(background, ICON_SIZE).convert("RGB"), "android-icon-background.png")
    save(downscale(glyph_cream, ICON_SIZE), "android-icon-foreground.png")
    save(downscale(glyph_white, ICON_SIZE), "android-icon-monochrome.png")

    # favicon: yuvarlatılmış köşeli, küçük boyutta temiz görünsün
    fav = rounded(icon_rgb, 0.20)
    save(downscale(fav, FAVICON_SIZE), "favicon.png")

    # splash ekranı görseli: aynı ikon, yuvarlatılmış köşeli (expo-splash-screen).
    # Zemin rengi app.json'daki plugin ayarında Home ile aynı verilir (#FBF5EB).
    save(downscale(rounded(icon_rgb, SPLASH_RADIUS), SPLASH_SIZE), "splash-icon.png")

    # app.json'daki adaptiveIcon.backgroundColor için geçişin orta tonu
    mid = tuple(round((a + b) / 2) for a, b in zip(RED_LIGHT, RED_DARK))
    print("adaptiveIcon.backgroundColor icin onerilen ton: #%02X%02X%02X" % mid)


if __name__ == "__main__":
    main()
