// ==========================================================
// Livro 3D feito só com geometrias do Three.js (sem modelo externo).
// Visual igual ao logo do app: livro azul + ondas de som amarelas.
//
// Como o livro é montado (vista de cima, a câmera olha de +z para -z):
//
//   lombada (x = 0)
//      |  ┌──────── capa da frente (gira na lombada) ─┐  <- z mais alto
//      |  │ páginas soltas (também giram na lombada)  │
//      |  │ bloco de páginas                          │
//      |  └──────── capa de trás ─────────────────────┘  <- z = 0
//
// O truque para "abrir": a capa fica dentro de um Group (a "dobradiça")
// posicionado exatamente na lombada. Girando o Group no eixo Y, a capa
// gira em volta da lombada, como uma porta gira na dobradiça.
// ==========================================================
import {
  Group,
  Mesh,
  BoxGeometry,
  PlaneGeometry,
  TorusGeometry,
  MeshLambertMaterial,
  MeshBasicMaterial,
  CanvasTexture,
  SRGBColorSpace,
  DoubleSide,
} from 'three';
import { COLORS } from '../config.js';

// Medidas do livro (em "unidades" do Three.js — pense em decímetros)
const W = 2.6; // largura da capa
const H = 3.6; // altura da capa
const T = 0.08; // espessura da capa
const P = 0.34; // espessura do bloco de páginas
const LOOSE_PAGES = 4; // páginas que vão virar na abertura
const GAP = 0.004; // espacinho entre camadas para não "brigarem" (z-fighting)

/**
 * Desenha uma textura num <canvas> 2D e transforma em textura do Three.js.
 * Assim criamos "imagens" sem baixar nenhum arquivo.
 */
export function canvasTexture(width, height, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  draw(canvas.getContext('2d'), width, height);
  const texture = new CanvasTexture(canvas);
  // Diz ao Three.js que as cores do canvas estão em sRGB (cores "normais" da web)
  texture.colorSpace = SRGBColorSpace;
  return texture;
}

/** Desenha arcos de "som" (como no logo) centrados em (cx, cy). */
function drawSoundWaves(ctx, cx, cy, radii, lineWidth) {
  ctx.strokeStyle = '#f6b81a';
  ctx.lineWidth = lineWidth;
  ctx.lineCap = 'round';
  for (const r of radii) {
    ctx.beginPath();
    // Arco de 225° a 315°: a parte de cima do círculo
    ctx.arc(cx, cy, r, (Math.PI * 5) / 4, (Math.PI * 7) / 4);
    ctx.stroke();
  }
}

/** Capa: azul do app, ondas de som e o nome PALAVRA FALADA. */
function coverTexture() {
  return canvasTexture(512, 710, (ctx, w, h) => {
    ctx.fillStyle = '#2a6fc9';
    ctx.fillRect(0, 0, w, h);

    // Moldura clarinha arredondada
    ctx.strokeStyle = '#bfe2f7';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.roundRect(30, 30, w - 60, h - 60, 28);
    ctx.stroke();

    drawSoundWaves(ctx, w / 2, 330, [45, 85, 125], 22);

    ctx.fillStyle = '#ffffff';
    ctx.font = '900 84px Nunito, system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('PALAVRA', w / 2, 440);
    ctx.fillText('FALADA', w / 2, 530);
  });
}

/** Página de cima do bloco (aparece quando o livro abre): linhas de caderno. */
function pageTexture() {
  return canvasTexture(256, 355, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d6eafa';
    ctx.lineWidth = 3;
    for (let y = 60; y < h - 20; y += 36) {
      ctx.beginPath();
      ctx.moveTo(22, y);
      ctx.lineTo(w - 22, y);
      ctx.stroke();
    }
  });
}

/** Listras finas que imitam a borda de muitas folhas empilhadas. */
function edgeTexture(vertical) {
  return canvasTexture(64, 64, (ctx, w, h) => {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#cfe4f6';
    for (let i = 0; i < 64; i += 6) {
      if (vertical) ctx.fillRect(i, 0, 2, h);
      else ctx.fillRect(0, i, w, 2);
    }
  });
}

export function createBook() {
  // MeshLambertMaterial: material simples e barato, reage à luz sem brilho
  // especular. Ótimo para celular fraco (bem mais leve que MeshStandardMaterial).
  const coverMat = new MeshLambertMaterial({ map: coverTexture() });
  const coverInnerMat = new MeshLambertMaterial({ color: COLORS.blueSoft });
  const spineMat = new MeshLambertMaterial({ color: COLORS.spine });
  const paperMat = new MeshLambertMaterial({ color: COLORS.paper, side: DoubleSide });
  const pageTopMat = new MeshLambertMaterial({ map: pageTexture() });
  const edgeSideMat = new MeshLambertMaterial({ map: edgeTexture(true) });
  const edgeTopMat = new MeshLambertMaterial({ map: edgeTexture(false) });

  // Grupo externo: é ele que posicionamos/giramos para mostrar o livro.
  const root = new Group();
  // Grupo interno: tem a lombada em x = 0. Deslocamos -W/2 para o livro
  // FECHADO ficar centralizado. Na abertura, animamos x até 0 para o livro
  // ABERTO ficar centralizado (a lombada vira o meio).
  const body = new Group();
  body.position.set(-W / 2, 0, -(P + 2 * T) / 2);
  root.add(body);

  // ---------- Capa de trás ----------
  // BoxGeometry(largura, altura, profundidade) é centralizada na origem,
  // por isso posicionamos em W/2 para a borda esquerda ficar na lombada.
  // Uma Box aceita um material por face, nesta ordem: +x, -x, +y, -y, +z, -z
  const backCover = new Mesh(new BoxGeometry(W, H, T), [
    spineMat, spineMat, spineMat, spineMat, coverInnerMat, spineMat,
  ]);
  backCover.position.set(W / 2, 0, T / 2);
  body.add(backCover);

  // ---------- Bloco de páginas ----------
  const blockW = W - 0.1;
  const blockH = H - 0.14;
  const pageBlock = new Mesh(new BoxGeometry(blockW, blockH, P), [
    edgeSideMat, // +x: borda direita (as folhas empilhadas)
    paperMat, // -x: escondida pela lombada
    edgeTopMat, // +y: borda de cima
    edgeTopMat, // -y: borda de baixo
    pageTopMat, // +z: a página que aparece quando abrir
    paperMat, // -z: encostada na capa de trás
  ]);
  pageBlock.position.set(blockW / 2 + 0.02, 0, T + P / 2);
  body.add(pageBlock);

  // ---------- Lombada ----------
  const spine = new Mesh(new BoxGeometry(T, H, P + 2 * T), spineMat);
  spine.position.set(-T / 2, 0, (P + 2 * T) / 2);
  body.add(spine);

  // ---------- Páginas soltas (vão virar) ----------
  // Cada página é um plano fininho dentro de sua própria dobradiça.
  // translate() move a geometria para que a borda esquerda fique na origem
  // do grupo — assim ela gira pela borda, e não pelo meio.
  const pageGeo = new PlaneGeometry(blockW - 0.04, blockH - 0.04);
  pageGeo.translate((blockW - 0.04) / 2, 0, 0);
  const pages = [];
  for (let i = 0; i < LOOSE_PAGES; i++) {
    const hinge = new Group();
    hinge.position.set(0.02, 0, T + P + GAP * (i + 1));
    hinge.add(new Mesh(pageGeo, paperMat));
    body.add(hinge);
    pages.push(hinge);
  }

  // ---------- Capa da frente ----------
  const coverHinge = new Group();
  const coverZ = T + P + GAP * (LOOSE_PAGES + 1);
  coverHinge.position.set(0, 0, coverZ);
  const frontCover = new Mesh(new BoxGeometry(W, H, T), [
    spineMat, spineMat, spineMat, spineMat, coverMat, coverInnerMat,
  ]);
  frontCover.position.set(W / 2, 0, T / 2);
  coverHinge.add(frontCover);
  body.add(coverHinge);

  // ---------- Ondas de som (como no logo) ----------
  // TorusGeometry(raio, grossura do tubo, segmentos do tubo, segmentos do anel, arco)
  // Com arco = π/2 desenhamos só um quarto do "donut". Giramos π/4 no eixo Z
  // para esse quarto ficar centrado para cima.
  // MeshBasicMaterial ignora a luz: o amarelo fica sempre vivo, igual ao logo.
  const waveMat = new MeshBasicMaterial({ color: COLORS.yellow });
  const waves = new Group();
  waves.position.set(0, H / 2 + 0.05, 0.2);
  [0.3, 0.6, 0.9].forEach((radius) => {
    const arc = new Mesh(new TorusGeometry(radius, 0.08, 6, 20, Math.PI / 2), waveMat);
    arc.rotation.z = Math.PI / 4;
    arc.scale.setScalar(0.001); // começa "invisível"; a abertura faz crescer
    waves.add(arc);
  });
  root.add(waves);

  // ---------- Sombra suave atrás do livro ----------
  // Sombras em tempo real pesam no celular. Em vez disso usamos um "truque":
  // um plano com uma mancha azulada desfocada (gradiente) atrás do livro.
  // transparent: true deixa as partes sem cor do gradiente invisíveis.
  // depthWrite: false evita que esse plano "tampe" outros objetos.
  const shadowTex = canvasTexture(128, 128, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(27, 63, 115, 0.28)');
    g.addColorStop(1, 'rgba(27, 63, 115, 0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  });
  const shadow = new Mesh(
    new PlaneGeometry(W * 2.6, H * 1.45),
    new MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }),
  );
  shadow.position.set(0, -0.25, -0.6);
  root.add(shadow);

  // ---------- Pose inicial ----------
  // Inclinamos o livro: o topo vai um pouco para trás (rotação em X)
  // e giramos em Y para mostrar a borda das páginas.
  root.rotation.set(-0.3, -0.5, 0.04);

  // Flutuação suave (sobe e desce). Math.sin vai de -1 a 1 com o tempo.
  function update(delta, elapsed) {
    root.position.y = Math.sin(elapsed * 1.2) * 0.08;
  }

  return {
    group: root,
    body,
    coverHinge,
    pages,
    waves: waves.children,
    shadow,
    update,
    size: { width: W, height: H, thickness: P + 2 * T, coverZ, coverThickness: T },
  };
}
