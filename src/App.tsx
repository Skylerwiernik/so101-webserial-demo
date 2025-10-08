import { useState, useRef, useEffect } from 'react'
import { SerialController } from './SerialController'
import './App.css'

function App() {
  const [isConnected, setIsConnected] = useState(false)
  const [receivedData, setReceivedData] = useState<string[]>([])
  const serialController = useRef(new SerialController())

  const handleConnect = async () => {
    try {
      // 1Mbps baud rate for Feetech STS3215 motors
      await serialController.current.connect(1000000)
      setIsConnected(true)
    } catch (error) {
      console.error('Connection failed:', error)
      alert('Failed to connect to serial port')
    }
  }

  const handleDisconnect = async () => {
    try {
      await serialController.current.disconnect()
      setIsConnected(false)
      setReceivedData([])
    } catch (error) {
      console.error('Disconnect failed:', error)
    }
  }

  const handleGetPositions = async () => {
    try {
      const positions = await serialController.current.readAllMotorPositions()

      let output = '\n=== Motor Positions ===\n'
      for (const [motorId, position] of Object.entries(positions)) {
        if (position !== null) {
          // Convert position value (0-4095) to degrees (0-360)
          const degrees = ((position / 4095) * 360).toFixed(2)
          output += `Motor ${motorId}: ${position} (${degrees}°)\n`
        } else {
          output += `Motor ${motorId}: No response\n`
        }
      }
      output += '===================\n'

      setReceivedData(prev => [...prev, output])
    } catch (error) {
      console.error('Failed to read positions:', error)
      alert('Failed to read motor positions')
    }
  }

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
          <button onClick={handleDisconnect} style={{ backgroundColor: '#b33535', color: 'white', marginRight: '20px', width: '200px' }}>
            Disconnect
          </button>
          <button onClick={handleGetPositions} style={{ backgroundColor: '#1b76af', width: '200px' }}>
            Get Motor Positions
          </button>
        </div>
      )}

      {isConnected && (
        <>

          <div>
            <h3>Received Data:</h3>
            <div className="output-box">
              {receivedData.join('')}
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default App