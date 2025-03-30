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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require('dotenv').config();
const express_1 = __importDefault(require("express"));
const genai_1 = require("@google/genai");
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
const multer_1 = __importDefault(require("multer"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const netlify_1 = require("./netlify");
console.log('Environment variables loaded');
const cors_1 = __importDefault(require("cors"));
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
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
    try {
        // Using the correct format for Gemini API
        const response = yield ai.models.generateContent({
            model: 'gemini-2.5-pro-exp-03-25',
            contents: prompt,
            config: {
                systemInstruction: `Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra`,
            },
        });
        console.log(response.text);
        const answer = response.text; // React or Node
        if (answer === 'react' || answer === 'node') {
            res.json({
                prompts: [
                    ...(answer === 'react' ? [prompts_1.BASE_PROMPT] : []),
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${answer === 'react' ? react_1.basePrompt : node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [answer === 'react' ? react_1.basePrompt : node_1.basePrompt],
            });
            return;
        }
        res.status(403).json({ message: 'Not one of the allowed frameworks' });
        return;
    }
    catch (error) {
        console.error('Error in template endpoint:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
}));
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, e_1, _b, _c;
    const messages = req.body.messages;
    try {
        const formattedMessages = Array.isArray(messages)
            ? messages.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }))
            : [{ role: 'user', parts: [{ text: JSON.stringify(messages) }] }];
        const codeResponse = yield ai.models.generateContentStream({
            model: 'gemini-2.5-pro-exp-03-25',
            contents: formattedMessages,
            config: {
                systemInstruction: (0, prompts_1.getSystemPrompt)(),
            },
        });
        let responseText = '';
        try {
            for (var _d = true, codeResponse_1 = __asyncValues(codeResponse), codeResponse_1_1; codeResponse_1_1 = yield codeResponse_1.next(), _a = codeResponse_1_1.done, !_a; _d = true) {
                _c = codeResponse_1_1.value;
                _d = false;
                const chunk = _c;
                if (chunk.text) {
                    responseText += chunk.text;
                    console.log(chunk.text); // Optional: stream to client or console
                }
            }
        }
        catch (e_1_1) { e_1 = { error: e_1_1 }; }
        finally {
            try {
                if (!_d && !_a && (_b = codeResponse_1.return)) yield _b.call(codeResponse_1);
            }
            finally { if (e_1) throw e_1.error; }
        }
        let rawText = responseText;
        // console.log('rawText::', rawText)
        // Extract the title from the response using improved regex
        const titleMatch = rawText.match(/<tewenArtifact[^>]*title="([^"]*)"/);
        const title = titleMatch ? titleMatch[1] : null;
        console.log('title::', title);
        // Extract the first full sentence from the description
        let description = '';
        const firstTagIndex = rawText.indexOf('<tewenArtifact');
        if (firstTagIndex > 0) {
            // Get all text before the first tag, not just the first sentence
            description = rawText.substring(0, firstTagIndex).trim();
        }
        console.log('description::', description);
        // Extract the steps from the response using improved regex
        const stepsMatch = rawText.match(/<tewenAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/tewenAction>/g);
        // console.log('stepsMatch::', stepsMatch)
        // Format the response for the frontend
        const formattedResponse = {
            title: title,
            description: description,
        };
        res.json({
            response: rawText,
            formattedResponse: formattedResponse,
        });
    }
    catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({
            error: 'Failed to process request',
            details: error.message || String(error),
        });
    }
}));
// Add Netlify deployment routes
app.post('/deploy-netlify', netlify_1.createNetlifySite);
app.post('/upload-netlify', upload.single('file'), (req, res) => {
    (0, netlify_1.uploadToNetlify)(req, res);
});
app.listen(3000);
