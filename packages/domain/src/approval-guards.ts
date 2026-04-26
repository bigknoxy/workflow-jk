import { ApprovalDecision, ApprovalRecord } from "@workflow-jk/contracts";

export function isApproved(approvals: ApprovalRecord[], artifactType: string): boolean {
  const latestApproval = approvals
    .filter((a) => a.artifactType === artifactType)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return latestApproval?.decision === "approved";
}

export function isRejected(approvals: ApprovalRecord[], artifactType: string): boolean {
  const latestApproval = approvals
    .filter((a) => a.artifactType === artifactType)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0];

  return latestApproval?.decision === "rejected" || latestApproval?.decision === "changes_requested";
}