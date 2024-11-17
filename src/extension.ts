import * as vscode from 'vscode';
import { ESLint } from 'eslint';
import path from 'path';
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import dotenv from 'dotenv';

const prisma = new PrismaClient();

/**
 * Activates the extension.
 * @param context - The extension context.
 */
export function activate(context: vscode.ExtensionContext): void {
  console.warn('CodeGuard is now active!');

  // Create a diagnostic collection to store and show linting issues
  const diagnosticCollection = vscode.languages.createDiagnosticCollection('eslint');
  context.subscriptions.push(diagnosticCollection);

  // Register the lint command
  const lintCommand = vscode.commands.registerCommand('code-guard.lintCode', () => {
    lintActiveDocument(diagnosticCollection);
  });

  context.subscriptions.push(lintCommand);

  // Register the command to load project key from .env file
  const loadProjectKeyCommand = vscode.commands.registerCommand('code-guard.loadProjectKey', async () => {
    // Get the workspace root path
    const workspaceFolders = vscode.workspace.workspaceFolders;
    if (!workspaceFolders || workspaceFolders.length === 0) {
      vscode.window.showErrorMessage('No workspace folder found');
      return;
    }
    const workspaceRoot = workspaceFolders[0].uri.fsPath;

    // Load environment variables from .env file
    const envPath = path.join(workspaceRoot, '.env');
    dotenv.config({ path: envPath });

    const projectKey = process.env.PROJECT_KEY;
    if (projectKey) {
      console.log('Project Key:', projectKey);
      const project = await prisma.project.findFirst({
        where: {
          name: projectKey
        }
      });
      console.log(project);
      if (project) {
        await applyProjectSettings(project);
        vscode.window.showInformationMessage(`Project Key: ${projectKey}`);
      } else {
        vscode.window.showWarningMessage('Project not found');
      }
    } else {
      vscode.window.showWarningMessage('No project key found in .env file');
    }
  });

  context.subscriptions.push(loadProjectKeyCommand);

  // Run lint on save or open
  vscode.workspace.onDidSaveTextDocument(() => lintActiveDocument(diagnosticCollection));
  vscode.workspace.onDidOpenTextDocument(() => lintActiveDocument(diagnosticCollection));
}

/**
 * Applies project settings to ESLint configuration.
 * @param project - The project settings.
 */
async function applyProjectSettings(project: any): Promise<void> {
  const eslintConfig = [
    {
      files: ['*.ts', '*.js'],
      languageOptions: {
        ecmaVersion: 2021,
        sourceType: 'module'
      },
      rules: {
        'eqeqeq': project.eqeqeq ? 'error' : 'off',
        'indent': ['error', project.indent],
        'quotes': ['error', project.quotes],
        'semi': 'error',
        'no-console': project.noConsole ? 'error' : 'off',
        'no-unused-vars': project.noUnusedVars ? 'error' : 'off',
        'max-len': ['error', { code: project.maxLineLength }],
      }
    }
  ];

  // Get the workspace root path
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (workspaceFolders && workspaceFolders.length > 0) {
    const workspaceRoot = workspaceFolders[0].uri.fsPath;
    const eslintConfigPath = path.join(workspaceRoot, 'eslint.config.js');
    
    // Save the ESLint configuration to the project directory
    fs.writeFileSync(eslintConfigPath, `export default ${JSON.stringify(eslintConfig, null, 2)};`);
  } else {
    vscode.window.showErrorMessage('No workspace folder found');
  }
}

/**
 * Lints the active document and updates the diagnostic collection.
 * @param diagnosticCollection - The diagnostic collection to update.
 */
async function lintActiveDocument(diagnosticCollection: vscode.DiagnosticCollection): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  // Get the workspace root path
  const workspaceFolders = vscode.workspace.workspaceFolders;
  if (!workspaceFolders || workspaceFolders.length === 0) {
    vscode.window.showErrorMessage('No workspace folder found');
    return;
  }
  const workspaceRoot = workspaceFolders[0].uri.fsPath;
  const eslintConfigPath = path.join(workspaceRoot, 'eslint.config.js');

  const eslint = new ESLint({ overrideConfigFile: eslintConfigPath });

  const text = editor.document.getText();
  const uri = editor.document.uri;

  try {
    const results = await eslint.lintText(text);

    // Clear any existing diagnostics
    diagnosticCollection.clear();

    // Store new diagnostics
    const diagnostics: vscode.Diagnostic[] = [];

    results.forEach(result => {
      result.messages.forEach(message => {
        const severity = message.severity === 2 ? vscode.DiagnosticSeverity.Error : vscode.DiagnosticSeverity.Warning;

        // Create range for the error message
        const range = new vscode.Range(
          new vscode.Position(message.line - 1, message.column - 1),
          new vscode.Position(
            message.endLine ? message.endLine - 1 : message.line - 1,
            message.endColumn ? message.endColumn - 1 : message.column
          )
        );

        // Create a diagnostic with the message
        const diagnostic = new vscode.Diagnostic(range, message.message, severity);
        diagnostics.push(diagnostic);
      });
    });

    // Set diagnostics for the current document
    diagnosticCollection.set(uri, diagnostics);

  } catch (error) {
    console.error('Error while running ESLint:', error);
    if (error instanceof Error) {
      vscode.window.showErrorMessage('Error running ESLint: ' + error.message);
    } else {
      vscode.window.showErrorMessage('Error running ESLint');
    }
  }
}

/**
 * Deactivates the extension.
 */
export function deactivate(): void {
  prisma.$disconnect();
}