/* eslint-disable no-console */
const http = require("http");
const { spawn } = require(`child_process`);
const { chromium } = require(`playwright`);

process.env.CHROME_PATH = chromium.executablePath(); // This will cause chrome finder to pick this as correct chromium profile
process.env.CHROME_CDP_PORT = 41111; // this is different than original because we want to run tests in parallel with normal usage

let subprocess;

function launchBrowser() {
  try {
    const flags = [
      `--remote-debugging-port=${process.env.CHROME_CDP_PORT}`,
      // Disable syncing to a Google account
      `--disable-sync`,
      // Disable installation of default apps on first run
      `--disable-default-apps`,
      // Mute any audio
      `--mute-audio`,
      // Disable the default browser check, do not prompt to set it as such
      `--no-default-browser-check`,
      // Skip first run wizards
      `--no-first-run`,
      // Use mock keychain on Mac to prevent blocking permissions dialogs
      `--use-mock-keychain`,
      // Avoid potential instability of using Gnome Keyring or KDE wallet
      `--password-store=basic`,
    ];

    subprocess = spawn(process.env.CHROME_PATH, flags, {
      detached: true,
      stdio: `ignore`,
    });
    console.log(`Browser launched for testing`, subprocess.pid);
  } catch (error) {
    console.log(`Error while launching chrome`, error);
  }
}

async function getWSEndpoint() {
  try {
    const json = await new Promise((resolve, reject) => {
      http
        .get(
          `http://localhost:${process.env.CHROME_CDP_PORT}/json/version/`,
          (response) => {
            let data = ``;
            // eslint-disable-next-line no-return-assign
            response.on(`data`, (chunk) => (data += chunk));
            response.on(`end`, () => resolve(data));
          }
        )
        .on(`error`, reject);
    });
    if (json) {
      return JSON.parse(json).webSocketDebuggerUrl;
    }
  } catch (error) {
    console.log(`error`, error);
  }

  return false;
}

async function start() {
  launchBrowser();
  let wsEndpoint = false;
  while (!wsEndpoint) {
    await new Promise((resolve) => setTimeout(resolve, 1000 * 2));
    wsEndpoint = await getWSEndpoint();
  }
  console.log(`wsEndpoint`, wsEndpoint);
  process.exit(0);
}

start();
