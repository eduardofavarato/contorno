#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const ROOT     = __dirname;
const TEMPLATE = path.join(ROOT, 'src/template.html');
const OUT      = path.join(ROOT, process.env.CONTORNO_BUILD_OUT || 'index.html');

// `@include file` inlines a file as-is; `@include-module file` also strips ES `export` keywords,
// so modules shared with the server (shared/) run as plain scripts in the page.
const INCLUDE_RE = /(?:\/\*|\/\/|<!--)\s*@include(-module)?\s+([\w/.@-]+)\s*(?:\*\/|-->)?/g;

const template = fs.readFileSync(TEMPLATE, 'utf8');

const result = template.replace(INCLUDE_RE, (_, isModule, file) => {
  const filePath = path.join(ROOT, file.trim());
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }
  const content = fs.readFileSync(filePath, 'utf8');
  return isModule ? content.replace(/^export\s+/gm, '') : content;
});

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, result);
console.log(`Built → ${path.relative(ROOT, OUT)} (${(result.length / 1024).toFixed(1)} KB)`);
