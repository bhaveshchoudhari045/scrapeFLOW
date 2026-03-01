import { Browser } from "puppeteer";

export type Environment = {
  browser?: Browser;
  //phases with phaseId as key
  phases: Record<
    string, // key:phaseId
    {
      inputs: Record<string, string>;
      outputs: Record<string, string>;
    }
  >;
};

export type ExecutionEnvironment = {
  getInput(name: string): string;
};
