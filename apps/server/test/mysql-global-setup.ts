import { MySqlContainer, type StartedMySqlContainer } from '@testcontainers/mysql';
import type { TestProject } from 'vitest/node';

let container: StartedMySqlContainer | undefined;

declare module 'vitest' {
  export interface ProvidedContext {
    mysqlRootUrl: string;
  }
}

/** One MySQL for every integration test file; each file creates its own database inside it. */
export async function setup(project: TestProject): Promise<void> {
  container = await new MySqlContainer('mysql:8.4').withRootPassword('test').start();
  project.provide('mysqlRootUrl', `mysql://root:test@${container.getHost()}:${String(container.getPort())}`);
}

export async function teardown(): Promise<void> {
  await container?.stop();
}
