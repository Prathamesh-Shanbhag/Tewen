require('dotenv').config()
import express from 'express'
import { GoogleGenerativeAI } from '@google/generative-ai'
import {
  BASE_PROMPT,
  getSystemPrompt,
  ONE_ANSWER_PROMPT,
  systemPromptJson,
} from './prompts'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'

console.log('Environment variables loaded')
import cors from 'cors'

// Initialize the Google Generative AI client
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const model = genAI.getGenerativeModel({
  model: 'gemini-1.5-flash',
  // systemInstruction: ONE_ANSWER_PROMPT,
})

const app = express()
app.use(cors())
app.use(express.json())
app.post('/template', async (req, res) => {
  const prompt = req.body.prompt
  try {
    // Using the correct format for Gemini API
    const result = await model.generateContent([{ text: prompt }])

    const answer = result.response.text().trim() // React or Node
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
    // Convert messages format from Anthropic to Gemini format
    const chatHistory = []

    for (const msg of messages) {
      chatHistory.push({
        role: msg.role === 'assistant' ? 'model' : msg.role, // Convert 'assistant' to 'model' for Gemini
        parts: [{ text: msg.content }],
      })
    }

    // Log the output of getSystemPrompt()
    const systemPrompt = systemPromptJson()
    console.log('System Prompt:', systemPrompt) // Log the system prompt

    // Create a chat session with the system prompt
    const chat = model.startChat({
      generationConfig: {
        maxOutputTokens: 8000,
      },
      history: chatHistory.slice(0, -1), // All messages except the last one
      systemInstruction: systemPrompt, // Use getSystemPrompt() here
    })

    // Send the last message to get a response
    const lastMessage = messages[messages.length - 1]
    const response = await chat.sendMessage(lastMessage.content)

    console.log(response)
    res.json({
      response: response.response.text(),
    })
  } catch (error) {
    console.error('Error in chat endpoint:', error)
    res.status(500).json({ message: 'Error processing request' })
  }
})

app.listen(3000)

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
