const fs = require('fs');

let cssContent = fs.readFileSync('src/index.css', 'utf8');

// Eliminar tema Pergamino
const pergaminoRegex = /\[data-theme="pergamino"\] {[\s\S]*?}\n\n/m;
cssContent = cssContent.replace(pergaminoRegex, '');

// Añadir tema DIREI
const direiTheme = `[data-theme="direi"] {
  /* DIREI (Blanco y Negro) */
  --theme-bg: #000000;
  --theme-bg-alt: #0a0a0a;
  --theme-bg-hover: #141414;
  --theme-bg-darker: #000000;
  --theme-bg-card: #111111;
  --theme-accent: #ffffff;
  --theme-accent-hover: #e0e0e0;
  --theme-muted: #888888;
  --theme-muted-alt: #555555;
  --theme-border: #333333;
  --theme-border-focus: #555555;
  --theme-text: #e0e0e0;
  --theme-text-bright: #ffffff;
  --theme-text-muted: #888888;
  --theme-danger: #ff3333;
  --theme-danger-hover: #ff6666;
}

`;

// Insertar DIREI antes de [data-theme="noche"]
cssContent = cssContent.replace(/\[data-theme="noche"\]/, direiTheme + '[data-theme="noche"]');

fs.writeFileSync('src/index.css', cssContent);

let appContent = fs.readFileSync('src/App.tsx', 'utf8');

const oldButtonRegex = /<button[\s\S]*?theme === 'pergamino'[\s\S]*?<\/button>/m;
const direiButton = `<button 
                  onClick={() => actions.updateUI({ theme: 'direi' })}
                  className={cn("p-3 border transition-colors text-left flex items-center justify-between", uiState?.theme === 'direi' ? "border-dm-accent text-dm-accent bg-dm-accent/10" : "border-dm-border text-dm-muted hover:border-dm-accent hover:text-dm-text")}
                >
                  <span>DIREI</span>
                  <div className="flex gap-1"><div className="w-3 h-3 rounded-full bg-[#000000] border border-[#333333]" /><div className="w-3 h-3 rounded-full bg-[#ffffff] border border-[#333333]" /></div>
                </button>`;

appContent = appContent.replace(oldButtonRegex, direiButton);

fs.writeFileSync('src/App.tsx', appContent);

console.log("DIREI theme added and Pergamino removed!");
