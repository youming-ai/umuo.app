# UI Issues Fix Plan

## Issues to Fix (from UI Test Report)

### 1. Navigation Bar Icon Display Problem - HIGH PRIORITY
**Problem**: Material Icons font may not be loading correctly
**Impact**: Navigation icons cannot display properly
**Root Cause**: Missing font-family declaration in CSS

### 2. Contrast Optimization - MEDIUM PRIORITY
**Problem**: Some secondary text visibility insufficient in dark mode
**Impact**: User experience and accessibility
**Root Cause**: Text-muted color contrast too low (#9ca3af)

### 3. Scrollbar Style Unification - LOW PRIORITY
**Problem**: Inconsistent scrollbar styles across components
**Impact**: Visual experience inconsistency
**Root Cause**: Only player-subtitle-container has custom scrollbar

## Implementation Plan

### Stage 1: Fix Material Icons Loading
- Add proper font-family declaration to CSS
- Ensure font-weight and font-style are set correctly
- Test icon display in both light and dark modes

### Stage 2: Improve Text Contrast
- Update text-muted colors for better contrast
- Ensure WCAG AA compliance (4.5:1 ratio)
- Test in both themes

### Stage 3: Unify Scrollbar Styles
- Create CSS variables for scrollbar colors
- Apply consistent scrollbar styles to all scrollable areas
- Maintain accessibility and visual consistency

## Testing Plan
- Test each fix in development environment
- Verify no regression in existing functionality
- Check accessibility compliance
- Validate visual consistency

## Status
- Stage 1: ✅ Complete - Added proper Material Icons font-family and styling
- Stage 2: ✅ Complete - Improved text-muted contrast for better readability
- Stage 3: ✅ Complete - Added unified scrollbar CSS variables and utility classes