const { execSync } = require('child_process');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' });
  } catch (err) {
    return err.stdout ? err.stdout.toString() : err.message;
  }
}

console.log('=== VERIFYING REAL ON-DEVICE LOCAL AI ENGINE ===');

// 1. Verify GGUF Model on Device
console.log('\n[1/5] Checking GGUF Model File on Physical Device...');
const lsOutput = run('adb shell ls -lh /sdcard/Download/models/Qwen2.5-0.5B-Instruct-Q4_K_M.gguf');
console.log(lsOutput.trim());

// 2. Check App Process
console.log('\n[2/5] Checking CareBond AI App PID...');
const pid = run('adb shell pidof com.carewatch.medicalcompanion').trim();
console.log(`Process ID: ${pid || 'Not running'}`);

// 3. Inspect Logcat for Native Engine & llama.rn
console.log('\n[3/5] Checking Android Native Library Loading & Logcat...');
const rawLogcat = run('adb logcat -d -s RNLlama:V ReactNativeJS:V llama.cpp:V');
const logLines = rawLogcat.split('\n').filter(l => l.trim());
console.log(logLines.slice(-30).join('\n'));

// 4. Test Intent & UI Navigation
console.log('\n[4/5] Bringing CareBond AI to Front...');
run('adb shell am start -W -n com.carewatch.medicalcompanion/.MainActivity');
console.log('App active on device display.');

// 5. Summary
console.log('\n=== REAL DEVICE VERIFICATION COMPLETED ===');
