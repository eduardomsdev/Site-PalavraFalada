// ==========================================================
// Blocos de letras 3D (como peças de um jogo de alfabeto).
// Usados na abertura (saindo do livro) e no mini-jogo (clicáveis).
//
// Cada bloco é:  anchor (Group)  ->  mesh (Mesh)
//   - o GSAP anima o "anchor" (voar de um lugar para outro);
//   - a flutuação contínua mexe só no "mesh" dentro dele.
// Separar assim evita que as duas animações briguem pela mesma posição.
// ==========================================================
import { Group, Mesh, Shape, ExtrudeGeometry, MeshLambertMaterial } from 'three';
import { canvasTexture } from './book.js';
import { TILE_COLORS } from '../config.js';

const SIZE = 0.62; // lado do bloco
const DEPTH = 0.14; // espessura
const RADIUS = 0.14; // arredondamento dos cantos

// Geometria e materiais são criados uma vez só e reaproveitados por todos os
// blocos: isso economiza memória e deixa o celular mais leve.
let tileGeometry = null;
const faceMaterials = new Map();
const sideMaterials = new Map();

function getTileGeometry() {
  if (tileGeometry) return tileGeometry;

  // Shape: desenhamos o contorno 2D de um quadrado com cantos arredondados...
  const s = SIZE / 2;
  const r = RADIUS;
  const shape = new Shape();
  shape.moveTo(-s + r, -s);
  shape.lineTo(s - r, -s);
  shape.quadraticCurveTo(s, -s, s, -s + r);
  shape.lineTo(s, s - r);
  shape.quadraticCurveTo(s, s, s - r, s);
  shape.lineTo(-s + r, s);
  shape.quadraticCurveTo(-s, s, -s, s - r);
  shape.lineTo(-s, -s + r);
  shape.quadraticCurveTo(-s, -s, -s + r, -s);

  // ...e ExtrudeGeometry "puxa" esse contorno para frente, virando um bloco 3D.
  // curveSegments baixo = poucos triângulos = mais leve.
  const geo = new ExtrudeGeometry(shape, { depth: DEPTH, bevelEnabled: false, curveSegments: 4 });
  geo.translate(0, 0, -DEPTH / 2); // centraliza na espessura

  // UV = coordenada que diz qual ponto da imagem vai em cada ponto do 3D (0 a 1).
  // A ExtrudeGeometry gera UVs em "unidades do mundo"; convertemos para 0..1
  // para a imagem da letra ocupar a face inteira.
  const pos = geo.attributes.position;
  const uv = geo.attributes.uv;
  for (let i = 0; i < pos.count; i++) {
    uv.setXY(i, pos.getX(i) / SIZE + 0.5, pos.getY(i) / SIZE + 0.5);
  }

  tileGeometry = geo;
  return geo;
}

/** Material da face: fundo colorido + letra grande, desenhados num canvas. */
function getFaceMaterial(letter, colorIndex) {
  const key = letter + colorIndex;
  if (!faceMaterials.has(key)) {
    const { bg, fg } = TILE_COLORS[colorIndex];
    const map = canvasTexture(256, 256, (ctx, w, h) => {
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, w, h);
      ctx.fillStyle = fg;
      ctx.font = '900 190px Nunito, system-ui, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(letter, w / 2, h / 2 + 12);
    });
    faceMaterials.set(key, new MeshLambertMaterial({ map }));
  }
  return faceMaterials.get(key);
}

function getSideMaterial(colorIndex) {
  if (!sideMaterials.has(colorIndex)) {
    sideMaterials.set(colorIndex, new MeshLambertMaterial({ color: TILE_COLORS[colorIndex].side }));
  }
  return sideMaterials.get(colorIndex);
}

/** Cria um bloco com a letra. Devolve o "anchor" (Group) para posicionar. */
export function createLetterTile(letter, colorIndex = 0) {
  // ExtrudeGeometry tem 2 grupos de faces: [0] frente/trás e [1] laterais.
  // Por isso passamos um array com 2 materiais.
  const mesh = new Mesh(getTileGeometry(), [getFaceMaterial(letter, colorIndex), getSideMaterial(colorIndex)]);
  const anchor = new Group();
  anchor.add(mesh);
  anchor.userData = {
    letter,
    mesh,
    phase: Math.random() * Math.PI * 2, // cada bloco flutua num ritmo diferente
  };
  return anchor;
}

/** Cria vários blocos e uma função de flutuação para todos. */
export function createFloatingLetters(letters) {
  const group = new Group();
  const tiles = letters.map((letter, i) => {
    const tile = createLetterTile(letter, i % TILE_COLORS.length);
    group.add(tile);
    return tile;
  });

  function update(delta, elapsed) {
    for (const tile of tiles) floatTile(tile, elapsed);
  }

  return { group, tiles, update };
}

/**
 * Chamado a cada quadro: um leve balanço, como se a letra estivesse na água.
 * Letras já encaixadas na palavra (userData.placed) ficam paradas.
 */
export function floatTile(tile, elapsed) {
  const { mesh, phase, placed } = tile.userData;
  if (placed) return;
  mesh.position.y = Math.sin(elapsed * 1.4 + phase) * 0.08;
  mesh.rotation.y = Math.sin(elapsed * 0.9 + phase) * 0.3;
  mesh.rotation.z = Math.sin(elapsed * 0.7 + phase) * 0.08;
}
