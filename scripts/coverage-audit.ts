import fs from 'node:fs';
import {
  buildRows,
  calculateClassificationAudit,
  type CsvRow,
} from '../src/utils/coverage';

function parseCsv(csv: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let inQuotes = false;

  for (let index = 0; index < csv.length; index += 1) {
    const char = csv[index];
    const nextChar = csv[index + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        cell += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === ',' && !inQuotes) {
      row.push(cell);
      cell = '';
      continue;
    }

    if ((char === '\n' || char === '\r') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') index += 1;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
      continue;
    }

    cell += char;
  }

  if (cell.length || row.length) row.push(cell);
  if (row.length) rows.push(row);
  return rows;
}

function needsReview(row: CsvRow): boolean {
  const notes = (row.Notes ?? '').toLowerCase();
  const reviewNotes = (row.review_notes ?? '').toLowerCase();
  const sourceUrl = (row['Source URL'] ?? '').trim();
  return (
    notes.startsWith('partial') ||
    !sourceUrl ||
    reviewNotes.includes('needs review') ||
    reviewNotes.includes('unclear') ||
    reviewNotes.includes('rejected') ||
    reviewNotes.includes('not added') ||
    reviewNotes.includes('not kept') ||
    reviewNotes.includes('no exact') ||
    notes.includes('needs review') ||
    notes.includes('pending') ||
    notes.includes('re-verification')
  );
}

function printTop(title: string, rows: { field: string; count: number }[]) {
  console.log(`\n${title}`);
  for (const item of rows) console.log(`- ${item.field}: ${item.count}`);
}

const csv = fs.readFileSync('src/data/daps.csv', 'utf8').trimEnd();
const parsed = parseCsv(csv);
const headers = parsed[0] ?? [];
const rows = buildRows(headers, parsed.slice(1));
const audit = calculateClassificationAudit(rows, needsReview);

console.log('Coverage classification audit');
console.log(`Total known core fields: ${audit.totalKnownCoreFields}`);
console.log(`Total actionable missing core fields: ${audit.totalActionableMissingCoreFields}`);
console.log(`Total undisclosed fields: ${audit.totalUndisclosedFields}`);
console.log(`Total not applicable fields: ${audit.totalNotApplicableFields}`);
console.log(`Total needs verification fields: ${audit.totalNeedsVerificationFields}`);
console.log('Rows containing each state:', audit.rowsContaining);
printTop('Top 10 actionable missing fields', audit.topActionableMissingFields);
printTop('Top 10 undisclosed fields', audit.topUndisclosedFields);
printTop('Top 10 not applicable fields', audit.topNotApplicableFields);
console.log(`\nActive/upcoming core complete rows (${audit.currentCoreCompleteRows.length})`);
for (const row of audit.currentCoreCompleteRows) console.log(`- ${row}`);
console.log(`\nActive/upcoming core incomplete rows (${audit.currentCoreIncompleteRows.length})`);
for (const row of audit.currentCoreIncompleteRows) console.log(`- ${row}`);
