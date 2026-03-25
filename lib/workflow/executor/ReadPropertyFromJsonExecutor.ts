import { waitFor } from "@/lib/helper/waitFor";
import { Environment, ExecutionEnvironment } from "@/types/executor";

import { PageToHtmlTask } from "../task/PageToHtml";
import { FillInputTask } from "../task/FillInput";
import { ClickElementTask } from "../task/ClickElement";
import { ReadPropertyFromJsonTask } from "../task/ReadPropertyFromJson";

export async function ReadPropertyFromJsonExecutor(
  environment: ExecutionEnvironment<typeof ReadPropertyFromJsonTask>,
): Promise<boolean> {
  try {
    const jsonData = environment.getInput("JSON");
    if (!jsonData) {
      environment.log.error("input-> json not defined");
      return false;
    }
    const propertyName = environment.getInput("Property name");

    if (!propertyName) {
      environment.log.error("input-> Property Name not defined");
    }

    const json = JSON.parse(jsonData);
    const propertyValue = json[propertyName];
    if (propertyValue === undefined) {
      environment.log.error("property not found");
      return false;
    }
    environment.setOutput("Property value", propertyValue);
    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
