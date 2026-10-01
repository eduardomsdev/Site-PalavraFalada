// ==========================================================
// Gera os áudios (MP3) de tudo que o site fala, com voz neural.
//
//   npm run audios
//
// Como funciona:
//  1. Lê o index.html e encontra cada botão 🔊 e o texto que ele fala
//     (o mesmo cálculo que o site faz, usando src/audio/speechText.js).
//  2. Junta as frases extras de src/audio/extraPhrases.js (mini-jogo).
//  3. Para cada frase sem áudio, pede a voz ao serviço gratuito do
//     "Ler em voz alta" do Microsoft Edge e salva em public/audio/<id>.mp3.
//  4. Apaga áudios antigos que não são mais usados.
//
// Rode de novo sempre que mudar algum texto do site.
// Precisa de internet só na hora de gerar; o site usa os arquivos prontos.
// ==========================================================
import { readFile, readdir, mkdir, rename, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'node-html-parser';
import { MsEdgeTTS, OUTPUT_FORMAT } from 'msedge-tts';
import { normalizeSpeech, joinSpeech, speechId } from '../src/audio/speechText.js';
import { EXTRA_PHRASES } from '../src/audio/extraPhrases.js';

const VOICE = 'pt-BR-AntonioNeural';
const RATE = '-10%'; // um pouco mais devagar: mais fácil para quem está aprendendo

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = join(root, 'public', 'audio');

// ---------- 1. Textos dos botões 🔊 do index.html ----------
const html = parse(await readFile(join(root, 'index.html'), 'utf8'));
const phrases = new Set();

for (const button of html.querySelectorAll('.btn-speak')) {
  const fixed = button.getAttribute('data-speak');
  if (fixed) {
    phrases.add(normalizeSpeech(fixed));
    continue;
  }
  const scope = button.closest('[data-speak-scope]');
  if (!scope) continue;
  const pieces = scope.querySelectorAll('[data-speak-text]').map((el) => el.text);
  phrases.add(joinSpeech(pieces));
}

// ---------- 2. Frases extras ----------
for (const phrase of EXTRA_PHRASES) phrases.add(normalizeSpeech(phrase));

// ---------- 3. Gera o que falta ----------
await mkdir(outDir, { recursive: true });
const wanted = new Map([...phrases].map((text) => [`${speechId(text)}.mp3`, text]));
const missing = [...wanted].filter(([file]) => !existsSync(join(outDir, file)));

console.log(`${wanted.size} frases no site, ${missing.length} áudio(s) para gerar.`);

if (missing.length) {
  const tts = new MsEdgeTTS();
  await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
  for (const [file, text] of missing) {
    // A biblioteca salva como "audio.mp3" numa pasta; depois renomeamos.
    const tmpDir = join(outDir, '.tmp');
    await mkdir(tmpDir, { recursive: true });
    const { audioFilePath } = await tts.toFile(tmpDir, text, { rate: RATE });
    await rename(audioFilePath, join(outDir, file));
    console.log(`  ✔ ${file}  "${text.slice(0, 60)}${text.length > 60 ? '…' : ''}"`);
  }
  tts.close();
  await rm(join(outDir, '.tmp'), { recursive: true, force: true });
}

// ---------- 4. Limpa áudios que não são mais usados ----------
for (const file of await readdir(outDir)) {
  if (file.endsWith('.mp3') && !wanted.has(file)) {
    await rm(join(outDir, file));
    console.log(`  ✖ removido ${file} (texto não existe mais)`);
  }
}

console.log('Pronto!');
