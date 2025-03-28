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
const genai_1 = require("@google/genai");
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
console.log('Environment variables loaded');
const cors_1 = __importDefault(require("cors"));
const ai = new genai_1.GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
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
    var _a;
    const messages = req.body.messages;
    try {
        const formattedMessages = Array.isArray(messages)
            ? messages.map((msg) => ({
                role: msg.role,
                parts: [{ text: msg.content }],
            }))
            : [{ role: 'user', parts: [{ text: JSON.stringify(messages) }] }];
        const codeResponse = yield ai.models.generateContent({
            model: 'gemini-2.5-pro-exp-03-25',
            contents: formattedMessages,
            config: {
                systemInstruction: (0, prompts_1.getSystemPrompt)(),
            },
        });
        const responseText = (_a = codeResponse === null || codeResponse === void 0 ? void 0 : codeResponse.text) !== null && _a !== void 0 ? _a : 'No response from model';
        let rawText = responseText;
        console.log('rawText::', rawText);
        // Extract the title from the response using improved regex
        const titleMatch = rawText.match(/<tewenArtifact[^>]*title="([^"]*)"/);
        const title = titleMatch ? titleMatch[1] : null;
        console.log('title::', title);
        // Extract the first full sentence from the description
        let description = '';
        const firstTagIndex = rawText.indexOf('<tewen');
        if (firstTagIndex > 0) {
            const initialText = rawText.substring(0, firstTagIndex).trim();
            // Find the first sentence (ending with period, question mark, or exclamation point)
            const sentenceMatch = initialText.match(/^(.*?[.!?])\s/);
            description = sentenceMatch ? sentenceMatch[1] : initialText;
        }
        console.log('description::', description);
        // Extract the steps from the response using improved regex
        const stepsMatch = rawText.match(/<tewenAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/tewenAction>/g);
        console.log('stepsMatch::', stepsMatch);
        // let match
        // while ((match = stepsMatch.exec(rawText)) !== null) {
        //   console.log('match::', match)
        // }
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
app.listen(3000);
