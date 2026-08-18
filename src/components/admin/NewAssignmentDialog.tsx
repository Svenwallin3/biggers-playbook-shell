import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, ChevronsUpDown } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  assignableEmployeesQueryOptions,
  assignableModulesQueryOptions,
  createAssignableModuleAssignment,
} from "@/lib/admin.queries";
import { cn } from "@/lib/utils";

/**
 * The New Assignment dialog (employee picker + optional due date). Unchanged
 * behaviour from the old Compliance entry point; it can now also be launched
 * with a module already chosen from the Assign Training page.
 */
export function NewAssignmentDialog({
  actorId,
  open,
  onOpenChange,
  presetModuleId,
  presetModuleName,
}: {
  actorId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  presetModuleId?: string | undefined;
  presetModuleName?: string | undefined;
}) {
  const queryClient = useQueryClient();
  const [employeeOpen, setEmployeeOpen] = useState(false);
  const [employeeId, setEmployeeId] = useState("");
  const [moduleId, setModuleId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const employees = useQuery({ ...assignableEmployeesQueryOptions(), enabled: open });
  const modules = useQuery({
    ...assignableModulesQueryOptions(),
    enabled: open && !presetModuleId,
  });
  const selectedEmployee = (employees.data ?? []).find((e) => e.id === employeeId);
  const effectiveModuleId = presetModuleId ?? moduleId;

  const create = useMutation({
    mutationFn: async () => {
      if (!employeeId) throw new Error("Pick an employee.");
      if (!effectiveModuleId) throw new Error("Pick a module.");
      await createAssignableModuleAssignment({
        employeeId,
        moduleId: effectiveModuleId,
        dueDate: dueDate || null,
        assignedBy: actorId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["assignments"] });
      onOpenChange(false);
      setEmployeeId("");
      setModuleId("");
      setDueDate("");
      toast.success("Assignment created.");
    },
    onError: (error: Error) => toast.error("Couldn't assign", { description: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New assignment</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Employee</Label>
            <Popover open={employeeOpen} onOpenChange={setEmployeeOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {selectedEmployee
                      ? (selectedEmployee.full_name ?? selectedEmployee.email)
                      : "Select an employee"}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Search employees…" />
                  <CommandList>
                    <CommandEmpty>No employee found.</CommandEmpty>
                    <CommandGroup>
                      {(employees.data ?? []).map((e) => {
                        const label = e.full_name ?? e.email;
                        return (
                          <CommandItem
                            key={e.id}
                            value={label}
                            onSelect={() => {
                              setEmployeeId(e.id);
                              setEmployeeOpen(false);
                            }}
                          >
                            <Check
                              className={cn(
                                "mr-2 h-4 w-4",
                                employeeId === e.id ? "opacity-100" : "opacity-0",
                              )}
                            />
                            {label}
                          </CommandItem>
                        );
                      })}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>

          <div className="space-y-2">
            <Label htmlFor="assign-module">Module</Label>
            {presetModuleId ? (
              <p
                id="assign-module"
                className="rounded-md border bg-muted/40 px-3 py-2 text-sm font-medium"
              >
                {presetModuleName ?? "Selected module"}
              </p>
            ) : (
              <Select value={moduleId} onValueChange={setModuleId}>
                <SelectTrigger id="assign-module">
                  <SelectValue placeholder="Select a restricted module" />
                </SelectTrigger>
                <SelectContent>
                  {(modules.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                      {m.track ? ` — ${m.track.name}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="assign-due">Due date (optional)</Label>
            <Input
              id="assign-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button disabled={create.isPending} onClick={() => create.mutate()}>
            {create.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
