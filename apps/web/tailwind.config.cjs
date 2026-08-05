const justui = require("@codellyson/justui/tailwind-preset");

// The preset maps justui's semantic tokens (--bg, --accent, …) onto classes
// like `bg-accent`, which its own components are built from. The dist glob is
// load-bearing: without it Tailwind purges those classes and justui ships
// unstyled. The second path covers pnpm's hoisted node_modules layout.
//
// Everything this app draws itself takes its sizes and colours from the custom
// properties in styles/global.css, so Tailwind is otherwise just layout.
module.exports = {
  presets: [justui],
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
    "./node_modules/@codellyson/justui/dist/**/*.js",
    "../../node_modules/@codellyson/justui/dist/**/*.js",
  ],
};
