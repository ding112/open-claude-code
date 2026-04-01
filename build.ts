import type { BunPlugin } from 'bun';
import { join, resolve, dirname, extname } from 'path';
import { existsSync, readFileSync, writeFileSync, mkdirSync, copyFileSync } from 'fs';

const ROOT = import.meta.dir;
const STUBS_DIR = join(ROOT, 'stubs');
const SHIMS_DIR = join(ROOT, 'src', 'shims');

const stubPackages = [
  '@ant/computer-use-mcp',
  '@ant/computer-use-swift',
  '@ant/computer-use-input',
  '@ant/claude-for-chrome-mcp',
  '@anthropic-ai/mcpb',
  '@anthropic-ai/sandbox-runtime',
  '@anthropic-ai/foundry-sdk',
  'audio-capture-napi',
  'image-processor-napi',
  'modifiers-napi',
  'url-handler-napi',
  'color-diff-napi',
];

function tryResolveTs(basePath: string): string | null {
  if (existsSync(basePath)) return basePath;

  const withoutExt = basePath.replace(/\.js$/, '');
  const candidates = [
    withoutExt + '.ts',
    withoutExt + '.tsx',
    withoutExt + '.js',
    withoutExt + '.jsx',
    join(withoutExt, 'index.ts'),
    join(withoutExt, 'index.tsx'),
    join(withoutExt, 'index.js'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return null;
}

const EMPTY_MODULE = 'export default {}; export {};';
const missingFiles = new Set<string>();

const shimPlugin: BunPlugin = {
  name: 'claude-code-shims',
  setup(build) {
    build.onResolve({ filter: /^bun:bundle$/ }, () => {
      return { path: join(SHIMS_DIR, 'bunBundle.ts') };
    });

    build.onResolve({ filter: /^bun:ffi$/ }, () => {
      return { path: join(SHIMS_DIR, 'bunFfi.ts') };
    });

    // Resolve 'src/...' path aliases
    build.onResolve({ filter: /^src\// }, (args) => {
      const rawPath = join(ROOT, args.path);
      const resolved = tryResolveTs(rawPath);
      if (resolved) return { path: resolved };
      missingFiles.add(args.path);
      return { path: args.path, namespace: 'missing-module' };
    });

    // Redirect stub packages
    for (const pkg of stubPackages) {
      const escapedPkg = pkg.replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&');
      const re = new RegExp(`^${escapedPkg}(\\/.*)?$`);
      build.onResolve({ filter: re }, () => {
        return { path: join(STUBS_DIR, pkg, 'index.js') };
      });
    }

    // Handle .d.ts imports (they should be type-only, return empty)
    build.onResolve({ filter: /\.d\.ts$/ }, (args) => {
      return { path: args.path, namespace: 'missing-module' };
    });

    // Catch-all for missing relative modules
    build.onResolve({ filter: /.*/ }, (args) => {
      if (args.namespace !== 'file' || !args.importer) return;

      if (args.path.startsWith('.') || args.path.startsWith('/')) {
        const dir = dirname(args.importer);
        const rawPath = join(dir, args.path);
        const resolved = tryResolveTs(rawPath);
        if (resolved) return { path: resolved };
      }
      return undefined;
    });

    // Provide empty module for anything in the missing-module namespace
    build.onLoad({ filter: /.*/, namespace: 'missing-module' }, (args) => {
      missingFiles.add(args.path);
      return {
        contents: EMPTY_MODULE,
        loader: 'js',
      };
    });
  },
};

const VERSION = '0.1.0';
const BUILD_TIME = new Date().toISOString();

console.log('Building Claude Code snapshot...');
console.log(`Version: ${VERSION}`);
console.log(`Build time: ${BUILD_TIME}`);

const result = await Bun.build({
  entrypoints: ['./src/entrypoints/cli.tsx'],
  outdir: './dist',
  target: 'bun',
  format: 'esm',
  splitting: true,
  sourcemap: 'external',
  packages: 'external',
  define: {
    'MACRO.VERSION': JSON.stringify(VERSION),
    'MACRO.PACKAGE_URL': JSON.stringify('claude-code-snapshot'),
    'MACRO.NATIVE_PACKAGE_URL': JSON.stringify(''),
    'MACRO.BUILD_TIME': JSON.stringify(BUILD_TIME),
    'MACRO.FEEDBACK_CHANNEL': JSON.stringify('https://github.com/anthropics/claude-code/issues'),
    'MACRO.ISSUES_EXPLAINER': JSON.stringify('https://github.com/anthropics/claude-code/issues'),
    'MACRO.VERSION_CHANGELOG': JSON.stringify(''),
  },
  plugins: [shimPlugin],
});

if (missingFiles.size > 0) {
  console.warn(`\nWarning: ${missingFiles.size} missing module(s) replaced with empty stubs:`);
  const sorted = [...missingFiles].sort();
  for (const f of sorted.slice(0, 20)) {
    console.warn(`  - ${f}`);
  }
  if (sorted.length > 20) {
    console.warn(`  ... and ${sorted.length - 20} more`);
  }
}

if (!result.success) {
  console.error('\nBuild failed with errors:');
  for (const log of result.logs) {
    console.error(log);
  }
  process.exit(1);
}

// Prepend shebang only to the entry point cli.js, not to chunk files
const cliPath = join(ROOT, 'dist', 'cli.js');
if (existsSync(cliPath)) {
  const content = readFileSync(cliPath, 'utf-8');
  if (!content.startsWith('#!')) {
    writeFileSync(cliPath, '#!/usr/bin/env bun\n' + content, 'utf-8');
    console.log('\nPrepended shebang to dist/cli.js');
  }
}

// Copy vendor/ripgrep binaries from official package if available
const officialPkgRg = join(ROOT, 'node_modules', '@anthropic-ai', 'claude-code', 'vendor', 'ripgrep');
if (existsSync(officialPkgRg)) {
  const platforms = ['x64-win32', 'x64-linux', 'x64-darwin', 'arm64-linux', 'arm64-darwin', 'arm64-win32'];
  for (const plat of platforms) {
    const binName = plat.includes('win32') ? 'rg.exe' : 'rg';
    const src = join(officialPkgRg, plat, binName);
    if (existsSync(src)) {
      const destDir = join(ROOT, 'dist', 'vendor', 'ripgrep', plat);
      mkdirSync(destDir, { recursive: true });
      copyFileSync(src, join(destDir, binName));
    }
  }
  const copying = join(officialPkgRg, 'COPYING');
  if (existsSync(copying)) {
    mkdirSync(join(ROOT, 'dist', 'vendor', 'ripgrep'), { recursive: true });
    copyFileSync(copying, join(ROOT, 'dist', 'vendor', 'ripgrep', 'COPYING'));
  }
  console.log('\nCopied vendor/ripgrep binaries to dist/');
}

console.log(`\nBuild succeeded! ${result.outputs.length} output file(s):`);
for (const output of result.outputs) {
  console.log(`  ${output.path} (${(output.size / 1024).toFixed(1)} KB)`);
}
