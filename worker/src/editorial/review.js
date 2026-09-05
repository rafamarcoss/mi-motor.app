import { candidateId } from './id.js';
import { createSlug } from './slug.js';

export function selectCandidateForReview(candidates, reviewedIds = new Set(), minimumScore = 45) {
  return [...candidates]
    .filter((candidate) => candidate.score?.relevant && candidate.score.total >= minimumScore)
    .sort((a, b) => b.score.total - a.score.total)
    .find((candidate) => !reviewedIds.has(candidateId(candidate))) || null;
}

export function buildReviewRecord(candidate, draft) {
  const id = candidateId(candidate);
  const slug = createSlug(candidate.slug || candidate.titleOriginal);
  return {
    id,
    status: 'needs-human-review',
    source: {
      name: candidate.source,
      url: candidate.url,
      publishedAt: candidate.publishedAt
    },
    proposal: {
      title: candidate.titleOriginal,
      url: `/actualidad/${slug}/`,
      description: candidate.summary || ''
    },
    score: candidate.score,
    relevanceReason: `Automóvil ${candidate.score.car}/30, IA ${candidate.score.ai}/25, utilidad ${candidate.score.usefulness}/25, autoridad ${candidate.score.authority}/10 y actualidad ${candidate.score.recency}/10.`,
    secondarySources: [],
    draft
  };
}
