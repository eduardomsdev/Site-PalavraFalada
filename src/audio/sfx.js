// ==========================================================
// Efeitos sonoros curtinhos, gerados na hora com a Web Audio API
// (nenhum arquivo para baixar).
//
// Web Audio em 20 segundos:
//   OscillatorNode -> gera uma onda (um "bip" numa frequência, em Hz)
//   GainNode       -> controla o volume (aqui: sobe rápido e some suave)
//   oscilador -> volume -> alto-falante (ctx.destination)
// ==========================================================

let ctx = null;

function getContext() {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;
  ctx ??= new AudioCtx();
  // O navegador cria o contexto "suspenso" até a pessoa tocar na tela
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freq, start, duration, volume) {
  const c = getContext();
  if (!c) return;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = 'sine'; // onda senoidal: o som mais suave que existe
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, t0);
  gain.gain.exponentialRampToValueAtTime(volume, t0 + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, t0 + duration);
  osc.connect(gain).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + duration + 0.05);
}

/** Letra errada: dois tons descendo, baixinho. Gentil, nada de "buzina". */
export function playSoftNo() {
  try {
    tone(392, 0, 0.18, 0.06);
    tone(330, 0.13, 0.25, 0.05);
  } catch {
    // sem Web Audio: segue sem som
  }
}

/** Letra encaixou no lugar: "plim" subindo. */
export function playPop() {
  try {
    tone(660, 0, 0.12, 0.05);
    tone(990, 0.08, 0.2, 0.04);
  } catch {
    // sem Web Audio: segue sem som
  }
}
