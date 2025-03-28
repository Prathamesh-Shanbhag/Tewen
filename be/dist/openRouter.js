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
const openai_1 = __importDefault(require("openai"));
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
const cors_1 = __importDefault(require("cors"));
console.log('Environment variables loaded');
console.log(`OpenRouter key: ${process.env.OPENROUTER_API_KEY ? 'is set' : 'is missing'}`);
const app = (0, express_1.default)();
app.use((0, cors_1.default)({
    origin: 'http://localhost:5173', // Adjust this to your frontend URL
    credentials: true,
}));
app.use(express_1.default.json());
const openai = new openai_1.default({
    baseURL: 'https://openrouter.ai/api/v1',
    apiKey: process.env.OPENROUTER_API_KEY,
    // defaultHeaders: {
    //   'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
    //   'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
    // },
});
app.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    console.log('Template request received:', req.body); // Log the request body
    try {
        const prompt = req.body.prompt || '';
        // Default to 'react' if no prompt is provided or if the API call fails
        let framework = 'react';
        try {
            const response = yield openai.chat.completions.create({
                model: 'google/gemini-2.0-pro-exp-02-05:free',
                messages: [{ role: 'user', content: prompt }],
            });
            const answer = (_a = response.choices[0].message.content) === null || _a === void 0 ? void 0 : _a.trim();
            console.log('Framework detection result:', answer);
            if (answer === 'react' || answer === 'node') {
                framework = answer;
            }
        }
        catch (apiError) {
            console.error('Error calling OpenRouter API:', apiError);
            // Continue with default framework
        }
        console.log('Using framework:', framework);
        if (framework === 'react') {
            res.json({
                prompts: [
                    prompts_1.BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${react_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [react_1.basePrompt],
            });
            return;
        }
        if (framework === 'node') {
            res.json({
                prompts: [
                    prompts_1.BASE_PROMPT,
                    `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${node_1.basePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
                ],
                uiPrompts: [node_1.basePrompt],
            });
            return;
        }
        // This should never happen with our default fallback, but just in case
        res.status(400).json({ message: 'Invalid framework detected' });
    }
    catch (error) {
        console.error('Error in /template:', error);
        res
            .status(500)
            .json({ message: 'Internal Server Error', error: String(error) });
    }
}));
app.post('/chat', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    try {
        const messages = req.body.messages;
        const response = yield fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-pro-exp-02-05:free',
                messages: [messages, { role: 'system', content: (0, prompts_1.getSystemPrompt)() }],
                stream: true,
            }),
        });
        const reader = (_a = response.body) === null || _a === void 0 ? void 0 : _a.getReader();
        if (!reader) {
            throw new Error('Response body is not readable');
        }
        const decoder = new TextDecoder();
        let buffer = '';
        try {
            while (true) {
                const { done, value } = yield reader.read();
                if (done)
                    break;
                buffer += decoder.decode(value, { stream: true });
                while (true) {
                    const lineEnd = buffer.indexOf('\n');
                    if (lineEnd === -1)
                        break;
                    const line = buffer.slice(0, lineEnd).trim();
                    buffer = buffer.slice(lineEnd + 1);
                    if (line.startsWith('data: ')) {
                        const data = line.slice(6);
                        if (data === '[DONE]')
                            break;
                        try {
                            const parsed = JSON.parse(data);
                            const content = parsed.choices[0].delta.content;
                            if (content) {
                                console.log(content);
                            }
                        }
                        catch (e) {
                            // Ignore invalid JSON
                        }
                    }
                }
            }
        }
        finally {
            reader.cancel();
        }
        res.json({
            response: 'Streaming response handled',
        });
    }
    catch (error) {
        console.error('Error in /chat:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
}));
app.listen(3000, () => console.log('Server running on port 3000'));
