export interface ImageFitLayout {
  drawWidth: number;
  drawHeight: number;
  offsetX: number;
  offsetY: number;
}

// Compute how the image is drawn on a canvas of given dimensions:
// centered, aspect-ratio preserved, with a 0.95 margin factor.
export function getImageFitLayout(
  canvasWidth: number,
  canvasHeight: number,
  imageWidth: number,
  imageHeight: number
): ImageFitLayout {
  const imgAspect = imageWidth / imageHeight;
  const canvasAspect = canvasWidth / canvasHeight;
  let drawWidth: number, drawHeight: number;
  if (imgAspect > canvasAspect) {
    drawWidth = canvasWidth * 0.95;
    drawHeight = drawWidth / imgAspect;
  } else {
    drawHeight = canvasHeight * 0.95;
    drawWidth = drawHeight * imgAspect;
  }
  const offsetX = (canvasWidth - drawWidth) / 2;
  const offsetY = (canvasHeight - drawHeight) / 2;
  return { drawWidth, drawHeight, offsetX, offsetY };
}
