#!/usr/bin/env tsx
/**
 * RepairReach E2E Test Suite Runner
 * CLI tool for executing requirement-driven test tiers and outputting structured markdown reports.
 */

import { spawn } from 'node:child_process';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '..');

interface TierDefinition {
  tier: number;
  name: string;
  dir: string;
  targetCount: number;
  description: string;
}

const TIERS: Record<number, TierDefinition> = {
  1: {
    tier: 1,
    name: 'Tier 1: Feature Coverage',
    dir: 'tests/tier1-feature',
    targetCount: 75,
    description: 'Direct verification of all 15 public platform features',
  },
  2: {
    tier: 2,
    name: 'Tier 2: Boundary & Corner Cases',
    dir: 'tests/tier2-boundary',
    targetCount: 75,
    description: 'Boundary Value Analysis, invalid formats, break times, exceptions',
  },
  3: {
    tier: 3,
    name: 'Tier 3: Cross-Feature Combinations',
    dir: 'tests/tier3-pairwise',
    targetCount: 15,
    description: 'Pairwise interaction tests across booking, cancellation, feedback',
  },
  4: {
    tier: 4,
    name: 'Tier 4: Real-World Scenarios',
    dir: 'tests/tier4-workloads',
    targetCount: 8,
    description: 'Comprehensive end-to-end customer workflows & lifecycle paths',
  },
  5: {
    tier: 5,
    name: 'Tier 5: Adversarial Concurrency',
    dir: 'tests/tier5-adversarial',
    targetCount: 5,
    description: 'Concurrent race conditions and PostgreSQL GiST exclusion verification',
  },
};

interface RunResult {
  tier: number;
  name: string;
  passed: number;
  failed: number;
  skipped: number;
  durationMs: number;
  success: boolean;
  error?: string;
}

function parseCliArgs(): {
  selectedTiers: number[];
  generateMarkdown: boolean;
  jsonOutput: boolean;
  help: boolean;
} {
  const args = process.argv.slice(2);
  const selectedTiers: number[] = [];
  let generateMarkdown = false;
  let jsonOutput = false;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--help' || arg === '-h') {
      help = true;
    } else if (arg === '--all' || arg === '-a') {
      selectedTiers.push(1, 2, 3, 4, 5);
    } else if (arg === '--tier' || arg === '-t') {
      const val = parseInt(args[++i], 10);
      if (TIERS[val]) {
        selectedTiers.push(val);
      } else {
        console.error(`Invalid tier: ${val}. Must be 1, 2, 3, 4, or 5.`);
        process.exit(1);
      }
    } else if (arg.startsWith('--tier=')) {
      const val = parseInt(arg.split('=')[1], 10);
      if (TIERS[val]) {
        selectedTiers.push(val);
      }
    } else if (arg === '--markdown' || arg === '--summary') {
      generateMarkdown = true;
    } else if (arg === '--json') {
      jsonOutput = true;
    }
  }

  // Default to all tiers if none specified
  if (selectedTiers.length === 0 && !help) {
    selectedTiers.push(1, 2, 3, 4);
  }

  return {
    selectedTiers: Array.from(new Set(selectedTiers)),
    generateMarkdown,
    jsonOutput,
    help,
  };
}

function printUsage(): void {
  console.log(`
RepairReach E2E Test Suite Runner
Usage:
  tsx src/runner.ts [options]

Options:
  --tier <1-5>, -t <1-5>   Run specific test tier
  --all, -a                Run all test tiers (1 through 5)
  --markdown, --summary    Generate markdown summary report
  --json                   Output summary in JSON format
  --help, -h               Show this help message

Examples:
  tsx src/runner.ts --tier 1
  tsx src/runner.ts --tier 4 --markdown
  tsx src/runner.ts --all
`);
}

async function runVitestForDirectory(
  testDir: string
): Promise<{ success: boolean; output: string; durationMs: number }> {
  const fullPath = path.resolve(ROOT_DIR, testDir);

  // Check if directory exists
  if (!fs.existsSync(fullPath)) {
    return {
      success: true,
      output: `Directory ${testDir} does not exist or has no tests yet.`,
      durationMs: 0,
    };
  }

  const startTime = Date.now();

  return new Promise((resolve) => {
    const vitestCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const child = spawn(
      vitestCmd,
      ['vitest', 'run', testDir, '--reporter=verbose', '--passWithNoTests', '--fileParallelism=false'],
      {
        cwd: ROOT_DIR,
        env: { ...process.env, FORCE_COLOR: '1' },
        shell: true,
      }
    );

    let output = '';
    child.stdout?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stdout.write(text);
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      output += text;
      process.stderr.write(text);
    });

    child.on('close', (code) => {
      const durationMs = Date.now() - startTime;
      resolve({
        success: code === 0,
        output,
        durationMs,
      });
    });

    child.on('error', (err) => {
      const durationMs = Date.now() - startTime;
      resolve({
        success: false,
        output: err.message,
        durationMs,
      });
    });
  });
}

function parseVitestOutput(output: string): { passed: number; failed: number; skipped: number } {
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Search for Vitest output lines: Tests  X passed (Y)
  const passMatch = output.match(/(\d+)\s+passed/);
  if (passMatch) passed = parseInt(passMatch[1], 10);

  const failMatch = output.match(/(\d+)\s+failed/);
  if (failMatch) failed = parseInt(failMatch[1], 10);

  const skipMatch = output.match(/(\d+)\s+skipped/);
  if (skipMatch) skipped = parseInt(skipMatch[1], 10);

  return { passed, failed, skipped };
}

function formatMarkdownSummary(results: RunResult[]): string {
  let md = '# RepairReach E2E Test Suite Execution Report\n\n';
  md += `**Date**: ${new Date().toISOString()}\n\n`;
  md += '| Tier | Name | Target | Passed | Failed | Skipped | Duration | Status |\n';
  md += '|:----:|:-----|:------:|:------:|:------:|:-------:|:--------:|:------:|\n';

  let totalTarget = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  let totalSkipped = 0;
  let totalDuration = 0;

  for (const r of results) {
    const tierDef = TIERS[r.tier];
    const target = tierDef ? tierDef.targetCount : '-';
    if (typeof target === 'number') totalTarget += target;
    totalPassed += r.passed;
    totalFailed += r.failed;
    totalSkipped += r.skipped;
    totalDuration += r.durationMs;

    const statusBadge = r.success ? '✅ PASS' : '❌ FAIL';
    md += `| ${r.tier} | ${r.name} | ${target} | ${r.passed} | ${r.failed} | ${r.skipped} | ${(r.durationMs / 1000).toFixed(2)}s | ${statusBadge} |\n`;
  }

  const allPassed = totalFailed === 0;
  md += `| **Total** | **All Selected Tiers** | **${totalTarget}** | **${totalPassed}** | **${totalFailed}** | **${totalSkipped}** | **${(totalDuration / 1000).toFixed(2)}s** | **${allPassed ? '✅ PASS' : '❌ FAIL'}** |\n\n`;

  return md;
}

export async function main(): Promise<void> {
  const { selectedTiers, generateMarkdown, jsonOutput, help } = parseCliArgs();

  if (help) {
    printUsage();
    process.exit(0);
  }

  console.log('======================================================');
  console.log(' RepairReach E2E Test Suite Runner');
  console.log(` Selected Tiers: ${selectedTiers.map((t) => `Tier ${t}`).join(', ')}`);
  console.log('======================================================\n');

  const results: RunResult[] = [];
  let overallSuccess = true;

  for (const tierNum of selectedTiers) {
    const tierDef = TIERS[tierNum];
    console.log(`\n▶ Running ${tierDef.name} (${tierDef.dir})...`);

    const { success, output, durationMs } = await runVitestForDirectory(tierDef.dir);
    const { passed, failed, skipped } = parseVitestOutput(output);

    if (!success) {
      overallSuccess = false;
    }

    results.push({
      tier: tierNum,
      name: tierDef.name,
      passed,
      failed,
      skipped,
      durationMs,
      success,
    });
  }

  const markdownSummary = formatMarkdownSummary(results);

  if (jsonOutput) {
    console.log(JSON.stringify({ overallSuccess, results }, null, 2));
  } else if (generateMarkdown) {
    console.log('\n' + markdownSummary);
  } else {
    console.log('\n================ Execution Summary ================');
    for (const r of results) {
      console.log(
        `Tier ${r.tier} (${r.name}): ${r.passed} passed, ${r.failed} failed (${(r.durationMs / 1000).toFixed(2)}s) [${r.success ? 'PASS' : 'FAIL'}]`
      );
    }
    console.log('===================================================');
  }

  process.exit(overallSuccess ? 0 : 1);
}

// Execute if run directly
if (process.argv[1] && (process.argv[1].endsWith('runner.ts') || process.argv[1].endsWith('runner.js'))) {
  main().catch((err) => {
    console.error('Fatal runner error:', err);
    process.exit(1);
  });
}
