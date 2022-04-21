import * as core from '@actions/core';
import * as github from '@actions/github';
import * as azdev from 'azure-devops-node-api';

type Task = {
  state: string;
  title: string;
  description: string;
  type: 'User Story' | 'Task' | 'Feature';
  task: number;
  rev: number;
}

const tasks = core.getInput('tasks').split(',');
const token = process.env.AZURE_PERSONAL_ACCESS_TOKEN;
const orgUrl = core.getInput('orgUrl') || 'https://dev.azure.com/equinor';

const authHandler = azdev.getPersonalAccessTokenHandler(token);
const connection = new azdev.WebApi(orgUrl, authHandler);
const workItemApi = connection.getWorkItemTrackingApi();

async function getTaskDescription(task: number): Promise<Task> {
  const conn = await workItemApi;
  const data = await conn.getWorkItem(task, [ 'System.Title', 'System.Description', 'System.State', 'System.WorkItemType' ]);
  const { fields } = data;
  const state = fields[ 'System.State' ];
  const title = fields[ 'System.Title' ];
  const description = fields[ 'System.Description' ];
  const type = fields[ 'System.WorkItemType' ];
  const rev = data.rev;
  return { state, title, description, type, task, rev };
}

async function parseTasks(): Promise<Array<Task>> {
  const promises = tasks
    .map(t => `${t}`.replace(/[^0-9.]/g, ''))
    .map(t => Number(t)).map(t => getTaskDescription(t));
  const all = await Promise.all(promises);
  return all.filter(t => t.type === 'User Story');
}

async function markAsComplete(tasks: Array<Task>): Promise<void> {
  const conn = await workItemApi;
  const ref = github.context.ref;
  const tag = ref?.replace('refs/tags/', '');
  const p = tasks
    .map(task => conn.updateWorkItem({}, [
      { path: '/rev', op: 'test', value: task.rev },
      { path: '/fields/System.State', from: task.state, value: `Closed`, op: 'replace' },
      { 'op': 'add', 'path': '/fields/System.Tags', 'value': `released;${tag}` }
    ], task.task));
  try {
    await Promise.all(p);
  } catch ( ex ) {
    core.error(`Failed to update status for workitems`);
    core.error(ex);
  }
}

function createReleaseNotes(data: Array<Task>) {
  return data
    .map(t => `* AB#${t.task} - ${t.title}`)
    .join('\\n');
}

async function run() {
  const data = await parseTasks();
  await markAsComplete(data);
  const notes = createReleaseNotes(data);
  core.setOutput('notes', notes);
}

( async () => await run() )();
