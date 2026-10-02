import { useState, useCallback } from 'react';

export function useHeartRate() {
  const [heartRate, setHeartRate] = useState<number | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = useCallback(async () => {
    setError(null);
    if (!('bluetooth' in navigator)) {
      setError('Web Bluetooth is not supported on this browser/platform.');
      return;
    }

    try {
      // Standard Bluetooth SIG Heart Rate Service (0x180D)
      const device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: ['heart_rate'] }],
      });

      setDeviceName(device.name || 'Bluetooth Heart Rate Monitor');

      const server = await device.gatt.connect();
      const service = await server.getPrimaryService('heart_rate');
      const characteristic = await service.getCharacteristic('heart_rate_measurement');

      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', (event: any) => {
        const value = event.target.value;
        // Heart rate value format: bit 0 specifies 8-bit or 16-bit
        const flags = value.getUint8(0);
        let hr = 0;
        if ((flags & 0x01) === 0) {
          hr = value.getUint8(1); // 8-bit
        } else {
          hr = value.getUint16(1, /*littleEndian=*/ true); // 16-bit
        }
        setHeartRate(hr);
      });

      device.addEventListener('gattserverdisconnected', () => {
        setIsConnected(false);
        setHeartRate(null);
      });

      setIsConnected(true);
    } catch (err: any) {
      console.warn('Bluetooth connection error:', err);
      setError(err.message || 'Failed to connect Bluetooth sensor.');
    }
  }, []);

  const disconnect = useCallback(() => {
    setIsConnected(false);
    setHeartRate(null);
    setDeviceName(null);
  }, []);

  return {
    heartRate,
    isConnected,
    deviceName,
    error,
    connect,
    disconnect,
  };
}
