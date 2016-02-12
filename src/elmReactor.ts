import * as vscode from 'vscode';
import * as cp from 'child_process';
import {isWindows} from './elmUtils';

let reactor: cp.ChildProcess;
let oc: vscode.OutputChannel = vscode.window.createOutputChannel('Elm Reactor');
let statusBarStopButton: vscode.StatusBarItem;

function startReactor(): void {
  try {
    stopReactor(/*notify*/ false);
    
    const config: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('elm');
    const host: string = <string>config.get('reactorHost');
    const port: string = <string>config.get('reactorPort');
    reactor = cp.spawn('elm', ['reactor', '-a=' + host, '-p=' + port], { cwd: vscode.workspace.rootPath,
                                                                         detached: !isWindows });
    reactor.stdout.on('data', (data: Buffer) => {
      if (data && data.toString().startsWith('| ') === false) {
        oc.append(data.toString());
      }
    });
    reactor.stderr.on('data', (data: Buffer) => {
      if (data) {
        oc.append(data.toString());
      }
    });
    oc.show(vscode.ViewColumn.Three);
    statusBarStopButton.show();
  } catch (e) {
    console.error('Starting Elm reactor failed', e);
    vscode.window.showErrorMessage('Starting Elm reactor failed');
  }
}

function stopReactor(notify: boolean): void {
  if (reactor) {
    if (isWindows) {
      cp.spawn('taskkill', ['/pid', reactor.pid.toString(), '/f', '/t' ])
    } else {
      process.kill(-reactor.pid, 'SIGKILL');
    }
    reactor = null;
    statusBarStopButton.hide();
    oc.dispose();
    oc.hide();
  } else {
    if (notify) {
      vscode.window.showInformationMessage('Elm Reactor not running');
    }  
  }
}

export function activateReactor(): vscode.Disposable[] {
  statusBarStopButton = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left);
  statusBarStopButton.text = '$(primitive-square)';
  statusBarStopButton.command = 'elm.reactorStop';
  statusBarStopButton.tooltip = 'Stop reactor';
  return [
    vscode.commands.registerCommand('elm.reactorStart', startReactor),
    vscode.commands.registerCommand('elm.reactorStop', () => stopReactor(/*notify*/ true))];
}

export function deactivateReactor(): void {
  stopReactor(/*notify*/ false);
}
