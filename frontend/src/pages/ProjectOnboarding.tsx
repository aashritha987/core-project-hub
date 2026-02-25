import { useEffect, useMemo, useState } from "react";
import {
  createPlatformSetupInstruction,
  deletePlatformSetupInstruction,
  getProjectOnboarding,
  upsertProjectOnboarding,
  updatePlatformSetupInstruction,
} from "@/lib/api";
import { useProject } from "@/contexts/ProjectContext";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { PlatformSetupInstruction, SetupPlatform } from "@/types/jira";

const platformOptions: Array<{ value: SetupPlatform; label: string }> = [
  { value: "windows", label: "Windows" },
  { value: "linux", label: "Linux" },
  { value: "macos", label: "macOS" },
  { value: "other", label: "Other" },
];

const platformLabel = (value: SetupPlatform) =>
  platformOptions.find((p) => p.value === value)?.label || value;

export default function ProjectOnboarding() {
  const { currentProject } = useProject();
  const { currentUser, hasRole } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [exists, setExists] = useState(false);
  const [canEditFromApi, setCanEditFromApi] = useState(false);
  const [overview, setOverview] = useState("");
  const [repositoryUrl, setRepositoryUrl] = useState("");
  const [prerequisites, setPrerequisites] = useState("");
  const [instructions, setInstructions] = useState<PlatformSetupInstruction[]>(
    [],
  );
  const [savingGuide, setSavingGuide] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [instructionForm, setInstructionForm] = useState({
    id: "",
    platform: "windows" as SetupPlatform,
    title: "",
    content: "",
    displayOrder: "0",
  });

  const canEdit = useMemo(() => {
    const roleAllowed = hasRole(["admin", "project_manager"]);
    const isLead =
      currentProject.leadId && currentUser?.id === currentProject.leadId;
    return Boolean(canEditFromApi || roleAllowed || isLead);
  }, [canEditFromApi, hasRole, currentProject.leadId, currentUser?.id]);

  async function loadOnboarding() {
    if (!currentProject?.id || currentProject.id === "none") return;
    setLoading(true);
    setError("");
    setSuccessMessage("");
    try {
      const res = await getProjectOnboarding(currentProject.id);
      setExists(res.exists);
      setCanEditFromApi(res.canEdit);
      if (res.onboarding) {
        setOverview(res.onboarding.overview || "");
        setRepositoryUrl(res.onboarding.repositoryUrl || "");
        setPrerequisites(res.onboarding.prerequisites || "");
        setInstructions(res.onboarding.instructions || []);
      } else {
        setOverview("");
        setRepositoryUrl("");
        setPrerequisites("");
        setInstructions([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load onboarding",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadOnboarding();
  }, [currentProject?.id]);

  async function createInitialGuide() {
    setSavingGuide(true);
    setError("");
    try {
      await upsertProjectOnboarding(currentProject.id, {
        overview: "",
        repositoryUrl: "",
        prerequisites: "",
      });
      await loadOnboarding();
      setSuccessMessage("Onboarding guide created and fetched from database.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to create onboarding guide",
      );
    } finally {
      setSavingGuide(false);
    }
  }

  async function saveGuide() {
    setSavingGuide(true);
    setError("");
    try {
      await upsertProjectOnboarding(currentProject.id, {
        overview,
        repositoryUrl,
        prerequisites,
      });
      await loadOnboarding();
      setSuccessMessage("README saved");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save onboarding guide",
      );
    } finally {
      setSavingGuide(false);
    }
  }

  function startEditInstruction(instruction: PlatformSetupInstruction) {
    setInstructionForm({
      id: instruction.id,
      platform: instruction.platform,
      title: instruction.title,
      content: instruction.content,
      displayOrder: String(instruction.displayOrder ?? 0),
    });
  }

  function resetInstructionForm() {
    setInstructionForm({
      id: "",
      platform: "windows",
      title: "",
      content: "",
      displayOrder: "0",
    });
  }

  async function submitInstruction() {
    if (!instructionForm.title.trim() || !instructionForm.content.trim()) {
      setError("Instruction title and content are required.");
      return;
    }
    setError("");
    const payload = {
      platform: instructionForm.platform,
      title: instructionForm.title.trim(),
      content: instructionForm.content.trim(),
      displayOrder: Number(instructionForm.displayOrder || 0),
    };
    try {
      if (instructionForm.id) {
        await updatePlatformSetupInstruction(instructionForm.id, payload);
        setSuccessMessage("Platform instruction updated in database.");
      } else {
        await createPlatformSetupInstruction(currentProject.id, payload);
        setSuccessMessage("Platform instruction created in database.");
      }
      await loadOnboarding();
      resetInstructionForm();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save platform instruction",
      );
    }
  }

  async function removeInstruction(instructionId: string) {
    const ok = confirm("Delete this instruction?");
    if (!ok) return;
    try {
      await deletePlatformSetupInstruction(instructionId);
      await loadOnboarding();
      setSuccessMessage("Platform instruction deleted from database.");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to delete instruction",
      );
    }
  }

  const groupedInstructions = useMemo(() => {
    return platformOptions.map((platform) => ({
      ...platform,
      items: instructions
        .filter((item) => item.platform === platform.value)
        .sort((a, b) => a.displayOrder - b.displayOrder),
    }));
  }, [instructions]);

  if (loading) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Loading onboarding guide...
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold text-foreground">
          Project Onboarding
        </h1>
        <p className="text-sm text-muted-foreground">
          README and setup instructions for new team members in{" "}
          {currentProject.name}.
        </p>
      </div>

      {error ? (
        <Card className="border-destructive/40">
          <CardContent className="py-3 text-sm text-destructive">
            {error}
          </CardContent>
        </Card>
      ) : null}

      {successMessage ? (
        <Card className="border-emerald-200">
          <CardContent className="py-3 text-sm text-emerald-700">
            {successMessage}
          </CardContent>
        </Card>
      ) : null}

      {!exists ? (
        <Card className="border shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">
              No onboarding guide yet
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              This project does not have onboarding instructions yet.
            </p>
            {canEdit ? (
              <Button onClick={createInitialGuide} disabled={savingGuide}>
                {savingGuide ? "Creating..." : "Create Onboarding Guide"}
              </Button>
            ) : (
              <p className="text-xs text-muted-foreground">
                Ask a project admin or project manager to create the onboarding
                guide.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Project README
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Repository URL
                </Label>
                {canEdit ? (
                  <Input
                    value={repositoryUrl}
                    onChange={(e) => setRepositoryUrl(e.target.value)}
                    placeholder="https://github.com/org/repo"
                    className="h-9"
                  />
                ) : (
                  <p className="text-sm">
                    {repositoryUrl ? (
                      <a
                        href={repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary underline"
                      >
                        {repositoryUrl}
                      </a>
                    ) : (
                      <span className="text-muted-foreground">
                        No repository URL added.
                      </span>
                    )}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Overview
                </Label>
                {canEdit ? (
                  <Textarea
                    value={overview}
                    onChange={(e) => setOverview(e.target.value)}
                    placeholder="High-level onboarding overview for this project..."
                    className="min-h-[140px]"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {overview || "No overview has been added yet."}
                  </p>
                )}
              </div>
              <div>
                <Label className="text-xs text-muted-foreground mb-1.5 block">
                  Prerequisites
                </Label>
                {canEdit ? (
                  <Textarea
                    value={prerequisites}
                    onChange={(e) => setPrerequisites(e.target.value)}
                    placeholder="Required tools, accounts, permissions, and dependencies..."
                    className="min-h-[120px]"
                  />
                ) : (
                  <p className="text-sm whitespace-pre-wrap">
                    {prerequisites || "No prerequisites listed yet."}
                  </p>
                )}
              </div>
              {canEdit ? (
                <div className="flex justify-end">
                  <Button onClick={saveGuide} disabled={savingGuide}>
                    {savingGuide ? "Saving..." : "Save README"}
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card className="border shadow-sm">
            <CardHeader>
              <CardTitle className="text-sm font-semibold">
                Platform Setup Instructions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {groupedInstructions.map((group) => (
                <div key={group.value} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{group.label}</Badge>
                    <span className="text-xs text-muted-foreground">
                      {group.items.length} instruction(s)
                    </span>
                  </div>
                  {group.items.length ? (
                    <div className="space-y-2">
                      {group.items.map((item) => (
                        <Card key={item.id} className="border bg-muted/30">
                          <CardContent className="py-3 space-y-2">
                            <div className="flex items-center justify-between gap-2">
                              <p className="text-sm font-medium">
                                {item.title}
                              </p>
                              {canEdit ? (
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => startEditInstruction(item)}
                                  >
                                    Edit
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => removeInstruction(item.id)}
                                  >
                                    Delete
                                  </Button>
                                </div>
                              ) : null}
                            </div>
                            <p className="text-sm whitespace-pre-wrap">
                              {item.content}
                            </p>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      No {group.label} instructions yet.
                    </p>
                  )}
                </div>
              ))}
            </CardContent>
          </Card>

          {canEdit ? (
            <Card className="border shadow-sm">
              <CardHeader>
                <CardTitle className="text-sm font-semibold">
                  {instructionForm.id
                    ? "Edit Platform Instruction"
                    : "Add Platform Instruction"}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Platform
                  </Label>
                  <select
                    className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={instructionForm.platform}
                    onChange={(e) =>
                      setInstructionForm((prev) => ({
                        ...prev,
                        platform: e.target.value as SetupPlatform,
                      }))
                    }
                  >
                    {platformOptions.map((platform) => (
                      <option key={platform.value} value={platform.value}>
                        {platform.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Title
                  </Label>
                  <Input
                    value={instructionForm.title}
                    onChange={(e) =>
                      setInstructionForm((prev) => ({
                        ...prev,
                        title: e.target.value,
                      }))
                    }
                    placeholder={`Setup for ${platformLabel(instructionForm.platform)}`}
                    className="h-9"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Instructions
                  </Label>
                  <Textarea
                    value={instructionForm.content}
                    onChange={(e) =>
                      setInstructionForm((prev) => ({
                        ...prev,
                        content: e.target.value,
                      }))
                    }
                    placeholder="Add step-by-step setup instructions..."
                    className="min-h-[140px]"
                  />
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground mb-1.5 block">
                    Display Order
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={instructionForm.displayOrder}
                    onChange={(e) =>
                      setInstructionForm((prev) => ({
                        ...prev,
                        displayOrder: e.target.value,
                      }))
                    }
                    className="h-9 max-w-[120px]"
                  />
                </div>
                <div className="flex justify-end gap-2">
                  {instructionForm.id ? (
                    <Button variant="outline" onClick={resetInstructionForm}>
                      Cancel Edit
                    </Button>
                  ) : null}
                  <Button onClick={submitInstruction}>
                    {instructionForm.id
                      ? "Update Instruction"
                      : "Add Instruction"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </>
      )}
    </div>
  );
}
