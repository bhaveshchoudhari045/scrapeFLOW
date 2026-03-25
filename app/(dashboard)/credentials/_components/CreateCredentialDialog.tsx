"use client";
import React, { useCallback, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Layers2Icon, Loader2, ShieldEllipsis } from "lucide-react";
import CustomDialogHeader from "@/components/CustomDialogHeader";
import {
  createWorkflowSchema,
  createWorkflowSchemaType,
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
import {
  createCredentialSchema,
  createCredentialSchemaType,
} from "@/schema/credential";
import { CreateCredential } from "@/actions/credentials/createCredential";
function CreateCredentialDialog({
  triggerText,
  defaultOpen = false,
}: {
  triggerText?: string;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const form = useForm<createCredentialSchemaType>({
    resolver: zodResolver(createCredentialSchema),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: async (data: createCredentialSchemaType) => {
      return await CreateCredential(data);
    },
    onSuccess: () => {
      toast.success("Credential created", { id: "create-credential" });
      form.reset();
      setOpen(false);
    },
    onError: (error: any) => {
      // 1. Log the full error to the terminal/console for debugging
      console.error("Failed to create credential:", error);

      // 2. Extract a readable message from the error object
      const errorMessage = error?.message || "Something went wrong";

      // 3. Display the toast with the specific error details
      toast.error(`Failed to create credential: ${errorMessage}`, {
        id: "create-credential",
      });
    },
  });
  const onSubmit = useCallback(
    (values: createCredentialSchemaType) => {
      toast.loading("Creating credential...", { id: "create-credential" });
      mutate(values);
    },
    [mutate],
  );
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>{triggerText ?? "Create"}</Button>
      </DialogTrigger>
      <DialogContent className="px-0">
        <CustomDialogHeader icon={ShieldEllipsis} title="Create credential" />
        <DialogDescription className="sr-only">
          create new credential
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
                      Enter a unique an descriptive name for the credential{" "}
                      <br />
                      This name will be user to identify the credential
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="flex gap-1 items-center">
                      Value
                      <p className="text-xs text-primary">(required)</p>
                    </FormLabel>
                    <FormControl>
                      <Textarea className="resize-none" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter the value associated with this credential <br />{" "}
                      This value will be securely encrypted and stored
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

export default CreateCredentialDialog;
