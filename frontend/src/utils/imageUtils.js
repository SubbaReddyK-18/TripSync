const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_SIZE = 5 * 1024 * 1024
const MIN_DIMENSION = 256

export function validateFileType(file) {
  return ALLOWED_TYPES.includes(file.type)
}

export function validateFileSize(file) {
  return file.size <= MAX_SIZE
}

export function loadImage(file) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load image'))
    }
    img.src = url
  })
}

export function validateImageDimensions(img) {
  return img.width >= MIN_DIMENSION && img.height >= MIN_DIMENSION
}

export function getCroppedBlob(image, croppedAreaPixels, outputSize = 512) {
  return new Promise((resolve) => {
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')

    canvas.width = outputSize
    canvas.height = outputSize

    ctx.drawImage(
      image,
      croppedAreaPixels.x,
      croppedAreaPixels.y,
      croppedAreaPixels.width,
      croppedAreaPixels.height,
      0,
      0,
      outputSize,
      outputSize
    )

    canvas.toBlob(
      (blob) => resolve(blob),
      'image/jpeg',
      0.92
    )
  })
}

export const ERROR_MESSAGES = {
  type: 'Unsupported file type. Please upload a JPG, PNG, or WebP image.',
  size: 'File is too large. Maximum allowed size is 5 MB.',
  dimensions: 'Image is too small. Please upload an image that is at least 256 × 256 pixels.',
}
