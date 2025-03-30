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
exports.uploadToNetlify = exports.createNetlifySite = void 0;
const axios_1 = __importDefault(require("axios"));
const fs_1 = __importDefault(require("fs"));
const adm_zip_1 = __importDefault(require("adm-zip"));
// Get the Netlify access token from environment variables
const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN;
// Create a new site on Netlify
const createNetlifySite = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        const { projectTitle } = req.body;
        if (!NETLIFY_ACCESS_TOKEN) {
            res.status(500).json({ error: 'Netlify access token not configured' });
            return;
        }
        // Create a new site on Netlify
        const response = yield axios_1.default.post('https://api.netlify.com/api/v1/sites', {
            name: `${projectTitle}`,
        }, {
            headers: {
                Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
            },
        });
        // Return the site ID
        res.status(200).json({ siteId: response.data.id });
    }
    catch (error) {
        console.error('Error creating Netlify site:', error);
        res.status(500).json({ error: 'Failed to create Netlify site' });
    }
});
exports.createNetlifySite = createNetlifySite;
// Upload a zip file to deploy a Netlify site
const uploadToNetlify = (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    try {
        if (!req.file) {
            res.status(400).json({ error: 'No file uploaded' });
            return;
        }
        if (!NETLIFY_ACCESS_TOKEN) {
            res.status(500).json({ error: 'Netlify access token not configured' });
            return;
        }
        const { siteId } = req.body;
        // 🔍 Inspect ZIP file contents
        const zip = new adm_zip_1.default(req.file.path);
        console.log('[Server ZIP entries]');
        zip.getEntries().forEach((entry) => {
            console.log(' -', entry.entryName);
        });
        // 🔍 Log file size
        const stats = fs_1.default.statSync(req.file.path);
        console.log('Uploading ZIP:', req.file.path, 'Size:', stats.size);
        //  Read ZIP file as raw buffer
        const zipBuffer = fs_1.default.readFileSync(req.file.path);
        // Upload as raw binary with correct Content-Type
        const response = yield axios_1.default.post(`https://api.netlify.com/api/v1/sites/${siteId}/deploys`, zipBuffer, {
            headers: {
                Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
                'Content-Type': 'application/zip',
            },
            maxBodyLength: Infinity, // ensure large zips don't get cut off
        });
        //  Clean up
        fs_1.default.unlinkSync(req.file.path);
        // Success
        res.status(200).json({
            deployUrl: response.data.deploy_ssl_url,
            deployId: response.data.id,
        });
    }
    catch (error) {
        console.error('Error deploying to Netlify:', error);
        // Clean up if needed
        if (req.file && req.file.path) {
            try {
                fs_1.default.unlinkSync(req.file.path);
            }
            catch (unlinkError) {
                console.error('Error deleting temporary file:', unlinkError);
            }
        }
        res.status(500).json({ error: 'Failed to deploy to Netlify' });
    }
});
exports.uploadToNetlify = uploadToNetlify;
