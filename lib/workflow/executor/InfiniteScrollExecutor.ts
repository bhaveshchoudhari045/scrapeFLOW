import { ExecutionEnvironment } from "@/types/executor";
import { InfiniteScroll } from "@/lib/workflow/task/InfiniteScroll";

export const InfiniteScrollExecutor = async (
  environment: ExecutionEnvironment<typeof InfiniteScroll>,
) => {
  try {
    const page = environment.getPage();
    if (!page) {
      environment.log.error("Page not found");
      return false;
    }

    const maxScrolls = parseInt(
      environment.getInput("Max Scrolls") || "10",
      10,
    );

    let previousHeight = 0;
    let sameHeightCount = 0;

    for (let i = 0; i < maxScrolls; i++) {
      // Scroll down
      await page.evaluate(() => {
        window.scrollBy({ top: window.innerHeight, behavior: "smooth" });
      });

      // Wait for content to load
      await new Promise((resolve) => setTimeout(resolve, 1500));

      // Check if we've reached the bottom
      const newHeight = await page.evaluate(() => document.body.scrollHeight);

      if (newHeight === previousHeight) {
        sameHeightCount++;
        if (sameHeightCount >= 2) {
          environment.log.info(`Reached end of page after ${i + 1} scrolls`);
          break;
        }
      } else {
        sameHeightCount = 0;
      }

      previousHeight = newHeight;
    }

    return true;
  } catch (error) {
    environment.log.error(`Scroll error: ${(error as Error).message}`);
    return false;
  }
};
