import { Request, Response } from 'express'
import axios from 'axios'
import FormData from 'form-data'
import fs from 'fs'
import AdmZip from 'adm-zip'

// Get the Netlify access token from environment variables
const NETLIFY_ACCESS_TOKEN = process.env.NETLIFY_ACCESS_TOKEN

// Create a new site on Netlify
export const createNetlifySite = async (
  req: Request,
  res: Response
): Promise<void> => {
  try {
    const { projectTitle } = req.body

    if (!NETLIFY_ACCESS_TOKEN) {
      res.status(500).json({ error: 'Netlify access token not configured' })
      return
    }

    // Create a new site on Netlify
    const response = await axios.post(
      'https://api.netlify.com/api/v1/sites',
      {
        name: `${projectTitle}`,
      },
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    )

    // Return the site ID
    res.status(200).json({ siteId: response.data.id })
  } catch (error) {
    console.error('Error creating Netlify site:', error)
    res.status(500).json({ error: 'Failed to create Netlify site' })
  }
}

// Upload a zip file to deploy a Netlify site
export const uploadToNetlify = async (
  req: Request & { file?: Express.Multer.File },
  res: Response
): Promise<void> => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'No file uploaded' })
      return
    }

    if (!NETLIFY_ACCESS_TOKEN) {
      res.status(500).json({ error: 'Netlify access token not configured' })
      return
    }

    const { siteId } = req.body

    // 🔍 Inspect ZIP file contents
    const zip = new AdmZip(req.file.path)
    console.log('[Server ZIP entries]')
    zip.getEntries().forEach((entry) => {
      console.log(' -', entry.entryName)
    })

    // 🔍 Log file size
    const stats = fs.statSync(req.file.path)
    console.log('Uploading ZIP:', req.file.path, 'Size:', stats.size)

    //  Read ZIP file as raw buffer
    const zipBuffer = fs.readFileSync(req.file.path)

    // Upload as raw binary with correct Content-Type
    const response = await axios.post(
      `https://api.netlify.com/api/v1/sites/${siteId}/deploys`,
      zipBuffer,
      {
        headers: {
          Authorization: `Bearer ${NETLIFY_ACCESS_TOKEN}`,
          'Content-Type': 'application/zip',
        },
        maxBodyLength: Infinity, // ensure large zips don't get cut off
      }
    )

    //  Clean up
    fs.unlinkSync(req.file.path)

    // Success
    res.status(200).json({
      deployUrl: response.data.deploy_ssl_url,
      deployId: response.data.id,
    })
  } catch (error) {
    console.error('Error deploying to Netlify:', error)

    // Clean up if needed
    if (req.file && req.file.path) {
      try {
        fs.unlinkSync(req.file.path)
      } catch (unlinkError) {
        console.error('Error deleting temporary file:', unlinkError)
      }
    }

    res.status(500).json({ error: 'Failed to deploy to Netlify' })
  }
}
