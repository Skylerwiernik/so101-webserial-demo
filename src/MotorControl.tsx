import { useState, useEffect } from 'react'
import './MotorControl.css'

interface MotorControlProps {
  motorId: number
  motorName: string
  currentPosition: number | null
  onPositionChange: (motorId: number, position: number) => void
}

export function MotorControl({ motorId, motorName, currentPosition, onPositionChange }: MotorControlProps) {
  const [sliderValue, setSliderValue] = useState(currentPosition || 2048)

  // Update slider when currentPosition prop changes
  useEffect(() => {
    if (currentPosition !== null) {
      setSliderValue(currentPosition)
    }
  }, [currentPosition])

  const handleSliderChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = parseInt(event.target.value)
    setSliderValue(newValue)
    onPositionChange(motorId, newValue)
  }

  // Convert position (0-4095) to degrees (0-360)
  const degrees = ((sliderValue / 4095) * 360).toFixed(1)

  return (
    <div className="motor-card">
      <h3 className="motor-name">{motorName}</h3>
      <input
        type="range"
        min="0"
        max="4095"
        value={sliderValue}
        onChange={handleSliderChange}
        className="motor-slider"
      />
      <div className="motor-position">{degrees}°</div>
      <div className="motor-raw-position">({sliderValue})</div>
    </div>
  )
}
