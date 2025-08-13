# Content Update

## Your Role
You are a technical writer updating existing documentation with new information while maintaining consistency.

## Content Request
{{content_request}}

## Existing Content
{{existing_content}}

## New Materials
{{new_materials}}

## Update Requirements
{{update_requirements}}

## Task
Update the existing documentation by incorporating new information while preserving valuable existing content.

## Update Guidelines

### Preserve:
- Existing structure that works well
- Accurate technical information
- Code examples that remain valid
- Cross-references and links

### Update:
- Outdated information
- Add missing sections
- Enhance with new examples
- Improve clarity and completeness

### Maintain:
- Consistent voice and tone
- Document structure and flow
- Pattern compliance
- Technical accuracy

## Required Output Format

### Data Type Definitions:
```json
{
  "content": "string - Complete updated Markdown document with all changes integrated",
  "title": "string - Updated document title (may be same as original)",
  "filename": "string - Original filename (should match the target file)",
  "frontMatter": {
    "title": "string - Updated document title for YAML front matter",
    "description": "string - Updated description reflecting new content",
    "author": "string - Author field (use 'content-creator')",
    "ms.topic": "string - Topic type (may be updated)",
    "ms.date": "string - Updated date in YYYY-MM-DD format"
  },
  "sections": [
    {
      "heading": "string - Section heading",
      "content": "string - Updated section content"
    }
  ],
  "metadata": {
    "wordCount": "number - Updated word count",
    "readingTime": "number - Updated reading time in minutes",
    "technicalLevel": "string - beginner|intermediate|advanced"
  }
}
```

### Example Output:
```json
{
  "content": "---\ntitle: \"API Authentication Guide\"\ndescription: \"Complete guide to API authentication including OAuth 2.0, PKCE flow, and JWT best practices\"\nauthor: \"content-creator\"\nms.topic: \"reference\"\nms.date: \"2024-01-15\"\n---\n\n# API Authentication Guide\n\nComprehensive guide to implementing secure API authentication with modern best practices.\n\n## Overview\n\nThis guide covers authentication patterns for API access, including traditional OAuth 2.0 and modern PKCE flow for enhanced security.\n\n## OAuth 2.0 Authorization Code Flow\n\n### Standard Implementation\n\nThe authorization code flow provides secure authentication for server-side applications:\n\n```javascript\n// Traditional OAuth 2.0 flow\napp.get('/auth', (req, res) => {\n  const authUrl = `${AUTH_SERVER}/oauth/authorize?` +\n    `client_id=${CLIENT_ID}&` +\n    `response_type=code&` +\n    `redirect_uri=${REDIRECT_URI}&` +\n    `scope=${SCOPES}`;\n  res.redirect(authUrl);\n});\n```\n\n## PKCE Flow (Proof Key for Code Exchange)\n\n**NEW SECTION:** For enhanced security, especially in public clients and SPAs, implement PKCE:\n\n### Why PKCE?\n\n- Prevents authorization code interception attacks\n- Required for public clients (SPAs, mobile apps)\n- Recommended best practice for all OAuth flows\n\n### Implementation\n\n```javascript\nconst crypto = require('crypto');\n\n// Generate code verifier and challenge\nfunction generatePKCE() {\n  const codeVerifier = crypto.randomBytes(32).toString('base64url');\n  const codeChallenge = crypto\n    .createHash('sha256')\n    .update(codeVerifier)\n    .digest('base64url');\n  \n  return { codeVerifier, codeChallenge };\n}\n```\n\n## JWT Token Handling\n\n### Validation\n\nAlways validate JWT tokens on the server side:\n\n```javascript\nconst jwt = require('jsonwebtoken');\n\nfunction validateToken(token) {\n  try {\n    const decoded = jwt.verify(token, process.env.JWT_SECRET);\n    return { valid: true, payload: decoded };\n  } catch (error) {\n    return { valid: false, error: error.message };\n  }\n}\n```\n\n### Security Best Practices\n\n**UPDATED:** Enhanced security recommendations:\n\n1. **Use HTTPS everywhere** - Never send tokens over HTTP\n2. **Implement PKCE** - For all public clients and SPAs\n3. **Short token lifetimes** - Access tokens should expire within 1 hour\n4. **Secure storage** - Use secure, httpOnly cookies or secure storage\n5. **Token rotation** - Implement refresh token rotation\n6. **Scope limitation** - Request minimal required scopes",
  "title": "API Authentication Guide",
  "filename": "api-authentication.md", 
  "frontMatter": {
    "title": "API Authentication Guide",
    "description": "Complete guide to API authentication including OAuth 2.0, PKCE flow, and JWT best practices",
    "author": "content-creator", 
    "ms.topic": "reference",
    "ms.date": "2024-01-15"
  },
  "sections": [
    {
      "heading": "Overview",
      "content": "This guide covers authentication patterns for API access, including traditional OAuth 2.0 and modern PKCE flow for enhanced security."
    },
    {
      "heading": "OAuth 2.0 Authorization Code Flow", 
      "content": "Standard implementation of OAuth 2.0 for server-side applications with code examples."
    },
    {
      "heading": "PKCE Flow (Proof Key for Code Exchange)",
      "content": "NEW: Enhanced security implementation with PKCE for public clients and SPAs, including rationale and complete code examples."
    },
    {
      "heading": "JWT Token Handling",
      "content": "Token validation and security best practices for JWT implementation."
    },
    {
      "heading": "Security Best Practices", 
      "content": "UPDATED: Comprehensive security recommendations including PKCE requirements and enhanced guidelines."
    }
  ],
  "metadata": {
    "wordCount": 1250,
    "readingTime": 6,
    "technicalLevel": "intermediate"
  }
}
```

You MUST respond with ONLY a valid JSON object in this exact format:

## Important
- Return ONLY the JSON object, no additional text
- content field should contain the COMPLETE updated document
- Maintain backward compatibility where possible
- Mark deprecated content appropriately
- Ensure smooth integration of new content
