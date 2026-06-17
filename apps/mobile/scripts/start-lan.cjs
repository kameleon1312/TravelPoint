const dgram = require('node:dgram');
const { spawn } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');

function configuredLanIp() {
  const envPath = path.resolve(__dirname, '../.env');
  if (!fs.existsSync(envPath)) return null;

  const match = fs.readFileSync(envPath, 'utf8')
    .match(/^REACT_NATIVE_PACKAGER_HOSTNAME=(.+)$/m);
  return match?.[1].trim() || null;
}

function detectLanIp() {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');

    socket.once('error', (error) => {
      socket.close();
      reject(error);
    });

    socket.connect(53, '8.8.8.8', () => {
      const address = socket.address().address;
      socket.close();
      resolve(address);
    });
  });
}

async function main() {
  const lanIp = process.env.REACT_NATIVE_PACKAGER_HOSTNAME
    || configuredLanIp()
    || await detectLanIp();
  const env = {
    ...process.env,
    REACT_NATIVE_PACKAGER_HOSTNAME: lanIp,
    EXPO_PUBLIC_API_URL: `http://${lanIp}:4000`,
  };

  console.log(`Expo LAN: exp://${lanIp}:8081`);
  console.log(`Mobile API: ${env.EXPO_PUBLIC_API_URL}`);
  console.log('Phone and computer must use the same Wi-Fi network.');

  const expoCli = require.resolve('expo/bin/cli');
  const expo = spawn(process.execPath, [expoCli, 'start', '--clear', '--lan'], {
    env,
    stdio: 'inherit',
    shell: false,
  });

  expo.once('exit', (code) => process.exit(code ?? 1));
}

main().catch((error) => {
  console.error(`Unable to start Expo in LAN mode: ${error.message}`);
  process.exit(1);
});
