
import * as vscode from 'vscode';
import {modifyHtml} from "html-modifier";
import fs from "fs";
import path from "path";

export function activate(context: vscode.ExtensionContext) {
	let panel:any = null;
	let disposable = vscode.commands.registerCommand('bb.helloWorld', () => {

		panel = vscode.window.createWebviewPanel(
			"catCoding",
			"Cat Coding",
			vscode.ViewColumn.One,
			{
			  localResourceRoots: [
				vscode.Uri.joinPath(context.extensionUri, "dist"),
				vscode.Uri.joinPath(context.extensionUri, "build"),
			  ],
			  retainContextWhenHidden: false, // 保证 Webview 所在页面进入后台时不被释放
			  enableScripts: true, // 运行 JS 执行
			}
		  );
		  let html = fs.readFileSync(
			path.join(context.extensionPath, "dist", "index.html"),
			"utf-8"
		  );
		  html = html.replace(
			/(<link.+?href=|<script.+?src=|<img.+?src=)(.+?)(\s+|>)/g,
			(m, $1, $2, $3) => {
			  return (
				$1 +
				'"' +
				panel.webview
				  .asWebviewUri(
					vscode.Uri.joinPath(
					  context.extensionUri,
					  "dist",
					  $2.replace(/"/g, "")
					)
				  )
				  .toString() +
				'"' +
				$3
			  );
			}
		  );
		  panel.webview.html = html;
	  
		  panel.webview.onDidReceiveMessage(
			(message) => {
			  switch (message.command) {
				case "alert":
				  vscode.window.showErrorMessage(message.text);
				  return;
				  default:
				  vscode.window.showInformationMessage(message.text);
			  }
			},
			undefined,
			context.subscriptions
		  );
	});


	const sidebarViewDisposable = vscode.window.registerWebviewViewProvider(
		"sidebar-view",
		{
		  resolveWebviewView: async (webviewView) => {
			webviewView.webview.options = {
				enableScripts: true,
				localResourceRoots: [context.extensionUri]
			  }
			// 在这里设置自定义视图的 HTML 内容、事件处理等
			// 前端应用的打包结果所在的目录，形如：https://file%2B.vscode-resource.vscode-cdn.net/d%3A/AAAAA/self/vscode-webview-example/packages/extension/out/view-vue
			const webviewUri = webviewView.webview
			  .asWebviewUri(vscode.Uri.joinPath(context.extensionUri, "dist"))
			  .toString();
			// 需要在前端应用中插入的脚本，目的是：将上述 webviewUri 所指的目录告知前端应用，前端应用在定位资源时需要
			const injectInContent = `<script> window.__webview_public_path__ = "${webviewUri}"</script>`;
	
			// 读取 index.html 文件内容
			let htmlText = fs.readFileSync(
			  path.join(context.extensionPath, "dist", "index.html"),
			  "utf-8"
			);
			// 使用 html-modifier 库来处理读取的内容，主要的作用是：1、将 script、link 标签中的 src、href 的值，重新赋予正确的值，2、将上述 injectInContent 的内容插入读取的内容中
	
			const html = await modifyHtml(htmlText, {
			  onopentag(name, attribs) {
			    if (name === "script")
			      if(attribs.src){
			        attribs.src = path.join(webviewUri, attribs.src);
			      }
			    if (name === "link")
			      attribs.href = path.join(webviewUri, attribs.href);
			    return { name, attribs };
			  },
			  oncomment(data) {
			    let hasMark = data;
			    if (data) {
			      hasMark = data
			      .toString()
			      .toLowerCase()
			      .includes("__webview_public_path__");
			    }
			    return hasMark
			      ? { data: injectInContent, clearComment: true }
			      : { data };
			  },
			});
			webviewView.webview.html = html

			webviewView.webview.onDidReceiveMessage(
				(message) => {
				  switch (message.command) {
					case "alert":
					  vscode.window.showErrorMessage(message.text);
					  return;
					  default:
					  vscode.window.showInformationMessage(message.text);
				  }
				},
				undefined,
				context.subscriptions
			  );
		  },
		},
		{
		  webviewOptions: {
			retainContextWhenHidden: false,
		  },
		}
	  );

	  context.subscriptions.push(sidebarViewDisposable, disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
