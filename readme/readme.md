This is a [Next.js](https://nextjs.org/) project bootstrapped with [`create-next-app`](https://github.com/vercel/next.js/tree/canary/packages/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/basic-features/font-optimization) to automatically optimize and load Inter, a custom Google Font.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js/) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/deployment) for more details.

{
"name": "scrape-flow-new",
"version": "0.1.0",
"private": true,
"scripts": {
"dev": "next dev",
"build": "next build",
"start": "next start",
"lint": "next lint",
"postinstall": "prisma generate"
},
"dependencies": {
"@clerk/nextjs": "^5.3.2",
"@hookform/resolvers": "^5.2.2",
"@prisma/client": "^6.19.2",
"@radix-ui/react-accordion": "^1.2.12",
"@radix-ui/react-alert-dialog": "^1.1.15",
"@radix-ui/react-aspect-ratio": "^1.1.8",
"@radix-ui/react-avatar": "^1.1.11",
"@radix-ui/react-checkbox": "^1.3.3",
"@radix-ui/react-collapsible": "^1.1.12",
"@radix-ui/react-context-menu": "^2.2.16",
"@radix-ui/react-dialog": "^1.1.15",
"@radix-ui/react-dropdown-menu": "^2.1.16",
"@radix-ui/react-hover-card": "^1.1.15",
"@radix-ui/react-label": "^2.1.8",
"@radix-ui/react-menubar": "^1.1.16",
"@radix-ui/react-navigation-menu": "^1.2.14",
"@radix-ui/react-popover": "^1.1.15",
"@radix-ui/react-progress": "^1.1.8",
"@radix-ui/react-radio-group": "^1.3.8",
"@radix-ui/react-scroll-area": "^1.2.10",
"@radix-ui/react-select": "^2.2.6",
"@radix-ui/react-separator": "^1.1.8",
"@radix-ui/react-slider": "^1.3.6",
"@radix-ui/react-slot": "^1.2.4",
"@radix-ui/react-switch": "^1.2.6",
"@radix-ui/react-tabs": "^1.1.13",
"@radix-ui/react-toast": "^1.2.15",
"@radix-ui/react-toggle": "^1.1.10",
"@radix-ui/react-toggle-group": "^1.1.11",
"@radix-ui/react-tooltip": "^1.2.8",
"@tanstack/react-query": "^5.90.20",
"@xyflow/react": "^12.10.0",
"cheerio": "^1.1.0",
"class-variance-authority": "^0.7.1",
"clsx": "^2.1.1",
"cmdk": "^1.1.1",
"date-fns": "^4.1.0",
"embla-carousel-react": "^8.6.0",
"input-otp": "^1.4.2",
"lucide-react": "^0.562.0",
"next": "14.2.5",
"next-themes": "^0.4.6",
"puppeteer": "^24.37.5",
"react": "^18",
"react-day-picker": "^9.13.0",
"react-dom": "^18",
"react-hook-form": "^7.71.1",
"react-resizable-panels": "^4.4.1",
"recharts": "^2.15.4",
"sonner": "^2.0.7",
"tailwind-merge": "^3.4.0",
"tailwindcss-animate": "^1.0.7",
"vaul": "^1.1.2",
"zod": "^4.3.5"
},
"devDependencies": {
"@eslint/css": "^0.14.1",
"@eslint/js": "^9.39.2",
"@eslint/json": "^0.14.0",
"@eslint/markdown": "^7.5.1",
"@tanstack/react-query-devtools": "^5.91.2",
"@types/node": "^20",
"@types/react": "^18.3.27",
"@types/react-dom": "^18.3.7",
"autoprefixer": "^10.4.23",
"eslint": "^8.57.1",
"eslint-config-next": "14.2.5",
"eslint-plugin-react": "^7.37.5",
"globals": "^17.0.0",
"jiti": "^2.6.1",
"postcss": "^8",
"prisma": "^6.19.2",
"tailwindcss": "^3.4.19",
"typescript": "^5",
"typescript-eslint": "^8.53.1"
}
}

// @/lib/workflow/task/registry.ts
import { LaunchBrowserTask } from "./LaunchBrowser";
import { TaskType } from "@/types/task";
import { PageToHtmlTask } from "./PageToHtml";
import { ExtractTextFromElementTask } from "./ExtractTextFromElement";
import { WorkflowTask } from "@/types/workflow";
import { FillInputTask } from "./FillInput";
import { ClickElementTask } from "./ClickElement";
import { WaitForElementTask } from "./WaitForElement";
import { DeliverViaWebhookTask } from "./DeliverViaWebhook";
import { ExtractDataWithAITask } from "./ExtractDataWithAI";
import { ReadPropertyFromJsonTask } from "./ReadPropertyFromJson";
import { AddPropertyToJsonTask } from "./AddPropertyToJson";
import { NavigateUrlTask } from "./NavigateUrlTask";
import { ScrollToElementTask } from "./ScrollToElement";

type Registry = {
[k in TaskType]: WorkflowTask & { type: k };
};

export const TaskRegistry: Registry = {
LAUNCH_BROWSER: LaunchBrowserTask, // Use enum as key
PAGE_TO_HTML: PageToHtmlTask,
EXTRACT_TEXT_FROM_ELEMENT: ExtractTextFromElementTask,
FILL_INPUT: FillInputTask,
CLICK_ELEMENT: ClickElementTask,
WAIT_FOR_ELEMENT: WaitForElementTask,
DELIVER_VIA_WEBHOOK: DeliverViaWebhookTask,
EXTRACT_DATA_WITH_AI: ExtractDataWithAITask,
READ_PROPERTY_FROM_JSON: ReadPropertyFromJsonTask,
ADD_PROPERTY_TO_JSON: AddPropertyToJsonTask,
NAVIGATE_URL: NavigateUrlTask,
SCROLL_TO_ELEMENT: ScrollToElementTask,
};
