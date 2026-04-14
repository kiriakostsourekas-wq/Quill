import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import type { CarouselSlide } from "@/lib/carousel";

const PAGE_WIDTH = 1080;
const PAGE_HEIGHT = 1350;

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

function drawCoverSlide(page: PDFPage, slide: CarouselSlide, headlineFont: PDFFont) {
  const headlineSize = 74;
  const lines = wrapText(slide.headline.trim(), headlineFont, headlineSize, PAGE_WIDTH - 200);
  const totalHeight = lines.length * (headlineSize + 12);
  const startY = PAGE_HEIGHT / 2 + totalHeight / 2;

  lines.forEach((line, index) => {
    const width = headlineFont.widthOfTextAtSize(line, headlineSize);
    page.drawText(line, {
      x: (PAGE_WIDTH - width) / 2,
      y: startY - index * (headlineSize + 12),
      size: headlineSize,
      font: headlineFont,
      color: rgb(0.102, 0.102, 0.102),
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
    rgb(0.102, 0.102, 0.102),
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
    rgb(0.22, 0.22, 0.22),
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

  slides.forEach((slide, index) => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    page.drawRectangle({
      x: 0,
      y: 0,
      width: PAGE_WIDTH,
      height: PAGE_HEIGHT,
      color: rgb(1, 1, 1),
    });

    if (coverSlide && index === 0) {
      drawCoverSlide(page, slide, headlineFont);
      return;
    }

    drawRegularSlide(page, slide, headlineFont, bodyFont);
  });

  return pdfDoc.save();
}
