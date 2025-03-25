import { NavigationTool } from '../../../tools/browser/navigation.js';
import { ToolContext } from '../../../tools/common/types.js';
import { Page, Browser, BrowserContext } from 'playwright';
import { jest } from '@jest/globals';

// Mock the Page object
const mockGoto = jest.fn();
mockGoto.mockImplementation(() => Promise.resolve());
const mockIsClosed = jest.fn().mockReturnValue(false);

// Mock BrowserContext methods
const mockAddCookies = jest.fn().mockImplementation(() => Promise.resolve());
const mockContext = jest.fn().mockImplementation(() => ({
  addCookies: mockAddCookies
}));

const mockPage = {
  goto: mockGoto,
  isClosed: mockIsClosed,
  context: mockContext
} as unknown as Page;

// Mock the browser
const mockIsConnected = jest.fn().mockReturnValue(true);
const mockBrowser = {
  isConnected: mockIsConnected
} as unknown as Browser;

// Mock the server
const mockServer = {
  sendMessage: jest.fn()
};

// Mock context
const mockToolContext = {
  page: mockPage,
  browser: mockBrowser,
  server: mockServer
} as ToolContext;

describe('NavigationTool', () => {
  let navigationTool: NavigationTool;

  beforeEach(() => {
    jest.clearAllMocks();
    navigationTool = new NavigationTool(mockServer);
    // Reset mocks
    mockIsConnected.mockReturnValue(true);
    mockIsClosed.mockReturnValue(false);
    mockGoto.mockClear();
    mockGoto.mockImplementation(() => Promise.resolve());
    mockAddCookies.mockClear();
    mockAddCookies.mockImplementation(() => Promise.resolve());
  });

  test('should navigate to a URL', async () => {
    const args = {
      url: 'https://example.com',
      waitUntil: 'networkidle'
    };

    const result = await navigationTool.execute(args, mockToolContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle', timeout: 30000 });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Navigated to');
  });

  test('should handle navigation with specific browser type', async () => {
    const args = {
      url: 'https://example.com',
      waitUntil: 'networkidle',
      browserType: 'firefox'
    };

    const result = await navigationTool.execute(args, mockToolContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'networkidle', timeout: 30000 });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Navigated to');
  });

  test('should handle navigation with webkit browser type', async () => {
    const args = {
      url: 'https://example.com',
      browserType: 'webkit'
    };

    const result = await navigationTool.execute(args, mockToolContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load', timeout: 30000 });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Navigated to');
  });

  test('should handle navigation errors', async () => {
    const args = {
      url: 'https://example.com'
    };

    // Mock a navigation error
    mockGoto.mockImplementationOnce(() => Promise.reject(new Error('Navigation failed')));

    const result = await navigationTool.execute(args, mockToolContext);

    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load', timeout: 30000 });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Operation failed');
  });

  test('should handle missing page', async () => {
    const args = {
      url: 'https://example.com'
    };

    // Context with browser but without page
    const contextWithoutPage = {
      browser: mockBrowser,
      server: mockServer
    } as unknown as ToolContext;

    const result = await navigationTool.execute(args, contextWithoutPage);

    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available');
  });
  
  test('should handle disconnected browser', async () => {
    const args = {
      url: 'https://example.com'
    };
    
    // Mock disconnected browser
    mockIsConnected.mockReturnValueOnce(false);
    
    const result = await navigationTool.execute(args, mockToolContext);
    
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Browser is not connected');
  });
  
  test('should handle closed page', async () => {
    const args = {
      url: 'https://example.com'
    };
    
    // Mock closed page
    mockIsClosed.mockReturnValueOnce(true);
    
    const result = await navigationTool.execute(args, mockToolContext);
    
    expect(mockGoto).not.toHaveBeenCalled();
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Page is not available or has been closed');
  });

  test('should set cookie when cookie parameter is provided', async () => {
    const cookieData = {
      name: 'session_id',
      value: '1234567890',
      domain: 'example.com',
      path: '/dashboard',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    };
    
    const args = {
      url: 'https://example.com',
      cookie: cookieData
    };

    const result = await navigationTool.execute(args, mockToolContext);

    // 检查是否调用了添加cookie的方法
    expect(mockAddCookies).toHaveBeenCalledWith([{
      name: 'session_id',
      value: '1234567890',
      domain: 'example.com',
      path: '/dashboard',
      httpOnly: true,
      secure: true,
      sameSite: 'Strict'
    }]);

    // 确保cookie设置和导航都被调用
    expect(mockAddCookies).toHaveBeenCalled();
    expect(mockGoto).toHaveBeenCalled();
    
    // 检查导航是否成功
    expect(mockGoto).toHaveBeenCalledWith('https://example.com', { waitUntil: 'load', timeout: 30000 });
    expect(result.isError).toBe(false);
    expect(result.content[0].text).toContain('Navigated to');
  });

  test('should handle cookie with minimal properties', async () => {
    const args = {
      url: 'https://example.com',
      cookie: {
        name: 'basic_cookie',
        value: 'basic_value',
        domain: 'example.com'
      }
    };

    await navigationTool.execute(args, mockToolContext);

    // 验证没有额外属性的cookie处理
    expect(mockAddCookies).toHaveBeenCalledWith([
      expect.objectContaining({
        name: 'basic_cookie',
        value: 'basic_value',
        domain: 'example.com',
        path: '/' // 默认值应该是'/'
      })
    ]);
  });

  test('should handle cookie error gracefully', async () => {
    const args = {
      url: 'https://example.com',
      cookie: {
        name: 'session_id',
        value: '1234567890',
        domain: 'example.com'
      }
    };

    // 模拟添加cookie失败
    mockAddCookies.mockImplementationOnce(() => Promise.reject(new Error('Invalid cookie domain')));

    const result = await navigationTool.execute(args, mockToolContext);

    // 验证是否尝试添加cookie
    expect(mockAddCookies).toHaveBeenCalled();
    
    // 验证结果是错误
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Failed to set cookie');
    expect(result.content[0].text).toContain('Invalid cookie domain');
    
    // 验证在cookie错误时没有调用goto
    expect(mockGoto).not.toHaveBeenCalled();
  });

  test('should reject cookie without domain', async () => {
    const args = {
      url: 'https://example.com',
      cookie: {
        name: 'invalid_cookie',
        value: 'test_value'
      }
    };
    
    const result = await navigationTool.execute(args, mockToolContext);
    
    // 验证结果是错误
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain('Cookie domain is required');
    
    // 验证没有尝试添加cookie或导航
    expect(mockAddCookies).not.toHaveBeenCalled();
    expect(mockGoto).not.toHaveBeenCalled();
  });
}); 