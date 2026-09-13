const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

if (!appContent.includes("console.log('Current theme:', theme);")) {
  appContent = appContent.replace(
    "document.documentElement.setAttribute('data-theme', theme);",
    "console.log('Current theme:', theme);\n    document.documentElement.setAttribute('data-theme', theme);"
  );
  fs.writeFileSync('src/App.tsx', appContent);
}
