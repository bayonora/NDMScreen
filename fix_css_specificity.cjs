const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');

css = css.replace(/\[data-theme="direi"\]/g, ':root[data-theme="direi"]');
css = css.replace(/\[data-theme="noche"\]/g, ':root[data-theme="noche"]');
css = css.replace(/\[data-theme="sangre"\]/g, ':root[data-theme="sangre"]');

fs.writeFileSync('src/index.css', css);
console.log('Fixed specificity in index.css');
