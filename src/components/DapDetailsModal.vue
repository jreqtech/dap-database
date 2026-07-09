<script setup lang="ts">
import { onBeforeUnmount, onMounted } from 'vue';
import { ExternalLink, X } from 'lucide-vue-next';
import type { Dap } from '../types/dap';
import { formatBattery, formatBoolean, formatColors, formatPower, formatPrice, formatValue } from '../utils/formatters';
import { getStatusBadgeMeta, imageUrlForDap } from '../utils/dapDisplay';
import DapPhoto from './DapPhoto.vue';
import SpecChip from './SpecChip.vue';
import VerificationBadge from './VerificationBadge.vue';

const props = defineProps<{
  dap: Dap | null;
}>();

const emit = defineEmits<{
  close: [];
}>();

function handleKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && props.dap) emit('close');
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown);
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown);
});
</script>

<template>
  <Teleport to="body">
    <div v-if="dap" class="modal-backdrop" role="presentation" @click.self="$emit('close')">
      <section class="details-modal" role="dialog" aria-modal="true" :aria-label="`${dap.brand} ${dap.model} details`">
        <header class="details-modal__header">
          <div>
            <p class="eyebrow">{{ dap.brand }}</p>
            <h2>{{ dap.model }}</h2>
            <p v-if="dap.variant" class="variant-text">{{ dap.variant }}</p>
          </div>
          <button class="btn btn-ghost btn-icon details-icon-button" type="button" aria-label="Close details" @click="$emit('close')">
            <X :size="18" aria-hidden="true" />
          </button>
        </header>

        <div class="details-modal__body">
          <aside class="details-photo-panel">
            <DapPhoto :dap="dap" size="large" />
            <a
              v-if="dap.images[0]?.sourceUrl"
              class="source-link"
              :href="dap.images[0].sourceUrl"
              target="_blank"
              rel="noopener noreferrer"
            >
              <ExternalLink :size="15" aria-hidden="true" />
              <span>Image source</span>
            </a>
            <p v-else-if="imageUrlForDap(dap)" class="muted-block">Image source not listed.</p>
          </aside>

          <div class="details-sections">
            <section class="details-section">
              <h3>Core Info</h3>
              <dl class="detail-list">
                <div><dt>Brand</dt><dd>{{ dap.brand }}</dd></div>
                <div><dt>Model</dt><dd>{{ dap.model }}</dd></div>
                <div><dt>Year</dt><dd>{{ formatValue(dap.releaseYear) }}</dd></div>
                <div><dt>MSRP</dt><dd>{{ formatPrice(dap.msrpUsd) }}</dd></div>
                <div>
                  <dt>Status</dt>
                  <dd>
                    <SpecChip
                      :label="getStatusBadgeMeta(dap.status).label"
                      :badge-class="getStatusBadgeMeta(dap.status).className"
                      :title="getStatusBadgeMeta(dap.status).title"
                    />
                  </dd>
                </div>
                <div><dt>Verification</dt><dd><VerificationBadge :status="dap.verificationStatus" /></dd></div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Audio Specs</h3>
              <dl class="detail-list">
                <div><dt>DAC</dt><dd>{{ formatValue(dap.dac) }}</dd></div>
                <div><dt>Amp</dt><dd>{{ formatValue(dap.amp) }}</dd></div>
                <div><dt>SE Power</dt><dd>{{ formatPower(dap.sePowerMw) }}</dd></div>
                <div><dt>BAL Power</dt><dd>{{ formatPower(dap.balPowerMw) }}</dd></div>
                <div><dt>SE Load</dt><dd>{{ formatValue(dap.sePowerLoad) }}</dd></div>
                <div><dt>BAL Load</dt><dd>{{ formatValue(dap.balPowerLoad) }}</dd></div>
                <div><dt>2.5mm</dt><dd>{{ formatBoolean(dap.has25mm) }}</dd></div>
                <div><dt>3.5mm</dt><dd>{{ formatBoolean(dap.has35mm) }}</dd></div>
                <div><dt>4.4mm</dt><dd>{{ formatBoolean(dap.has44mm) }}</dd></div>
                <div><dt>6.35mm</dt><dd>{{ formatBoolean(dap.has635mm) }}</dd></div>
                <div><dt>Balanced Type</dt><dd>{{ formatValue(dap.balancedOutputType) }}</dd></div>
                <div><dt>Line Out</dt><dd>{{ formatBoolean(dap.lineOut) }}</dd></div>
                <div><dt>Coax Out</dt><dd>{{ formatBoolean(dap.coaxOut) }}</dd></div>
                <div><dt>Optical Out</dt><dd>{{ formatBoolean(dap.opticalOut) }}</dd></div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Hardware</h3>
              <dl class="detail-list">
                <div><dt>SoC</dt><dd>{{ formatValue(dap.soc) }}</dd></div>
                <div><dt>RAM</dt><dd>{{ formatValue(dap.ramGb) }}</dd></div>
                <div><dt>Battery</dt><dd>{{ formatBattery(dap.batteryMah) }}</dd></div>
                <div><dt>Battery Life</dt><dd>{{ formatValue(dap.batteryLifeHours) }}</dd></div>
                <div><dt>OS</dt><dd>{{ formatValue(dap.os) }}</dd></div>
                <div><dt>Display</dt><dd>{{ formatValue(dap.displaySize) }}</dd></div>
                <div><dt>Weight</dt><dd>{{ formatValue(dap.weight) }}</dd></div>
                <div><dt>Dimensions</dt><dd>{{ formatValue(dap.dimensions) }}</dd></div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Storage and Colors</h3>
              <dl class="detail-list">
                <div><dt>Storage</dt><dd>{{ formatValue(dap.storageGb) }}</dd></div>
                <div><dt>microSD</dt><dd>{{ formatBoolean(dap.microSd) }}</dd></div>
                <div><dt>Expansion Max</dt><dd>{{ formatValue(dap.storageExpansionMax) }}</dd></div>
                <div><dt>Colors</dt><dd>{{ formatColors(dap.colors) }}</dd></div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Connectivity and Formats</h3>
              <dl class="detail-list">
                <div><dt>Bluetooth</dt><dd>{{ formatBoolean(dap.bluetooth) }}</dd></div>
                <div><dt>Bluetooth Version</dt><dd>{{ formatValue(dap.bluetoothVersion) }}</dd></div>
                <div><dt>Bluetooth Codecs</dt><dd>{{ formatColors(dap.bluetoothCodecs) }}</dd></div>
                <div><dt>Wi-Fi</dt><dd>{{ formatBoolean(dap.wifi) }}</dd></div>
                <div><dt>Wi-Fi Bands</dt><dd>{{ formatValue(dap.wifiBands) }}</dd></div>
                <div><dt>Cellular</dt><dd>{{ formatBoolean(dap.cellular) }}</dd></div>
                <div><dt>4G</dt><dd>{{ formatBoolean(dap.has4g) }}</dd></div>
                <div><dt>5G</dt><dd>{{ formatBoolean(dap.has5g) }}</dd></div>
                <div><dt>USB DAC</dt><dd>{{ formatBoolean(dap.usbDac) }}</dd></div>
                <div><dt>USB Port</dt><dd>{{ formatValue(dap.usbPort) }}</dd></div>
                <div><dt>PCM Max</dt><dd>{{ formatValue(dap.pcmMax) }}</dd></div>
                <div><dt>DSD Max</dt><dd>{{ formatValue(dap.dsdMax) }}</dd></div>
                <div><dt>MQA</dt><dd>{{ formatBoolean(dap.mqa) }}</dd></div>
                <div><dt>Streaming</dt><dd>{{ formatColors(dap.streamingServices) }}</dd></div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Verification and Source</h3>
              <dl class="detail-list">
                <div><dt>Source Type</dt><dd>{{ formatValue(dap.sourceType) }}</dd></div>
                <div>
                  <dt>Source URL</dt>
                  <dd>
                    <a v-if="dap.sourceUrl" class="source-link" :href="dap.sourceUrl" target="_blank" rel="noopener noreferrer">
                      <ExternalLink :size="15" aria-hidden="true" />
                      <span>Open source</span>
                    </a>
                    <span v-else>Unknown</span>
                  </dd>
                </div>
              </dl>
            </section>

            <section class="details-section">
              <h3>Notes</h3>
              <p class="notes-text">{{ formatValue(dap.notes) }}</p>
            </section>
          </div>
        </div>
      </section>
    </div>
  </Teleport>
</template>
