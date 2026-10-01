// ==========================================================
// Botões 🔊 da página. Um único "ouvinte" de clique cuida de todos:
//   - data-speak="texto"      -> fala esse texto
//   - sem data-speak          -> fala os trechos [data-speak-text]
//                                do mesmo cartão ([data-speak-scope])
// O cálculo do texto é o mesmo do script que gera os áudios
// (scripts/gerar-audios.mjs), para o nome do arquivo bater.
// ==========================================================
import { speak } from '../audio/speech.js';
import { joinSpeech } from '../audio/speechText.js';

function textFor(button) {
  if (button.dataset.speak) return button.dataset.speak;
  const scope = button.closest('[data-speak-scope]');
  if (!scope) return '';
  const pieces = [...scope.querySelectorAll('[data-speak-text]')].map((el) => el.textContent);
  return joinSpeech(pieces);
}

export function setupSpeakButtons() {
  let current = null;
  document.addEventListener('click', async (event) => {
    const button = event.target.closest('.btn-speak');
    if (!button) return;

    current?.classList.remove('is-speaking');
    current = button;
    button.classList.add('is-speaking'); // animação de "falando"
    await speak(textFor(button));
    button.classList.remove('is-speaking');
  });
}
