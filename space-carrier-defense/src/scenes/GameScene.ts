import Phaser from 'phaser';
import { createGameTextures } from '../utils/textures';
import { pick3Upgrades } from '../data/upgrades';

type EnemyType = 'f' | 'c' | 'fr' | 'boss';
type WavePhase = 'waiting' | 'spawning' | 'fighting' | 'clear';
type CmdMode = 'none' | 'move';

interface SpawnEntry { type: EnemyType; delay: number; }
interface Bullet {
  sprite: Phaser.GameObjects.Sprite;
  vx: number; vy: number;
  dmg: number; life: number;
  isAlly: boolean;
}

export class GameScene extends Phaser.Scene {
  // ── state ──────────────────────────────────────────────
  private hull!: number;
  private maxHull!: number;
  private points!: number;
  private nextCardAt!: number;
  private wave!: number;
  private totalWaves!: number;
  private gameMs!: number;
  private dead!: boolean;
  private carrierSelected!: boolean;
  private cmdMode!: CmdMode;

  // ── upgrade stats ──────────────────────────────────────
  private appliedUpgrades!: string[];
  private turretCooldownBase!: number;
  private turretDamage!: number;
  private fighterDamage!: number;
  private fighterSpeed!: number;
  private carrierMaxSpeed!: number;
  private weaponRange!: number;
  private salvageSpeed!: number;
  private salvageYield!: number;

  // ── entities ───────────────────────────────────────────
  private carrier!: Phaser.Physics.Arcade.Sprite;
  private fighters!: Phaser.Physics.Arcade.Group;
  private enemies!: Phaser.Physics.Arcade.Group;
  private debrisGroup!: Phaser.GameObjects.Group;
  private salvageShips!: Phaser.Physics.Arcade.Group;
  // Bullets in a plain array — no physics groups, avoids overlap-callback crashes
  private allBullets!: Bullet[];

  // ── timers / wave ──────────────────────────────────────
  private turretTimer!: number;
  private wavePhase!: WavePhase;
  private waveTimer!: number;
  private spawnQueue!: SpawnEntry[];
  private spawnElapsed!: number;
  private moveAngle!: number | null;

  // ── background ─────────────────────────────────────────
  private starField!: Phaser.GameObjects.TileSprite;
  private nearField!: Phaser.GameObjects.TileSprite;

  // ── hud ────────────────────────────────────────────────
  private hullFill!: Phaser.GameObjects.Rectangle;
  private pointsText!: Phaser.GameObjects.Text;
  private waveText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private statusText!: Phaser.GameObjects.Text;
  private moveGfx!: Phaser.GameObjects.Graphics;
  private selectionRing!: Phaser.GameObjects.Graphics;

  // ── command panel ──────────────────────────────────────
  private panelEls!: Array<Phaser.GameObjects.Rectangle | Phaser.GameObjects.Text>;
  private cmdMoveBg!: Phaser.GameObjects.Rectangle;
  private cmdMoveTxt!: Phaser.GameObjects.Text;
  private cmdHoldBg!: Phaser.GameObjects.Rectangle;
  private cmdModeIndicator!: Phaser.GameObjects.Text;

  constructor() { super({ key: 'GameScene' }); }

  create() {
    createGameTextures(this);
    this.initState();
    this.buildWorld();
    this.buildGroups();
    this.buildUI();
    this.spawnInitialUnits();
    this.setupColliders();
    this.setupInput();
    this.setupCamera();
  }

  // ════════════════════════════════════════════════════════
  // INIT
  // ════════════════════════════════════════════════════════

  private initState() {
    this.hull            = 100;
    this.maxHull         = 100;
    this.points          = 0;
    this.nextCardAt      = 100;
    this.wave            = 0;
    this.totalWaves      = 5;
    this.gameMs          = 0;
    this.dead            = false;
    this.carrierSelected = false;
    this.cmdMode         = 'none';
    this.appliedUpgrades = [];
    this.moveAngle       = null;
    this.allBullets      = [];

    this.turretCooldownBase = 1800;
    this.turretDamage       = 10;
    this.fighterDamage      = 8;
    this.fighterSpeed       = 200;
    this.carrierMaxSpeed    = 70;
    this.weaponRange        = 260;
    this.salvageSpeed       = 130;
    this.salvageYield       = 15;
    this.turretTimer        = this.turretCooldownBase;

    this.wavePhase    = 'waiting';
    this.waveTimer    = 3000;
    this.spawnQueue   = [];
    this.spawnElapsed = 0;
  }

  private buildWorld() {
    this.physics.world.setBounds(-2000, -2000, 4000, 4000);

    // Far stars — 0.15× scroll (deep background)
    this.starField = this.add.tileSprite(640, 360, 1280, 720, 'stars_tile')
      .setScrollFactor(0)
      .setDepth(-10);

    // Near-field stars — 0.75× scroll (zoom past as carrier moves)
    this.nearField = this.add.tileSprite(640, 360, 1280, 720, 'nearfield_tile')
      .setScrollFactor(0)
      .setDepth(-9);
  }

  private buildGroups() {
    this.fighters     = this.physics.add.group();
    this.enemies      = this.physics.add.group();
    this.debrisGroup  = this.add.group();
    this.salvageShips = this.physics.add.group();
  }

  private buildUI() {
    const D = 100;

    // Hull bar
    this.add.rectangle(10, 10, 204, 18, 0x111111).setOrigin(0, 0).setScrollFactor(0).setDepth(D);
    this.hullFill = this.add.rectangle(11, 11, 202, 16, 0x22cc44)
      .setOrigin(0, 0).setScrollFactor(0).setDepth(D + 1);
    this.add.text(14, 11, 'HULL', {
      fontSize: '11px', color: '#aaffaa', fontFamily: 'monospace',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(D + 2);

    this.pointsText = this.add.text(10, 34, 'PTS: 0', {
      fontSize: '14px', color: '#ffdd44', fontFamily: 'monospace',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(D);

    this.waveText = this.add.text(10, 54, 'WAVE: -', {
      fontSize: '14px', color: '#88aaff', fontFamily: 'monospace',
    }).setOrigin(0, 0).setScrollFactor(0).setDepth(D);

    this.timerText = this.add.text(640, 12, '0:00', {
      fontSize: '20px', color: '#ccddff', fontFamily: 'monospace',
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D);

    this.statusText = this.add.text(640, 80, '', {
      fontSize: '26px', color: '#44ff88', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D);

    // Command mode indicator (appears when MOVE is active)
    this.cmdModeIndicator = this.add.text(640, 108, '', {
      fontSize: '18px', color: '#44ffaa', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5, 0).setScrollFactor(0).setDepth(D);

    // Move destination marker
    this.moveGfx = this.add.graphics().setDepth(50);

    // World-space selection ring (redrawn in tickUI)
    this.selectionRing = this.add.graphics().setDepth(15);

    // ── Command Panel (bottom strip) ────────────────────
    const PY = 676;
    const panelBg = this.add.rectangle(640, PY, 1280, 72, 0x020810, 0.93)
      .setScrollFactor(0).setDepth(200)
      .setStrokeStyle(1, 0x1a2a3a);

    const carrierLabel = this.add.text(28, PY, '◈  CARRIER', {
      fontSize: '14px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0, 0.5).setScrollFactor(0).setDepth(201);

    // MOVE button
    this.cmdMoveBg = this.add.rectangle(512, PY, 140, 50, 0x0d1a33)
      .setScrollFactor(0).setDepth(201)
      .setStrokeStyle(2, 0x224488)
      .setInteractive({ useHandCursor: true });
    this.cmdMoveTxt = this.add.text(512, PY, 'MOVE', {
      fontSize: '20px', color: '#4488ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // HOLD button
    this.cmdHoldBg = this.add.rectangle(672, PY, 140, 50, 0x0d1a33)
      .setScrollFactor(0).setDepth(201)
      .setStrokeStyle(2, 0x224488)
      .setInteractive({ useHandCursor: true });
    const cmdHoldTxt = this.add.text(672, PY, 'HOLD', {
      fontSize: '20px', color: '#88aacc', fontFamily: 'monospace',
    }).setOrigin(0.5).setScrollFactor(0).setDepth(202);

    // Hint
    const cmdHint = this.add.text(1260, PY, 'Click carrier to select', {
      fontSize: '12px', color: '#33445566', fontFamily: 'monospace',
    }).setOrigin(1, 0.5).setScrollFactor(0).setDepth(201);

    this.panelEls = [panelBg, carrierLabel, this.cmdMoveBg, this.cmdMoveTxt,
                     this.cmdHoldBg, cmdHoldTxt, cmdHint];
    this.setPanelVisible(false);

    // Button handlers (panel area — no world-click interference)
    this.cmdMoveBg.on('pointerdown', () => {
      if (this.cmdMode === 'move') {
        this.exitMoveMode();
      } else {
        this.enterMoveMode();
      }
    });
    this.cmdMoveBg.on('pointerover', () => {
      if (this.cmdMode !== 'move') this.cmdMoveBg.setFillStyle(0x1a3055);
    });
    this.cmdMoveBg.on('pointerout', () => {
      if (this.cmdMode !== 'move') this.cmdMoveBg.setFillStyle(0x0d1a33);
    });

    this.cmdHoldBg.on('pointerdown', () => {
      this.moveAngle = null;
      this.carrier.setVelocity(0, 0);
      this.exitMoveMode();
      // Brief hold flash
      this.cmdHoldBg.setFillStyle(0x1a3322);
      this.time.delayedCall(300, () => this.cmdHoldBg.setFillStyle(0x0d1a33));
    });
    this.cmdHoldBg.on('pointerover', () => this.cmdHoldBg.setFillStyle(0x1a3322));
    this.cmdHoldBg.on('pointerout', () => {
      if (this.cmdMode !== 'move') this.cmdHoldBg.setFillStyle(0x0d1a33);
    });
  }

  private setupInput() {
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.dead || this.scene.isActive('UpgradeScene')) return;
      if (p.button !== 0) return;
      // Ignore clicks inside command panel area
      if (p.y > 640) return;

      const wx = this.cameras.main.scrollX + p.x;
      const wy = this.cameras.main.scrollY + p.y;

      if (this.cmdMode === 'move') {
        this.executeMove(wx, wy);
        return;
      }

      // Check if clicking on carrier (screen-space dist)
      const scx = this.carrier.x - this.cameras.main.scrollX;
      const scy = this.carrier.y - this.cameras.main.scrollY;
      if (Phaser.Math.Distance.Between(p.x, p.y, scx, scy) < 52) {
        this.selectCarrier();
      } else {
        this.deselectCarrier();
      }
    });
  }

  private setupColliders() {
    // Only enemy ram — bullets use manual distance checks in tickBullets()
    this.physics.add.overlap(
      this.enemies, this.carrier,
      this.onEnemyRamCarrier as Phaser.Types.Physics.Arcade.ArcadePhysicsCallback,
      undefined, this
    );
  }

  private setupCamera() {
    this.cameras.main.setBounds(-2000, -2000, 4000, 4000);
    this.cameras.main.startFollow(this.carrier, false, 0.12, 0.12);
  }

  private spawnInitialUnits() {
    this.carrier = this.physics.add.sprite(0, 0, 'carrier');
    this.carrier.setMaxVelocity(this.carrierMaxSpeed);
    this.carrier.setDrag(300);
    (this.carrier.body as Phaser.Physics.Arcade.Body).setCircle(34, 16, 16);

    for (let i = 0; i < 4; i++) this.addFighter();
    this.addSalvageShip();
  }

  // ════════════════════════════════════════════════════════
  // COMMAND UI
  // ════════════════════════════════════════════════════════

  private selectCarrier() {
    this.carrierSelected = true;
    this.setPanelVisible(true);
  }

  private deselectCarrier() {
    this.carrierSelected = false;
    this.exitMoveMode();
    this.setPanelVisible(false);
  }

  private enterMoveMode() {
    this.cmdMode = 'move';
    this.cmdMoveBg.setFillStyle(0x1a4488).setStrokeStyle(2, 0x4488ff);
    this.cmdMoveTxt.setStyle({ color: '#88ccff' });
    this.cmdModeIndicator.setText('→  CLICK TO SELECT MOVE DESTINATION');
  }

  private exitMoveMode() {
    this.cmdMode = 'none';
    this.cmdMoveBg.setFillStyle(0x0d1a33).setStrokeStyle(2, 0x224488);
    this.cmdMoveTxt.setStyle({ color: '#4488ff' });
    this.cmdModeIndicator.setText('');
  }

  private executeMove(wx: number, wy: number) {
    this.moveAngle = Phaser.Math.Angle.Between(
      this.carrier.x, this.carrier.y, wx, wy
    );
    this.exitMoveMode();

    // Brief direction marker at click point
    this.moveGfx.clear();
    this.moveGfx.lineStyle(2, 0x44ffaa, 0.9);
    this.moveGfx.strokeCircle(wx, wy, 14);
    this.moveGfx.lineStyle(1, 0x44ffaa, 0.5);
    this.moveGfx.strokeCircle(wx, wy, 6);
    this.tweens.add({
      targets: this.moveGfx, alpha: 0, duration: 600,
      onComplete: () => { this.moveGfx.setAlpha(1); this.moveGfx.clear(); },
    });
  }

  private setPanelVisible(v: boolean) {
    for (const el of this.panelEls) el.setVisible(v);
  }

  // ════════════════════════════════════════════════════════
  // SPAWNING
  // ════════════════════════════════════════════════════════

  private addFighter() {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const f = this.physics.add.sprite(
      this.carrier.x + Math.cos(angle) * 90,
      this.carrier.y + Math.sin(angle) * 90,
      'fighter'
    );
    (f.body as Phaser.Physics.Arcade.Body).setCircle(6, 2, 2);
    f.setData({ shootCd: 0, patrolAngle: angle, dmg: this.fighterDamage, spd: this.fighterSpeed });
    this.fighters.add(f);
  }

  private addSalvageShip() {
    const s = this.physics.add.sprite(
      this.carrier.x + Phaser.Math.Between(-50, 50),
      this.carrier.y + Phaser.Math.Between(-50, 50),
      'salvage'
    );
    (s.body as Phaser.Physics.Arcade.Body).setCircle(8, 3, 1);
    s.setData({ targetDebris: null });
    this.salvageShips.add(s);
  }

  private spawnEnemy(type: EnemyType) {
    const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
    const dist  = 680 + Phaser.Math.Between(0, 200);
    const x = this.carrier.x + Math.cos(angle) * dist;
    const y = this.carrier.y + Math.sin(angle) * dist;

    const cfg: Record<EnemyType, { key: string; hp: number; dmg: number; spd: number; pts: number; r: number; ox: number; oy: number }> = {
      f:    { key: 'enemy_f',    hp: 22,  dmg: 5,  spd: 150, pts: 10,  r: 6,  ox: 1, oy: 1 },
      c:    { key: 'enemy_c',    hp: 45,  dmg: 8,  spd: 105, pts: 20,  r: 8,  ox: 2, oy: 2 },
      fr:   { key: 'enemy_fr',   hp: 90,  dmg: 14, spd: 70,  pts: 45,  r: 11, ox: 4, oy: 2 },
      boss: { key: 'enemy_boss', hp: 320, dmg: 22, spd: 48,  pts: 200, r: 32, ox: 8, oy: 8 },
    };

    const c = cfg[type];
    const e = this.physics.add.sprite(x, y, c.key);
    (e.body as Phaser.Physics.Arcade.Body).setCircle(c.r, c.ox, c.oy);
    e.setData({ type, hp: c.hp, maxHp: c.hp, dmg: c.dmg, spd: c.spd, pts: c.pts,
                shootCd: Phaser.Math.Between(1000, 2500), lastRam: 0 });
    this.enemies.add(e);
  }

  private spawnDebris(x: number, y: number, count: number) {
    for (let i = 0; i < count; i++) {
      const dx = x + Phaser.Math.Between(-35, 35);
      const dy = y + Phaser.Math.Between(-35, 35);
      const d = this.add.sprite(dx, dy, 'debris').setDepth(2);
      d.setData({ collected: false });
      this.debrisGroup.add(d);
      this.tweens.add({
        targets: d,
        x: dx + Phaser.Math.Between(-25, 25),
        y: dy + Phaser.Math.Between(-25, 25),
        duration: 1800, ease: 'Sine.easeOut',
      });
    }
  }

  // ════════════════════════════════════════════════════════
  // WAVE MANAGEMENT
  // ════════════════════════════════════════════════════════

  private startWave() {
    this.wave++;
    this.wavePhase    = 'spawning';
    this.spawnElapsed = 0;
    this.spawnQueue   = this.buildQueue(this.wave);
    this.waveText.setText(`WAVE: ${this.wave} / ${this.totalWaves}`);
    this.flashText(this.statusText, `— WAVE ${this.wave} —`, '#88aaff', 1800);
  }

  private buildQueue(wave: number): SpawnEntry[] {
    const q: SpawnEntry[] = [];
    if (wave < this.totalWaves) {
      const fCount = 3 + wave * 2;
      for (let i = 0; i < fCount; i++) q.push({ type: 'f', delay: i * 500 });
      if (wave >= 2) for (let i = 0; i < wave; i++) q.push({ type: 'c', delay: 3000 + i * 700 });
      if (wave >= 3) q.push({ type: 'fr', delay: 6000 });
      if (wave >= 4) q.push({ type: 'fr', delay: 7200 });
    } else {
      q.push({ type: 'boss', delay: 500 });
      for (let i = 0; i < 8; i++) q.push({ type: 'f', delay: 2000 + i * 400 });
      for (let i = 0; i < 4; i++) q.push({ type: 'c', delay: 5500 + i * 600 });
      for (let i = 0; i < 2; i++) q.push({ type: 'fr', delay: 8500 + i * 1000 });
    }
    return q.sort((a, b) => a.delay - b.delay);
  }

  // ════════════════════════════════════════════════════════
  // COMBAT
  // ════════════════════════════════════════════════════════

  private fireTurrets() {
    const nearest = this.nearestEnemy(this.carrier.x, this.carrier.y, this.weaponRange * 1.3);
    if (!nearest) return;

    for (const ox of [-22, 22]) {
      const bx = this.carrier.x + ox;
      const by = this.carrier.y;
      this.spawnBullet(bx, by, nearest.x, nearest.y, 400, this.turretDamage, true);

      const flash = this.add.circle(bx, by, 9, 0xaaddff, 0.85).setDepth(12);
      this.time.delayedCall(55, () => flash.destroy());
    }
    this.playSound(1100, 0.08, 'square', 0.1);
  }

  private spawnBullet(
    fx: number, fy: number,
    tx: number, ty: number,
    speed: number, dmg: number, isAlly: boolean
  ) {
    const angle = Math.atan2(ty - fy, tx - fx);
    const key = isAlly ? 'bullet_ally' : 'bullet_enemy';
    const sprite = this.add.sprite(fx, fy, key).setDepth(5);
    if (isAlly) sprite.setRotation(angle + Math.PI / 2);
    this.allBullets.push({
      sprite,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      dmg,
      life: isAlly ? 2200 : 3500,
      isAlly,
    });
  }

  private nearestEnemy(x: number, y: number, range: number): Phaser.Physics.Arcade.Sprite | null {
    let best: Phaser.Physics.Arcade.Sprite | null = null;
    let minD = range;
    for (const e of this.enemies.getChildren()) {
      const es = e as Phaser.Physics.Arcade.Sprite;
      if (!es.active) continue;
      const d = Phaser.Math.Distance.Between(x, y, es.x, es.y);
      if (d < minD) { minD = d; best = es; }
    }
    return best;
  }

  // ════════════════════════════════════════════════════════
  // COLLISION (enemy ram only — bullets use manual check)
  // ════════════════════════════════════════════════════════

  private onEnemyRamCarrier(
    enemy: Phaser.GameObjects.GameObject,
    _carrier: Phaser.GameObjects.GameObject
  ) {
    const e = enemy as Phaser.Physics.Arcade.Sprite;
    if (!e.active) return;
    const now = this.time.now;
    if (now - (e.getData('lastRam') as number) < 1000) return;
    e.setData('lastRam', now);
    this.damage(e.getData('dmg') as number);
  }

  // ════════════════════════════════════════════════════════
  // EVENTS
  // ════════════════════════════════════════════════════════

  private killEnemy(e: Phaser.Physics.Arcade.Sprite) {
    const pts = e.getData('pts') as number;
    this.spawnDebris(e.x, e.y, Math.max(1, Math.ceil(pts / 10)));
    this.explode(e.x, e.y, e.getData('type') === 'boss' ? 90 : 32);
    this.addPoints(pts * 0.25);
    this.playSound(200, 0.22, 'sawtooth', 0.13);
    e.destroy();
  }

  private explode(x: number, y: number, size: number) {
    const s = this.add.sprite(x, y, 'explosion').setDepth(10);
    const sc = size / 32;
    s.setScale(sc * 0.4);
    this.tweens.add({
      targets: s, scaleX: sc * 2.2, scaleY: sc * 2.2, alpha: 0,
      duration: 380, ease: 'Power2',
      onComplete: () => s.destroy(),
    });
  }

  private damage(amount: number) {
    this.hull = Math.max(0, this.hull - amount);
    this.cameras.main.flash(120, 90, 0, 0, true);
    this.playSound(140, 0.18, 'square', 0.15);
    if (this.hull <= 0) this.gameOver();
  }

  private addPoints(amount: number) {
    this.points += amount;
    if (this.points >= this.nextCardAt) {
      this.nextCardAt += 130;
      this.triggerUpgrade();
    }
  }

  private triggerUpgrade() {
    const cards = pick3Upgrades(this.appliedUpgrades);
    // Deferred — avoid calling scene.pause() mid-physics-step
    this.time.delayedCall(0, () => {
      if (!this.dead) {
        this.scene.pause();
        this.scene.launch('UpgradeScene', {
          cards,
          onSelect: (id: string) => this.applyUpgrade(id),
        });
      }
    });
  }

  private applyUpgrade(id: string) {
    this.appliedUpgrades.push(id);
    switch (id) {
      case 'turret_rate':   this.turretCooldownBase = Math.max(500, this.turretCooldownBase * 0.7); break;
      case 'turret_dmg':    this.turretDamage = Math.round(this.turretDamage * 1.25); break;
      case 'turret_range':  this.weaponRange *= 1.2; break;
      case 'fighter_add':   this.addFighter(); break;
      case 'fighter_dmg':
        this.fighterDamage = Math.round(this.fighterDamage * 1.25);
        for (const f of this.fighters.getChildren())
          (f as Phaser.Physics.Arcade.Sprite).setData('dmg', this.fighterDamage);
        break;
      case 'fighter_speed':
        this.fighterSpeed = Math.round(this.fighterSpeed * 1.2);
        for (const f of this.fighters.getChildren())
          (f as Phaser.Physics.Arcade.Sprite).setData('spd', this.fighterSpeed);
        break;
      case 'hull_repair':   this.hull = Math.min(this.maxHull, this.hull + 20); break;
      case 'hull_max':      this.maxHull += 20; this.hull += 20; break;
      case 'salvage_speed': this.salvageSpeed = Math.round(this.salvageSpeed * 1.3); break;
      case 'salvage_add':   this.addSalvageShip(); break;
      case 'salvage_yield': this.salvageYield = Math.round(this.salvageYield * 1.5); break;
      case 'carrier_speed':
        this.carrierMaxSpeed = Math.round(this.carrierMaxSpeed * 1.15);
        this.carrier.setMaxVelocity(this.carrierMaxSpeed);
        break;
    }
  }

  private gameOver() {
    if (this.dead) return;
    this.dead = true;
    this.physics.pause();
    this.cameras.main.flash(600, 120, 0, 0);

    this.time.delayedCall(600, () => {
      const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(500).setInteractive();

      this.add.text(640, 250, 'CARRIER DESTROYED', {
        fontSize: '52px', color: '#ff4444', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

      const sec = Math.floor(this.gameMs / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      this.add.text(640, 360, [
        `Wave  ${this.wave} / ${this.totalWaves}`,
        `Time  ${m}:${s.toString().padStart(2, '0')}`,
        `Points  ${Math.floor(this.points)}`,
      ].join('        '), {
        fontSize: '19px', color: '#aabbcc', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

      const btn = this.add.text(640, 460, '[ RESTART ]', {
        fontSize: '32px', color: '#5599ff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ color: '#aaccff' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#5599ff' }));
      btn.on('pointerdown', () => { overlay.destroy(); this.scene.restart(); });

      this.input.keyboard?.once('keydown-SPACE', () => { overlay.destroy(); this.scene.restart(); });
      this.input.keyboard?.once('keydown-ENTER', () => { overlay.destroy(); this.scene.restart(); });
    });
  }

  private victory() {
    if (this.dead) return;
    this.dead = true;

    this.time.delayedCall(1500, () => {
      const overlay = this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.85)
        .setScrollFactor(0).setDepth(500).setInteractive();

      this.add.text(640, 250, 'MISSION COMPLETE', {
        fontSize: '52px', color: '#ffdd44', fontFamily: 'monospace',
        stroke: '#000000', strokeThickness: 5,
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

      const sec = Math.floor(this.gameMs / 1000);
      const m = Math.floor(sec / 60);
      const s = sec % 60;
      this.add.text(640, 360, [
        `All ${this.totalWaves} waves cleared`,
        `Time  ${m}:${s.toString().padStart(2, '0')}`,
        `Points  ${Math.floor(this.points)}`,
      ].join('        '), {
        fontSize: '19px', color: '#aabbcc', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501);

      const btn = this.add.text(640, 460, '[ PLAY AGAIN ]', {
        fontSize: '32px', color: '#5599ff', fontFamily: 'monospace',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(501)
        .setInteractive({ useHandCursor: true });

      btn.on('pointerover', () => btn.setStyle({ color: '#aaccff' }));
      btn.on('pointerout',  () => btn.setStyle({ color: '#5599ff' }));
      btn.on('pointerdown', () => { overlay.destroy(); this.scene.restart(); });
      this.input.keyboard?.once('keydown-SPACE', () => { overlay.destroy(); this.scene.restart(); });
    });
  }

  // ════════════════════════════════════════════════════════
  // SOUND
  // ════════════════════════════════════════════════════════

  private playSound(freq: number, duration: number, type: OscillatorType = 'square', volume = 0.12) {
    try {
      const mgr = this.sound as Phaser.Sound.WebAudioSoundManager;
      const ctx = mgr.context;
      if (!ctx || ctx.state === 'suspended') return;
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(volume, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + duration);
    } catch (_) { /* audio unavailable */ }
  }

  // ════════════════════════════════════════════════════════
  // UPDATE
  // ════════════════════════════════════════════════════════

  update(_time: number, delta: number) {
    // Cap delta — prevents large physics steps on mobile frame drops
    const dt = Math.min(delta, 50);

    // Always update parallax (even when paused/dead so camera lag looks natural)
    this.starField.tilePositionX = this.cameras.main.scrollX * 0.15;
    this.starField.tilePositionY = this.cameras.main.scrollY * 0.15;
    this.nearField.tilePositionX = this.cameras.main.scrollX * 0.75;
    this.nearField.tilePositionY = this.cameras.main.scrollY * 0.75;

    if (this.dead) return;
    if (this.scene.isActive('UpgradeScene')) return;

    this.gameMs += dt;
    this.tickCarrier(dt);
    this.tickFighters(dt);
    this.tickEnemies(dt);
    this.tickBullets(dt);
    this.tickSalvageShips();
    this.tickTurrets(dt);
    this.tickWaves(dt);
    this.tickUI();
  }

  private tickCarrier(delta: number) {
    if (this.moveAngle === null) return;

    this.carrier.setVelocity(
      Math.cos(this.moveAngle) * this.carrierMaxSpeed,
      Math.sin(this.moveAngle) * this.carrierMaxSpeed
    );

    // Bow (top of texture, y=7) points forward — requires +PI/2 offset
    const diff = Phaser.Math.Angle.Wrap(this.moveAngle + Math.PI / 2 - this.carrier.rotation);
    this.carrier.setRotation(this.carrier.rotation + diff * 0.06 * (delta / 16));
  }

  private tickFighters(delta: number) {
    for (const go of this.fighters.getChildren()) {
      const f = go as Phaser.Physics.Arcade.Sprite;
      if (!f.active) continue;

      let cd = (f.getData('shootCd') as number) - delta;
      f.setData('shootCd', cd);

      const target = this.nearestEnemy(f.x, f.y, this.weaponRange);

      if (target) {
        const dist = Phaser.Math.Distance.Between(f.x, f.y, target.x, target.y);
        const angle = Phaser.Math.Angle.Between(f.x, f.y, target.x, target.y);
        f.setRotation(angle + Math.PI / 2);

        if (dist > 110) {
          this.physics.moveTo(f, target.x, target.y, f.getData('spd') as number);
        } else {
          f.setVelocity(0, 0);
          if (cd <= 0) {
            this.spawnBullet(f.x, f.y, target.x, target.y, 420, f.getData('dmg') as number, true);
            this.playSound(1300, 0.07, 'square', 0.08);
            f.setData('shootCd', 550 + Phaser.Math.Between(0, 180));
          }
        }
      } else {
        let pa = (f.getData('patrolAngle') as number) + 0.0008 * delta;
        f.setData('patrolAngle', pa);
        const tx = this.carrier.x + Math.cos(pa) * 115;
        const ty = this.carrier.y + Math.sin(pa) * 115;
        const d = Phaser.Math.Distance.Between(f.x, f.y, tx, ty);
        if (d > 18) {
          this.physics.moveTo(f, tx, ty, 95);
          f.setRotation(Phaser.Math.Angle.Between(f.x, f.y, tx, ty) + Math.PI / 2);
        } else {
          f.setVelocity(0, 0);
        }
      }
    }
  }

  private tickEnemies(delta: number) {
    for (const go of this.enemies.getChildren()) {
      const e = go as Phaser.Physics.Arcade.Sprite;
      if (!e.active) continue;

      const dist = Phaser.Math.Distance.Between(e.x, e.y, this.carrier.x, this.carrier.y);
      if (dist > 55) {
        this.physics.moveTo(e, this.carrier.x, this.carrier.y, e.getData('spd') as number);
      } else {
        e.setVelocity(0, 0);
      }
      e.setRotation(
        Phaser.Math.Angle.Between(e.x, e.y, this.carrier.x, this.carrier.y) + Math.PI / 2
      );

      let cd = (e.getData('shootCd') as number) - delta;
      e.setData('shootCd', cd);
      const type = e.getData('type') as EnemyType;
      if (cd <= 0 && dist < 520) {
        const realAngle = Math.atan2(this.carrier.y - e.y, this.carrier.x - e.x);
        this.spawnBullet(e.x, e.y,
          e.x + Math.cos(realAngle), e.y + Math.sin(realAngle),
          300, e.getData('dmg') as number, false);
        this.playSound(700, 0.09, 'sawtooth', 0.07);
        const base = type === 'boss' ? 700 : type === 'fr' ? 1800 : type === 'c' ? 1400 : 2200;
        e.setData('shootCd', base + Phaser.Math.Between(0, 400));
      }

      const hpFrac = (e.getData('hp') as number) / (e.getData('maxHp') as number);
      if (hpFrac < 0.4)      e.setTint(0xff4400);
      else if (hpFrac < 0.7) e.setTint(0xff8800);
      else                   e.clearTint();
    }
  }

  private tickBullets(dt: number) {
    let i = this.allBullets.length;
    while (i--) {
      const b = this.allBullets[i];
      b.life -= dt;
      b.sprite.x += b.vx * (dt / 1000);
      b.sprite.y += b.vy * (dt / 1000);

      let hit = b.life <= 0;

      if (!hit && b.isAlly) {
        for (const go of this.enemies.getChildren()) {
          const e = go as Phaser.Physics.Arcade.Sprite;
          if (!e.active) continue;
          const eType = e.getData('type') as EnemyType;
          const r = eType === 'boss' ? 36 : eType === 'fr' ? 13 : 10;
          const dx = b.sprite.x - e.x;
          const dy = b.sprite.y - e.y;
          if (dx * dx + dy * dy < r * r) {
            const hp = (e.getData('hp') as number) - b.dmg;
            e.setData('hp', hp);
            this.tweens.add({ targets: e, alpha: 0.3, duration: 70, yoyo: true });
            if (hp <= 0) {
              this.killEnemy(e);
            } else {
              this.playSound(380, 0.1, 'triangle', 0.1);
            }
            hit = true;
            break;
          }
        }
      } else if (!hit && !this.dead) {
        const dx = b.sprite.x - this.carrier.x;
        const dy = b.sprite.y - this.carrier.y;
        if (dx * dx + dy * dy < 42 * 42) {
          this.damage(b.dmg);
          hit = true;
        }
      }

      if (hit) {
        b.sprite.destroy();
        this.allBullets.splice(i, 1);
      }
    }
  }

  private tickSalvageShips() {
    for (const go of this.salvageShips.getChildren()) {
      const s = go as Phaser.Physics.Arcade.Sprite;
      if (!s.active) continue;

      let target = s.getData('targetDebris') as Phaser.GameObjects.Sprite | null;

      if (target && (!target.active || target.getData('collected'))) {
        s.setData('targetDebris', null);
        target = null;
      }

      if (target) {
        const dist = Phaser.Math.Distance.Between(s.x, s.y, target.x, target.y);
        if (dist < 18) {
          target.setData('collected', true);
          target.destroy();
          s.setData('targetDebris', null);
          this.addPoints(this.salvageYield);
          this.explode(s.x, s.y, 8);
        } else {
          this.physics.moveTo(s, target.x, target.y, this.salvageSpeed);
          s.setRotation(Phaser.Math.Angle.Between(s.x, s.y, target.x, target.y) + Math.PI / 2);
        }
      } else {
        let nearest: Phaser.GameObjects.Sprite | null = null;
        let minD = 700;
        for (const d of this.debrisGroup.getChildren()) {
          const ds = d as Phaser.GameObjects.Sprite;
          if (!ds.active || ds.getData('collected')) continue;
          const dd = Phaser.Math.Distance.Between(s.x, s.y, ds.x, ds.y);
          if (dd < minD) { minD = dd; nearest = ds; }
        }
        if (nearest) {
          s.setData('targetDebris', nearest);
        } else {
          const dc = Phaser.Math.Distance.Between(s.x, s.y, this.carrier.x, this.carrier.y);
          if (dc > 110) {
            this.physics.moveTo(s, this.carrier.x, this.carrier.y, this.salvageSpeed * 0.65);
          } else {
            s.setVelocity(0, 0);
          }
        }
      }
    }
  }

  private tickTurrets(delta: number) {
    this.turretTimer -= delta;
    if (this.turretTimer <= 0) {
      this.fireTurrets();
      this.turretTimer = this.turretCooldownBase;
    }
  }

  private tickWaves(delta: number) {
    if (this.wavePhase === 'waiting') {
      this.waveTimer -= delta;
      if (this.waveTimer <= 0) this.startWave();
      return;
    }

    if (this.wavePhase === 'spawning') {
      this.spawnElapsed += delta;
      while (this.spawnQueue.length > 0 && this.spawnQueue[0].delay <= this.spawnElapsed) {
        this.spawnEnemy(this.spawnQueue.shift()!.type);
      }
      if (this.spawnQueue.length === 0) this.wavePhase = 'fighting';
    }

    if (this.wavePhase === 'fighting') {
      if (this.enemies.countActive() === 0) {
        this.wavePhase = 'clear';
        if (this.wave >= this.totalWaves) {
          this.victory();
        } else {
          this.flashText(this.statusText, 'WAVE CLEARED', '#44ff88', 1600);
          this.waveTimer = 4500;
          this.wavePhase = 'waiting';
        }
      }
    }
  }

  private tickUI() {
    const frac = Math.max(0, this.hull / this.maxHull);
    this.hullFill.setDisplaySize(202 * frac, 16);
    this.hullFill.setFillStyle(frac > 0.5 ? 0x22cc44 : frac > 0.25 ? 0xdd9900 : 0xdd2222);

    this.pointsText.setText(`PTS: ${Math.floor(this.points)}`);

    const sec = Math.floor(this.gameMs / 1000);
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    this.timerText.setText(`${m}:${s.toString().padStart(2, '0')}`);

    // Selection ring (world-space, pulsing)
    this.selectionRing.clear();
    if (this.carrierSelected && !this.dead) {
      const alpha = 0.45 + 0.3 * Math.sin(this.gameMs * 0.004);
      const color = this.cmdMode === 'move' ? 0x44ffaa : 0x4488ff;
      this.selectionRing.lineStyle(2, color, alpha);
      this.selectionRing.strokeCircle(this.carrier.x, this.carrier.y, 58);
    }
  }

  // ════════════════════════════════════════════════════════
  // HELPERS
  // ════════════════════════════════════════════════════════

  private flashText(text: Phaser.GameObjects.Text, msg: string, color: string, duration: number) {
    text.setText(msg).setColor(color).setAlpha(1);
    this.tweens.add({
      targets: text, alpha: 0, delay: duration - 400, duration: 400,
      onComplete: () => text.setText(''),
    });
  }
}
