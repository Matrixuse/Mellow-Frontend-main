import React, { useState, useRef } from 'react';
import { Button, View, Text } from 'react';
import nativeMediaService from '../services/nativeMediaService';

// Small debug component to rapidly emit position updates to the native service.
// Use this in your app during development to validate that position-only updates
// do not rebuild the notification or reload artwork.
export default function PositionStressTest() {
  const [running, setRunning] = useState(false);
  const intervalRef = useRef(null);
  const positionRef = useRef(0);

  function start() {
    if (running) return;
    setRunning(true);
    positionRef.current = 0;
    intervalRef.current = setInterval(() => {
      positionRef.current += 1000; // advance by 1s
      try {
        nativeMediaService.updatePosition(positionRef.current);
      } catch (e) {
        // best-effort
      }
    }, 300); // every 300ms
  }

  function stop() {
    setRunning(false);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  return (
    <View style={{ padding: 8 }}>
      <Text style={{ marginBottom: 8 }}>Position stress test: {running ? 'running' : 'stopped'}</Text>
      <View style={{ flexDirection: 'row', gap: 8 }}>
        <Button title={running ? 'Stop' : 'Start'} onPress={running ? stop : start} />
        <Button title="Reset" onPress={() => { positionRef.current = 0; nativeMediaService.updatePosition(0); }} />
      </View>
    </View>
  );
}
