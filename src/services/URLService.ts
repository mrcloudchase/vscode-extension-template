import axios from 'axios';
import * as cheerio from 'cheerio';
import { BaseService } from './BaseService';
import { ProcessingResult, InputFile, InputType, ProcessedContent } from '../models/InputModels';

/**
 * Service for fetching and processing web URLs
 */
export class URLService extends BaseService {
  private readonly timeout = 30000; // 30 seconds
  private readonly maxContentLength = 10 * 1024 * 1024; // 10MB

  

  async process(input: InputFile): Promise<ProcessingResult> {
    try {
      this.validateInput(input);
      this.log(`Processing URL: ${input.uri}`);

      // Fetch URL content
      const response = await axios.get(input.uri, {
        timeout: this.timeout,
        maxContentLength: this.maxContentLength,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VSCodeExtension/1.0)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        responseType: 'text',
      });

      const contentType = response.headers['content-type'] || '';
      let text = '';

      if (contentType.includes('text/html')) {
        // Parse HTML content
        text = this.extractTextFromHtml(response.data);
      } else if (contentType.includes('text/plain')) {
        // Plain text
        text = response.data;
      } else if (contentType.includes('application/json')) {
        // JSON content
        text = JSON.stringify(response.data, null, 2);
      } else {
        // Try to extract text anyway
        text = String(response.data);
      }

      const processedContent: ProcessedContent = {
        source: input.uri,
        type: InputType.URL,
        text: text.trim(),
        metadata: {
          url: input.uri,
          contentType,
          statusCode: response.status,
          contentLength: response.data.length,
        },
      };

      return {
        success: true,
        content: processedContent,
      };
    } catch (error) {
      this.logError(`Failed to process URL: ${input.uri}`, error);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          return {
            success: false,
            error: `HTTP ${error.response.status}: ${error.response.statusText}`,
          };
        } else if (error.request) {
          return {
            success: false,
            error: 'No response received from URL',
          };
        }
      }
      
      return {
        success: false,
        error: `Failed to process URL: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Extract text content from HTML
   */
  private extractTextFromHtml(html: string): string {
    const $ = cheerio.load(html);

    // Remove script and style elements
    $('script, style, noscript').remove();

    // Get page title
    const title = $('title').text().trim();

    // Get meta description
    const description = $('meta[name="description"]').attr('content') || '';

    // Get main content
    // Try to find main content areas
    const contentSelectors = [
      'main',
      'article',
      '[role="main"]',
      '.content',
      '#content',
      '.post',
      '.entry-content',
    ];

    let mainContent = '';
    for (const selector of contentSelectors) {
      const element = $(selector);
      if (element.length > 0) {
        mainContent = element.text();
        break;
      }
    }

    // If no main content found, get body text
    if (!mainContent) {
      mainContent = $('body').text();
    }

    // Clean up the text
    const cleanText = mainContent
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n{3,}/g, '\n\n') // Limit consecutive newlines
      .trim();

    // Compile the content
    const sections: string[] = [];
    
    if (title) {
      sections.push(`# ${title}\n`);
    }
    
    if (description) {
      sections.push(`Description: ${description}\n`);
    }
    
    sections.push(cleanText);

    return sections.join('\n');
  }

  /**
   * Fetch only headers without downloading content
   */
  async fetchHeaders(url: string): Promise<Record<string, any>> {
    try {
      const response = await axios.head(url, {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VSCodeExtension/1.0)',
        },
      });

      return {
        contentType: response.headers['content-type'],
        contentLength: response.headers['content-length'],
        lastModified: response.headers['last-modified'],
        statusCode: response.status,
      };
    } catch (error) {
      this.logError('Failed to fetch headers', error);
      return {};
    }
  }

  /**
   * Check if URL is accessible
   */
  async isAccessible(url: string): Promise<boolean> {
    try {
      const response = await axios.head(url, {
        timeout: 5000,
        validateStatus: (status) => status < 500,
      });
      return response.status < 400;
    } catch {
      return false;
    }
  }
}
