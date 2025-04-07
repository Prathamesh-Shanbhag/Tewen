# Tewen: A Prompt-Based AI Website Generator

Tewen is an innovative tool that enables users to create fully functional websites through natural language prompts. The system leverages AI to transform plain English descriptions into deployable websites without requiring coding knowledge from the user.

## Project Overview

Tewen combines state-of-the-art language models with a streamlined web development workflow to make website creation accessible to everyone. Key features include:

- **Natural Language Interface**: Describe your website in plain English
- **Contextual Understanding**: Follow-up prompts modify the existing site rather than starting over
- **Full-Stack Generation**: Creates both frontend and backend components
- **Live Preview**: See your website changes in real-time
- **One-Click Deployment**: Deploy directly to Netlify with minimal effort
- **Multi-Model Support**: Choose between Claude 3.5 Sonnet, OpenAI models, or Gemini 2.5 Pro
- **AI Provider Flexibility**: Switch between AI providers based on your needs or preferences

## AI Model Support

Tewen supports multiple AI providers, allowing you to choose the model that best fits your needs:

- **Anthropic Claude 3.5 Sonnet**: The primary model, offering excellent code generation with detailed context understanding
- **OpenAI Models**: Support for various OpenAI models including GPT-4o Mini, providing alternative code generation approaches
- **Google Gemini 2.5 Pro Experimental**: Advanced code generation capabilities with strong technical understanding
- **OpenRouter Integration**: Work-in-progress integration to access multiple AI models through a single API (experimental)

The ability to switch between providers gives you flexibility in case one service is unavailable or if you prefer the output style of a particular model.

## System Architecture

Tewen operates with a dual architecture:

- **Backend**: Node.js Express server handling AI interactions and deployment services
- **Frontend**: React-based UI with WebContainer for in-browser code execution

The system uses WebContainer technology to run Node.js directly in the browser, enabling real-time code generation, execution, and preview without deploying to external servers during development.

## Key Components

### Backend Services

- **AI Code Generation**: Interfaces with multiple AI providers (Claude, OpenAI, Gemini) to generate code artifacts
- **Template Selector**: Detects optimal technology stack for user requirements
- **Netlify Integration**: Handles packaging and deployment to Netlify
- **AI Provider Manager**: Manages connections to different AI providers and handles fallbacks

### Frontend Features

- **Code Editor**: View and modify generated code with syntax highlighting
- **File Explorer**: Navigate generated project structure
- **Live Preview**: Real-time preview of the website in different screen sizes
- **Version History**: Track changes and revert to previous versions
- **Contextual Prompting**: Input follow-up prompts that build on previous generations
- **AI Provider Selection**: Choose your preferred AI provider for code generation

## Technical Implementation

Tewen implements several innovative technical approaches:

- **Prompt Enhancement**: Automatically enhances user prompts with technical context
- **Contextual Chaining**: Maintains context between interactions for iterative development
- **WebContainer Integration**: Runs Node.js in the browser for real-time execution
- **Artifact Generation**: Creates comprehensive artifacts including files and shell commands
- **Multi-Provider Architecture**: Modular system supporting different AI providers with consistent output format

## Visual Documentation

This repository includes visual documentation to explain the system architecture, workflows, and component interactions. These diagrams are designed to provide a clear understanding of how Tewen functions.

### Diagram Overview

The following diagrams are available in the `mermaid` directory:

1. **System Architecture**: High-level view of system components ([light](mermaid/system_architecture.md) | [dark](mermaid/system_architecture_dark.md))
2. **Prompt-to-Deployment Flow**: Step-by-step process from prompt to website ([view](mermaid/prompt_to_deployment_flow.md))
3. **Contextual Input Chaining**: Visualization of follow-up prompts modifying existing sites ([view](mermaid/contextual_input_chaining.md))
4. **Component Relationship Graph**: Detailed interaction between backend and frontend modules ([view](mermaid/component_relationship_graph.md))
5. **UI Layout Mockup**: Visualization of the user interface structure ([view](mermaid/ui_layout_mockup.md))

### Detailed Diagram Descriptions

#### 1. System Architecture Diagram

This diagram shows how the major components of Tewen interact:

- **Frontend UI**: User-facing interface elements for prompt input, code viewing, and website preview
- **Prompt Processing**: Mechanisms for enhancing user prompts and detecting the appropriate technology stack
- **Backend Services**: Core services including AI code generation, file management, and deployment

The diagram illustrates how user inputs flow through the system to generate and deploy websites.

#### 2. Prompt-to-Deployment Flowchart

This flowchart details the step-by-step process from when a user enters a prompt to when a website is deployed:

- **Prompt Processing**: How user prompts are enhanced and technology stacks detected
- **Code Generation & Execution**: The process of generating code artifacts and running them in WebContainer
- **Preview & Iteration**: The cycle of reviewing and refining the generated website
- **Finalization**: Options for downloading or deploying the completed website

#### 3. Contextual Input Chaining Visual

This diagram illustrates one of Tewen's key features - the ability to modify an existing website through follow-up prompts:

- Shows how initial prompts create a baseline website
- Demonstrates how follow-up prompts modify the existing site while preserving context
- Explains the mechanisms that enable context preservation, including version history and diff tracking

#### 4. Component Relationship Graph

This graph maps the relationships between specific backend and frontend modules:

- **Core Components**: The foundational elements like Express Server, AI Clients, and WebContainer
- **Backend Modules**: Services for prompt processing, template selection, and deployment
- **Frontend Modules**: Components for file generation, command execution, and preview rendering
- **Interfaces**: User-facing elements for code editing, file exploration, and chat interaction

The diagram shows how data flows between these components with specific file references.

#### 5. UI Layout Mockup

This diagram visualizes the user interface layout of Tewen:

- **Header**: Logo, title, and global actions
- **Left Panel**: Chat/prompt input, file explorer, and version history
- **Center Panel**: Code editor and terminal output
- **Right Panel**: Live preview with responsive controls and deployment options
- **Footer**: Status messages and credits

### Using the Diagrams

These diagrams are designed to be viewed with Mermaid rendering support. They can be:

1. Viewed directly in GitHub or any Markdown viewer that supports Mermaid syntax
2. Exported as SVG/PNG images for presentations or documentation
3. Embedded in project documentation or slides

### Light/Dark Mode Compatibility

All diagrams use color schemes that work well in both light and dark modes, with sufficient contrast to ensure readability in either environment. For the System Architecture diagram, dedicated light and dark mode versions are provided to ensure optimal viewing in different environments.

The dark mode version uses:

- A dark background with light text for better contrast
- Color schemes optimized for dark environments
- The same structure and information as the light version

### Customization

The diagrams are provided in Mermaid syntax and can be easily customized:

- Edit the Markdown files to modify the diagrams
- Adjust colors, labels, and relationships as needed
- Add new components or connections as the project evolves

## Author

Created by Prathamesh: Tewen - A Prompt-Based AI Website Generator
