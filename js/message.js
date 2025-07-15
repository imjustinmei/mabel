let buffer = [];
const stack = [];
const history = [];
const messages = [];
let index = 0;
let otherSize = 20;

const lowerset = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ[]";
const upperset = "°±²³´µ¶·¸¹áâãäåæçèéêëìíîïðñòóôõö÷øùúÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÐÑÒÓÔÕÖ×ØÙÚÛÝ";
const lower = {};
const upper = {};

for (let i = 0; i < lowerset.length; i++) {
  const char = lowerset[i];
  lower[char] = String.fromCharCode(char.charCodeAt(0) | 0x80);
  upper[lower[char]] = char;
}

const mouseup = () => document.dispatchEvent(new MouseEvent(mobile ? "touchend" : "pointerup"));

const render = (curve) => {
  if (curve.length == 1) draw(curve[0].y, curve[0].x);
  else {
    for (let j = 0; j < curve.length - 1; j++) {
      interpolate(curve[j].x, curve[j].y, curve[j + 1].x, curve[j + 1].y, false);
    }
  }
};

const action = (undo) => {
  if (drawing) mouseup();

  index += undo ? -1 : 1;
  index = Math.max(0, Math.min(index, stack.length));
  let erasing = erase;
  let s1 = _size; // initial size
  let s2; // size of action tool

  if (stack.length == 0) return;
  if (undo) clearCanvas();

  for (let i = undo ? 0 : index - 1; i < index; i++) {
    if (stack[i][0] === "d") {
      decompose(messages[stack[i].slice(1)], false);
      s2 = history.slice(0, i).filter(Number.isInteger).at(-1) || 5;
      continue;
    }

    updateTool(history[i] < 0 ? "KeyE" : "KeyW");
    s2 = _size;
    updateSize(Math.abs(history[i]));

    render(stack[i]);
  }

  updateSize(s2);
  updateTool(erasing ? "KeyE" : "KeyW");
  updateSize(s1);
};

const toBase = (num, upper = false) => {
  const set = upper ? upperset : lowerset;
  if (num === 0) return set[0];

  let result = "";
  while (num > 0) {
    const remainder = num % 64;
    result = set[remainder] + result;
    num = Math.floor(num / 64);
  }

  return result;
};

const fromBase = (str, upper = false) => {
  const set = upper ? upperset : lowerset;
  const base = 64;
  let result = 0;

  for (let i = 0; i < str.length; i++) {
    const value = set.indexOf(str[i]);
    result = result * base + value;
  }

  return result;
};

const _compose = () => {
  // empty canvas
  if (filledCells.reduce((a, c) => a + c.size, 0) == 0) return false;

  const encoded = [];
  let temp = [];

  let top = -1;
  const left = Math.min(...filledCells.map((x) => Math.min(...x)));
  const seen = {};

  for (let r = 0; r < virtualSize; r++) {
    const sorted = Array.from(filledCells[r])
      .sort((a, b) => a - b)
      .map((x) => x - left);
    let prev = -1;
    let count = 0;

    // empty row
    if (sorted.length == 0) {
      if (top !== -1) encoded.push("");
      continue;
    }

    // determine bounds
    if (top == -1) top = r;

    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i] - prev > 1) {
        if (count > 0) temp.push(toBase(count, true));
        temp.push(toBase(sorted[i] - prev - 1));
        count = 1;
      } else count++;
      prev = sorted[i];
    }

    temp.push(toBase(count, true));

    // cache seen rows by index
    const s = temp.join("");
    const str = s in seen ? "@" + toBase(seen[s]) : s;

    if (!(str in seen)) seen[str] = encoded.length;

    if (encoded.at(-1) === str) encoded.push("-1");
    else if (str === encoded.at(-2) && encoded.at(-1)[0] === "-")
      encoded[encoded.length - 1] = "-" + toBase(fromBase(encoded.at(-1).slice(1)) + 1);
    else encoded.push(str);

    temp = [];
  }

  while (encoded.at(-1) === "") encoded.pop();

  return top + ":" + left + ":" + encoded.join(".");
};

// source - from decompose button?
const decompose = (text, source = true) => {
  if (text === "") return;
  const [t, l, body] = text.split(":");
  const top = parseInt(t);
  const left = parseInt(l);

  if (typeof top !== "number" || typeof left !== "number" || typeof body !== "string") return;

  const rows = body.split(".");
  const seen = {};
  let repeats = 0;

  updateTool("KeyW");
  for (let i = 0; i < rows.length; i++) {
    let row = rows[i];
    let mult = 0;

    if (row[0] === "-") {
      mult = fromBase(row.slice(1));
      row = rows[i - 1];
    }
    if (row[0] === "@") row = seen[fromBase(row.slice(1))];
    else seen[i] = row;

    let sum = 0;
    let string = [];
    let write = row[0] in upper;

    for (let j = 0; j < row.length; j++) {
      if (write !== row[j] in upper) {
        const value = fromBase(string.join(""), write);
        if (write) drawCell(left + sum, top + i + repeats, value, mult || 1);
        sum += value;
        write = !write;
        string.length = [];
      }

      string.push(row[j]);
    }

    if (string.length > 0) drawCell(left + sum, top + i + repeats, fromBase(string.join(""), true), mult || 1);

    if (mult > 1) repeats += mult - 1;
  }

  if (source) {
    if (index < stack.length) {
      stack.length = index;
      history.length = index;
    }

    stack.push("d" + messages.length);
    messages.push(text);
    history.push("d");
    index++;
  }

  return true;
};
