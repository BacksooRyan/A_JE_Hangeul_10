import Phaser from 'phaser';
import type { UpgradeCard } from '../data/upgrades';

export interface UpgradeSceneData {
  cards: UpgradeCard[];
  onSelect: (id: string) => void;
}

const CAT_COLORS: Record<string, number> = {
  weapons:  0xff6633,
  defense:  0x33aaff,
  flight:   0x44ffaa,
  salvage:  0xffcc00,
  tactical: 0xcc44ff,
};

export class UpgradeScene extends Phaser.Scene {
  constructor() {
    super({ key: 'UpgradeScene' });
  }

  create(data: UpgradeSceneData) {
    const { cards, onSelect } = data;

    this.add.rectangle(640, 360, 1280, 720, 0x000000, 0.75);

    this.add.text(640, 140, 'ADMIRAL — SELECT UPGRADE', {
      fontSize: '32px', color: '#ffdd44', fontFamily: 'monospace',
      stroke: '#000000', strokeThickness: 4,
    }).setOrigin(0.5);

    this.add.text(640, 185, 'Click a card or press 1 / 2 / 3', {
      fontSize: '15px', color: '#889999', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const cardW = 240;
    const cardH = 190;
    const gap = 280;
    const baseX = 640 - gap;

    cards.forEach((card, i) => {
      const cx = baseX + i * gap;
      const cy = 380;
      const catColor = CAT_COLORS[card.category] ?? 0xffffff;
      const hexColor = '#' + catColor.toString(16).padStart(6, '0');

      const bg = this.add.rectangle(cx, cy, cardW, cardH, 0x0d1a33)
        .setStrokeStyle(2, 0x223366)
        .setInteractive({ useHandCursor: true });

      this.add.rectangle(cx, cy - cardH / 2 + 14, cardW - 4, 22, catColor, 0.25);
      this.add.text(cx, cy - cardH / 2 + 14, card.category.toUpperCase(), {
        fontSize: '11px', color: hexColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      this.add.text(cx, cy - 18, card.title, {
        fontSize: '20px', color: '#ffffff', fontFamily: 'monospace',
        wordWrap: { width: cardW - 24 }, align: 'center',
      }).setOrigin(0.5);

      this.add.text(cx, cy + 38, card.desc, {
        fontSize: '14px', color: '#aaccee', fontFamily: 'monospace',
        wordWrap: { width: cardW - 24 }, align: 'center',
      }).setOrigin(0.5);

      this.add.text(cx, cy + cardH / 2 - 20, `[${i + 1}]`, {
        fontSize: '16px', color: hexColor, fontFamily: 'monospace',
      }).setOrigin(0.5);

      bg.on('pointerover', () => {
        bg.setFillStyle(0x1a3366).setStrokeStyle(2, catColor);
      });
      bg.on('pointerout', () => {
        bg.setFillStyle(0x0d1a33).setStrokeStyle(2, 0x223366);
      });
      bg.on('pointerdown', () => this.select(card.id, onSelect));
    });

    const kb = this.input.keyboard;
    if (kb) {
      kb.once('keydown-ONE',   () => this.select(cards[0].id, onSelect));
      kb.once('keydown-TWO',   () => cards[1] && this.select(cards[1].id, onSelect));
      kb.once('keydown-THREE', () => cards[2] && this.select(cards[2].id, onSelect));
    }
  }

  private select(id: string, onSelect: (id: string) => void) {
    onSelect(id);
    this.scene.stop();
    this.scene.resume('GameScene');
  }
}
