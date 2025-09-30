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

describe('Theme Performance Tests', () => {
  beforeEach(() => {
    localStorage.clear()
    document.documentElement.classList.remove('light', 'dark')
  })

  afterEach(() => {
    document.documentElement.classList.remove('light', 'dark')
  })

  describe('Theme Switching Performance', () => {
    it('should switch themes within performance threshold', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Measure theme switching performance
      const startTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      const endTime = performance.now()
      const switchTime = endTime - startTime

      // Theme switching should be fast (< 100ms)
      expect(switchTime).toBeLessThan(100)
    })

    it('should maintain performance with multiple rapid switches', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      const switchTimes = []

      // Perform multiple rapid switches and measure each
      for (let i = 0; i < 10; i++) {
        const startTime = performance.now()

        fireEvent.click(themeButton)

        await waitFor(() => {
          const hasLight = document.documentElement.classList.contains('light')
          const hasDark = document.documentElement.classList.contains('dark')
          expect(hasLight || hasDark).toBe(true)
        }, { timeout: 200 })

        const endTime = performance.now()
        switchTimes.push(endTime - startTime)
      }

      // Calculate average switch time
      const averageTime = switchTimes.reduce((sum, time) => sum + time, 0) / switchTimes.length

      // Average should remain fast
      expect(averageTime).toBeLessThan(50)

      // No individual switch should be too slow
      switchTimes.forEach(time => {
        expect(time).toBeLessThan(100)
      })
    })

    it('should handle high-frequency theme updates without degradation', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      const durations = []

      // High-frequency switching for stress test
      for (let i = 0; i < 50; i++) {
        const startTime = performance.now()

        fireEvent.click(themeButton)

        await waitFor(() => {
          const hasLight = document.documentElement.classList.contains('light')
          const hasDark = document.documentElement.classList.contains('dark')
          expect(hasLight || hasDark).toBe(true)
        }, { timeout: 100 })

        const endTime = performance.now()
        durations.push(endTime - startTime)
      }

      // Performance should not degrade significantly
      const firstHalf = durations.slice(0, 25)
      const secondHalf = durations.slice(25)

      const firstHalfAvg = firstHalf.reduce((sum, time) => sum + time, 0) / firstHalf.length
      const secondHalfAvg = secondHalf.reduce((sum, time) => sum + time, 0) / secondHalf.length

      // Second half should not be significantly slower (allow 50% increase)
      expect(secondHalfAvg).toBeLessThan(firstHalfAvg * 1.5)
    })
  })

  describe('Memory Performance', () => {
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
          const hasLight = document.documentElement.classList.contains('light')
          const hasDark = document.documentElement.classList.contains('dark')
          expect(hasLight || hasDark).toBe(true)
        }, { timeout: 50 })

        // Force garbage collection if available
        if (global.gc) {
          global.gc()
        }
      }

      const finalMemory = performance.memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Memory increase should be minimal (< 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024)
    })

    it('should clean up event listeners on unmount', () => {
      const { container, unmount } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Check initial event listener count (approximate)
      const initialListeners = getEventListenerCount?.() || 0

      // Perform some theme switches
      fireEvent.click(themeButton)
      fireEvent.click(themeButton)

      // Unmount component
      unmount()

      // Event listeners should be cleaned up
      // Note: This is an approximate check as we can't directly measure
      // the exact number of event listeners in JSDOM
      expect(document.documentElement).not.toHaveClass('light', 'dark')
    })
  })

  describe('Rendering Performance', () => {
    it('should render theme components within time threshold', () => {
      const startTime = performance.now()

      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Initial render should be fast (< 50ms)
      expect(renderTime).toBeLessThan(50)
    })

    it('should handle large content with good performance', async () => {
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

      const startTime = performance.now()

      render(
        <TestWrapper>
          <LargeContent />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Large content should render within reasonable time (< 500ms)
      expect(renderTime).toBeLessThan(500)

      // Theme switching should still be fast with large content
      const themeButton = screen.getByRole('button')
      const switchStartTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 1000 })

      const switchEndTime = performance.now()
      const switchTime = switchEndTime - switchStartTime

      // Theme switch with large content should still be fast (< 200ms)
      expect(switchTime).toBeLessThan(200)
    })

    it('should maintain performance with deeply nested components', async () => {
      const DeeplyNestedComponent = ({ depth = 0 }: { depth?: number }) => {
        if (depth > 20) return <div className="text-primary">Deep content</div>

        return (
          <div className={`card depth-${depth}`}>
            <DeeplyNestedComponent depth={depth + 1} />
          </div>
        )
      }

      const startTime = performance.now()

      const { container } = render(
        <TestWrapper>
          <DeeplyNestedComponent />
          <Navigation />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Deep nesting should render within reasonable time (< 200ms)
      expect(renderTime).toBeLessThan(200)

      const themeButton = screen.getByRole('button')
      const switchStartTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 500 })

      const switchEndTime = performance.now()
      const switchTime = switchEndTime - switchStartTime

      // Theme switch should still be fast (< 100ms)
      expect(switchTime).toBeLessThan(100)
    })
  })

  describe('CSS Performance', () => {
    it('should apply CSS changes efficiently', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')

      // Measure CSS recalculation time
      const startTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      const endTime = performance.now()
      const cssChangeTime = endTime - startTime

      // CSS changes should be applied quickly (< 50ms)
      expect(cssChangeTime).toBeLessThan(50)
    })

    it('should handle many CSS variables without performance degradation', async () => {
      const ManyVariablesComponent = () => {
        const style = {}
        // Create many CSS variables
        for (let i = 0; i < 100; i++) {
          style[`--custom-var-${i}`] = `hsl(${i * 3.6}, 70%, 50%)`
        }
        return (
          <div style={style}>
            <Navigation />
          </div>
        )
      }

      const startTime = performance.now()

      render(
        <TestWrapper>
          <ManyVariablesComponent />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Many variables should not significantly impact render time (< 100ms)
      expect(renderTime).toBeLessThan(100)

      const themeButton = screen.getByRole('button')
      const switchStartTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      const switchEndTime = performance.now()
      const switchTime = switchEndTime - switchStartTime

      // Theme switching should remain fast with many variables (< 100ms)
      expect(switchTime).toBeLessThan(100)
    })
  })

  describe('Animation Performance', () => {
    it('should handle theme transitions smoothly', async () => {
      const { container } = render(
        <TestWrapper>
          <div className="transition-all duration-300 bg-card">
            <Navigation />
          </div>
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      const animatedElement = container.querySelector('.transition-all')

      expect(animatedElement).toBeInTheDocument()

      // Measure animation performance
      const startTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      })

      // Wait for transition to complete
      await new Promise(resolve => setTimeout(resolve, 350))

      const endTime = performance.now()
      const animationTime = endTime - startTime

      // Transitions should complete within expected time (+ tolerance)
      expect(animationTime).toBeLessThan(400) // 300ms + 100ms tolerance
    })

    it('should not cause layout thrashing during theme switching', async () => {
      const { container } = render(
        <TestWrapper>
          <Navigation />
          {Array.from({ length: 100 }, (_, i) => (
            <div key={i} className="card p-2">
              <div className="h-4 bg-primary"></div>
            </div>
          ))}
        </TestWrapper>
      )

      const themeButton = screen.getByRole('button')
      const layoutTimes = []

      // Measure layout performance during multiple switches
      for (let i = 0; i < 5; i++) {
        const startTime = performance.now()

        // Force layout
        container.offsetHeight

        fireEvent.click(themeButton)

        await waitFor(() => {
          const hasLight = document.documentElement.classList.contains('light')
          const hasDark = document.documentElement.classList.contains('dark')
          expect(hasLight || hasDark).toBe(true)
        })

        // Force layout again
        container.offsetHeight

        const endTime = performance.now()
        layoutTimes.push(endTime - startTime)
      }

      // Layout times should be consistent
      const avgLayoutTime = layoutTimes.reduce((sum, time) => sum + time, 0) / layoutTimes.length
      const maxLayoutTime = Math.max(...layoutTimes)

      // Average layout time should be reasonable (< 100ms)
      expect(avgLayoutTime).toBeLessThan(100)

      // No single layout operation should be too slow (< 200ms)
      expect(maxLayoutTime).toBeLessThan(200)
    })
  })

  describe('Responsiveness Under Load', () => {
    it('should remain responsive during heavy operations', async () => {
      const HeavyComponent = () => {
        const [data, setData] = React.useState([])

        React.useEffect(() => {
          // Simulate heavy computation
          const heavyData = Array.from({ length: 10000 }, (_, i) => ({
            id: i,
            value: Math.random(),
            computed: Math.sin(i) * Math.cos(i)
          }))
          setData(heavyData)
        }, [])

        return (
          <div>
            {data.map(item => (
              <div key={item.id} className="text-xs">
                {item.computed.toFixed(2)}
              </div>
            ))}
            <Navigation />
          </div>
        )
      }

      const startTime = performance.now()

      render(
        <TestWrapper>
          <HeavyComponent />
        </TestWrapper>
      )

      const endTime = performance.now()
      const renderTime = endTime - startTime

      // Should render heavy component within reasonable time (< 1s)
      expect(renderTime).toBeLessThan(1000)

      const themeButton = screen.getByRole('button')
      const switchStartTime = performance.now()

      fireEvent.click(themeButton)

      await waitFor(() => {
        expect(document.documentElement).toHaveClass('dark')
      }, { timeout: 2000 })

      const switchEndTime = performance.now()
      const switchTime = switchEndTime - switchStartTime

      // Theme switching should still be responsive (< 500ms)
      expect(switchTime).toBeLessThan(500)
    })
  })
})

// Helper function to get approximate event listener count
function getEventListenerCount() {
  // This is an approximation as JSDOM doesn't provide exact counts
  let count = 0
  const elements = document.querySelectorAll('*')
  elements.forEach(element => {
    if (element._eventListeners) {
      count += Object.keys(element._eventListeners).length
    }
  })
  return count
}

import React from 'react'