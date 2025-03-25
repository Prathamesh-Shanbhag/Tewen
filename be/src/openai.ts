require('dotenv').config()
import express from 'express'
import { OpenAI } from 'openai'
import { BASE_PROMPT, getSystemPrompt } from './prompts'
import { basePrompt as reactBasePrompt } from './defaults/react'
import { basePrompt as nodeBasePrompt } from './defaults/node'

console.log('Environment variables loaded')
import cors from 'cors'

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
})
const app = express()
app.use(cors())
app.use(express.json())

app.post('/template', async (req, res) => {
  const prompt = req.body.prompt
  try {
    // Using the correct format for OpenAI API
    const response = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: [
        {
          role: 'system',
          content: `Return either node or react based on what do you think this project should be. Only return a single word either 'node' or 'react'. Do not return anything extra`,
        },
        {
          role: 'user',
          content: prompt,
        },
      ],
      text: {
        format: {
          type: 'text',
        },
      },
      temperature: 1,
      max_output_tokens: 100,
      top_p: 1,
      store: true,
    })

    console.log(response.output_text)
    const answer = response.output_text // React or Node
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
  // This makes sure the messages are an array that matches the OpenAI API format
  try {
    const formattedMessages = Array.isArray(messages)
      ? messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        }))
      : [{ role: 'user', content: JSON.stringify(messages) }]

    // Add system message at the beginning
    formattedMessages.unshift({
      role: 'system',
      content: getSystemPrompt(),
    })
    const stream = await openai.responses.create({
      model: 'gpt-4o-mini',
      input: formattedMessages,
    })
    console.log(stream.output_text)
    // let rawText = stream.output_text

    // Redundacy Function for backend extraction in case front-end extraction fails.
    // Extract the raw text from the response

    // Extract the title from the response using regex
    //   const titleMatch = rawText.match(
    //     /<tewenArtifact id="[^"]*" title="([^"]*)">/
    //   )
    //   const title = titleMatch ? titleMatch[1] : 'New Project'

    //   // Extract the initial text description (everything before the first <tewen tag)
    //   let description = ''
    //   const firstTagIndex = rawText.indexOf('<tewen')
    //   if (firstTagIndex > 0) {
    //     description = rawText.substring(0, firstTagIndex).trim()
    //   }

    //   // Format the response for the frontend
    //   const formattedResponse = {
    //     title: title,
    //     description: description,
    //   }

    //   res.json({
    //     response: rawText,
    //     formattedResponse: formattedResponse,
    //   })
    // } catch (error: any) {
    //   console.error('Error in chat endpoint:', error)
    //   res.status(500).json({
    //     error: 'Failed to process request',
    //     details: error.message || String(error),
    //   })
    // }
  } catch (error: any) {
    console.error('Error in chat endpoint:', error)
    res.status(500).json({
      error: 'Failed to process request',
      details: error.message || String(error),
    })
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
