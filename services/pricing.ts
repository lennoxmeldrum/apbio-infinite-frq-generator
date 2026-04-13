// Per-FRQ cost tracking for the Gemini API calls that go into one
// generation. Split out from geminiService.ts so the price table can
// be edited without touching prompt logic, and so the same file can
// be copied verbatim into every generator in the fleet (psych, chem,
// pcm, apbio, …).
//
// Schema at a glance
// ------------------
// For each Gemini API call the generator makes while producing an
// FRQ, we log a `UsageRecord` with the model name, token counts, and
// (for image models) the number of images returned. At the end of
// generation we compute a per-record `costUsd` from the price table
// below and a `totalCostUsd` as the sum. Both go on the Firestore
// doc so historical cost is preserved even if prices change later.
//
// ⚠️  PRICES NEED VERIFICATION BEFORE YOU TRUST THE TOTALS.
//    Gemini pricing changes periodically; update the PRICE_TABLE
//    below from https://ai.google.dev/pricing and bump
//    PRICING_VERSION when you do. The defaults here are the last
//    verified values as of the date in PRICING_VERSION — if they
//    look wrong, the access site is showing nonsense cost columns.

export const PRICING_VERSION = '2026-04';

interface ModelPricing {
  // Cost per 1,000,000 input tokens, in USD. Billed against the
  // `promptTokenCount` field of the Gemini response's usageMetadata.
  inputPerMillionUsd: number;
  // Cost per 1,000,000 output tokens, in USD. Billed against
  // `candidatesTokenCount`.
  outputPerMillionUsd: number;
  // For image-generation models only: cost per returned image.
  // Token-based pricing is ignored on these models.
  perImageUsd?: number;
}

// Add an entry here every time the generator starts using a new
// model. A missing entry falls back to zero cost and logs a warning
// — that's intentional; silently charging $0 for an unknown model
// would make totals look artificially low without the user noticing.
const PRICE_TABLE: Record<string, ModelPricing> = {
  // Gemini 3 Pro (preview and GA share pricing)
  'gemini-3-pro-preview': {
    inputPerMillionUsd: 2.0,
    outputPerMillionUsd: 12.0,
  },
  'gemini-3-pro': {
    inputPerMillionUsd: 2.0,
    outputPerMillionUsd: 12.0,
  },
  // Gemini 2.5 Pro (kept for subjects that haven't upgraded yet)
  'gemini-2.5-pro': {
    inputPerMillionUsd: 1.25,
    outputPerMillionUsd: 10.0,
  },
  // Gemini 3 Pro image preview
  'gemini-3-pro-image-preview': {
    inputPerMillionUsd: 0,
    outputPerMillionUsd: 0,
    perImageUsd: 0.04,
  },
  // Gemini 2.5 Flash image (kept for subjects still on 2.5)
  'gemini-2.5-flash-image': {
    inputPerMillionUsd: 0,
    outputPerMillionUsd: 0,
    perImageUsd: 0.039,
  },
};

export interface UsageRecord {
  model: string;
  inputTokens: number;
  outputTokens: number;
  // Present on image models; omit (or leave 0) on text models.
  imagesGenerated?: number;
  // Computed at record time from PRICE_TABLE, so the historical cost
  // is preserved if prices change later.
  costUsd: number;
}

// Create a UsageRecord from a raw usageMetadata block plus (for
// image models) the count of images returned. Safe to call with
// undefined fields — missing data zeroes out silently.
export const buildUsageRecord = (
  model: string,
  usageMetadata: { promptTokenCount?: number; candidatesTokenCount?: number } | undefined,
  imagesGenerated = 0
): UsageRecord => {
  const inputTokens = usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;

  const pricing = PRICE_TABLE[model];
  if (!pricing) {
    console.warn(`No price entry for model "${model}" — logging $0 cost. Add it to services/pricing.ts.`);
    const record: UsageRecord = { model, inputTokens, outputTokens, costUsd: 0 };
    if (imagesGenerated > 0) record.imagesGenerated = imagesGenerated;
    return record;
  }

  const textCost =
    (inputTokens / 1_000_000) * pricing.inputPerMillionUsd +
    (outputTokens / 1_000_000) * pricing.outputPerMillionUsd;
  const imageCost = (pricing.perImageUsd ?? 0) * imagesGenerated;
  const costUsd = round6(textCost + imageCost);

  const record: UsageRecord = { model, inputTokens, outputTokens, costUsd };
  if (imagesGenerated > 0) record.imagesGenerated = imagesGenerated;
  return record;
};

// Sum costs across a batch of usage records, keeping six decimal
// places so sub-cent charges (small image-only FRQs in particular)
// don't get rounded away at the source.
export const sumCost = (records: UsageRecord[]): number =>
  round6(records.reduce((acc, r) => acc + (r.costUsd || 0), 0));

const round6 = (n: number): number => Math.round(n * 1_000_000) / 1_000_000;
