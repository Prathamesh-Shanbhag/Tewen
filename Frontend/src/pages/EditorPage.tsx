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
  Download,
  SquareArrowOutUpRight,
  Rocket,
} from 'lucide-react'
import axios from 'axios'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import ChatMessage, { Message } from '@/components/editor/ChatMessage'
import ChatInput from '@/components/editor/ChatInput'
// import { StepsList } from '../components/StepsList'
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
  const [prompt, setPrompt] = useState('')
  // Builder functionality
  const [llmMessages, setLlmMessages] = useState<
    { role: 'user' | 'assistant' | 'model'; content: string }[]
  >([])
  const [templateSet, setTemplateSet] = useState(false)
  const [activeTab, setActiveTab] = useState<'code' | 'preview'>('code')
  const [selectedFile, setSelectedFile] = useState<FileItem | null>(null)
  const [steps, setSteps] = useState<Step[]>([])
  const [files, setFiles] = useState<FileItem[]>([])
  // const [url, setUrl] = useState<string | null>(null)
  // const [currentStep, setCurrentStep] = useState(1)

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

  // Add state for deployment status
  const [isDeploying, setIsDeploying] = useState(false)
  const [deployedUrl, setDeployedUrl] = useState<string | null>(null)

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Builder functionality - handle file updates from steps
  const webcontainer = useWebContainer()
  useEffect(() => {
    console.log(`Loading State: ${isGenerating}, prompt: ${prompt}`)
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
    // console.log('Version History::', versionHistory)
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
      const response = await axios.post(`${BACKEND_URL}/template`, {
        prompt: userPrompt,
      })

      // Set the template set to true because we have the template
      setTemplateSet(true)
      // Get the prompts and uiPrompts from the response
      const { prompts, uiPrompts } = response.data
      // console.log('Prompts', prompts)
      // console.log('Ui Prompts', uiPrompts)

      setSteps(
        parseXml(uiPrompts[0]).map((x: Step) => ({
          ...x,
          status: 'pending',
        }))
      )
      console.log(
        'steps???',
        steps.map((step) => `${step.title}: ${step.status}`)
      )
      setIsGenerating(true)

      const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
        messages: [...prompts, userPrompt].map((content) => ({
          role: 'user',
          content,
        })),
      })
      setIsGenerating(false)
      // Add the new steps to the steps array
      setSteps((s) => [
        ...s,
        ...parseXml(stepsResponse.data.response).map((x) => ({
          ...x,
          status: 'pending' as 'pending',
        })),
      ])

      // Add the user prompt to the already available prompts
      setLlmMessages(
        [...prompts, userPrompt].map((content) => ({
          role: 'user',
          content,
        }))
      )
      setLlmMessages((x) => [
        ...x,
        { role: 'model', content: stepsResponse.data.response },
      ])

      // Add the assistant response to the chat UI
      const assistantMessage: Message = {
        id: nanoid(),
        type: 'assistant',
        content: `
Project Title: ${
          stepsResponse.data.formattedResponse.title || `${messages[0].content}`
        }\n\n\n
Description: ${
          stepsResponse.data.formattedResponse.description ||
          'Initializing project...'
        }`,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, assistantMessage])
      saveVersion()

      toast({
        title: 'Website has been generated!',
        description:
          'Your website has been generated. Click on the "Preview" button to see the website.',
      })
      setTimeout(() => {
        setActiveTab('preview')
        console.log('Setting active tab to preview')
      }, 5000)
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

        setIsGenerating(true)
        const stepsResponse = await axios.post(`${BACKEND_URL}/chat`, {
          messages: [...llmMessages, newMessage],
        })
        setIsGenerating(false)

        setLlmMessages((x) => [...x, newMessage])
        setLlmMessages((x) => [
          ...x,
          {
            role: 'model',
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
          content: `
Project Title: ${
            stepsResponse.data.formattedResponse.title ||
            `${messages[0].content}`
          }\n\n\n
Description: ${
            stepsResponse.data.formattedResponse.description ||
            'Initializing project...'
          }`,
          timestamp: new Date(),
        }

        setMessages((prev) => [...prev, assistantMessage])
        saveVersion()
      } catch (error) {
        console.error('Error sending chat message:', error)
        setIsGenerating(false)

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

  // Add a function to extract project title from messages
  const getProjectTitle = () => {
    // Try to find the first assistant message that contains a project title
    const assistantMessage = messages.find(
      (msg) =>
        msg.type === 'assistant' && msg.content.includes('Project Title:')
    )

    if (assistantMessage) {
      // Extract the title from the message content
      const titleMatch = assistantMessage.content.match(
        /Project Title: (.*?)(?:\n|$)/
      )
      if (titleMatch && titleMatch[1]) {
        // Clean up the title for use as a folder name
        return titleMatch[1]
          .trim()
          .replace(/[^\w\s-]/g, '')
          .replace(/\s+/g, '-')
      }
    }

    // Fallback to a default name if no title is found
    return 'my-website-project'
  }

  // Add download functionality to save project locally
  const handleDownload = async () => {
    if (!files.length) {
      toast({
        title: 'No files to download',
        description: 'Generate a website first before downloading.',
        variant: 'destructive',
      })
      return
    }

    try {
      // Create a zip file containing all project files
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      // Get project title for the folder name
      const projectTitle = getProjectTitle()

      // Function to recursively add files to zip
      const addFilesToZip = (fileItems: FileItem[], parentFolder = '') => {
        for (const item of fileItems) {
          const relativePath = `${projectTitle}${parentFolder}/${item.name}`

          if (item.type === 'file' && item.content) {
            zip.file(relativePath, item.content)
          } else if (item.type === 'folder' && item.children) {
            addFilesToZip(item.children, `${parentFolder}/${item.name}`)
          }
        }
      }

      // Add all files to the zip
      addFilesToZip(files)

      // Generate the zip file
      const content = await zip.generateAsync({ type: 'blob' })

      // Create a download link and trigger the download
      const url = URL.createObjectURL(content)
      const a = document.createElement('a')
      a.href = url
      a.download = `${projectTitle}.zip`
      document.body.appendChild(a)
      a.click()

      // Clean up
      URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast({
        title: 'Download started',
        description: `Your project "${projectTitle}" is being downloaded as a zip file.`,
      })
    } catch (error) {
      console.error('Error downloading files:', error)
      toast({
        title: 'Download failed',
        description:
          'There was an error creating the download. Please try again.',
        variant: 'destructive',
      })
    }
  }

  // Add Netlify deployment functionality
  const handleNetlifyDeploy = async () => {
    console.log('Deploy clicked')
    if (!files.length) {
      toast({
        title: 'No files to deploy',
        description: 'Generate a website first before deploying.',
        variant: 'destructive',
      })
      return
    }

    try {
      setIsDeploying(true)
      const projectTitle = getProjectTitle()
      const sanitizedTitle =
        projectTitle.toLowerCase().replace(/[^a-z0-9-]/g, '-') || 'ai-site'
      console.log('Sanitized Title:', sanitizedTitle)
      const JSZip = (await import('jszip')).default
      const zip = new JSZip()

      //  Check if /dist exists by trying to read it
      let entries
      try {
        entries = await webcontainer?.fs.readdir('/dist', {
          withFileTypes: true,
        })
      } catch {
        throw new Error(
          'No /dist directory found. Please preview the site first.'
        )
      }

      if (!entries || entries.length === 0) {
        throw new Error(
          'The /dist folder is empty. Something went wrong during the build.'
        )
      }

      // ✅ Recursive zip of /dist
      const walkDistFolder = async (dir = '/dist', base = '') => {
        const items = await webcontainer?.fs.readdir(dir, {
          withFileTypes: true,
        })
        if (!items) return

        for (const entry of items) {
          const fullPath = `${dir}/${entry.name}`
          const relativePath = `${base}${entry.name}`

          if (entry.isFile()) {
            const fileData = await webcontainer!.fs.readFile(fullPath)
            if (fileData) {
              zip.file(relativePath.replace(/^\/?dist\//, ''), fileData)
            }
          } else if (entry.isDirectory()) {
            await walkDistFolder(fullPath, `${relativePath}/`)
          }
        }
      }

      await walkDistFolder('/dist', '')
      zip.forEach((relativePath) => {
        console.log('[ZIP]', relativePath)
      })
      zip.file('_redirects', '/*    /index.html   200')

      const zipBlob = await zip.generateAsync({ type: 'blob' })
      const tempUrl = URL.createObjectURL(zipBlob)
      const a = document.createElement('a')
      a.href = tempUrl
      a.download = `${projectTitle}.zip`
      a.click()

      // Deploy steps
      const response = await axios.post(
        `${BACKEND_URL}/deploy-netlify`,
        {
          projectTitle,
        },
        {
          headers: { 'Content-Type': 'application/json' },
        }
      )

      const { siteId } = response.data

      const formData = new FormData()
      formData.append('file', zipBlob, 'deployed-site.zip')
      formData.append('siteId', siteId)

      const deployResponse = await axios.post(
        `${BACKEND_URL}/upload-netlify`,
        formData,
        {
          headers: { 'Content-Type': 'multipart/form-data' },
        }
      )

      const { deployUrl } = deployResponse.data
      setDeployedUrl(deployUrl)

      toast({
        title: 'Deployment successful!',
        description: (
          <div className='flex flex-col gap-2'>
            <p>Your site has been deployed to Netlify.</p>
            <a
              href={deployUrl}
              target='_blank'
              rel='noopener noreferrer'
              className='text-blue-500 hover:underline'
            >
              {deployUrl}
            </a>
          </div>
        ),
        duration: 10000,
      })
    } catch (error) {
      console.error('Error deploying to Netlify:', error)
      toast({
        title: 'Deployment failed',
        description:
          'There was an error deploying to Netlify. Please try again.',
        variant: 'destructive',
      })
    } finally {
      setIsDeploying(false)
    }
  }

  return (
    <div
      className='fixed inset-0 flex items-center justify-center p-4 '
      // style={{ backgroundSize: '200% 200%' bg-gradient-to-br from-purple-500 from-10% via-gray-500 to-black dark:from-purple-500 dark:via-gray-500 dark:to-black animate-gradient-slow}}
    >
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
                  <h1 className='text-xl font-bold'>Workspace</h1>
                  <div className='flex items-center gap-2'>
                    {/* Add Deploy Button alongside Download Button */}
                    {showPreview && (
                      <>
                        <Button
                          variant='outline'
                          size='sm'
                          onClick={handleDownload}
                          className='flex items-center gap-2'
                        >
                          <Download className='h-4 w-4' />
                          Download
                        </Button>
                        {deployedUrl ? (
                          <a
                            href={deployedUrl}
                            target='_blank'
                            rel='noopener noreferrer'
                            className='text-blue-500 hover:underline'
                          >
                            <Button
                              variant='outline'
                              size='sm'
                              className='flex items-center gap-2'
                            >
                              <SquareArrowOutUpRight className='h-4 w-4' />
                              Visit Site
                            </Button>
                          </a>
                        ) : (
                          <Button
                            variant='outline'
                            size='sm'
                            onClick={handleNetlifyDeploy}
                            disabled={isDeploying}
                            className='flex items-center gap-2'
                          >
                            {isDeploying ? (
                              <>
                                <Loader2 className='h-4 w-4 animate-spin' />
                                Deploying...
                              </>
                            ) : (
                              <>
                                <Rocket className='h-4 w-4' />
                                Deploy
                              </>
                            )}
                          </Button>
                        )}
                      </>
                    )}
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
                </div>
                {/* Chat Messages - Currently not wrapping the messages in a scroll area */}
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
                                ]?.content.slice(0, 27)}
                                {version.messages[version.messages.length - 2]
                                  ?.content.length > 27
                                  ? '...'
                                  : 'Start from scratch'}

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
                        {isGenerating ? (
                          <Loader2 className='h-4 w-4 animate-spin' />
                        ) : (
                          <Eye className='h-4 w-4' />
                        )}
                        {isGenerating ? 'Generating...' : 'Preview'}
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
                          webContainer={webcontainer}
                          files={files}
                        />
                      ) : (
                        <div className='h-full flex flex-col items-center justify-center'>
                          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground' />
                          <p className='mt-2 text-muted-foreground'>
                            The code is still being generated...wait for
                            preview.
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
