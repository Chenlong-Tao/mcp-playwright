/**
 * 集成测试：验证cookie功能是否正常工作
 * 
 * 这个测试启动一个真实的浏览器，设置cookie，然后验证cookie是否被正确设置
 */

import { chromium, BrowserContext, Page } from 'playwright';
import { jest } from '@jest/globals';
import { handleToolCall } from '../../toolHandler.js';

describe('Cookie Integration Test', () => {
  let testServer: any;
  
  beforeAll(() => {
    // 创建一个测试服务器
    testServer = {
      sendMessage: jest.fn(),
      notification: jest.fn()
    };
  });
  
  // 这个测试需要在实际环境中验证，所以标记为可选测试
  // 在没有真实浏览器的CI环境中可能会失败
  test.skip('should set cookie correctly with navigate tool', async () => {
    // 设置测试用cookie
    const cookieData = {
      name: 'test_integration_cookie',
      value: 'integration_value',
      domain: 'example.com'  // domain必须提供
    };
    
    // 使用navigate工具调用
    await handleToolCall('playwright_navigate', {
      url: 'https://example.com',
      cookie: cookieData,
      headless: true // 使用无头模式避免弹出浏览器窗口
    }, testServer);
    
    // 使用evaluate工具验证cookie是否存在
    const evaluateResult = await handleToolCall('playwright_evaluate', {
      script: 'return document.cookie'
    }, testServer);
    
    // 检查结果中是否包含我们设置的cookie
    expect(evaluateResult.isError).toBe(false);
    // 由于cookie域限制，可能无法直接在页面中获取cookie
    // 另一种验证方法是使用context.cookies() API
    
    // 关闭浏览器
    await handleToolCall('playwright_close', {}, testServer);
  });
  
  // 手动验证的方法
  test.skip('manual cookie verification', async () => {
    let browser;
    let context: BrowserContext;
    let page: Page;
    
    try {
      browser = await chromium.launch({ headless: true });
      context = await browser.newContext();
      
      // 设置测试用cookie
      await context.addCookies([{
        name: 'manual_test_cookie',
        value: 'manual_test_value',
        domain: 'example.com',  // domain必须提供
        path: '/'
      }]);
      
      // 打开页面
      page = await context.newPage();
      await page.goto('https://example.com');
      
      // 获取所有cookie
      const cookies = await context.cookies();
      
      // 验证cookie是否存在
      const testCookie = cookies.find(c => c.name === 'manual_test_cookie');
      expect(testCookie).toBeDefined();
      if (testCookie) {
        expect(testCookie.value).toBe('manual_test_value');
      }
    } finally {
      // 清理资源
      if (browser) {
        await browser.close();
      }
    }
  });
}); 