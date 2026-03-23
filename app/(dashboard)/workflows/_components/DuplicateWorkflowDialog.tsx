"use client";
import React, { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CopyIcon, Layers2Icon, Loader2 } from "lucide-react";
import CustomDialogHeader from "@/components/CustomDialogHeader";
import {
  createWorkflowSchema,
  createWorkflowSchemaType,
  duplicateWorkflowSchema,
  duplicateWorkflowSchemaType,
} from "@/schema/workflow";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Form,
  FormControl,
  FormDescription,
  FormItem,
  FormLabel,
  FormMessage,
  FormField,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { CreateWorkflow } from "@/actions/workflows/createWorkflow";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { DuplicateWorkflow } from "@/actions/workflows/duplicateWorkflow";
import { cn } from "@/lib/utils";
function DuplicateWorkflowDialog({ workflowId }: { workflowId?: string }) {
  const [open, setOpen] = useState(false);
  const form = useForm<duplicateWorkflowSchemaType>({
    resolver: zodResolver(duplicateWorkflowSchema),
    defaultValues: { workflowId },
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: duplicateWorkflowSchemaType) => {
      return await DuplicateWorkflow(data);
    },
    onSuccess: () => {
      toast.success("Workflow duplicated", { id: "duplicate-workflow" });
      setOpen((prev) => !prev);
    },
    onError: (error: any) => {
      // 1. Log the full error to the terminal/console for debugging
      console.error("failed duplicate Error:", error);

      // 2. Extract a readable message from the error object
      const errorMessage = error?.message || "Something went wrong";

      // 3. Display the toast with the specific error details
      toast.error(`Failed to create workflow: ${errorMessage}`, {
        id: "create-workflow",
      });
    },
  });
  const onSubmit = useCallback(
    (values: duplicateWorkflowSchemaType) => {
      toast.loading("Duplicating workflow...", { id: "duplicate-workflow" });
      mutate(values);
    },
    [mutate],
  );
  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        form.reset();
        setOpen(open);
      }}
    >
      <DialogTrigger asChild>
        <Button
          variant={"ghost"}
          size={"icon"}
          className={cn(
            "ml-2 transition-opacity duration-200 opacity-0 group-hover/card:opacity-100",
          )}
        >
          <CopyIcon className="w-4 h-4 text-muted-foreground cursor-pointer" />
        </Button>
      </DialogTrigger>
      <DialogContent className="px-0">
        <CustomDialogHeader icon={Layers2Icon} title="Duplicate Workflow" />
        <DialogDescription className="sr-only">
          Create a new workflow to start automating your tasks.
        </DialogDescription>
        <div className="p-6">
          <Form {...form}>
            <form
              className="space-y-8 w-full"
              onSubmit={form.handleSubmit(onSubmit)}
            >
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-1 items-center">
                      Name
                      <p className="text-xs text-primary">(required)</p>
                    </FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormDescription>
                      Choose a descriptive and unique name
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-1 items-center">
                      Description
                      <p className="text-xs text-muted-foreground">
                        (optional)
                      </p>
                    </FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" {...field} />
                    </FormControl>
                    <FormDescription>
                      Provide a brief description of what your workflow does.
                      <br />
                      This is optional but can be help you remeber the
                      workflow&apos;s purpose.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isPending}>
                {!isPending && "Proceed"}
                {isPending && <Loader2 className="animate-spin" />}
              </Button>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default DuplicateWorkflowDialog;
