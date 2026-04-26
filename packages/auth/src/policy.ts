import type { Action, UserRole } from "@workflow-jk/contracts";

interface PolicyRule {
  actions: Action[];
  roles: UserRole[];
}

const POLICY_RULES: PolicyRule[] = [
  {
    roles: ["org_admin"],
    actions: [
      "project:create", "project:read", "project:delete",
      "workflow:start", "workflow:resume", "workflow:read",
      "approval:submit", "approval:read",
      "artifact:read", "artifact:write",
      "audit:read",
      "execution:start", "execution:cancel",
      "org:manage", "user:manage",
      "auth:login", "auth:logout",
    ],
  },
  {
    roles: ["reviewer"],
    actions: [
      "project:read",
      "workflow:read",
      "approval:submit", "approval:read",
      "artifact:read",
      "audit:read",
      "auth:login", "auth:logout",
    ],
  },
  {
    roles: ["operator"],
    actions: [
      "project:read",
      "workflow:start", "workflow:resume", "workflow:read",
      "artifact:read", "artifact:write",
      "approval:read",
      "audit:read",
      "execution:start", "execution:cancel",
      "auth:login", "auth:logout",
    ],
  },
  {
    roles: ["requester"],
    actions: [
      "project:create", "project:read",
      "workflow:read",
      "artifact:read",
      "auth:login", "auth:logout",
    ],
  },
  {
    roles: ["read_only_auditor"],
    actions: [
      "project:read",
      "workflow:read",
      "approval:read",
      "artifact:read",
      "audit:read",
      "auth:login", "auth:logout",
    ],
  },
];

const roleActionMap: Map<string, Set<Action>> = new Map();

for (const rule of POLICY_RULES) {
  for (const role of rule.roles) {
    const existing = roleActionMap.get(role) || new Set<Action>();
    for (const action of rule.actions) {
      existing.add(action);
    }
    roleActionMap.set(role, existing);
  }
}

export class PolicyService {
  authorize(action: Action, role: UserRole): boolean {
    const allowed = roleActionMap.get(role);
    if (!allowed) return false;
    return allowed.has(action);
  }

  getAllowedActions(role: UserRole): Action[] {
    const allowed = roleActionMap.get(role);
    return allowed ? Array.from(allowed) : [];
  }

  isReadOnly(role: UserRole): boolean {
    return role === "read_only_auditor";
  }
}

export const DEFAULT_POLICY_SERVICE = new PolicyService();