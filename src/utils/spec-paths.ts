import path from 'path';

/**
 * Convert a spec ID (e.g. "cli/show") to a filesystem path to its spec.md.
 * Spec IDs always use "/" as separator regardless of OS.
 */
export function specIdToPath(specId: string, baseDir: string): string {
  const parts = specId.split('/');
  return path.join(baseDir, ...parts, 'spec.md');
}

/**
 * Convert a filesystem path to a spec ID.
 * The returned ID always uses "/" as separator regardless of OS.
 */
export function pathToSpecId(filePath: string, specsDir: string): string {
  const relative = path.relative(specsDir, filePath);
  // relative is e.g. "cli/show/spec.md" on unix or "cli\show\spec.md" on windows
  // strip the trailing "spec.md" component and normalize separators to "/"
  const parts = relative.split(path.sep);
  // remove the last "spec.md" component
  parts.pop();
  return parts.join('/');
}
