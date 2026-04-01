import { ExecutionEnvironment } from "@/types/executor";
import { PageToHtmlTask } from "../task/PageToHtml";

export async function PageToHtmlExecutor(
  environment: ExecutionEnvironment<typeof PageToHtmlTask>,
): Promise<boolean> {
  try {
    const page = environment.getPage();
    console.log("@@PAGE EXISTS:", !!page);
    const html = await page!.content();
    console.log("@@HTML LENGTH:", html?.length);
    environment.setOutput("Html", html);
    console.log("@@OUTPUT SET");
    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
