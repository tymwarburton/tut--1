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
