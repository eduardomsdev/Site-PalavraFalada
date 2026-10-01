// ==========================================================
// Estrutura básica de toda cena Three.js:
//   1. Renderer  -> desenha no <canvas> usando WebGL
//   2. Scene     -> "mundo" onde colocamos os objetos
//   3. Camera    -> de onde olhamos o mundo
//   4. Luzes     -> sem luz, materiais como Lambert ficam pretos
//   5. Loop      -> redesenha a cena a cada quadro (~60x por segundo)
// ==========================================================
import {
  WebGLRenderer,
  Scene,
  PerspectiveCamera,
  HemisphereLight,
  DirectionalLight,
  Timer,
  MathUtils,
} from 'three';

/**
 * Cria renderer, cena, câmera e luzes dentro do elemento `container`.
 * getInsets(): pixels ocupados por HTML em cima/embaixo do canvas.
 * Devolve funções para adicionar coisas ao loop de animação.
 */
export function setupScene(container, { getInsets = () => ({ top: 0, bottom: 0 }) } = {}) {
  // ---------- 1. Renderer ----------
  // alpha: true deixa o fundo transparente, assim o gradiente do CSS aparece atrás.
  // antialias suaviza as bordas; em celular fraco poderemos desligar (etapa 5).
  const renderer = new WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' });
  // pixelRatio: telas "retina" têm 2x, 3x mais pixels. Limitamos a 2 para
  // não pesar demais em celulares com tela de alta densidade.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  container.appendChild(renderer.domElement);

  // ---------- 2. Cena ----------
  const scene = new Scene();

  // ---------- 3. Câmera ----------
  // PerspectiveCamera(campo de visão em graus, proporção da tela, perto, longe)
  // Objetos mais perto que "near" ou mais longe que "far" não são desenhados.
  const camera = new PerspectiveCamera(35, 1, 0.1, 100);

  // ---------- 4. Luzes ----------
  // HemisphereLight: luz ambiente com uma cor vinda "do céu" e outra "do chão".
  // É barata e dá um preenchimento suave — ótima para celular.
  // Tons neutros/azulados para as cores ficarem fiéis às do app.
  const hemi = new HemisphereLight(0xffffff, 0xcfe4f6, 2.2);
  scene.add(hemi);

  // DirectionalLight: como a luz do sol, vem de uma direção só.
  // Dá volume ao livro. Sem sombras (castShadow fica false) para poupar o celular.
  const sun = new DirectionalLight(0xffffff, 1.2);
  sun.position.set(3, 5, 6);
  scene.add(sun);

  // ---------- Enquadramento ----------
  // Queremos que uma "caixa" de tamanho (largura x altura) caiba sempre na tela,
  // seja em pé (celular) ou deitada (computador). Calculamos a distância da câmera.
  //
  // "Área livre": o canvas ocupa a tela toda, mas em cima tem a barra do logo
  // e embaixo o texto da abertura. getInsets() diz quantos pixels estão
  // ocupados em cima e embaixo, e a cena é centralizada no espaço que sobra.
  let frame = { width: 7, height: 6 };
  let area = { height: 1, ratio: 1 }; // altura livre (px) e fração da tela

  function fitCamera() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false); // false = não mexe no CSS do canvas
    camera.aspect = w / h;

    const { top, bottom } = getInsets();
    const areaH = Math.max(h - top - bottom, h * 0.4);
    area = { height: areaH, ratio: areaH / h };

    // tan(metade do FOV) nos diz quanto a visão "abre" por unidade de distância.
    // Dividindo por area.ratio, a altura do frame cabe só na área livre.
    const halfFov = MathUtils.degToRad(camera.fov / 2);
    const distForHeight = frame.height / 2 / Math.tan(halfFov) / area.ratio;
    const distForWidth = frame.width / 2 / (Math.tan(halfFov) * camera.aspect);
    const distance = Math.max(distForHeight, distForWidth);

    camera.position.set(0, 0, distance);
    camera.lookAt(0, 0, 0);

    // setViewOffset "desloca a janela" da câmera, como mover a moldura de uma
    // foto sem mover a câmera. Deslocando a janela para baixo, o centro do
    // mundo (o livro) sobe na tela até o meio da área livre.
    const areaCenter = top + areaH / 2;
    camera.setViewOffset(w, h, 0, h / 2 - areaCenter, w, h);

    // Sempre que mudamos fov/aspect, a matriz de projeção precisa ser recalculada
    // (setViewOffset já chama updateProjectionMatrix, mas deixamos explícito)
    camera.updateProjectionMatrix();
  }

  function setFrame(width, height) {
    frame = { width, height };
    fitCamera();
  }

  // Quanto do "mundo" cabe na ÁREA LIVRE, no plano z = 0 (útil para espalhar objetos)
  function getVisibleSize() {
    const fullHeight = 2 * camera.position.z * Math.tan(MathUtils.degToRad(camera.fov / 2));
    return {
      width: fullHeight * camera.aspect,
      height: fullHeight * area.ratio,
      cameraZ: camera.position.z,
    };
  }

  // ResizeObserver avisa quando o tamanho do palco muda (girar o celular, etc.)
  new ResizeObserver(fitCamera).observe(container);
  fitCamera();

  // ---------- 5. Loop de animação ----------
  // Cada módulo (livro, letras, jogo) pode registrar uma função de atualização.
  const updaters = new Set();
  const timer = new Timer(); // mede o tempo entre quadros (delta)
  timer.connect(document); // pausa a contagem quando a aba fica escondida

  function tick(time) {
    timer.update(time);
    const delta = timer.getDelta(); // segundos desde o último quadro
    const elapsed = timer.getElapsed(); // segundos desde o início
    for (const fn of updaters) fn(delta, elapsed);
    renderer.render(scene, camera);
  }

  // O render só roda quando faz sentido: aba visível E palco na tela.
  // Rolou a página até o rodapé? O 3D para de desenhar e poupa bateria.
  let started = false;
  let pageVisible = !document.hidden;
  let onScreen = true;
  let running = false;

  function sync() {
    const shouldRun = started && pageVisible && onScreen;
    if (shouldRun === running) return;
    running = shouldRun;
    // setAnimationLoop é o jeito do Three.js de usar requestAnimationFrame
    renderer.setAnimationLoop(shouldRun ? tick : null);
  }

  function start() {
    started = true;
    sync();
  }
  function stop() {
    started = false;
    sync();
  }

  document.addEventListener('visibilitychange', () => {
    pageVisible = !document.hidden;
    sync();
  });

  // IntersectionObserver avisa quando um elemento entra ou sai da tela
  new IntersectionObserver(([entry]) => {
    onScreen = entry.isIntersecting;
    sync();
  }).observe(container);

  return {
    renderer,
    scene,
    camera,
    setFrame,
    refit: fitCamera, // recalcula a câmera (ex.: quando o HTML embaixo muda de altura)
    getVisibleSize,
    start,
    stop,
    onUpdate: (fn) => updaters.add(fn),
    offUpdate: (fn) => updaters.delete(fn),
  };
}
