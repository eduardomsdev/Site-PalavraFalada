// ==========================================================
// Animação de abertura (máximo 4 segundos) feita com GSAP.
//
// GSAP em 30 segundos:
//   gsap.to(objeto, { propriedade: valorFinal, duration, ease })
//     -> muda a propriedade do valor atual até o valor final.
//   gsap.timeline()
//     -> uma "linha do tempo" onde encaixamos várias animações.
//        O último argumento de tl.to(..., 1.2) é EM QUE SEGUNDO ela começa.
//   ease: a "curva" do movimento. 'power2.inOut' acelera e desacelera;
//         'back.out' passa um pouquinho do ponto e volta (efeito "pop").
//
// O GSAP funciona com objetos do Three.js porque position, rotation e scale
// têm propriedades x, y, z que ele consegue alterar diretamente.
// ==========================================================
import gsap from 'gsap';

/**
 * Calcula onde cada letra vai parar: espalhadas numa elipse ao redor do livro,
 * sem cobrir o livro aberto. Funciona com o celular em pé ou deitado.
 */
export function scatterPositions(count, visible, bookHalf) {
  const rx = visible.width / 2 - 0.8; // margem lateral
  const ry = visible.height / 2 - 0.4; // a área já desconta o topo e o texto
  const positions = [];

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + 0.3 + (Math.random() - 0.5) * 0.3;
    let x = Math.cos(angle) * rx * (0.85 + Math.random() * 0.15);
    let y = Math.sin(angle) * ry * (0.85 + Math.random() * 0.15);

    // Se caiu em cima do livro, empurra para fora pelo lado mais curto
    const pushX = bookHalf.x - Math.abs(x);
    const pushY = bookHalf.y - Math.abs(y);
    if (pushX > 0 && pushY > 0) {
      const outside = (limit, max) => limit + Math.random() * Math.max(0, max - limit);
      // Só dá para empurrar para um lado se houver espaço na tela daquele lado
      const roomY = ry > bookHalf.y + 0.3; // celular em pé: sobra espaço em cima/embaixo
      const roomX = rx > bookHalf.x + 0.3; // computador: sobra espaço nas laterais
      if (roomY && (pushY <= pushX || !roomX)) {
        y = (Math.sign(y) || (i % 2 ? 1 : -1)) * outside(bookHalf.y, ry);
      } else if (roomX) {
        x = (Math.sign(x) || (i % 2 ? 1 : -1)) * outside(bookHalf.x, rx);
      }
    }
    // Perspectiva: quanto mais perto da câmera (z maior), mais o objeto "abre"
    // para fora na tela. Compensamos encolhendo x e y na mesma proporção,
    // senão as letras da borda ficariam cortadas.
    const z = 0.6 + Math.random() * 0.8;
    const k = (visible.cameraZ - z) / visible.cameraZ;
    positions.push({ x: x * k, y: y * k, z });
  }
  return positions;
}

/** Metade da largura/altura ocupada pelo livro aberto (+ ondas de som em cima). */
export function bookHalfSize(book) {
  const { width: W, height: H } = book.size;
  return {
    x: W + 0.35, // livro aberto tem 2x a largura da capa
    y: H / 2 + 1.1, // inclui as ondas de som acima do livro
  };
}

/**
 * Monta e toca a abertura. Devolve a timeline (para o botão Pular poder
 * "adiantar" até o fim com timeline.progress(1)).
 */
export function playIntro({ book, letters, visible, onComplete }) {
  const { coverZ, coverThickness } = book.size;
  const targets = scatterPositions(letters.tiles.length, visible, bookHalfSize(book));

  // Estado inicial das letras: escondidas dentro do livro
  for (const tile of letters.tiles) {
    tile.position.set(0, 0, 0.2);
    tile.scale.setScalar(0.001);
    tile.visible = false;
  }

  const tl = gsap.timeline({ onComplete });

  // 0,0s — o livro aparece com um "pop"
  tl.from(book.group.scale, { x: 0.6, y: 0.6, z: 0.6, duration: 0.5, ease: 'back.out(1.7)' }, 0);

  // 0,3s — o livro gira para ficar de frente e desliza para o centro
  tl.to(book.group.rotation, { x: -0.38, y: 0, z: 0, duration: 1.1, ease: 'power2.inOut' }, 0.3);
  tl.to(book.body.position, { x: 0, duration: 1.1, ease: 'power2.inOut' }, 0.3);

  // A sombra atrás do livro cresce junto, porque o livro aberto é 2x mais largo
  tl.from(book.shadow.scale, { x: 0.55, duration: 1.1, ease: 'power2.inOut' }, 0.3);

  // 0,4s — a capa gira na lombada: rotação de 0 até -π (meia volta = 180°)
  tl.to(book.coverHinge.rotation, { y: -Math.PI, duration: 1.1, ease: 'power2.inOut' }, 0.4);

  // 0,9s — as páginas viram, uma depois da outra.
  // Ao virar, cada página sobe um pouquinho em z para ficar EM CIMA da capa
  // aberta (senão ela "entraria" dentro da capa). A de cima vira primeiro.
  const flipOrder = [...book.pages].reverse();
  flipOrder.forEach((hinge, k) => {
    const start = 0.9 + k * 0.18;
    tl.to(hinge.rotation, {
      // um tiquinho menos que 180° faz as páginas ficarem levemente abertas
      y: -Math.PI + 0.03 + k * 0.035,
      duration: 0.8,
      ease: 'power1.inOut',
    }, start);
    tl.to(hinge.position, { z: coverZ + coverThickness * 0.1 + 0.006 * (k + 1), duration: 0.8 }, start);
  });

  // 1,4s — as ondas de som do logo surgem, uma de cada vez (stagger = intervalo)
  tl.to(book.waves.map((w) => w.scale), {
    x: 1, y: 1, z: 1, duration: 0.45, ease: 'back.out(2)', stagger: 0.12,
  }, 1.4);

  // 1,6s — as letras saem de dentro do livro e voam para seus lugares
  letters.tiles.forEach((tile, i) => {
    const start = 1.6 + i * 0.07;
    const to = targets[i];
    const size = 0.9 + Math.random() * 0.35;
    tile.userData.size = size; // guardado para a letra poder voltar depois do jogo
    tl.set(tile, { visible: true }, start);
    tl.to(tile.position, { x: to.x, y: to.y, z: to.z, duration: 0.9, ease: 'power3.out' }, start);
    tl.to(tile.scale, { x: size, y: size, z: size, duration: 0.6, ease: 'back.out(2)' }, start);
    // uma voltinha durante o voo
    tl.from(tile.rotation, { z: (Math.random() - 0.5) * Math.PI * 2, duration: 0.9, ease: 'power2.out' }, start);
  });

  // Fim por volta de 3,2s (dentro do limite de 4s)
  return tl;
}
