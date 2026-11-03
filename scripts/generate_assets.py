from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parent.parent
BUILD = ROOT / "build"
ARTIFACTS = ROOT / "tests" / "artifacts"
BUILD.mkdir(exist_ok=True)
ARTIFACTS.mkdir(parents=True, exist_ok=True)

FONT_REGULAR = Path("C:/Windows/Fonts/segoeui.ttf")
FONT_BOLD = Path("C:/Windows/Fonts/segoeuib.ttf")


def font(size, bold=False):
    path = FONT_BOLD if bold else FONT_REGULAR
    if path.exists():
        return ImageFont.truetype(str(path), size)
    return ImageFont.load_default(size=size)


def vertical_gradient(size, top, bottom):
    width, height = size
    image = Image.new("RGB", size)
    draw = ImageDraw.Draw(image)
    for y in range(height):
        ratio = y / max(1, height - 1)
        color = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3))
        draw.line((0, y, width, y), fill=color)
    return image


def make_logo(size=1024):
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    mask = Image.new("L", (size, size), 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.rounded_rectangle((0, 0, size - 1, size - 1), radius=round(size * 0.22), fill=255)
    gradient = vertical_gradient((size, size), (19, 133, 91), (18, 45, 64)).convert("RGBA")
    canvas.paste(gradient, (0, 0), mask)

    overlay = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse((size * .56, -size * .18, size * 1.14, size * .4), fill=(255, 255, 255, 18))
    overlay_draw.ellipse((-size * .2, size * .7, size * .38, size * 1.28), fill=(85, 210, 157, 20))
    canvas = Image.alpha_composite(canvas, overlay)
    draw = ImageDraw.Draw(canvas)

    letter = "W"
    letter_font = font(round(size * .57), bold=True)
    bbox = draw.textbbox((0, 0), letter, font=letter_font)
    x = (size - (bbox[2] - bbox[0])) / 2 - bbox[0] - size * .025
    y = size * .39 - (bbox[3] - bbox[1]) / 2 - bbox[1]
    draw.text((x, y), letter, font=letter_font, fill=(255, 255, 255, 255))

    center = (size * .77, size * .76)
    radius = size * .17
    draw.ellipse((center[0] - radius, center[1] - radius, center[0] + radius, center[1] + radius), fill=(116, 214, 159, 255))
    points = [
        (center[0] - radius * .5, center[1]),
        (center[0] - radius * .12, center[1] + radius * .38),
        (center[0] + radius * .57, center[1] - radius * .42),
    ]
    draw.line(points, fill=(16, 54, 44, 255), width=round(size * .055), joint="curve")
    return canvas


def make_sidebar(uninstaller=False):
    scale = 4
    width, height = 164 * scale, 314 * scale
    top = (65, 46, 67) if uninstaller else (18, 55, 67)
    bottom = (25, 29, 39) if uninstaller else (13, 31, 39)
    image = vertical_gradient((width, height), top, bottom).convert("RGBA")
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    overlay_draw = ImageDraw.Draw(overlay)
    overlay_draw.ellipse((-85 * scale, 225 * scale, 195 * scale, 505 * scale), fill=(76, 175, 130, 18))
    image = Image.alpha_composite(image, overlay)

    logo = make_logo().resize((76 * scale, 76 * scale), Image.Resampling.LANCZOS)
    image.alpha_composite(logo, (44 * scale, 30 * scale))
    draw = ImageDraw.Draw(image)
    name_font = font(20 * scale, bold=True)
    draw.text((22 * scale, 126 * scale), "Wol", font=name_font, fill="#ffffff")
    draw.text((22 * scale, 151 * scale), "Edit Text", font=name_font, fill="#ffffff")
    subtitle = "Disinstallazione" if uninstaller else "Il testo è tuo.\nIl formato anche."
    draw.multiline_text((23 * scale, 198 * scale), subtitle, font=font(10 * scale), fill="#b8d3ca", spacing=6 * scale)
    draw.rounded_rectangle((22 * scale, 267 * scale, 141 * scale, 268 * scale), radius=1 * scale, fill="#4f8c77")
    return image.resize((164, 314), Image.Resampling.LANCZOS).convert("RGB")


def make_header():
    scale = 4
    image = Image.new("RGBA", (150 * scale, 57 * scale), (255, 255, 255, 255))
    logo = make_logo().resize((38 * scale, 38 * scale), Image.Resampling.LANCZOS)
    image.alpha_composite(logo, (6 * scale, 9 * scale))
    draw = ImageDraw.Draw(image)
    draw.text((50 * scale, 19 * scale), "Wol Edit Text", font=font(12 * scale, bold=True), fill="#17372e")
    return image.resize((150, 57), Image.Resampling.LANCZOS).convert("RGB")


logo = make_logo()
logo.save(BUILD / "icon.png", optimize=True)
logo.save(BUILD / "icon.ico", sizes=[(16, 16), (24, 24), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
make_sidebar().save(BUILD / "installerSidebar.bmp")
make_sidebar(uninstaller=True).save(BUILD / "uninstallerSidebar.bmp")
make_header().save(BUILD / "installerHeader.bmp")

preview = Image.new("RGB", (1200, 600), "#edf3ef")
draw = ImageDraw.Draw(preview)
draw.text((40, 28), "Wol Edit Text — identità grafica", font=font(28, bold=True), fill="#17372e")
preview.paste(logo.resize((300, 300), Image.Resampling.LANCZOS), (55, 110), logo.resize((300, 300), Image.Resampling.LANCZOS))
sidebar = make_sidebar().resize((246, 471), Image.Resampling.LANCZOS)
preview.paste(sidebar, (430, 90))
header = make_header().resize((450, 171), Image.Resampling.LANCZOS)
preview.paste(header, (700, 90))
preview.save(ARTIFACTS / "brand-preview.png", optimize=True)
print("Icona e grafiche create in", BUILD)
