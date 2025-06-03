var sectionSize = 128,
  sectionRows = 3,
  sectionCols = 5,
  modalUp = false,
  userPixels = 0,
  pixelsUsed = 0,
  sectionArr = [],
  sectionId = "",
  sectionPos = "",
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
var modal = document.getElementById("myModal");
var modalCanvas = $("#modalCanvas");
var palette = $("#palette");
var colorDiv = $("#colorDiv");

//on document ready
$(document).ready(function () {
  $.get("/data").then(function (data) {
    var fullPic = unpack(data);
    drawCanvas(fullPic);

    //click on section to open modal edit window
    $("#canvasFrame").click(function (event) {
      let secDiv = event.target.parentElement;
      if (secDiv.classList.contains("section")) {
        modalUp = true;
        sectionPos = secDiv.id;
        sectionId = getId(sectionPos);
        sectionArr = copyArr(fullPic[secDiv.id]);
        modal.style.display = "flex";
        drawSection(sectionArr, sectionId);
        selectColor(selectedColor);
      }
    });

    //change selected color
    $("#palette").click(function (event) {
      selectedColor = event.target.style.backgroundColor;
      selectColor(event.target.style.backgroundColor);
    });

    //change color of section pixels and update the selected Array
    $("#modalCanvas").click(function (event) {
      if (event.target.classList.contains("editPixel")) {
        if (userPixels > 0 && pixelsUsed < userPixels) {
          let yy = event.target.getAttribute("y");
          let xx = event.target.getAttribute("x");
          if (event.target.style.backgroundColor != selectedColor) {
            sectionArr[yy][xx] = getChar(selectedColor);
            event.target.style.backgroundColor = selectedColor;
            pixelsUsed += 1;
            $("#spendPixels").text(pixelsUsed);
          }
        } else {
          console.log("Modal Error");
        }
      }
    });

    //cancel button on modal window
    $("#modalCancel").click(function () {
      modalUp = false;
      modal.style.display = "none";
      modalCanvas.empty();
      palette.empty();
      selectedColor = "rgb(255, 255, 255)";
    });

    //submit edited section to the DB canvas
    $("#modalSubmit").click(function () {
      let newData = pack(sectionArr, sectionId);
      PostObjectToUrl("/updateCanvas", {
        section: newData,
        pixels: pixelsUsed,
      });
    });

    //clear the edits, array, and pixels used in the section
    $("#modalClear").click(function () {
      sectionArr = copyArr(fullPic[sectionPos]);
      drawSection(sectionArr, sectionPos);
      pixelsUsed = 0;
      $("#spendPixels").text(pixelsUsed);
    });
  });
});

//initialize the canvas from DB
function drawCanvas(arr) {
  let canvas = $("#canvasFrame");
  for (let foo in arr) {
    let tempSection = document.createElement("div");
    tempSection.style.width = sectionSize + "px";
    tempSection.style.height = sectionSize + "px";
    tempSection.className = "section";
    tempSection.id = foo;
    tempSection.innerHTML = "<p class='posP'>" + foo + "</p>";
    canvas.append(tempSection);
    
    // Create pixels for each row in the section
    for (let i = 0; i < 16; i++) {
      let rowKey = "row_" + i;
      let rowData = arr[foo][rowKey];
      if (rowData) {
        for (let n = 0; n < rowData.length; n++) {
          let tempPixel = document.createElement("div");
          tempPixel.className = "pixel";
          tempPixel.style.width = sectionSize / 16 + "px";
          tempPixel.style.height = sectionSize / 16 + "px";
          tempPixel.style.backgroundColor = getColor(rowData[n]);
          tempSection.append(tempPixel);
        }
      }
    }
  }
}

//create single selected section with color palette
function drawSection(arr, pos) {
  $("#modalPos").text(pos);
  $("#spendPixels").text(pixelsUsed);
  modalCanvas.empty();
  palette.empty();
  let tempPixel = $("#userPixels").text();
  userPixels = +tempPixel;

  // Create a 16x16 grid of pixels
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    let rowData = arr[rowKey];
    if (rowData) {
      for (let n = 0; n < rowData.length; n++) {
        let tempDiv = document.createElement("div");
        tempDiv.className = "editPixel";
        tempDiv.style.backgroundColor = getColor(rowData[n]);
        tempDiv.setAttribute("y", rowKey);
        tempDiv.setAttribute("x", n);
        modalCanvas.append(tempDiv);
      }
    }
  }

  // Create color palette
  for (let i = 0; i < colors.length; i++) {
    let colorDiv = document.createElement("div");
    colorDiv.className = "color";
    colorDiv.style.backgroundColor = getColor(colors[i]);
    palette.append(colorDiv);
  }
}

//update selected color div and variable
function selectColor(color) {
  colorDiv.empty();
  let tempDiv = document.createElement("div");
  tempDiv.className = "color";
  tempDiv.style.backgroundColor = color;
  colorDiv.append(tempDiv);
}

//unpack the data from its string form
function unpack(arr) {
  let tempArr = {};
  for (let i = 0; i < arr.length; i++) {
    let y = Math.floor(i / sectionCols);
    let x = i % sectionCols;
    let pos = y + "," + x;
    tempArr[pos] = arr[i];
  }
  return tempArr;
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
  if (stringA === "0") {
    return +stringB + 1;
  } else if (stringA === "1") {
    return +stringB + 6;
  } else if (stringA === "2") {
    return +stringB + 11;
  }
}

//copy the array into a NEW copy
function copyArr(arr) {
  let newArr = {};
  
  // Copy each row
  for (let i = 0; i < 16; i++) {
    let rowKey = "row_" + i;
    if (arr[rowKey]) {
      newArr[rowKey] = arr[rowKey].split('');
    }
  }
  return newArr;
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
      return "rgb(196, 196, 196)";
      break;
    case "H":
      return "rgb(133, 86, 64)";
      break;
    case "L":
      return "rgb(0, 0, 0)";
      break;
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
    case "rgb(196, 196, 196)":
      return "E";
      break;
    case "rgb(133, 86, 64)":
      return "H";
      break;
    case "rgb(0, 0, 0)":
      return "L";
      break;
  }
}
