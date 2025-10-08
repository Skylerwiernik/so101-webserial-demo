import { useState, useRef, useEffect } from 'react'
import { SerialController } from './SerialController'
import { MotorControl } from './MotorControl'
import './App.css'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [motorPositions, setMotorPositions] = useState<{ [key: number]: number | null }>({
    1: null,
    2: null,
    3: null,
    4: null,
    5: null,
    6: null,
  })
  const serialController = useRef(new SerialController())

  const handleConnect = async () => {
    try {
      // 1Mbps baud rate for Feetech STS3215 motors
      await serialController.current.connect(1000000)
      setIsConnected(true)

      // Automatically fetch motor positions after connecting
      setTimeout(async () => {
        await handleGetPositions()
      }, 500)
    } catch (error) {
      console.error('Connection failed:', error)
      alert('Failed to connect to serial port')
    }
  }

  const handleDisconnect = async () => {
    try {
      await serialController.current.disconnect()
      setIsConnected(false)
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  const handleGetPositions = async () => {
    try {
      const positions = await serialController.current.readAllMotorPositions()
      setMotorPositions(positions)
    } catch (error) {
      console.error('Failed to read positions:', error)
      alert('Failed to read motor positions')
    }
  }

  const handleMotorPositionChange = async (motorId: number, position: number) => {
    try {
      await serialController.current.writeMotorPosition(motorId, position)
      setMotorPositions(prev => ({ ...prev, [motorId]: position }))
    } catch (error) {
      console.error('Failed to write motor position:', error)
    }
  }

  const motorNames = [
    'Base Rotation',
    'Shoulder',
    'Elbow',
    'Wrist Pitch',
    'Wrist Roll',
    'Gripper'
  ]

  useEffect(() => {
    return () => {
      if (serialController.current.isConnected()) {
        serialController.current.disconnect()
      }
    }
  }, [])

  return (
    <div style={{ padding: '20px', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Web Serial Controller</h1>

      {!isConnected ? (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleConnect}>Connect to Serial Port</button>
        </div>
      ) : (
        <div style={{ marginBottom: '20px' }}>
          <button onClick={handleDisconnect} className="disconnect-button">
            Disconnect
          </button>
        </div>
      )}

      {isConnected && (
        <>
          <div className="motor-controls-container">
            {[1, 2, 3, 4, 5, 6].map((motorId) => (
              <MotorControl
                key={motorId}
                motorId={motorId}
                motorName={motorNames[motorId - 1]}
                currentPosition={motorPositions[motorId]}
                onPositionChange={handleMotorPositionChange}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default App