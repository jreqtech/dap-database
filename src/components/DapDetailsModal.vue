<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { ChevronLeft, ChevronRight, ExternalLink, X } from 'lucide-vue-next';
import type { Dap, MixedSpecValue } from '../types/dap';
import { formatBattery, formatColors, formatCompactPrice, formatPower, formatValue, hasValue } from '../utils/formatters';
import { getStatusBadgeMeta, getVerificationBadgeMeta } from '../utils/dapDisplay';
import { formatStorageExpansion } from '../utils/storageDisplay';
import DapPhoto from './DapPhoto.vue';

const props = defineProps<{
  dap: Dap | null;
  previousDap?: Dap | null;
  nextDap?: Dap | null;
  sheetMode?: boolean;
  rawFields?: Array<{ label: string; value: string }>;
}>();

const emit = defineEmits<{
  close: [];
  navigate: [dap: Dap];
}>();

interface DetailRow {
  label: string;
  value: string;
  wide?: boolean;
}

interface BuyGroup {
  label: string;
  links: Array<{ label: string; url: string }>;
}

interface RawField {
  label: string;
  value: string;
  displayValue: string;
  state: 'empty' | 'none' | 'value';
}

const referenceLinkRel = 'noopener noreferrer nofollow';
let previousBodyOverflow = '';
let isBodyScrollLocked = false;
const isDrawerScrolled = ref(false);
const requiredRawAuditFields = new Set([
  'Brand',
  'Model',
  'Release Year',
  'Status',
  'Source URL',
  'Notes',
  'image_filename',
]);
const optionalBlankRawFields = new Set([
  'Variant',
  'MSRP USD',
  'SoC',
  'Amp',
  'Image URL',
  'Image Source URL',
  'Image Credit',
  'Image Type',
  'image_url',
  'image_source_url',
  'image_credit',
  'color_variants',
  '2.5mm',
  '6.35mm',
  'Cellular',
  '4G',
  '5G',
  'Bluetooth Version',
  'Bluetooth Codecs',
  'Line Out',
  'Coax Out',
  'Optical Out',
  'SE Power Load',
  'BAL Power Load',
  'Streaming Services',
  'Wi-Fi Bands',
  'official_store_url',
  'last_updated',
  'buy_notes',
  'review_links',
  'review_notes',
]);

function handleDrawerScroll(event: Event) {
  isDrawerScrolled.value = (event.currentTarget as HTMLElement).scrollTop > 24;
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.dap) emit('close');
  if (event.key === 'ArrowLeft' && props.previousDap) emit('navigate', props.previousDap);
  if (event.key === 'ArrowRight' && props.nextDap) emit('navigate', props.nextDap);
}

function textValue(value: MixedSpecValue | boolean | undefined): string {
  if (!hasValue(value)) return '';
  return formatValue(value);
}

function listValue(values: string[] | null | undefined): string {
  return values?.length ? formatColors(values) : '';
}

function gbValue(value: MixedSpecValue | undefined): string {
  if (!hasValue(value)) return '';
  if (typeof value === 'number') return `${value.toLocaleString('en-US')} GB`;
  const raw = String(value).trim();
  const spaced = raw.replace(/(\d)\s*(GB|TB)\b/gi, '$1 $2');
  return /(?:gb|tb)$/i.test(spaced) ? spaced : `${spaced} GB`;
}

function hoursValue(value: MixedSpecValue | undefined): string {
  if (!hasValue(value)) return '';
  const raw = String(value).trim();
  if (/hours?|hrs?/i.test(raw)) return raw;
  return `${raw} hours`;
}

function displaySizeValue(value: MixedSpecValue | undefined): string {
  const raw = textValue(value);
  return raw.replace(/\b(\d+(?:\.\d+)?)\s*in\b/i, '$1 inches');
}

function weightValue(value: MixedSpecValue | undefined): string {
  const raw = textValue(value);
  return raw.replace(/\b(\d+(?:\.\d+)?)\s*g\b/i, '$1 g');
}

function powerValue(power: MixedSpecValue | undefined, load: string): string {
  if (!hasValue(power)) return '';
  const formattedPower = formatPower(power);
  return hasValue(load) ? `${formattedPower} @ ${load}` : formattedPower;
}

function addRow(rows: DetailRow[], label: string, value: string, wide = false) {
  if (value) rows.push({ label, value, wide });
}

function rawFieldValue(fields: Array<{ label: string; value: string }>, label: string): string {
  return fields.find((field) => field.label === label)?.value ?? '';
}

function rawBlankMeansNone(fields: Array<{ label: string; value: string }>, label: string): boolean {
  if (label === 'RAM GB') {
    const os = rawFieldValue(fields, 'OS').toLowerCase();
    return os.includes('snowsky') || os.includes('linux') || os.includes('hibyos') || os.includes('mtouch');
  }

  if (label === 'Storage GB') {
    return rawFieldValue(fields, 'microSD').toUpperCase() === 'TRUE' || rawFieldValue(fields, 'Storage Expansion Max') !== '';
  }

  return optionalBlankRawFields.has(label) && !requiredRawAuditFields.has(label);
}

function rawFieldDisplayValue(fields: Array<{ label: string; value: string }>, label: string, value: string): string {
  if (value === '') return rawBlankMeansNone(fields, label) ? 'None' : '?';
  if (value.trim() === '0') return 'None';
  if (value.trim().toUpperCase() === 'FALSE') return 'None';
  return value;
}

function rawFieldState(fields: Array<{ label: string; value: string }>, label: string, value: string): RawField['state'] {
  if (value === '') return rawBlankMeansNone(fields, label) ? 'none' : 'empty';
  if (value.trim() === '0') return 'none';
  if (value.trim().toUpperCase() === 'FALSE') return 'none';
  return 'value';
}

const rawDetailFields = computed<RawField[]>(() => (props.rawFields ?? []).map((field) => ({
  ...field,
  displayValue: rawFieldDisplayValue(props.rawFields ?? [], field.label, field.value),
  state: rawFieldState(props.rawFields ?? [], field.label, field.value),
})));

const rawSourceFields = computed(() => rawDetailFields.value.filter((field) => (
  field.label.toLowerCase().includes('url')
  || field.displayValue.toLowerCase().includes('http://')
  || field.displayValue.toLowerCase().includes('https://')
)));

const summaryRows = computed<DetailRow[]>(() => {
  if (!props.dap) return [];
  const dap = props.dap;
  const rows: DetailRow[] = [];
  addRow(rows, 'Year', textValue(dap.releaseYear));
  addRow(rows, 'MSRP', hasValue(dap.msrpUsd) ? formatCompactPrice(dap.msrpUsd) : '');
  addRow(rows, 'Source status', hasValue(dap.verificationStatus) ? getVerificationBadgeMeta(dap.verificationStatus).label : '');
  return rows;
});

const outputSummary = computed(() => {
  if (!props.dap) return '';
  const dap = props.dap;
  const balancedType = dap.balancedOutputType.toLowerCase();
  const outputs: string[] = [];
  if (dap.has35mm) outputs.push('3.5mm');
  if (dap.has25mm) outputs.push(balancedType.includes('2.5') ? '2.5mm balanced' : '2.5mm');
  if (dap.has44mm) outputs.push(balancedType.includes('4.4') ? '4.4mm balanced' : '4.4mm');
  if (dap.has635mm) outputs.push('6.35mm');
  if (dap.lineOut) outputs.push('line out');
  if (dap.coaxOut) outputs.push('coax');
  if (dap.opticalOut) outputs.push('optical');
  return outputs.join(', ');
});

const audioRows = computed<DetailRow[]>(() => {
  if (!props.dap) return [];
  const dap = props.dap;
  const rows: DetailRow[] = [];
  addRow(rows, 'DAC', textValue(dap.dac), true);
  addRow(rows, 'Amplifier', textValue(dap.amp), true);
  addRow(rows, 'Outputs', outputSummary.value, true);
  addRow(rows, 'Balanced output', textValue(dap.balancedOutputType));
  addRow(rows, 'SE Power', powerValue(dap.sePowerMw, dap.sePowerLoad));
  addRow(rows, 'Balanced power', powerValue(dap.balPowerMw, dap.balPowerLoad));
  return rows;
});

const hardwareRows = computed<DetailRow[]>(() => {
  if (!props.dap) return [];
  const dap = props.dap;
  const rows: DetailRow[] = [];
  addRow(rows, 'SoC', textValue(dap.soc));
  addRow(rows, 'RAM', gbValue(dap.ramGb));
  addRow(rows, 'OS', textValue(dap.os));
  addRow(rows, 'Battery', hasValue(dap.batteryMah) ? formatBattery(dap.batteryMah) : '');
  addRow(rows, 'Battery life', hoursValue(dap.batteryLifeHours));
  addRow(rows, 'Display', displaySizeValue(dap.displaySize));
  addRow(rows, 'Weight', weightValue(dap.weight));
  addRow(rows, 'Dimensions', textValue(dap.dimensions), true);
  addRow(rows, 'Storage', gbValue(dap.storageGb));
  addRow(rows, 'Storage expansion', formatStorageExpansion(dap, { showNone: true, showUnknown: true }));
  addRow(rows, 'Colors', listValue(dap.colors), true);
  return rows;
});

const connectivityRows = computed<DetailRow[]>(() => {
  if (!props.dap) return [];
  const dap = props.dap;
  const rows: DetailRow[] = [];
  if (dap.bluetooth === true) addRow(rows, 'Bluetooth', textValue(dap.bluetoothVersion) || 'Yes');
  addRow(rows, 'Codecs', listValue(dap.bluetoothCodecs), true);
  if (dap.wifi === true) addRow(rows, 'Wi-Fi', textValue(dap.wifiBands) || 'Yes');
  if (dap.cellular === true) addRow(rows, 'Cellular', 'Yes');
  if (dap.has4g === true) addRow(rows, '4G', 'Yes');
  if (dap.has5g === true) addRow(rows, '5G', 'Yes');

  const usbParts = [textValue(dap.usbPort)];
  if (dap.usbDac === true) usbParts.push('USB DAC');
  addRow(rows, 'USB', usbParts.filter(Boolean).join(', '), true);

  const formats = [];
  if (hasValue(dap.pcmMax)) formats.push(`PCM ${dap.pcmMax}`);
  if (hasValue(dap.dsdMax)) formats.push(String(dap.dsdMax));
  addRow(rows, 'Formats', formats.join(', '));

  if (dap.mqa === true) addRow(rows, 'MQA', 'Yes');
  addRow(rows, 'Streaming', listValue(dap.streamingServices), true);
  return rows;
});

const sourceStatusLabel = computed(() => {
  if (!props.dap) return '';
  const sourceType = getVerificationBadgeMeta(props.dap.verificationStatus).label;
  return sourceType || 'Source not listed';
});

const primarySourceLabel = computed(() => {
  if (!props.dap) return '';
  if (!props.dap.sourceUrl) return sourceStatusLabel.value;
  if (sourceStatusLabel.value === 'Official') return 'Official product page';
  if (sourceStatusLabel.value === 'Review') return 'Review';
  if (sourceStatusLabel.value === 'Retail/Web') return 'Retail or web source';
  if (sourceStatusLabel.value === 'Partial') return 'Primary source';
  return sourceStatusLabel.value || 'Primary source';
});

const buyGroups = computed<BuyGroup[]>(() => {
  if (!props.dap) return [];
  const dap = props.dap;
  const groups: BuyGroup[] = [];

  if (dap.officialStoreUrl) {
    groups.push({
      label: 'Official',
      links: [{ label: 'Official Store', url: dap.officialStoreUrl }],
    });
  }

  if (dap.buyLinks.length) {
    groups.push({ label: 'Retailers', links: dap.buyLinks });
  }

  return groups;
});

const hasBuyInfo = computed(() => {
  if (!props.dap) return false;
  return Boolean(buyGroups.value.length || props.dap.buyNotes.trim());
});

const hasReviewInfo = computed(() => {
  if (!props.dap) return false;
  return Boolean(props.dap.reviewLinks.length);
});

function compactDapName(dap: Dap | null | undefined): string {
  if (!dap) return '';
  return [dap.brand, dap.model, dap.variant].filter(Boolean).join(' ');
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
  if (isBodyScrollLocked) {
    document.body.style.overflow = previousBodyOverflow;
    isBodyScrollLocked = false;
  }
});

watch(() => props.dap, (dap) => {
  if (dap) {
    if (!isBodyScrollLocked) {
      previousBodyOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      isBodyScrollLocked = true;
    }
    isDrawerScrolled.value = false;
    return;
  }

  if (isBodyScrollLocked) {
    document.body.style.overflow = previousBodyOverflow;
    isBodyScrollLocked = false;
  }
  isDrawerScrolled.value = false;
}, { immediate: true });
</script>

<template>
  <Teleport to="body">
    <div v-if="dap" class="modal-backdrop" role="presentation" @click.self="$emit('close')">
      <section
        class="details-modal"
        :class="{ 'is-scrolled': isDrawerScrolled }"
        role="dialog"
        aria-modal="true"
        :aria-label="`${dap.brand} ${dap.model} details`"
        @scroll.passive="handleDrawerScroll"
      >
        <header class="details-modal__header">
          <div>
            <p class="eyebrow">{{ dap.brand }}</p>
            <div class="details-title-row">
              <h2>
                <span class="details-title-brand">{{ dap.brand }}</span>
                <span>{{ dap.model }}</span>
                <span v-if="dap.variant" class="details-title-variant">{{ dap.variant }}</span>
              </h2>
              <span
                v-if="hasValue(dap.status) && dap.status.trim().toLowerCase() !== 'active'"
                class="badge details-title-status"
                :class="getStatusBadgeMeta(dap.status).className"
                :title="getStatusBadgeMeta(dap.status).title"
              >
                {{ getStatusBadgeMeta(dap.status).label }}
              </span>
            </div>
          </div>
          <button class="btn btn-ghost btn-icon details-icon-button" type="button" aria-label="Close details" @click="$emit('close')">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <div v-if="sheetMode" class="details-modal__body details-modal__body--raw">
          <section class="details-section raw-source-section">
            <h3>Source URLs</h3>
            <div v-if="rawSourceFields.length" class="raw-source-list">
              <div v-for="field in rawSourceFields" :key="`source-${field.label}`" class="raw-source-item">
                <span class="spec-label">{{ field.label }}</span>
                <span class="raw-source-value">{{ field.displayValue }}</span>
              </div>
            </div>
            <p v-else class="raw-empty-note">No source URL fields found for this row.</p>
          </section>

          <section class="details-section">
            <h3>CSV fields</h3>
            <div class="raw-fields-wrap">
              <table class="raw-fields-table">
                <thead>
                  <tr>
                    <th scope="col">Field</th>
                    <th scope="col">Value</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="field in rawDetailFields" :key="field.label" :class="`raw-field-row--${field.state}`">
                    <th scope="row">{{ field.label }}</th>
                    <td>{{ field.displayValue }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>

        <div v-else class="details-modal__body">
          <div class="details-top">
            <aside class="details-photo-panel">
              <DapPhoto :dap="dap" size="large" />
            </aside>

            <section class="details-section details-section--core">
              <h3>Summary</h3>
              <dl class="spec-grid spec-grid--single">
                <div v-for="row in summaryRows" :key="row.label" class="spec-row" :class="{ 'spec-row--wide': row.wide }">
                  <dt class="spec-label">{{ row.label }}</dt>
                  <dd class="spec-value">{{ row.value }}</dd>
                </div>
              </dl>
              <div v-if="hasReviewInfo" class="summary-review-section">
                <h4>Reviews</h4>
                <ul class="review-list">
                  <li v-for="link in dap.reviewLinks" :key="link.url">
                    <a class="source-link" :href="link.url" target="_blank" :rel="referenceLinkRel">
                      <ExternalLink :size="15" aria-hidden="true" />
                      <span>{{ link.label }}</span>
                    </a>
                  </li>
                </ul>
              </div>
            </section>
          </div>

          <div class="details-sections">

            <section v-if="audioRows.length" class="details-section">
              <h3>Audio</h3>
              <dl class="spec-grid">
                <div v-for="row in audioRows" :key="row.label" class="spec-row" :class="{ 'spec-row--wide': row.wide }">
                  <dt class="spec-label">{{ row.label }}</dt>
                  <dd class="spec-value">{{ row.value }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="hardwareRows.length" class="details-section">
              <h3>Hardware</h3>
              <dl class="spec-grid">
                <div v-for="row in hardwareRows" :key="row.label" class="spec-row" :class="{ 'spec-row--wide': row.wide }">
                  <dt class="spec-label">{{ row.label }}</dt>
                  <dd class="spec-value">{{ row.value }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="connectivityRows.length" class="details-section">
              <h3>Connectivity</h3>
              <dl class="spec-grid">
                <div v-for="row in connectivityRows" :key="row.label" class="spec-row" :class="{ 'spec-row--wide': row.wide }">
                  <dt class="spec-label">{{ row.label }}</dt>
                  <dd class="spec-value">{{ row.value }}</dd>
                </div>
              </dl>
            </section>

            <section v-if="hasBuyInfo" class="details-section buy-section">
              <h3>Availability</h3>
              <dl class="spec-grid spec-grid--single">
                <div v-for="group in buyGroups" :key="group.label" class="spec-row">
                  <dt class="spec-label">{{ group.label }}</dt>
                  <dd class="spec-value">
                    <ul class="buy-link-list">
                      <li v-for="link in group.links" :key="`${group.label}-${link.url}`">
                        <a class="buy-link" :href="link.url" target="_blank" :rel="referenceLinkRel">
                          <ExternalLink :size="15" aria-hidden="true" />
                          <span>{{ link.label }}</span>
                        </a>
                      </li>
                    </ul>
                  </dd>
                </div>
                <div v-if="dap.buyNotes" class="spec-row">
                  <dt class="spec-label">Notes</dt>
                  <dd class="spec-value buy-notes">{{ dap.buyNotes }}</dd>
                </div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Sources</h3>
              <dl class="spec-grid spec-grid--single">
                <div class="spec-row">
                  <dt class="spec-label">Source status</dt>
                  <dd class="spec-value">{{ sourceStatusLabel }}</dd>
                </div>
                <div class="spec-row">
                  <dt class="spec-label">Primary source</dt>
                  <dd class="spec-value">
                    <a v-if="dap.sourceUrl" class="source-link" :href="dap.sourceUrl" target="_blank" :rel="referenceLinkRel">
                      <ExternalLink :size="15" aria-hidden="true" />
                      <span>{{ primarySourceLabel }}</span>
                    </a>
                    <span v-else>{{ primarySourceLabel }}</span>
                  </dd>
                </div>
              </dl>
            </section>

            <details class="details-section notes-panel">
              <summary>Notes and source details</summary>
              <p class="notes-text">{{ formatValue(dap.notes) }}</p>
            </details>
          </div>
        </div>
        <nav
          v-if="previousDap || nextDap"
          class="details-modal__nav"
          :class="{
            'details-modal__nav--single': !previousDap || !nextDap,
            'details-modal__nav--next-only': !previousDap && nextDap,
          }"
          aria-label="Browse DAP details"
        >
          <button
            v-if="previousDap"
            class="modal-nav-link modal-nav-link--previous"
            type="button"
            :aria-label="`Previous DAP: ${compactDapName(previousDap)}`"
            @click="$emit('navigate', previousDap)"
          >
            <span class="modal-nav-link__eyebrow">
              <ChevronLeft :size="16" aria-hidden="true" />
              <span>Previous</span>
            </span>
            <strong class="modal-nav-link__name">{{ compactDapName(previousDap) }}</strong>
          </button>
          <button
            v-if="nextDap"
            class="modal-nav-link modal-nav-link--next"
            type="button"
            :aria-label="`Next DAP: ${compactDapName(nextDap)}`"
            @click="$emit('navigate', nextDap)"
          >
            <span class="modal-nav-link__eyebrow">
              <span>Next</span>
              <ChevronRight :size="16" aria-hidden="true" />
            </span>
            <strong class="modal-nav-link__name">{{ compactDapName(nextDap) }}</strong>
          </button>
        </nav>
      </section>
    </div>
  </Teleport>
</template>
