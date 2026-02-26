import { exec } from "child_process";
import util from "util";
const execPromise = util.promisify(exec);

export class Sandbox {
  async run(command: string): Promise<{ stdout: string; stderr: string }> {
    // Ephemeral Docker isolation
    const sandboxedCommand = `docker run --rm -v $(pwd)/workspace:/workspace clawsafe-runtime ${command}`;
    return await execPromise(sandboxedCommand);
  }
}
