import { ExecutionEnvironment } from "@/types/executor";
import * as cheerio from "cheerio";
import { ExtractTextFromElementTask } from "../task/ExtractTextFromElement";

export async function ExtractTextFromElementExecutor(
  environment: ExecutionEnvironment<typeof ExtractTextFromElementTask>,
): Promise<boolean> {
  try {
    const selector = environment.getInput("Selector");
    if (!selector) {
      environment.log.error("selector is not provided");
      return false;
    }
    const html = environment.getInput("Html");
    if (!html) {
      environment.log.error("html is not defined");
      return false;
    }
    const $ = cheerio.load(html);
    const element = $(selector);
    if (!element.length) {
      environment.log.error("Element not found");
      return false;
    }

    const extractedText = element.text().trim();
    environment.log.error("Element has no text");
    if (!extractedText) {
      console.error("Element has no text");
      return false;
    }
    environment.setOutput("Extracted text", extractedText);

    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
