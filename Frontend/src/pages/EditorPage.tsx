import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { nanoid } from 'nanoid'
import {
  Laptop,
  Smartphone,
  Tablet,
  Maximize2,
  Minimize2,
  Loader2,
  History,
  RotateCcw,
  ChevronDown,
  ChevronUp,
  Code2,
  Eye,
} from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import ChatMessage, { Message } from '@/components/editor/ChatMessage'
import ChatInput from '@/components/editor/ChatInput'
import { StepsList } from '../components/StepsList'
import { FileExplorer } from '../components/FileExplorer'
import { CodeEditor } from '../components/CodeEditor'
import { PreviewFrame } from '../components/PreviewFrame'
import { Step, FileItem, StepType } from '../types'
import { BACKEND_URL } from '../config'
import { parseXml } from '../steps'
import { useWebContainer } from '../hooks/useWebContainer'

interface VersionHistory {
  id: string
  messages: Message[]
  timestamp: Date
}

const EditorPage = () => {
  const apiKey = import.meta.env.VITE_OPENROUTER_API_KEY
  const [prompt, setPrompt] = useState('')
  // Builder functionality
  const [llmMessages, setLlmMessages] = useState<
    { role: 'user' | 'assistant'; content: string }[]
  >([])
  const [loading, setLoading] = useState(false)
  const [templateSet, setTemplateSet] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  // const [url, setUrl] = useState<string | null>(null)

  // Original EditorPage functionality
  const [messages, setMessages] = useState<Message[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const [viewportDevice, setViewportDevice] = useState('desktop')
  const [showPreview, setShowPreview] = useState(false)
  const [isPreviewExpanded, setIsPreviewExpanded] = useState(false)
  const [versionHistory, setVersionHistory] = useState<VersionHistory[]>([])
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const { toast } = useToast()

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Builder functionality - handle file updates from steps
  const webcontainer = useWebContainer()
  useEffect(() => {
    console.log(`Loading State: ${loading}, prompt: ${prompt}`)
    let originalFiles = [...files]
    let updateHappened = false
    steps
      .filter(({ status }) => status === 'pending')
      .map((step) => {
        updateHappened = true
        if (step?.type === StepType.CreateFile) {
          let parsedPath = step.path?.split('/') ?? [] // ["src", "components", "App.tsx"]
          let currentFileStructure = [...originalFiles] // {}
          let finalAnswerRef = currentFileStructure

          let currentFolder = ''
          while (parsedPath.length) {
            currentFolder = `${currentFolder}/${parsedPath[0]}`
            let currentFolderName = parsedPath[0]
            parsedPath = parsedPath.slice(1)

            if (!parsedPath.length) {
              // final file
              let file = currentFileStructure.find(
                (x) => x.path === currentFolder
              )
              if (!file) {
                currentFileStructure.push({
                  name: currentFolderName,
                  type: 'file',
                  path: currentFolder,
                  content: step.code,
                })
              } else {
                file.content = step.code
              }
            } else {
              /// in a folder
              let folder = currentFileStructure.find(
                (x) => x.path === currentFolder
              )
              if (!folder) {
                // create the folder
                currentFileStructure.push({
                  name: currentFolderName,
                  type: 'folder',
                  path: currentFolder,
                  children: [],
                })
              }

              currentFileStructure = currentFileStructure.find(
                (x) => x.path === currentFolder
              )!.children!
            }
          }
          originalFiles = finalAnswerRef
        }
      })

    if (updateHappened) {
      setFiles(originalFiles)
      setSteps((steps) =>
        steps.map((s: Step) => {
          return {
            ...s,
            status: 'completed',
          }
        })
      )
      setShowPreview(true)
    }
  }, [steps, files])

  // Builder functionality - WebContainer mounting
  useEffect(() => {
    if (!files.length || !webcontainer) return

    const createMountStructure = (files: FileItem[]): Record<string, any> => {
      const mountStructure: Record<string, any> = {}

      const processFile = (file: FileItem, isRootFolder: boolean) => {
        if (file.type === 'folder') {
          // For folders, create a directory entry
          mountStructure[file.name] = {
            directory: file.children
              ? Object.fromEntries(
                  file.children.map((child) => [
                    child.name,
                    processFile(child, false),
                  ])
                )
              : {},
          }
        } else if (file.type === 'file') {
          if (isRootFolder) {
            mountStructure[file.name] = {
              file: {
                contents: file.content || '',
              },
            }
          } else {
            // For files, create a file entry with contents
            return {
              file: {
                contents: file.content || '',
              },
            }
          }
        }

        return mountStructure[file.name]
      }

      // Process each top-level file/folder
      files.forEach((file) => processFile(file, true))

      return mountStructure
    }

    const mountStructure = createMountStructure(files)

    // Mount the structure if WebContainer is available
    webcontainer.mount(mountStructure)
  }, [files, webcontainer])

  const saveVersion = () => {
    const version: VersionHistory = {
      id: nanoid(),
      messages: [...messages],
      timestamp: new Date(),
    }
    setVersionHistory((prev) => [version, ...prev])
  }

  const restoreVersion = (version: VersionHistory) => {
    setMessages(version.messages)
    setShowPreview(true)
    toast({
      title: 'Version restored',
      description: 'Previous version has been restored successfully.',
    })
  }

  // Initialize the builder with template
  const initializeBuilder = async (userPrompt: string) => {
    setIsGenerating(true)

    try {
      const response = await axios.post(
        `${BACKEND_URL}/template`,
        {
          prompt: userPrompt.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`, // Ensure this is set correctly
            'Content-Type': 'application/json',
          },
        }
      )

      // Set the template set to true because we have the template
      setTemplateSet(true)
      // Get the prompts and uiPrompts from the response
      const { prompts, uiPrompts } = response.data

      setSteps(
        parseXml(uiPrompts[0]).map((x: Step) => ({
          ...x,
          status: 'pending',
        }))
      )

      setLoading(true)
      const stepsResponse = await axios.post(
        `${BACKEND_URL}/chat`,
        {
          messages: [...prompts, userPrompt].map((content) => ({
            role: 'user',
            content,
          })),
        },
        {
          headers: {
            Authorization: `Bearer ${apiKey}`, // Ensure this is set correctly
            'Content-Type': 'application/json',
          },
        }
      )

      setLoading(false)
      setIsGenerating(false)

      // Process the steps
      setSteps((s) => [
        ...s,
        ...parseXml(stepsResponse.data.response).map((x) => ({
          ...x,
          status: 'pending' as 'pending',
        })),
      ])

      setLlmMessages(
        [...prompts, userPrompt].map((content) => ({
          role: 'user',
          content,
        }))
      )

      setLlmMessages((x) => [
        ...x,
        { role: 'assistant', content: stepsResponse.data.response },
      ])

      // Add the assistant response to the chat UI
      const assistantMessage: Message = {
        id: nanoid(),
        type: 'assistant',
        content: stepsResponse.data.response,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      saveVersion()

      toast({
        title: 'Website has been generated!',
        description:
          'Your website has been generated. Click on the "Preview" button to see the website.',
      })
    } catch (error) {
      console.error('Error initializing builder:', error)
      setIsGenerating(false)

      toast({
        title: 'Error',
        description: 'Failed to generate website template. Please try again.',
        variant: 'destructive',
      })
    }
  }

  const handleSubmit = async (content: string) => {
    // Save the user's message
    const userMessage: Message = {
      id: nanoid(),
      type: 'user',
      content: content,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    setPrompt(content)
    setIsGenerating(true)
    setShowPreview(true)

    if (!templateSet) {
      // First message - initialize the builder
      await initializeBuilder(content)
    } else {
      // Subsequent messages - send to the chat API
      try {
        const newMessage = {
          role: 'user' as 'user',
          content: content,
        }

        setLoading(true)
        const stepsResponse = await axios.post(
          `${BACKEND_URL}/chat`,
          {
            messages: [...llmMessages, newMessage],
          },
          {
            headers: {
              Authorization: `Bearer ${apiKey}`, // Ensure this is set correctly
              'Content-Type': 'application/json',
            },
          }
        )
        setLoading(false)
        setIsGenerating(false)

        setLlmMessages((x) => [...x, newMessage])
        setLlmMessages((x) => [
          ...x,
          {
            role: 'assistant',
            content: stepsResponse.data.response,
          },
        ])

        // Parse new steps from response
        setSteps((s) => [
          ...s,
          ...parseXml(stepsResponse.data.response).map((x) => ({
            ...x,
            status: 'pending' as 'pending',
          })),
        ])

        // Add the assistant response to the chat UI
        const assistantMessage: Message = {
          id: nanoid(),
          type: 'assistant',
          content: stepsResponse.data.response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
        saveVersion()
      } catch (error) {
        console.error('Error sending chat message:', error)
        setIsGenerating(false)
        setLoading(false)

        toast({
          title: 'Error',
          description: 'Failed to process your request. Please try again.',
          variant: 'destructive',
        })
      }
    }
  }

  const togglePreviewExpansion = () => {
    setIsPreviewExpanded(!isPreviewExpanded)
  }

  return (
    <div className='fixed inset-0 flex items-center justify-center p-4'>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className='w-full max-w-[95vw] h-[85vh]'
      >
        <div className='flex flex-col lg:flex-row gap-4 w-full h-full justify-center items-center'>
          {/* Left Panel - Chat and Steps */}
          <motion.div
            initial={{ width: '100%' }}
            animate={{
              width: showPreview
                ? isPreviewExpanded
                  ? '0%'
                  : window.innerWidth >= 1024
                  ? '30%'
                  : '100%'
                : '40%',
              opacity: isPreviewExpanded ? 0 : 1,
            }}
            transition={{ duration: 0.3 }}
            className='relative flex flex-col border rounded-lg overflow-hidden bg-background h-full'
          >
            <div className='flex flex-col h-full'>
              {/* Chat Section */}
              <div className='flex-1 flex flex-col overflow-hidden'>
                <div className='p-4 border-b flex justify-between items-center'>
                  <h1 className='text-xl font-bold'>Website Builder</h1>
                  {versionHistory.length > 0 && (
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => restoreVersion(versionHistory[0])}
                      className='flex items-center gap-2'
                    >
                      <RotateCcw className='h-4 w-4' />
                      Undo
                    </Button>
                  )}
                </div>

                <ScrollArea className='flex-1'>
                  <div className='flex flex-col'>
                    {messages.map((message) => (
                      <ChatMessage key={message.id} message={message} />
                    ))}
                    {isGenerating && (
                      <div className='flex items-center gap-2 p-4 text-muted-foreground'>
                        <Loader2 className='h-4 w-4 animate-spin' />
                        Generating website...
                      </div>
                    )}
                    <div ref={chatEndRef} />
                  </div>
                </ScrollArea>

                <ChatInput onSubmit={handleSubmit} isLoading={isGenerating} />
              </div>

              {/* Steps List - Show if we have steps
              {steps.length > 0 && (
                <div className='h-1/3 border-t overflow-auto'>
                  <div className='p-2'>
                    <h2 className='text-md font-semibold mb-2'>Build Steps</h2>
                    <div className='max-h-[30vh] overflow-auto'>
                      <StepsList
                        steps={steps}
                        currentStep={currentStep}
                        onStepClick={setCurrentStep}
                      />
                    </div>
                  </div>
                </div>
              )} */}

              {/* Version History */}
              {versionHistory.length > 0 && (
                <div className='border-t'>
                  <Button
                    variant='ghost'
                    className='w-full flex items-center justify-between p-2 h-auto'
                    onClick={() => setIsHistoryExpanded(!isHistoryExpanded)}
                  >
                    <span className='flex items-center gap-2'>
                      <History className='h-4 w-4' />
                      Version History
                    </span>
                    {isHistoryExpanded ? (
                      <ChevronDown className='h-4 w-4' />
                    ) : (
                      <ChevronUp className='h-4 w-4' />
                    )}
                  </Button>
                  <AnimatePresence>
                    {isHistoryExpanded && (
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: 'auto' }}
                        exit={{ height: 0 }}
                        transition={{ duration: 0.2 }}
                        className='overflow-hidden'
                      >
                        <ScrollArea className='h-32'>
                          <div className='space-y-2 p-2'>
                            {versionHistory.map((version) => (
                              <Button
                                key={version.id}
                                variant='ghost'
                                className='w-full justify-start text-sm'
                                onClick={() => restoreVersion(version)}
                              >
                                <History className='h-4 w-4 mr-2' />
                                {version.messages[
                                  version.messages.length - 2
                                ]?.content.slice(0, 30)}
                                ...
                                <span className='ml-auto text-xs text-muted-foreground'>
                                  {new Date(
                                    version.timestamp
                                  ).toLocaleTimeString()}
                                </span>
                              </Button>
                            ))}
                          </div>
                        </ScrollArea>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </motion.div>

          {/* Middle Panel - File Explorer */}
          {showPreview && !isPreviewExpanded && (
            <motion.div
              initial={{ width: '0%', opacity: 0 }}
              animate={{
                width: window.innerWidth >= 1024 ? '20%' : '100%',
                opacity: 1,
              }}
              exit={{ width: '0%', opacity: 0 }}
              transition={{ duration: 0.3 }}
              className='border rounded-lg overflow-hidden bg-background h-full hidden lg:block'
            >
              <FileExplorer files={files} onFileSelect={setSelectedFile} />
            </motion.div>
          )}

          {/* Right Panel - Preview and Code Editor */}
          <AnimatePresence>
            {showPreview && (
              <motion.div
                initial={{ width: '0%', opacity: 0 }}
                animate={{
                  width: isPreviewExpanded
                    ? '100%'
                    : window.innerWidth >= 1024
                    ? '50%'
                    : '100%',
                  opacity: 1,
                }}
                exit={{ width: '0%', opacity: 0 }}
                transition={{ duration: 0.3 }}
                className='border rounded-lg overflow-hidden bg-background h-full'
              >
                <div className='p-4 border-b flex items-center justify-between'>
                  <h2 className='text-xl font-medium'>
                    {activeTab === 'code' ? 'Code Editor' : 'Preview'}
                  </h2>
                  <div className='flex items-center gap-2'>
                    {/* Tab View for Code and Preview */}
                    <div className='flex space-x-2'>
                      <Button
                        variant={activeTab === 'code' ? 'default' : 'outline'}
                        size='sm'
                        onClick={() => setActiveTab('code')}
                        className='flex items-center gap-2'
                      >
                        <Code2 className='h-4 w-4' />
                        Code
                      </Button>
                      <Button
                        variant={
                          activeTab === 'preview' ? 'default' : 'outline'
                        }
                        size='sm'
                        onClick={() => setActiveTab('preview')}
                        className='flex items-center gap-2'
                      >
                        <Eye className='h-4 w-4' />
                        Preview
                      </Button>
                    </div>

                    {/* Responsive Controls - Only shown in preview mode */}
                    {activeTab === 'preview' && (
                      <Tabs
                        value={viewportDevice}
                        onValueChange={setViewportDevice}
                        className='w-auto'
                      >
                        <TabsList>
                          <TabsTrigger value='desktop'>
                            <Laptop className='h-4 w-4 mr-1' />
                            <span className='sr-only md:not-sr-only md:inline-block'>
                              Desktop
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value='tablet'>
                            <Tablet className='h-4 w-4 mr-1' />
                            <span className='sr-only md:not-sr-only md:inline-block'>
                              Tablet
                            </span>
                          </TabsTrigger>
                          <TabsTrigger value='mobile'>
                            <Smartphone className='h-4 w-4 mr-1' />
                            <span className='sr-only md:not-sr-only md:inline-block'>
                              Mobile
                            </span>
                          </TabsTrigger>
                        </TabsList>
                      </Tabs>
                    )}

                    <Button
                      variant='ghost'
                      size='icon'
                      onClick={togglePreviewExpansion}
                      className='hidden lg:flex'
                    >
                      {isPreviewExpanded ? (
                        <Minimize2 className='h-4 w-4' />
                      ) : (
                        <Maximize2 className='h-4 w-4' />
                      )}
                    </Button>
                  </div>
                </div>

                <div className='h-[calc(100%-4rem)]'>
                  {activeTab === 'code' ? (
                    <CodeEditor file={selectedFile} />
                  ) : (
                    <div
                      className={`transition-all duration-300 h-full ${
                        viewportDevice === 'desktop'
                          ? 'w-full'
                          : viewportDevice === 'tablet'
                          ? 'w-[768px] max-w-full mx-auto'
                          : 'w-[375px] max-w-full mx-auto'
                      }`}
                    >
                      {webcontainer ? (
                        <PreviewFrame
                          finishedGenerating={() => setActiveTab('preview')}
                          webContainer={webcontainer}
                          files={files}
                        />
                      ) : (
                        <div className='h-full flex flex-col items-center justify-center'>
                          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                          <p className='mt-2 text-muted-foreground'>
                            Initializing preview...
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  )
}

export default EditorPage
