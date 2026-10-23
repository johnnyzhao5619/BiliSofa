import qrcode from 'qrcode-generator';
// Draw the matrix directly. Outside data never becomes executable HTML/SVG.
export function drawQr(canvas: HTMLCanvasElement, value: string): void {
  if (value.length > 1024 || /[^\x20-\x7e]/.test(value)) throw new Error('qr.invalid');
  const qr = qrcode(0, 'M'); qr.addData(value, 'Byte'); qr.make();
  const modules = qr.getModuleCount(), cell = 7, quiet = 4;
  if (modules > 121) throw new Error('qr.too_large');
  canvas.width = canvas.height = (modules + quiet * 2) * cell;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('qr.canvas_unavailable');
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.fillStyle = '#000';
  for (let r = 0; r < modules; r++) for (let c = 0; c < modules; c++) if (qr.isDark(r, c)) ctx.fillRect((c + quiet) * cell, (r + quiet) * cell, cell, cell);
}
export function clearQr(canvas: HTMLCanvasElement): void { canvas.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height); canvas.width = canvas.height = 1; }
