import * as Phaser from 'phaser';

type ManifestImage = { key: string; file: string };

/**
 * Entries from public/assets/manifest.json — the drop-in art pipeline
 * described in ASSETS.md. Malformed or missing manifests yield no entries.
 */
const manifestImages = (raw: unknown): ManifestImage[] => {
  if (typeof raw !== 'object' || raw === null || !('images' in raw)) return [];
  if (!Array.isArray(raw.images)) return [];
  const entries: unknown[] = raw.images;
  const out: ManifestImage[] = [];
  for (const entry of entries) {
    if (
      typeof entry === 'object' &&
      entry !== null &&
      'key' in entry &&
      'file' in entry &&
      typeof entry.key === 'string' &&
      typeof entry.file === 'string'
    ) {
      out.push({ key: entry.key, file: entry.file });
    }
  }
  return out;
};

/**
 * Loads any art listed in assets/manifest.json, then generates procedural
 * fallback textures for whatever wasn't supplied (dusk sky gradient, fog,
 * grain, vignette). Supplied art that reuses a procedural key — 'dusk-sky',
 * 'fog-band', 'paper-grain', 'paper-vignette' — replaces it automatically.
 */
export class PreloaderScene extends Phaser.Scene {
  constructor() {
    super('Preloader');
  }

  preload(): void {
    this.load.json('asset-manifest', 'assets/manifest.json');
  }

  create(): void {
    for (const { key, file } of manifestImages(this.cache.json.get('asset-manifest'))) {
      if (!this.textures.exists(key)) this.load.image(key, `assets/${file}`);
    }
    if (this.load.list.size > 0) {
      // A missing file logs a load error and simply keeps its fallback.
      this.load.once(Phaser.Loader.Events.COMPLETE, () => this.finishBoot());
      this.load.start();
    } else {
      this.finishBoot();
    }
  }

  private finishBoot(): void {
    this.makeSkyTexture();
    this.makeFogTexture();
    this.makeGrainTexture();
    this.makeVignetteTexture();
    this.scene.start('Home');
  }

  /** Vertical twilight gradient: deep indigo down to a burning horizon. */
  private makeSkyTexture(): void {
    if (this.textures.exists('dusk-sky')) return;
    const w = 16;
    const h = 512;
    const canvas = this.textures.createCanvas('dusk-sky', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, '#171226');
    gradient.addColorStop(0.42, '#453054');
    gradient.addColorStop(0.6, '#8a4a3c');
    gradient.addColorStop(0.66, '#b05c33');
    gradient.addColorStop(0.74, '#3a2a40');
    gradient.addColorStop(1, '#1a1428');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }

  /** Soft horizontal fog band with faded top and bottom edges. */
  private makeFogTexture(): void {
    if (this.textures.exists('fog-band')) return;
    const w = 256;
    const h = 64;
    const canvas = this.textures.createCanvas('fog-band', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const gradient = ctx.createLinearGradient(0, 0, 0, h);
    gradient.addColorStop(0, 'rgba(138, 122, 154, 0)');
    gradient.addColorStop(0.5, 'rgba(138, 122, 154, 0.55)');
    gradient.addColorStop(1, 'rgba(138, 122, 154, 0)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }

  /** Tiled speckle noise that reads as film grain. */
  private makeGrainTexture(): void {
    if (this.textures.exists('paper-grain')) return;
    const size = 256;
    const canvas = this.textures.createCanvas('paper-grain', size, size);
    if (!canvas) return;
    const ctx = canvas.getContext();
    for (let i = 0; i < 2600; i++) {
      const x = Math.random() * size;
      const y = Math.random() * size;
      const dark = Math.random() < 0.5;
      const alpha = 0.04 + Math.random() * 0.08;
      ctx.fillStyle = dark ? `rgba(0, 0, 0, ${alpha})` : `rgba(232, 224, 216, ${alpha})`;
      const s = Math.random() < 0.85 ? 1 : 2;
      ctx.fillRect(x, y, s, s);
    }
    canvas.refresh();
  }

  /** Soft radial darkening toward the screen edges. */
  private makeVignetteTexture(): void {
    if (this.textures.exists('paper-vignette')) return;
    const w = 320;
    const h = 180;
    const canvas = this.textures.createCanvas('paper-vignette', w, h);
    if (!canvas) return;
    const ctx = canvas.getContext();
    const gradient = ctx.createRadialGradient(w / 2, h / 2, h * 0.42, w / 2, h / 2, w * 0.62);
    gradient.addColorStop(0, 'rgba(5, 3, 10, 0)');
    gradient.addColorStop(1, 'rgba(5, 3, 10, 0.55)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
    canvas.refresh();
  }
}
