import { BrowserToolBase } from './base.js';
import { ToolContext, ToolResponse, createSuccessResponse, createErrorResponse } from '../common/types.js';
import { resetBrowserState } from '../../toolHandler.js';

/**
 * Tool for navigating to URLs
 */
export class NavigationTool extends BrowserToolBase {
  /**
   * Execute the navigation tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    // Check if browser is available
    if (!context.browser || !context.browser.isConnected()) {
      // If browser is not connected, we need to reset the state to force recreation
      resetBrowserState();
      return createErrorResponse(
        "Browser is not connected. The connection has been reset - please retry your navigation."
      );
    }

    // Check if page is available and not closed
    if (!context.page || context.page.isClosed()) {
      return createErrorResponse(
        "Page is not available or has been closed. Please retry your navigation."
      );
    }

    return this.safeExecute(context, async (page) => {
      try {
        // 如果提供了cookie参数，确保在导航前设置cookie
        if (args.cookie) {
          try {
            // 确保提供了必需的domain属性
            if (!args.cookie.domain) {
              return createErrorResponse("Cookie domain is required. Please provide a domain for the cookie.");
            }
            
            const browserContext = page.context();
            await browserContext.addCookies([{
              name: args.cookie.name,
              value: args.cookie.value,
              domain: args.cookie.domain,
              path: args.cookie.path || '/',
              expires: args.cookie.expires,
              httpOnly: args.cookie.httpOnly,
              secure: args.cookie.secure,
              sameSite: args.cookie.sameSite,
            }]);
          } catch (cookieError) {
            return createErrorResponse(`Failed to set cookie: ${(cookieError as Error).message}`);
          }
        }

        await page.goto(args.url, {
          timeout: args.timeout || 30000,
          waitUntil: args.waitUntil || "load"
        });
        
        return createSuccessResponse(`Navigated to ${args.url}`);
      } catch (error) {
        const errorMessage = (error as Error).message;
        
        // Check for common disconnection errors
        if (
          errorMessage.includes("Target page, context or browser has been closed") ||
          errorMessage.includes("Target closed") ||
          errorMessage.includes("Browser has been disconnected")
        ) {
          // Reset browser state to force recreation on next attempt
          resetBrowserState();
          return createErrorResponse(
            `Browser connection issue: ${errorMessage}. Connection has been reset - please retry your navigation.`
          );
        }
        
        // For other errors, return the standard error
        throw error;
      }
    });
  }
}

/**
 * Tool for closing the browser
 */
export class CloseBrowserTool extends BrowserToolBase {
  /**
   * Execute the close browser tool
   */
  async execute(args: any, context: ToolContext): Promise<ToolResponse> {
    if (context.browser) {
      try {
        // Check if browser is still connected
        if (context.browser.isConnected()) {
          await context.browser.close().catch(error => {
            console.error("Error while closing browser:", error);
          });
        } else {
          console.error("Browser already disconnected, cleaning up state");
        }
      } catch (error) {
        console.error("Error during browser close operation:", error);
        // Continue with resetting state even if close fails
      } finally {
        // Always reset the global browser and page references
        resetBrowserState();
      }
      
      return createSuccessResponse("Browser closed successfully");
    }
    
    return createSuccessResponse("No browser instance to close");
  }
} 