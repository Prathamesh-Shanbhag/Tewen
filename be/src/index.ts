require('dotenv').config()
import express from 'express'
import path from 'path'
import fs from 'fs'
import Anthropic from '@anthropic-ai/sdk'
import { BASE_PROMPT, getSystemPrompt } from './prompts'
import { TextBlock } from '@anthropic-ai/sdk/resources'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'
console.log('Environment variables loaded')
console.log(`Claude key: ${process.env.ANTHROPIC_API_KEY}`)
import cors from 'cors'
import { Request, Response } from 'express'

const anthropic = new Anthropic()
// Defaults to ANTHROPIC_API_KEY if set, otherwise uses the key in the .env file

const app = express()
app.use(cors())
app.use(express.json())

// Create a public directory for deployments if it doesn't exist
const deploymentDir = path.join(__dirname, '../deployments')
if (!fs.existsSync(deploymentDir)) {
  fs.mkdirSync(deploymentDir, { recursive: true })
}

// Create a public directory for hosting if it doesn't exist
const publicDir = path.join(__dirname, '../public')
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true })
}

// Define the FileItem interface directly here
interface FileItem {
  name: string
  type: 'file' | 'folder'
  path?: string
  content?: string
  children?: FileItem[]
}

app.post('/template', async (req, res) => {
  const prompt = req.body.prompt
  const response = await anthropic.messages.create({
    messages: [{ role: 'user', content: prompt }],
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 200,
    system:
      "Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra",
  })
  const answer = (response.content[0] as TextBlock).text // React or Node
  if (answer == 'react') {
    res.json({
      prompts: [
        BASE_PROMPT,
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [reactBasePrompt],
    })
    return
  }
  if (answer == 'node') {
    res.json({
      prompts: [
        `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
      ],
      uiPrompts: [nodeBasePrompt],
    })

    return
  }

  res.status(403).json({ message: 'Not one of the allowed frameworks' })
  return
})

app.post('/chat', async (req, res) => {
  const messages = req.body.messages
  const response = await anthropic.messages.create({
    messages: messages,
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8000,
    system: getSystemPrompt(),
  })

  console.log(response)
  // Redundacy Function for backend extraction in case front-end extraction fails.
  // Extract the raw text from the response
  const rawText = (response.content[0] as TextBlock)?.text || ''

  // Extract the title from the response using regex
  const titleMatch = rawText.match(/<tewenArtifact id="[^"]*" title="([^"]*)">/)
  const title = titleMatch ? titleMatch[1] : 'New Project'

  // Extract the initial text description (everything before the first <tewen tag)
  let description = ''
  const firstTagIndex = rawText.indexOf('<tewen')
  if (firstTagIndex > 0) {
    description = rawText.substring(0, firstTagIndex).trim()
  }

  // Format the response for the frontend
  const formattedResponse = {
    title: title,
    description: description,
  }

  res.json({
    response: rawText,
    formattedResponse: formattedResponse,
  })
})

app.post('/deploy', async (req: any, res: any) => {
  try {
    const { files, projectTitle } = req.body

    if (!files || !Array.isArray(files) || !projectTitle) {
      return res.status(400).json({
        error: 'Invalid request. Files array and project title are required.',
      })
    }

    // Sanitize the project title to make it safe for file system
    const sanitizedTitle = projectTitle
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')

    // Create the project directory
    const projectDir = path.join(deploymentDir, sanitizedTitle)
    const publicProjectDir = path.join(publicDir, sanitizedTitle)

    // Remove the directory if it already exists
    if (fs.existsSync(projectDir)) {
      fs.rmdirSync(projectDir, { recursive: true })
    }

    if (fs.existsSync(publicProjectDir)) {
      fs.rmdirSync(publicProjectDir, { recursive: true })
    }

    // Create the project directory
    fs.mkdirSync(projectDir, { recursive: true })
    fs.mkdirSync(publicProjectDir, { recursive: true })

    // Function to recursively create files and directories
    const createFilesRecursively = (
      items: any[],
      baseDir: string,
      publicBaseDir: string
    ): void => {
      items.forEach((item) => {
        if (item.type === 'folder') {
          // Create folder
          const folderPath = path.join(baseDir, item.name)
          const publicFolderPath = path.join(publicBaseDir, item.name)

          if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true })
          }

          if (!fs.existsSync(publicFolderPath)) {
            fs.mkdirSync(publicFolderPath, { recursive: true })
          }

          // Recursively create children
          if (item.children && Array.isArray(item.children)) {
            createFilesRecursively(item.children, folderPath, publicFolderPath)
          }
        } else if (item.type === 'file') {
          // Create file
          const filePath = path.join(baseDir, item.name)
          const publicFilePath = path.join(publicBaseDir, item.name)

          fs.writeFileSync(filePath, item.content || '')
          fs.writeFileSync(publicFilePath, item.content || '')
        }
      })
    }

    // Create files and directories
    createFilesRecursively(files, projectDir, publicProjectDir)

    // Save metadata about the deployment
    const metadata = {
      projectTitle,
      deploymentDate: new Date().toISOString(),
      fileCount: files.length,
    }

    fs.writeFileSync(
      path.join(projectDir, 'metadata.json'),
      JSON.stringify(metadata, null, 2)
    )

    // Create a simple index.html that redirects to the actual index if it doesn't exist
    const indexPath = path.join(publicProjectDir, 'index.html')
    if (!fs.existsSync(indexPath)) {
      // Look for an index file in any subfolder
      let foundIndex = false
      const findIndexFile = (dir: string): boolean => {
        const items = fs.readdirSync(dir, { withFileTypes: true })
        for (const item of items) {
          const itemPath = path.join(dir, item.name)
          if (item.isDirectory()) {
            if (findIndexFile(itemPath)) {
              foundIndex = true
              return true
            }
          } else if (item.name === 'index.html') {
            // Create a redirect in the root
            const relativePath = path.relative(publicProjectDir, itemPath)
            fs.writeFileSync(
              indexPath,
              `<!DOCTYPE html>
<html>
<head>
  <meta http-equiv="refresh" content="0;url=${relativePath.replace(
    /\\/g,
    '/'
  )}">
</head>
<body>
  Redirecting...
</body>
</html>`
            )
            foundIndex = true
            return true
          }
        }
        return false
      }

      findIndexFile(publicProjectDir)

      // If no index.html was found, create a basic one
      if (!foundIndex) {
        fs.writeFileSync(
          indexPath,
          `<!DOCTYPE html>
<html>
<head>
  <title>${projectTitle}</title>
</head>
<body>
  <h1>${projectTitle}</h1>
  <p>Deployed website</p>
</body>
</html>`
        )
      }
    }

    // Return success with the deployment URL
    // Note: In a real environment, you'd use your hosting URL
    const deployUrl = `http://localhost:3000/sites/${sanitizedTitle}`

    res.json({
      success: true,
      message: 'Project deployed successfully',
      deployUrl: deployUrl,
      projectDir: sanitizedTitle,
    })
  } catch (error: any) {
    console.error('Deployment error:', error)
    res.status(500).json({
      error: 'Failed to deploy project',
      details: error.message,
    })
  }
})

// Serve static files from the public directory
app.use('/sites', express.static(publicDir))

app.listen(3000)

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
