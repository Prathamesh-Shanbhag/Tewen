import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { cn } from '@/lib/utils'
import { Bot, User } from 'lucide-react'

export interface Message {
  id: string
  type: 'user' | 'assistant'
  content: string
  timestamp: Date
}

interface ChatMessageProps {
  message: Message
}

const ChatMessage = memo(({ message }: ChatMessageProps) => {
  const isUser = message.type === 'user'

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
        <ReactMarkdown
          className='prose dark:prose-invert max-w-none'
          components={{
            code({ node, inline, className, children, ...props }) {
              const match = /language-(\w+)/.exec(className || '')
              return !inline && match ? (
                <SyntaxHighlighter
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
          }}
        >
          {message.content}
        </ReactMarkdown>
      </div>
    </div>
  )
})

ChatMessage.displayName = 'ChatMessage'

export default ChatMessage
