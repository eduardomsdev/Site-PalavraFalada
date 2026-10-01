// ==========================================================
// Mini-jogo: montar a palavra tocando nas letras na ordem certa.
//
// Fluxo de cada palavra:
//   1. aparecem os espaços vazios em cima das páginas do livro;
//   2. as letras embaralhadas saem do livro e ficam flutuando;
//   3. tocar numa letra: ela é falada ("cê");
//        - se for a próxima da palavra, voa até o seu espaço no livro;
//        - se não for, dá uma tremidinha e um som baixinho (nada de "errado!");
//   4. palavra completa: a voz fala a palavra, confete, e segue para a próxima.
//
// Como saber em qual letra a pessoa tocou? Raycaster!
// Ele "atira um raio" da câmera passando pelo ponto tocado na tela e
// devolve os objetos 3D que o raio atravessa — o primeiro é o tocado.
// ==========================================================
import gsap from 'gsap';
import { Group, Mesh, PlaneGeometry, MeshBasicMaterial, Raycaster, Vector2, Vector3 } from 'three';
import { createLetterTile, floatTile } from '../scene/letters.js';
import { canvasTexture } from '../scene/book.js';
import { scatterPositions, bookHalfSize } from '../scene/intro.js';
import { createConfetti } from '../scene/confetti.js';
import { speak } from '../audio/speech.js';
import { playSoftNo, playPop } from '../audio/sfx.js';
import { WORDS, LETTER_NAMES, praisePhrase, FINAL_PHRASE } from './words.js';
import { TILE_COLORS } from '../config.js';

const LOOSE_SCALE = 1.55; // letras soltas: grandes, fáceis de tocar (> 48px)
const PLACED_SCALE = 1.25; // letras já no livro
const SLOT_GAP = 0.92; // distância entre os espaços da palavra
const SLOT_Y = -0.1; // altura dos espaços na página
// Acima das páginas: as que viraram ficam em leque e levantam até ~0,55
// na borda esquerda; com menos que isso, elas tampam o 1º espaço.
const SLOT_Z = 0.6;

/** Espaço vazio da palavra: quadrado tracejado desenhado num canvas. */
let slotAssets = null;
function getSlotAssets() {
  if (slotAssets) return slotAssets;
  const map = canvasTexture(128, 128, (ctx, w) => {
    ctx.strokeStyle = '#2a6fc9';
    ctx.lineWidth = 8;
    ctx.setLineDash([16, 10]);
    ctx.beginPath();
    ctx.roundRect(8, 8, w - 16, w - 16, 22);
    ctx.stroke();
  });
  slotAssets = {
    geometry: new PlaneGeometry(0.8, 0.8),
    material: new MeshBasicMaterial({ map, transparent: true, depthWrite: false }),
  };
  return slotAssets;
}

/** Embaralha (Fisher–Yates) garantindo que não fique na ordem certa. */
function shuffle(list) {
  const out = [...list];
  do {
    for (let i = out.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [out[i], out[j]] = [out[j], out[i]];
    }
  } while (out.length > 1 && out.every((item, i) => item === list[i]));
  return out;
}

export function createWordGame({ world, book, introLetters, panel, onFinish }) {
  const { camera, renderer, scene } = world;
  const raycaster = new Raycaster();
  const pointer = new Vector2();
  const tmp = new Vector3();

  const gameGroup = new Group(); // letras soltas ficam aqui
  scene.add(gameGroup);
  const confetti = createConfetti(scene);
  world.onUpdate(confetti.update);

  let round = null; // { index, item, tiles, slots, next, busy }
  let ended = true; // começa "encerrado": só roda depois de start()
  let wrongCount = 0;
  let hintTarget = null;
  let hintCall = null;
  const calls = new Set(); // "agendamentos" pendentes (para cancelar no Pular)

  /** Agenda uma função para daqui a X segundos (cancelável). */
  function later(seconds, fn) {
    const call = gsap.delayedCall(seconds, () => {
      calls.delete(call);
      if (!ended) fn();
    });
    calls.add(call);
    return call;
  }

  // ---------- Início (pode ser chamado de novo para jogar outra vez) ----------
  function start() {
    if (!ended) return; // já está rodando
    ended = false;
    // As letras da abertura encolhem e somem para dar lugar às do jogo.
    // killTweensOf para animações antigas que ainda estejam rodando nelas.
    const introScales = introLetters.tiles.map((t) => t.scale);
    gsap.killTweensOf(introScales);
    gsap.to(introScales, {
      x: 0.001, y: 0.001, z: 0.001, duration: 0.35, stagger: 0.03, ease: 'back.in(2)',
    });
    panel.showGame();
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    world.onUpdate(update);
    // Espera a câmera terminar de se ajustar ao painel do jogo (0,6s)
    later(0.7, () => setupRound(0));
  }

  // ---------- Montar uma rodada (uma palavra) ----------
  function setupRound(index) {
    const item = WORDS[index];
    panel.setWord(index, WORDS.length, item);
    // Tenta falar a palavra sozinho. Se o navegador bloquear (a pessoa ainda
    // não tocou na tela), tudo bem: o botão 🔊 fica pulsando como convite.
    speak(item.label);

    const { geometry, material } = getSlotAssets();
    const n = item.word.length;
    const slots = [...item.word].map((_, k) => {
      const slot = new Mesh(geometry, material);
      slot.position.set((k - (n - 1) / 2) * SLOT_GAP, SLOT_Y, SLOT_Z);
      slot.scale.setScalar(0.001);
      // O espaço é filho do livro: inclina e flutua junto com ele
      book.group.add(slot);
      gsap.to(slot.scale, { x: 1, y: 1, z: 1, duration: 0.4, delay: k * 0.06, ease: 'back.out(2)' });
      return slot;
    });

    const letters = shuffle([...item.word]);
    const targets = scatterPositions(n, world.getVisibleSize(), bookHalfSize(book));
    const tiles = letters.map((letter, j) => {
      const tile = createLetterTile(letter, (index + j) % TILE_COLORS.length);
      tile.position.set(0, 0, 0.3); // sai de dentro do livro
      tile.scale.setScalar(0.001);
      gameGroup.add(tile);
      const to = targets[j];
      gsap.to(tile.position, { x: to.x, y: to.y, z: 0.8, duration: 0.8, delay: j * 0.08, ease: 'power3.out' });
      gsap.to(tile.scale, {
        x: LOOSE_SCALE, y: LOOSE_SCALE, z: LOOSE_SCALE, duration: 0.6, delay: j * 0.08, ease: 'back.out(2)',
      });
      return tile;
    });

    round = { index, item, tiles, slots, next: 0, busy: false };
    wrongCount = 0;
    // Na 1ª palavra a mãozinha aparece logo; depois, só se a pessoa travar
    scheduleHint(index === 0 ? 2.2 : 7);
  }

  // ---------- Toque na tela ----------
  function onPointerDown(event) {
    if (!round || round.busy || ended) return;

    // Converte o ponto tocado (pixels) para "coordenadas normalizadas":
    // x e y vão de -1 a +1, com (0,0) no centro do canvas.
    const rect = renderer.domElement.getBoundingClientRect();
    pointer.set(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    raycaster.setFromCamera(pointer, camera);

    const loose = round.tiles.filter((t) => !t.userData.placed);
    // true = procura também dentro dos filhos (o Mesh fica dentro do Group)
    const hits = raycaster.intersectObjects(loose, true);
    if (!hits.length) return;
    const tile = loose.find((t) => t.userData.mesh === hits[0].object);
    if (tile) onTileTap(tile);
  }

  function onTileTap(tile) {
    hideHint();
    const { letter } = tile.userData;
    speak(LETTER_NAMES[letter] ?? letter);

    if (letter === round.item.word[round.next]) placeTile(tile);
    else wrongTile(tile);
  }

  // ---------- Letra certa: voa até o espaço ----------
  function placeTile(tile) {
    const slot = round.slots[round.next];
    round.next += 1;
    tile.userData.placed = true;

    // attach() troca o "pai" do objeto mantendo onde ele está no mundo.
    // Agora a letra é filha do livro: depois de pousar, inclina e flutua com ele.
    book.group.attach(tile);

    const { mesh } = tile.userData;
    gsap.to(mesh.position, { x: 0, y: 0, z: 0, duration: 0.3 });
    gsap.to(mesh.rotation, { x: 0, y: 0, z: 0, duration: 0.3 });

    const tl = gsap.timeline();
    tl.to(tile.position, { x: slot.position.x, y: slot.position.y, duration: 0.6, ease: 'power2.inOut' }, 0);
    // z sobe e desce: a letra faz um "arco" no ar até pousar
    tl.to(tile.position, { z: SLOT_Z + 0.9, duration: 0.3, ease: 'power1.out' }, 0);
    tl.to(tile.position, { z: SLOT_Z + 0.1, duration: 0.3, ease: 'power1.in' }, 0.3);
    tl.to(tile.rotation, { x: 0, y: 0, z: 0, duration: 0.6 }, 0);
    tl.to(tile.scale, { x: PLACED_SCALE, y: PLACED_SCALE, z: PLACED_SCALE, duration: 0.6 }, 0);
    tl.call(playPop, null, 0.6);
    // O espaço tracejado some quando a letra pousa nele
    tl.to(slot.scale, { x: 0.001, y: 0.001, z: 0.001, duration: 0.2 }, 0.55);

    if (round.next === round.item.word.length) {
      round.busy = true;
      later(0.9, completeRound);
    } else {
      scheduleHint(7);
    }
  }

  // ---------- Letra errada: tremidinha gentil ----------
  function wrongTile(tile) {
    wrongCount += 1;
    playSoftNo();
    const { mesh } = tile.userData;
    gsap.fromTo(mesh.position, { x: -0.07 }, {
      x: 0.07, duration: 0.06, repeat: 5, yoyo: true, ease: 'sine.inOut',
      onComplete: () => (mesh.position.x = 0),
    });
    // Errou 2 vezes? A mãozinha aparece para ajudar.
    if (wrongCount >= 2) scheduleHint(1.2);
  }

  // ---------- Palavra completa ----------
  function completeRound() {
    const { item, tiles, index } = round;
    speak(praisePhrase(item));

    // As letras dão um pulinho, uma depois da outra ("ola")
    const inOrder = [...tiles].sort((a, b) => a.position.x - b.position.x);
    inOrder.forEach((t, k) => {
      gsap.to(t.position, { z: '+=0.35', duration: 0.22, yoyo: true, repeat: 1, delay: k * 0.09 });
    });
    // localToWorld: converte um ponto do "espaço do livro" para o mundo
    confetti.burst(book.group.localToWorld(tmp.set(0, 0, 0.6)), 90);
    panel.markDone(index);

    later(2.4, () => {
      clearRound();
      if (index + 1 < WORDS.length) later(0.45, () => setupRound(index + 1));
      else later(0.3, finishAll);
    });
  }

  function clearRound(fast = false) {
    if (!round) return;
    const { tiles, slots } = round;
    round = null;
    for (const obj of [...tiles, ...slots]) {
      gsap.killTweensOf([obj.position, obj.scale, obj.rotation]);
      gsap.to(obj.scale, {
        x: 0.001, y: 0.001, z: 0.001, duration: fast ? 0.2 : 0.35, ease: 'back.in(2)',
        onComplete: () => obj.removeFromParent(),
      });
    }
  }

  // ---------- Fim do jogo ----------
  function finishAll() {
    speak(FINAL_PHRASE);
    confetti.burst(book.group.localToWorld(tmp.set(0, 0, 0.6)), 120);
    later(2.6, () => end());
  }

  /** Encerra o jogo (no fim normal ou pelo botão Pular). */
  function end({ fast = false } = {}) {
    if (ended) return;
    ended = true;
    for (const call of calls) call.kill();
    calls.clear();
    hideHint();
    clearRound(fast);
    renderer.domElement.removeEventListener('pointerdown', onPointerDown);
    world.offUpdate(update);

    // As letras da abertura voltam a flutuar ao redor do livro
    introLetters.tiles.forEach((t, i) => {
      const s = t.userData.size ?? 1;
      gsap.to(t.scale, { x: s, y: s, z: s, duration: 0.5, delay: 0.2 + i * 0.04, ease: 'back.out(2)' });
    });
    panel.showHero();
    onFinish?.();
  }

  // ---------- Mãozinha 👆 de ajuda ----------
  function scheduleHint(seconds) {
    hintCall?.kill();
    hintCall = later(seconds, () => {
      if (!round || round.busy) return;
      hintTarget = round.tiles.find(
        (t) => !t.userData.placed && t.userData.letter === round.item.word[round.next],
      );
      panel.showHand(Boolean(hintTarget));
    });
  }

  function hideHint() {
    hintCall?.kill();
    hintTarget = null;
    panel.showHand(false);
  }

  // A cada quadro: letras soltas flutuam e a mãozinha segue a letra certa
  function update(delta, elapsed) {
    if (round) for (const t of round.tiles) floatTile(t, elapsed);
    if (hintTarget) {
      // project(): converte a posição 3D em coordenadas da tela (-1 a +1)
      hintTarget.getWorldPosition(tmp).project(camera);
      const canvas = renderer.domElement;
      panel.moveHand(((tmp.x + 1) / 2) * canvas.clientWidth, ((1 - tmp.y) / 2) * canvas.clientHeight);
    }
  }

  return { start, skip: () => end({ fast: true }) };
}
