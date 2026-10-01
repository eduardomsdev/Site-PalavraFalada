// ==========================================================
// Palavras do mini-jogo. Para trocar, edite a lista e rode `npm run audios`.
//   word:  a palavra em MAIÚSCULAS (são as letras que vão flutuar)
//   emoji: a "imagem" do objeto (emoji não pesa nada para baixar)
//   label: como a voz fala a palavra
// ==========================================================

export const WORDS = [
  { word: 'CASA', emoji: '🏠', label: 'Casa' },
  { word: 'GATO', emoji: '🐱', label: 'Gato' },
  { word: 'LIVRO', emoji: '📚', label: 'Livro' },
];

// Nome de cada letra como se fala ("cê", e não só o som "c").
// Escrevemos o nome por extenso porque a voz lê uma letra solta de jeitos estranhos.
export const LETTER_NAMES = {
  A: 'á', B: 'bê', C: 'cê', D: 'dê', E: 'é', F: 'éfe', G: 'gê', H: 'agá', I: 'i',
  J: 'jota', K: 'cá', L: 'éle', M: 'ême', N: 'êne', O: 'ó', P: 'pê', Q: 'quê',
  R: 'érre', S: 'ésse', T: 'tê', U: 'u', V: 'vê', W: 'dáblio', X: 'xis', Y: 'ípsilon', Z: 'zê',
};

export const praisePhrase = (item) => `${item.label}! Muito bem!`;
export const FINAL_PHRASE = 'Parabéns! Você montou as três palavras!';

/** Tudo o que o jogo fala — usado pelo script que gera os áudios. */
export function gamePhrases() {
  const letters = new Set(WORDS.flatMap((w) => [...w.word]));
  return [
    ...[...letters].map((l) => LETTER_NAMES[l]),
    ...WORDS.map((w) => w.label),
    ...WORDS.map(praisePhrase),
    FINAL_PHRASE,
  ];
}
