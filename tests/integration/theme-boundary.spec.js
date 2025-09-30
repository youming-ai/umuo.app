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

describe('Theme Boundary Scenarios', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  describe('Rapid Theme Switching', () => {
    it('should handle rapid theme switching without breaking', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Rapidly switch themes 10 times
      for (let i = 0; i < 10; i++) {
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

    it('should prevent theme switching during transitions', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate very rapid clicks
      fireEvent.click(themeButton)
      fireEvent.click(themeButton)
      fireEvent.click(themeButton)

      await waitFor(() => {
        // Should settle on one theme
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
        expect(hasLight && hasDark).toBe(false) // Should not have both
      })
    })
  })

  describe('System Theme Integration', () => {
    it('should respect system preference when no theme is stored', () => {
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

    it('should override system preference when user selects theme', async () => {
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

      const themeButton = screen.getByRole('button')

      // Should start with system preference (dark)
      expect(document.documentElement).toHaveClass('dark')

      // Click to switch to light (overriding system preference)
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('light')
      })
    })
  })

  describe('Large Content Rendering', () => {
    it('should handle theme switching with large amounts of content', async () => {
      const LargeContent = () => (
        <div>
          {Array.from({ length: 1000 }, (_, i) => (
            <div key={i} className="card p-4 mb-2">
              <h3 className="text-primary">Card {i}</h3>
              <p className="text-secondary">Content for card {i}</p>
              <button className="btn-primary">Button {i}</button>
            </div>
          ))}
          <Navigation />
        </div>
      )

      render(
        <TestWrapper>
          <LargeContent />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Switch themes with large content
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 5000 })

      // All elements should still be present and styled correctly
      const cards = document.querySelectorAll('.card')
      expect(cards).toHaveLength(1000)

      const buttons = document.querySelectorAll('.btn-primary')
      expect(buttons).toHaveLength(1000)
    })
  })

  describe('Memory and Performance Boundaries', () => {
    it('should not leak memory during theme switching', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      const initialMemory = performance.memory?.usedJSHeapSize || 0

      // Perform many theme switches
      for (let i = 0; i < 100; i++) {
        fireEvent.click(themeButton)
        await waitFor(() => {
          expect(document.documentElement.classList.contains('light') ||
                 document.documentElement.classList.contains('dark')).toBe(true)
        }, { timeout: 50 })
      }

      // Check if memory usage is reasonable (allowing some variance)
      if (performance.memory) {
        const finalMemory = performance.memory.usedJSHeapSize
        const memoryIncrease = finalMemory - initialMemory
        expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024) // Less than 50MB increase
      }
    })

    it('should maintain performance with deep component nesting', async () => {
      const DeeplyNestedComponent = ({ depth = 0 }: { depth?: number }) => {
        if (depth > 10) return <div className="text-primary">Deep content</div>

        return (
          <div className={`card depth-${depth}`}>
            <DeeplyNestedComponent depth={depth + 1} />
            <Navigation />
          </div>
        )
      }

      const startTime = performance.now()

      render(
        <TestWrapper>
          <DeeplyNestedComponent />
        </TestWrapper>
      )

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(1000) // Should render within 1 second

      const themeButton = screen.getByRole('button')
      const switchStartTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      const switchTime = performance.now() - switchStartTime
      expect(switchTime).toBeLessThan(500) // Theme switch should be fast
    })
  })

  describe('CSS Variable Limits', () => {
    it('should handle many CSS variables without performance degradation', async () => {
      // Create a component with many custom CSS variables
      const ManyVariablesComponent = () => (
        <div style={{
          '--custom-var-1': 'red',
          '--custom-var-2': 'blue',
          '--custom-var-3': 'green',
          '--custom-var-4': 'yellow',
          '--custom-var-5': 'purple',
          '--custom-var-6': 'orange',
          '--custom-var-7': 'pink',
          '--custom-var-8': 'brown',
          '--custom-var-9': 'gray',
          '--custom-var-10': 'black',
        } as React.CSSProperties}>
          <Navigation />
        </div>
      )

      render(
        <TestWrapper>
          <ManyVariablesComponent />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Should handle theme switching with many variables
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      // Variables should still be accessible
      const root = document.documentElement
      expect(root.style.getPropertyValue('--custom-var-1')).toBe('red')
    })
  })

  describe('Concurrent Theme Updates', () => {
    it('should handle concurrent theme update requests', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate concurrent theme updates
      const promises = Array.from({ length: 5 }, () =>
        new Promise(resolve => {
          setTimeout(() => {
            fireEvent.click(themeButton)
            resolve(true)
          }, Math.random() * 100)
        })
      )

      await Promise.all(promises)

      // Should end up in a consistent state
      await waitFor(() => {
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
        expect(hasLight && hasDark).toBe(false)
      })
    })
  })

  describe('Extreme Component States', () => {
    it('should handle theme switching with disabled elements', () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <button disabled className="btn-primary">Disabled Button</button>
            <input disabled className="form-input" placeholder="Disabled Input" />
            <select disabled className="form-select">
              <option>Disabled Select</option>
            </select>
            <Navigation />
          </div>
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Disabled elements should maintain their disabled state
      const disabledButton = screen.getByDisplayValue('Disabled Button')
      expect(disabledButton).toBeDisabled()

      const disabledInput = screen.getByPlaceholderText('Disabled Input')
      expect(disabledInput).toBeDisabled()

      const disabledSelect = screen.getByDisplayValue('Disabled Select')
      expect(disabledSelect).toBeDisabled()
    })

    it('should handle theme switching with hidden elements', async () => {
      const { container } = render(
        <TestWrapper>
          <div>
            <div className="hidden">Hidden Content</div>
            <div style={{ display: 'none' }}>Styled Hidden Content</div>
            <div className="invisible">Invisible Content</div>
            <Navigation />
          </div>
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      // Hidden elements should remain hidden
      const hiddenDiv = container.querySelector('.hidden')
      expect(hiddenDiv).toHaveClass('hidden')

      const invisibleDiv = container.querySelector('.invisible')
      expect(invisibleDiv).toHaveClass('invisible')
    })
  })

  describe('Browser Storage Limits', () => {
    it('should handle localStorage quota exceeded gracefully', () => {
      // Mock localStorage to throw quota exceeded error
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn(() => {
        throw new Error('QuotaExceededError')
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      fireEvent.click(themeButton)

      // Should handle error gracefully and still switch theme
      expect(document.documentElement).toHaveClass('dark')

      // Should log error
      expect(consoleSpy).toHaveBeenCalled()

      // Restore original localStorage
      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
    })

    it('should handle corrupted localStorage data', () => {
      // Set corrupted data in localStorage
      localStorage.setItem('theme', 'invalid-theme-value')

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

  describe('Network and Resource Boundaries', () => {
    it('should handle theme switching with slow-loading resources', async () => {
      // Mock slow image loading
      const SlowImage = () => {
        const [loaded, setLoaded] = React.useState(false)

        React.useEffect(() => {
          const timer = setTimeout(() => setLoaded(true), 1000)
          return () => clearTimeout(timer)
        }, [])

        return (
          <div>
            <img
              src="slow-image.jpg"
              alt="Slow loading image"
              onLoad={() => setLoaded(true)}
            />
            {!loaded && <div className="loading-spinner"></div>}
            <Navigation />
          </div>
        )
      }

      render(
        <TestWrapper>
          <SlowImage />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Should be able to switch theme even with slow resources
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })
    })
  })
})

// Import React for the component tests
import React from 'react'