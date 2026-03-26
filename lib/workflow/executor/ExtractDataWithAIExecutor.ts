import { ExecutionEnvironment } from "@/types/executor";
import { ExtractDataWithAITask } from "../task/ExtractDataWithAI";
import prisma from "@/lib/prisma";
import { symmetricDecrypt } from "@/lib/encryption";
import Groq from "groq-sdk";

export async function ExtractDataWithAIExecutor(
  environment: ExecutionEnvironment<typeof ExtractDataWithAITask>,
): Promise<boolean> {
  try {
    const credentials = environment.getInput("Credentials");
    if (!credentials) {
      environment.log.error("input-> credentials not defined");
    }

    const prompt = environment.getInput("Prompt");
    if (!prompt) {
      environment.log.error("input-> prompt not defined");
    }

    const content = environment.getInput("Content");
    if (!content) {
      environment.log.error("input-> content not defined");
    }

    // Get credentials from DB
    const credential = await prisma.credential.findUnique({
      where: { id: credentials },
    });

    if (!credential) {
      environment.log.error("credential not found");
      return false;
    }

    const plainCredentialValue = symmetricDecrypt(credential.value);
    if (!plainCredentialValue) {
      environment.log.error("cannot decrypt credential");
      return false;
    }

    const groq = new Groq({ apiKey: plainCredentialValue });

    const response = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content:
            "You are a webscraper helper that extracts data from HTML or text. You will be given a piece of text or HTML content as input and also the prompt with the data you have to extract. The response should always be only the extracted data as a JSON array or object, without any additional words or explanations. Analyze the input carefully and extract data precisely based on the prompt. If no data is found, return an empty JSON array. Work only with the provided content and ensure the output is always a valid JSON array without any surrounding text. Never wrap the response in markdown code blocks or backticks.",
        },
        {
          role: "user",
          content: content,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 1,
    });

    environment.log.info(`prompt tokens: ${response.usage?.prompt_tokens}`);
    environment.log.info(
      `completion tokens: ${response.usage?.completion_tokens}`,
    );

    const result = response.choices[0].message?.content;
    if (!result) {
      environment.log.error("empty response from AI");
      return false;
    }

    // Add this ↓
    const cleanResult = result
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/, "")
      .replace(/```\s*$/, "")
      .trim();

    environment.setOutput("Extracted data", cleanResult); // ← use cleanResult
    return true;
  } catch (error: any) {
    environment.log.error(error.message);
    return false;
  }
}
