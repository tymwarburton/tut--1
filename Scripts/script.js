// Filter the fixtures table by All / Home / Away
const buttons = document.querySelectorAll(".filter");
const rows = document.querySelectorAll("tbody tr");

buttons.forEach(function (button) {
  button.addEventListener("click", function () {
    const filter = button.dataset.filter;

    // Highlight the clicked button
    buttons.forEach(function (b) {
      b.classList.remove("active");
    });
    button.classList.add("active");

    // Show or hide each row
    rows.forEach(function (row) {
      if (filter === "all" || row.classList.contains(filter)) {
        row.style.display = "";
      } else {
        row.style.display = "none";
      }
    });
  });
});

// ---------- Scores ----------
// Scores are stored by week number, e.g. { "1": { "crown": 6, "opp": 3 } }
// They are loaded from scores.json when the page opens.
const STORAGE_KEY = "crownScores";
const editButton = document.getElementById("edit-scores");
const saveButton = document.getElementById("save-scores");
const saveMessage = document.getElementById("save-message");
let scores = {};
let editing = false;

// Add an empty score cell to every row of the table
rows.forEach(function (row) {
  const cell = document.createElement("td");
  cell.className = "score";
  row.appendChild(cell);
});

// Work out the week number and home/away for a row
function getWeek(row) {
  return row.cells[0].textContent.trim();
}

function isFixture(row) {
  return row.classList.contains("home") || row.classList.contains("away");
}

// Show the scores in the table (or input boxes when editing)
function showScores() {
  rows.forEach(function (row) {
    const cell = row.querySelector(".score");
    cell.innerHTML = "";
    row.classList.remove("win", "loss", "draw");

    if (!isFixture(row)) {
      return;
    }

    const week = getWeek(row);
    const score = scores[week];

    if (editing) {
      const crownBox = makeInput(score ? score.crown : "");
      const oppBox = makeInput(score ? score.opp : "");
      crownBox.title = "Crown";
      oppBox.title = "Opponent";

      // Show the boxes in the same order as the fixture (home team first)
      if (row.classList.contains("home")) {
        cell.append(crownBox, " - ", oppBox);
      } else {
        cell.append(oppBox, " - ", crownBox);
      }
      crownBox.dataset.side = "crown";
      oppBox.dataset.side = "opp";
      return;
    }

    if (!score) {
      return;
    }

    // Show the score with the home team's score first
    if (row.classList.contains("home")) {
      cell.textContent = score.crown + " - " + score.opp;
    } else {
      cell.textContent = score.opp + " - " + score.crown;
    }

    // Colour the row by result
    if (score.crown > score.opp) {
      row.classList.add("win");
    } else if (score.crown < score.opp) {
      row.classList.add("loss");
    } else {
      row.classList.add("draw");
    }
  });
}

function makeInput(value) {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.value = value;
  return input;
}

// Read the input boxes back into the scores object
function readInputs() {
  const newScores = {};
  rows.forEach(function (row) {
    if (!isFixture(row)) {
      return;
    }
    const crown = row.querySelector('input[data-side="crown"]').value;
    const opp = row.querySelector('input[data-side="opp"]').value;

    // Only keep scores where both boxes are filled in
    if (crown !== "" && opp !== "") {
      newScores[getWeek(row)] = { crown: Number(crown), opp: Number(opp) };
    }
  });
  return newScores;
}

// Send the scores to the Netlify Function, which commits scores.json to GitHub.
// Netlify then rebuilds the site so everyone sees the new scores.
async function saveScores() {
  const newScores = readInputs();
  saveButton.disabled = true;
  saveMessage.textContent = "Saving...";

  try {
    const response = await fetch("/.netlify/functions/save-scores", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newScores),
    });
    const result = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(result.error || "Save failed");
    }

    scores = newScores;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(scores));
    } catch (error) {
      // Browser storage not available, scores are still saved online
    }
    saveMessage.textContent = "Saved - live for everyone in about a minute.";
  } catch (error) {
    saveButton.disabled = false;
    saveMessage.textContent = "Not saved: " + error.message;
    return; // stay in edit mode so nothing typed is lost
  }

  saveButton.disabled = false;
  editing = false;
  editButton.textContent = "Edit scores";
  saveButton.hidden = true;
  showScores();
}

editButton.addEventListener("click", function () {
  editing = !editing;
  editButton.textContent = editing ? "Cancel" : "Edit scores";
  saveButton.hidden = !editing;
  saveMessage.textContent = "";
  showScores();
});

saveButton.addEventListener("click", saveScores);

// Load scores from scores.json when the page opens.
// If the file can't be loaded, use the copy saved in this browser instead.
async function loadScores() {
  try {
    const response = await fetch("scores.json", { cache: "no-store" });
    if (!response.ok) {
      throw new Error("scores.json not found");
    }
    scores = await response.json();
  } catch (error) {
    try {
      scores = JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
    } catch (storageError) {
      scores = {};
    }
  }
  showScores();
}

loadScores();
