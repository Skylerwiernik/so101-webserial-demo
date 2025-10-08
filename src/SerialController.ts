export class SerialController {
  private port: SerialPort | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;

  async connect(baudRate: number = 1000000): Promise<void> {
    try {
      // Request a port from the user with filters for common USB-serial adapters
      // This helps identify SO-ARM101 which typically uses CH340, CP210x, or FTDI chips
      const filters = [
        { usbVendorId: 0x1a86 }, // CH340 (QinHeng Electronics)
        { usbVendorId: 0x10c4 }, // CP210x (Silicon Labs)
        { usbVendorId: 0x0403 }, // FTDI
      ];

      this.port = await navigator.serial.requestPort({ filters });

      // Open the port with the specified baud rate
      await this.port.open({ baudRate });

      // Get the writer for sending data
      if (this.port.writable) {
        this.writer = this.port.writable.getWriter();
      }

      console.log('Serial port connected');
    } catch (error) {
      console.error('Failed to connect:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    try {
      // Release the writer
      if (this.writer) {
        this.writer.releaseLock();
        this.writer = null;
      }

      // Close the port
      if (this.port) {
        await this.port.close();
        this.port = null;
      }

      console.log('Serial port disconnected');
    } catch (error) {
      console.error('Failed to disconnect:', error);
      throw error;
    }
  }

  isConnected(): boolean {
    return this.port !== null && this.port.readable !== null;
  }

  // Feetech STS3215 protocol methods
  private calculateChecksum(data: number[]): number {
    const sum = data.reduce((acc, val) => acc + val, 0);
    return ~(sum & 0xFF) & 0xFF;
  }

  private createReadPositionPacket(servoId: number): Uint8Array {
    // Packet format: [0xFF, 0xFF, ID, Length, Instruction, Address, ReadLength, Checksum]
    const INSTRUCTION_READ = 0x02;
    const ADDRESS_PRESENT_POSITION = 0x38;
    const READ_LENGTH = 0x02; // Read 2 bytes for position
    const length = 0x04; // Length = parameters + 2

    const data = [servoId, length, INSTRUCTION_READ, ADDRESS_PRESENT_POSITION, READ_LENGTH];
    const checksum = this.calculateChecksum(data);

    return new Uint8Array([0xFF, 0xFF, ...data, checksum]);
  }

  private parsePositionResponse(value: Uint8Array | null): number | null {
    if (value && value.length >= 8) {
      // Response format: [0xFF, 0xFF, ID, Length, Error, Param1, Param2, Checksum]
      // Position is in Param1 (low byte) and Param2 (high byte)
      const positionLow = value[5];
      const positionHigh = value[6];
      return (positionHigh << 8) | positionLow;
    }
    return null;
  }

  async readMotorPosition(motorId: number): Promise<number | null> {
    if (!this.writer || !this.port?.readable) {
      throw new Error('Not connected to a serial port');
    }

    const reader = this.port.readable.getReader();
    try {
      // Send the read position command
      const packet = this.createReadPositionPacket(motorId);
      await this.writer.write(packet);

      // Wait for response with timeout
      const timeoutPromise = new Promise<null>((resolve) => setTimeout(() => resolve(null), 2000));
      const readPromise = reader.read().then((result: ReadableStreamReadResult<Uint8Array>) => result.value || null);
      const value = await Promise.race([readPromise, timeoutPromise]);

      return this.parsePositionResponse(value);
    } catch (error) {
      console.error(`Failed to read position from motor ${motorId}:`, error);
      return null;
    } finally {
      reader.releaseLock();
    }
  }

  async readAllMotorPositions(): Promise<{ [motorId: number]: number | null }> {
    const positions: { [motorId: number]: number | null } = {};

    // SO-ARM101 has 6 motors with IDs 1-6
    for (let motorId = 1; motorId <= 6; motorId++) {
      positions[motorId] = await this.readMotorPosition(motorId);
      // Small delay between reads
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    return positions;
  }
}