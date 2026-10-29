(function () {
  try {
    var stored = localStorage.getItem("janeth-theme");
    var theme =
      stored === "light" || stored === "dark" || stored === "system" ? stored : "light";
    var dark =
      theme === "dark" ||
      (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
  } catch (e) {
    /* sin localStorage no interrumpimos la app */
  }
})();
