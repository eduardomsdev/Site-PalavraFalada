// ==========================================================
// Botão "Pular": sempre visível durante a abertura e o jogo.
// Cada fase define o que acontece ao tocar nele com setAction().
// ==========================================================

export function createSkipButton(element) {
  let action = null;

  element.addEventListener('click', () => {
    if (action) action();
  });

  return {
    /** Define o que o botão faz e o texto lido pelo leitor de tela. */
    setAction(fn, ariaLabel) {
      action = fn;
      if (ariaLabel) element.setAttribute('aria-label', ariaLabel);
      element.hidden = false;
    },
    hide() {
      action = null;
      element.hidden = true;
    },
  };
}
