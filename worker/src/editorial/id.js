import { createHash } from 'node:crypto';
import { canonicalUrl } from './dedupe.js';

export function candidateId(candidate) {
  const identity = canonicalUrl(candidate?.url || '').toLocaleLowerCase('es');
  if (!identity) throw new Error('El candidato necesita una URL válida');
  return createHash('sha256').update(identity).digest('hex').slice(0, 12);
}
