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
const form_data_1 = __importDefault(require("form-data"));
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
            name: `${projectTitle}-${Date.now()}`,
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
        const zip = new adm_zip_1.default(req.file.path);
        console.log('[Server ZIP entries]');
        zip.getEntries().forEach((entry) => {
            console.log(' -', entry.entryName);
        });
        // Create a FormData object to upload the file
        const formData = new form_data_1.default();
        formData.append('file', fs_1.default.createReadStream(req.file.path), {
            filename: 'site.zip',
            contentType: 'application/zip',
        });
        const stats = fs_1.default.statSync(req.file.path);
        console.log('Uploading ZIP:', req.file.path, 'Size:', stats.size);
        // Deploy the site by uploading the zip file and setting production to true
        const response = yield axios_1.default.post(`https://api.netlify.com/api/v1/sites/${siteId}/deploys?production=true`, formData, {
            headers: Object.assign({ Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}` }, formData.getHeaders()),
        });
        // Clean up the temporary file
        fs_1.default.unlinkSync(req.file.path);
        // Return the deployed URL
        res.status(200).json({
            deployUrl: response.data.deploy_ssl_url,
            deployId: response.data.id,
        });
    }
    catch (error) {
        console.error('Error deploying to Netlify:', error);
        // Clean up the temporary file if it exists
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
