import { waitFor } from "@/lib/helper/waitFor";
import { Environment, ExecutionEnvironment } from "@/types/executor";

import { PageToHtmlTask } from "../task/PageToHtml";

export async function PageToHtmlExecutor(
  environment: ExecutionEnvironment<typeof PageToHtmlTask>,
): Promise<boolean> {
  try {
    const html = await environment.getPage()!.content();
    console.log("@PAGE HTML", html);
    environment.setOutput("Html", html);

    return true;
  } catch (error) {
    console.error(error);
    return false;
  }
}
