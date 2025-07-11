const range = document.getElementById("range");
const canvas = document.getElementById("canvas");
const ctx = canvas.getContext("2d");
const cellSize = canvas.width / virtualSize;
let primed = true;
let confirmPaste = false;

// drawing
canvas.addEventListener("mousemove", (e) => drawing && handleDraw(e));

canvas.addEventListener("mousedown", (e) => {
  drawing = true;
  handleDraw(e);
});

canvas.addEventListener("mouseleave", () => mouseup());

document.addEventListener("mouseup", () => {
  if (drawing) {
    drawing = false;

    // divergent branch
    if (index < stack.length) {
      stack.length = index;
      history.length = index;
    }

    const curve = simplify(buffer, 0.1, true);
    stack.push(curve);
    history[index] = (erase ? -1 : 1) * _size;
    buffer = [];
    index++;
  }
  prevC = null;
  prevR = null;
});

// control
const updateSize = (s, os = -1) => {
  size.textContent = s;
  _size = s;
  range.value = s;
  if (os > -1) otherSize = os;
};

const updateTool = (tool) => {
  if ((tool == "KeyE") !== erase) {
    if (drawing) mouseup();

    range.max = 40;
    updateSize(otherSize, _size);

    erase = !erase;
    if (erase) eraser();
    else {
      pencil();
      range.max = 10;
    }

    p.classList.toggle("selected");
    e.classList.toggle("selected");
  }
};

document.addEventListener("keydown", (e) => {
  switch (e.code) {
    case "Escape":
      closeModal();
      break;
    case "KeyB":
      updateTool("KeyW");
      break;
    case "KeyE":
    case "KeyW":
      updateTool(e.code);
      break;
    case "KeyY":
      if (e.ctrlKey) action(false);
      break;
    case "KeyZ":
      if (e.ctrlKey) action(!e.shiftKey);
      break;
    default:
      break;
  }
});

// sidebar
p.addEventListener("click", () => updateTool("KeyW"));
e.addEventListener("click", () => updateTool("KeyE"));

range.addEventListener("input", (e) => {
  updateSize(e.target.value);
  if (erase) eraser();
});

// compose + modal buttons
const closeModal = () => {
  updateArea("");
  updateStatus("", true);
  document.getElementById("modal").style.display = "none";
};

const updateStatus = (status, hide = false) => {
  if (hide) document.getElementById("status").style.display = "none";
  else {
    document.getElementById("status").style.display = "block";
    document.getElementById("status").textContent = status;
  }
};

const updateArea = (message) => (document.getElementById("area").value = message);

const getAreaText = () => document.getElementById("area").value;

document.getElementById("compose").addEventListener("click", () => {
  document.getElementById("modal").style.display = "block";
});

document.getElementById("b-compose").addEventListener("click", () => {
  const composition = _compose();
  if (composition) {
    updateArea(_compose());
    updateStatus("bottled!");
  } else updateStatus("invalid message");
});

document.getElementById("copy").addEventListener("click", async () => {
  try {
    if (getAreaText() !== "") {
      await navigator.clipboard.writeText(getAreaText());
      updateStatus("copied!");
    }
  } catch (err) {
    console.log("bummer");
  }
});

document.getElementById("download").addEventListener("click", () => {
  if (getAreaText() === "") return;

  const url = URL.createObjectURL(new Blob([getAreaText()], { type: "text/plain" }));

  const dl = document.createElement("a");
  dl.href = url;
  dl.download = "message.txt";
  document.body.appendChild(dl);
  dl.click();
  document.body.removeChild(dl);
  URL.revokeObjectURL(url);
  updateStatus("downloaded!");
});

document.getElementById("b-decompose").addEventListener("click", () => {
  const res = decompose(getAreaText());
  if (!res) updateStatus("invalid message, try something else");
  else closeModal();
});

document.getElementById("paste").addEventListener("click", async () => {
  const contents = await navigator.clipboard.readText();
  updateArea(contents);
  updateStatus("pasted!");
});

document.getElementById("close").addEventListener("click", () => closeModal());

document.getElementById("modal").addEventListener("mousedown", (e) => e.target.id === "modal" && closeModal());

trash.addEventListener("click", () => {
  prompted = !prompted;
  document.getElementById("confirm").style.display = prompted ? "flex" : "none";
});

document.getElementById("yea").addEventListener("click", () => {
  clearCanvas();
  history.length = 0;
  stack.length = 0;
  index = 0;
  trash.click();
});

document.getElementById("no").addEventListener("click", () => trash.click());

window.addEventListener("beforeunload", (e) => history.length > 0 && e.preventDefault());

// drag message
document.addEventListener("drop", (e) => {
  e.preventDefault();

  const message = (e.dataTransfer.items || e.dataTransfer.files)[0];

  if (message.kind === "file") {
    const file = message.getAsFile();
    const reader = new FileReader();
    reader.onload = (e) => {
      updateArea(e.target.result);
    };
    reader.readAsText(file);
  } else if (message.kind === "string") message.getAsString((msg) => updateArea(msg));
  else return;

  document.getElementById("modal").style.display = "block";
});

document.addEventListener("dragover", (e) => e.preventDefault());
