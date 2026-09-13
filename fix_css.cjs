const fs = require('fs');
let cssContent = fs.readFileSync('src/index.css', 'utf8');

const newBody = `body {
  background-color: var(--theme-bg);
  color: var(--theme-text);
}

*, *::before, *::after {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 300ms;
}`;

cssContent = cssContent.replace(
  'body {\n  background-color: var(--theme-bg);\n  color: var(--theme-text);\n}',
  newBody
);

fs.writeFileSync('src/index.css', cssContent);
console.log("CSS transitions added!");
