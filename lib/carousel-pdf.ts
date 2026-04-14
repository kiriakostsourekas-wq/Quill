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
  getCarouselBackgroundPreset,
  getCarouselTextColor,
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

function drawCoverSlide(page: PDFPage, slide: CarouselSlide, headlineFont: PDFFont) {
  const textColor = slide.imageDataUrl
    ? rgb(1, 1, 1)
    : getCarouselBackgroundPreset(slide.background).dark
      ? rgb(1, 1, 1)
      : rgb(0.102, 0.102, 0.102);
  const headlineSize = 74;
  const lines = wrapText(slide.headline.trim(), headlineFont, headlineSize, PAGE_WIDTH - 220);
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
    color: rgb(0.325, 0.29, 0.718),
  });
}

function drawRegularSlide(
  page: PDFPage,
  slide: CarouselSlide,
  headlineFont: PDFFont,
  bodyFont: PDFFont
) {
  const textHex = getCarouselTextColor(slide.background, Boolean(slide.imageDataUrl)).replace("#", "");
  const textColor = rgb(
    parseInt(textHex.slice(0, 2), 16) / 255,
    parseInt(textHex.slice(2, 4), 16) / 255,
    parseInt(textHex.slice(4, 6), 16) / 255
  );

  page.drawRectangle({
    x: 84,
    y: 120,
    width: 10,
    height: PAGE_HEIGHT - 240,
    color: rgb(0.325, 0.29, 0.718),
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
}

export async function generateCarouselPDF(
  slides: CarouselSlide[],
  coverSlide: boolean
): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.registerFontkit(fontkit);
  const headlineFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const [index, slide] of slides.entries()) {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    await drawSlideBackground(pdfDoc, page, slide);

    if (coverSlide && index === 0) {
      drawCoverSlide(page, slide, headlineFont);
      continue;
    }

    drawRegularSlide(page, slide, headlineFont, bodyFont);
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
