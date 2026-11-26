// Registry provider AI. Semua provider yang dapat dipilih admin harus terdaftar
// di sini. Identifier tak dikenal ditolak sebelum endpoint, key, atau jaringan
// disentuh.
import { geminiAdapter } from './aiProviders/gemini.js';
import {
  customOpenAiAdapter,
  deepseekAdapter,
  groqAdapter,
  openAiAdapter,
  openRouterAdapter,
  qwenAdapter,
} from './aiProviders/openaiCompatible.js';
import { anthropicAdapter } from './aiProviders/anthropic.js';

const ADAPTERS = Object.freeze([
  openAiAdapter,
  geminiAdapter,
  anthropicAdapter,
  deepseekAdapter,
  openRouterAdapter,
  groqAdapter,
  qwenAdapter,
  customOpenAiAdapter,
]);
const BY_ID = new Map(ADAPTERS.map((adapter) => [adapter.id, adapter]));

const LEGACY_ALIASES = Object.freeze({
  'google-gemini': 'gemini',
  'openai-compatible': 'custom-openai',
});

export function normalizeProvider(value) {
  const raw = String(value ?? '').trim().toLowerCase();
  return LEGACY_ALIASES[raw] || raw;
}

export function getAiProvider(provider) {
  return BY_ID.get(normalizeProvider(provider)) || null;
}

export function requireAiProvider(provider) {
  const adapter = getAiProvider(provider);
  if (!adapter) throw new Error('Provider tidak didukung.');
  return adapter;
}

// Metadata aman untuk UI admin. Tidak ada endpoint/key/model tersimpan.
export function listAiProviders() {
  return ADAPTERS.map(({ id, label, defaultEndpoint, requiresEndpoint, supportsModelList }) => ({
    id,
    label,
    defaultEndpoint,
    requiresEndpoint: Boolean(requiresEndpoint),
    supportsModelList: Boolean(supportsModelList),
  }));
}

export const AI_PROVIDER_IDS = Object.freeze(ADAPTERS.map((adapter) => adapter.id));
