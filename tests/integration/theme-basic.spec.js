import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider } from 'next-themes'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import Navigation from '@/components/ui/Navigation'

// Mock Next.js router
jest.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}))

// Mock routes
jest.mock('@/lib/routes', () => ({
  ROUTES: {
    HOME: '/',
    ACCOUNT: '/account',
    SETTINGS: '/settings',
  },
}))

const TestWrapper = ({ children }) => (
  <ThemeProvider attribute="class" defaultTheme="light">
    {children}
  </ThemeProvider>
)

describe('Theme Basic Functionality', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  it('should render navigation with theme toggle button', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button', { name: /切换至暗色主题/i })
    expect(themeButton).toBeInTheDocument()
    expect(themeButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('should switch from light to dark theme when button is clicked', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button', { name: /切换至暗色主题/i })

    // Initial state should be light
    expect(document.documentElement).toHaveClass('light')
    expect(themeButton).toHaveAttribute('aria-pressed', 'false')

    // Click to switch to dark theme
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })

    // Button should now indicate light theme
    const lightThemeButton = screen.getByRole('button', { name: /切换至浅色主题/i })
    expect(lightThemeButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('should switch from dark to light theme when button is clicked', async () => {
    // Start with dark theme
    localStorage.setItem('theme', 'dark')

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Should have light theme button in dark mode
    const themeButton = screen.getByRole('button', { name: /切换至浅色主题/i })
    expect(themeButton).toHaveAttribute('aria-pressed', 'true')

    // Click to switch to light theme
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('light')
    })

    // Button should now indicate dark theme
    const darkThemeButton = screen.getByRole('button', { name: /切换至暗色主题/i })
    expect(darkThemeButton).toHaveAttribute('aria-pressed', 'false')
  })

  it('should persist theme preference in localStorage', async () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button', { name: /切换至暗色主题/i })

    // Switch to dark theme
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })

    // Check localStorage
    expect(localStorage.getItem('theme')).toBe('dark')
  })

  it('should load theme from localStorage on mount', () => {
    // Set theme in localStorage before rendering
    localStorage.setItem('theme', 'dark')

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Should load dark theme from localStorage
    expect(document.documentElement).toHaveClass('dark')
    const themeButton = screen.getByRole('button', { name: /切换至浅色主题/i })
    expect(themeButton).toHaveAttribute('aria-pressed', 'true')
  })

  it('should handle rapid theme switching without breaking', async () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button')

    // Rapidly switch themes 5 times
    for (let i = 0; i < 5; i++) {
      fireEvent.click(themeButton)
      await waitFor(() => {
        expect(document.documentElement.classList.contains('light') ||
               document.documentElement.classList.contains('dark')).toBe(true)
      }, { timeout: 100 })
    }

    // Should still be in a valid state
    expect(document.documentElement.classList.contains('light') ||
           document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('should render all navigation links correctly', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Check all navigation links are present
    expect(screen.getByRole('link', { name: '文件' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '用户中心' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: '设置' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /切换至暗色主题/i })).toBeInTheDocument()
  })

  it('should have correct ARIA attributes for accessibility', () => {
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button', { name: /切换至暗色主题/i })

    // Check accessibility attributes
    expect(themeButton).toHaveAttribute('aria-label')
    expect(themeButton).toHaveAttribute('aria-pressed', 'false')
    expect(themeButton).toHaveAttribute('title')
  })

  it('should handle system theme preference', () => {
    // Mock system preference to dark
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: jest.fn().mockImplementation(query => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        onchange: null,
        addListener: jest.fn(),
        removeListener: jest.fn(),
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        dispatchEvent: jest.fn(),
      })),
    })

    render(
      <ThemeProvider attribute="class" defaultTheme="system">
        <Navigation />
      </ThemeProvider>
    )

    // Should apply dark theme based on system preference
    expect(document.documentElement).toHaveClass('dark')
  })

  it('should maintain consistent state across multiple renders', async () => {
    const { rerender } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button', { name: /切换至暗色主题/i })

    // Switch theme
    fireEvent.click(themeButton)

    await waitFor(() => {
      expect(document.documentElement).toHaveClass('dark')
    })

    // Rerender component
    rerender(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Theme should persist
    expect(document.documentElement).toHaveClass('dark')
    expect(screen.getByRole('button', { name: /切换至浅色主题/i })).toHaveAttribute('aria-pressed', 'true')
  })

  it('should handle localStorage errors gracefully', () => {
    // Mock localStorage to throw errors
    const originalSetItem = localStorage.setItem
    localStorage.setItem = jest.fn(() => {
      throw new Error('localStorage disabled')
    })

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const themeButton = screen.getByRole('button')
    fireEvent.click(themeButton)

    // Should still switch theme in DOM even if localStorage fails
    expect(document.documentElement).toHaveClass('dark')

    // Restore localStorage
    localStorage.setItem = originalSetItem
    consoleSpy.mockRestore()
  })

  it('should have navigation container with proper styling classes', () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const nav = container.querySelector('nav')
    expect(nav).toBeInTheDocument()
    expect(nav).toHaveClass('fixed', 'top-4', 'left-1/2', '-translate-x-1/2', 'z-20')

    const navContainer = container.querySelector('nav > div')
    expect(navContainer).toBeInTheDocument()
    expect(navContainer).toHaveClass('flex', 'items-center', 'gap-1', 'rounded-full')
  })

  it('should display correct icons for navigation items', () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Check for Material Icons
    const icons = container.querySelectorAll('.material-symbols-outlined')
    expect(icons.length).toBeGreaterThan(0)

    // Check for specific icons - using container query since they're not in the main screen
    expect(container.querySelector('.material-symbols-outlined')).toBeInTheDocument()
    expect(container.innerHTML).toContain('folder')
    expect(container.innerHTML).toContain('account_circle')
    expect(container.innerHTML).toContain('settings')
    expect(container.innerHTML).toContain('dark_mode')
  })
})