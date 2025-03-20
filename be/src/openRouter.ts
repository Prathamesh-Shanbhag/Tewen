require('dotenv').config()
import express from 'express'
import OpenAI from 'openai'
import { BASE_PROMPT, getSystemPrompt } from './prompts'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'
import cors from 'cors'

console.log('Environment variables loaded')
console.log(
  `OpenRouter key: ${process.env.OPENROUTER_API_KEY ? 'is set' : 'is missing'}`
)

const app = express()
app.use(
  cors({
    origin: 'http://localhost:5173', // Adjust this to your frontend URL
    credentials: true,
  })
)
app.use(express.json())

const openai = new OpenAI({
  baseURL: 'https://openrouter.ai/api/v1',
  apiKey: process.env.OPENROUTER_API_KEY,
  // defaultHeaders: {
  //   'HTTP-Referer': '<YOUR_SITE_URL>', // Optional. Site URL for rankings on openrouter.ai.
  //   'X-Title': '<YOUR_SITE_NAME>', // Optional. Site title for rankings on openrouter.ai.
  // },
})

app.post('/template', async (req, res) => {
  console.log('Template request received:', req.body) // Log the request body
  try {
    const prompt = req.body.prompt || ''

    // Default to 'react' if no prompt is provided or if the API call fails
    let framework = 'react'

    try {
      const response = await openai.chat.completions.create({
        model: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
        messages: [{ role: 'user', content: prompt }],
      })

      const answer = response.choices[0].message.content?.trim()
      console.log('Framework detection result:', answer)

      if (answer === 'react' || answer === 'node') {
        framework = answer
      }
    } catch (apiError) {
      console.error('Error calling OpenRouter API:', apiError)
      // Continue with default framework
    }

    console.log('Using framework:', framework)

    if (framework === 'react') {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${reactBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [reactBasePrompt],
      })
      return
    }

    if (framework === 'node') {
      res.json({
        prompts: [
          BASE_PROMPT,
          `Here is an artifact that contains all files of the project visible to you.\nConsider the contents of ALL files in the project.\n\n${nodeBasePrompt}\n\nHere is a list of files that exist on the file system but are not being shown to you:\n\n  - .gitignore\n  - package-lock.json\n`,
        ],
        uiPrompts: [nodeBasePrompt],
      })
      return
    }

    // This should never happen with our default fallback, but just in case
    res.status(400).json({ message: 'Invalid framework detected' })
  } catch (error) {
    console.error('Error in /template:', error)
    res
      .status(500)
      .json({ message: 'Internal Server Error', error: String(error) })
  }
})

app.post('/chat', async (req, res) => {
  try {
    const messages = req.body.messages
    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'cognitivecomputations/dolphin3.0-r1-mistral-24b:free',
          messages: [messages, { role: 'system', content: getSystemPrompt() }],
          stream: true,
        }),
      }
    )

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('Response body is not readable')
    }

    const decoder = new TextDecoder()
    let buffer = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })

        while (true) {
          const lineEnd = buffer.indexOf('\n')
          if (lineEnd === -1) break

          const line = buffer.slice(0, lineEnd).trim()
          buffer = buffer.slice(lineEnd + 1)

          if (line.startsWith('data: ')) {
            const data = line.slice(6)
            if (data === '[DONE]') break

            try {
              const parsed = JSON.parse(data)
              const content = parsed.choices[0].delta.content
              if (content) {
                console.log(content)
              }
            } catch (e) {
              // Ignore invalid JSON
            }
          }
        }
      }
    } finally {
      reader.cancel()
    }

    res.json({
      response: 'Streaming response handled',
    })
  } catch (error) {
    console.error('Error in /chat:', error)
    res.status(500).json({ message: 'Internal Server Error' })
  }
})

app.listen(3000, () => console.log('Server running on port 3000'))
