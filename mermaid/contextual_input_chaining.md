```mermaid
graph TD
    subgraph "Initial State"
        InitialPrompt[/"I need a landing page for my bakery"/]
        InitialSite["Simple Bakery Landing Page<br/>- Header with bakery name<br/>- About section<br/>- Basic product listing<br/>- Contact info"]
    end

    subgraph "Follow-up 1"
        FollowUp1[/"Add an order form for custom cakes"/]
        UpdatedSite1["Enhanced Bakery Site<br/>- Previous components preserved<br/>- NEW: Order form added<br/>- NEW: Form validation<br/>- Same styling maintained"]
    end

    subgraph "Follow-up 2"
        FollowUp2[/"Make it mobile responsive and add a gallery"/]
        UpdatedSite2["Responsive Bakery Site<br/>- Previous components preserved<br/>- NEW: Responsive layout<br/>- NEW: Photo gallery<br/>- Same branding/theme"]
    end

    subgraph "Context Preservation Mechanism"
        VersionHistory["Version History"
          <hr/>
          "- All previous code stored"
          "- File modifications tracked"
          "- Previous prompts retained"
          "- All inputs chained together"]

        DiffTracking["Diff Tracking"
          <hr/>
          "- Changes detected"
          "- Modified files identified"
          "- New dependencies tracked"
          "- Commands history preserved"]
    end

    InitialPrompt -->|"Generates"| InitialSite
    InitialSite -->|"Becomes context for"| FollowUp1
    FollowUp1 -->|"Modifies with context"| UpdatedSite1
    UpdatedSite1 -->|"Becomes context for"| FollowUp2
    FollowUp2 -->|"Modifies with context"| UpdatedSite2

    InitialSite -->|"Preserved in"| VersionHistory
    UpdatedSite1 -->|"Preserved in"| VersionHistory
    UpdatedSite1 -->|"Changes tracked by"| DiffTracking
    UpdatedSite2 -->|"Changes tracked by"| DiffTracking

    %% Styling
    classDef prompt fill:#f9f,stroke:#333,stroke-width:2px
    classDef site fill:#bfb,stroke:#333,stroke-width:1px
    classDef mechanism fill:#bbf,stroke:#333,stroke-width:1px

    class InitialPrompt,FollowUp1,FollowUp2 prompt
    class InitialSite,UpdatedSite1,UpdatedSite2 site
    class VersionHistory,DiffTracking mechanism
```
