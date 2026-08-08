/** Heuristic: phone / tablet screen visible in webcam frame (grid + connected regions). */
export function detectPhoneHeuristic(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const cols = 16;
  const rows = 12;
  const cellW = Math.max(4, Math.floor(width / cols));
  const cellH = Math.max(4, Math.floor(height / rows));

  type CellStat = {
    row: number;
    col: number;
    mean: number;
    variance: number;
    edge: number;
  };

  const stats: CellStat[] = [];

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const x0 = col * cellW;
      const y0 = row * cellH;
      let sum = 0;
      let sumSq = 0;
      let edgeSum = 0;
      let n = 0;

      for (let y = y0; y < Math.min(y0 + cellH, height - 1); y += 2) {
        for (let x = x0; x < Math.min(x0 + cellW, width - 1); x += 2) {
          const lum = luminance(data, width, x, y);
          sum += lum;
          sumSq += lum * lum;
          const lumR = luminance(data, width, x + 1, y);
          const lumD = luminance(data, width, x, y + 1);
          edgeSum += Math.abs(lum - lumR) + Math.abs(lum - lumD);
          n += 1;
        }
      }

      if (n === 0) continue;
      const mean = sum / n;
      const variance = Math.max(0, sumSq / n - mean * mean);
      stats.push({
        row,
        col,
        mean,
        variance,
        edge: edgeSum / n,
      });
    }
  }

  const active = new Set<string>();

  for (const cell of stats) {
    const screenLike =
      cell.variance > 160 && cell.mean > 40 && cell.mean < 245;
    const glossyDevice =
      cell.mean > 85 &&
      cell.mean < 235 &&
      cell.edge > 14 &&
      cell.variance > 70;
    if (screenLike || glossyDevice) {
      active.add(`${cell.row},${cell.col}`);
    }
  }

  const { area, bboxW, bboxH } = largestComponent(active, rows, cols);
  const gridArea = rows * cols;
  if (area >= gridArea * 0.012 && area <= gridArea * 0.38 && bboxW > 0 && bboxH > 0) {
    const aspect = bboxW / bboxH;
    const portrait = aspect >= 0.32 && aspect <= 0.92;
    const landscape = aspect >= 1.08 && aspect <= 2.75;
    if (portrait || landscape) {
      return true;
    }
  }

  return detectPhoneScreenBlob(data, width, height);
}

function luminance(
  data: Uint8ClampedArray,
  width: number,
  x: number,
  y: number,
): number {
  const i = (y * width + x) * 4;
  return 0.2126 * data[i] + 0.7152 * data[i + 1] + 0.0722 * data[i + 2];
}

function largestComponent(
  active: Set<string>,
  rows: number,
  cols: number,
): { area: number; bboxW: number; bboxH: number } {
  const seen = new Set<string>();
  let best = { area: 0, bboxW: 0, bboxH: 0 };

  for (const key of active) {
    if (seen.has(key)) continue;
    const queue = [key];
    seen.add(key);
    let minR = rows;
    let maxR = 0;
    let minC = cols;
    let maxC = 0;
    let area = 0;

    while (queue.length > 0) {
      const cur = queue.pop()!;
      const [rs, cs] = cur.split(",");
      const r = Number(rs);
      const c = Number(cs);
      area += 1;
      minR = Math.min(minR, r);
      maxR = Math.max(maxR, r);
      minC = Math.min(minC, c);
      maxC = Math.max(maxC, c);

      for (const [nr, nc] of [
        [r - 1, c],
        [r + 1, c],
        [r, c - 1],
        [r, c + 1],
      ]) {
        const nk = `${nr},${nc}`;
        if (nr < 0 || nr >= rows || nc < 0 || nc >= cols) continue;
        if (!active.has(nk) || seen.has(nk)) continue;
        seen.add(nk);
        queue.push(nk);
      }
    }

    if (area > best.area) {
      best = {
        area,
        bboxW: maxC - minC + 1,
        bboxH: maxR - minR + 1,
      };
    }
  }

  return best;
}

/** Bright, high-contrast rectangle (typical lit phone screen) not filling whole frame. */
function detectPhoneScreenBlob(
  data: Uint8ClampedArray,
  width: number,
  height: number,
): boolean {
  const step = 4;
  let brightHighContrast = 0;
  let total = 0;

  for (let y = 0; y < height; y += step) {
    for (let x = 0; x < width; x += step) {
      total += 1;
      const lum = luminance(data, width, x, y);
      if (lum < 70 || lum > 248) continue;

      let localVar = 0;
      let localN = 0;
      for (let dy = -2; dy <= 2; dy += 2) {
        for (let dx = -2; dx <= 2; dx += 2) {
          const nx = x + dx;
          const ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
          const l2 = luminance(data, width, nx, ny);
          localVar += (l2 - lum) * (l2 - lum);
          localN += 1;
        }
      }
      if (localN > 0 && localVar / localN > 900) {
        brightHighContrast += 1;
      }
    }
  }

  const ratio = brightHighContrast / Math.max(1, total);
  return ratio > 0.018 && ratio < 0.22;
}
