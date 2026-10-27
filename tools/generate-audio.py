# tools/generate-audio.py
#
# Web için ÇİNCE SES ÜRETİCİSİ: `public/audio/hsk/<id>.mp3` dosyaları bu
# betikten çıkar; elle eklenmez, elle düzenlenmez.
#
# NEDEN VAR: web'de `expo-speech` tarayıcının `speechSynthesis`'ini kullanır ve
# o da İŞLETİM SİSTEMİNİN kurulu seslerine bağlıdır. Çince ses paketi olmayan
# bir makinede Hanzi metni sessiz bir utterance'a dönüşür (ölçüldü: Windows +
# yalnız Türkçe ses -> "你好" 0 ms ses, "merhaba" 1.7 s ses). Bu yüzden 5.000
# kelimenin sesi BİR KEZ burada üretilip statik dosya olarak sunulur. Native
# tarafta cihazın kendi TTS'i kullanılmaya devam eder; ses dosyaları APK'ya
# girmez (`public/` yalnızca web export'una kopyalanır).
#
# Gereksinimler:
#   python -m pip install edge-tts imageio-ffmpeg
#   (edge-tts sesi üretir, imageio-ffmpeg kendi ffmpeg ikilisini getirir)
#
# Çalıştırma (her yerden):
#   python tools/generate-audio.py                  # eksik olanları üret (devam edebilir)
#   python tools/generate-audio.py --force          # hepsini yeniden üret
#   python tools/generate-audio.py --levels 1 2     # yalnız HSK 1-2
#   python tools/generate-audio.py --limit 20       # ilk 20 kelime (deneme)
#   python tools/generate-audio.py --verify         # ağa çıkmadan kapsam kontrolü
#
# Ses: zh-CN-XiaoxiaoNeural, hız -15%. Native TTS `rate: 0.85` kullanır, yani
# web ile cihaz aynı tempoda okur. Ses ya da hız değiştirilirse TÜM dosyalar
# `--force` ile yeniden üretilmelidir; yoksa eski ve yeni ses karışır.
#
# NEDEN FFMPEG: servis her kısa metni sabit ~1,87 s'lik bir tampona koyuyor,
# yani 1 heceli bir kelimenin ardından ~1,3 s SESSİZLİK geliyor (ölçüldü:
# 爱 -> 0,59 s konuşma + 1,28 s sessizlik). Bu hem gecikme hem de 5000 dosyada
# ~55 MB demek. Kırpma + 32 kbps mono yeniden kodlama ile kelime başına
# ~2-4 KB kalıyor (toplam ~15 MB) ve kelime biter bitmez susuyor.
#
# Dosya adı = kelime id'si (data/hsk*.json). Kelime id'leri kimliktir: bir
# kelime taşınırsa (services/wordIdMigrations.ts) o id'nin sesi de o kelimeyi
# okur, ayrıca bir eşleme gerekmez. __tests__/audioAssets.test.ts her id için
# dosya olduğunu doğrular.

import argparse
import asyncio
import json
import subprocess
import sys
import tempfile
from pathlib import Path

VOICE = "zh-CN-XiaoxiaoNeural"
RATE = "-15%"
BITRATE = "32k"
SAMPLE_RATE = "24000"
CONCURRENCY = 4
RETRIES = 3

# Sessizliği kırpma: -50 dB eşiği konuşmanın tamamını korur, 0,05 s'lik
# "start_duration" ise kelime ortasındaki kısa boşlukların kesilmesini engeller.
# apad sondaki 0,2 s'lik doğal kuyruğu geri verir (kelime "kesik" duyulmasın).
TRIM_FILTER = (
    "silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.05,"
    "areverse,"
    "silenceremove=start_periods=1:start_threshold=-50dB:start_duration=0.05,"
    "areverse,"
    "apad=pad_dur=0.2"
)

REPO_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = REPO_ROOT / "data"
OUT_DIR = REPO_ROOT / "public" / "audio" / "hsk"
LEVELS = [1, 2, 3, 4, 5, 6]


def ffmpeg_path():
    """ffmpeg ikilisini bulur: önce imageio-ffmpeg paketi, sonra PATH."""
    try:
        import imageio_ffmpeg

        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        from shutil import which

        found = which("ffmpeg")
        if not found:
            raise SystemExit(
                "ffmpeg bulunamadı. Kurun: python -m pip install imageio-ffmpeg"
            )
        return found


def load_words(levels):
    """Seçilen seviyelerin kelimelerini (id, hanzi) olarak döndürür."""
    words = []
    for level in levels:
        path = DATA_DIR / f"hsk{level}.json"
        if not path.exists():
            raise SystemExit(f"Veri dosyası bulunamadı: {path}")
        with open(path, encoding="utf-8") as handle:
            for record in json.load(handle):
                words.append((int(record["id"]), record["hanzi"]))
    return words


def speech_text(hanzi):
    """Motorun doğal okuması için metni sadeleştirir.

    Çok parçalı kalıplarda (`虽然……但是……`) üç nokta yerine virgül veriyoruz:
    aksi halde motor uzun ve boş bir duraklama üretiyor.
    """
    return hanzi.replace("……", "，").replace("…", "，").strip()


def encode(ffmpeg, raw_path, target):
    """Ham MP3'ü kırpıp hedef dosyaya yazar (tek geçiş, tekrar kodlama).

    `-f mp3` açıkça verilir: hedef dosya `.part` uzantılıdır (yarım dosya
    bırakmamak için) ve ffmpeg biçimi uzantıdan çıkaramaz.
    """
    result = subprocess.run(
        [
            ffmpeg,
            "-hide_banner",
            "-loglevel",
            "error",
            "-y",
            "-i",
            str(raw_path),
            "-af",
            TRIM_FILTER,
            "-ac",
            "1",
            "-ar",
            SAMPLE_RATE,
            "-c:a",
            "libmp3lame",
            "-b:a",
            BITRATE,
            "-f",
            "mp3",
            str(target),
        ],
        capture_output=True,
    )
    if result.returncode != 0:
        detail = result.stderr.decode("utf-8", "replace").strip().splitlines()
        raise RuntimeError(f"ffmpeg: {detail[-1] if detail else result.returncode}")


async def synthesize(ffmpeg, text, target):
    """Tek kelimeyi üretir; yarım kalan dosya bırakmamak için önce geçici yola yazar."""
    import edge_tts

    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.mp3"
        await edge_tts.Communicate(text, VOICE, rate=RATE).save(str(raw))
        if not raw.exists() or raw.stat().st_size == 0:
            raise RuntimeError("ses üretilemedi (boş yanıt)")
        partial = target.with_suffix(".part")
        try:
            encode(ffmpeg, raw, partial)
            partial.replace(target)
        finally:
            if partial.exists():
                partial.unlink()


async def generate(words, force):
    ffmpeg = ffmpeg_path()
    semaphore = asyncio.Semaphore(CONCURRENCY)
    total = len(words)
    done = 0
    failed = []

    async def worker(word_id, hanzi):
        nonlocal done
        target = OUT_DIR / f"{word_id}.mp3"
        async with semaphore:
            if target.exists() and target.stat().st_size > 0 and not force:
                done += 1
                return
            for attempt in range(1, RETRIES + 1):
                try:
                    await synthesize(ffmpeg, speech_text(hanzi), target)
                    break
                except Exception as error:  # ağ/servis hatası: tekrar dene
                    if attempt == RETRIES:
                        failed.append((word_id, hanzi, repr(error)))
                    else:
                        await asyncio.sleep(1.5 * attempt)
        done += 1
        if done % 25 == 0 or done == total:
            print(f"  {done}/{total}", flush=True)

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    await asyncio.gather(*(worker(word_id, hanzi) for word_id, hanzi in words))
    return failed


def verify(words):
    """Ağa çıkmadan kapsam kontrolü: her kelime id'si için dosya var mı?"""
    files = [path for path in OUT_DIR.glob("*.mp3") if path.stat().st_size > 0]
    existing = {int(path.stem) for path in files}
    wanted = {word_id for word_id, _ in words}
    missing = sorted(wanted - existing)
    extra = sorted(existing - wanted)
    total_bytes = sum(path.stat().st_size for path in files)
    print(
        f"Beklenen: {len(wanted)}  Var: {len(existing & wanted)}  "
        f"Eksik: {len(missing)}  Fazla: {len(extra)}"
    )
    if missing:
        print(f"Eksik id'ler (ilk 20): {missing[:20]}")
    if extra:
        print(f"Kütüphanede olmayan dosyalar (ilk 20): {extra[:20]}")
    print(f"Toplam boyut: {total_bytes / (1024 * 1024):.1f} MB")
    return not missing and not extra


def main():
    # Windows konsolu varsayılan olarak cp1254 olabilir; Hanzi yazdırmak
    # UnicodeEncodeError ile betiği düşürmemeli (yalnız çıktı, veri değil).
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    parser = argparse.ArgumentParser(description="HanyuPick web ses dosyalarını üretir.")
    parser.add_argument("--levels", nargs="+", type=int, default=LEVELS, help="HSK seviyeleri (1-6)")
    parser.add_argument("--limit", type=int, default=0, help="Yalnızca ilk N kelime (deneme)")
    parser.add_argument("--force", action="store_true", help="Var olan dosyaları da yeniden üret")
    parser.add_argument("--verify", action="store_true", help="Ağa çıkmadan kapsamı kontrol et")
    args = parser.parse_args()

    words = load_words(args.levels)
    if args.limit:
        words = words[: args.limit]

    if args.verify:
        sys.exit(0 if verify(words) else 1)

    print(f"{len(words)} kelime -> {OUT_DIR.relative_to(REPO_ROOT)}  (ses: {VOICE}, hız: {RATE})")
    failed = asyncio.run(generate(words, args.force))

    if failed:
        print(f"\n{len(failed)} kelime üretilemedi:")
        for word_id, hanzi, error in failed[:10]:
            print(f"  id {word_id} {hanzi}: {error}")
        sys.exit(1)

    verify(words)


if __name__ == "__main__":
    main()
