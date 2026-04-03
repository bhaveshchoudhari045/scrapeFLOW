import { SessionTask } from "@/lib/workflow/task/Session";
import { ExecutionEnvironment } from "@/types/executor";

export const SessionExecutor = async (
  environment: ExecutionEnvironment<typeof SessionTask>,
) => {
  try {
    const sessionJson = environment.getInput("Session Cookies (JSON)");

    if (!sessionJson) {
      environment.log.error("Session Cookies (JSON) is required");
      return false;
    }

    // Validate the JSON format
    try {
      const cookies = JSON.parse(sessionJson);
      if (!Array.isArray(cookies)) {
        environment.log.error("Session JSON must be an array of cookies");
        return false;
      }
    } catch (e) {
      environment.log.error("Invalid JSON format for session cookies");
      return false;
    }

    // Pass through the session JSON to the output
    environment.setOutput("Session", sessionJson);
    return true;
  } catch (error) {
    environment.log.error(`Error in Session task: ${(error as Error).message}`);
    return false;
  }
};
