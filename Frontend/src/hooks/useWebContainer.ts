import { useEffect, useState } from 'react'
import { WebContainer } from '@webcontainer/api'

// Module-level variables to implement the singleton pattern
let webcontainerInstance: WebContainer | null = null
let bootPromise: Promise<WebContainer> | null = null

export function useWebContainer() {
  const [webcontainer, setWebcontainer] = useState<WebContainer | undefined>(
    webcontainerInstance || undefined
  )

  useEffect(() => {
    // If we already have an instance, use it
    if (webcontainerInstance) {
      setWebcontainer(webcontainerInstance)
      return
    }

    // If we're already in the process of booting, wait for that promise
    if (bootPromise) {
      bootPromise.then((instance) => {
        setWebcontainer(instance)
      })
      return
    }

    // Otherwise, start the boot process
    const bootWebContainer = async () => {
      try {
        // Create the boot promise
        bootPromise = WebContainer.boot()
        // Wait for it to resolve
        webcontainerInstance = await bootPromise
        // Update state
        setWebcontainer(webcontainerInstance)
      } catch (error) {
        console.error('Failed to boot WebContainer:', error)
        // Reset the promise so we can try again
        bootPromise = null
      }
    }

    bootWebContainer()

    // Cleanup function
    return () => {
      // We don't actually clean up the WebContainer instance here
      // because we want it to persist across component unmounts
    }
  }, [])

  return webcontainer
}
