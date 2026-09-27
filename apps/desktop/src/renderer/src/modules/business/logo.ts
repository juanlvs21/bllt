import { LOGO_MAX_LENGTH } from '@bllt/shared'

/** Longest side of the stored logo; enough for the sidebar and receipts. */
const LOGO_SIZE = 320

/**
 * Reads an image file and returns it downsized as a data URL. PNG keeps
 * transparency; photos that come out too heavy fall back to WebP.
 */
export async function readLogo(file: File): Promise<string> {
  if (!/^image\/(png|jpeg|webp)$/.test(file.type))
    throw new Error('Elige una imagen PNG, JPG o WebP')
  // Decoded straight from the file: the CSP only allows data: images, not blob: URLs.
  const image = await createImageBitmap(file).catch(() => {
    throw new Error('No se pudo leer la imagen')
  })
  const scale = Math.min(1, LOGO_SIZE / Math.max(image.width, image.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(image.width * scale))
  canvas.height = Math.max(1, Math.round(image.height * scale))
  canvas.getContext('2d')!.drawImage(image, 0, 0, canvas.width, canvas.height)
  image.close()
  const png = canvas.toDataURL('image/png')
  if (png.length <= LOGO_MAX_LENGTH) return png
  const webp = canvas.toDataURL('image/webp', 0.85)
  if (webp.length <= LOGO_MAX_LENGTH) return webp
  throw new Error('La imagen es demasiado pesada')
}
