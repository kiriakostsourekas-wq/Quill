import fontkit from "@pdf-lib/fontkit";
import {
  PDFDocument,
  StandardFonts,
  rgb,
  type PDFImage,
  type PDFFont,
  type PDFPage,
} from "pdf-lib";
import {
  getCarouselTemplate,
  getCarouselTemplateVisuals,
  getCarouselBackgroundPreset,
  getCarouselTheme,
  normalizeCarouselSlides,
  resolveCarouselSlideRole,
  type CarouselSlide,
} from "@/lib/carousel";

const PAGE_WIDTH = 1080;
const PAGE_HEIGHT = 1350;
const IMAGE_OVERLAY_OPACITY = 0.28;

function base64ToBytes(base64: string) {
  if (typeof atob === "function") {
    const binary = atob(base64);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  }

  return Uint8Array.from(Buffer.from(base64, "base64"));
}

function splitDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
  if (!match) {
    throw new Error("Invalid image data URL");
  }

  return {
    mimeType: match[1],
    base64: match[2],
  };
}

function wrapText(text: string, font: PDFFont, fontSize: number, maxWidth: number) {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let currentLine = "";

  for (const word of words) {
    const candidate = currentLine ? `${currentLine} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth) {
      currentLine = candidate;
      continue;
    }

    if (currentLine) {
      lines.push(currentLine);
    }
    currentLine = word;
  }

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

function hexToRgb(hexColor: string) {
  const hex = hexColor.replace("#", "");
  return rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255
  );
}

function drawMultilineText(
  page: PDFPage,
  text: string,
  font: PDFFont,
  fontSize: number,
  color: ReturnType<typeof rgb>,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number
) {
  const lines = wrapText(text, font, fontSize, maxWidth);
  lines.forEach((line, index) => {
    page.drawText(line, {
      x,
      y: y - index * lineHeight,
      size: fontSize,
      font,
      color,
    });
  });
}

async function embedImage(pdfDoc: PDFDocument, dataUrl: string) {
  const { mimeType, base64 } = splitDataUrl(dataUrl);
  const bytes = base64ToBytes(base64);

  if (mimeType === "image/png") {
    return pdfDoc.embedPng(bytes);
  }

  if (mimeType === "image/jpeg" || mimeType === "image/jpg") {
    return pdfDoc.embedJpg(bytes);
  }

  throw new Error("Unsupported image type. Use JPG or PNG.");
}

function drawImageCover(page: PDFPage, image: PDFImage) {
  const imageWidth = image.width;
  const imageHeight = image.height;
  const scale = Math.max(PAGE_WIDTH / imageWidth, PAGE_HEIGHT / imageHeight);
  const width = imageWidth * scale;
  const height = imageHeight * scale;
  const x = (PAGE_WIDTH - width) / 2;
  const y = (PAGE_HEIGHT - height) / 2;

  page.drawImage(image, {
    x,
    y,
    width,
    height,
  });
}

async function drawSlideBackground(pdfDoc: PDFDocument, page: PDFPage, slide: CarouselSlide) {
  const preset = getCarouselBackgroundPreset(slide.background);
  const hex = preset.value.replace("#", "");
  const color = rgb(
    parseInt(hex.slice(0, 2), 16) / 255,
    parseInt(hex.slice(2, 4), 16) / 255,
    parseInt(hex.slice(4, 6), 16) / 255
  );

  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color,
  });

  if (slide.imageDataUrl) {
    const image = await embedImage(pdfDoc, slide.imageDataUrl);
    drawImageCover(page, image);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(0, 0, 0),
      opacity: IMAGE_OVERLAY_OPACITY,
    });
  }
}

function drawTemplateBackground(
  page: PDFPage,
  visuals: ReturnType<typeof getCarouselTemplateVisuals>
) {
  page.drawRectangle({
    x: 0,
    y: 0,
    width: PAGE_WIDTH,
    height: PAGE_HEIGHT,
    color: hexToRgb(visuals.background),
  });
}

function drawCoverSlide(
  page: PDFPage,
  slide: CarouselSlide,
  headlineFont: PDFFont,
  bodyFont: PDFFont,
  visuals: ReturnType<typeof getCarouselTemplateVisuals>,
  templateId: string | null | undefined
) {
  const textColor = hexToRgb(slide.imageDataUrl ? "#FFFFFF" : visuals.text);
  const accentColor = hexToRgb(visuals.accent);
  const headlineSize = 74;
  const lines = wrapText(slide.headline.trim(), headlineFont, headlineSize, PAGE_WIDTH - 220);

  if (templateId === "classic") {
    const totalHeight = lines.length * (headlineSize + 12);
    const startY = PAGE_HEIGHT / 2 + totalHeight / 2;

    lines.forEach((line, index) => {
      const width = headlineFont.widthOfTextAtSize(line, headlineSize);
      page.drawText(line, {
        x: (PAGE_WIDTH - width) / 2,
        y: startY - index * (headlineSize + 12),
        size: headlineSize,
        font: headlineFont,
        color: textColor,
      });
    });

    page.drawText("Q", {
      x: PAGE_WIDTH - 120,
      y: 80,
      size: 52,
      font: headlineFont,
      color: accentColor,
    });
    return;
  }

  if (slide.kicker) {
    page.drawText(slide.kicker.toUpperCase(), {
      x: 88,
      y: PAGE_HEIGHT - 148,
      size: 22,
      font: bodyFont,
      color: accentColor,
    });
  }

  page.drawRectangle({
    x: 88,
    y: PAGE_HEIGHT - 208,
    width: 112,
    height: 10,
    color: accentColor,
  });

  lines.forEach((line, index) => {
    page.drawText(line, {
      x: 88,
      y: PAGE_HEIGHT - 300 - index * (headlineSize + 12),
      size: headlineSize,
      font: headlineFont,
      color: textColor,
    });
  });

  if (slide.body) {
    drawMultilineText(
      page,
      slide.body,
      bodyFont,
      30,
      hexToRgb(slide.imageDataUrl ? "#E2E8F0" : visuals.muted),
      88,
      340,
      PAGE_WIDTH - 220,
      40
    );
  }

  page.drawText("Q", {
    x: PAGE_WIDTH - 128,
    y: 80,
    size: 52,
    font: headlineFont,
    color: accentColor,
  });
}

function drawRegularSlide(
  page: PDFPage,
  slide: CarouselSlide,
  headlineFont: PDFFont,
  bodyFont: PDFFont,
  visuals: ReturnType<typeof getCarouselTemplateVisuals>,
  templateId: string | null | undefined,
  role: string,
  index: number,
  total: number
) {
  const textColor = hexToRgb(slide.imageDataUrl ? "#FFFFFF" : visuals.text);
  const mutedColor = hexToRgb(slide.imageDataUrl ? "#E2E8F0" : visuals.muted);
  const accentColor = hexToRgb(visuals.accent);
  const accentSoftColor = hexToRgb(visuals.accentSoft);

  if (templateId === "classic") {
    page.drawRectangle({
      x: 84,
      y: 120,
      width: 10,
      height: PAGE_HEIGHT - 240,
      color: accentColor,
    });

    drawMultilineText(
      page,
      slide.headline.trim(),
      headlineFont,
      48,
      textColor,
      140,
      PAGE_HEIGHT - 180,
      PAGE_WIDTH - 220,
      58
    );

    drawMultilineText(
      page,
      slide.body.trim(),
      bodyFont,
      32,
      textColor,
      140,
      PAGE_HEIGHT - 360,
      PAGE_WIDTH - 220,
      42
    );
    return;
  }

  const slideNumber = `${index + 1}`.padStart(2, "0");
  page.drawText(slide.kicker?.toUpperCase() || role.toUpperCase(), {
    x: 84,
    y: PAGE_HEIGHT - 106,
    size: 18,
    font: bodyFont,
    color: mutedColor,
  });
  page.drawText(slideNumber, {
    x: PAGE_WIDTH - 150,
    y: PAGE_HEIGHT - 110,
    size: 24,
    font: headlineFont,
    color: accentColor,
  });

  const template = getCarouselTemplate(templateId);
  if (template.accentStrategy === "block") {
    page.drawRectangle({
      x: 64,
      y: PAGE_HEIGHT - 230,
      width: 18,
      height: 120,
      color: accentColor,
    });
  } else if (template.accentStrategy === "editorial") {
    page.drawRectangle({
      x: 78,
      y: 84,
      width: PAGE_WIDTH - 156,
      height: 2,
      color: accentColor,
    });
  } else if (template.accentStrategy === "timeline") {
    page.drawRectangle({
      x: 92,
      y: 160,
      width: 4,
      height: PAGE_HEIGHT - 320,
      color: accentSoftColor,
    });
    page.drawCircle({ x: 94, y: PAGE_HEIGHT - 220, size: 14, color: accentColor });
  } else if (template.accentStrategy === "split") {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: 38,
      height: PAGE_HEIGHT,
      color: accentColor,
    });
  } else if (template.accentStrategy === "stat") {
    page.drawRectangle({
      x: 76,
      y: PAGE_HEIGHT - 258,
      width: PAGE_WIDTH - 152,
      height: 2,
      color: accentColor,
    });
  } else if (template.accentStrategy === "minimal") {
    page.drawRectangle({
      x: 82,
      y: 104,
      width: 96,
      height: 3,
      color: accentColor,
    });
  }

  if (slide.emphasis && (role === "proof" || role === "quote")) {
    drawMultilineText(
      page,
      slide.emphasis,
      headlineFont,
      role === "proof" ? 82 : 58,
      textColor,
      92,
      PAGE_HEIGHT - 248,
      PAGE_WIDTH - 184,
      role === "proof" ? 92 : 70
    );
    drawMultilineText(
      page,
      slide.body,
      bodyFont,
      28,
      mutedColor,
      92,
      386,
      PAGE_WIDTH - 184,
      38
    );
  } else {
    drawMultilineText(
      page,
      slide.headline.trim(),
      headlineFont,
      role === "cta" ? 58 : 52,
      textColor,
      92,
      PAGE_HEIGHT - 220,
      PAGE_WIDTH - 184,
      role === "cta" ? 68 : 62
    );

    drawMultilineText(
      page,
      slide.body.trim(),
      bodyFont,
      30,
      mutedColor,
      92,
      PAGE_HEIGHT - 430,
      PAGE_WIDTH - 184,
      40
    );
  }

  const bullets = slide.bullets ?? [];
  const bulletStartY = role === "checklist" || role === "framework" ? 570 : 330;
  bullets.slice(0, 5).forEach((bullet, bulletIndex) => {
    const y = bulletStartY - bulletIndex * 72;
    page.drawCircle({ x: 110, y: y + 9, size: 14, color: accentColor });
    page.drawText(String(bulletIndex + 1), {
      x: bulletIndex >= 9 ? 103 : 107,
      y: y + 1,
      size: 16,
      font: headlineFont,
      color: rgb(1, 1, 1),
    });
    drawMultilineText(page, bullet, bodyFont, 25, textColor, 148, y + 14, PAGE_WIDTH - 240, 32);
  });

  if (role === "cta") {
    page.drawRectangle({
      x: 92,
      y: 148,
      width: PAGE_WIDTH - 184,
      height: 84,
      color: accentColor,
    });
    page.drawText(slide.emphasis || "Save this for later", {
      x: 128,
      y: 178,
      size: 26,
      font: headlineFont,
      color: rgb(1, 1, 1),
    });
  }

  page.drawText(`${index + 1}/${total}`, {
    x: PAGE_WIDTH - 152,
    y: 82,
    size: 18,
    font: bodyFont,
    color: mutedColor,
  });
}

export async function generateCarouselPDF(
  slides: CarouselSlide[],
  coverSlide: boolean,
  templateId: string | null | undefined = "classic",
  themeId: string | null | undefined = undefined
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const headlineFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const normalizedSlides = normalizeCarouselSlides(slides);
  const template = getCarouselTemplate(templateId);
  const theme = getCarouselTheme(themeId ?? template.defaultThemeId);

  for (const [index, slide] of normalizedSlides.entries()) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    const role = resolveCarouselSlideRole(slide, index, normalizedSlides.length, coverSlide);
    const visuals = getCarouselTemplateVisuals(template.id, theme.id, slide, role);

    if (template.id === "classic") {
      await drawSlideBackground(pdfDoc, page, slide);
    } else {
      drawTemplateBackground(page, visuals);
      if (slide.imageDataUrl) {
        const image = await embedImage(pdfDoc, slide.imageDataUrl);
        drawImageCover(page, image);
        page.drawRectangle({
          x: 0,
          y: 0,
          width: PAGE_WIDTH,
          height: PAGE_HEIGHT,
          color: rgb(0, 0, 0),
          opacity: IMAGE_OVERLAY_OPACITY,
        });
      }
    }

    if (role === "cover" || (coverSlide && index === 0)) {
      drawCoverSlide(page, slide, headlineFont, bodyFont, visuals, template.id);
      continue;
    }

    drawRegularSlide(
      page,
      slide,
      headlineFont,
      bodyFont,
      visuals,
      template.id,
      role,
      index,
      normalizedSlides.length
    );
  }

  return pdfDoc.save();
}

export async function generatePdfFromImageDataUrls(imageDataUrls: string[]): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();

  for (const dataUrl of imageDataUrls) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(1, 1, 1),
    });

    const image = await embedImage(pdfDoc, dataUrl);
    drawImageCover(page, image);
  }

  return pdfDoc.save();
}

export async function getPdfPageCount(pdfBytes: Uint8Array) {
  const pdfDoc = await PDFDocument.load(Uint8Array.from(pdfBytes));
  return pdfDoc.getPageCount();
}

export function bytesToBase64(bytes: Uint8Array) {
  if (typeof btoa === "function") {
    let binary = "";
    bytes.forEach((byte) => {
      binary += String.fromCharCode(byte);
    });
    return btoa(binary);
  }

  return Buffer.from(bytes).toString("base64");
}

export function base64ToPdfBytes(base64: string) {
  return base64ToBytes(base64);
}
