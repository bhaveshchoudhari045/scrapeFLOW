import { waitFor } from "@/lib/helper/waitFor";
import { Environment, ExecutionEnvironment } from "@/types/executor";

import { PageToHtmlTask } from "../task/PageToHtml";
import { FillInputTask } from "../task/FillInput";
import { ClickElementTask } from "../task/ClickElement";

export async function ClickELementExecutor(
  environment: ExecutionEnvironment<typeof ClickElementTask>,
): Promise<boolean> {
  try {
    const selector = environment.getInput("Selector");
    if (!selector) {
      environment.log.error("input-> selector not defined");
    }
    
    await environment.getPage()!.click(selector);
    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
