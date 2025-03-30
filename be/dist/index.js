"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
const netlify_1 = require("./netlify");
console.log('Environment variables loaded');
console.log(`Claude key: ${process.env.ANTHROPIC_API_KEY}`);
const cors_1 = __importDefault(require("cors"));
const anthropic = new sdk_1.default();
// Defaults to ANTHROPIC_API_KEY if set, otherwise uses the key in the .env file
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Configure multer for file uploads
const upload = (0, multer_1.default)({
    dest: path_1.default.join(os_1.default.tmpdir(), 'netlify-uploads'),
    limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});
app.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const prompt = req.body.prompt;
    const response = yield anthropic.messages.create({
        messages: [{ role: 'user', content: prompt }],
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 200,
        system: "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
    });
    const answer = response.content[0].text; // React or Node
    if (answer == 'react') {
        res.json({
            prompts: [
                prompts_1.BASE_PROMPT,
                `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
            ],
            uiPrompts: [react_1.basePrompt],
        });
        return;
    }
    if (answer == 'node') {
        res.json({
            prompts: [
                `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
            ],
            uiPrompts: [node_1.basePrompt],
        });
        return;
    }
    res.status(403).json({ message: 'Not one of the allowed frameworks' });
    return;
}));
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const messages = req.body.messages;
    const response = yield anthropic.messages.create({
        messages: messages,
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 8000,
        system: (0, prompts_1.getSystemPrompt)(),
    });
    console.log(response);
    // Extract the raw text from the response
    const rawText = ((_a = response.content[0]) === null || _a === void 0 ? void 0 : _a.text) || '';
    // Extract the title from the response using regex
    const titleMatch = rawText.match(/<tewenArtifact id="[^"]*" title="([^"]*)">/);
    const title = titleMatch ? titleMatch[1] : 'New Project';
    // Extract the initial text description (everything before the first <tewen tag)
    let description = '';
    const firstTagIndex = rawText.indexOf('<tewen');
    if (firstTagIndex > 0) {
        description = rawText.substring(0, firstTagIndex).trim();
    }
    // Format the response for the frontend
    const formattedResponse = {
        title: title,
        description: description,
    };
    res.json({
        // response: rawText,
        formattedResponse: formattedResponse,
    });
}));
// Add Netlify deployment routes
app.post('/deploy-netlify', netlify_1.createNetlifySite);
app.post('/upload-netlify', upload.single('file'), (req, res) => {
    (0, netlify_1.uploadToNetlify)(req, res);
});
app.listen(3000);
// async function main() {
//     anthropic.messages.stream({
//         messages: [{role: 'user', content: "Hello"}],
//         model: 'claude-3-5-sonnet-20241022',
//         max_tokens: 1024,
//         system: getSystemPrompt()
//     }).on('text', (text) => {
//         console.log(text);
//     });
//     }
//     main();
