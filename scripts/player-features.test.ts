import assert from 'node:assert/strict';
import test from 'node:test';
import { parsePlayerFeatures } from '../src/utils/playerFeatures';

test('blank player features parse to an empty list', () => {
  assert.deepEqual(parsePlayerFeatures('').features, []);
  assert.deepEqual(parsePlayerFeatures('   ').warnings, []);
});

test('player features parse supported and unsupported values', () => {
  const result = parsePlayerFeatures('Gapless Playback|TRUE; ReplayGain|FALSE');

  assert.deepEqual(result.features, [
    { label: 'Gapless Playback', supported: true },
    { label: 'ReplayGain', supported: false },
  ]);
  assert.deepEqual(result.warnings, []);
});

test('player features use controlled vocabulary order', () => {
  const result = parsePlayerFeatures('Lyrics Support|TRUE; Gapless Playback|FALSE; M3U Playlists|TRUE');

  assert.deepEqual(result.features, [
    { label: 'Gapless Playback', supported: false },
    { label: 'M3U Playlists', supported: true },
    { label: 'Lyrics Support', supported: true },
  ]);
});

test('invalid player feature entries warn and are skipped', () => {
  const result = parsePlayerFeatures('Gapless|TRUE; M3U Playlists|Yes; CUE Sheets; Lyrics Support|; Gapless Playback|true; Gapless Playback|TRUE;;');

  assert.deepEqual(result.features, [
    { label: 'Gapless Playback', supported: true },
  ]);
  assert.equal(result.warnings.length, 7);
  assert.match(result.warnings.join('\n'), /Unknown Player Feature: Gapless/);
  assert.match(result.warnings.join('\n'), /did you mean Gapless Playback/);
  assert.match(result.warnings.join('\n'), /Invalid Player Features value for M3U Playlists: Yes/);
  assert.match(result.warnings.join('\n'), /Malformed Player Features entry: CUE Sheets/);
  assert.match(result.warnings.join('\n'), /Missing Player Features value for Lyrics Support/);
  assert.match(result.warnings.join('\n'), /Invalid Player Features value for Gapless Playback: true/);
  assert.match(result.warnings.join('\n'), /Empty Player Features entry/);
});

test('duplicate player features warn and keep the first value', () => {
  const result = parsePlayerFeatures('Gapless Playback|TRUE; Gapless Playback|FALSE');

  assert.deepEqual(result.features, [
    { label: 'Gapless Playback', supported: true },
  ]);
  assert.deepEqual(result.warnings, ['Duplicate Player Feature: Gapless Playback']);
});
