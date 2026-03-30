import { readFileSync, writeFileSync } from 'node:fs';

const filePath = new URL('../android/app/capacitor.build.gradle', import.meta.url);
const current = readFileSync(filePath, 'utf8');
const next = current
  .replaceAll('JavaVersion.VERSION_21', 'JavaVersion.VERSION_17');

if (next !== current) {
  writeFileSync(filePath, next, 'utf8');
  console.log('Updated capacitor.build.gradle to Java 17.');
} else {
  console.log('capacitor.build.gradle already targets Java 17.');
}
