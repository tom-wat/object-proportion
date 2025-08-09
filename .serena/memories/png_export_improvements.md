# PNG Export Improvements - Development Tasks

## Overview
Following the initial implementation of PNG export functionality, three key improvements have been identified to enhance the export experience.

## Tasks to Implement

### 1. Fix PNG Download Size Issue
**Problem**: PNG downloads at smaller resolution than original image size
- **Root Cause**: Image size changes during loading/display process
- **Investigation Needed**: Check image loading pipeline in useImageCanvas and ImageCanvas components
- **Likely Solution**: Preserve original image dimensions or scale canvas output to match original size
- **Files to Review**: 
  - `src/hooks/useImageCanvas.ts`
  - `src/components/ImageCanvas.tsx` 
  - Canvas rendering logic in drawing hooks

### 2. Change JSON/CSV Export to File Downloads
**Problem**: Currently exports copy to clipboard, should download as files
- **Current Behavior**: JSON/CSV data is copied to clipboard with fallback to file download
- **Required Change**: Always download as files instead of clipboard copy
- **Implementation**: Modify `handleExportJSON` and `handleExportCSV` in `src/hooks/useExport.ts`
- **Remove**: Clipboard copy functionality and alerts
- **Keep**: File download with timestamp naming

### 3. Include Sidebar Information in Image Export
**Problem**: PNG export only captures canvas, missing sidebar data visualization
- **Scope**: Capture both canvas and sidebar content in single image export
- **Technical Approach Options**:
  1. HTML to Canvas conversion for sidebar + canvas combination
  2. Screenshot API for combined layout capture
  3. Separate canvas rendering for sidebar data + merge with main canvas
- **Libraries to Consider**: 
  - html2canvas for HTML to canvas conversion
  - Canvas manipulation for combining multiple elements
- **UI Considerations**: Maintain current PNG button behavior but expand capture area

## Implementation Priority
1. **High**: Fix PNG size issue (affects current functionality)
2. **Medium**: Change JSON/CSV to file downloads (UX improvement)
3. **Medium**: Include sidebar in PNG export (feature enhancement)

## Technical Notes
- All changes should maintain existing minimal UI design
- PNG export should preserve high quality and original dimensions
- File naming convention should remain consistent: `analysis-[timestamp].[ext]`
- Error handling should provide clear user feedback

## Success Criteria
- PNG exports match original image dimensions
- JSON/CSV always download as files (no clipboard interaction)
- PNG export includes both canvas and sidebar information
- All exports maintain current quality and naming standards