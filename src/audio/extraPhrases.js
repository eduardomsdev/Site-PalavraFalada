// ==========================================================
// Frases faladas que NÃO estão escritas no index.html
// (ex.: letras e palavras do mini-jogo). O script gerar-audios.mjs
// também cria os áudios destas frases.
// ==========================================================
import { gamePhrases } from '../game/words.js';

export const EXTRA_PHRASES = [...gamePhrases()];
