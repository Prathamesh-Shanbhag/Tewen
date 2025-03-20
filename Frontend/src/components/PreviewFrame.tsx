import { WebContainer } from '@webcontainer/api'
import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'

interface PreviewFrameProps {
  files: any[]
  webContainer: WebContainer
}

export function PreviewFrame({ files, webContainer }: PreviewFrameProps) {
  const [url, setUrl] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const hasStartedRef = useRef(false)
  const filesReadyRef = useRef(false)

  // Track when files are ready for installation
  useEffect(() => {
    if (files.length > 0) {
      filesReadyRef.current = true

      // Check if we should start the installation process
      if (!hasStartedRef.current) {
        startDevServer()
      }
    }
  }, [files])

  async function startDevServer() {
    if (hasStartedRef.current || !filesReadyRef.current) return

    hasStartedRef.current = true
    setIsLoading(true)

    try {
      console.log('Starting npm install...')
      const installProcess = await webContainer.spawn('npm', ['install'])

      // Log installation output
      installProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log('Install output:', data)
          },
        })
      )

      // Wait for installation to complete
      const installExitCode = await installProcess.exit

      if (installExitCode !== 0) {
        throw new Error(`Installation failed with exit code ${installExitCode}`)
      }

      console.log('Starting dev server...')
      const devProcess = await webContainer.spawn('npm', ['run', 'dev'])

      // Log dev server output
      devProcess.output.pipeTo(
        new WritableStream({
          write(data) {
            console.log('Dev server output:', data)
          },
        })
      )

      // Listen for server-ready event
      webContainer.on('server-ready', (port, serverUrl) => {
        console.log('Server ready on port:', port, 'URL:', serverUrl)
        setUrl(serverUrl)
        setIsLoading(false)
      })
    } catch (err) {
      console.error('Error starting dev server:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
      setIsLoading(false)
    }
  }

  return (
    <div className='h-full flex items-center justify-center text-gray-400'>
      {isLoading && (
        <div className='text-center'>
          <Loader2 className='h-8 w-8 animate-spin text-muted-foreground mx-auto mb-2' />
          <p>Setting up development environment...</p>
        </div>
      )}

      {error && (
        <div className='text-center text-red-500'>
          <p>Error: {error}</p>
          <button
            onClick={() => {
              hasStartedRef.current = false
              setError(null)
              startDevServer()
            }}
            className='mt-2 px-4 py-2 bg-blue-500 text-white rounded'
          >
            Retry
          </button>
        </div>
      )}

      {url && !isLoading && (
        <iframe
          width={'100%'}
          height={'100%'}
          src={url}
          title='Preview'
          sandbox='allow-forms allow-modals allow-popups allow-presentation allow-same-origin allow-scripts'
        />
      )}
    </div>
  )
}
