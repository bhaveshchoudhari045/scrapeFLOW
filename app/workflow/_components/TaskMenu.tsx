"use client";

import React from "react";
import { TaskRegistry } from "@/lib/workflow/task/registry";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CoinsIcon } from "lucide-react";
import { TaskType } from "@/types/task";

export default function TaskMenu() {
  const allTasks = Object.values(TaskRegistry).filter(Boolean) as Array<
    NonNullable<(typeof TaskRegistry)[TaskType]>
  >;

  return (
    <aside className="w-[340px] min-w-[340px] max-w-[340px] border-r border-gray-200 h-screen flex flex-col bg-white overflow-hidden">
      {/* Sticky Header */}
      <div className="p-4 border-b border-gray-200 bg-white sticky top-0 z-10 shadow-sm">
        <h2 className="font-bold text-lg text-gray-800">
          Tasks ({allTasks.length})
        </h2>
      </div>

      {/* Scrollable Tasks - Full remaining height */}
      <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300">
        <div className="p-4 space-y-2">
          {allTasks.map((task) => (
            <TaskMenuBtn key={task.type} task={task} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function TaskMenuBtn({
  task,
}: {
  task: NonNullable<(typeof TaskRegistry)[TaskType]>;
}) {
  const onDragStart = (event: React.DragEvent, type: TaskType) => {
    event.dataTransfer.setData("application/reactflow", type);
    event.dataTransfer.effectAllowed = "move";
  };

  return (
    <Button
      variant="ghost"
      className="w-full justify-start h-12 px-4 py-2 hover:bg-gray-50 border-l-4 border-transparent hover:border-blue-500 transition-all"
      draggable
      onDragStart={(event) => onDragStart(event, task.type)}
    >
      <div className="flex items-center gap-3 flex-1">
        {task.icon ? (
          <task.icon size={18} className="flex-shrink-0" />
        ) : (
          <div className="w-5 h-5 bg-gray-200 rounded" />
        )}
        <span className="font-medium text-sm">{task.label}</span>
      </div>
      <Badge variant="outline" className="ml-auto">
        <CoinsIcon size={12} />
        <span className="ml-1 text-xs">{task.credits ?? 1}</span>
      </Badge>
    </Button>
  );
}
