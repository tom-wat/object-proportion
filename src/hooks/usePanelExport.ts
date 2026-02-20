import { useCallback } from 'react';

function trimCanvasBottom(canvas: HTMLCanvasElement, bgColor = { r: 255, g: 255, b: 255 }, tolerance = 10): HTMLCanvasElement {
  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  const { width, height } = canvas;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  let lastContentRow = 0;
  for (let y = height - 1; y >= 0; y--) {
    let rowHasContent = false;
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      if (
        Math.abs(r - bgColor.r) > tolerance ||
        Math.abs(g - bgColor.g) > tolerance ||
        Math.abs(b - bgColor.b) > tolerance
      ) {
        rowHasContent = true;
        break;
      }
    }
    if (rowHasContent) {
      lastContentRow = y;
      break;
    }
  }

  const trimmedHeight = lastContentRow + 16; // small bottom padding
  const trimmed = document.createElement('canvas');
  trimmed.width = width;
  trimmed.height = Math.min(trimmedHeight, height);
  const trimCtx = trimmed.getContext('2d');
  if (trimCtx) {
    trimCtx.drawImage(canvas, 0, 0);
  }
  return trimmed;
}

export function usePanelExport() {
  const exportPanelAsImage = useCallback(async (elementId: string, filename?: string) => {
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Element not found:', elementId);
        return;
      }

      // Wait for fonts to load to prevent text rendering issues
      await document.fonts.ready;

      // Store original styles to restore later
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      
      // Temporarily adjust element for better capture
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      element.style.maxHeight = 'none';

      // Add temporary styles to fix text rendering issues and hide unwanted sections
      const tempStyle = document.createElement('style');
      tempStyle.setAttribute('data-html2canvas-temp', 'true');
      tempStyle.textContent = `
        #${elementId} * {
          transition: none !important;
          animation: none !important;
          font-feature-settings: "liga" 0 !important;
          text-rendering: geometricPrecision !important;
        }
        #${elementId} img {
          display: inline-block !important;
        }
        #${elementId} .panel-export-hide {
          display: none !important;
        }
      `;
      document.head.appendChild(tempStyle);

      // Wait a bit for style changes to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Configure html2canvas options for better quality and scroll handling
      const options = {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 10000,
        height: element.scrollHeight,
        windowHeight: element.scrollHeight,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc: Document) => {
          // Fix any remaining positioning issues in the cloned document
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.position = 'static';
            
            // Force height recalculation based on visible content
            const computedHeight = clonedElement.scrollHeight;
            clonedElement.style.height = computedHeight + 'px';
            clonedElement.style.minHeight = 'auto';
            clonedElement.style.maxHeight = computedHeight + 'px';
            
            // Remove any fixed positioned elements that might cause issues
            const fixedElements = clonedElement.querySelectorAll('[style*="position: fixed"]');
            fixedElements.forEach(el => {
              (el as HTMLElement).style.position = 'absolute';
            });

            // Fix input element rendering issues by replacing them with divs
            const inputElements = clonedElement.querySelectorAll('input[type="text"]');
            inputElements.forEach(input => {
              const inputEl = input as HTMLInputElement;
              const div = clonedDoc.createElement('div');
              
              // Copy the input's computed styles
              const computedStyle = window.getComputedStyle(inputEl);
              
              // Clone all attributes and styles
              div.className = inputEl.className;
              div.style.cssText = inputEl.style.cssText;
              
              // Set the text content
              div.textContent = inputEl.value;
              
              // Apply minimal positioning fixes for html2canvas
              div.style.border = computedStyle.border;
              div.style.borderRadius = computedStyle.borderRadius;
              div.style.padding = computedStyle.padding;
              div.style.margin = computedStyle.margin;
              div.style.fontSize = computedStyle.fontSize;
              div.style.fontFamily = computedStyle.fontFamily;
              div.style.fontWeight = computedStyle.fontWeight;
              div.style.color = computedStyle.color;
              div.style.backgroundColor = computedStyle.backgroundColor;
              div.style.width = computedStyle.width;
              div.style.height = computedStyle.height;
              div.style.boxSizing = computedStyle.boxSizing;
              
              // Critical fix: use the same display and positioning as the original
              div.style.display = 'inline-block';
              div.style.verticalAlign = 'middle';
              div.style.lineHeight = computedStyle.height;
              div.style.textAlign = 'left';
              
              // Replace the input with the div
              inputEl.parentNode?.replaceChild(div, inputEl);
            });
          }
        }
      };

      // Add scale option separately to avoid potential type issues
      const finalOptions = window.devicePixelRatio && window.devicePixelRatio > 1
        ? { ...options, scale: Math.min(window.devicePixelRatio, 2) }
        : options;

      const canvas = await html2canvas(element, finalOptions);

      // Restore original styles
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;
      document.head.removeChild(tempStyle);

      // Trim bottom whitespace
      const trimmedCanvas = trimCanvasBottom(canvas);

      // Convert canvas to blob and download
      trimmedCanvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `panel-export-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      // Ensure we clean up styles even if an error occurs
      const element = document.getElementById(elementId);
      if (element) {
        element.style.overflow = '';
        element.style.height = '';
        element.style.maxHeight = '';
      }
      
      // Remove any temporary styles that might still be in the document
      const tempStyles = document.querySelectorAll('style[data-html2canvas-temp]');
      tempStyles.forEach(style => style.remove());
      
      console.error('Failed to export panel as image:', error);
      alert('Failed to export panel. Please try again.');
    }
  }, []);

  const exportSingleRegion = useCallback(async (elementId: string, regionType: 'parent' | 'child', regionId?: number, filename?: string) => {
    try {
      // Dynamic import of html2canvas
      const html2canvas = (await import('html2canvas')).default;
      
      const element = document.getElementById(elementId);
      if (!element) {
        console.error('Element not found:', elementId);
        return;
      }

      // Wait for fonts to load to prevent text rendering issues
      await document.fonts.ready;

      // Store original styles to restore later
      const originalOverflow = element.style.overflow;
      const originalHeight = element.style.height;
      const originalMaxHeight = element.style.maxHeight;
      
      // Temporarily adjust element for better capture
      element.style.overflow = 'visible';
      element.style.height = 'auto';
      element.style.maxHeight = 'none';

      // Add temporary styles to hide everything except the target region
      const tempStyle = document.createElement('style');
      tempStyle.setAttribute('data-html2canvas-temp', 'true');
      
      let hideSelectors = '';
      if (regionType === 'parent') {
        // Hide child regions and unwanted sections for parent export
        hideSelectors = `
          #${elementId} > div:nth-child(2),
          #${elementId} .panel-export-hide {
            display: none !important;
          }
        `;
      } else {
        // Hide parent region, other child regions, and unwanted sections for child export
        hideSelectors = `
          #${elementId} > div:nth-child(1) {
            display: none !important;
            margin: 0 !important;
          }
          #${elementId} .panel-export-hide {
            display: none !important;
          }
          #${elementId} > div:nth-child(2) {
            margin-top: 0 !important;
          }
        `;
        
        // Hide all child regions except the target one
        if (regionId !== undefined) {
          hideSelectors += `
            #${elementId} > div:nth-child(2) > div > div:not([data-region-id="${regionId}"]) {
              display: none !important;
            }
          `;
        }
      }
      
      tempStyle.textContent = `
        #${elementId} * {
          transition: none !important;
          animation: none !important;
          font-feature-settings: "liga" 0 !important;
          text-rendering: geometricPrecision !important;
        }
        #${elementId} img {
          display: inline-block !important;
        }
        ${hideSelectors}
      `;
      document.head.appendChild(tempStyle);

      // Wait a bit for style changes to take effect
      await new Promise(resolve => setTimeout(resolve, 100));

      // Get the height of the visible white info card plus header
      const visibleCards = element.querySelectorAll('.bg-white.rounded-lg:not([style*="display: none"])');
      let actualHeight = 0;
      
      if (visibleCards.length > 0) {
        // Add header height for Parent Region or Child Regions
        if (regionType === 'parent') {
          // Parent Region header: "Parent Region" title + margin
          const parentHeader = element.querySelector('h3');
          if (parentHeader) {
            const headerHeight = parentHeader.getBoundingClientRect().height;
            actualHeight += headerHeight + 16; // header + margin
          }
        } else {
          // Child Regions header: "Child Regions (n)" title + margin  
          const childHeaders = element.querySelectorAll('h3');
          if (childHeaders.length > 1) {
            const headerHeight = childHeaders[1].getBoundingClientRect().height;
            actualHeight += headerHeight + 16; // header + margin
          }
        }
        
        // Calculate total height of visible white cards using precise measurements
        visibleCards.forEach((card) => {
          const cardHeight = card.getBoundingClientRect().height;
          // Only add height if the card is actually visible (height > 0)
          if (cardHeight > 0) {
            actualHeight += cardHeight;
          }
        });
        
        // Add base padding for container
        actualHeight += 24; // Container padding
      } else {
        // Fallback: use minimal height for empty content
        actualHeight = 100;
      }
      
      // Find the actual start and end positions of visible content for correction
      const elementRect = element.getBoundingClientRect();
      let contentStart = Infinity;
      let contentEnd = 0;
      
      if (visibleCards.length > 0) {
        // Check header position
        const header = regionType === 'parent' 
          ? element.querySelector('h3')
          : element.querySelectorAll('h3')[1];
        
        if (header) {
          const headerRect = header.getBoundingClientRect();
          contentStart = Math.min(contentStart, headerRect.top - elementRect.top);
        }
        
        // Check each visible card's position
        visibleCards.forEach((card) => {
          if (card.getBoundingClientRect().height > 0) {
            const cardRect = card.getBoundingClientRect();
            const relativeTop = cardRect.top - elementRect.top;
            const relativeBottom = relativeTop + cardRect.height;
            contentStart = Math.min(contentStart, relativeTop);
            contentEnd = Math.max(contentEnd, relativeBottom);
          }
        });
      }
      
      const actualContentHeight = contentEnd - contentStart;
      
      // Use the actual measured content height instead of calculated height
      actualHeight = Math.max(actualContentHeight + 24, actualHeight * 0.75);
      
      // Configure html2canvas options
      const options = {
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        imageTimeout: 10000,
        height: actualHeight,
        windowHeight: actualHeight,
        scrollY: 0,
        scrollX: 0,
        onclone: (clonedDoc: Document) => {
          // Fix any remaining positioning issues in the cloned document
          const clonedElement = clonedDoc.getElementById(elementId);
          if (clonedElement) {
            clonedElement.style.overflow = 'visible';
            clonedElement.style.height = 'auto';
            clonedElement.style.maxHeight = 'none';
            clonedElement.style.position = 'static';
            
            // Force height recalculation based on visible content
            const computedHeight = clonedElement.scrollHeight;
            clonedElement.style.height = computedHeight + 'px';
            clonedElement.style.minHeight = 'auto';
            clonedElement.style.maxHeight = computedHeight + 'px';
            
            // Remove any fixed positioned elements that might cause issues
            const fixedElements = clonedElement.querySelectorAll('[style*="position: fixed"]');
            fixedElements.forEach(el => {
              (el as HTMLElement).style.position = 'absolute';
            });

            // Fix input element rendering issues by replacing them with divs
            const inputElements = clonedElement.querySelectorAll('input[type="text"]');
            inputElements.forEach(input => {
              const inputEl = input as HTMLInputElement;
              const div = clonedDoc.createElement('div');
              
              // Copy the input's computed styles
              const computedStyle = window.getComputedStyle(inputEl);
              
              // Clone all attributes and styles
              div.className = inputEl.className;
              div.style.cssText = inputEl.style.cssText;
              
              // Set the text content
              div.textContent = inputEl.value;
              
              // Apply minimal positioning fixes for html2canvas
              div.style.border = computedStyle.border;
              div.style.borderRadius = computedStyle.borderRadius;
              div.style.padding = computedStyle.padding;
              div.style.margin = computedStyle.margin;
              div.style.fontSize = computedStyle.fontSize;
              div.style.fontFamily = computedStyle.fontFamily;
              div.style.fontWeight = computedStyle.fontWeight;
              div.style.color = computedStyle.color;
              div.style.backgroundColor = computedStyle.backgroundColor;
              div.style.width = computedStyle.width;
              div.style.height = computedStyle.height;
              div.style.boxSizing = computedStyle.boxSizing;
              
              // Critical fix: use the same display and positioning as the original
              div.style.display = 'inline-block';
              div.style.verticalAlign = 'middle';
              div.style.lineHeight = computedStyle.height;
              div.style.textAlign = 'left';
              
              // Replace the input with the div
              inputEl.parentNode?.replaceChild(div, inputEl);
            });
          }
        }
      };

      // Add scale option separately to avoid potential type issues
      const finalOptions = window.devicePixelRatio && window.devicePixelRatio > 1
        ? { ...options, scale: Math.min(window.devicePixelRatio, 2) }
        : options;

      const canvas = await html2canvas(element, finalOptions);

      // Restore original styles
      element.style.overflow = originalOverflow;
      element.style.height = originalHeight;
      element.style.maxHeight = originalMaxHeight;
      document.head.removeChild(tempStyle);

      // Trim bottom whitespace
      const trimmedCanvas = trimCanvasBottom(canvas);

      // Convert canvas to blob and download
      trimmedCanvas.toBlob((blob) => {
        if (!blob) {
          console.error('Failed to create blob from canvas');
          return;
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename || `${regionType}-region-${regionId || 'export'}-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }, 'image/png');
    } catch (error) {
      // Ensure we clean up styles even if an error occurs
      const element = document.getElementById(elementId);
      if (element) {
        element.style.overflow = '';
        element.style.height = '';
        element.style.maxHeight = '';
      }
      
      // Remove any temporary styles that might still be in the document
      const tempStyles = document.querySelectorAll('style[data-html2canvas-temp]');
      tempStyles.forEach(style => style.remove());
      
      console.error('Failed to export single region as image:', error);
      alert('Failed to export region. Please try again.');
    }
  }, []);

  return {
    exportPanelAsImage,
    exportSingleRegion,
  };
}