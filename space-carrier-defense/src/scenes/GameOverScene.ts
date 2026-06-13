import Phaser from 'phaser';

export interface GameOverData {
  wave: number;
  time: number;
  points: number;
  victory?: boolean;
}

export class GameOverScene extends Phaser.Scene {
  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    const { wave, time, points, victory } = data;

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.92);

    const title = victory ? 'MISSION COMPLETE' : 'CARRIER DESTROYED';
    const color = victory ? '#ffdd44' : '#ff4444';

    this.add.text(640, 200, title, {
      fontSize: '52px', color, fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5);

    const secs = Math.floor(time / 1000);
    const m = Math.floor(secs / 60);
    const s = secs % 60;

    const stats = [
      `Waves Survived : ${wave}`,
      `Time           : ${m}:${s.toString().padStart(2, '0')}`,
      `Points         : ${points}`,
    ];

    stats.forEach((line, i) => {
      this.add.text(640, 330 + i * 38, line, {
        fontSize: '22px', color: '#ccddff', fontFamily: 'monospace',
      }).setOrigin(0.5);
    });

    const btn = this.add.text(640, 510, '[ PLAY AGAIN ]', {
      fontSize: '30px', color: '#5599ff', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => btn.setStyle({ color: '#aaccff' }));
    btn.on('pointerout',  () => btn.setStyle({ color: '#5599ff' }));
    btn.on('pointerdown', () => this.scene.start('GameScene'));

    const kb = this.input.keyboard;
    if (kb) {
      kb.once('keydown-SPACE', () => this.scene.start('GameScene'));
      kb.once('keydown-ENTER', () => this.scene.start('GameScene'));
    }
  }
}
