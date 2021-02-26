import * as vscode from 'vscode';
import * as js2flowchart from "js2flowchart";

const flowcharts = {
	'JS Flowchart': 'null',
	'Code Meaning': 'null',
};

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('ShowJSFlowchart.start', () => {
			FlowchartPanel.createOrShow(context.extensionPath);
			FlowchartPanel2.createOrShow(context.extensionPath);

			vscode.window.onDidChangeTextEditorSelection(
				(caught: vscode.TextEditorSelectionChangeEvent) => {
					if (caught.textEditor === vscode.window.activeTextEditor) {
						if (FlowchartPanel.currentPanel) {
							FlowchartPanel.currentPanel._update();
						}
						if (FlowchartPanel2.currentPanel) {
							FlowchartPanel2.currentPanel._update();
						}
					}
				}
			);

		})
	);

	// if (vscode.window.registerWebviewPanelSerializer) {
	// 	// Make sure we register a serializer in activation event
	// 	vscode.window.registerWebviewPanelSerializer(FlowchartPanel.viewType, {
	// 		async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
	// 			console.log(`Got state: ${state}`);
	// 			FlowchartPanel.revive(webviewPanel, context.extensionPath);
	// 		}
	// 	});
	// }
}


class FlowchartPanel2 {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: FlowchartPanel2 | undefined;
	public static readonly viewType = 'Code Meaning';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (FlowchartPanel2.currentPanel) {
			FlowchartPanel2.currentPanel._panel.reveal(column);
			//FlowchartPanel2.currentPanel._panel.dispose();//dispose, then create.//TODO, how to update??

			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			FlowchartPanel2.viewType,
			'Code Meaning',
			vscode.ViewColumn.Beside,  //column || vscode.ViewColumn.Two, 
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				//localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
				//localResourceRoots: [vscode.Uri.parse("flowmaker://authority/flowmaker")]
			}
		);

		FlowchartPanel2.currentPanel = new FlowchartPanel2(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		FlowchartPanel2.currentPanel = new FlowchartPanel2(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		FlowchartPanel2.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public _update() {
		const webview = this._panel.webview;
		this._updateForFC(webview, 'Code Meaning');
		return;
	}

	private _updateForFC(webview: vscode.Webview, FCName: keyof typeof flowcharts) {
		this._panel.title = FCName;
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview() {
		// Use a nonce to whitelist which scripts can be run
		const astData = getNonce(true);

		return `
			<html lang="en">
			<body style="background-color:black;">
				<div>${astData}</div>
			</body>
            </html>`;
	}
}

/**
 * Manages cat coding webview panels
 */
class FlowchartPanel {
	/**
	 * Track the currently panel. Only allow a single panel to exist at a time.
	 */
	public static currentPanel: FlowchartPanel | undefined;
	public static readonly viewType = 'JS Flowchart';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionPath: string;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionPath: string) {
		const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;

		// If we already have a panel, show it.
		if (FlowchartPanel.currentPanel) {
			FlowchartPanel.currentPanel._panel.reveal(column);
			//FlowchartPanel.currentPanel._panel.dispose();//dispose, then create.//TODO, how to update??

			return;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			FlowchartPanel.viewType,
			'JS Flowchart',
			vscode.ViewColumn.Beside,  //column || vscode.ViewColumn.Two, 
			{
				// Enable javascript in the webview
				enableScripts: true,
				// And restrict the webview to only loading content from our extension's `media` directory.
				//localResourceRoots: [vscode.Uri.file(path.join(extensionPath, 'media'))]
				//localResourceRoots: [vscode.Uri.parse("flowmaker://authority/flowmaker")]
			}
		);

		FlowchartPanel.currentPanel = new FlowchartPanel(panel, extensionPath);
	}

	public static revive(panel: vscode.WebviewPanel, extensionPath: string) {
		FlowchartPanel.currentPanel = new FlowchartPanel(panel, extensionPath);
	}

	private constructor(panel: vscode.WebviewPanel, extensionPath: string) {
		this._panel = panel;
		this._extensionPath = extensionPath;

		// Set the webview's initial html content
		this._update();

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.command) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
				}
			},
			null,
			this._disposables
		);
	}

	public doRefactor() {
		// Send a message to the webview webview.
		// You can send any JSON serializable data.
		this._panel.webview.postMessage({ command: 'refactor' });
	}

	public dispose() {
		FlowchartPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	public _update() {
		const webview = this._panel.webview;
		this._updateForFC(webview, 'JS Flowchart');
		return;
	}

	private _updateForFC(webview: vscode.Webview, FCName: keyof typeof flowcharts) {
		this._panel.title = FCName;
		this._panel.webview.html = this._getHtmlForWebview();
	}

	private _getHtmlForWebview() {
		// Use a nonce to whitelist which scripts can be run
		const svg1 = getNonce();
		const SelectedText = getSelectedText();

		return `
			<html lang="en">
			<body style="background-color:white;">
				<div>${svg1}</div>
				<!--
				<h1 id="lines-of-code-counter">0</h1>
				<div>${SelectedText}</div>-->
			</body>
            </html>`;
	}
}

var text = '';
var svg1 = " ";
var ast = " ";
function getNonce(isReturnAst = false) {
	if (vscode.window.activeTextEditor === undefined) {
		//doesn't give text null if nothing activated.
		if (isReturnAst) return ast
		else return svg1;
	}
	else if (vscode.window.activeTextEditor != null) {
		let WindowP = vscode.window.activeTextEditor;
		// if (!(WindowP.document.languageId === "javascript")) {
		// var  svg1 = "Only .js file is supported";
		//   return "Only .js file is supported";
		// }
		//get selected range text
		let wordRange = new vscode.Range(WindowP.selection.start, WindowP.selection.end);
		text = WindowP.document.getText();

		//get whole text
		// text = WindowP.document.getText();
	}
	//	var svg1 = js2flowchart.convertCodeToSvg(text);
	if (isReturnAst) {
		ast = ""
		const { parse, find, walk, serialize, traverse, each, remove } = require('abstract-syntax-tree')
		let comments: any = []
		const tree = parse(text, {
			// loc: true,
			// ranges: true
			// The flag to allow module code
			module: true,

			//   // The flag to enable stage 3 support (ESNext)
			//   next: false;

			//   // The flag to enable start, end offsets and range: [start, end] to each node
			//   ranges: false;

			//   // Enable web compatibility
			//   webcompat: false;

			//   // The flag to enable line/column location information to each node
			loc: true,

			//   // The flag to attach raw property to each literal and identifier node
			//   raw: false;

			//   // Enabled directives
			//   directives: false;

			//   // The flag to allow return in the global scope
			//   globalReturn: false;

			//   // The flag to enable implied strict mode
			//   impliedStrict: false;

			//   // Allows comment extraction. Accepts either a function or array
			onComment: function (type, value, start, end, loc) {
				if (value.indexOf("*") > -1) {
					comments.push({ type, value, start, end, loc, isNotUsed: true })
				}
				return { type, value, start, end, loc }
			},

			//   // Allows token extraction. Accepts either a function or array
			//   onToken: []

			//   // Enable non-standard parenthesized expression node
			//   preserveParens: false;

			//   // Enable lexical binding and scope tracking
			lexical: true,

			//   // Adds a source attribute in every node’s loc object when the locations option is `true`
			//   source: false;

			//   // Distinguish Identifier from IdentifierPattern
			//   identifierPattern: false;

			//    // Enable React JSX parsing
			//   jsx: false

			//   // Allow edge cases that deviate from the spec
			//   specDeviation: false
		})
		parseTreeAst(tree, comments)
		return ast
	}
	const { createSVGRender, convertCodeToFlowTree } = js2flowchart;
	const flowTree = convertCodeToFlowTree(text);
	const svgRender = createSVGRender();
	//applying another theme for render
	svgRender.applyLightTheme();
	svg1 = svgRender.buildShapesTree(flowTree).print();

	return svg1;
}

function parseTreeAst(tree, comments) {
	const logs = (data) => {
		ast += data + "</br>"
		console.log(data)
	}
	const outPut = (data, tag = "") => {
		// if (tag.indexOf('--ReturnStatement') > 0) {
		//     tag = "ReturnStatement"
		// }
		switch (tag) {
			// case 'sourceType':
			//     logs("start")
			//     break;
			case 'classname':
				logs("new class with name :- <b><u>" + data + "</b></u>");
				break;
			case 'methodname':
				logs("&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; method :- <b><u>" + data + "</b></u>");
				break;
			case 'AssignmentLeft':
				logs("-----------------assign :- <b>" + data + "</b>")
				break;
			case 'ReturnStatement':
				if (data) {
					logs("return :- " + data)
				}
				break;

			case 'awaitcallee':
				logs("call fn  :- " + data)
				break;
			case 'callee':
				logs("call  :- " + data)
				break;
			case 'ifTest':
				logs("check condition  :- " + data)
				break;
			case 'ifConsequent':
				logs("then  :- " + data)
				break;
			case 'ifAlternate':
				logs("else   :- " + data)
				break;
			// case 'ifAlternate--ReturnStatementcallee':
			//     logs("else   :- " + data)
			//     break;
			case 'functionname':
				logs("</br></br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <u>declare function :- <b>" + data + "</b></u>")
				break;
			case 'comment':
				logs("<pre>" + data + "</pre>")
				break;

			// case 'MemberExpression':
			//     logs(data + " assigned with ")
			//     break;
			// case 'AssignmentExpression':
			//     logs(" operator " + data)
			//     break;

			default:

				console.log("***************************", tag, " :--- ", data)
				break;
		}
	}

	function parser(node, tag = "", post = "") {
		let cmt = ""
		let cmtIndex = comments.findIndex((c) => { return node && node.loc && c.loc && c.isNotUsed && (c.loc.start.line <= node.loc.start.line && c.loc.start.column < node.loc.start.column) })
		if (cmtIndex > -1) {
			cmt = comments[cmtIndex].value
			comments[cmtIndex].isNotUsed = false
			outPut(cmt, "comment")
		}
		if (node) {
			switch (node.type) {
				case "Program":
					outPut(node.sourceType, "sourceType")
					for (let body of node.body) {
						parser(body, tag)
					}
					break;
				case "ClassExpression":
					outPut(node.id.name, "classname");
					parser(node.body, tag);
					break;
				case "ClassBody":
					for (let body of node.body) {
						parser(body, tag)
					}
					break;
				case "MethodDefinition":
					outPut(node.key.name, "methodname");
					parser(node.value, tag);


				case "TryStatement":
					parser(node.block, "tryBlock")
					// TODO :- not handle catch block
					// parser(node.handler, "tryHandler")
					break;
				case "CatchClause":
					parser(node.param, "catchParam")
					parser(node.body, "catchBody")
					break;




				case 'LogicalExpression':
					if (node.left) parser(node.left, "ifTest")
					if (node.operator) outPut(node.operator, "operator")
					if (node.right) parser(node.alternate, "ifAlternate")
					break;

				case "IfStatement":
					if (node.test) parser(node.test, "ifTest")
					if (node.consequent) parser(node.consequent, "ifConsequent")
					if (node.alternate) parser(node.alternate, "ifAlternate")
					break;
				case "ExpressionStatement":
					parser(node.expression, tag || 'ExpressionStatement')
					break;
				case "AssignmentExpression":
					if (node.left) parser(node.left, tag || "AssignmentLeft")
					// outPut(node.operator, tag || "AssignmentExpression")
					if (node.right) parser(node.right, tag || 'AssignmentRight')
					if (node.body) {
						for (let body of node.body) {
							parser(body, tag)
						}
					}
					break;
				case "UnaryExpression":
					outPut(node.prefix, "prefix")
					outPut(node.operator, "UnaryExpression")
					parser(node.argument, "unaryArg")
					break;
				case "MemberExpression":
					// parser(node.object,tag)
					// parser(node.property,tag)
					let data = ""
					function getName(n, d = "") {
						if (n.object && n.object.name) {
							return d + n.object.name + "." + n.property.name;
						}
						else if (n.object && n.object.type == 'ThisExpression') {
							return d + "(current scope) this." + n.property.name;
						}
						else if (n.object && n.object.type == 'MemberExpression') {
							return getName(n.object, d) + "." + n.property.name;
						}
						else {
							return n.property.name;
						}
					}
					data = getName(node, data);
					// if (data && node.property && node.property.name) data += "."
					// if (node.property && node.property.name) data += node.property.name
					outPut(data, tag || "MemberExpression")
					break;
				case "ObjectExpression":
					for (let body of node.properties) {
						// parse(body.key, "functionName")
						// parser(body, (body.method?"fun":"")+(tag || "ObjectExpression"))
						parser(body, "ObjectExpression")
					}
					break;
				case "Property":
					if (node.key) parser(node.key, (node.method ? "function" : tag) + "name")
					if (node.value) parser(node.value, tag)
					break;
				case "FunctionExpression":
					for (let body of node.params) {
						parser(body, tag)
					}
					parser(node.body, 'funBody')
					break;
				case "BlockStatement":
					for (let body of node.body) {
						parser(body, tag)
					}
					break;
				case "VariableDeclaration":
					for (let body of node.declarations) {
						parser(body, tag)
					}
					break;
				case "VariableDeclarator":
					parser(node.id, "varId")
					parser(node.init, 'varInit')

					break;
				case "CallExpression":
					if (node.arguments && node.arguments.length) {
						parser(node.callee, 'callee')
						// parser(node.callee, tag + 'callee')
					}
					else {
						parser(node.callee, 'calleeNoArg')
					}
					for (let body of node.arguments) {
						// parser(body, tag + "arguments")
					}
					break;
				case "ReturnStatement":
					parser(node.argument, 'ReturnStatement')
					// parser(node.argument, tag + '--ReturnStatement')
					break;
				case "AwaitExpression":
					parser(node.argument, 'await')
					break;
				case "ArrayExpression":
					for (let body of node.elements) {
						parser(body, tag)
					}
					break;




				case "Identifier":
					outPut(node.name, tag || "identifier")
					break;
				case "Literal":
					outPut(node.value, tag || "Literal")
					break;

				default:
					console.log("**********************************", node)
					break;
			}
		}
		// else {
		//     console.trace(node)
		// }
	}
	parser(tree)
}

function getSelectedText() {
	let text = '';

	if (vscode.window.activeTextEditor != null) {
		let WindowP = vscode.window.activeTextEditor;
		// if (!(WindowP.document.languageId === "javascript")) {
		// var  svg1 = "Only .js file is supported";
		//   return "Only .js file is supported";
		// }

		//get selected range text
		let wordRange = new vscode.Range(WindowP.selection.start, WindowP.selection.end);
		text = WindowP.document.getText(wordRange);

		return text;
	}
}