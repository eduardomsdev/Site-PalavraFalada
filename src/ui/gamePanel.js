// ==========================================================
// Parte HTML do jogo (embaixo do palco): figura da palavra, botão 🔊,
// bolinhas de progresso e a mãozinha 👆. Também alterna o palco entre
// os modos "intro" (abertura), "game" (jogo) e "hero" (texto do site).
// ==========================================================
import gsap from 'gsap';

export function createGamePanel(stage, { onModeChange } = {}) {
  const picture = stage.querySelector('.game-picture');
  const emoji = stage.querySelector('.game-picture__emoji');
  const listen = stage.querySelector('.game-listen');
  const dots = [...stage.querySelectorAll('.game-progress li')];
  const progress = stage.querySelector('.game-progress');
  const hand = stage.querySelector('.hand-hint');
  const heroItems = [...stage.querySelectorAll('.hero-copy > *')];

  // Depois que a pessoa toca no 🔊, ele para de pulsar
  listen.addEventListener('click', () => listen.classList.remove('is-inviting'));

  return {
    setMode(mode) {
      stage.dataset.mode = mode;
      onModeChange?.(mode);
    },

    showGame() {
      this.setMode('game');
      // Jogando de novo? As bolinhas de progresso voltam a ficar vazias
      dots.forEach((d) => d.classList.remove('is-done', 'is-current'));
    },

    /** Mostra o texto do site com uma entrada suave. */
    showHero() {
      this.setMode('hero');
      // fromTo (e não from): sempre termina 100% visível, mesmo se chamado no
      // meio de outra animação
      gsap.fromTo(heroItems, { opacity: 0, y: 24 }, {
        opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', stagger: 0.12, overwrite: true,
      });
    },

    setWord(index, total, item) {
      emoji.textContent = item.emoji;
      picture.setAttribute('aria-label', item.label);
      // O botão 🔊 global (speakButtons.js) fala o texto de data-speak
      listen.dataset.speak = item.label;
      listen.setAttribute('aria-label', `Ouvir a palavra ${item.label}`);
      listen.classList.add('is-inviting');
      progress.setAttribute('aria-label', `Palavra ${index + 1} de ${total}`);
      dots.forEach((d, i) => d.classList.toggle('is-current', i === index));
      // A figura entra com um "pop"
      gsap.fromTo(picture, { scale: 0.6 }, { scale: 1, duration: 0.45, ease: 'back.out(2)' });
    },

    markDone(index) {
      dots[index]?.classList.add('is-done');
    },

    showHand(visible) {
      hand.hidden = !visible;
    },

    /** Coloca a ponta do dedo da mãozinha no ponto (x, y) do palco, em pixels. */
    moveHand(x, y) {
      hand.style.transform = `translate(${x}px, ${y}px)`;
    },
  };
}
