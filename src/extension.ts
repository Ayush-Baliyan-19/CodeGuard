import * as vscode from 'vscode';
import { ESLint } from "eslint";

export function activate(context: vscode.ExtensionContext) {
    console.log('CodeGuard is now active!');

    // Create a diagnostic collection to store and show linting issues
    const diagnosticCollection = vscode.languages.createDiagnosticCollection('eslint');
    context.subscriptions.push(diagnosticCollection);

    // Register the lint command
    let lintCommand = vscode.commands.registerCommand('code-guard.lintCode', () => {
        lintActiveDocument(diagnosticCollection);
    });

    context.subscriptions.push(lintCommand);

    // Run lint on save or open
    vscode.workspace.onDidSaveTextDocument(() => lintActiveDocument(diagnosticCollection));
    vscode.workspace.onDidOpenTextDocument(() => lintActiveDocument(diagnosticCollection));
}

async function lintActiveDocument(diagnosticCollection: vscode.DiagnosticCollection) {
    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}

    const eslint = new ESLint();
    const text = editor.document.getText();
    const uri = editor.document.uri;

    try {
        const results = await eslint.lintText(text);

        // Clear any existing diagnostics
        diagnosticCollection.clear();

        // Store new diagnostics
        let diagnostics: vscode.Diagnostic[] = [];

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
        console.error("Error while running ESLint:", error);
    }
}

export function deactivate() {}