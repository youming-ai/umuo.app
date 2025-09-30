import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ThemeProvider, useTheme } from 'next-themes'
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals'
import Navigation from '@/components/ui/Navigation'
import { ThemeProvider as AppThemeProvider } from 'next-themes'
import FileCard from '@/components/file/FileCard'
import { SettingsCard, SettingsRow, SettingsRowContent } from '@/components/settings/SettingsCard'

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

// Mock database types
jest.mock('@/types/database', () => ({
  TranscriptionProgress: {},
  FileRow: {},
  TranscriptRow: {},
}))

// Test wrapper component
const TestWrapper = ({ children }) => (
  <AppThemeProvider attribute="class" defaultTheme="light">
    {children}
  </AppThemeProvider>
)

describe('Theme Switching Functionality', () => {
  beforeEach(() => {
    // Clear any existing theme classes
    document.documentElement.classList.remove('light', 'dark')
    // Reset localStorage
    localStorage.clear()
  })

  afterEach(() => {
    // Cleanup theme classes after each test
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
    render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    // Start with dark theme
    document.documentElement.classList.add('dark')
    document.documentElement.classList.remove('light')

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
})

describe('Tailwind CSS Component Styling', () => {
  const mockFile = {
    id: '1',
    name: 'test-audio.mp3',
    size: 1024,
    type: 'audio/mpeg',
    created_at: new Date().toISOString(),
  }

  const mockTranscript = {
    id: '1',
    file_id: '1',
    status: 'completed',
    content: 'Test transcript content',
    created_at: new Date().toISOString(),
  }

  it('should apply correct button-primary styles in light theme', () => {
    const { container } = render(
      <TestWrapper>
        <div className="btn-primary">Test Button</div>
      </TestWrapper>
    )

    const button = container.querySelector('.btn-primary')
    expect(button).toBeInTheDocument()

    // Check computed styles for light theme
    const styles = window.getComputedStyle(button)
    expect(styles.backgroundColor).toBe('rgb(22, 101, 52)') // --color-primary
    expect(styles.color).toBe('rgb(255, 255, 255)') // --button-text-color
  })

  it('should apply correct button-primary styles in dark theme', () => {
    document.documentElement.classList.add('dark')

    const { container } = render(
      <TestWrapper>
        <div className="btn-primary">Test Button</div>
      </TestWrapper>
    )

    const button = container.querySelector('.btn-primary')
    expect(button).toBeInTheDocument()

    // Check computed styles for dark theme
    const styles = window.getComputedStyle(button)
    expect(styles.backgroundColor).toBe('rgb(22, 101, 52)') // --color-primary (same in both themes)
    expect(styles.color).toBe('rgb(255, 255, 255)') // --button-text-color
  })

  it('should apply correct card styles in light theme', () => {
    const { container } = render(
      <TestWrapper>
        <div className="card">
          <div className="card-header">Header</div>
          <div className="card-body">Content</div>
        </div>
      </TestWrapper>
    )

    const card = container.querySelector('.card')
    expect(card).toBeInTheDocument()

    const styles = window.getComputedStyle(card)
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)') // --surface-card
    expect(styles.borderColor).toBe('rgb(229, 231, 235)') // --border-primary
  })

  it('should apply correct card styles in dark theme', () => {
    document.documentElement.classList.add('dark')

    const { container } = render(
      <TestWrapper>
        <div className="card">
          <div className="card-header">Header</div>
          <div className="card-body">Content</div>
        </div>
      </TestWrapper>
    )

    const card = container.querySelector('.card')
    expect(card).toBeInTheDocument()

    const styles = window.getComputedStyle(card)
    expect(styles.backgroundColor).toBe('rgb(30, 41, 59)') // --surface-card in dark theme
    expect(styles.borderColor).toBe('rgb(51, 65, 85)') // --border-primary in dark theme
  })

  it('should apply correct file card styles', () => {
    const { container } = render(
      <TestWrapper>
        <FileCard
          file={mockFile}
          transcript={mockTranscript}
          onPlay={jest.fn()}
          onDelete={jest.fn()}
          onRetry={jest.fn()}
        />
      </TestWrapper>
    )

    const fileCard = container.querySelector('.file-card')
    expect(fileCard).toBeInTheDocument()

    const styles = window.getComputedStyle(fileCard)
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)') // --card-background-color
    expect(styles.borderColor).toBe('rgb(229, 231, 235)') // --border-primary
  })

  it('should apply correct settings card styles', () => {
    const { container } = render(
      <TestWrapper>
        <SettingsCard>
          <SettingsRow>
            <SettingsRowContent title="Test Title" description="Test Description" />
          </SettingsRow>
        </SettingsCard>
      </TestWrapper>
    )

    const settingsCard = container.querySelector('.settings-card')
    expect(settingsCard).toBeInTheDocument()

    const styles = window.getComputedStyle(settingsCard)
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)') // --card-background-color
    expect(styles.borderColor).toBe('rgb(229, 231, 235)') // --settings-border-color
  })
})

describe('CSS Variables and Custom Styles', () => {
  it('should define correct CSS variables for light theme', () => {
    render(
      <TestWrapper>
        <div>Test Content</div>
      </TestWrapper>
    )

    const rootStyles = window.getComputedStyle(document.documentElement)

    // Check primary color variables
    expect(rootStyles.getPropertyValue('--color-primary')).toBe('rgb(22, 101, 52)')
    expect(rootStyles.getPropertyValue('--text-primary')).toBe('rgb(17, 24, 39)')
    expect(rootStyles.getPropertyValue('--bg-primary')).toBe('rgb(255, 247, 227)')
    expect(rootStyles.getPropertyValue('--border-primary')).toBe('rgb(229, 231, 235)')
  })

  it('should define correct CSS variables for dark theme', () => {
    document.documentElement.classList.add('dark')

    render(
      <TestWrapper>
        <div>Test Content</div>
      </TestWrapper>
    )

    const rootStyles = window.getComputedStyle(document.documentElement)

    // Check dark theme variables
    expect(rootStyles.getPropertyValue('--text-primary')).toBe('rgb(248, 250, 252)')
    expect(rootStyles.getPropertyValue('--bg-primary')).toBe('rgb(15, 23, 42)')
    expect(rootStyles.getPropertyValue('--border-primary')).toBe('rgb(51, 65, 85)')
  })

  it('should apply scrollbar styles consistently', () => {
    const { container } = render(
      <TestWrapper>
        <div className="scrollbar-custom" style={{ height: '100px', overflow: 'auto' }}>
          <div style={{ height: '200px' }}>Long content</div>
        </div>
      </TestWrapper>
    )

    const scrollableDiv = container.querySelector('.scrollbar-custom')
    expect(scrollableDiv).toBeInTheDocument()

    // Check if scrollbar styles are applied (this is a basic check)
    const styles = window.getComputedStyle(scrollableDiv)
    expect(styles.overflowY).toBe('auto')
  })

  it('should apply correct hover states for interactive elements', () => {
    const { container } = render(
      <TestWrapper>
        <button className="btn-primary">Hover Me</button>
      </TestWrapper>
    )

    const button = container.querySelector('.btn-primary')
    expect(button).toBeInTheDocument()

    // Simulate hover
    fireEvent.mouseEnter(button)

    const styles = window.getComputedStyle(button)
    // Should have hover state applied (this would depend on the actual CSS implementation)
    expect(styles.cursor).toBe('pointer')
  })
})

describe('Form Component Styling', () => {
  it('should apply correct input styles in light theme', () => {
    const { container } = render(
      <TestWrapper>
        <input type="text" className="form-input" placeholder="Test input" />
      </TestWrapper>
    )

    const input = container.querySelector('.form-input')
    expect(input).toBeInTheDocument()

    const styles = window.getComputedStyle(input)
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(styles.borderColor).toBe('rgb(229, 231, 235)')
    expect(styles.color).toBe('rgb(17, 24, 39)')
  })

  it('should apply correct input styles in dark theme', () => {
    document.documentElement.classList.add('dark')

    const { container } = render(
      <TestWrapper>
        <input type="text" className="form-input" placeholder="Test input" />
      </TestWrapper>
    )

    const input = container.querySelector('.form-input')
    expect(input).toBeInTheDocument()

    const styles = window.getComputedStyle(input)
    expect(styles.backgroundColor).toBe('rgb(30, 41, 59)') // Dark input background
    expect(styles.borderColor).toBe('rgb(51, 65, 85)') // Dark input border
    expect(styles.color).toBe('rgb(248, 250, 252)') // Dark input text
  })

  it('should apply correct checkbox styles', () => {
    const { container } = render(
      <TestWrapper>
        <label>
          <input type="checkbox" className="form-checkbox" />
          <span>Checkbox label</span>
        </label>
      </TestWrapper>
    )

    const checkbox = container.querySelector('.form-checkbox')
    expect(checkbox).toBeInTheDocument()
    expect(checkbox).toHaveAttribute('type', 'checkbox')
  })

  it('should apply correct select styles', () => {
    const { container } = render(
      <TestWrapper>
        <select className="form-select">
          <option>Option 1</option>
          <option>Option 2</option>
        </select>
      </TestWrapper>
    )

    const select = container.querySelector('.form-select')
    expect(select).toBeInTheDocument()

    const styles = window.getComputedStyle(select)
    expect(styles.backgroundColor).toBe('rgb(255, 255, 255)')
    expect(styles.borderColor).toBe('rgb(229, 231, 235)')
  })
})

describe('Navigation Component Theme Integration', () => {
  it('should apply correct navigation container styles in light theme', () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const navContainer = container.querySelector('.nav-container')
    expect(navContainer).toBeInTheDocument()

    const styles = window.getComputedStyle(navContainer)
    expect(styles.backgroundColor).toBe('rgba(255, 255, 255, 0.85)') // --nav-container-background
  })

  it('should apply correct navigation container styles in dark theme', () => {
    document.documentElement.classList.add('dark')

    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const navContainer = container.querySelector('.nav-container')
    expect(navContainer).toBeInTheDocument()

    const styles = window.getComputedStyle(navContainer)
    expect(styles.backgroundColor).toBe('rgba(30, 41, 59, 0.8)') // Dark nav background
  })

  it('should update navigation icon colors based on theme', () => {
    const { container } = render(
      <TestWrapper>
        <Navigation />
      </TestWrapper>
    )

    const icons = container.querySelectorAll('.material-symbols-outlined')
    expect(icons.length).toBeGreaterThan(0)

    icons.forEach(icon => {
      const styles = window.getComputedStyle(icon)
      expect(styles.color).toBe('rgb(22, 101, 52)') // --color-primary with opacity
    })
  })
})

describe('Theme Consistency Across Components', () => {
  it('should maintain consistent color scheme across all components', () => {
    const { container } = render(
      <TestWrapper>
        <div className="btn-primary">Button</div>
        <div className="card">Card</div>
        <div className="file-card">File Card</div>
        <SettingsCard>Settings Card</SettingsCard>
      </TestWrapper>
    )

    // Get all component elements
    const button = container.querySelector('.btn-primary')
    const card = container.querySelector('.card')
    const fileCard = container.querySelector('.file-card')
    const settingsCard = container.querySelector('.settings-card')

    // All should use the same primary color
    const buttonStyles = window.getComputedStyle(button)
    const cardStyles = window.getComputedStyle(card)
    const fileCardStyles = window.getComputedStyle(fileCard)
    const settingsCardStyles = window.getComputedStyle(settingsCard)

    // Primary color should be consistent
    expect(buttonStyles.backgroundColor).toBe('rgb(22, 101, 52)')

    // Background colors should be consistent for cards
    expect(cardStyles.backgroundColor).toBe(fileCardStyles.backgroundColor)
    expect(cardStyles.backgroundColor).toBe(settingsCardStyles.backgroundColor)
  })

  it('should maintain consistent text colors', () => {
    const { container } = render(
      <TestWrapper>
        <h1 className="text-primary">Primary Text</h1>
        <p className="text-secondary">Secondary Text</p>
        <span className="text-muted">Muted Text</span>
      </TestWrapper>
    )

    const primaryText = container.querySelector('.text-primary')
    const secondaryText = container.querySelector('.text-secondary')
    const mutedText = container.querySelector('.text-muted')

    const primaryStyles = window.getComputedStyle(primaryText)
    const secondaryStyles = window.getComputedStyle(secondaryText)
    const mutedStyles = window.getComputedStyle(mutedText)

    expect(primaryStyles.color).toBe('rgb(17, 24, 39)') // --text-primary
    expect(secondaryStyles.color).toBe('rgb(75, 85, 99)') // --text-secondary
    expect(mutedStyles.color).toBe('rgb(107, 114, 128)') // --text-muted
  })
})