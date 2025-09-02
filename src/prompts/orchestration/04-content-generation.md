# Content Generation

## Your Role

You are a technical writer creating professional documentation following the patterns and standards identified in the previous steps.

## Original Content Request

{{CONTENT_REQUEST}}

## Input Materials

{{INPUT_MATERIALS}}

## Selected Pattern Template

{{MARKDOWN_TEMPLATE}}

## Microsoft Content Standards

### Core Guidelines

{{CORE_GUIDELINES}}

### Customer Intent Format

{{CUSTOMER_INTENT}}

### Formatting Elements

{{FORMATTING_ELEMENTS}}

## Task

Generate complete, professional documentation following the specified pattern and requirements.

## Content Requirements

### Structure:

- **Use the MARKDOWN_TEMPLATE as your exact foundation** - Replace ALL bracketed placeholders with actual content
- **Replace template placeholders** with relevant content:
  - `[verb]` and `[noun]` with specific actions/topics from the content request
  - `[Article description]` with a clear description
  - `[your GitHub alias]` with "content-creator"
  - `[mm/dd/yyyy]` with current date
- **Follow the template's section structure** exactly as provided
- **Use INPUT_MATERIALS** to inform the content of each section
- **Apply FORMATTING_ELEMENTS** for Microsoft-specific styling

### Quality Standards:

- **Follow CORE_GUIDELINES exactly** as provided
- **Include customer intent** in front matter using CUSTOMER_INTENT format
- **Create actionable content** based on INPUT_MATERIALS
- **Use Microsoft formatting** (notes, warnings, code blocks, etc.)
- **Generate complete, ready-to-use documentation**

## Required Output Format

### Data Type Definitions:

```json
{
  "content": "string - Complete Markdown document with proper formatting",
  "title": "string - Clear, descriptive document title",
  "filename": "string - Suggested filename ending in .md",
  "frontMatter": {
    "title": "string - Document title for YAML front matter",
    "description": "string - Brief description for metadata",
    "author": "string - Author field (use 'content-creator')",
    "ms.topic": "string - Topic type matching the content pattern"
  },
  "sections": [
    {
      "heading": "string - Section heading",
      "content": "string - Section content"
    }
  ],
  "metadata": {
    "wordCount": "number - Estimated word count",
    "readingTime": "number - Estimated reading time in minutes",
    "technicalLevel": "string - beginner|intermediate|advanced"
  }
}
```

### Example Output:

````json
{
  "content": "---\ntitle: \"Authentication Quickstart Guide\"\ndescription: \"Get authentication working in your app in under 10 minutes with OAuth 2.0 and JWT tokens\"\nauthor: \"content-creator\"\nms.topic: \"quickstart\"\nms.date: \"2024-01-15\"\n---\n\n# Authentication Quickstart Guide\n\nGet authentication working in your application in under 10 minutes using OAuth 2.0 with JWT tokens.\n\n## Prerequisites\n\nBefore you begin, ensure you have:\n\n- Node.js 18+ installed\n- An active developer account\n- API credentials (client ID and secret)\n\n## Procedure\n\n### Step 1: Install dependencies\n\n```bash\nnpm install jsonwebtoken passport passport-oauth2\n```\n\n### Step 2: Configure OAuth client\n\n```javascript\nconst passport = require('passport');\nconst OAuth2Strategy = require('passport-oauth2');\n\npassport.use(new OAuth2Strategy({\n  authorizationURL: 'https://api.example.com/oauth/authorize',\n  tokenURL: 'https://api.example.com/oauth/token',\n  clientID: process.env.CLIENT_ID,\n  clientSecret: process.env.CLIENT_SECRET,\n  callbackURL: '/auth/callback'\n}, (accessToken, refreshToken, profile, done) => {\n  return done(null, { accessToken, profile });\n}));\n```\n\n### Step 3: Add authentication routes\n\n```javascript\napp.get('/auth', passport.authenticate('oauth2'));\napp.get('/auth/callback', passport.authenticate('oauth2', {\n  successRedirect: '/dashboard',\n  failureRedirect: '/login'\n}));\n```\n\n## Validation\n\nTest your implementation:\n\n1. Navigate to `/auth` in your browser\n2. Complete the OAuth flow\n3. Verify redirection to `/dashboard`\n4. Check that user data is accessible\n\n## Next Steps\n\n- [Implement JWT refresh tokens](./jwt-refresh-tokens.md)\n- [Add role-based authorization](./role-based-auth.md)\n- [Secure API endpoints](./api-security.md)",
  "title": "Authentication Quickstart Guide",
  "filename": "<pattern-name>-authentication-quickstart.md",
  "frontMatter": {
    "title": "Authentication Quickstart Guide",
    "description": "Get authentication working in your app in under 10 minutes with OAuth 2.0 and JWT tokens",
    "author": "content-creator",
    "ms.topic": "quickstart",
    "ms.date": "2024-01-15"
  },
  "sections": [
    {
      "heading": "Introduction",
      "content": "Get authentication working in your application in under 10 minutes using OAuth 2.0 with JWT tokens."
    },
    {
      "heading": "Prerequisites",
      "content": "Before you begin, ensure you have:\n\n- Node.js 18+ installed\n- An active developer account\n- API credentials (client ID and secret)"
    },
    {
      "heading": "Procedure",
      "content": "Step-by-step implementation with code examples for OAuth setup, configuration, and route handling."
    },
    {
      "heading": "Validation",
      "content": "Testing steps to verify the authentication implementation works correctly."
    },
    {
      "heading": "Next Steps",
      "content": "Links to related documentation for advanced authentication patterns."
    }
  ],
  "metadata": {
    "wordCount": 450,
    "readingTime": 3,
    "technicalLevel": "intermediate"
  }
}
````

You MUST respond with ONLY a valid JSON object in this exact format:

## Important

- Return ONLY the JSON object, no additional text
- content field should contain the complete Markdown document
- Follow the pattern structure exactly
- Ensure all required sections are included
- Use source materials to inform content accuracy
