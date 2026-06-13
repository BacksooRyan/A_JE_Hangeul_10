export function createGameTextures(scene: Phaser.Scene): void {
  // Stars tile — always create if missing (needed before scene restart guard)
  if (!scene.textures.exists('stars_tile')) {
    const sg = scene.add.graphics();
    for (let i = 0; i < 200; i++) {
      const x = Math.floor(Math.random() * 512);
      const y = Math.floor(Math.random() * 512);
      sg.fillStyle(0xffffff, 0.2 + Math.random() * 0.7);
      sg.fillCircle(x, y, Math.random() < 0.1 ? 2 : 1);
    }
    sg.generateTexture('stars_tile', 512, 512);
    sg.destroy();
  }

  // Near-field stars — fewer but bigger/brighter dots, scroll faster for depth
  if (!scene.textures.exists('nearfield_tile')) {
    const ng = scene.add.graphics();
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(Math.random() * 512);
      const y = Math.floor(Math.random() * 512);
      const r = 1 + Math.random() * 2.5;
      ng.fillStyle(0xffffff, 0.55 + Math.random() * 0.45);
      ng.fillCircle(x, y, r);
    }
    ng.generateTexture('nearfield_tile', 512, 512);
    ng.destroy();
  }

  if (scene.textures.exists('carrier')) return;

  const g = scene.add.graphics();

  // Carrier (100x100): pentagon bow + tapered hull + dual engine nacelles
  {
    g.clear();
    const hull = [
      { x: 50, y: 7  },   // bow tip
      { x: 66, y: 26 },   // port bow
      { x: 70, y: 38 },   // port hull join
      { x: 67, y: 64 },   // port stern
      { x: 33, y: 64 },   // starboard stern
      { x: 30, y: 38 },   // starboard hull join
      { x: 34, y: 26 },   // starboard bow
    ];
    g.fillStyle(0x0d1a44, 1);
    g.fillPoints(hull, true);
    g.lineStyle(2, 0x2255cc, 1);
    g.strokePoints(hull, true);

    // Engine nacelles (stern, stick out past hull)
    g.fillStyle(0x091520, 1);
    g.fillRect(16, 59, 15, 26);
    g.fillRect(69, 59, 15, 26);
    g.lineStyle(1, 0x1a3355, 1);
    g.strokeRect(16, 59, 15, 26);
    g.strokeRect(69, 59, 15, 26);

    // Engine exhaust glow
    g.fillStyle(0x001266, 1);
    g.fillCircle(23, 82, 6);
    g.fillCircle(77, 82, 6);
    g.fillStyle(0x2244ee, 1);
    g.fillCircle(23, 82, 3);
    g.fillCircle(77, 82, 3);

    // Bridge / command circle (forward area)
    g.fillStyle(0x0e2266, 1);
    g.fillCircle(50, 31, 8);
    g.lineStyle(1.5, 0x4477ff, 1);
    g.strokeCircle(50, 31, 8);

    // Bow center accent line
    g.lineStyle(1, 0x3366cc, 0.7);
    g.lineBetween(50, 7, 50, 24);

    // Hull deck stripe
    g.lineStyle(1, 0x1a2a55, 0.8);
    g.lineBetween(36, 49, 64, 49);

    g.generateTexture('carrier', 100, 100);
  }

  // Fighter (16x16): small circle, cyan-blue
  g.clear();
  g.fillStyle(0x2288ff, 1);
  g.fillCircle(8, 8, 6);
  g.lineStyle(1, 0x88ccff, 1);
  g.strokeCircle(8, 8, 6);
  g.fillStyle(0xcceeFF, 1);
  g.fillTriangle(8, 2, 11, 8, 5, 8);
  g.generateTexture('fighter', 16, 16);

  // Salvage Ship (22x18): diamond, teal
  g.clear();
  g.fillStyle(0x007766, 1);
  g.lineStyle(1, 0x33ffdd, 1);
  g.fillPoints([{ x: 11, y: 1 }, { x: 21, y: 9 }, { x: 11, y: 17 }, { x: 1, y: 9 }], true);
  g.strokePoints([{ x: 11, y: 1 }, { x: 21, y: 9 }, { x: 11, y: 17 }, { x: 1, y: 9 }], true);
  g.generateTexture('salvage', 22, 18);

  // Enemy Fighter (14x14): circle, yellow
  g.clear();
  g.fillStyle(0xccaa00, 1);
  g.fillCircle(7, 7, 6);
  g.lineStyle(1, 0xffee44, 1);
  g.strokeCircle(7, 7, 6);
  g.generateTexture('enemy_f', 14, 14);

  // Enemy Corvette (20x20): triangle, orange
  g.clear();
  g.fillStyle(0xdd7700, 1);
  g.lineStyle(1, 0xffaa33, 1);
  g.fillTriangle(10, 1, 19, 19, 1, 19);
  g.strokeTriangle(10, 1, 19, 19, 1, 19);
  g.generateTexture('enemy_c', 20, 20);

  // Enemy Frigate (30x26): larger triangle, orange-red
  g.clear();
  g.fillStyle(0xcc4400, 1);
  g.lineStyle(2, 0xff7733, 1);
  g.fillTriangle(15, 1, 29, 25, 1, 25);
  g.strokeTriangle(15, 1, 29, 25, 1, 25);
  g.generateTexture('enemy_fr', 30, 26);

  // Boss Battlecruiser (80x80): hexagon, deep red
  g.clear();
  g.fillStyle(0x660000, 1);
  g.lineStyle(3, 0xff3311, 1);
  fillHex(g, 40, 40, 35);
  g.lineStyle(3, 0xff3311, 1);
  strokeHex(g, 40, 40, 35);
  g.fillStyle(0xff2200, 1);
  g.fillCircle(40, 40, 10);
  g.generateTexture('enemy_boss', 80, 80);

  // Ally bullet (6x14) — bright cyan-white, visible at range
  g.clear();
  g.fillStyle(0x88ffff, 1);
  g.fillRect(0, 0, 6, 14);
  g.fillStyle(0xffffff, 0.7);
  g.fillRect(2, 0, 2, 8);
  g.generateTexture('bullet_ally', 6, 14);

  // Enemy bullet (7x7)
  g.clear();
  g.fillStyle(0xff4422, 1);
  g.fillCircle(3, 3, 3);
  g.generateTexture('bullet_enemy', 7, 7);

  // Debris (10x10): cross, gray
  g.clear();
  g.fillStyle(0x667788, 1);
  g.fillRect(4, 0, 2, 10);
  g.fillRect(0, 4, 10, 2);
  g.generateTexture('debris', 10, 10);

  g.destroy();
}

function hexPts(cx: number, cy: number, r: number) {
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 6;
    pts.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) });
  }
  return pts;
}

function fillHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
  g.fillPoints(hexPts(cx, cy, r), true);
}

function strokeHex(g: Phaser.GameObjects.Graphics, cx: number, cy: number, r: number) {
  g.strokePoints(hexPts(cx, cy, r), true);
}
