export type TaskSourceOutput = {
  agentB: string;
  token: string;
  amount: string;
  task: string;
};

/** Tiny upstream skill: produces settlement input fields. */
export function taskSource(agentB: string, token: string): TaskSourceOutput {
  return {
    agentB,
    token,
    amount: "1000000000000000000",
    task: "labeling",
  };
}
