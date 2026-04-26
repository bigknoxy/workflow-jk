import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  setActivityDependencies,
  getActivityDependencies,
  saveArtifact,
  getArtifact,
  persistWorkflowState,
  recordApproval,
  notifyAwaitingInput,
  deriveAcceptanceCriterion,
  deriveNonFunctionalRequirements,
} from '../activities';

const mockStore = {
  save: vi.fn().mockImplementation((a: any) => Promise.resolve(a)),
  getById: vi.fn().mockResolvedValue(null),
  query: vi.fn().mockResolvedValue([]),
  getLatest: vi.fn().mockResolvedValue(null),
};

const mockProjectRepo = {
  save: vi.fn(),
  getById: vi.fn().mockResolvedValue(null),
  list: vi.fn().mockResolvedValue([]),
};

const mockWorkflowRepo = {
  save: vi.fn(),
  getById: vi.fn().mockResolvedValue(null),
  findByProject: vi.fn().mockResolvedValue([]),
  updateState: vi.fn().mockResolvedValue({}),
};

const mockApprovalRepo = {
  save: vi.fn(),
  getById: vi.fn().mockResolvedValue(null),
  getByWorkflow: vi.fn().mockResolvedValue([]),
};

const mockRepoProvider = {
  createRepo: vi.fn(),
  getRepo: vi.fn(),
  createFile: vi.fn(),
  getFile: vi.fn(),
  updateFile: vi.fn(),
  deleteFile: vi.fn(),
  listFiles: vi.fn().mockResolvedValue([]),
};

const mockTestRunner = {
  runTests: vi.fn().mockResolvedValue({ passed: true, results: [] }),
};

const mockBrowserRunner = {
  runChecks: vi.fn().mockResolvedValue({ passed: true, results: [] }),
};

const mockNotification = {
  notify: vi.fn(),
};

const mockClock = {
  now: vi.fn().mockReturnValue(Date.now()),
  isoNow: vi.fn().mockReturnValue(new Date().toISOString()),
};

const mockLLM = {
  complete: vi.fn().mockResolvedValue(''),
};

const testOrgId = "00000000-0000-0000-0000-000000000000" as any;

const baseDeps = {
  llmProvider: mockLLM,
  artifactStore: mockStore,
  projectRepository: mockProjectRepo,
  workflowRepository: mockWorkflowRepo,
  approvalRepository: mockApprovalRepo,
  repoProvider: mockRepoProvider,
  testRunner: mockTestRunner,
  browserRunner: mockBrowserRunner,
  notificationProvider: mockNotification,
  clock: mockClock,
  organizationId: testOrgId,
};

beforeEach(() => {
  vi.clearAllMocks();
  setActivityDependencies(baseDeps);
});

describe('Activity dependencies', () => {
  it('setActivityDependencies stores deps for activity use', () => {
    const result = getActivityDependencies();
    expect(result).toBe(baseDeps);
  });

  it('getActivityDependencies throws before set', () => {
    const orig = (baseDeps as any).__orig;
    setActivityDependencies(undefined as any);
    expect(() => getActivityDependencies()).toThrow('Activity dependencies not set');
    setActivityDependencies(baseDeps);
  });
});

describe('saveArtifact activity', () => {
  it('persists artifact via store', async () => {
    const artifact = {
      id: 'art-1' as any,
      projectId: 'proj-1' as any,
      workflowRunId: 'wf-1' as any,
      type: 'Brief' as any,
      version: 1,
      content: { summary: 'test' },
      createdAt: new Date().toISOString(),
      schemaVersion: '1' as any,
    };

    await saveArtifact(artifact);
    expect(mockStore.save).toHaveBeenCalledWith(artifact);
  });
});

describe('getArtifact activity', () => {
  it('retrieves artifact via getById', async () => {
    const testOrgId = "00000000-0000-0000-0000-000000000000" as any;
    const mockArtifact = { id: 'art-1', type: 'Brief' };
    mockStore.getById.mockResolvedValueOnce(mockArtifact);

    const result = await getArtifact('art-1' as any);
    expect(result).toEqual(mockArtifact);
    expect(mockStore.getById).toHaveBeenCalledWith('art-1', testOrgId);
  });

  it('returns null for missing artifact', async () => {
    mockStore.getById.mockResolvedValueOnce(null);
    const result = await getArtifact('missing' as any);
    expect(result).toBeNull();
  });
});

describe('persistWorkflowState activity', () => {
  it('calls updateState on workflow repository', async () => {
    await persistWorkflowState('wf-1' as any, 'IntakeInProgress' as any, 'intake');
    expect(mockWorkflowRepo.updateState).toHaveBeenCalledWith('wf-1', testOrgId, 'IntakeInProgress', 'intake');
  });
});

describe('recordApproval activity', () => {
  it('creates and persists approval record', async () => {
    await recordApproval('wf-1' as any, 'Requirements', 'approved', 'user@test.com', 'LGTM');
    expect(mockApprovalRepo.save).toHaveBeenCalled();
    const saved = mockApprovalRepo.save.mock.calls[0][0];
    expect(saved.workflowRunId).toBe('wf-1');
    expect(saved.decision).toBe('approved');
  });
});

describe('notifyAwaitingInput activity', () => {
  it('sends notification via provider', async () => {
    await notifyAwaitingInput('proj-1' as any, 'wf-1' as any, 'clarification');
    expect(mockNotification.notify).toHaveBeenCalledWith('system', 'clarification', expect.objectContaining({
      projectId: 'proj-1',
      workflowRunId: 'wf-1',
      inputType: 'clarification',
    }));
  });
});

describe('deriveAcceptanceCriterion', () => {
  const answers = { answers: [] };

  it('generates functional AC with default structure', () => {
    const result = deriveAcceptanceCriterion(
      { id: 'ac-1', criterion: 'Users can create boards', category: 'functional' },
      'req-1',
      answers,
    );
    expect(result.id).toBe('ac-1');
    expect(result.requirementId).toBe('req-1');
    expect(result.then).toContain('boards');
  });

  it('generates performance AC', () => {
    const result = deriveAcceptanceCriterion(
      { id: 'ac-2', criterion: 'Page loads under 3 seconds', category: 'performance' },
      'req-2',
      answers,
    );
    expect(result.given).toContain('load');
    expect(result.then).toContain('performance');
  });

  it('generates security AC', () => {
    const result = deriveAcceptanceCriterion(
      { id: 'ac-3', criterion: 'Data encrypted at rest', category: 'security' },
      'req-3',
      answers,
    );
    expect(result.given).toContain('authenticated');
    expect(result.then.toLowerCase()).toContain('security');
  });
});

describe('deriveNonFunctionalRequirements', () => {
  it('derives mobile performance NFR from brief constraints', () => {
    const brief = {
      problemStatement: 'test',
      targetUsers: 'users',
      businessValue: 'value',
      keyFeatures: ['feature'],
      constraints: ['Must be mobile-first', 'Budget under $50k'],
      assumptions: [],
      outOfScope: [],
    };
    const critique = {
      clarificationQuestions: [],
      identifiedRisks: [],
      missingConstraints: [],
      assumptions: [],
      draftAcceptanceCriteria: [],
    };
    const nfrs = deriveNonFunctionalRequirements(brief, critique);
    expect(nfrs.length).toBeGreaterThan(0);
    const perfNfr = nfrs.find((n) => n.category === 'performance');
    expect(perfNfr).toBeDefined();
    expect(perfNfr!.description).toContain('Mobile');
  });

  it('derives security NFR from brief constraints', () => {
    const brief = {
      problemStatement: 'test',
      targetUsers: 'users',
      businessValue: 'value',
      keyFeatures: ['feature'],
      constraints: ['SSO integration', 'Must encrypt data'],
      assumptions: [],
      outOfScope: [],
    };
    const critique = {
      clarificationQuestions: [],
      identifiedRisks: [],
      missingConstraints: [],
      assumptions: [],
      draftAcceptanceCriteria: [],
    };
    const nfrs = deriveNonFunctionalRequirements(brief, critique);
    const secNfr = nfrs.find((n) => n.category === 'security');
    expect(secNfr).toBeDefined();
  });

  it('adds high-risk items as reliability NFRs', () => {
    const brief = {
      problemStatement: 'test',
      targetUsers: 'users',
      businessValue: 'value',
      keyFeatures: ['feature'],
      constraints: [],
      assumptions: [],
      outOfScope: [],
    };
    const critique = {
      clarificationQuestions: [],
      identifiedRisks: [
        { id: 'r1', description: 'Data loss risk', severity: 'high', mitigation: 'Backup strategy' },
      ],
      missingConstraints: [],
      assumptions: [],
      draftAcceptanceCriteria: [],
    };
    const nfrs = deriveNonFunctionalRequirements(brief, critique);
    const reliabilityNfr = nfrs.find((n) => n.category === 'reliability' && n.description.includes('Data loss'));
    expect(reliabilityNfr).toBeDefined();
  });

  it('falls back to generic NFRs when no constraints', () => {
    const brief = {
      problemStatement: 'test',
      targetUsers: 'users',
      businessValue: 'value',
      keyFeatures: ['feature'],
      constraints: [],
      assumptions: [],
      outOfScope: [],
    };
    const critique = {
      clarificationQuestions: [],
      identifiedRisks: [],
      missingConstraints: [],
      assumptions: [],
      draftAcceptanceCriteria: [],
    };
    const nfrs = deriveNonFunctionalRequirements(brief, critique);
    expect(nfrs.length).toBeGreaterThanOrEqual(2);
  });
});