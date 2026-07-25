import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCoverage,
  calculateClassificationAudit,
  coreFieldDefinitions,
  resolveFieldState,
  rowMatchesDashboardFilter,
  rowMatchesStateFilter,
  rowCoverage,
  stateTooltip,
  technicalFieldDefinitions,
  type CsvRow,
} from '../src/utils/coverage';

function baseRow(overrides: Partial<CsvRow> = {}): CsvRow {
  return {
    Brand: 'Example',
    Model: 'Player',
    Variant: '',
    'Release Year': '2024',
    Status: 'Active',
    'MSRP USD': '999',
    SoC: 'Snapdragon 665',
    OS: 'Android 12',
    'RAM GB': '4',
    'Storage GB': '64',
    microSD: 'TRUE',
    'Battery mAh': '4500',
    DAC: 'ES9038Q2M',
    '3.5mm': 'TRUE',
    '4.4mm': 'TRUE',
    '2.5mm': 'FALSE',
    '6.35mm': 'FALSE',
    'SE Power mW': '120',
    'BAL Power mW': '400',
    Bluetooth: 'TRUE',
    'Wi-Fi': 'TRUE',
    'Bluetooth Version': '5.0',
    'Streaming Services': 'TIDAL / Qobuz',
    'Storage Expansion Max': '2TB',
    'USB Port': 'USB-C',
    'Battery Life Hours': '10',
    Weight: '200g',
    Dimensions: '120 x 70 x 15 mm',
    Notes: 'Verified - Official.',
    review_notes: '',
    ...overrides,
  };
}

function core(field: string) {
  const definition = coreFieldDefinitions.find((entry) => entry.field === field);
  assert.ok(definition, `Missing core definition for ${field}`);
  return definition;
}

function technical(field: string) {
  const definition = technicalFieldDefinitions.find((entry) => entry.field === field);
  assert.ok(definition, `Missing technical definition for ${field}`);
  return definition;
}

test('populated field resolves to known', () => {
  assert.equal(resolveFieldState(baseRow(), core('DAC')).state, 'known');
});

test('blank applicable field resolves to missing', () => {
  assert.equal(resolveFieldState(baseRow({ DAC: '' }), core('DAC')).state, 'missing');
});

test('Sony blank SoC resolves to undisclosed', () => {
  assert.equal(resolveFieldState(baseRow({ Brand: 'Sony', SoC: '' }), technical('SoC')).state, 'undisclosed');
});

test('non-Android legacy player blank RAM resolves to not_applicable', () => {
  assert.equal(resolveFieldState(baseRow({ OS: 'HiBy OS', 'RAM GB': '' }), technical('RAM GB')).state, 'not_applicable');
});

test('device without balanced output does not count blank BAL Power mW as missing', () => {
  const row = baseRow({ '4.4mm': 'FALSE', '2.5mm': 'FALSE', 'Balanced Output Type': '', 'BAL Power mW': '' });
  assert.equal(resolveFieldState(row, core('BAL Power mW')).state, 'not_applicable');
  assert.equal(rowCoverage(row).actionableMissing.includes('BAL Power mW'), false);
});

test('device without microSD does not count Storage Expansion Max as missing', () => {
  const row = baseRow({ microSD: 'FALSE', 'Storage Expansion Max': '' });
  assert.equal(resolveFieldState(row, core('Storage Expansion Max')).state, 'not_applicable');
});

test('active model with actionable core blank is current model incomplete', () => {
  const summary = calculateCoverage([baseRow({ DAC: '' })], () => false);
  assert.equal(summary.currentModelsIncomplete, 1);
});

test('row with only undisclosed and not applicable blanks can be core complete', () => {
  const row = baseRow({
    Brand: 'Sony',
    SoC: '',
    '4.4mm': 'FALSE',
    '2.5mm': 'FALSE',
    'Balanced Output Type': '',
    'BAL Power mW': '',
    microSD: 'FALSE',
    'Storage Expansion Max': '',
    Notes: 'Sony does not publish the processor. No balanced output. No microSD.',
  });
  assert.equal(rowCoverage(row).isCoreComplete, true);
});

test('actionable missing excludes undisclosed and not_applicable fields', () => {
  const summary = calculateCoverage([
    baseRow({ Brand: 'Sony', SoC: '', DAC: '' }),
    baseRow({ '4.4mm': 'FALSE', '2.5mm': 'FALSE', 'Balanced Output Type': '', 'BAL Power mW': '' }),
  ], () => false);

  assert.equal(summary.actionableMissingFields, 1);
});

test('applicable field coverage uses known plus missing plus needs verification denominator', () => {
  const summary = calculateCoverage([baseRow({ DAC: '', Notes: 'USB Port needs verification.' })], () => false);
  assert.equal(summary.applicableCoveragePct, 89);
  assert.equal(summary.needsVerificationFields, 1);
});

test('needs review flags are preserved through injected review predicate', () => {
  const summary = calculateCoverage([baseRow({ review_notes: 'Needs review: source conflict.' })], (row) => row.review_notes.includes('Needs review'));
  assert.equal(summary.needsReviewRows, 1);
});

test('row order identities can use brand model and variant without model-only collisions', () => {
  const rows = [
    baseRow({ Brand: 'HiBy', Model: 'M500', Variant: '4G', DAC: '' }),
    baseRow({ Brand: 'HiBy', Model: 'M500', Variant: 'WiFi' }),
  ];
  const summary = calculateCoverage(rows, () => false);
  assert.equal(summary.rows[0].row.Variant, '4G');
  assert.equal(summary.rows[0].actionableMissing.includes('DAC'), true);
  assert.equal(summary.rows[1].row.Variant, 'WiFi');
});

test('dashboard core incomplete filter matches rows with actionable gaps and toggled clear can show all', () => {
  const complete = rowCoverage(baseRow());
  const incomplete = rowCoverage(baseRow({ DAC: '' }));
  const needsReview = () => false;

  assert.equal(rowMatchesDashboardFilter(complete, 'core_incomplete', needsReview, 'DAC'), false);
  assert.equal(rowMatchesDashboardFilter(incomplete, 'core_incomplete', needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(complete, null, needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(incomplete, null, needsReview, 'DAC'), true);
});

test('dashboard current models incomplete filter requires active or upcoming gaps', () => {
  const activeGap = rowCoverage(baseRow({ Status: 'Active', DAC: '' }));
  const upcomingGap = rowCoverage(baseRow({ Status: 'Upcoming', DAC: '' }));
  const discontinuedGap = rowCoverage(baseRow({ Status: 'Discontinued', DAC: '' }));
  const needsReview = () => false;

  assert.equal(rowMatchesDashboardFilter(activeGap, 'current_models_incomplete', needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(upcomingGap, 'current_models_incomplete', needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(discontinuedGap, 'current_models_incomplete', needsReview, 'DAC'), false);
});

test('dashboard needs review filter uses the existing review predicate', () => {
  const flagged = rowCoverage(baseRow({ review_notes: 'needs review: source conflict' }));
  const clean = rowCoverage(baseRow());
  const needsReview = (row: CsvRow) => row.review_notes.includes('needs review');

  assert.equal(rowMatchesDashboardFilter(flagged, 'needs_review', needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(clean, 'needs_review', needsReview, 'DAC'), false);
});

test('top actionable missing dashboard filter matches the displayed field only', () => {
  const dacGap = rowCoverage(baseRow({ DAC: '' }));
  const msrpGap = rowCoverage(baseRow({ 'MSRP USD': '' }));
  const needsReview = () => false;

  assert.equal(rowMatchesDashboardFilter(dacGap, 'top_actionable_missing', needsReview, 'DAC'), true);
  assert.equal(rowMatchesDashboardFilter(msrpGap, 'top_actionable_missing', needsReview, 'DAC'), false);
});

test('text search result sets can be narrowed by dashboard filters', () => {
  const rows = [
    baseRow({ Brand: 'Sony', Model: 'SearchHit', DAC: '' }),
    baseRow({ Brand: 'Sony', Model: 'SearchHit Complete' }),
    baseRow({ Brand: 'FiiO', Model: 'Other', DAC: '' }),
  ];
  const searched = rows.filter((row) => Object.values(row).some((cell) => cell.toLowerCase().includes('searchhit')));
  const filtered = searched.filter((row) => rowMatchesDashboardFilter(rowCoverage(row), 'core_incomplete', () => false, 'DAC'));

  assert.equal(searched.length, 2);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].Model, 'SearchHit');
});

test('undisclosed and not applicable state filters match rows containing those states', () => {
  const undisclosed = rowCoverage(baseRow({ DAC: '', Notes: 'DAC remains blank because no reliable teardown confirms it.' }));
  const notApplicable = rowCoverage(baseRow({ microSD: 'FALSE', 'Storage Expansion Max': '' }));
  const clean = rowCoverage(baseRow());

  assert.equal(rowMatchesStateFilter(undisclosed, 'undisclosed', () => false), true);
  assert.equal(rowMatchesStateFilter(notApplicable, 'not_applicable', () => false), true);
  assert.equal(rowMatchesStateFilter(clean, 'undisclosed', () => false), false);
});

test('generated blank states have explanatory tooltip text', () => {
  assert.match(stateTooltip('missing', 'DAC'), /Applicable core field/);
  assert.match(stateTooltip('undisclosed', 'SoC'), /no defensible public value/);
  assert.match(stateTooltip('not_applicable', 'BAL Power mW'), /does not apply/);
  assert.match(stateTooltip('needs_verification', 'MSRP USD'), /manual review/);
});

test('priority labels remain readable values', () => {
  assert.equal(rowCoverage(baseRow()).priority, 'Complete');
  assert.equal(rowCoverage(baseRow({ DAC: '' })).priority, 'High');
  assert.equal(rowCoverage(baseRow({ Status: 'Discontinued', 'Release Year': '2021', DAC: '' })).priority, 'Medium');
  assert.equal(rowCoverage(baseRow({ Status: 'Discontinued', 'Release Year': '2015', DAC: '' })).priority, 'Low');
});

test('coverage context numbers come from calculated statistics', () => {
  const summary = calculateCoverage([
    baseRow(),
    baseRow({ DAC: '' }),
    baseRow({ Brand: 'Sony', DAC: '', Notes: 'DAC remains blank because no reliable teardown confirms it.' }),
    baseRow({ microSD: 'FALSE', 'Storage Expansion Max': '' }),
  ], () => false);
  const excludedBlanks = summary.undisclosedFields + summary.notApplicableFields;

  assert.equal(summary.coreCompleteRows, 3);
  assert.equal(summary.totalRows, 4);
  assert.equal(summary.actionableMissingFields, 1);
  assert.equal(excludedBlanks, 2);
});

test('classification audit reports top field counts and current row groups', () => {
  const audit = calculateClassificationAudit([
    baseRow({ Model: 'CompleteActive' }),
    baseRow({ Model: 'GapActive', DAC: '' }),
    baseRow({ Model: 'GapOld', Status: 'Discontinued', 'Release Year': '2015', 'MSRP USD': '' }),
    baseRow({ Model: 'Undisclosed', DAC: '', Notes: 'DAC remains blank because no reliable teardown confirms it.' }),
    baseRow({ Model: 'NoMicroSD', microSD: 'FALSE', 'Storage Expansion Max': '' }),
  ], () => false);

  assert.equal(audit.totalActionableMissingCoreFields, 2);
  assert.equal(audit.topActionableMissingFields[0].field, 'DAC');
  assert.equal(audit.topUndisclosedFields[0].field, 'DAC');
  assert.equal(audit.topNotApplicableFields[0].field, 'Storage Expansion Max');
  assert.deepEqual(audit.currentCoreIncompleteRows, ['Example GapActive']);
  assert.ok(audit.currentCoreCompleteRows.includes('Example CompleteActive'));
});
