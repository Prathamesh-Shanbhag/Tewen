"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.basePrompt = void 0;
exports.basePrompt = '<tewenArtifact id=\"project-import\" title=\"Project Files\"><tewenAction type=\"file\" filePath=\"index.js\">// run `node index.js` in the terminal\n\nconsole.log(`Hello Node.js v${process.versions.node}!`);\n</tewenAction><tewenAction type=\"file\" filePath=\"package.json\">{\n  \"name\": \"node-starter\",\n  \"private\": true,\n  \"scripts\": {\n    \"test\": \"echo \\\"Error: no test specified\\\" && exit 1\"\n  }\n}\n</tewenAction></tewenArtifact>';
