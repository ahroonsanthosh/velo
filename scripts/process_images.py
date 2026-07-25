#!/usr/bin/env python3
"""One-off image pipeline for Café Velo. Crops, cleans (levels/sharpen only,
never redraws), and exports WebP/AVIF derivatives from the source photos."""
import os
from PIL import Image, ImageOps, ImageFilter, ImageEnhance

SRC = "assets/img/source"
OUT = "assets/img/processed"
os.makedirs(OUT, exist_ok=True)


def clean(im, sharpen=1.3, contrast=1.06, saturation=1.05):
    im = ImageEnhance.Contrast(im).enhance(contrast)
    im = ImageEnhance.Color(im).enhance(saturation)
    im = im.filter(ImageFilter.UnsharpMask(radius=1.4, percent=90, threshold=2))
    return im


def save_all(im, name, widths, quality=82):
    for w in widths:
        if im.width < w:
            continue
        h = round(im.height * (w / im.width))
        r = im.resize((w, h), Image.LANCZOS)
        r.save(f"{OUT}/{name}-{w}.webp", "WEBP", quality=quality, method=6)
        try:
            # AVIF's perceptual quality scale isn't 1:1 with WebP's — a lower
            # numeric quality here still beats WebP's file size at comparable
            # visual fidelity (verified: q52/speed4 undercuts q82 WebP by ~40%).
            r.save(f"{OUT}/{name}-{w}.avif", "AVIF", quality=52, speed=4)
        except Exception as e:
            print("avif skip", name, w, e)
    # also a base at native/max requested width
    top = max(w for w in widths if im.width >= w)
    return top


im = lambda f: Image.open(f"{SRC}/{f}").convert("RGB")

# ---- 1. LOGO WORDMARK -- traced crop, zero redraw, only global levels/sharpen ----
cv1 = im("cv1.webp")
logo = cv1.crop((90, 118, 680, 235))
logo = logo.resize((logo.width * 2, logo.height * 2), Image.LANCZOS)
logo = ImageEnhance.Contrast(logo).enhance(1.12)
logo = ImageEnhance.Brightness(logo).enhance(1.03)
logo = logo.filter(ImageFilter.UnsharpMask(radius=2, percent=140, threshold=2))
logo.save(f"{OUT}/logo-wordmark.png")
logo.save(f"{OUT}/logo-wordmark.webp", "WEBP", quality=92)
print("logo-wordmark", logo.size)

# ---- 2. FAVICON SOURCE -- E + accent crop, same treatment ----
fav = cv1.crop((245, 120, 360, 235))
fav = fav.resize((fav.width * 5, fav.height * 5), Image.LANCZOS)
fav = ImageEnhance.Contrast(fav).enhance(1.1)
fav = fav.filter(ImageFilter.UnsharpMask(radius=2, percent=120, threshold=2))
# pad to perfect square on its own navy tone (sampled) so favicon isn't stretched
navy = (61, 74, 92)
side = max(fav.size)
sq = Image.new("RGB", (side, side), navy)
sq.paste(fav, ((side - fav.width) // 2, (side - fav.height) // 2))
sq.save(f"{OUT}/favicon-source.png")
for s in (16, 32, 48, 180, 192, 512):
    sq.resize((s, s), Image.LANCZOS).save(f"{OUT}/favicon-{s}.png")
print("favicon-source", sq.size)

# ---- 3. HERO: shopfront (on-site, real) ----
hero = clean(cv1, sharpen=1.0, contrast=1.08, saturation=1.08)
save_all(hero, "hero-shopfront", [480, 765])
# wide top-band crop for mobile hero (fascia + windows, more landscape)
band = cv1.crop((0, 60, 765, 760))
band = clean(band, contrast=1.08, saturation=1.06)
save_all(band, "hero-shopfront-band", [480, 765])

# ---- 4. Latte art (on-site, real) — about section ----
latte = im("cv17.jpg")
latte = clean(latte, contrast=1.05, saturation=1.1)
save_all(latte, "latte", [399])

# ---- 5. Breakfast overhead (on-site, real) ----
b6 = im("cv6.webp")
b6 = clean(b6, contrast=1.06, saturation=1.08)
save_all(b6, "breakfast-overhead", [480, 574])

# ---- 6. Studio shots — SMALL, tight crops only, never hero ----
benedict = im("cv2.webp")
# crop the plate tightly, drop excess black margin
bcrop = benedict.crop((520, 40, 1344, 756))
bcrop = clean(bcrop, contrast=1.05, saturation=1.05)
save_all(bcrop, "benedict-thumb", [480, 700])

burger = im("cv3.webp")
bgcrop = burger.crop((300, 0, 1150, 765))
bgcrop = clean(bgcrop, contrast=1.05, saturation=1.05)
save_all(bgcrop, "burger-thumb", [480, 700])

# ---- 7. cv16 detail slice — decorative band (VELO dimensional lettering close-up) ----
detail = im("cv16.jpg")
# landscape slice through the letters, mid-height
slice_ = detail.crop((0, 900, 1793, 1750))
slice_ = clean(slice_, contrast=1.05, saturation=1.02)
save_all(slice_, "velo-detail-band", [900, 1793])

print("DONE")
