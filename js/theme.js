(function () {
  "use strict";

  const root = document.documentElement;
  const button = document.getElementById("theme-toggle-button");
  const themeColorMeta = document.querySelector('meta[name="theme-color"]');
  const systemTheme = window.matchMedia("(prefers-color-scheme: light)");
  let transitionTimeout = null;

  function readStoredTheme() {
    try {
      const savedTheme = window.localStorage.getItem("tema");
      return savedTheme === "light" || savedTheme === "dark" ? savedTheme : null;
    } catch (error) {
      return null;
    }
  }

  let hasSavedPreference = readStoredTheme() !== null;

  function updateTheme(theme, animate) {
    if (animate && root.dataset.theme !== theme) {
      root.classList.add("theme-transition");
      window.getComputedStyle(root).backgroundColor;
    }

    root.dataset.theme = theme;
    themeColorMeta.content = window.getComputedStyle(root).getPropertyValue("--page").trim();
    const nextThemeLabel = theme === "dark" ? "Mudar para tema claro" : "Mudar para tema escuro";
    button.setAttribute("aria-label", nextThemeLabel);
    button.title = nextThemeLabel;

    if (animate) {
      if (transitionTimeout !== null) {
        window.clearTimeout(transitionTimeout);
      }
      transitionTimeout = window.setTimeout(function () {
        root.classList.remove("theme-transition");
        transitionTimeout = null;
      }, 150);
    }
  }

  updateTheme(root.dataset.theme === "light" ? "light" : "dark", false);

  function handleSystemThemeChange(event) {
    if (!hasSavedPreference) {
      updateTheme(event.matches ? "light" : "dark", true);
    }
  }

  if (typeof systemTheme.addEventListener === "function") {
    systemTheme.addEventListener("change", handleSystemThemeChange);
  } else if (typeof systemTheme.addListener === "function") {
    systemTheme.addListener(handleSystemThemeChange);
  }

  button.addEventListener("click", function () {
    const nextTheme = root.dataset.theme === "dark" ? "light" : "dark";
    hasSavedPreference = true;
    try {
      window.localStorage.setItem("tema", nextTheme);
    } catch (error) {
      // Theme selection remains active for this page when storage is unavailable.
    }
    updateTheme(nextTheme, true);
  });
}());
