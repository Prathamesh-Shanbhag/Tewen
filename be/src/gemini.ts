require('dotenv').config()
import express, { Request } from 'express'
import { GoogleGenAI } from '@google/genai'
import { BASE_PROMPT, getSystemPrompt } from './prompts'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'
import multer from 'multer'
import path from 'path'
import os from 'os'
import { createNetlifySite, uploadToNetlify } from './netlify'

console.log('Environment variables loaded')
import cors from 'cors'

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' })

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
  try {
    // Using the correct format for Gemini API
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-pro-exp-03-25',
      contents: prompt,
      config: {
        systemInstruction: `Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra`,
      },
    })
    console.log(response.text)
    const answer = response.text // React or Node
    if (answer === 'react' || answer === 'node') {
      res.json({
        prompts: [
          ...(answer === 'react' ? [BASE_PROMPT] : []),
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${
            answer === 'react' ? reactBasePrompt : nodeBasePrompt
          }\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [answer === 'react' ? reactBasePrompt : nodeBasePrompt],
      })
      return
    }
    res.status(403).json({ message: 'Not one of the allowed frameworks' })
    return
  } catch (error) {
    console.error('Error in template endpoint:', error)
    res.status(500).json({ message: 'Error processing request' })
  }
})

app.post('/chat', async (req, res) => {
  const messages = req.body.messages
  try {
    const formattedMessages = Array.isArray(messages)
      ? messages.map((msg) => ({
          role: msg.role,
          parts: [{ text: msg.content }],
        }))
      : [{ role: 'user', parts: [{ text: JSON.stringify(messages) }] }]

    const codeResponse = await ai.models.generateContentStream({
      model: 'gemini-2.5-pro-exp-03-25',
      contents: formattedMessages,
      config: {
        systemInstruction: getSystemPrompt(),
      },
    })

    let responseText = ''
    for await (const chunk of codeResponse) {
      if (chunk.text) {
        responseText += chunk.text
        console.log(chunk.text) // Optional: stream to client or console
      }
    }

    let rawText = responseText
    // console.log('rawText::', rawText)
    // Extract the title from the response using improved regex
    const titleMatch = rawText.match(/<tewenArtifact[^>]*title="([^"]*)"/)
    const title = titleMatch ? titleMatch[1] : null
    console.log('title::', title)

    // Extract the first full sentence from the description
    let description = ''
    const firstTagIndex = rawText.indexOf('<tewenArtifact')
    if (firstTagIndex > 0) {
      // Get all text before the first tag, not just the first sentence
      description = rawText.substring(0, firstTagIndex).trim()
    }
    console.log('description::', description)

    // Extract the steps from the response using improved regex
    const stepsMatch = rawText.match(
      /<tewenAction\s+type="([^"]*)"(?:\s+filePath="([^"]*)")?>([\s\S]*?)<\/tewenAction>/g
    )
    // console.log('stepsMatch::', stepsMatch)

    // Format the response for the frontend
    const formattedResponse = {
      title: title,
      description: description,
    }

    res.json({
      response: rawText,
      formattedResponse: formattedResponse,
    })
  } catch (error: any) {
    console.error('Error in chat endpoint:', error)
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message || String(error),
    })
  }
})

// Add Netlify deployment routes
app.post('/deploy-netlify', createNetlifySite)
app.post('/upload-netlify', upload.single('file'), (req, res) => {
  uploadToNetlify(req as Request & { file?: Express.Multer.File }, res)
})

app.listen(3000)
