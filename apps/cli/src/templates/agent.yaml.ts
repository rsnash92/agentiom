/**
 * Agent YAML Template
 */

export function getAgentYaml(name: string): string {
  return `name: ${name}
description: My Agentiom agent

resources:
  cpu: shared
  memory: 256mb
  storage: 1gb

region: iad

env:
  LOG_LEVEL: INFO
`;
}
