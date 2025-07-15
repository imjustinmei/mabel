const border = 3;
const virtualSize = 800;
let _size = 5;

let prevC = null;
let prevR = null;
let drawing = false;
let erase = false;
let prompted = false;

const filledCells = Array.from({ length: virtualSize }, () => new Set());

const pencil = () => {
  ctx.fillStyle = "black";
  canvas.style.cursor = 'url("icons/pencil.png") 3 29, auto';
};

const eraser = () => {
  ctx.fillStyle = "white";
  canvas.style.cursor = "default";
  canvas.style.cursor = `url("icons/e${Math.floor((_size - 1) / 10)}.png") 15 15, auto`;
};

const clearCanvas = () => {
  for (let i = 0; i < virtualSize; i++) filledCells[i].clear();
  ctx.clearRect(0, 0, virtualSize, virtualSize);
};

const fillCell = (row, col) => {
  if (0 > row || row >= virtualSize || 0 > col || col >= virtualSize) return;

  if (erase) filledCells[col].delete(row);
  else filledCells[col].add(row);
};

const drawCell = (x, y, width = 1, height = 1, fill = true) => {
  ctx.fillRect(x * cellSize, y * cellSize, width * cellSize, height * cellSize);
  if (fill) for (let i = 0; i < width; i++) for (let j = 0; j < height; j++) fillCell(x + i, y + j);
};

const toPixel = (cx, cy) => {
  const rect = canvas.getBoundingClientRect();
  const x = cx - rect.left - border;
  const y = cy - rect.top - border;
  let col = Math.floor(x / cellSize);
  let row = Math.floor(y / cellSize);

  // align even sizes to a corner
  if (_size % 2 == 0) {
    col -= x % 1 <= 0.5 ? 1 : 0;
    row += y % 1 >= 0.5 ? 1 : 0;
  }

  return [col, row];
};

const draw = (row, col) => {
  const size = _size;
  const radius = parseInt(size / 2);
  if (size % 2 == 1) drawCell(col - parseInt(size / 2), row, size);

  // triangles of the diamond
  for (let i = 0; i < radius; i++) {
    drawCell(col - i, row - (radius - i), 2 * i + (size % 2 == 0 ? 2 : 1));
    drawCell(col - i, row + (radius - i) - (size % 2 == 0 ? 1 : 0), 2 * i + (size % 2 == 0 ? 2 : 1));
  }
};

const interpolate = (x1, y1, x2, y2, write = true) => {
  const steps = Math.trunc(Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2)));

  for (let i = 0; i <= steps; i++) {
    const icol = x1 + Math.floor((i * (x2 - x1)) / steps);
    const irow = y1 + Math.floor((i * (y2 - y1)) / steps);
    draw(irow, icol);
    if (write) buffer.push({ x: icol, y: irow });
  }
};

const handleDraw = (e) => {
  if (!drawing) {
    prevC = null;
    prevR = null;
    return;
  }

  const [col, row] = toPixel((mobile ? e.touches[0] : e).clientX, (mobile ? e.touches[0] : e).clientY);

  // interpolate since mousedown is discrete
  if (prevC !== col || prevR !== row) {
    if (prevC !== null && prevR !== null) interpolate(prevC, prevR, col, row);

    buffer.push({ x: col, y: row });
    draw(row, col);
  }

  prevC = col;
  prevR = row;
};
