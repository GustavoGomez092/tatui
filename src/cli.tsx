#!/usr/bin/env node
import { render } from "ink";
import React from "react";
import { App } from "./components/App.js";
import { createTask } from "./db/tasks.js";
import { getAllProjects } from "./db/projects.js";
import { exportWeekSummary } from "./db/weeks.js";
import { getWeekId } from "./utils/week.js";

const args = process.argv.slice(2);
const command = args[0];

switch (command) {
  case "add": {
    const input = args.slice(1).join(" ");
    if (!input) {
      console.log("Usage: tatui add 'project::title::description::duration'");
      console.log("       tatui add --project work 'Fix bug'");
      process.exit(1);
    }

    // Check for --project flag
    const projectIdx = args.indexOf("--project");
    if (projectIdx !== -1 && args[projectIdx + 1]) {
      const projectName = args[projectIdx + 1];
      const title = args
        .slice(projectIdx + 2)
        .join(" ");
      if (!title) {
        console.log("Error: title is required after --project <name>");
        process.exit(1);
      }
      const task = createTask({ title, project: projectName, projectId: 0 });
      console.log(`Created: [${task.projectName}] ${task.title}`);
    } else {
      const task = createTask(input);
      console.log(`Created: [${task.projectName}] ${task.title}`);
    }
    break;
  }

  case "projects": {
    const projects = getAllProjects();
    if (projects.length === 0) {
      console.log("No projects yet. Create one with: tatui add 'project::task'");
    } else {
      for (const p of projects) {
        console.log(`  ${p.name} (${p.color})`);
      }
    }
    break;
  }

  case undefined:
  case "board": {
    // Enter alternate screen buffer (like vim/htop)
    process.stdout.write("\x1B[?1049h\x1B[2J\x1B[0;0H");
    // Restore on exit
    process.on("exit", () => {
      process.stdout.write("\x1B[?1049l");
    });
    render(<App />);
    break;
  }

  case "summary": {
    const targetWeek = args[1] ?? getWeekId();
    console.log(exportWeekSummary(targetWeek));
    break;
  }

  case "--help":
  case "-h":
  case "help": {
    console.log(`tatui - Weekly Terminal Kanban Board

Usage:
  tatui                    Open the Kanban board
  tatui add <shorthand>    Quick-add a task (project::title::desc::duration)
  tatui add --project <name> <title>  Add with explicit project
  tatui projects           List all projects
  tatui summary [week-id]  Show week summary (default: current week)
  tatui help               Show this help`);
    break;
  }

  default: {
    console.log(`Unknown command: ${command}. Run 'tatui help' for usage.`);
    process.exit(1);
  }
}
