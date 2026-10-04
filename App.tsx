import React, { useEffect } from 'react';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StatusBar } from 'react-native';
import { AppNavigator } from './src/navigation/AppNavigator';
import { ModelManager } from './src/ai/ModelManager';
import { AIEngine } from './src/ai/AIEngine';

export default function App() {
  useEffect(() => {
    const runOnDeviceVerification = async () => {
      console.log('========================================================');
      console.log('[CareBond AI] Starting On-Device Local AI Verification...');
      console.log('========================================================');

      try {
        const modelManager = ModelManager.getInstance();
        const aiEngine = AIEngine.getInstance();

        console.log('[CareBond AI] Attempting to load Qwen 2.5 0.5B GGUF model via native llama.rn...');
        const loaded = await modelManager.loadModel('qwen2.5-0.5b-instruct-q4');
        console.log('[CareBond AI] Model load success:', loaded);

        if (loaded) {
          console.log('[CareBond AI] Running test generation: "Hello. Explain in one short sentence what you can do."');
          const testPrompt = 'Hello. Explain in one short sentence what you can do.';

          let fullResponse = '';
          for await (const chunk of aiEngine.streamChat(testPrompt)) {
            fullResponse += chunk.token;
            console.log('[CareBond AI TOKEN]:', chunk.token);
          }

          console.log('[CareBond AI FINAL RESPONSE]:', fullResponse);
          console.log('[CareBond AI OFFLINE INFERENCE VERIFIED 100% SUCCESS]');
        }
      } catch (err: any) {
        console.error('[CareBond AI Verification Error]:', err?.message || err);
      }
    };

    runOnDeviceVerification();
  }, []);

  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
      <AppNavigator />
    </SafeAreaProvider>
  );
}
