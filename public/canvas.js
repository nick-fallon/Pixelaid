var sectionSize = 128,
  sectionRows = 5,
  sectionCols = 4,
  modalUp = false,
  userPixels = 0,
  pixelsUsed = 0,
  sectionArr = [],
  originalSectionArr = [],
  liveEditTimers = {},
  sectionId = "",
  sectionPos = "",
  isPainting = false,
  selectedColor = "rgb(255, 255, 255)";

var colors = [
  "G",
  "A",
  "Y",
  "R",
  "P",
  "T",
  "B",
  "D",
  "V",
  "M",
  "O",
  "S",
  "W",
  "E",
  "H",
  "L",
];
var stampEmojis = [
  "⭐",
  "❤️",
  "🔥",
  "✨",
  "😂",
  "😍",
  "🤯",
  "😎",
  "🤖",
  "🧠",
  "🌈",
  "🍕",
  "🎉",
  "🪩",
  "🦄",
  "⚡",
  "💎",
  "🎨",
  "🚀",
];
var STAMP_KEY_POOL =
  "0123456789abcdefghijklmnopqrstuvwxyz!@#$%^&*()_+-=[]{};:,.<>/?~|CFIJKNQUXZ";
var stampMetaByKey = {};
var stampKeyByEmojiAndScale = {};
buildStampMaps();

var selectedStampEmoji = null;
var selectedStampSize = 1;
var selectedEmojiScale = 1;
var modal = document.getElementById("myModal");
var modalCanvas = $("#modalCanvas");
var palette = $("#palette");
var stampPalette = $("#stampPalette");
var stampSize = $("#stampSize");
var emojiScale = $("#emojiScale");
var colorDiv = $("#colorDiv");

function initEditKeyFromUrl() {
  let params = new URLSearchParams(window.location.search);
  let key = params.get("edit_key");
  if (!key) return;
  window.localStorage.setItem("pixelaid_edit_key", key);
  params.delete("edit_key");
  let nextQuery = params.toString();
  let nextUrl = window.location.pathname + (nextQuery ? "?" + nextQuery : "");
  window.history.replaceState({}, "", nextUrl);
}

function withEditKey(payload) {
  let key = window.localStorage.getItem("pixelaid_edit_key");
  if (key) {
    return Object.assign({}, payload, { edit_key: key });
  }
  return payload;
}

//on document ready
$(document).ready(function () {
  initEditKeyFromUrl();
  $.get("/data").then(function (data) {
    var fullPic = unpack(data);
    drawCanvas(fullPic);
    connectRealtime(fullPic);

    //click on section to open modal edit window
    $("#canvasFrame").click(function (event) {
      let secDiv = event.target.closest(".section");
      if (!secDiv) return;

      modalUp = true;
      pixelsUsed = 0;
      sectionPos = secDiv.id;
      sectionId = getId(sectionPos);
      let sourceSection = getSectionStateFromCanvas(sectionPos, sectionId) || ensureSection(fullPic[sectionPos], sectionId);
      fullPic[sectionPos] = sourceSection;
      sectionArr = copyArr(sourceSection);
      originalSectionArr = copyArr(sourceSection);
      modal.style.display = "flex";
      drawSection(sectionArr, sectionId);
      selectColor(selectedColor);
    });

    //change selected color
    $("#palette").click(function (event) {
      if (!event.target.classList.contains("color")) return;
      selectedColor = window.getComputedStyle(event.target).backgroundColor;
      selectedStampEmoji = null;
      stampPalette.find(".stamp").removeClass("selected-stamp");
      selectColor(selectedColor);
    });

    $("#stampPalette").click(function (event) {
      let stampEl = event.target.closest(".stamp");
      if (!stampEl) return;
      stampPalette.find(".stamp").removeClass("selected-stamp");
      stampEl.classList.add("selected-stamp");
      selectedStampEmoji = stampEl.getAttribute("data-emoji");
      selectColor(selectedColor);
    });

    $("#stampSize").change(function () {
      let size = Number($(this).val());
      selectedStampSize = Number.isFinite(size) && size >= 1 && size <= 3 ? size : 1;
    });

    $("#emojiScale").change(function () {
      let size = Number($(this).val());
      selectedEmojiScale = Number.isFinite(size) && size >= 1 && size <= 4 ? size : 1;
      selectColor(selectedColor);
    });

    //paint modal pixels by click/drag (mouse, stylus, touch)
    $("#modalCanvas").on("pointerdown", ".editPixel", function (event) {
      isPainting = true;
      event.preventDefault();
      paintModalPixel(event.target);
    });

    $("#modalCanvas").on("pointerenter", ".editPixel", function () {
      if (!isPainting) return;
      paintModalPixel(this);
    });

    $(document).on("pointerup pointercancel", function () {
      isPainting = false;
    });

    //cancel button on modal window
    $("#modalCancel").click(function () {
      modalUp = false;
      renderSectionPreview(sectionPos, originalSectionArr);
      sendPreviewReset(sectionId, originalSectionArr);
      modal.style.display = "none";
      modalCanvas.empty();
      palette.empty();
      stampPalette.empty();
      stampPalette.find(".stamp").removeClass("selected-stamp");
      selectedStampEmoji = null;
      selectedStampSize = 1;
      selectedEmojiScale = 1;
      stampSize.val("1");
      emojiScale.val("1");
      selectedColor = "rgb(255, 255, 255)";
    });

    //submit edited section to the DB canvas
    $("#modalSubmit").click(function () {
      fullPic[sectionPos] = packSectionForState(sectionArr, sectionId);
      let newData = pack(sectionArr, sectionId);
      let payload = {
        section: newData,
        pixels: pixelsUsed,
      };
      $.post("/updateCanvas", withEditKey({ json: JSON.stringify(payload) })).done(function () {
        if (Number.isFinite(userPixels)) {
          let remainingPixels = Math.max(userPixels - pixelsUsed, 0);
          $("#userPixels").text(remainingPixels);
          $("#user-pixel").text("You have " + remainingPixels + " pixels");
        }
        originalSectionArr = copyArr(packSectionForState(sectionArr, sectionId));
        pixelsUsed = 0;
        modalUp = false;
        modal.style.display = "none";
        modalCanvas.empty();
        palette.empty();
        stampPalette.empty();
        selectedStampEmoji = null;
        selectedStampSize = 1;
        selectedEmojiScale = 1;
        stampSize.val("1");
        emojiScale.val("1");
        selectedColor = "rgb(255, 255, 255)";
      }).fail(function () {
        console.error("Unable to submit canvas update");
      });
    });

    $("#clearBoardBtn").click(function () {
      if (!window.confirm("Clear the whole board for everyone?")) return;
      $.post("/clearCanvas", withEditKey({})).fail(function () {
        console.error("Unable to clear board");
      });
    });

    //clear the edits, array, and pixels used in the section
    $("#modalClear").click(function () {
      sectionArr = copyArr(originalSectionArr);
      renderSectionPreview(sectionPos, sectionArr);
      sendPreviewReset(sectionId, sectionArr);
      drawSection(sectionArr, sectionId);
      pixelsUsed = 0;
      $("#spendPixels").text(pixelsUsed);
    });
  });
});

//initialize the canvas from DB
function drawCanvas(arr) {
  let canvas = $("#canvasFrame");
  canvas.empty();

  // Create all sections first
  for (let y = 0; y < sectionRows; y++) {
    for (let x = 0; x < sectionCols; x++) {
      let pos = y + "," + x;
      let tempSection = document.createElement("div");
      tempSection.className = "section";
      tempSection.id = pos;
      canvas.append(tempSection);

      // Always render a full 16x16 preview so every section looks interactive.
      let section = ensureSection(arr[pos], getId(pos));
      arr[pos] = section;
      for (let i = 0; i < 16; i++) {
        let rowKey = "row_" + i;
        let rowData = section[rowKey];
        for (let n = 0; n < rowData.length; n++) {
          let tempPixel = document.createElement("div");
          tempPixel.className = "pixel";
          setPixelVisual(tempPixel, rowData[n]);
          tempSection.append(tempPixel);
        }
      }
    }
  }
}

function connectRealtime(fullPic) {
  if (!window.EventSource) return;

  let stream = new EventSource("/events");
  stream.onmessage = function (event) {
    let message;
    try {
      message = JSON.parse(event.data);
    } catch (error) {
      return;
    }

    if (message.type === "canvas_update" && message.section) {
      applyRemoteSection(fullPic, message.section);
      clearSectionLiveIndicator(message.section.id);
      flashSectionById(message.section.id);
      return;
    }

    if (message.type === "canvas_preview") {
      applyRemotePreview(fullPic, message);
      return;
    }

    if (message.type === "canvas_preview_reset" && message.section) {
      applyRemoteSection(fullPic, message.section);
      clearSectionLiveIndicator(message.section.id);
      return;
    }

    if (message.type === "canvas_cleared" && Array.isArray(message.sections)) {
      let fresh = unpack(message.sections);
      for (let key in fullPic) {
        delete fullPic[key];
      }
      Object.assign(fullPic, fresh);
      drawCanvas(fullPic);
      modalUp = false;
      modal.style.display = "none";
    }
  };
}

function paintModalPixel(pixelEl) {
  if (!pixelEl || !pixelEl.classList.contains("editPixel")) return;
  if (pixelsUsed >= userPixels) return;

  let yy = Number(String(pixelEl.getAttribute("y")).replace("row_", ""));
  let xx = Number(pixelEl.getAttribute("x"));
  if (!Number.isFinite(yy) || !Number.isFinite(xx)) return;
  let nextChar = selectedStampEmoji
    ? getStampKey(selectedStampEmoji, selectedEmojiScale)
    : getChar(selectedColor);
  let size = selectedStampEmoji ? selectedStampSize : 1;
  let changed = applyBrushAt(yy, xx, size, nextChar);
  if (changed > 0) {
    $("#spendPixels").text(pixelsUsed);
  }
}

function applyBrushAt(centerY, centerX, brushSize, nextChar) {
  let changed = 0;
  let startY = centerY - Math.floor((brushSize - 1) / 2);
  let startX = centerX - Math.floor((brushSize - 1) / 2);

  for (let y = startY; y < startY + brushSize; y++) {
    for (let x = startX; x < startX + brushSize; x++) {
      if (y < 0 || y > 15 || x < 0 || x > 15) continue;
      if (pixelsUsed >= userPixels) return changed;

      let rowKey = "row_" + y;
      let currentChar = sectionArr[rowKey][x];
      if (currentChar === nextChar) continue;

      sectionArr[rowKey][x] = nextChar;
      let modalCell = modalCanvas[0].querySelector(
        '.editPixel[y="' + rowKey + '"][x="' + x + '"]',
      );
      if (modalCell) setPixelVisual(modalCell, nextChar);
      paintMainCanvasChar(sectionPos, rowKey, x, nextChar);
      sendPreviewPixel(sectionId, rowKey, x, nextChar);
      pixelsUsed += 1;
      changed += 1;
    }
  }
  return changed;
}

//create single selected section with color palette
function drawSection(arr, pos) {
  $("#modalPos").text(pos);
  $("#spendPixels").text(pixelsUsed);
  modalCanvas.empty();
  palette.empty();
  stampPalette.empty();
  arr = copyArr(ensureSection(arr, Number(pos) || sectionId));
  let tempPixelText = String($("#userPixels").text() || "").trim();
  if (!tempPixelText) {
    userPixels = Infinity;
  } else {
    let parsedPixels = Number(tempPixelText);
    userPixels = Number.isFinite(parsedPixels) && parsedPixels > 0 ? parsedPixels : Infinity;
  }

  // Create a 16x16 grid of pixels
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    let rowData = arr[rowKey] || Array(16).fill("E");
    for (let n = 0; n < 16; n++) {
      let tempDiv = document.createElement("div");
      tempDiv.className = "editPixel";
      setPixelVisual(tempDiv, rowData[n]);
      tempDiv.setAttribute("y", rowKey);
      tempDiv.setAttribute("x", n);
      modalCanvas.append(tempDiv);
    }
  }

  // Create color palette
  for (let i = 0; i < colors.length; i++) {
    let colorDiv = document.createElement("div");
    colorDiv.className = "color";
    colorDiv.style.backgroundColor = getColor(colors[i]);
    palette.append(colorDiv);
  }

  stampEmojis.forEach(function (emoji) {
    let stampDiv = document.createElement("div");
    stampDiv.className = "stamp";
    stampDiv.setAttribute("data-emoji", emoji);
    stampDiv.textContent = emoji;
    stampPalette.append(stampDiv);
  });
}

//update selected color div and variable
function selectColor(color) {
  colorDiv.empty();
  let tempDiv = document.createElement("div");
  tempDiv.className = "color";
  if (selectedStampEmoji) {
    tempDiv.style.backgroundColor = "rgb(255, 255, 255)";
    tempDiv.textContent = selectedStampEmoji;
    tempDiv.style.display = "flex";
    tempDiv.style.alignItems = "center";
    tempDiv.style.justifyContent = "center";
    tempDiv.style.fontSize = String(16 + selectedEmojiScale * 5) + "px";
  } else {
    tempDiv.style.backgroundColor = color;
  }
  colorDiv.append(tempDiv);
}

//unpack the data from its string form
function unpack(arr) {
  let tempArr = {};
  
  // We have a 4x5 grid (4 columns, 5 rows)
  // arr contains objects with id 1-20
  for (let i = 0; i < arr.length; i++) {
    let section = arr[i];
    let id = section.id;
    
    // Convert database ID (1-20) to grid position (0-based)
    // For a 4x5 grid (reading left to right, top to bottom):
    // Row 0: IDs 1-4   (x: 0-3, y: 0)
    // Row 1: IDs 5-8   (x: 0-3, y: 1)
    // Row 2: IDs 9-12  (x: 0-3, y: 2)
    // Row 3: IDs 13-16 (x: 0-3, y: 3)
    // Row 4: IDs 17-20 (x: 0-3, y: 4)
    let y = Math.floor((id - 1) / sectionCols);
    let x = (id - 1) % sectionCols;

    let pos = y + "," + x;
    tempArr[pos] = section;
  }
  return tempArr;
}

function getPosFromId(id) {
  let numericId = Number(id);
  if (!Number.isFinite(numericId) || numericId < 1) return null;
  let y = Math.floor((numericId - 1) / sectionCols);
  let x = (numericId - 1) % sectionCols;
  return y + "," + x;
}

function applyRemoteSection(fullPic, section) {
  let pos = getPosFromId(section.id);
  if (!pos) return;

  let normalizedSection = ensureSection(section, Number(section.id));
  fullPic[pos] = normalizedSection;
  renderSectionPreview(pos, normalizedSection);
}

function getSectionStateFromCanvas(sectionPos, sectionId) {
  let sectionEl = document.getElementById(sectionPos);
  if (!sectionEl) return null;
  let pixels = sectionEl.querySelectorAll(".pixel");
  if (!pixels || pixels.length !== 256) return null;

  let section = { id: sectionId, canvas_id: 1 };
  for (let row = 0; row < 16; row++) {
    let chars = [];
    for (let col = 0; col < 16; col++) {
      let idx = row * 16 + col;
      let pixel = pixels[idx];
      let char = pixel.getAttribute("data-char");
      if (!char) {
        let color = window.getComputedStyle(pixel).backgroundColor;
        char = getChar(color);
      }
      chars.push(char);
    }
    section["row_" + row] = chars.join("");
  }
  return section;
}

function applyRemotePreview(fullPic, message) {
  if (!message.section_id || !message.row_key || message.x === undefined || !message.char) return;
  let pos = getPosFromId(message.section_id);
  if (!pos) return;
  setSectionChar(fullPic, pos, message.row_key, message.x, message.char);
  paintMainCanvasChar(pos, message.row_key, message.x, message.char);
  markSectionLive(message.section_id);
}

function setSectionChar(fullPic, pos, rowKey, x, char) {
  let section = ensureSection(fullPic[pos], getId(pos));
  let row = (section[rowKey] || "E".repeat(16)).split("");
  let idx = Number(x);
  if (!Number.isFinite(idx) || idx < 0 || idx > 15) return;
  row[idx] = char;
  section[rowKey] = row.join("");
  fullPic[pos] = section;
}

//repackage the section array into an object to be sent to database
function pack(arr, pos) {
  let newObj = {};
  newObj["id"] = pos;
  newObj["canvas_id"] = 1;
  
  // Pack each row of pixels
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    if (arr[rowKey]) {
      newObj[i] = arr[rowKey].join('');
    }
  }
  return newObj;
}

//get the obj id from the div coords
function getId(pos) {
  let stringA = "";
  let stringB = "";
  for (var i = 0; i < pos.length; i++) {
    if (pos.charAt(i) === ",") {
      stringA = pos.substring(0, i);
      stringB = pos.substring(i + 1, pos.length);
    }
  }
  // Convert grid position back to section ID (1-20)
  // Row number (y) * columns per row (4) + column number (x) + 1
  return (+stringA * sectionCols) + (+stringB + 1);
}

//copy the array into a NEW copy
function copyArr(arr) {
  let newArr = {};

  // Copy each row
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    let rowData = arr[rowKey] || "E".repeat(16);
    if (Array.isArray(rowData)) {
      newArr[rowKey] = rowData.slice(0, 16);
    } else if (typeof rowData === "string") {
      newArr[rowKey] = rowData.split("");
    } else {
      newArr[rowKey] = "E".repeat(16).split("");
    }
  }
  return newArr;
}

function ensureSection(section, id) {
  let safeSection = section || { id: id, canvas_id: 1 };

  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    if (!safeSection[rowKey] || safeSection[rowKey].length !== 16) {
      safeSection[rowKey] = "E".repeat(16);
    }
  }
  return safeSection;
}

function buildStampMaps() {
  let idx = 0;
  stampEmojis.forEach(function (emoji) {
    stampKeyByEmojiAndScale[emoji] = {};
    for (let scale = 1; scale <= 4; scale++) {
      let key = STAMP_KEY_POOL.charAt(idx++);
      stampMetaByKey[key] = { emoji: emoji, scale: scale };
      stampKeyByEmojiAndScale[emoji][scale] = key;
    }
  });
}

function getStampKey(emoji, scale) {
  if (!stampKeyByEmojiAndScale[emoji]) return null;
  return stampKeyByEmojiAndScale[emoji][scale] || stampKeyByEmojiAndScale[emoji][1];
}

function getStampMeta(char) {
  return stampMetaByKey[char] || null;
}

function isStampChar(char) {
  return !!getStampMeta(char);
}

function setPixelVisual(el, char) {
  let safeChar = char || "E";
  el.setAttribute("data-char", safeChar);
  el.style.backgroundColor = getColor(safeChar);
  let stampMeta = getStampMeta(safeChar);
  let existingGlyph = el.querySelector(".stamp-glyph");
  if (existingGlyph) {
    existingGlyph.remove();
  }

  if (stampMeta) {
    let baseSize = el.classList.contains("editPixel") ? 12 : 8;
    let glyph = document.createElement("span");
    glyph.className = "stamp-glyph";
    glyph.textContent = stampMeta.emoji;
    glyph.style.fontSize = String(baseSize * stampMeta.scale) + "px";
    el.appendChild(glyph);
  } else {
    el.textContent = "";
  }
}

function paintMainCanvasChar(sectionPos, rowKey, x, char) {
  let section = document.getElementById(sectionPos);
  if (!section) return;

  let rowIndex = Number(String(rowKey).replace("row_", ""));
  let colIndex = Number(x);
  let pixelIndex = rowIndex * 16 + colIndex;
  let targetPixel = section.querySelectorAll(".pixel")[pixelIndex];
  if (targetPixel) {
    setPixelVisual(targetPixel, char);
  }
}

function flashSectionById(sectionId) {
  let pos = getPosFromId(sectionId);
  if (!pos) return;
  let section = document.getElementById(pos);
  if (!section) return;

  section.classList.remove("section-saved-flash");
  section.offsetWidth;
  section.classList.add("section-saved-flash");
  setTimeout(function () {
    section.classList.remove("section-saved-flash");
  }, 700);
}

function markSectionLive(sectionId) {
  let pos = getPosFromId(sectionId);
  if (!pos) return;
  let section = document.getElementById(pos);
  if (!section) return;

  section.classList.add("section-live-edit");
  if (liveEditTimers[pos]) {
    clearTimeout(liveEditTimers[pos]);
  }
  liveEditTimers[pos] = setTimeout(function () {
    clearSectionLiveIndicator(sectionId);
  }, 1400);
}

function clearSectionLiveIndicator(sectionId) {
  let pos = getPosFromId(sectionId);
  if (!pos) return;
  let section = document.getElementById(pos);
  if (!section) return;

  section.classList.remove("section-live-edit");
  if (liveEditTimers[pos]) {
    clearTimeout(liveEditTimers[pos]);
    delete liveEditTimers[pos];
  }
}

function renderSectionPreview(sectionPos, arr) {
  let section = document.getElementById(sectionPos);
  if (!section) return;

  let pixels = section.querySelectorAll(".pixel");
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    let rowData = arr[rowKey] || [];
    for (let n = 0; n < 16; n++) {
      let idx = i * 16 + n;
      if (pixels[idx]) {
        setPixelVisual(pixels[idx], rowData[n]);
      }
    }
  }
}

function packSectionForState(arr, id) {
  let section = { id: id, canvas_id: 1 };
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    section[rowKey] = arr[rowKey].join("");
  }
  return section;
}

function sendPreviewPixel(sectionId, rowKey, x, char) {
  let payload = {
    section_id: sectionId,
    row_key: rowKey,
    x: x,
    char: char,
  };
  $.post("/previewPixel", withEditKey({ json: JSON.stringify(payload) }));
}

function sendPreviewReset(sectionId, sectionRowsObj) {
  let section = pack(sectionRowsObj, sectionId);
  $.post(
    "/previewReset",
    withEditKey({ json: JSON.stringify({ section: section }) }),
  );
}

//post the current selectedArr to the database
function PostObjectToUrl(url, obj) {
  var json, form, input;
  json = JSON.stringify(obj);

  form = document.createElement("form");
  form.method = "post";
  form.action = url;
  input = document.createElement("input");
  input.setAttribute("name", "json");
  input.setAttribute("value", json);
  input.setAttribute("type", "hidden");
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

function subtractPixels(url, val) {
  var form, input;
  form = document.createElement("form");
  form.method = "post";
  form.action = url;
  input = document.createElement("input");
  input.setAttribute("name", "json");
  input.setAttribute("value", val);
  input.setAttribute("type", "hidden");
  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
}

//return color from character
function getColor(char) {
  switch (char) {
    case "G":
      return "rgb(103, 255, 101)";
      break;
    case "A":
      return "rgb(14, 113, 51)";
      break;
    case "Y":
      return "rgb(240, 238, 77)";
      break;
    case "R":
      return "rgb(244, 38, 24)";
      break;
    case "P":
      return "rgb(245, 105, 172)";
      break;
    case "T":
      return "rgb(255, 224, 189)";
      break;
    case "B":
      return "rgb(55, 171, 228)";
      break;
    case "D":
      return "rgb(20, 39, 204)";
      break;
    case "V":
      return "rgb(131, 1, 201)";
      break;
    case "M":
      return "rgb(117, 13, 32)";
      break;
    case "O":
      return "rgb(249, 158, 51)";
      break;
    case "S":
      return "rgb(33, 242, 205)";
      break;
    case "W":
      return "rgb(255, 255, 255)";
      break;
    case "E":
      return "rgb(255, 255, 255)";
      break;
    case "H":
      return "rgb(133, 86, 64)";
      break;
    case "L":
      return "rgb(0, 0, 0)";
      break;
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
    case "!":
    case "@":
    case "#":
    case "$":
    case "%":
    case "^":
    case "&":
    case "*":
    case "(":
    case ")":
    case "-":
    case "_":
    case "+":
    case "=":
    case "[":
    case "]":
    case "{":
    case "}":
      return "rgb(255, 255, 255)";
      break;
    default:
      return "rgb(255, 255, 255)";
  }
}
//return color from character
function getChar(color) {
  switch (color) {
    case "rgb(103, 255, 101)":
      return "G";
      break;
    case "rgb(14, 113, 51)":
      return "A";
      break;
    case "rgb(240, 238, 77)":
      return "Y";
      break;
    case "rgb(244, 38, 24)":
      return "R";
      break;
    case "rgb(245, 105, 172)":
      return "P";
      break;
    case "rgb(255, 224, 189)":
      return "T";
      break;
    case "rgb(55, 171, 228)":
      return "B";
      break;
    case "rgb(20, 39, 204)":
      return "D";
      break;
    case "rgb(131, 1, 201)":
      return "V";
      break;
    case "rgb(117, 13, 32)":
      return "M";
      break;
    case "rgb(249, 158, 51)":
      return "O";
      break;
    case "rgb(33, 242, 205)":
      return "S";
      break;
    case "rgb(255, 255, 255)":
      return "W";
      break;
    case "rgb(133, 86, 64)":
      return "H";
      break;
    case "rgb(0, 0, 0)":
      return "L";
      break;
    default:
      return "E";
  }
}
