const vscode = require('vscode');

function activate(context) {
  let badgeEnabled = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.enable.badges');
  let badge = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.badge');
  let colorEnabled = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.enable.color');

  let decClass = colorEnabled ? new OpenFileDecorationProvider(badgeEnabled, badge) : null;

  context.subscriptions.push(
    { dispose: () => decClass?.dispose() },
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (!event.affectsConfiguration('highlightOpenFiles')) return;

      colorEnabled = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.enable.color');
      badgeEnabled = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.enable.badges');
      badge = vscode.workspace.getConfiguration().get('highlightOpenFiles.decorations.badge');

      decClass?.dispose();
      decClass = colorEnabled ? new OpenFileDecorationProvider(badgeEnabled, badge) : null;
    }),
  );
}

class OpenFileDecorationProvider {
  constructor(badgeEnabled, badge) {
    this._badgeEnabled = badgeEnabled;
    this._badge = badge;
    this._emitter = new vscode.EventEmitter();
    this.onDidChangeFileDecorations = this._emitter.event;
    this._openPathsCache = null;

    this._disposables = [
      vscode.window.registerFileDecorationProvider(this),
      vscode.window.tabGroups.onDidChangeTabs(() => {
        this._openPathsCache = null;
        this._emitter.fire(undefined); // undefined = refresh all
      }),
    ];
  }

  _getOpenPaths() {
    if (!this._openPathsCache) {
      this._openPathsCache = new Set(
        vscode.window.tabGroups.all
          .flatMap((g) => g.tabs)
          .map((t) => t.input?.uri?.fsPath)
          .filter(Boolean),
      );
    }
    return this._openPathsCache;
  }

  provideFileDecoration(uri) {
    if (uri.scheme !== 'file') return;

    const openPaths = this._getOpenPaths();
    if (!openPaths.has(uri.fsPath)) return;

    return {
      color: new vscode.ThemeColor('highlightOpenFiles.openFiles'),
      badge: this._badgeEnabled ? this._badge : undefined,
      tooltip: 'File is open in editor',
    };
  }

  dispose() {
    this._disposables.forEach((d) => d.dispose());
    this._emitter.dispose();
  }
}

function deactivate() {}

module.exports = { activate, deactivate };
