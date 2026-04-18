#!/usr/bin/env node
const fs   = require('fs');
const path = require('path');

const ROOT     = __dirname;
const TEMPLATE = path.join(ROOT, 'src/template.html');
const OUT      = path.join(ROOT, 'index.html');

const INCLUDE_RE = /(?:\/\*|\/\/|<!--)\s*@include\s+([\w/.-]+)\s*(?:\*\/|-->)?/g;

const template = fs.readFileSync(TEMPLATE, 'utf8');

const result = template.replace(INCLUDE_RE, (_, file) => {
  const filePath = path.join(ROOT, file.trim());
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${file}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, 'utf8');
});

fs.writeFileSync(OUT, result);
console.log(`Built → index.html (${(result.length / 1024).toFixed(1)} KB)`);
