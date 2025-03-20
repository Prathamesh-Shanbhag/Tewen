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
const generative_ai_1 = require("@google/generative-ai");
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
console.log('Environment variables loaded');
const cors_1 = __importDefault(require("cors"));
// Initialize the Google Generative AI client
const genAI = new generative_ai_1.GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    // systemInstruction: ONE_ANSWER_PROMPT,
});
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
app.post('/template', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const prompt = req.body.prompt;
    try {
        // Using the correct format for Gemini API
        const result = yield model.generateContent([{ text: prompt }]);
        const answer = result.response.text().trim(); // React or Node
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
    const messages = req.body.messages;
    try {
        // Convert messages format from Anthropic to Gemini format
        const chatHistory = [];
        for (const msg of messages) {
            chatHistory.push({
                role: msg.role === 'assistant' ? 'model' : msg.role, // Convert 'assistant' to 'model' for Gemini
                parts: [{ text: msg.content }],
            });
        }
        // Log the output of getSystemPrompt()
        const systemPrompt = (0, prompts_1.systemPromptJson)();
        console.log('System Prompt:', systemPrompt); // Log the system prompt
        // Create a chat session with the system prompt
        const chat = model.startChat({
            generationConfig: {
                maxOutputTokens: 8000,
            },
            history: chatHistory.slice(0, -1), // All messages except the last one
            systemInstruction: systemPrompt, // Use getSystemPrompt() here
        });
        // Send the last message to get a response
        const lastMessage = messages[messages.length - 1];
        const response = yield chat.sendMessage(lastMessage.content);
        console.log(response);
        res.json({
            response: response.response.text(),
        });
    }
    catch (error) {
        console.error('Error in chat endpoint:', error);
        res.status(500).json({ message: 'Error processing request' });
    }
}));
app.listen(3000);
// Commented out streaming implementation for future reference
// async function main() {
//   const result = await model.generateContentStream([
//     { text: "Hello" }
//   ])
//
//   for await (const chunk of result.stream) {
//     console.log(chunk.text());
//   }
// }
//
// main();
