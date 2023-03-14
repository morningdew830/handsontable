import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import concurrently from 'concurrently';
import { Writable } from 'stream';
import { command as execaCommand } from 'execa';
import debounce from 'lodash.debounce';

import {
  displayErrorMessage,
} from '../../../scripts/utils/index.mjs';

const argv = yargs(hideBin(process.argv))
  .array('cmdToListen')
  .string('runnerFile')
  .demandOption(['runnerFile'])
  .argv;

const PUPPETEER_CMD = 'node test/scripts/run-puppeteer.mjs';
const PUPPETEER_KILL_TIMEOUT = 2000;
const writableStream = new Writable();
const runnerFile = argv.runnerFile;
let targetProcess = null;
const allowedTestPaths = ['src/3rdparty/walkontable/test/SpecRunner.html', 'test/E2ERunner.html']

if (allowedTestPaths.includes(runnerFile) === false) {
  displayErrorMessage(`Test running failed. Add runner file (${runnerFile}) to "allow list" (protection against Indirect Command Injection vulnerability)`);

  process.exit(1);
}

const spawnPuppeteer = debounce(() => {
  console.log(`${PUPPETEER_CMD} ${runnerFile}`);
  targetProcess = execaCommand(`${PUPPETEER_CMD} ${runnerFile}`, {
    stdin: 'ignore',
  });

  targetProcess.stdout.pipe(process.stdout);
  targetProcess.stderr.pipe(process.stderr);
}, PUPPETEER_KILL_TIMEOUT);

writableStream._write = (chunk, encoding, next) => {
  // strip colorized logs that may occurs while executing commands
  const chunkRawText = chunk.toString().replace(/\x1B[[(?);]{0,2}(;?\d)*./g, '');
  const isProcessFinished = /\x9d\t\x9d/.test(chunkRawText);

  if (isProcessFinished) {
    if (targetProcess && !targetProcess.killed) {
      targetProcess.kill('SIGTERM', {
        forceKillAfterTimeout: Math.max(100, PUPPETEER_KILL_TIMEOUT - 1000),
      });
    }

    spawnPuppeteer();
  }

  // forward logs to the stdout stream (bash screen)
  process.stdout.write(chunk, encoding, next);
}

(async function() {
  await concurrently(argv.cmdToListen, {
    prefix: 'none',
    killOthers: ['failure', 'success'],
    outputStream: writableStream,
  });
})();
