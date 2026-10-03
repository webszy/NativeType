import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import os from 'node:os';
import ts from 'typescript';

const projectRoot = fileURLToPath(new URL('..', import.meta.url));
const outRoot = path.join(os.tmpdir(), 'nativetype-ts-tests');
const emitted = new Map();

function resolveImport(fromFile, spec) {
  const base = path.resolve(path.dirname(fromFile), spec);
  return base.endsWith('.ts') ? base : `${base}.ts`;
}

function outputPath(tsPath) {
  return path.join(outRoot, path.relative(projectRoot, tsPath).replace(/\.ts$/, '.js'));
}

async function emit(tsPath) {
  if (emitted.has(tsPath)) return emitted.get(tsPath);
  const pending = (async () => {
    const source = await readFile(tsPath, 'utf8');
    const js = ts.transpileModule(source, {
      compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
      fileName: tsPath,
    }).outputText;
    const specs = [...js.matchAll(/\bfrom\s+['"](\.[^'"]+)['"]/g)].map(match => match[1]);
    for (const spec of specs) await emit(resolveImport(tsPath, spec));
    const rewritten = js.replace(/\bfrom\s+['"](\.[^'"]+)['"]/g, (_, spec) => {
      let relative = path.relative(path.dirname(outputPath(tsPath)), outputPath(resolveImport(tsPath, spec))).replaceAll('\\', '/');
      if (!relative.startsWith('.')) relative = `./${relative}`;
      return `from '${relative}'`;
    });
    const out = outputPath(tsPath);
    await mkdir(path.dirname(out), { recursive: true });
    await writeFile(out, rewritten);
  })();
  emitted.set(tsPath, pending);
  return pending;
}

export async function loadTs(relativePath) {
  const entry = path.join(projectRoot, relativePath);
  await emit(entry);
  return import(pathToFileURL(outputPath(entry)).href);
}
