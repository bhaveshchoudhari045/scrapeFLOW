import { LucideProps, PackageIcon } from "lucide-react";
import { TaskType, TaskParamType } from "@/types/task";

export const TransformArraysToObjects = {
  type: TaskType.TRANSFORM_ARRAYS_TO_OBJECTS,
  label: "Transform arrays to objects",
  icon: (props: LucideProps) => (
    <PackageIcon className="stroke-purple-400" {...props} />
  ),
  isEntryPoint: false,
  credits: 0,
  inputs: [
    {
      name: "JSON",
      type: TaskParamType.STRING,
      required: true,
    },
  ] as const,
  outputs: [
    {
      name: "Transformed JSON",
      type: TaskParamType.STRING,
    },
  ] as const,
};
