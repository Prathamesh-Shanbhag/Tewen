require('dotenv').config()
import express, { Request } from 'express'
import multer from 'multer'
import path from 'path'
import os from 'os'

import Anthropic from '@anthropic-ai/sdk'
import { BASE_PROMPT, getSystemPrompt } from './prompts'
import { TextBlock } from '@anthropic-ai/sdk/resources'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'
import { createNetlifySite, uploadToNetlify } from './netlify'
console.log('Environment variables loaded')
console.log(`Claude key: ${process.env.ANTHROPIC_API_KEY}`)
import cors from 'cors'

const anthropic = new Anthropic()
// Defaults to ANTHROPIC_API_KEY if set, otherwise uses the key in the .env file

const app = express()
app.use(cors())
app.use(express.json())

// Configure multer for file uploads
const upload = multer({
  dest: path.join(os.tmpdir(), 'netlify-uploads'),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
})

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
    // response: rawText,
    formattedResponse: formattedResponse,
  })
})

// Add Netlify deployment routes
app.post('/deploy-netlify', createNetlifySite)
app.post('/upload-netlify', upload.single('file'), (req, res) => {
  uploadToNetlify(req as Request & { file?: Express.Multer.File }, res)
})

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
