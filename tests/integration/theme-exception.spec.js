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

const TestWrapper = ({ children }: { children: React.ReactNode }) => (
  <ThemeProvider attribute="class" defaultTheme="light">
    {children}
  </ThemeProvider>
)

describe('Theme Exception Scenarios', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  describe('localStorage Failures', () => {
    it('should handle localStorage being disabled', () => {
      // Mock localStorage to throw errors
      const originalLocalStorage = global.localStorage
      Object.defineProperty(window, 'localStorage', {
        value: {
          getItem: jest.fn(() => {
            throw new Error('localStorage disabled')
          }),
          setItem: jest.fn(() => {
            throw new Error('localStorage disabled')
          }),
          removeItem: jest.fn(),
          clear: jest.fn(),
        },
        writable: true,
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still switch theme in DOM even if localStorage fails
      expect(document.documentElement).toHaveClass('dark')

      // Should log the error
      expect(consoleSpy).toHaveBeenCalled()

      // Restore localStorage
      global.localStorage = originalLocalStorage
      consoleSpy.mockRestore()
    })

    it('should handle localStorage quota exceeded', () => {
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        const error = new Error('QuotaExceededError')
        error.name = 'QuotaExceededError'
        throw error
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should handle gracefully
      expect(document.documentElement).toHaveClass('dark')
      expect(consoleSpy).toHaveBeenCalled()

      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
    })

    it('should handle corrupted localStorage data', () => {
      localStorage.setItem('theme', '{"invalid": json}')

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      // Should fallback to default theme
      expect(document.documentElement).toHaveClass('light')

      consoleSpy.mockRestore()
    })
  })

  describe('CSS Loading Failures', () => {
    it('should handle CSS loading failures gracefully', () => {
      // Mock a scenario where CSS fails to load
      const originalGetComputedStyle = window.getComputedStyle
      window.getComputedStyle = jest.fn(() => ({
        getPropertyValue: jest.fn(() => ''),
        backgroundColor: '',
        color: '',
        borderColor: '',
      }))

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still toggle theme classes
      expect(document.documentElement).toHaveClass('dark')

      window.getComputedStyle = originalGetComputedStyle
      consoleSpy.mockRestore()
    })

    it('should handle missing CSS variables', () => {
      // Remove CSS variables from document
      const originalStyle = document.documentElement.style.cssText
      document.documentElement.style.cssText = ''

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still function even without CSS variables
      expect(document.documentElement).toHaveClass('dark')

      // Restore styles
      document.documentElement.style.cssText = originalStyle
    })
  })

  describe('DOM Manipulation Failures', () => {
    it('should handle classList manipulation failures', () => {
      const originalAdd = document.documentElement.classList.add
      const originalRemove = document.documentElement.classList.remove

      document.documentElement.classList.add = jest.fn((...classes) => {
        if (classes.includes('dark')) {
          throw new Error('Failed to add class')
        }
        return originalAdd.call(document.documentElement.classList, ...classes)
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should handle the error gracefully
      expect(consoleSpy).toHaveBeenCalled()

      // Restore original methods
      document.documentElement.classList.add = originalAdd
      document.documentElement.classList.remove = originalRemove
      consoleSpy.mockRestore()
    })

    it('should handle document element being null', () => {
      const originalDocumentElement = Object.getOwnPropertyDescriptor(
        Document.prototype,
        'documentElement'
      )

      Object.defineProperty(Document.prototype, 'documentElement', {
        get: jest.fn(() => null),
        configurable: true,
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      expect(() => {
        render(
          <TestWrapper>
            <Navigation />
          </TestWrapper>
        )
      }).not.toThrow()

      consoleSpy.mockRestore()

      // Restore original property
      if (originalDocumentElement) {
        Object.defineProperty(Document.prototype, 'documentElement', originalDocumentElement)
      }
    })
  })

  describe('Component Rendering Errors', () => {
    it('should handle theme switching during component errors', () => {
      const ErrorComponent = () => {
        throw new Error('Component rendering error')
      }

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(
        <TestWrapper>
          <div>
            <Navigation />
            <ErrorBoundary>
              <ErrorComponent />
            </ErrorBoundary>
          </div>
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Theme should still switch even with component errors
      expect(document.documentElement).toHaveClass('dark')

      consoleSpy.mockRestore()
    })

    it('should handle missing theme provider', () => {
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Render Navigation without ThemeProvider
      expect(() => {
        render(<Navigation />)
      }).not.toThrow()

      consoleSpy.mockRestore()
    })
  })

  describe('Browser Compatibility Issues', () => {
    it('should handle browsers without classList support', () => {
      const originalClassList = document.documentElement.classList

      // Mock a browser without proper classList support
      Object.defineProperty(document.documentElement, 'classList', {
        value: {
          add: jest.fn(() => {
            throw new Error('classList not supported')
          }),
          remove: jest.fn(() => {
            throw new Error('classList not supported')
          }),
          contains: jest.fn(() => false),
          toggle: jest.fn(() => false),
        },
        writable: true,
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should handle the lack of classList support
      expect(consoleSpy).toHaveBeenCalled()

      // Restore original classList
      document.documentElement.classList = originalClassList
      consoleSpy.mockRestore()
    })

    it('should handle missing matchMedia API', () => {
      const originalMatchMedia = window.matchMedia

      // Remove matchMedia support
      delete (window as any).matchMedia

      render(
        <ThemeProvider attribute="class" defaultTheme="system">
          <Navigation />
        </ThemeProvider>
      )

      // Should fallback to default theme when system preference can't be detected
      expect(document.documentElement).toHaveClass('light')

      window.matchMedia = originalMatchMedia
    })
  })

  describe('Memory and Performance Issues', () => {
    it('should handle memory pressure during theme switching', () => {
      // Simulate memory pressure by creating many objects
      const largeArray = Array.from({ length: 10000 }, (_, i) => ({
        id: i,
        data: 'x'.repeat(1000),
      }))

      const { container } = render(
        <TestWrapper>
          <Navigation />
          {largeArray.map(item => (
            <div key={item.id} className="card">
              {item.data}
            </div>
          ))}
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still work under memory pressure
      expect(document.documentElement).toHaveClass('dark')
    })

    it('should handle rapid theme switching causing stack overflow', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Very rapid switching to potentially cause stack overflow
      const switchPromises = Array.from({ length: 1000 }, () =>
        new Promise(resolve => {
          setTimeout(() => {
            try {
              fireEvent.click(themeButton)
            } catch (error) {
              // Should handle any errors gracefully
            }
            resolve(true)
          }, 0)
        })
      )

      await Promise.all(switchPromises)

      // Should still be in a valid state
      expect(document.documentElement.classList.contains('light') ||
             document.documentElement.classList.contains('dark')).toBe(true)
    })
  })

  describe('Network and Resource Failures', () => {
    it('should handle network failures during theme loading', () => {
      // Mock network failure for external resources
      const originalFetch = global.fetch
      global.fetch = jest.fn(() => Promise.reject(new Error('Network error')))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still work despite network failures
      expect(document.documentElement).toHaveClass('dark')

      global.fetch = originalFetch
      consoleSpy.mockRestore()
    })

    it('should handle font loading failures', () => {
      // Mock font loading failure
      const originalLoad = FontFace.prototype.load
      FontFace.prototype.load = jest.fn(() => Promise.reject(new Error('Font load failed')))

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should still work despite font loading failures
      expect(document.documentElement).toHaveClass('dark')

      FontFace.prototype.load = originalLoad
      consoleSpy.mockRestore()
    })
  })

  describe('Security and Validation Failures', () => {
    it('should handle XSS attempts in theme data', () => {
      localStorage.setItem('theme', '<script>alert("xss")</script>')

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      // Should not execute malicious script
      expect(document.documentElement).toHaveClass('light')
      expect(document.querySelector('script')).toBeNull()

      consoleSpy.mockRestore()
    })

    it('should handle invalid theme values', () => {
      localStorage.setItem('theme', 'invalid-theme-name-with-html<script>')

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation()

      render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      // Should fallback to safe default
      expect(document.documentElement).toHaveClass('light')

      consoleSpy.mockRestore()
    })
  })

  describe('Race Conditions', () => {
    it('should handle concurrent theme updates with different sources', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate concurrent theme updates from different sources
      const updatePromises = [
        new Promise(resolve => {
          setTimeout(() => {
            localStorage.setItem('theme', 'dark')
            resolve(true)
          }, 10)
        }),
        new Promise(resolve => {
          setTimeout(() => {
            fireEvent.click(themeButton)
            resolve(true)
          }, 20)
        }),
        new Promise(resolve => {
          setTimeout(() => {
            localStorage.setItem('theme', 'light')
            resolve(true)
          }, 30)
        }),
      ]

      await Promise.all(updatePromises)

      // Should end up in a consistent state
      await waitFor(() => {
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
        expect(hasLight && hasDark).toBe(false)
      })
    })
  })
})

// Error Boundary component for testing
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return <div>Something went wrong.</div>
    }

    return this.props.children
  }
}

import React from 'react'