// ==========================================================
// Funções de texto usadas em DOIS lugares:
//   - no site (para saber qual arquivo de áudio tocar);
//   - no script scripts/gerar-audios.mjs (para gerar esses arquivos).
// Como os dois usam as mesmas funções, o nome do arquivo sempre bate.
// ==========================================================

// Símbolos que a voz leria de um jeito estranho
const REPLACEMENTS = [
  [/✓/g, 'certinho'],
];

/** Tira espaços/quebras de linha sobrando e troca símbolos por palavras. */
export function normalizeSpeech(text) {
  let t = text.replace(/\s+/g, ' ').trim();
  for (const [pattern, word] of REPLACEMENTS) t = t.replace(pattern, word);
  return t;
}

/** Junta pedaços (título, texto...) com ponto final, para a voz fazer pausa. */
export function joinSpeech(pieces) {
  return pieces
    .map(normalizeSpeech)
    .filter(Boolean)
    .map((p) => (/[.!?…:]$/.test(p) ? p : `${p}.`))
    .join(' ');
}

/**
 * Gera um "apelido" curto para o texto (hash FNV-1a de 32 bits).
 * O mesmo texto sempre gera o mesmo apelido -> nome do arquivo: audio/<apelido>.mp3
 * Se o texto mudar, o apelido muda e o script gera um áudio novo.
 */
export function speechId(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}
