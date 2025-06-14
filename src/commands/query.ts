import { LLmManager } from "@/lib/llm";
import yoctoSpinner from "yocto-spinner";

export async function generateQueryCommand(query: string) {
  const spinner = {
    instance: yoctoSpinner({
      text: "Generating Query...",
    }).start(),
    stop: () => {
      if (spinner.isStopped) return;
      spinner.instance.stop();
      spinner.instance.clear();
      spinner.isStopped = true;
    },
    isStopped: false,
  };
  const result = await LLmManager.getInstance().generateQuery(query);
  for await (const chunk of result) {
    spinner.stop();
    process.stdout.write(chunk);
  }
}
