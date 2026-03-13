import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { specIdToPath, pathToSpecId } from '../../src/utils/spec-paths.js';
import { getSpecIds } from '../../src/utils/item-discovery.js';

describe('specIdToPath', () => {
  it('converts a flat spec ID to a path', () => {
    const result = specIdToPath('cli-show', 'openspec/specs');
    expect(result).toBe(path.join('openspec/specs', 'cli-show', 'spec.md'));
  });

  it('converts a one-level hierarchical spec ID to a path', () => {
    const result = specIdToPath('cli/show', 'openspec/specs');
    expect(result).toBe(path.join('openspec/specs', 'cli', 'show', 'spec.md'));
  });

  it('converts a deeply nested spec ID to a path', () => {
    const result = specIdToPath('domain/project/feature', 'openspec/specs');
    expect(result).toBe(path.join('openspec/specs', 'domain', 'project', 'feature', 'spec.md'));
  });

  it('handles absolute base directory', () => {
    const result = specIdToPath('cli/show', '/home/user/project/openspec/specs');
    expect(result).toBe(
      path.join('/home/user/project/openspec/specs', 'cli', 'show', 'spec.md')
    );
  });
});

describe('pathToSpecId', () => {
  it('converts a flat spec path to a spec ID', () => {
    const specsDir = '/project/openspec/specs';
    const filePath = path.join(specsDir, 'cli-show', 'spec.md');
    expect(pathToSpecId(filePath, specsDir)).toBe('cli-show');
  });

  it('converts a hierarchical spec path to a spec ID', () => {
    const specsDir = '/project/openspec/specs';
    const filePath = path.join(specsDir, 'cli', 'show', 'spec.md');
    expect(pathToSpecId(filePath, specsDir)).toBe('cli/show');
  });

  it('converts a deeply nested spec path to a spec ID', () => {
    const specsDir = '/project/openspec/specs';
    const filePath = path.join(specsDir, 'domain', 'project', 'feature', 'spec.md');
    expect(pathToSpecId(filePath, specsDir)).toBe('domain/project/feature');
  });

  it('round-trips with specIdToPath', () => {
    const specsDir = '/project/openspec/specs';
    const specId = 'cli/show';
    const p = specIdToPath(specId, specsDir);
    expect(pathToSpecId(p, specsDir)).toBe(specId);
  });
});

describe('getSpecIds (recursive)', () => {
  let testDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-test-${randomUUID()}`);
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  async function writeSpec(specId: string) {
    const specPath = path.join(testDir, 'openspec', 'specs', ...specId.split('/'), 'spec.md');
    await fs.mkdir(path.dirname(specPath), { recursive: true });
    await fs.writeFile(specPath, `## Spec for ${specId}\n`);
  }

  it('returns empty array when specs directory does not exist', async () => {
    const result = await getSpecIds(testDir);
    expect(result).toEqual([]);
  });

  it('discovers a single flat spec', async () => {
    await writeSpec('cli-show');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli-show']);
  });

  it('discovers a hierarchical spec', async () => {
    await writeSpec('cli/show');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli/show']);
  });

  it('discovers multiple flat specs sorted alphabetically', async () => {
    await writeSpec('schema');
    await writeSpec('cli-show');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli-show', 'schema']);
  });

  it('discovers mixed flat and hierarchical specs', async () => {
    await writeSpec('cli-show');
    await writeSpec('cli/validate');
    await writeSpec('schema/resolution');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli-show', 'cli/validate', 'schema/resolution']);
  });

  it('discovers deeply nested specs', async () => {
    await writeSpec('domain/project/feature');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['domain/project/feature']);
  });

  it('ignores directories starting with a dot', async () => {
    await writeSpec('cli/show');
    // create a .hidden/spec.md that should be ignored
    const hiddenSpec = path.join(testDir, 'openspec', 'specs', '.hidden', 'spec.md');
    await fs.mkdir(path.dirname(hiddenSpec), { recursive: true });
    await fs.writeFile(hiddenSpec, '## hidden\n');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli/show']);
  });

  it('ignores container directories without spec.md', async () => {
    // create a directory structure where "cli" has no spec.md but "cli/show" does
    await writeSpec('cli/show');
    const result = await getSpecIds(testDir);
    expect(result).toEqual(['cli/show']);
    expect(result).not.toContain('cli');
  });
});
