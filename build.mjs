// Builds the published app from the readable source.
//   src/index.html  →  index.html (code minified, renamed and encoded so it cannot be read or copied easily)
// Run after every change:  node build.mjs
import { readFileSync, writeFileSync } from 'fs';
import { createRequire } from 'module';
import { randomBytes } from 'crypto';
const require = createRequire(import.meta.url);
let esbuild;
for (const p of ['esbuild', '/opt/npm-tools/node_modules/esbuild']) { try { esbuild = require(p); break; } catch {} }
if (!esbuild) { console.error('esbuild is needed: npm install esbuild'); process.exit(1); }

function encode(code) {
  const key = randomBytes(32), data = Buffer.from(code, 'utf8');
  for (let i = 0; i < data.length; i++) data[i] ^= key[i % key.length];
  return `(function(){var k=[${[...key].join(',')}],d=atob("${data.toString('base64')}"),b=new Uint8Array(d.length);for(var i=0;i<d.length;i++)b[i]=d.charCodeAt(i)^k[i%k.length];(0,eval)(new TextDecoder().decode(b))})();`;
}
let html = readFileSync('src/index.html', 'utf8').replace(/<!--[\s\S]*?-->/g, '');
html = html.replace(/<style>([\s\S]*?)<\/style>/g, (_, css) => `<style>${esbuild.transformSync(css, { loader: 'css', minify: true }).code.trim()}</style>`);
html = html.replace(/<script>([\s\S]*?)<\/script>/g, (_, js) => {
  // Wrap in a function so every name inside can be shortened, then encode the result.
  const min = esbuild.transformSync(`(()=>{${js}\n})();`, { loader: 'js', minify: true, legalComments: 'none', target: 'es2020' }).code;
  return `<script>${encode(min)}</script>`;
});
html = html.replace(/\n\s*\n+/g, '\n');
writeFileSync('index.html', html);
console.log(`index.html built: ${(html.length / 1024).toFixed(0)} KB`);
