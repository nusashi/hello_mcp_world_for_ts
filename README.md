# 最小構成 MCP サーバー

Model Context Protocol（MCP）の最もシンプルな実装例です。たった1つのファイルで「Hello MCP World!」と返すだけの機能を提供します。MCPを理解するための最初の一歩としてぴったりです。

## 作者より

このプロジェクトのドキュメントとコードは、主にAIを活用して作成しています。そのため、内容の完全性は保証できません。
ご利用にあたっては、MITライセンスであることをご理解いただき、自己責任でお願いします。
また、基本的にローカル環境にTypeScriptでMCPを実装したい方向けの資料となっております。

## MCPとは？

Model Context Protocol（MCP）は、大規模言語モデル（LLM）アプリケーションにコンテキスト情報を提供するための標準化されたプロトコルです。このミニマル実装では、LLMからのツール呼び出しに応答する最も基本的な機能を示しています。

## プロジェクト構成

このプロジェクトは究極の最小構成で、わずか3つのファイルから成り立っています：

- `index.ts` - MCPサーバーの実装（44行のコード）
- `package.json` - 依存関係の定義
- `tsconfig.json` - TypeScript設定

## 事前準備

Node.js（v18以上）とnpmがインストールされている必要があります。

※ 動作環境はWindows11でのみ確認しています。

## インストールと実行

以下の方法でインストール・実行できます：

### 方法1: 直接実行する

```bash
# 依存関係のインストール
npm install

# TypeScriptのビルド
npm run build

# サーバーの起動
npm start
```

### 方法2: npx を使用する

#### グローバルにインストールせずに実行

```bash
# まずビルドが必要です
npm install
npm run build

# ビルド後のJavaScriptファイルを直接指定して実行
npx node ./dist/index.js
```

#### パッケージをリンクして実行

```bash
# 依存関係のインストールとビルド
npm install
npm run build

# パッケージをリンク
npm link

# 実行（どこからでも可能）
npx minimal-mcp-server
```

### Claude Desktop や cline での設定方法

`claude_desktop_config.json` ファイルに以下のように設定します：

```json
{
  "mcpServers": {
    "hello_world": {
      "command": "node", // 環境変数になければ絶対パスで指定した方がいい
      "args": [
        "絶対パス\\hello_world\\dist\\index.js"
      ]
    }
  }
}
```

npx使用例
```bash
# 事前に依存関係のインストールとビルド
npm install
npm run build
```

```json
{
  "mcpServers": {
    "hello_world": {
      "command": "npx",
      "args": [
        "-y",
        "絶対パス\\hello_world"
      ]
    }
  }
}
```

`cline_mcp_settings.json`ファイルに以下のように設定します：
(npxでやろうとしましたが、私は上手くいきませんでした...)

```json
{
  "mcpServers": {
    "hello_world": {
      "command": "node", // 環境変数になければ絶対パスで指定した方がいい
      "args": [
        "絶対パス\\hello_world\\dist\\index.js"
      ]
    }
  }
}
```

nodeの絶対パス指定の例：ご自身の環境に合わせてください。
`"C:\\Users\\{User名}\\AppData\\Local\\nvm\\v22.14.0\\node.exe"`

**注意**: パスを実際のプロジェクトディレクトリに置き換えてください。Windows では、バックスラッシュ (`\`) をエスケープするか、フォワードスラッシュ (`/`) を使用してください。

## コードの説明

`index.ts`ファイルの主要コンポーネント：

1. **ツール定義**：「hello_world」という名前の単一ツールを定義
2. **サーバーインスタンス**：`McpServer`クラスを使用してMCPサーバーを作成
3. **リクエストハンドラ**：ツール一覧と呼び出しに応答するハンドラを設定
4. **サーバー起動**：Stdioトランスポートを使用してサーバーを起動

## クライアントからの利用方法

クライアントはMCPプロトコルを使用して以下のように通信できます：

1. サーバーに接続
2. `tools/list`メソッドでツール一覧を取得
3. `tools/call`メソッドで「hello_world」ツールを呼び出し
4. 「Hello MCP World!」というレスポンスを受け取る

これが最小構成のMCPサーバーです。44行のコードだけで、LLMとの通信を可能にするサーバーを構築できました。MCPの魅力的な世界への最初の一歩を踏み出しましょう！

## SDK バージョンに関する注意点

このプロジェクトは `@modelcontextprotocol/sdk` バージョン 1.6.1 を使用しています。SDKのバージョンによって以下の点に注意が必要です：

1. **インポートパス**: 正しいインポートパスを使用することが重要です。例えば：
   ```typescript
   // 正しいインポートパス（拡張子を含む）
   import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
   import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
   ```

2. **capabilities設定**: MCPサーバーを初期化する際、`resources` と `tools` の両方を capabilities として指定する必要があります：
   ```typescript
   const server = new McpServer(
       {
           name: "minimal-mcp-server",
           version: "1.0.0",
       },
       {
           capabilities: {
               tools: {}, // ツール機能
               resources: {}, // リソース機能（必須）
           },
       }
   );
   ```

3. **Windows環境での注意点**: Windows環境では、package.json の scripts に Unix固有のコマンド（`chmod` など）を使用しないようにしてください。代わりに以下のように設定します：
   ```json
   "scripts": {
       "build": "tsc",
       "start": "node dist/index.js"
   }
   ```

4. **TypeScript設定**: `tsconfig.json` でモジュール解決を正しく設定することで、インポート問題を回避できます：
   ```json
   "compilerOptions": {
       "moduleResolution": "NodeNext",
       // その他の設定...
   }
   ```

## トラブルシューティング

### よくある問題と解決策

1. **インポートエラー**: `Cannot find module '@modelcontextprotocol/sdk/...'` のようなエラーが表示される場合：
   - 正しいインポートパスを使用しているか確認（拡張子 `.js` を含む）
   - `tsconfig.json` のモジュール設定を確認
   - 依存関係が正しくインストールされているか確認

2. **Connection errors**: サーバーに接続できない場合：
   - サーバーが実行中であることを確認
   - 正しいトランスポート設定を使用しているか確認
   - ファイアウォールや許可設定を確認

3. **型エラー**: TypeScriptのコンパイルエラーがある場合：
   - `skipLibCheck: true` をtsconfig.jsonに追加すると役立つことがあります
   - SDKとの互換性のためにTypeScriptバージョンを確認

## 次のステップ

この最小実装を理解したら、以下のように拡張してみましょう：

1. パラメータを受け取るツールの追加
2. 複数のツールの実装
3. リソース機能の追加
4. HTTPトランスポートの実装

より詳細な情報や実装例は、`docs` フォルダ内のドキュメントを参照してください。

## MCP関連リソース

- [Model Context Protocol公式ドキュメント](https://modelcontextprotocol.io)
- [MCPプロジェクト](https://github.com/modelcontextprotocol)
- [MCPリファレンス実装](https://github.com/modelcontextprotocol/typescript-sdk)

## 参考記事

- [Claude for Desktop（Windows版）でMCP（Filesystem）を使う！日本語で一番詳しい手順を解説](https://qiita.com/amatatsuk/items/4303f6bedd441c8a2588)

## 免責事項

このプロジェクトは、以下の外部ライブラリを利用しています。

*   **@modelcontextprotocol/sdk:** [https://github.com/modelcontextprotocol/typescript-sdk](https://github.com/modelcontextprotocol/typescript-sdk) (MIT License)
*   **@types/node:** (MIT License)
*   **typescript:** [https://github.com/microsoft/TypeScript](https://github.com/microsoft/TypeScript) (Apache License 2.0)

これらのライブラリは、それぞれ独自のライセンスに基づいて提供されています。各ライブラリの利用規約に従ってください。

このプロジェクトは、これらの外部ライブラリの動作を保証するものではありません。

---