import { useState, useCallback } from 'react'
import Cropper from 'react-easy-crop'
import { motion } from 'framer-motion'

export default function ProfilePhotoCropper({ imageSrc, onCropComplete, onCancel }) {
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null)
  const [processing, setProcessing] = useState(false)

  const onCropChange = useCallback((location) => {
    setCrop(location)
  }, [])

  const onZoomChange = useCallback((z) => {
    setZoom(z)
  }, [])

  const onCropAreaChange = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels)
  }, [])

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return
    setProcessing(true)
    onCropComplete(croppedAreaPixels)
  }

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="modal-content max-w-lg !p-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 pb-4">
          <h2 className="text-lg font-heading font-semibold text-text-primary">
            Crop your profile picture
          </h2>
          <p className="text-sm text-text-muted mt-1">
            Drag to adjust the crop area. The result will be a square image.
          </p>
        </div>

        <div className="relative w-full h-80 bg-black/80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
          />
        </div>

        <div className="px-6 py-4">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-xs text-text-muted font-medium shrink-0">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="w-full h-1.5 bg-primary-lighter rounded-full appearance-none cursor-pointer accent-accent-blue"
            />
          </div>
          <div className="flex gap-3 justify-end">
            <button onClick={onCancel} className="btn-secondary" disabled={processing}>
              Cancel
            </button>
            <button onClick={handleConfirm} disabled={processing} className="btn-primary">
              {processing ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Processing...
                </span>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}
