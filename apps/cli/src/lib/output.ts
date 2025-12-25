/**
 * Output Helpers
 *
 * Colored console output for the CLI.
 */

import pc from 'picocolors';

/**
 * Success message with checkmark
 */
export function success(message: string): void {
  console.log(pc.green('✓') + ' ' + message);
}

/**
 * Error message with X
 */
export function error(message: string): void {
  console.error(pc.red('✗') + ' ' + message);
}

/**
 * Warning message
 */
export function warn(message: string): void {
  console.warn(pc.yellow('!') + ' ' + message);
}

/**
 * Info message
 */
export function info(message: string): void {
  console.log(pc.blue('→') + ' ' + message);
}

/**
 * Debug message (only in verbose mode)
 */
export function debug(message: string): void {
  if (process.env.DEBUG) {
    console.log(pc.gray('  ' + message));
  }
}

/**
 * Print a header
 */
export function header(title: string): void {
  console.log();
  console.log(pc.bold(title));
  console.log(pc.gray('─'.repeat(title.length)));
}

/**
 * Print key-value pair
 */
export function keyValue(key: string, value: string | number | null | undefined): void {
  const displayValue = value ?? pc.gray('—');
  console.log(`  ${pc.gray(key + ':')} ${displayValue}`);
}

/**
 * Print a simple table
 */
export function table(headers: string[], rows: string[][]): void {
  // Calculate column widths
  const widths = headers.map((h, i) => {
    const maxRow = Math.max(...rows.map((r) => (r[i] ?? '').length));
    return Math.max(h.length, maxRow);
  });

  // Print header
  const headerRow = headers.map((h, i) => h.padEnd(widths[i] ?? 0)).join('  ');
  console.log(pc.bold(headerRow));
  console.log(pc.gray(widths.map((w) => '─'.repeat(w)).join('  ')));

  // Print rows
  for (const row of rows) {
    const rowStr = row.map((cell, i) => (cell ?? '').padEnd(widths[i] ?? 0)).join('  ');
    console.log(rowStr);
  }
}

/**
 * Format status with color
 */
export function formatStatus(status: string): string {
  switch (status) {
    case 'running':
      return pc.green(status);
    case 'stopped':
      return pc.yellow(status);
    case 'pending':
    case 'deploying':
      return pc.blue(status);
    case 'error':
    case 'destroyed':
      return pc.red(status);
    default:
      return status;
  }
}

/**
 * Format date
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return pc.gray('—');
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString();
}

/**
 * Print directory tree
 */
export function tree(name: string, files: string[]): void {
  console.log(pc.bold(name + '/'));
  files.forEach((file, index) => {
    const isLast = index === files.length - 1;
    const prefix = isLast ? '└── ' : '├── ';
    console.log(pc.gray(prefix) + file);
  });
}
