import { AgentPort, AgentResult } from "../ports";
import { AgentInvocation, AgentName } from "@workflow-jk/contracts";

export class FakeAgentPort implements AgentPort {
  private nextResult: AgentResult = {
    agentName: "intake" as AgentName,
    success: true,
    output: {},
    durationMs: 0,
  };

  setNextResult(result: AgentResult): void {
    this.nextResult = result;
  }

  async invoke(invocation: AgentInvocation): Promise<AgentResult> {
    // Return a copy to avoid mutation issues
    return {
      ...this.nextResult,
      agentName: invocation.agentName,
    };
  }
}