import * as Phaser from 'phaser';

/** Minimal boot: no binary assets yet — everything is generated geometry. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('Boot');
  }

  create(): void {
    this.scene.start('Preloader');
  }
}
