// ==========================================================
// Ponto de entrada: monta a cena, o livro, as letras e toca a abertura.
// ==========================================================
import './styles/main.css';
import { setupScene } from './scene/setupScene.js';
import { createBook } from './scene/book.js';
import { createFloatingLetters } from './scene/letters.js';
import { playIntro } from './scene/intro.js';
import gsap from 'gsap';
import { createSkipButton } from './ui/skipButton.js';
import { setupSpeakButtons } from './ui/speakButtons.js';
import { setupDownloadLinks } from './ui/download.js';
import { createGamePanel } from './ui/gamePanel.js';
import { createWordGame } from './game/wordGame.js';

// Letras que saem do livro na abertura (vogais e consoantes comuns)
const INTRO_LETTERS = ['A', 'B', 'C', 'E', 'O', 'L', 'P', 'M', 'S', 'U'];

/**
 * As texturas são desenhadas em canvas com a fonte Nunito. Esperamos a fonte
 * carregar, mas no máximo 1 segundo: com internet lenta, seguimos com a
 * fonte do sistema para não deixar a pessoa esperando.
 */
async function waitForFont() {
  try {
    await Promise.race([
      document.fonts.load('900 80px Nunito'),
      new Promise((resolve) => setTimeout(resolve, 1000)),
    ]);
  } catch {
    // sem suporte a document.fonts: segue com a fonte do sistema
  }
}

async function start() {
  // Partes da página que não dependem do 3D funcionam desde já
  setupSpeakButtons();
  setupDownloadLinks();

  await waitForFont();

  const stage = document.getElementById('stage');
  const topbar = stage.querySelector('.topbar');
  const stageBottom = stage.querySelector('.stage-bottom');
  const heroCopy = stage.querySelector('.hero-copy');
  const gamePanel = stage.querySelector('.game-panel');

  // Quanto o HTML de baixo ocupa: o texto do site OU o painel do jogo
  // (o do jogo é mais baixo, então a cena 3D ganha espaço durante o jogo).
  function measureBottom() {
    const active = stage.dataset.mode === 'game' ? gamePanel : heroCopy;
    return active.offsetHeight + parseFloat(getComputedStyle(stageBottom).paddingBottom) + 8;
  }
  const insets = { bottom: 0 };

  const panel = createGamePanel(stage, {
    // Trocou de modo? Anima o espaço reservado embaixo e a câmera acompanha
    // suavemente (refit a cada quadro da animação).
    onModeChange: () => {
      gsap.to(insets, {
        bottom: measureBottom(), duration: 0.6, ease: 'power2.inOut', overwrite: true,
        onUpdate: () => world.refit(),
      });
    },
  });
  stage.dataset.mode = 'intro'; // esconde o texto do site durante a abertura
  insets.bottom = measureBottom();

  const world = setupScene(document.getElementById('canvas-holder'), {
    // espaço ocupado pelo logo (em cima) e pelo HTML de baixo
    getInsets: () => ({ top: topbar.offsetHeight, bottom: insets.bottom }),
  });
  // Enquadra o livro ABERTO (5,2 x 3,6, + ondas) com folga em cima e embaixo
  // para as letras flutuarem sem cobrir o livro.
  world.setFrame(6.4, 7.6);

  // Se o HTML de baixo mudar de tamanho (girar o celular, fonte carregar...)
  new ResizeObserver(() => {
    if (gsap.isTweening(insets)) return;
    insets.bottom = measureBottom();
    world.refit();
  }).observe(stageBottom);

  const book = createBook();
  world.scene.add(book.group);
  world.onUpdate(book.update);

  const letters = createFloatingLetters(INTRO_LETTERS);
  world.scene.add(letters.group);
  world.onUpdate(letters.update);

  world.start();

  const skip = createSkipButton(document.getElementById('skip-btn'));

  // Mini-jogo (opcional): começa pelo botão "Jogar".
  // Ao terminar (ou pular), volta para o texto do site.
  const game = createWordGame({
    world,
    book,
    introLetters: letters,
    panel,
    onFinish: () => {
      skip.hide();
      document.getElementById('play-btn').focus({ preventScroll: true });
    },
  });

  document.getElementById('play-btn').addEventListener('click', () => {
    game.start();
    skip.setAction(() => game.skip(), 'Pular jogo');
  });

  // Abertura. Ao terminar (ou pular), mostra o texto do site.
  const intro = playIntro({
    book,
    letters,
    visible: world.getVisibleSize(),
    onComplete: () => {
      skip.hide();
      panel.showHero();
    },
  });

  // "Pular" na abertura: progress(1) leva a timeline direto para o fim
  // (e isso chama o onComplete acima)
  skip.setAction(() => intro.progress(1), 'Pular abertura');

  // Quem pediu menos movimento no sistema vê direto o resultado final
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    intro.progress(1);
  }
}

start();
