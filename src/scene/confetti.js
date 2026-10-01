// ==========================================================
// Confete de comemoração com Points (partículas).
//
// Points desenha um quadradinho em cada posição de uma lista — é o jeito
// mais barato de ter MUITAS partículas: tudo vira um único desenho na GPU.
// A cada quadro movemos as posições (velocidade + gravidade) na CPU.
// ==========================================================
import { BufferGeometry, BufferAttribute, Points, PointsMaterial, Color } from 'three';
import { TILE_COLORS } from '../config.js';

const GRAVITY = 7;
const LIFE = 1.6; // segundos

export function createConfetti(scene, max = 120) {
  const positions = new Float32Array(max * 3);
  const colors = new Float32Array(max * 3);
  const velocities = new Float32Array(max * 3);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new BufferAttribute(positions, 3));
  geometry.setAttribute('color', new BufferAttribute(colors, 3));

  // vertexColors: cada partícula usa a sua própria cor (do atributo "color")
  const material = new PointsMaterial({
    size: 0.32, // tamanho de cada pedacinho (em unidades do mundo)
    vertexColors: true,
    transparent: true,
    depthWrite: false,
  });
  const points = new Points(geometry, material);
  points.visible = false;
  points.frustumCulled = false; // as partículas se espalham: não deixe o Three.js "esconder"
  scene.add(points);

  const palette = TILE_COLORS.map((c) => new Color(c.bg));
  let life = 0;
  let count = 0;

  /** Solta o confete a partir de um ponto do mundo. */
  function burst(origin, amount = max) {
    count = Math.min(amount, max);
    for (let i = 0; i < count; i++) {
      positions.set([origin.x, origin.y, origin.z], i * 3);
      velocities.set([
        (Math.random() - 0.5) * 6, // para os lados
        2 + Math.random() * 4, // para cima
        Math.random() * 2, // um pouco para a câmera
      ], i * 3);
      const c = palette[i % palette.length];
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geometry.attributes.color.needsUpdate = true;
    geometry.setDrawRange(0, count); // desenha só as partículas usadas
    life = LIFE;
    material.opacity = 1;
    points.visible = true;
  }

  function update(delta) {
    if (life <= 0) return;
    const dt = Math.min(delta, 0.05); // evita "pulo" se o celular engasgar
    life -= dt;
    for (let i = 0; i < count; i++) {
      velocities[i * 3 + 1] -= GRAVITY * dt; // gravidade puxa para baixo
      positions[i * 3] += velocities[i * 3] * dt;
      positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
      positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
    }
    // needsUpdate avisa o Three.js para mandar as posições novas para a GPU
    geometry.attributes.position.needsUpdate = true;
    material.opacity = Math.min(1, life / 0.5); // some no final
    if (life <= 0) points.visible = false;
  }

  return { burst, update };
}
