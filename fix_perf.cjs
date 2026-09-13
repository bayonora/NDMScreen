const fs = require('fs');
let appContent = fs.readFileSync('src/App.tsx', 'utf8');

// Replace: const { uiState } = useStore();
appContent = appContent.replace(
  'const { uiState } = useStore();',
  'const theme = useStore((state) => state.uiState?.theme) || \'clasico\';'
);

// Replace uiState?.theme in useEffect
appContent = appContent.replace(
  /uiState\?\.theme \|\| 'clasico'/g,
  'theme'
);
appContent = appContent.replace(
  /\[uiState\?\.theme\]/g,
  '[theme]'
);

// Replace uiState?.theme in settings panel
appContent = appContent.replace(
  /uiState\?\.theme === 'clasico' \|\| !uiState\?\.theme/g,
  'theme === \'clasico\''
);

appContent = appContent.replace(
  /uiState\?\.theme === 'direi'/g,
  'theme === \'direi\''
);

appContent = appContent.replace(
  /uiState\?\.theme === 'noche'/g,
  'theme === \'noche\''
);

appContent = appContent.replace(
  /uiState\?\.theme === 'sangre'/g,
  'theme === \'sangre\''
);

fs.writeFileSync('src/App.tsx', appContent);
console.log("App.tsx performance fixed!");
