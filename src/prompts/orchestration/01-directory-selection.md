# Directory Selection for Technical Documentation

## Your Role

You're a senior technical documentation specialist.

## Content Request

{{CONTENT_REQUEST}}

## Task

Use your built-in workspace tools to recursively explore the workspace structure and select the optimal directory for this content request.

## Exploration Instructions

1. **Explore the workspace**: Use the built-in #search tool to explore the structure
2. **Find documentation areas**: Look for existing documentation directories and patterns
3. **Consider content alignment**: Match the content request to appropriate directory structure

## Decision Criteria

1. **Semantic Alignment**: Directory name and purpose matches content request
2. **Existing Patterns**: Follow the established documentation organization

## Required Output Format

### Data Type Definitions:

```json
{
  "selectedDirectory": "string - Relative path to the chosen directory",
  "reasoning": "string - Detailed explanation of the selection decision",
  "confidence": "float - Confidence score between 0.0 and 1.0",
  "existingFiles": ["string array - List of existing markdown files in directory"],
  "directoryPurpose": "string - Description of what this directory is used for",
  "alternativeOptions": [
    {
      "directory": "string - Alternative directory path",
      "reason": "string - Why this was considered but not selected"
    }
  ]
}
```

### Example Output:

```json
{
  "selectedDirectory": "docs/guides",
  "reasoning": "After exploring the workspace, I found that '/docs/guides' is the established location for user-facing documentation. It contains multiple guide documents with consistent naming patterns. The content request for authentication documentation aligns perfectly with existing security-related guides in this directory. This placement ensures discoverability and maintains the established information architecture.",
  "confidence": 0.92,
  "existingFiles": ["getting-started.md", "security-overview.md", "api-authentication.md"],
  "directoryPurpose": "User-facing guides and tutorials for developers implementing features",
  "alternativeOptions": [
    {
      "directory": "docs/api",
      "reason": "Could work for API-specific auth but would fragment user experience across directories"
    },
    {
      "directory": "docs/security", 
      "reason": "More specialized focus but lacks existing content and user traffic patterns"
    }
  ]
}
```

You MUST respond with ONLY a valid JSON object in this exact format:

## Important

- Return ONLY the JSON object, no additional text
- Use only built-in tools to understand the actual workspace structure
- Ensure the selectedDirectory path exists in the workspace by validating with built-in tools
- Base decisions on actual repository patterns discovered through exploration
- Include reasoning that explains what you found during workspace exploration
- Ensure that existingFiles contains ALL files in the selected directory by recursively listing out files using built-in tooling
