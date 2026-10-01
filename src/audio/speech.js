// ==========================================================
// Fala em voz alta.
//
// 1º tenta tocar o áudio pronto (voz neural, gerado por `npm run audios`)
//    em public/audio/<id>.mp3. O arquivo só é baixado quando a pessoa toca
//    no 🔊, então não pesa no carregamento da página.
// 2º se o arquivo não existir ou falhar (ex.: internet caiu), usa a voz do
//    próprio aparelho (Web Speech API / speechSynthesis) em pt-BR.
// 3º se nem isso existir, simplesmente não fala — a página não quebra.
//
// Navegadores só deixam tocar som DEPOIS de um toque/clique da pessoa.
// Como só chamamos speak() a partir de botões, isso já está garantido.
// ==========================================================
import { normalizeSpeech, speechId } from './speechText.js';

const synth = 'speechSynthesis' in window ? window.speechSynthesis : null;
const player = new Audio(); // um único "tocador" reaproveitado
let voice = null;
let finishCurrent = null; // encerra a fala anterior quando outra começa
let resolvePlaying = null; // "termina" o áudio que estava tocando

// ---------- Voz do aparelho (plano B) ----------
function pickVoice() {
  if (!synth) return;
  const voices = synth.getVoices();
  voice =
    voices.find((v) => v.lang === 'pt-BR' && v.localService) ||
    voices.find((v) => v.lang === 'pt-BR') ||
    voices.find((v) => v.lang?.replace('_', '-').toLowerCase().startsWith('pt')) ||
    null;
}
if (synth) {
  pickVoice();
  // No Chrome/Android a lista de vozes chega depois: escutamos o aviso.
  synth.addEventListener?.('voiceschanged', pickVoice);
}

function speakWithDevice(text) {
  if (!synth) return Promise.resolve();
  return new Promise((resolve) => {
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'pt-BR';
    if (voice) u.voice = voice;
    u.rate = 0.9;
    u.onend = resolve;
    u.onerror = resolve;
    synth.speak(u);
  });
}

// ---------- Áudio pronto (plano A) ----------
function playFile(url) {
  return new Promise((resolve, reject) => {
    resolvePlaying = resolve;
    player.onended = () => resolve();
    player.onerror = () => reject(new Error('áudio indisponível'));
    player.src = url;
    // play() devolve uma Promise que falha se o navegador bloquear o som
    player.play().catch(reject);
  });
}

/**
 * Fala o texto. Interrompe qualquer fala anterior.
 * Devolve uma Promise que termina quando a fala acaba.
 */
export async function speak(rawText) {
  const text = normalizeSpeech(rawText ?? '');
  if (!text) return;
  stopSpeaking();

  let cancelled = false;
  finishCurrent = () => {
    cancelled = true;
    resolvePlaying?.(); // libera quem estava esperando a fala anterior acabar
  };

  // BASE_URL: caminho base do site (importante se publicar numa subpasta)
  const url = `${import.meta.env.BASE_URL}audio/${speechId(text)}.mp3`;
  try {
    await playFile(url);
  } catch {
    if (!cancelled) await speakWithDevice(text);
  }
}

export function stopSpeaking() {
  finishCurrent?.();
  finishCurrent = null;
  player.pause();
  player.onended = player.onerror = null;
  synth?.cancel();
}
