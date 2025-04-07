```mermaid
graph TD
    subgraph "Tewen UI Layout"
        direction TB

        subgraph "Header"
            direction LR
            Logo["🚀 Tewen Logo"] --- Title["Tewen: AI Website Generator"]
            Title --- Actions["Actions Menu"]
        end

        subgraph "Main Content"
            direction LR

            subgraph "Left Panel"
                direction TB
                ChatPanel["Chat/Prompt Panel"
                    <hr/>
                    "- Prompt Input Area"
                    "- AI Message History"
                    "- Submit Button"]

                FilePanel["File Explorer Panel"
                    <hr/>
                    "- Folder Tree"
                    "- File List"
                    "- Selection Controls"]

                VersionPanel["Version History"
                    <hr/>
                    "- Saved Versions"
                    "- Restore Controls"]

                ChatPanel --- FilePanel
                FilePanel --- VersionPanel
            end

            subgraph "Center Panel"
                direction TB
                CodeEditor["Code Editor"
                    <hr/>
                    "- Syntax Highlighting"
                    "- Line Numbers"
                    "- Edit Controls"]

                TerminalOutput["Terminal Output"
                    <hr/>
                    "- Command History"
                    "- Install Progress"
                    "- Error Messages"]

                CodeEditor --- TerminalOutput
            end

            subgraph "Right Panel"
                direction TB
                PreviewHeader["Preview Controls"
                    <hr/>
                    "- Device Toggle"
                    "- Expand/Collapse"
                    "- Refresh Button"]

                PreviewFrame["Live Preview"
                    <hr/>
                    "- Interactive Website"
                    "- Auto-refreshing"
                    "- Responsive Testing"]

                DeployOptions["Deployment Options"
                    <hr/>
                    "- Download ZIP"
                    "- Deploy to Netlify"
                    "- Share Link"]

                PreviewHeader --- PreviewFrame
                PreviewFrame --- DeployOptions
            end
        end

        subgraph "Footer"
            direction LR
            Status["Status Messages"] --- ProgressBar["Generation Progress"] --- Credits["Created by Prathamesh"]
        end

        Header --- Main Content
        Main Content --- Footer
    end

    %% Styling
    classDef header fill:#f96,stroke:#333,stroke-width:1px
    classDef leftPanel fill:#bbf,stroke:#333,stroke-width:1px
    classDef centerPanel fill:#bfb,stroke:#333,stroke-width:1px
    classDef rightPanel fill:#fbf,stroke:#333,stroke-width:1px
    classDef footer fill:#ddd,stroke:#333,stroke-width:1px

    class Logo,Title,Actions header
    class ChatPanel,FilePanel,VersionPanel leftPanel
    class CodeEditor,TerminalOutput centerPanel
    class PreviewHeader,PreviewFrame,DeployOptions rightPanel
    class Status,ProgressBar,Credits footer
```
