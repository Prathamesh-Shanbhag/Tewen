// File system related types
export interface FileItem {
  name: string
  type: 'file' | 'folder'
  path?: string
  content?: string
  children?: FileItem[]
}

// Deployment related types
export interface DeploymentRequest {
  files: FileItem[]
  projectTitle: string
}

export interface DeploymentResponse {
  success: boolean
  message: string
  deployUrl: string
  projectDir: string
}

// Project metadata
export interface ProjectMetadata {
  projectTitle: string
  deploymentDate: string
  fileCount: number
}
