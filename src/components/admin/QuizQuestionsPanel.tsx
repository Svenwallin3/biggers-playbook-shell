import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import {
  createQuizQuestion,
  setQuizQuestionDeleted,
  stepQuizzesQueryOptions,
  updateQuizQuestion,
  type QuizQuestionInput,
  type QuizRow,
} from "@/lib/quiz-admin.queries";

type Form = {
  question: string;
  options: string[];
  correctOption: number;
  explanation: string;
  sequenceOrder: number;
};

const emptyForm = (nextOrder: number): Form => ({
  question: "",
  options: ["", ""],
  correctOption: 0,
  explanation: "",
  sequenceOrder: nextOrder,
});

function toOptions(row: QuizRow): string[] {
  const raw = row.options;
  if (Array.isArray(raw)) return raw.map((o) => String(o));
  return [];
}

export function QuizQuestionsPanel({ stepId }: { stepId: string }) {
  const { employee, isGeneralManager, isOwner } = useAuth();
  const canAuthor = isGeneralManager || isOwner;
  const queryClient = useQueryClient();
  const query = useQuery(stepQuizzesQueryOptions(stepId));
  const rows = query.data ?? [];

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QuizRow | null>(null);
  const [form, setForm] = useState<Form>(emptyForm(1));

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["step-quizzes", stepId] });

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm(rows.length + 1));
    setOpen(true);
  };

  const openEdit = (row: QuizRow) => {
    setEditing(row);
    setForm({
      question: row.question,
      options: toOptions(row).length >= 2 ? toOptions(row) : ["", ""],
      correctOption: row.correct_option,
      explanation: row.explanation ?? "",
      sequenceOrder: row.sequence_order,
    });
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: async () => {
      const options = form.options.map((o) => o.trim()).filter(Boolean);
      if (!form.question.trim()) throw new Error("A question is required.");
      if (options.length < 2) throw new Error("Give at least two answer options.");
      if (form.correctOption >= options.length) throw new Error("Mark which option is correct.");
      const input: QuizQuestionInput = {
        question: form.question.trim(),
        options,
        correctOption: form.correctOption,
        explanation: form.explanation.trim() || null,
        sequenceOrder: form.sequenceOrder,
      };
      if (editing) await updateQuizQuestion(editing.id, input);
      else await createQuizQuestion({ ...input, stepId });
    },
    onSuccess: () => {
      void refresh();
      setOpen(false);
      toast.success(editing ? "Question updated." : "Question added.");
    },
    onError: (error: Error) => toast.error("Couldn't save", { description: error.message }),
  });

  const toggleDeleted = useMutation({
    mutationFn: (input: { id: string; deleted: boolean }) =>
      setQuizQuestionDeleted({ ...input, actorId: employee?.id ?? null }),
    onSuccess: (_d, v) => {
      void refresh();
      toast.success(v.deleted ? "Question removed — restorable." : "Question restored.");
    },
    onError: (error: Error) => toast.error("Couldn't do that", { description: error.message }),
  });

  const setOption = (i: number, value: string) =>
    setForm((f) => ({ ...f, options: f.options.map((o, idx) => (idx === i ? value : o)) }));

  const removeOption = (i: number) =>
    setForm((f) => ({
      ...f,
      options: f.options.filter((_, idx) => idx !== i),
      correctOption:
        f.correctOption === i ? 0 : f.correctOption > i ? f.correctOption - 1 : f.correctOption,
    }));

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Quiz questions</CardTitle>
          <CardDescription>
            The questions a trainee answers on this step. Removals are soft and restorable.
          </CardDescription>
        </div>
        {canAuthor ? (
          <Button size="sm" onClick={openCreate}>
            <Plus className="mr-1 h-4 w-4" /> Add question
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {!canAuthor ? (
          <p className="text-xs text-muted-foreground">
            Quiz authoring is a General Manager / Owner action.
          </p>
        ) : null}

        {query.isPending ? (
          <p className="text-sm text-muted-foreground">Loading questions…</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No questions on this step yet.</p>
        ) : (
          <ul className="space-y-2">
            {rows.map((row) => {
              const options = toOptions(row);
              return (
                <li
                  key={row.id}
                  className="flex flex-col gap-2 rounded-md border p-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0 space-y-1">
                    <p
                      className={`text-sm font-medium ${row.is_deleted ? "text-muted-foreground line-through" : ""}`}
                    >
                      {row.sequence_order}. {row.question}
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">
                        {options.length} option{options.length === 1 ? "" : "s"}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        Correct: {options[row.correct_option] ?? "—"}
                      </span>
                    </div>
                  </div>
                  {canAuthor ? (
                    <div className="flex shrink-0 gap-2">
                      <Button size="sm" variant="outline" onClick={() => openEdit(row)}>
                        Edit
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={toggleDeleted.isPending}
                        onClick={() =>
                          toggleDeleted.mutate({ id: row.id, deleted: !row.is_deleted })
                        }
                      >
                        {row.is_deleted ? "Restore" : "Remove"}
                      </Button>
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit question" : "Add question"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="quiz-question">Question</Label>
              <Textarea
                id="quiz-question"
                rows={3}
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label>Answer options — select the correct one</Label>
              {form.options.map((option, i) => (
                <div key={i} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="quiz-correct"
                    className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                    checked={form.correctOption === i}
                    onChange={() => setForm((f) => ({ ...f, correctOption: i }))}
                    aria-label={`Mark option ${i + 1} correct`}
                  />
                  <Input
                    value={option}
                    placeholder={`Option ${i + 1}`}
                    onChange={(e) => setOption(i, e.target.value)}
                  />
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    disabled={form.options.length <= 2}
                    onClick={() => removeOption(i)}
                    aria-label={`Remove option ${i + 1}`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForm((f) => ({ ...f, options: [...f.options, ""] }))}
              >
                <Plus className="mr-1 h-4 w-4" /> Add option
              </Button>
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-explanation">Explanation (optional)</Label>
              <Textarea
                id="quiz-explanation"
                rows={2}
                value={form.explanation}
                placeholder="Shown to the trainee after they answer"
                onChange={(e) => setForm((f) => ({ ...f, explanation: e.target.value }))}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="quiz-order">Sequence order</Label>
              <Input
                id="quiz-order"
                type="number"
                min={1}
                value={form.sequenceOrder}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sequenceOrder: Number(e.target.value) || 1 }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button disabled={save.isPending} onClick={() => save.mutate()}>
              {save.isPending ? "Saving…" : "Save question"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
