const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

function writePng(filePath, width, height, drawPixel) {
  // 1 scanline = 1 filter byte (0) + width * 4 bytes RGBA
  const rowBytes = 1 + width * 4;
  const rawBuffer = Buffer.alloc(rowBytes * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * rowBytes;
    rawBuffer[rowOffset] = 0; // Filter None
    for (let x = 0; x < width; x++) {
      const [r, g, b, a] = drawPixel(x, y, width, height);
      const pixelOffset = rowOffset + 1 + x * 4;
      rawBuffer[pixelOffset] = r;
      rawBuffer[pixelOffset + 1] = g;
      rawBuffer[pixelOffset + 2] = b;
      rawBuffer[pixelOffset + 3] = a;
    }
  }

  const compressedIdat = zlib.deflateSync(rawBuffer);

  function makeChunk(type, data) {
    const lenBuf = Buffer.alloc(4);
    lenBuf.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const toCrc = Buffer.concat([typeBuf, data]);
    const crcVal = zlib.crc32(toCrc);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE(crcVal, 0);
    return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
  }

  // IHDR chunk: 13 bytes
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(width, 0);
  ihdrData.writeUInt32BE(height, 4);
  ihdrData[8] = 8; // bit depth
  ihdrData[9] = 6; // color type RGBA
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace

  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
  const ihdrChunk = makeChunk('IHDR', ihdrData);
  const idatChunk = makeChunk('IDAT', compressedIdat);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngFile = Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
  fs.writeFileSync(filePath, pngFile);
  console.log(`Generated: ${filePath} (${width}x${height})`);
}

// Icon rendering helper: Draw stylish Z-messenger bubble
function createPixelDrawer(isMaskable) {
  return function(x, y, w, h) {
    const nx = (x / w) * 2 - 1; // -1 to +1
    const ny = (y / h) * 2 - 1;
    const dist = Math.sqrt(nx * nx + ny * ny);

    if (isMaskable) {
      // Full-bleed background with amber/orange gradient
      const grad = (ny + 1) / 2;
      let bgR = Math.round(245 * (1 - grad) + 234 * grad);
      let bgG = Math.round(158 * (1 - grad) + 88 * grad);
      let bgB = Math.round(11 * (1 - grad) + 12 * grad);

      // Safe zone is inner 75%
      const sc = 1.35;
      const sx = nx * sc;
      const sy = ny * sc;
      const bubbleDist = Math.sqrt(sx * sx + sy * sy);

      // Inner dark card with rounded corners
      if (Math.abs(sx) < 0.65 && Math.abs(sy) < 0.65) {
        // Draw Z in white / golden amber
        const zx = sx / 0.55;
        const zy = sy / 0.55;
        if (isInsideZ(zx, zy)) {
          return [255, 255, 255, 255];
        }
        return [15, 23, 42, 245]; // slate-900 badge
      }
      return [bgR, bgG, bgB, 255];
    }

    // Standard Icon (with transparent corners, circular badge)
    if (dist > 0.96) {
      return [0, 0, 0, 0]; // transparent outside circle
    }

    // Gradient background for circular badge
    const grad = (ny + 1) / 2;
    const bgR = Math.round(245 * (1 - grad) + 234 * grad);
    const bgG = Math.round(158 * (1 - grad) + 88 * grad);
    const bgB = Math.round(11 * (1 - grad) + 12 * grad);

    // Inner dark container
    if (dist < 0.78) {
      const zx = nx / 0.6;
      const zy = ny / 0.6;
      if (isInsideZ(zx, zy)) {
        return [255, 255, 255, 255]; // Crisp white Z
      }
      // Inner deep slate with subtle vignette
      const darkR = Math.round(15 + dist * 20);
      const darkG = Math.round(23 + dist * 25);
      const darkB = Math.round(42 + dist * 35);
      return [darkR, darkG, darkB, 255];
    }

    // Border ring anti-aliasing
    const alpha = dist > 0.92 ? Math.round((0.96 - dist) / 0.04 * 255) : 255;
    return [bgR, bgG, bgB, Math.max(0, Math.min(255, alpha))];
  };
}

// Math function to define sharp 'Z' glyph with chat notch
function isInsideZ(x, y) {
  // Bounds
  if (Math.abs(x) > 0.65 || Math.abs(y) > 0.65) return false;

  const barThick = 0.22;
  // Top horizontal bar
  if (y > 0.42 - barThick && y < 0.42 && x > -0.6 && x < 0.6) return true;
  // Bottom horizontal bar
  if (y > -0.42 && y < -0.42 + barThick && x > -0.6 && x < 0.6) return true;

  // Diagonal slash: y = -x slope
  // Distance from line y + x = 0
  const distDiag = Math.abs(x + y) / 1.4142;
  if (distDiag < 0.16 && y >= -0.42 && y <= 0.42) return true;

  return false;
}

// Generate required PWA icons
writePng(path.join(publicDir, 'pwa-192x192.png'), 192, 192, createPixelDrawer(false));
writePng(path.join(publicDir, 'pwa-512x512.png'), 512, 512, createPixelDrawer(false));
writePng(path.join(publicDir, 'pwa-maskable-512x512.png'), 512, 512, createPixelDrawer(true));
writePng(path.join(publicDir, 'apple-touch-icon.png'), 180, 180, createPixelDrawer(false));
writePng(path.join(publicDir, 'favicon-32x32.png'), 32, 32, createPixelDrawer(false));

console.log('All PWA icons generated successfully in /public!');
