import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ModelManager } from './src/ai/ModelManager';
import { AIEngine } from './src/ai/AIEngine';
import { ModelInstallStatus } from './src/types/model';

export default function App() {
  useEffect(() => {
    const bootstrapApp = async () => {
      try {
        console.log('========================================================');
        console.log('[CareBond AI] Initializing on-device medical companion...');
        console.log('========================================================');

        const modelManager = ModelManager.getInstance();
        // Restore local model catalog in background without blocking UI
        await modelManager.restoreFromDisk();
        console.log('[CareBond AI] On-device services and model catalog ready.');
      } catch (err: any) {
        console.warn('[CareBond AI Bootstrap Notice]:', err?.message || err);
      }
    };

    bootstrapApp();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
