/**
 * Mystery Visual Generator
 * Renders high-resolution PNG investigation graphics (1200x675) using Satori and Sharp.
 * Provides deterministic hashing for duplicate asset detection.
 */

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import satori from 'satori';
import sharp from 'sharp';
import { MysteryVisualSpec } from '../types.js';
import { renderMysteryVisualRoot } from './templates.js';

export interface MysteryVisualRenderResult {
  filePath: string;
  buffer: Buffer;
  width: number;
  height: number;
  assetHash: string;
}

export class MysteryVisualGenerator {
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
   * Render a MysteryVisualSpec to a deterministic 1200x675 PNG image.
   */
  public async renderGraphic(
    spec: MysteryVisualSpec,
    filenamePrefix = 'investigation'
  ): Promise<MysteryVisualRenderResult> {
    const { regularFont, boldFont } = this.loadFonts();
    const width = 1200;
    const height = 675;

    const rootElement = renderMysteryVisualRoot(spec);

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

    const assetHash = crypto
      .createHash('sha256')
      .update(pngBuffer)
      .digest('hex');

    const timestamp = Date.now();
    const sanitizedTitle = spec.title
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .slice(0, 30);
    const fileName = `${filenamePrefix}-${spec.template}-${timestamp}-${sanitizedTitle}.png`;
    const filePath = path.join(this.outputDir, fileName);

    fs.writeFileSync(filePath, pngBuffer);

    return {
      filePath,
      buffer: pngBuffer,
      width,
      height,
      assetHash,
    };
  }

  /**
   * Compute a content hash for a visual spec payload to detect near-duplicate visual specs.
   */
  public static computeSpecFingerprint(spec: MysteryVisualSpec): string {
    return crypto
      .createHash('sha256')
      .update(JSON.stringify(spec.payload))
      .digest('hex');
  }
}
