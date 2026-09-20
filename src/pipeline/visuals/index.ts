/**
 * Visual Generator Service
 * Combines Satori and Sharp to generate deterministic PNG information graphics.
 */

import fs from 'node:fs';
import path from 'node:path';
import satori from 'satori';
import sharp from 'sharp';
import { VisualSpec } from '../types.js';
import { renderVisualRoot } from './templates.js';

export interface VisualRenderResult {
  filePath: string;
  buffer: Buffer;
  width: number;
  height: number;
}

export class VisualGenerator {
  private outputDir: string;
  private regularFontBuffer: Buffer | null = null;
  private boldFontBuffer: Buffer | null = null;

  constructor(customOutputDir?: string) {
    this.outputDir =
      customOutputDir ||
      path.resolve(process.cwd(), 'data', 'generated-visuals');
    this.ensureDirExists();
  }

  private ensureDirExists(): void {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }
  }

  private loadFonts(): {
    regularFont: Buffer;
    boldFont: Buffer;
  } {
    if (!this.regularFontBuffer) {
      const regPath = path.resolve(
        process.cwd(),
        'assets',
        'fonts',
        'Inter-Regular.ttf'
      );
      if (fs.existsSync(regPath)) {
        this.regularFontBuffer = fs.readFileSync(regPath);
      } else {
        throw new Error(`Font file not found at: ${regPath}`);
      }
    }

    if (!this.boldFontBuffer) {
      const boldPath = path.resolve(
        process.cwd(),
        'assets',
        'fonts',
        'Inter-Bold.ttf'
      );
      if (fs.existsSync(boldPath)) {
        this.boldFontBuffer = fs.readFileSync(boldPath);
      } else {
        this.boldFontBuffer = this.regularFontBuffer;
      }
    }

    return {
      regularFont: this.regularFontBuffer,
      boldFont: this.boldFontBuffer,
    };
  }

  /**
   * Render a VisualSpec to a high-resolution PNG image.
   */
  public async renderGraphic(
    spec: VisualSpec,
    filenamePrefix = 'graphic'
  ): Promise<VisualRenderResult> {
    const { regularFont, boldFont } = this.loadFonts();
    const width = 1200;
    const height = 675;

    const rootElement = renderVisualRoot(spec);

    const svg = await satori(rootElement, {
      width,
      height,
      fonts: [
        {
          name: 'Inter',
          data: regularFont,
          weight: 400,
          style: 'normal',
        },
        {
          name: 'Inter',
          data: boldFont,
          weight: 700,
          style: 'normal',
        },
      ],
    });

    const pngBuffer = await sharp(Buffer.from(svg))
      .png({ quality: 95, compressionLevel: 8 })
      .toBuffer();

    const timestamp = Date.now();
    const sanitizedTitle = spec.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30);
    const fileName = `${filenamePrefix}-${timestamp}-${sanitizedTitle}.png`;
    const filePath = path.join(this.outputDir, fileName);

    fs.writeFileSync(filePath, pngBuffer);

    return {
      filePath,
      buffer: pngBuffer,
      width,
      height,
    };
  }
}
