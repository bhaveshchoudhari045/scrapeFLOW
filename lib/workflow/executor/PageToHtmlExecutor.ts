import { waitFor } from "@/lib/helper/waitFor";
import { Environment, ExecutionEnvironment } from "@/types/executor";

import { PageToHtmlTask } from "../task/PageToHtml";

export async function PageToHtmlExecutor(
  environment: ExecutionEnvironment<typeof PageToHtmlTask>,
): Promise<boolean> {
  try {
    throw new Error("test");
    const html = await environment.getPage()!.content();
    console.log("@PAGE HTML", html);
    environment.setOutput("Html", html);

    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
