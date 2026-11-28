'use strict';

/**
 * Availability classification for a single X status observation.
 *
 * Pure module: no DOM, no network, no storage, no clock, no randomness.
 * Contract: core/README.md ("core/availability.js - issue #92").
 */

const AVAILABLE = 'available';
const UNAVAILABLE = 'unavailable';
const UNKNOWN = 'unknown';

const DECISION_FIELDS = ['media', 'tombstone', 'text', 'httpStatus'];

// Visible wording is a hint only. It can never make a post unavailable.
const DELETION_WORDING = [
  /\bdeleted\b/i,
  /\bremoved\b/i,
  /\bno longer (?:exists|available)\b/i,
  /\bdoes(?:n't| not) exist\b/i,
  /\bunavailable\b/i,
  /\bnot found\b/i,
];

function isRecord(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasDecisionField(observation) {
  return DECISION_FIELDS.some((field) =>
    Object.prototype.hasOwnProperty.call(observation, field)
  );
}

function hasDeletionWording(text) {
  return DELETION_WORDING.some((pattern) => pattern.test(text));
}

function decide(state, reason, observation) {
  const echoed = isRecord(observation) ? { ...observation } : { value: observation };
  return { state, reason, evidence: { observation: echoed, rule: reason } };
}

/**
 * classify(observation) -> { state, reason, evidence }
 *
 * observation:
 *   media       boolean  real video/photo element rendered on the post
 *   tombstone   boolean  X's own unavailable panel is present
 *   text        string   visible post text, if any
 *   httpStatus  number | null  lookup result, or null when none was made
 *   provider    'dom' | 'oembed' | 'syndication' | 'manual'
 *   statusId    string | null
 *
 * Order matters: media wins, a structural tombstone is the only thing that
 * proves unavailability, and every ambiguous case stays unknown.
 */
function classify(observation) {
  if (!isRecord(observation)) {
    return decide(UNKNOWN, 'invalid-observation', observation);
  }

  if (!hasDecisionField(observation)) {
    return decide(UNKNOWN, 'missing-fields', observation);
  }

  // 1. A rendered media element proves the post is still available, even when
  //    stale or misleading text claims it was deleted.
  if (observation.media === true) {
    return decide(AVAILABLE, 'media-present', observation);
  }

  // 2. X's own unavailable panel is structural evidence, not wording.
  if (observation.tombstone === true) {
    return decide(UNAVAILABLE, 'structural-tombstone', observation);
  }

  // 3. Text alone is never proof. Matching words stay unknown.
  if (typeof observation.text === 'string' && hasDeletionWording(observation.text)) {
    return decide(UNKNOWN, 'text-only-wording', observation);
  }

  const { httpStatus } = observation;

  // 4. A public 404 is not proof for account-visible content.
  if (httpStatus === 404) {
    return decide(UNKNOWN, 'public-lookup-404', observation);
  }

  // 5. Timeout, network error or missing response.
  if (httpStatus === null || httpStatus === 0) {
    return decide(UNKNOWN, 'no-response', observation);
  }

  if (typeof httpStatus === 'number') {
    if (httpStatus === 429) {
      return decide(UNKNOWN, 'rate-limited', observation);
    }
    if (httpStatus === 401 || httpStatus === 403) {
      return decide(UNKNOWN, 'public-lookup-restricted', observation);
    }
    if (httpStatus >= 500) {
      return decide(UNKNOWN, 'lookup-error', observation);
    }
  } else if (httpStatus !== undefined) {
    return decide(UNKNOWN, 'invalid-http-status', observation);
  }

  // 6. Anything not covered is unknown. Unknown is not dead.
  return decide(UNKNOWN, 'insufficient-evidence', observation);
}

module.exports = { classify };
