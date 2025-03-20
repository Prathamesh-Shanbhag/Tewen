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
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const prompts_1 = require("./prompts");
const react_1 = require("./defaults/react");
const node_1 = require("./defaults/node");
console.log('Environment variables loaded');
console.log(`Claude key: ${process.env.ANTHROPIC_API_KEY}`);
const cors_1 = __importDefault(require("cors"));
const anthropic = new sdk_1.default();
// Defaults to ANTHROPIC_API_KEY if set, otherwise uses the key in the .env file
const app = (0, express_1.default)();
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Create a public directory for deployments if it doesn't exist
const deploymentDir = path_1.default.join(__dirname, '../deployments');
if (!fs_1.default.existsSync(deploymentDir)) {
    fs_1.default.mkdirSync(deploymentDir, { recursive: true });
}
// Create a public directory for hosting if it doesn't exist
const publicDir = path_1.default.join(__dirname, '../public');
if (!fs_1.default.existsSync(publicDir)) {
    fs_1.default.mkdirSync(publicDir, { recursive: true });
}
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
    // Redundacy Function for backend extraction in case front-end extraction fails.
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
        response: rawText,
        formattedResponse: formattedResponse,
    });
}));
app.post('/deploy', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { files, projectTitle } = req.body;
        if (!files || !Array.isArray(files) || !projectTitle) {
            return res.status(400).json({
                error: 'Invalid request. Files array and project title are required.',
            });
        }
        // Sanitize the project title to make it safe for file system
        const sanitizedTitle = projectTitle
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '');
        // Create the project directory
        const projectDir = path_1.default.join(deploymentDir, sanitizedTitle);
        const publicProjectDir = path_1.default.join(publicDir, sanitizedTitle);
        // Remove the directory if it already exists
        if (fs_1.default.existsSync(projectDir)) {
            fs_1.default.rmdirSync(projectDir, { recursive: true });
        }
        if (fs_1.default.existsSync(publicProjectDir)) {
            fs_1.default.rmdirSync(publicProjectDir, { recursive: true });
        }
        // Create the project directory
        fs_1.default.mkdirSync(projectDir, { recursive: true });
        fs_1.default.mkdirSync(publicProjectDir, { recursive: true });
        // Function to recursively create files and directories
        const createFilesRecursively = (items, baseDir, publicBaseDir) => {
            items.forEach((item) => {
                if (item.type === 'folder') {
                    // Create folder
                    const folderPath = path_1.default.join(baseDir, item.name);
                    const publicFolderPath = path_1.default.join(publicBaseDir, item.name);
                    if (!fs_1.default.existsSync(folderPath)) {
                        fs_1.default.mkdirSync(folderPath, { recursive: true });
                    }
                    if (!fs_1.default.existsSync(publicFolderPath)) {
                        fs_1.default.mkdirSync(publicFolderPath, { recursive: true });
                    }
                    // Recursively create children
                    if (item.children && Array.isArray(item.children)) {
                        createFilesRecursively(item.children, folderPath, publicFolderPath);
                    }
                }
                else if (item.type === 'file') {
                    // Create file
                    const filePath = path_1.default.join(baseDir, item.name);
                    const publicFilePath = path_1.default.join(publicBaseDir, item.name);
                    fs_1.default.writeFileSync(filePath, item.content || '');
                    fs_1.default.writeFileSync(publicFilePath, item.content || '');
                }
            });
        };
        // Create files and directories
        createFilesRecursively(files, projectDir, publicProjectDir);
        // Save metadata about the deployment
        const metadata = {
            projectTitle,
            deploymentDate: new Date().toISOString(),
            fileCount: files.length,
        };
        fs_1.default.writeFileSync(path_1.default.join(projectDir, 'metadata.json'), JSON.stringify(metadata, null, 2));
        // Create a simple index.html that redirects to the actual index if it doesn't exist
        const indexPath = path_1.default.join(publicProjectDir, 'index.html');
        if (!fs_1.default.existsSync(indexPath)) {
            // Look for an index file in any subfolder
            let foundIndex = false;
            const findIndexFile = (dir) => {
                const items = fs_1.default.readdirSync(dir, { withFileTypes: true });
                for (const item of items) {
                    const itemPath = path_1.default.join(dir, item.name);
                    if (item.isDirectory()) {
                        if (findIndexFile(itemPath)) {
                            foundIndex = true;
                            return true;
                        }
                    }
                    else if (item.name === 'index.html') {
                        // Create a redirect in the root
                        const relativePath = path_1.default.relative(publicProjectDir, itemPath);
                        fs_1.default.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${relativePath.replace(/\\/g, '/')}">
</head>
<body>
  Redirecting...
</body>
</html>`);
                        foundIndex = true;
                        return true;
                    }
                }
                return false;
            };
            findIndexFile(publicProjectDir);
            // If no index.html was found, create a basic one
            if (!foundIndex) {
                fs_1.default.writeFileSync(indexPath, `<!DOCTYPE html>
<html>
<head>
  <title>${projectTitle}</title>
</head>
<body>
  <h1>${projectTitle}</h1>
  <p>Deployed website</p>
</body>
</html>`);
            }
        }
        // Return success with the deployment URL
        // Note: In a real environment, you'd use your hosting URL
        const deployUrl = `http://localhost:3000/sites/${sanitizedTitle}`;
        res.json({
            success: true,
            message: 'Project deployed successfully',
            deployUrl: deployUrl,
            projectDir: sanitizedTitle,
        });
    }
    catch (error) {
        console.error('Deployment error:', error);
        res.status(500).json({
            error: 'Failed to deploy project',
            details: error.message,
        });
    }
}));
// Serve static files from the public directory
app.use('/sites', express_1.default.static(publicDir));
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
