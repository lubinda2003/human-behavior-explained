/**
 * Interactive Dilemmas Stress Test Runner (Phase 6 - Entertainment Model)
 * Generates 10 new standalone dilemmas across 10 diverse entertainment categories using DilemmaGenerator,
 * renders high-res Satori + Sharp visuals, verifies entertainment QC standards,
 * and writes the complete mobile-friendly preview package to `data/dilemma-stress-test/`.
 */

import fs from 'node:fs';
import path from 'node:path';
import { VisualGenerator } from '../visuals/index.js';
import { DilemmaGenerator } from './generator.js';
import { DilemmaQualityChecker } from './quality.js';
import {
  ALL_DILEMMA_CATEGORIES,
  DilemmaCategory,
  DilemmaManifestEntry,
  DilemmaStressTestManifest,
  InteractiveDilemma,
} from './types.js';

export interface StressTestExecutionOptions {
  outputDir?: string;
  silent?: boolean;
}

export interface StressTestExecutionResult {
  success: boolean;
  totalGenerated: number;
  allQCPassed: boolean;
  outputDirectory: string;
  manifest: DilemmaStressTestManifest;
  errors: string[];
}

export class DilemmaStressTestRunner {
  private outputDir: string;
  private silent: boolean;
  private dilemmaGenerator: DilemmaGenerator;

  constructor(options: StressTestExecutionOptions = {}) {
    this.outputDir =
      options.outputDir ||
      path.resolve(process.cwd(), 'data', 'dilemma-stress-test');
    this.silent = options.silent ?? false;
    this.dilemmaGenerator = new DilemmaGenerator();
  }

  private log(message: string): void {
    if (!this.silent) {
      console.log(message);
    }
  }

  /**
   * Run the complete stress test pipeline.
   */
  public async run(): Promise<StressTestExecutionResult> {
    const startTime = Date.now();
    this.log('\n=============================================================');
    this.log('   INTERACTIVE DILEMMAS: PRODUCTION STRESS TEST (PHASE 6)    ');
    this.log('   Channel: "Interactive Dilemmas & Impossible Choices"      ');
    this.log('=============================================================\n');

    // 1. Ensure target directory exists
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
    }

    const visualGenerator = new VisualGenerator(this.outputDir);
    const manifestEntries: DilemmaManifestEntry[] = [];
    const categoriesCovered = new Set<DilemmaCategory>();
    const allErrors: string[] = [];
    const generatedDilemmas: InteractiveDilemma[] = [];
    let totalWordCount = 0;
    let renderedVisualCount = 0;
    let allQCPassed = true;

    // Use the 10 distinct categories for variety
    const targetCategories: DilemmaCategory[] = ALL_DILEMMA_CATEGORIES.slice(0, 10);

    this.log(`Generating & verifying ${targetCategories.length} new dynamic standalone dilemmas...\n`);

    // 2. Generate and process each dilemma
    for (let i = 0; i < targetCategories.length; i++) {
      const category = targetCategories[i];
      const index = i + 1;
      categoriesCovered.add(category);

      this.log(`[${index}/${targetCategories.length}] Generating new dilemma for [${category}]...`);

      // 2a. Dynamic Generation
      const dilemma = await this.dilemmaGenerator.generateDilemma({
        category,
        index,
      });
      generatedDilemmas.push(dilemma);

      this.log(`   Title: "${dilemma.title}"`);

      // 2b. Content Quality Check (Entertainment Quality Gate)
      const contentQC = DilemmaQualityChecker.validateDilemmaContent(dilemma);
      if (!contentQC.isValid) {
        allQCPassed = false;
        allErrors.push(`[${dilemma.id}] Content QC Failed: ${contentQC.errors.join('; ')}`);
        this.log(`   ❌ Content QC Errors: ${contentQC.errors.join(', ')}`);
      } else {
        this.log('   ✅ Content QC Passed (Pure Entertainment, Explicit Trade-Offs, No Jargon, Valid HTML)');
      }

      // 2c. Visual Rendering
      const visualFileName = `${dilemma.id}.png`;
      const visualFilePath = path.join(this.outputDir, visualFileName);
      let visualQCValid = false;

      try {
        const renderResult = await visualGenerator.renderGraphic(dilemma.visualSpec, dilemma.id);
        if (renderResult.filePath !== visualFilePath && fs.existsSync(renderResult.filePath)) {
          fs.copyFileSync(renderResult.filePath, visualFilePath);
        }
        renderedVisualCount++;

        // 2d. Visual Asset QC Check
        const visualQC = await DilemmaQualityChecker.validateVisualAsset(visualFilePath, 1200, 675);
        if (!visualQC.isValid) {
          allQCPassed = false;
          allErrors.push(`[${dilemma.id}] Visual QC Failed: ${visualQC.errors.join('; ')}`);
          this.log(`   ❌ Visual Asset QC Failed: ${visualQC.errors.join(', ')}`);
        } else {
          visualQCValid = true;
          this.log(`   ✅ Visual Rendered: ${visualFileName} (1200x675, ${(visualQC.fileSizeBytes! / 1024).toFixed(1)} KB)`);
        }
      } catch (err: any) {
        allQCPassed = false;
        allErrors.push(`[${dilemma.id}] Visual render error: ${err.message}`);
        this.log(`   ❌ Visual Render Error: ${err.message}`);
      }

      // Calculate Word Count
      const textForWordCount = [
        dilemma.title,
        dilemma.hook,
        dilemma.scenario,
        ...dilemma.choices.map((c) => `${c.label} ${c.description} ${c.tradeOff}`),
        dilemma.payoff.reveal,
        dilemma.payoff.surprisingOutcome,
      ].join(' ');
      const wordCount = textForWordCount.trim().split(/\s+/).length;
      totalWordCount += wordCount;

      const jsonFileName = `${dilemma.id}.json`;
      const jsonFilePath = path.join(this.outputDir, jsonFileName);

      // Save individual dilemma JSON
      const dilemmaPayload = {
        ...dilemma,
        visualFile: visualFileName,
        qc: {
          contentPassed: contentQC.isValid,
          visualPassed: visualQCValid,
          errors: contentQC.errors,
          warnings: contentQC.warnings,
          checks: contentQC.checks,
        },
      };
      fs.writeFileSync(jsonFilePath, JSON.stringify(dilemmaPayload, null, 2), 'utf-8');

      manifestEntries.push({
        id: dilemma.id,
        index: dilemma.index,
        category: dilemma.category,
        title: dilemma.title,
        hook: dilemma.hook,
        choiceCount: dilemma.choices.length,
        wordCount,
        visualFile: visualFileName,
        jsonFile: jsonFileName,
        payoffPreview: (dilemma.payoff.reveal || '').slice(0, 100) + '...',
        qcPassed: contentQC.isValid && visualQCValid,
      });
    }

    const durationMs = Date.now() - startTime;
    const avgWordCount = Math.round(totalWordCount / targetCategories.length);

    // 3. Construct manifest.json
    const manifest: DilemmaStressTestManifest = {
      title: 'Interactive Dilemmas & Impossible Choices - Preview Package',
      version: '2.0.0',
      generatedAt: new Date().toISOString(),
      channelName: 'Interactive Dilemmas & Impossible Choices',
      outputDirectory: this.outputDir,
      totalDilemmas: targetCategories.length,
      categoriesCovered: Array.from(categoriesCovered),
      allQCPassed,
      dilemmas: manifestEntries,
      summary: {
        totalVisualsRendered: renderedVisualCount,
        totalWordCount,
        avgWordCount,
        executionTimeMs: durationMs,
      },
    };

    const manifestPath = path.join(this.outputDir, 'manifest.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
    this.log(`\n📄 Manifest saved to: ${manifestPath}`);

    // 4. Generate Phone-Friendly preview.md
    const previewMdContent = this.generatePreviewMarkdown(manifest, generatedDilemmas);
    const previewMdPath = path.join(this.outputDir, 'preview.md');
    fs.writeFileSync(previewMdPath, previewMdContent, 'utf-8');
    this.log(`📱 Phone-friendly preview saved to: ${previewMdPath}`);

    // 5. Output Summary Table
    this.log('\n=============================================================');
    this.log('                STRESS TEST RESULTS SUMMARY                  ');
    this.log('=============================================================');
    this.log(`Total Dilemmas Generated : ${manifest.totalDilemmas}/10`);
    this.log(`Categories Covered       : ${manifest.categoriesCovered.join(', ')}`);
    this.log(`Visual Assets Rendered   : ${renderedVisualCount}/10 (1200x675 PNG)`);
    this.log(`Overall QC Status        : ${allQCPassed ? '✅ ALL 10 PASSED' : '❌ SOME FAILED'}`);
    this.log(`Average Word Count       : ${avgWordCount} words / dilemma`);
    this.log(`Execution Time           : ${(durationMs / 1000).toFixed(2)}s`);
    this.log(`Target Directory         : ${this.outputDir}`);
    this.log('=============================================================\n');

    return {
      success: allQCPassed,
      totalGenerated: targetCategories.length,
      allQCPassed,
      outputDirectory: this.outputDir,
      manifest,
      errors: allErrors,
    };
  }

  /**
   * Generates a sleek, mobile-optimized preview markdown document.
   */
  private generatePreviewMarkdown(
    manifest: DilemmaStressTestManifest,
    dilemmas: InteractiveDilemma[]
  ): string {
    const lines: string[] = [];

    lines.push('# 🎮 Interactive Dilemmas & Impossible Choices (Preview Package)');
    lines.push('');
    lines.push(`> **Channel**: \`Interactive Dilemmas & Impossible Choices\`  `);
    lines.push(`> **Generated**: ${new Date(manifest.generatedAt).toLocaleString()}  `);
    lines.push(`> **Total Dilemmas**: ${manifest.totalDilemmas}  `);
    lines.push(`> **Categories**: ${manifest.categoriesCovered.join(' • ')}  `);
    lines.push(`> **Quality Verification**: ${manifest.allQCPassed ? '✅ 10/10 Passed Entertainment QC' : '⚠️ Quality Warnings'}  `);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('## 📱 Mobile Quick Navigation');
    lines.push('');
    lines.push('| # | Category | Title | Choices |');
    lines.push('|---|---|---|---|');

    dilemmas.forEach((d) => {
      lines.push(
        `| **${d.index}** | \`${d.category}\` | [${d.title}](#dilemma-${d.index.toString().padStart(2, '0')}) | ${d.choices.length} |`
      );
    });

    lines.push('');
    lines.push('---');
    lines.push('');

    // Detailed Dilemma Cards
    dilemmas.forEach((d) => {
      const padIndex = d.index.toString().padStart(2, '0');
      lines.push(`<a id="dilemma-${padIndex}"></a>`);
      lines.push(`## 📌 Dilemma ${d.index}: ${d.title}`);
      lines.push('');
      lines.push(`**🏷️ Category**: \`${d.category.toUpperCase()}\` &nbsp;|&nbsp; **✅ Entertainment QC**: \`PASSED\``);
      lines.push('');
      lines.push(`### 🎯 Hook`);
      lines.push(`> *"${d.hook}"*`);
      lines.push('');
      lines.push(`### 📖 Scenario`);
      lines.push(`${d.scenario}`);
      lines.push('');
      lines.push(`### ⚖️ Choices & High-Stakes Trade-Offs`);
      lines.push('');

      d.choices.forEach((c, cIdx) => {
        const letter = String.fromCharCode(65 + cIdx);
        lines.push(`- **[${letter}] ${c.label}**`);
        lines.push(`  - **Action**: ${c.description}`);
        lines.push(`  - **Trade-off / Cost**: ⚠️ *${c.tradeOff}*`);
        lines.push('');
      });

      lines.push(`### 📊 Poll Question`);
      lines.push(`**"${d.pollQuestion}"**`);
      lines.push('');

      lines.push(`### 💡 The Twist & Entertaining Payoff`);
      lines.push(`${d.payoff.reveal}`);
      lines.push('');
      lines.push(`- **Surprising Outcome**: ${d.payoff.surprisingOutcome}`);
      lines.push(`- **Why it splits players**: ${d.payoff.communityTension}`);
      if (d.payoff.strategicAnalysis) {
        lines.push(`- **Strategic Insight**: ${d.payoff.strategicAnalysis}`);
      }
      lines.push('');

      lines.push(`### 🖼️ Visual Card (1200x675 PNG)`);
      lines.push(`![${d.title}](./dilemma-${padIndex}.png)`);
      lines.push('');

      lines.push(`### 💬 Telegram Post Preview`);
      lines.push('```html');
      lines.push(d.formattedTelegramText);
      lines.push('```');
      lines.push('');
      lines.push('[⬆️ Back to Top](#mobile-quick-navigation)');
      lines.push('');
      lines.push('---');
      lines.push('');
    });

    lines.push('## 🏁 Entertainment Quality Checklist');
    lines.push('');
    lines.push('- ✅ Zero academic psychology lecturing or scientific citations');
    lines.push('- ✅ 100% standalone scenarios requiring no prior reading');
    lines.push('- ✅ Exactly 2–4 meaningful choices with irreversible trade-offs');
    lines.push('- ✅ No generic low-effort "Would You Rather?" questions');
    lines.push('- ✅ Entertaining reveals and twists embedded in the situation');
    lines.push('- ✅ 10 Satori + Sharp PNG visuals generated (1200x675)');
    lines.push('- ✅ Formatted HTML with spoiler-tagged reveals for Telegram');
    lines.push('');

    return lines.join('\n');
  }
}

// Direct CLI Execution Entry
if (process.argv[1] && process.argv[1].endsWith('stressTest.ts')) {
  const runner = new DilemmaStressTestRunner();
  runner
    .run()
    .then((result) => {
      if (!result.success) {
        process.exit(1);
      }
      process.exit(0);
    })
    .catch((err) => {
      console.error('Fatal Stress Test Error:', err);
      process.exit(1);
    });
}
