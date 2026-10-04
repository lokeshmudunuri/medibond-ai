const { execSync } = require('child_process');
const fs = require('fs');

function run(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf-8' });
  } catch (err) {
    return err.stdout ? err.stdout.toString() : err.message;
  }
}

console.log('1. Dumping UI hierarchy...');
run('adb shell uiautomator dump /sdcard/window_dump.xml');
run('adb pull /sdcard/window_dump.xml window_dump.xml');

const xml = fs.readFileSync('window_dump.xml', 'utf-8');
const regex = /<node[^>]*text="([^"]+)"[^>]*bounds="\[(\d+),(\d+)\]\[(\d+),(\d+)\]"[^>]*\/>/g;

let match;
console.log('\n--- VISIBLE SCREEN ELEMENTS ---');
while ((match = regex.exec(xml)) !== null) {
  const [_, text, x1, y1, x2, y2] = match;
  if (text.trim()) {
    const cx = Math.floor((parseInt(x1) + parseInt(x2)) / 2);
    const cy = Math.floor((parseInt(y1) + parseInt(y2)) / 2);
    console.log(`[${cx}, ${cy}] "${text}"`);
  }
}
