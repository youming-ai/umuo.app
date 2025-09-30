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

describe('Theme Chaos Engineering Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  describe('Storage Chaos', () => {
    it('should survive localStorage corruption and recovery', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Corrupt localStorage with invalid data
      localStorage.setItem('theme', 'corrupted{invalid}json')

      // Simulate storage event corruption
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn((key, value) => {
        if (key === 'theme') {
          // Simulate corruption after 3rd write
          const callCount = localStorage.setItem.mock.calls.length
          if (callCount === 3) {
            throw new Error('Storage corrupted')
          }
        }
        return originalSetItem.call(localStorage, key, value)
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Perform multiple theme switches
      fireEvent.click(themeButton)
      fireEvent.click(themeButton)
      fireEvent.click(themeButton) // This should trigger corruption

      await waitFor(() => {
        // Should still be in a valid state despite corruption
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
      })

      // Restore localStorage
      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
    })

    it('should handle storage quota exhaustion during theme switching', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Fill localStorage to near capacity
      const largeData = 'x'.repeat(1024 * 1024) // 1MB
      for (let i = 0; i < 5; i++) {
        try {
          localStorage.setItem(`large-data-${i}`, largeData)
        } catch (e) {
          // Stop when quota is exceeded
          break
        }
      }

      // Mock quota exceeded for theme operations
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn((key, value) => {
        if (key === 'theme') {
          throw new Error('QuotaExceededError: Storage quota exceeded')
        }
        return originalSetItem.call(localStorage, key, value)
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      fireEvent.click(themeButton)

      // Should handle quota exceeded gracefully
      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('QuotaExceededError'),
        expect.any(Error)
      )

      localStorage.setItem = originalSetItem
      consoleSpy.mockRestore()
    })

    it('should recover from localStorage being cleared during operation', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Set initial theme
      localStorage.setItem('theme', 'dark')
      fireEvent.click(themeButton)

      // Clear localStorage during theme operation
      const originalSetItem = localStorage.setItem
      localStorage.setItem = jest.fn((key, value) => {
        if (key === 'theme') {
          // Simulate storage being cleared
          localStorage.clear()
        }
        return originalSetItem.call(localStorage, key, value)
      })

      fireEvent.click(themeButton)

      await waitFor(() => {
        // Should recover to a valid state
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
      })

      localStorage.setItem = originalSetItem
    })
  })

  describe('Network Chaos', () => {
    it('should handle intermittent network failures during theme loading', async () => {
      // Mock fetch to simulate network failures
      const originalFetch = global.fetch
      let fetchCallCount = 0

      global.fetch = jest.fn(() => {
        fetchCallCount++
        if (fetchCallCount % 3 === 0) {
          return Promise.reject(new Error('Network timeout'))
        }
        return Promise.resolve(new Response(''))
      })

      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Perform multiple theme switches with network failures
      for (let i = 0; i < 6; i++) {
        fireEvent.click(themeButton)
        await waitFor(() => {
          const hasLight = document.documentElement.classList.contains('light')
          const hasDark = document.documentElement.classList.contains('dark')
          expect(hasLight || hasDark).toBe(true)
        }, { timeout: 500 })
      }

      // Should have experienced some network failures but recovered
      expect(fetchCallCount).toBeGreaterThan(0)

      global.fetch = originalFetch
    })

    it('should handle slow CSS loading', async () => {
      // Mock CSS loading delays
      const originalGetComputedStyle = window.getComputedStyle
      let computeDelay = 0

      window.getComputedStyle = jest.fn((element) => {
        // Simulate slow CSS computation
        return new Promise(resolve => {
          setTimeout(() => {
            resolve(originalGetComputedStyle.call(window, element))
          }, computeDelay)
        })
      })

      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Increase delay progressively
      computeDelay = 100
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 1000 })

      // Should handle slow CSS loading
      expect(document.documentElement).toHaveClass('dark')

      window.getComputedStyle = originalGetComputedStyle
    })
  })

  describe('Memory Chaos', () => {
    it('should handle memory pressure during theme switching', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Create memory pressure
      const memoryHog = []
      for (let i = 0; i < 1000; i++) {
        memoryHog.push(new Array(10000).fill(Math.random()))
      }

      // Switch themes under memory pressure
      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 2000 })

      // Should still function under memory pressure
      expect(document.documentElement).toHaveClass('dark')

      // Clean up memory
      memoryHog.length = 0
    })

    it('should survive rapid component mounting/unmounting with theme changes', async () => {
      const { container, rerender } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Rapid mount/unmount cycles with theme changes
      for (let i = 0; i < 10; i++) {
        // Switch theme
        fireEvent.click(themeButton)

        // Unmount and remount
        rerender(
          <TestWrapper>
            <div>Unmounted</div>
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.queryByRole('button')).toBeNull()
        }, { timeout: 100 })

        // Remount with navigation
        rerender(
          <TestWrapper>
            <Navigation />
          </TestWrapper>
        )

        await waitFor(() => {
          expect(screen.getByRole('button')).toBeInTheDocument()
        }, { timeout: 100 })
      }

      // Should end up in a consistent state
      const hasLight = document.documentElement.classList.contains('light')
      const hasDark = document.documentElement.classList.contains('dark')
      expect(hasLight || hasDark).toBe(true)
    })
  })

  describe('DOM Chaos', () => {
    it('should handle DOM manipulation failures during theme switching', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Mock classList to occasionally fail
      const originalAdd = document.documentElement.classList.add
      const originalRemove = document.documentElement.classList.remove
      let failureCount = 0

      document.documentElement.classList.add = jest.fn((...classes) => {
        failureCount++
        if (failureCount % 3 === 0) {
          throw new Error('DOM manipulation failed')
        }
        return originalAdd.call(document.documentElement.classList, ...classes)
      })

      document.documentElement.classList.remove = jest.fn((...classes) => {
        failureCount++
        if (failureCount % 3 === 0) {
          throw new Error('DOM manipulation failed')
        }
        return originalRemove.call(document.documentElement.classList, ...classes)
      })

      const consoleSpy = jest.spyOn(console, 'error').mockImplementation()

      // Attempt multiple theme switches
      for (let i = 0; i < 6; i++) {
        fireEvent.click(themeButton)
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Should have experienced some failures but recovered
      expect(consoleSpy).toHaveBeenCalledTimes(expect.any(Number))

      // Restore original methods
      document.documentElement.classList.add = originalAdd
      document.documentElement.classList.remove = originalRemove
      consoleSpy.mockRestore()
    })

    it('should handle document element being replaced during theme operations', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Replace document element during theme operation
      const originalDocumentElement = document.documentElement
      let replacementCount = 0

      const originalAdd = document.documentElement.classList.add
      document.documentElement.classList.add = jest.fn((...classes) => {
        replacementCount++
        if (replacementCount === 2) {
          // Create a new element to replace the current one
          const newElement = document.createElement('html')
          newElement.className = 'replaced-element'
          document.replaceChild(newElement, document.documentElement)
        }
        return originalAdd.call(document.documentElement.classList, ...classes)
      })

      fireEvent.click(themeButton)

      await waitFor(() => {
        // Should handle the replacement gracefully
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
      }, { timeout: 1000 })

      document.documentElement.classList.add = originalAdd
    })
  })

  describe('Concurrency Chaos', () => {
    it('should handle simultaneous theme updates from multiple sources', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate concurrent theme updates
      const concurrentUpdates = [
        // Click-based update
        new Promise(resolve => {
          setTimeout(() => {
            fireEvent.click(themeButton)
            resolve('click')
          }, 10)
        }),
        // Storage-based update
        new Promise(resolve => {
          setTimeout(() => {
            localStorage.setItem('theme', 'light')
            window.dispatchEvent(new StorageEvent('storage', {
              key: 'theme',
              newValue: 'light'
            }))
            resolve('storage')
          }, 20)
        }),
        // System-based update
        new Promise(resolve => {
          setTimeout(() => {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
            mediaQuery.dispatchEvent(new MediaQueryListEvent('change', {
              matches: true,
              media: '(prefers-color-scheme: dark)'
            }))
            resolve('system')
          }, 30)
        })
      ]

      await Promise.all(concurrentUpdates)

      await waitFor(() => {
        // Should resolve to a consistent state
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
        expect(hasLight && hasDark).toBe(false)
      }, { timeout: 1000 })
    })

    it('should handle race conditions in theme state management', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Create race conditions with rapid, overlapping updates
      const racePromises = Array.from({ length: 20 }, (_, i) =>
        new Promise(resolve => {
          setTimeout(() => {
            const targetTheme = i % 2 === 0 ? 'dark' : 'light'
            localStorage.setItem('theme', targetTheme)
            fireEvent.click(themeButton)
            resolve(i)
          }, Math.random() * 100)
        })
      )

      await Promise.all(racePromises)

      await waitFor(() => {
        // Should settle into a valid state despite race conditions
        const hasLight = document.documentElement.classList.contains('light')
        const hasDark = document.documentElement.classList.contains('dark')
        expect(hasLight || hasDark).toBe(true)
        expect(hasLight && hasDark).toBe(false)
      }, { timeout: 2000 })
    })
  })

  describe('Resource Exhaustion', () => {
    it('should handle exhaustion of CSS custom properties', async () => {
      // Create component with many custom properties
      const ExhaustiveComponent = () => {
        const style = {}
        // Create near the limit of custom properties
        for (let i = 0; i < 1000; i++) {
          style[`--exhaustive-var-${i}`] = `value-${i}`
        }
        return (
          <div style={style}>
            <Navigation />
          </div>
        )
      }

      const { container } = render(
        <TestWrapper>
          <ExhaustiveComponent />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 2000 })

      // Should handle resource exhaustion gracefully
      expect(document.documentElement).toHaveClass('dark')
    })

    it('should handle event listener exhaustion', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Add many event listeners to simulate exhaustion
      const cleanupFunctions = []
      for (let i = 0; i < 1000; i++) {
        const handler = () => {}
        window.addEventListener(`test-event-${i}`, handler)
        cleanupFunctions.push(() => {
          window.removeEventListener(`test-event-${i}`, handler)
        })
      }

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 2000 })

      // Should function despite many existing listeners
      expect(document.documentElement).toHaveClass('dark')

      // Cleanup
      cleanupFunctions.forEach(cleanup => cleanup())
    })
  })

  describe('Browser Environment Chaos', () => {
    it('should handle browser being put into background during theme operations', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate page visibility changes
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: true
      })

      document.dispatchEvent(new Event('visibilitychange'))

      fireEvent.click(themeButton)

      // Simulate page becoming visible again
      Object.defineProperty(document, 'hidden', {
        writable: true,
        value: false
      })

      document.dispatchEvent(new Event('visibilitychange'))

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 1000 })

      // Should handle visibility changes gracefully
      expect(document.documentElement).toHaveClass('dark')
    })

    it('should handle browser tab being suspended during theme operations', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Simulate tab freeze/suspend
      const originalRequestAnimationFrame = window.requestAnimationFrame
      window.requestAnimationFrame = jest.fn((callback) => {
        // Delay the callback to simulate suspended tab
        setTimeout(callback, 1000)
      })

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 2000 })

      // Should handle suspension and recovery
      expect(document.documentElement).toHaveClass('dark')

      window.requestAnimationFrame = originalRequestAnimationFrame
    })
  })
})

import React from 'react'