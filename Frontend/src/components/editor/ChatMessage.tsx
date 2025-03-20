import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { Bot, User, CheckCircle, Clock, Circle } from 'lucide-react'
import { Step, StepType } from '@/types'
import { Components } from 'react-markdown'

export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
  globalSteps?: Step[] // Global steps from app state
}

// Helper function to extract project information from LLM response
const extractProjectInfo = (content: string) => {
  // Handle potential undefined or null content
  if (!content) {
    return { title: null, description: null, buildSteps: [] }
  }

  // Check for XML title in tewenArtifact tag
  const xmlTitleMatch = content.match(
    /<tewenArtifact id="[^"]*" title="([^"]*)">/i
  )

  // Extract project title from LLM response
  const titleMatch =
    content.match(/Project Title:\s*['"](.+?)['"]/i) ||
    content.match(/Project Title:\s*(.+?)(?:\n|$)/i) ||
    xmlTitleMatch

  const title = titleMatch ? titleMatch[1].trim() : null

  // Extract description: Use the first line of content as description if it's suitable
  let description = null

  // Don't use regex matching for Description
  if (content) {
    const firstLine = content.split('\n')[0].trim()
    if (firstLine && !firstLine.startsWith('<') && firstLine.length < 200) {
      description = firstLine
    } else {
      // Otherwise try to get text before the XML tag
      const firstTagIndex = content.indexOf('<tewenArtifact')
      if (firstTagIndex > 0) {
        description = content.substring(0, firstTagIndex).trim()
      }
    }
  }

  // Check if there's a "Build Steps:" section
  const buildStepsRegex = /Build Steps:[\s\n]+((?:.*[\s\n]+)*)/i
  let stepsMatch = content.match(buildStepsRegex)

  let buildSteps: Step[] = []

  // If explicit Build Steps section is found
  if (stepsMatch && stepsMatch[1]) {
    // Extract each line as a step, typically in format "Creating App.tsx"
    const stepsText = stepsMatch[1].trim()
    buildSteps = stepsText
      .split('\n')
      .map((line) => line.trim())
      .filter((line) => line.length > 0 && !line.startsWith('Build Steps:'))
      .map((line, index) => ({
        id: index + 1,
        title: line,
        type: StepType.CreateFile,
        status: 'pending' as 'pending' | 'in-progress' | 'completed',
        description: '',
      }))
  }
  // If no explicit Build Steps but has XML content, extract file paths from tewenAction tags
  else {
    const filePathMatches = Array.from(
      content.matchAll(/<tewenAction type="file" filePath="([^"]+)">/gi)
    )
    if (filePathMatches && filePathMatches.length > 0) {
      buildSteps = filePathMatches.map((match, index) => ({
        id: index + 1,
        title: `Creating ${match[1]}`,
        type: StepType.CreateFile,
        status: 'pending' as 'pending' | 'in-progress' | 'completed',
        description: '',
      }))
    }
  }

  return {
    title,
    description,
    buildSteps,
  }
}

const ChatMessage = memo(({ message, globalSteps = [] }: ChatMessageProps) => {
  const isUser = message.type === 'user'

  // Extract project info if it's an assistant message
  const projectInfo = !isUser ? extractProjectInfo(message.content) : null
  const hasProjectInfo =
    projectInfo &&
    (projectInfo.title ||
      projectInfo.description ||
      projectInfo.buildSteps.length > 0)

  // Map build steps to include status from global steps if available
  const stepsWithStatus =
    projectInfo?.buildSteps.map((step) => {
      // Try to find a matching step in global steps by title
      const matchingGlobalStep = globalSteps.find(
        (gs) =>
          gs.title.toLowerCase() === step.title.toLowerCase() ||
          (step.title.startsWith('Creating ') &&
            gs.title === `Create ${step.title.substring(9)}`) ||
          (gs.title.startsWith('Create ') &&
            step.title === `Creating ${gs.title.substring(7)}`)
      )

      return {
        ...step,
        status: matchingGlobalStep?.status || step.status,
      }
    }) || []

  // Define markdown components
  const markdownComponents: Components = {
    // @ts-ignore - ReactMarkdown types are not fully compatible with the props being passed
    code({ className, inline, children, ...props }) {
      const match = /language-(\w+)/.exec(className || '')
      return !inline && match ? (
        <SyntaxHighlighter
          // @ts-ignore - The typing for style is incorrect but works in practice
          style={vscDarkPlus}
          language={match[1]}
          PreTag='div'
          {...props}
        >
          {String(children).replace(/\n$/, '')}
        </SyntaxHighlighter>
      ) : (
        <code className={className} {...props}>
          {children}
        </code>
      )
    },
  }

  return (
    <div
      className={cn('flex gap-3 p-4', isUser ? 'bg-muted/50' : 'bg-background')}
    >
      <div
        className={cn(
          'w-8 h-8 rounded-full flex items-center justify-center',
          isUser ? 'bg-primary' : 'bg-blue-600'
        )}
      >
        {isUser ? (
          <User className='w-4 h-4 text-primary-foreground' />
        ) : (
          <Bot className='w-4 h-4 text-white' />
        )}
      </div>

      <div className='flex-1 overflow-hidden'>
        {hasProjectInfo ? (
          <div className='space-y-4'>
            {/* Only show the raw markdown content if it's not the loading message or redundant with project info */}
            {message.content !== 'I am building your website...' &&
              !message.content.includes('Project Title:') && (
                <ReactMarkdown
                  className='prose dark:prose-invert max-w-none'
                  components={markdownComponents}
                >
                  {message.content}
                </ReactMarkdown>
              )}

            {/* Project info section */}
            {(projectInfo?.title || projectInfo?.description) && (
              <div className='bg-gray-800 rounded-md p-4 my-2'>
                {projectInfo?.title && (
                  <h3 className='text-lg font-semibold text-white mb-2'>
                    {projectInfo.title}
                  </h3>
                )}
                {projectInfo?.description && (
                  <p className='text-gray-300 mb-2'>
                    {projectInfo.description}
                  </p>
                )}
              </div>
            )}

            {/* Build steps section */}
            {stepsWithStatus.length > 0 && (
              <div className='bg-gray-900 rounded-md p-4 overflow-auto'>
                <h3 className='text-lg font-semibold text-gray-100 mb-4'>
                  Build Steps
                </h3>
                <div className='space-y-2'>
                  {stepsWithStatus.map((step) => (
                    <div
                      key={step.id}
                      className='p-2 rounded-lg transition-colors bg-gray-800'
                    >
                      <div className='flex items-center gap-2'>
                        {step.status === 'completed' ? (
                          <CheckCircle className='w-4 h-4 text-green-500' />
                        ) : step.status === 'in-progress' ? (
                          <Clock className='w-4 h-4 text-blue-400' />
                        ) : (
                          <Circle className='w-4 h-4 text-gray-600' />
                        )}
                        <h4 className='font-medium text-gray-100'>
                          {step.title}
                        </h4>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <ReactMarkdown
            className='prose dark:prose-invert max-w-none'
            components={markdownComponents}
          >
            {message.content}
          </ReactMarkdown>
        )}
      </div>
    </div>
  )
})

ChatMessage.displayName = 'ChatMessage'

export default ChatMessage
