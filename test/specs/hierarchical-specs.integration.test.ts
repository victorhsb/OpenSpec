/**
 * Integration tests for hierarchical spec support (task 6.3):
 * - Mixed flat + hierarchical specs coexisting
 * - Subtree listing
 * - Cross-platform path handling
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';
import { randomUUID } from 'crypto';
import { getSpecIds } from '../../src/utils/item-discovery.js';
import { specIdToPath, pathToSpecId } from '../../src/utils/spec-paths.js';
import { ListCommand } from '../../src/core/list.js';
import { Validator } from '../../src/core/validation/validator.js';

const VALID_SPEC = (title: string) => `## Purpose
${title} integration test spec.

## Requirements

### Requirement: The system SHALL support ${title}
The system SHALL handle ${title} correctly.

#### Scenario: Basic
- **GIVEN** the system is configured
- **WHEN** a request is made
- **THEN** ${title} is handled
`;

async function writeSpec(specsDir: string, specId: string, content: string) {
  const p = specIdToPath(specId, specsDir);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, content);
}

describe('Hierarchical specs — integration', () => {
  let testDir: string;
  let specsDir: string;

  beforeEach(async () => {
    testDir = path.join(os.tmpdir(), `openspec-hierarchical-test-${randomUUID()}`);
    specsDir = path.join(testDir, 'openspec', 'specs');
    await fs.mkdir(specsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('mixed flat and hierarchical specs coexisting', () => {
    it('getSpecIds discovers both flat and hierarchical specs', async () => {
      await writeSpec(specsDir, 'auth', VALID_SPEC('auth'));
      await writeSpec(specsDir, 'cli/show', VALID_SPEC('cli-show'));
      await writeSpec(specsDir, 'cli/validate', VALID_SPEC('cli-validate'));
      await writeSpec(specsDir, 'schema/resolution', VALID_SPEC('schema-resolution'));

      const ids = await getSpecIds(testDir);
      expect(ids).toContain('auth');
      expect(ids).toContain('cli/show');
      expect(ids).toContain('cli/validate');
      expect(ids).toContain('schema/resolution');
      expect(ids).toHaveLength(4);
    });

    it('flat and hierarchical IDs with similar names are independent', async () => {
      await writeSpec(specsDir, 'cli-show', VALID_SPEC('flat-cli-show'));
      await writeSpec(specsDir, 'cli/show', VALID_SPEC('hierarchical-cli-show'));

      const ids = await getSpecIds(testDir);
      expect(ids).toContain('cli-show');
      expect(ids).toContain('cli/show');
      expect(ids).toHaveLength(2);
    });
  });

  describe('subtree listing via ListCommand', () => {
    beforeEach(async () => {
      await writeSpec(specsDir, 'auth', VALID_SPEC('auth'));
      await writeSpec(specsDir, 'cli/show', VALID_SPEC('cli-show'));
      await writeSpec(specsDir, 'cli/validate', VALID_SPEC('cli-validate'));
      await writeSpec(specsDir, 'client/config', VALID_SPEC('client-config'));
    });

    it('prefix "cli/" lists only specs under cli/', async () => {
      const ids = await getSpecIds(testDir);
      const prefix = 'cli/';
      const filtered = ids.filter(id => id.startsWith(prefix));
      expect(filtered).toContain('cli/show');
      expect(filtered).toContain('cli/validate');
      expect(filtered).not.toContain('client/config');
      expect(filtered).not.toContain('auth');
    });

    it('"cli/" does not match "client/" (segment boundary respected)', async () => {
      const ids = await getSpecIds(testDir);
      const filtered = ids.filter(id => id.startsWith('cli/'));
      expect(filtered).not.toContain('client/config');
    });

    it('ListCommand with specsPrefix filters correctly', async () => {
      const output: string[] = [];
      const origLog = console.log;
      console.log = (...args: any[]) => output.push(args.join(' '));

      const cmd = new ListCommand();
      await cmd.execute(testDir, 'specs', { specsPrefix: 'cli/' });

      console.log = origLog;
      const joined = output.join('\n');
      expect(joined).toContain('cli/show');
      expect(joined).toContain('cli/validate');
      expect(joined).not.toContain('client/config');
      expect(joined).not.toContain('auth');
    });
  });

  describe('cross-platform path handling', () => {
    it('specIdToPath uses OS path separator for filesystem operations', () => {
      const specId = 'cli/show';
      const baseDir = path.join('/project', 'openspec', 'specs');
      const result = specIdToPath(specId, baseDir);
      // Result must end with spec.md and contain the correct directories
      expect(result.endsWith(`spec.md`)).toBe(true);
      expect(result).toContain('cli');
      expect(result).toContain('show');
    });

    it('pathToSpecId always returns forward-slash IDs', () => {
      const baseDir = path.join('/project', 'openspec', 'specs');
      const filePath = path.join(baseDir, 'cli', 'show', 'spec.md');
      const id = pathToSpecId(filePath, baseDir);
      expect(id).toBe('cli/show');
      expect(id).not.toContain(path.win32.sep); // no backslashes
    });

    it('spec IDs from getSpecIds always use forward slashes', async () => {
      await writeSpec(specsDir, 'cli/show', VALID_SPEC('cli-show'));
      const ids = await getSpecIds(testDir);
      for (const id of ids) {
        expect(id).not.toContain('\\');
      }
    });

    it('round-trip: specIdToPath → pathToSpecId returns original ID', () => {
      const ids = ['auth', 'cli/show', 'domain/project/feature'];
      const baseDir = path.join('/project', 'openspec', 'specs');
      for (const id of ids) {
        const p = specIdToPath(id, baseDir);
        const roundTripped = pathToSpecId(p, baseDir);
        expect(roundTripped).toBe(id);
      }
    });
  });

  describe('validator with hierarchical delta specs', () => {
    it('validateChangeDeltaSpecs finds hierarchical delta specs and uses full path in issues', async () => {
      const changeDir = path.join(testDir, 'openspec', 'changes', 'test-change');
      const deltaDir = path.join(changeDir, 'specs', 'cli', 'show');
      await fs.mkdir(deltaDir, { recursive: true });

      // Write a valid delta spec
      const delta = `## ADDED Requirements

### Requirement: Show SHALL display hierarchical IDs
The show command SHALL accept hierarchical spec IDs.

#### Scenario: Hierarchical show
- **GIVEN** a spec at cli/show
- **WHEN** the user runs show
- **THEN** the spec is displayed`;
      await fs.writeFile(path.join(deltaDir, 'spec.md'), delta);

      const validator = new Validator();
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      expect(report.valid).toBe(true);
    });

    it('validateChangeDeltaSpecs uses full hierarchical path in error issue paths', async () => {
      const changeDir = path.join(testDir, 'openspec', 'changes', 'bad-change');
      const deltaDir = path.join(changeDir, 'specs', 'cli', 'show');
      await fs.mkdir(deltaDir, { recursive: true });

      // Write a delta spec missing SHALL/MUST
      const delta = `## ADDED Requirements

### Requirement: Show something
The show command can display stuff.

#### Scenario: Shows it
- **GIVEN** something
- **WHEN** run
- **THEN** shown`;
      await fs.writeFile(path.join(deltaDir, 'spec.md'), delta);

      const validator = new Validator();
      const report = await validator.validateChangeDeltaSpecs(changeDir);
      // Should have an error about missing SHALL/MUST
      const errorPaths = report.issues.map(i => i.path);
      // Error path should reference the full hierarchical path
      expect(errorPaths.some(p => p.includes('cli/show'))).toBe(true);
    });
  });
});
