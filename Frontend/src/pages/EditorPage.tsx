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
  Cloud,
} from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import ChatMessage, { Message } from '@/components/editor/ChatMessage'
import ChatInput from '@/components/editor/ChatInput'
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
  // const [currentStep, setCurrentStep] = useState(1)
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
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployUrl, setDeployUrl] = useState<string | null>(null)

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
    // Track which steps were processed
    const processedStepIds: number[] = []

    steps
      .filter(({ status }) => status === 'pending')
      .map((step) => {
        updateHappened = true
        processedStepIds.push(step.id)

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
      // Only mark steps that were actually processed as completed
      setSteps((steps) =>
        steps.map((s: Step) => {
          return {
            ...s,
            // Only change status if this step was processed
            status: processedStepIds.includes(s.id) ? 'completed' : s.status,
          }
        })
      )
      setShowPreview(true)
      setActiveTab('preview')
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

      // Make sure uiPrompts is defined and has at least one element
      if (uiPrompts && uiPrompts.length > 0) {
        const uiPromptData = uiPrompts[0] || ''
        setSteps(
          parseXml(uiPromptData).map((x: Step) => ({
            ...x,
            status: 'pending',
          }))
        )
      } else {
        console.warn('No UI prompts found in the response')
        // Initialize with empty steps array
        setSteps([])
      }

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
      if (stepsResponse.data) {
        // Get the full response for processing
        const fullResponseText = stepsResponse.data.response || ''

        if (fullResponseText) {
          // Parse steps from the full response
          setSteps((s) => [
            ...s,
            ...parseXml(fullResponseText).map((x) => ({
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
            { role: 'assistant', content: fullResponseText },
          ])

          // Add the curated assistant response to the chat UI
          const assistantMessage: Message = {
            id: nanoid(),
            type: 'assistant',
            content: `Project Title: 'New Project'
Description: 'I am building your website based on your specifications. The files will appear in the file explorer once they're ready.'
Build Steps:
Initializing project structure
Setting up essential files`,
            timestamp: new Date(),
          }
          setMessages((prev) => [...prev, assistantMessage])
          saveVersion()

          toast({
            title: 'Website has been generated!',
            description:
              'Your website has been generated. Click on the "Preview" button to see the website.',
          })

          setActiveTab('preview')
        } else {
          console.error('Empty response text from API')
          toast({
            title: 'Error',
            description:
              'Failed to generate website template. Empty response from server.',
            variant: 'destructive',
          })
        }
      } else {
        console.error('Missing response data from API')
        toast({
          title: 'Error',
          description:
            'Failed to generate website template. Invalid response from server.',
          variant: 'destructive',
        })
      }
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

        // Parse new steps from response
        if (stepsResponse.data) {
          // Get the full response for processing
          const fullResponseText = stepsResponse.data.response || ''

          if (fullResponseText) {
            setLlmMessages((x) => [...x, newMessage])
            setLlmMessages((x) => [
              ...x,
              {
                role: 'assistant',
                content: fullResponseText,
              },
            ])

            // Parse new steps from response
            setSteps((s) => [
              ...s,
              ...parseXml(fullResponseText).map((x) => ({
                ...x,
                status: 'pending' as 'pending',
              })),
            ])

            // Process and extract relevant information from the response
            const title =
              stepsResponse.data.formattedResponse?.title || 'Update'
            let description =
              stepsResponse.data.formattedResponse?.description || ''

            // Extract the first line of text from the response as a description if not already set
            if (!description && fullResponseText) {
              const firstLine = fullResponseText.split('\n')[0].trim()
              if (
                firstLine &&
                !firstLine.startsWith('<') &&
                firstLine.length < 200
              ) {
                description = firstLine
              }
            }

            // Create a curated message for the chat UI
            const steps = parseXml(fullResponseText)
            const stepsList = steps.map((step) => step.title).join('\n')

            // Format the chat message with Project Title, Description, and Build Steps
            const formattedChatContent = `Project Title: '${title.replace(
              /'/g,
              "\\'"
            )}'
Description: '${description.replace(/'/g, "\\'")}'${
              steps.length > 0 ? `\n\nBuild Steps:\n${stepsList}` : ''
            }`

            // Add the curated assistant response to the chat UI
            const assistantMessage: Message = {
              id: nanoid(),
              type: 'assistant',
              content: formattedChatContent,
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, assistantMessage])
            saveVersion()

            setActiveTab('preview')
          } else {
            console.error('Empty response text from API')
            toast({
              title: 'Error',
              description:
                'Failed to process your request. Empty response from server.',
              variant: 'destructive',
            })
          }
        } else {
          console.error('Missing response data from API')
          toast({
            title: 'Error',
            description:
              'Failed to process your request. Invalid response from server.',
            variant: 'destructive',
          })
        }
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

  // Add a new function to handle deployment
  const handleDeploy = async () => {
    if (!files.length || isDeploying) return

    setIsDeploying(true)

    try {
      // Get current project title for folder name
      const projectTitle = getProjectTitle()

      const response = await axios.post(
        `${BACKEND_URL}/deploy`,
        {
          files: files,
          projectTitle: projectTitle,
        },
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      )

      if (response.data && response.data.deployUrl) {
        setDeployUrl(response.data.deployUrl)
        toast({
          title: 'Deployment Successful!',
          description: 'Your website has been deployed successfully.',
        })
      }
    } catch (error) {
      console.error('Error deploying website:', error)
      toast({
        title: 'Deployment Failed',
        description:
          'There was an error deploying your website. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  // Helper function to get the current project title from messages
  const getProjectTitle = () => {
    // Find the last assistant message with a project title
    const assistantMessages = messages.filter((m) => m.type === 'assistant')
    for (let i = assistantMessages.length - 1; i >= 0; i--) {
      const titleMatch = assistantMessages[i].content.match(
        /Project Title:\s*['"](.+?)['"]/i
      )
      if (titleMatch && titleMatch[1]) {
        return titleMatch[1].trim()
      }
    }
    return 'new-project'
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
                      <ChatMessage
                        key={message.id}
                        message={message}
                        globalSteps={steps}
                      />
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
                      <Button
                        variant='outline'
                        size='sm'
                        onClick={handleDeploy}
                        disabled={isDeploying || !files.length}
                        className='flex items-center gap-2'
                      >
                        {isDeploying ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Cloud className='h-4 w-4' />
                        )}
                        Deploy
                      </Button>
                    </div>

                    {/* If we have a deploy URL, show it */}
                    {deployUrl && (
                      <div className='hidden md:flex items-center ml-4'>
                        <a
                          href={deployUrl}
                          target='_blank'
                          rel='noopener noreferrer'
                          className='text-sm text-blue-500 hover:underline flex items-center gap-1'
                        >
                          <Cloud className='h-3 w-3' />
                          {deployUrl}
                        </a>
                      </div>
                    )}

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
