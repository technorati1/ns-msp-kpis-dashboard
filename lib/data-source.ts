/**
 * Set DATA_SOURCE=sheets to roll back to the pre-migration live-Sheets read
 * path for one deploy cycle. Remove this flag and the sheets branch in
 * Phase 13 once the database cutover is confirmed stable.
 */
export function isDatabaseSource(): boolean {
  return process.env.DATA_SOURCE !== 'sheets';
}
