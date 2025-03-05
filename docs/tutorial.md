# hello_world 段階的実装チュートリアル

このチュートリアルでは、MCPサーバーとクライアントを段階的に実装し、MCPの基本概念を実践的に学びます。

## 目次

1. [環境設定](#step1)
2. [基本的なMCPサーバーの作成](#step2)
3. [リソース管理の実装](#step3)
4. [ツール機能の追加](#step4)
5. [MCPクライアントの実装](#step5)
6. [HTTPサーバーの追加](#step6)
7. [総合演習](#step7)

<a id="step1"></a>
## ステップ1: 環境設定

### 目標
- プロジェクト環境の構築
- 必要なパッケージのインストール
- TypeScriptの設定

### 手順

#### 1.1 プロジェクトの初期化
```bash
mkdir hello_world
cd hello_world
npm init -y
```

#### 1.2 TypeScriptと必要パッケージのインストール
```bash
npm install typescript @types/node ts-node --save-dev
npm install @modelcontextprotocol/sdk zod cross-env
```

#### 1.3 TypeScript設定ファイルの作成
`tsconfig.json`ファイルを作成します：

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "outDir": "./dist",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": [
    "dist",
    "node_modules"
  ],
  "ts-node": {
    "esm": true,
    "experimentalSpecifierResolution": "node"
  }
}
```

#### 1.4 package.jsonの更新
`package.json`を編集してスクリプトを追加します：

```json
{
  "name": "hello_world",
  "version": "1.0.0",
  "description": "Hello World with Model Context Protocol using TypeScript",
  "main": "dist/index.js",
  "type": "module",
  "scripts": {
    "build": "tsc",
    "start:server": "cross-env MCP_LOG_LEVEL=1 node --loader ts-node/esm src/index.ts",
    "start:client": "cross-env MCP_LOG_LEVEL=1 node --loader ts-node/esm src/client/index.ts",
    "start:http": "cross-env MCP_LOG_LEVEL=1 node --loader ts-node/esm src/http-server.ts"
  }
}
```

#### 1.5 ディレクトリ構造の作成
```bash
mkdir -p src/client
```

### 解説

- **TypeScript**: 静的型付けにより、開発時のエラー検出と自動補完が可能になります
- **@modelcontextprotocol/sdk**: MCPの基本機能を提供するSDK
- **zod**: ランタイムでのデータバリデーションを行うライブラリ
- **cross-env**: 環境変数を異なるOS間で一貫して設定するためのツール

### 確認ポイント
- 全てのパッケージが正しくインストールされましたか？
- TypeScript設定は正しいですか？
- ディレクトリ構造は準備できましたか？

<a id="step2"></a>
## ステップ2: 基本的なMCPサーバーの作成

### 目標
- ロギング機能の実装
- スキーマ定義の作成
- 基本的なMCPサーバーの実装

### 手順

#### 2.1 ロガーの実装
`src/logger.ts`ファイルを作成します：

```typescript
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4
}

export class Logger {
  private name: string;
  private static level: LogLevel = 
    process.env.MCP_LOG_LEVEL ? 
    parseInt(process.env.MCP_LOG_LEVEL) : 
    LogLevel.DEBUG; // デフォルトでDEBUGレベルにする

  constructor(name: string) {
    this.name = name;
  }

  debug(...args: any[]): void {
    if (Logger.level <= LogLevel.DEBUG) {
      console.error(`[${this.name}] [DEBUG]`, ...args);
    }
  }

  info(...args: any[]): void {
    if (Logger.level <= LogLevel.INFO) {
      console.error(`[${this.name}] [INFO]`, ...args);
    }
  }

  warn(...args: any[]): void {
    if (Logger.level <= LogLevel.WARN) {
      console.error(`[${this.name}] [WARN]`, ...args);
    }
  }

  error(...args: any[]): void {
    if (Logger.level <= LogLevel.ERROR) {
      console.error(`[${this.name}] [ERROR]`, ...args);
    }
  }

  static setLevel(level: LogLevel): void {
    Logger.level = level;
  }
}
```

#### 2.2 スキーマ定義の作成
`src/schemas.ts`ファイルを作成します：

```typescript
import { z } from "zod";

// リソース読み込み結果のスキーマ
export const ResourceReadResultSchema = z.object({
  contents: z.array(z.object({
    uri: z.string(),
    mimeType: z.string(),
    text: z.string().optional(),
    binary: z.string().optional(),
  })),
});

// ツール呼び出し結果のスキーマ
export const ToolCallResultSchema = z.object({
  content: z.array(z.object({
    type: z.literal("text"),
    text: z.string(),
  })),
});

// 挨拶ツールの引数スキーマ
export const GreetArgsSchema = {
  name: z.string().optional(),
};

// Zodスキーマから型を生成
const GreetArgsSchemaObject = z.object(GreetArgsSchema);
export type GreetArgs = z.infer<typeof GreetArgsSchemaObject>;

// 計算ツールの引数スキーマ
export const CalculateArgsSchema = {
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number(),
};

// Zodスキーマから型を生成
const CalculateArgsSchemaObject = z.object(CalculateArgsSchema);
export type CalculateArgs = z.infer<typeof CalculateArgsSchemaObject>;

// リソース読み込み結果の型
export type ResourceReadResult = z.infer<typeof ResourceReadResultSchema>;

// ツール呼び出し結果の型
export type ToolCallResult = z.infer<typeof ToolCallResultSchema>;
```

#### 2.3 基本的なMCPサーバーの実装
`src/index.ts`ファイルを作成します：

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { GreetArgsSchema, CalculateArgsSchema, GreetArgs, CalculateArgs } from "./schemas.js";
import { Logger } from "./logger.js";

const logger = new Logger("SERVER");

// デバッグログを出力する関数
function debugLog(...args: any[]): void {
  logger.debug(...args);
}

// サーバーインスタンスを作成
debugLog("サーバーインスタンスを作成しています");
const server = new McpServer({
  name: "Hello MCP Server",
  version: "1.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  }
});

// シンプルなツールの定義
debugLog("ツールを登録しています");
server.tool("current-time", async () => {
  debugLog("current-time ツールが呼び出されました");
  const now = new Date();
  return {
    content: [{
      type: "text",
      text: `現在の時刻: ${now.toLocaleString('ja-JP')}`,
    }],
  };
});

// 標準入出力トランスポートを作成
debugLog("トランスポートを作成しています");
const transport = new StdioServerTransport();

async function startServer(): Promise<void> {
  try {
    // リソースとツールを登録した後でトランスポートに接続
    debugLog("サーバーをトランスポートに接続しています");
    await server.connect(transport);
    logger.info("Server running on stdio");
    logger.info("サーバーが起動し、リソースとツールが登録されました");
    
    logger.info("Ctrl+Cで終了します");
    
    // CLI実行時のために、標準エラー出力を強制フラッシュ
    logger.info("MCPサーバーが実行中です。このプロセスは通常、別のクライアントから呼び出されます。");
  } catch (error) {
    logger.error("サーバーの起動中にエラーが発生しました:", error);
    logger.error(error);
  }
}

// サーバーを起動
startServer();

// 終了ハンドラ
process.on("SIGINT", async () => {
  logger.info("サーバーをシャットダウンしています...");
  await server.close();
  process.exit(0);
});
```

### 解説

- **Logger**: 環境変数で制御可能なロギング機能を提供します
- **スキーマ定義**: Zodを使用してデータ構造を定義し、TypeScriptの型推論とランタイムバリデーションを実現
- **MCPサーバー**: SDKの`McpServer`クラスを使用してサーバーインスタンスを作成
- **StdioServerTransport**: 標準入出力を使用した通信方式

### 確認ポイント
- サーバーを起動できますか？
- ログメッセージが表示されますか？
- 環境変数`MCP_LOG_LEVEL`を変更するとログ出力が変わりますか？

<a id="step3"></a>
## ステップ3: リソース管理の実装

### 目標
- リソースマネージャークラスの作成
- リソースの登録と管理
- サーバーへのリソース統合

### 手順

#### 3.1 リソースマネージャーの実装
`src/resource-manager.ts`ファイルを作成します：

```typescript
import { Logger } from "./logger.js";

const logger = new Logger("RESOURCE-MANAGER");

// テキストリソースコンテンツの型
interface TextResourceContent {
  uri: string;
  text: string;
  mimeType?: string;
  [key: string]: unknown;
}

// バイナリリソースコンテンツの型
interface BinaryResourceContent {
  uri: string;
  blob: string; // base64エンコードされたバイナリデータ
  mimeType?: string;
  [key: string]: unknown;
}

// リソースコンテンツの型合体
export type ResourceContent = TextResourceContent | BinaryResourceContent;

// リソース結果の型
export interface ResourceResult {
  contents: ResourceContent[];
  _meta?: { [key: string]: unknown };
  [key: string]: unknown;
}

export type ResourceHandler = (uri: URL) => Promise<ResourceResult>;

export interface RegisteredResource {
  uri: string;
  handler: ResourceHandler;
  name?: string;
  language?: string;
}

// McpServer型（実際のSDKから適切な型をインポートするべきだが、ここでは簡単な定義）
export interface McpServer {
  resource: (name: string, uri: string, handler: ResourceHandler) => void;
}

export class ResourceManager {
  private server: McpServer;
  private registeredResources: Map<string, RegisteredResource>;

  /**
   * @param server MCPサーバーインスタンス
   */
  constructor(server: McpServer) {
    this.server = server;
    this.registeredResources = new Map();
  }

  /**
   * 固定URIのリソースを登録する
   * @param baseName リソースのベース名
   * @param uri リソースのURI
   * @param handler リソースハンドラ関数
   * @returns 登録されたリソースのID
   */
  registerResource(baseName: string, uri: string, handler: ResourceHandler): string {
    const resourceId = `${baseName}-${this.registeredResources.size}`;
    
    this.server.resource(resourceId, uri, async (reqUri: URL) => {
      logger.debug(`リソース "${resourceId}" が要求されました: ${reqUri.toString()}`);
      return await handler(reqUri);
    });
    
    this.registeredResources.set(resourceId, { uri, handler });
    logger.debug(`リソース "${resourceId}" を登録しました: ${uri}`);
    
    return resourceId;
  }

  /**
   * 挨拶リソースを登録する
   * @param name 挨拶する名前
   * @param language 言語 ('ja' または 'en')
   * @returns 登録されたリソースのID
   */
  registerGreeting(name: string, language = 'ja'): string {
    const encodedName = encodeURIComponent(name);
    const resourceId = `greeting-${language}-${name.replace(/[^a-zA-Z0-9]/g, '')}`;
    const uri = `greeting://${encodedName}`;
    
    this.server.resource(resourceId, uri, async (reqUri: URL) => {
      logger.debug(`挨拶リソースが要求されました: ${reqUri.toString()}`);
      
      const greeting = language === 'ja' 
        ? `こんにちは、${name}さん！` 
        : `Hello, ${name}!`;
        
      return {
        contents: [{
          uri: reqUri.toString(),
          mimeType: "text/plain",
          text: greeting,
        }],
        _meta: {}
      };
    });
    
    this.registeredResources.set(resourceId, { uri, handler: async () => ({ contents: [] }), name, language });
    logger.debug(`挨拶リソース "${resourceId}" を登録しました: ${uri}`);
    
    return resourceId;
  }

  /**
   * 登録されたすべてのリソースのURIとIDを取得する
   * @returns リソース情報の配列
   */
  getAllResources(): Array<{id: string, uri: string}> {
    const resources: Array<{id: string, uri: string}> = [];
    
    for (const [id, data] of this.registeredResources.entries()) {
      resources.push({
        id,
        uri: data.uri,
      });
    }
    
    return resources;
  }
}
```

#### 3.2 サーバーにリソースを追加
`src/index.ts`ファイルを更新して、リソースマネージャーを追加します：

```typescript
import { ResourceManager } from "./resource-manager.js";

// ... 既存のコード ...

// リソースマネージャーを作成
const resourceManager = new ResourceManager(server);

// 固定リソースを登録
debugLog("固定リソースを登録しています");

// 基本的な挨拶リソース
resourceManager.registerResource("hello_world", "hello://world", async (uri: URL) => {
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: "text/plain",
      text: "Hello, MCP World!",
    }],
    _meta: {}
  };
});

// 英語名の挨拶リソース
const englishNames: string[] = ["John", "Alice", "Bob"];
englishNames.forEach(name => {
  resourceManager.registerGreeting(name, "en");
});

// 日本語名の挨拶リソース
const japaneseNames: string[] = ["山田太郎", "佐藤花子"];
japaneseNames.forEach(name => {
  resourceManager.registerGreeting(name, "ja");
});

// ... サーバー起動コード ...

// startServer関数内に追加
// 登録されたリソース一覧を表示
const allResources = resourceManager.getAllResources();
logger.info(`登録されたリソース数: ${allResources.length}`);
```

### 解説

- **ResourceManager**: リソースの登録と管理を担当するクラス
- **registerResource**: 基本的なリソース登録メソッド
- **registerGreeting**: 特殊な挨拶リソース登録メソッド
- **getAllResources**: 登録されたリソースの一覧を取得

この実装では、MCPのURIテンプレート機能の代わりに、シンプルな独自実装を使用しています。

### 確認ポイント
- サーバーを起動し、リソースが正しく登録されていますか？
- リソース数が正しく表示されますか？
- 日本語名のリソースでURLエンコーディングが正しく行われていますか？

<a id="step4"></a>
## ステップ4: ツール機能の追加

### 目標
- 複数のツールの実装
- パラメータを受け取るツールの作成
- エラーハンドリングの追加

### 手順

#### 4.1 引数を受け取るツールの追加
`src/index.ts`ファイルに以下のツール定義を追加します：

```typescript
// 引数を受け取るツールの定義
server.tool(
  "greet",
  GreetArgsSchema,
  async ({ name = "ゲスト" }: GreetArgs) => {
    debugLog("greet ツールが呼び出されました, name:", name);
    return {
      content: [{
        type: "text",
        text: `こんにちは、${name}さん！MCPの世界へようこそ！`,
      }],
    };
  }
);

// 計算ツールの定義
server.tool(
  "calculate",
  CalculateArgsSchema,
  async ({ operation, a, b }: CalculateArgs) => {
    debugLog(`calculate ツールが呼び出されました: ${operation}(${a}, ${b})`);
    let result = 0; // 初期値を設定
    switch (operation) {
      case "add": result = a + b; break;
      case "subtract": result = a - b; break;
      case "multiply": result = a * b; break;
      case "divide":
        if (b === 0) throw new Error("0で除算できません");
        result = a / b;
        break;
    }
    return {
      content: [{
        type: "text",
        text: `計算結果: ${result}`,
      }],
    };
  }
);
```

### 解説

- **引数付きツール**: `GreetArgsSchema`と`CalculateArgsSchema`を使用して引数を定義
- **デフォルト値**: `name = "ゲスト"`のようにデフォルト値を設定
- **エラーハンドリング**: 0による除算など、エラーケースを適切に処理
- **型安全性**: TypeScriptとZodによる型チェックとバリデーション

### 確認ポイント
- ツールが正しく登録されていますか？
- 引数のバリデーションは機能していますか？
- エラーケース（0での除算など）は適切に処理されますか？

<a id="step5"></a>
## ステップ5: MCPクライアントの実装

### 目標
- MCPクライアントの基本実装
- サーバーへの接続と通信
- リソース読み込みとツール呼び出し

### 手順

#### 5.1 クライアントの実装
`src/client/index.ts`ファイルを作成します：

```typescript
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { ResourceReadResultSchema, ToolCallResultSchema, ResourceReadResult, ToolCallResult } from "../schemas.js";
import { z } from "zod";
import { Logger } from "../logger.js";

const logger = new Logger("CLIENT");

// デバッグログを出力する関数
function debugLog(...args: any[]): void {
  logger.debug(...args);
}

// サーバー情報の型
interface ServerInfo {
  name: string;
  version: string;
}

// リソース情報の型
interface ResourceInfo {
  name: string;
  uri: string;
}

// リソース一覧の型
interface ResourcesListResult {
  resources: ResourceInfo[];
}

async function runClient(): Promise<void> {
  try {
    // サーバープロセスを起動するためのトランスポートを作成
    debugLog("トランスポートを作成しています");
    const transport = new StdioClientTransport({
      command: "node",
      args: ["--loader", "ts-node/esm", "src/index.ts"],
      stderr: 'inherit'
    });

    // クライアントインスタンスを作成
    debugLog("クライアントインスタンスを作成しています");
    const client = new Client({
      name: "Hello MCP Client",
      version: "1.0.0",
    }, {
      capabilities: {
        resources: {},
        tools: {},
      }
    });

    console.log("サーバーに接続しています...");
    debugLog("サーバーに接続を開始します");
    await client.connect(transport);
    console.log("サーバーに接続しました");

    // サーバー情報を表示
    const serverInfo = client.getServerVersion() as ServerInfo | undefined;
    console.log(`サーバー: ${serverInfo?.name} v${serverInfo?.version}`);

    // 利用可能なリソースを一覧表示
    console.log("\n== 利用可能なリソース ==");
    const resources = await client.request(
      { method: "resources/list" },
      z.object({ resources: z.array(z.object({ name: z.string(), uri: z.string() })) })
    ) as ResourcesListResult;
    console.log(`利用可能なリソース数: ${resources.resources.length}`);
    
    // リソースの表示
    resources.resources.forEach(resource => {
      console.log(`- ${resource.name}: ${resource.uri}`);
    });

    console.log("\n== リソーステスト ==");

    // 基本的なリソース
    console.log("\n1. hello_world リソースを読み込みます");
    try {
      const result = await client.request(
        { method: "resources/read", params: { uri: "hello://world" } },
        ResourceReadResultSchema
      ) as ResourceReadResult;
      console.log("成功:", result.contents[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    // 英語名の挨拶リソース
    console.log("\n2. 英語名挨拶リソースを読み込みます");
    try {
      const result = await client.request(
        { method: "resources/read", params: { uri: "greeting://John" } },
        ResourceReadResultSchema
      ) as ResourceReadResult;
      console.log("成功:", result.contents[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    // 日本語名の挨拶リソース
    console.log("\n3. 日本語名挨拶リソースを読み込みます");
    try {
      const japaneseName = "山田太郎";
      const encodedName = encodeURIComponent(japaneseName);
      debugLog(`日本語名URI: greeting://${encodedName}`);
      const result = await client.request(
        { method: "resources/read", params: { uri: `greeting://${encodedName}` } },
        ResourceReadResultSchema
      ) as ResourceReadResult;
      console.log("成功:", result.contents[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    console.log("\n== ツールテスト ==");
    
    // current-time ツールを呼び出す
    console.log("\n1. current-time ツールを呼び出します");
    try {
      const result = await client.request(
        { method: "tools/call", params: { name: "current-time" } },
        ToolCallResultSchema
      ) as ToolCallResult;
      console.log("結果:", result.content[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    // greet ツールを呼び出す
    console.log("\n2. greet ツールを呼び出します");
    try {
      const result = await client.request(
        { method: "tools/call", params: { name: "greet", arguments: { name: "佐藤花子" } } },
        ToolCallResultSchema
      ) as ToolCallResult;
      console.log("結果:", result.content[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    // calculate ツールを呼び出す
    console.log("\n3. calculate ツールを呼び出します");
    try {
      const result = await client.request(
        { method: "tools/call", params: { name: "calculate", arguments: { 
          operation: "multiply", 
          a: 6, 
          b: 7 
        } } },
        ToolCallResultSchema
      ) as ToolCallResult;
      console.log("結果:", result.content[0].text);
    } catch (error) {
      console.error("エラー:", (error as Error).message);
    }

    // 接続を閉じる
    console.log("\nクライアントを終了しています...");
    await client.close();
    console.log("終了しました");

  } catch (error) {
    console.error("実行中にエラーが発生しました:", error);
  }
}

// クライアントを実行
runClient();
```

### 解説

- **StdioClientTransport**: 子プロセスとしてサーバーを起動し、標準入出力で通信
- **リソース読み込み**: `resources/read`メソッドを使用
- **ツール呼び出し**: `tools/call`メソッドを使用
- **型安全性**: リクエストとレスポンスの型チェック
- **エラーハンドリング**: try-catchを使用した例外処理

### 確認ポイント
- クライアントが正常に起動しますか？
- サーバーに接続できますか？
- リソースの読み込みとツールの呼び出しが成功しますか？
- 日本語のリソースは正しく処理されますか？

<a id="step6"></a>
## ステップ6: HTTPサーバーの追加

### 目標
- HTTP経由でMCP機能を提供
- JSON-RPCインターフェースの実装
- CORSサポートの追加

### 手順

#### 6.1 HTTPサーバーの実装
`src/http-server.ts`ファイルを作成します：

```typescript
#!/usr/bin/env node

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import http from 'http';
import { GreetArgsSchema, CalculateArgsSchema, GreetArgs, CalculateArgs } from "./schemas.js";
import { ResourceManager } from "./resource-manager.js";
import { Logger } from "./logger.js";

const logger = new Logger("HTTP-SERVER");

// サーバーインスタンスを作成
logger.info("サーバーインスタンスを作成しています");
const server = new McpServer({
  name: "Hello MCP HTTP Server",
  version: "1.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  }
});

// リソースマネージャーを作成して設定
const resourceManager = new ResourceManager(server);

// 基本的な挨拶リソース
resourceManager.registerResource("hello_world", "hello://world", async (uri: URL) => {
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: "text/plain",
      text: "Hello, MCP World!",
    }],
    _meta: {}
  };
});

// 英語名の挨拶リソース
const englishNames: string[] = ["John", "Alice", "Bob"];
englishNames.forEach(name => {
  resourceManager.registerGreeting(name, "en");
});

// 日本語名の挨拶リソース
const japaneseNames: string[] = ["山田太郎", "佐藤花子"];
japaneseNames.forEach(name => {
  resourceManager.registerGreeting(name, "ja");
});

// ツールの登録
server.tool("current-time", async () => {
  logger.debug("current-time ツールが呼び出されました");
  const now = new Date();
  return {
    content: [{
      type: "text",
      text: `現在の時刻: ${now.toLocaleString('ja-JP')}`,
    }],
  };
});

server.tool(
  "greet",
  GreetArgsSchema,
  async ({ name = "ゲスト" }: GreetArgs) => {
    logger.debug("greet ツールが呼び出されました, name:", name);
    return {
      content: [{
        type: "text",
        text: `こんにちは、${name}さん！MCPの世界へようこそ！`,
      }],
    };
  }
);

server.tool(
  "calculate",
  CalculateArgsSchema,
  async ({ operation, a, b }: CalculateArgs) => {
    logger.debug(`calculate ツールが呼び出されました: ${operation}(${a}, ${b})`);
    let result = 0;
    switch (operation) {
      case "add": result = a + b; break;
      case "subtract": result = a - b; break;
      case "multiply": result = a * b; break;
      case "divide":
        if (b === 0) throw new Error("0で除算できません");
        result = a / b;
        break;
    }
    return {
      content: [{
        type: "text",
        text: `計算結果: ${result}`,
      }],
    };
  }
);

// HTTPサーバーを作成する
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

// HTTPサーバーとMCPサーバーを接続する簡易実装
const httpServer = http.createServer(async (req, res) => {
  logger.info(`リクエスト受信: ${req.method} ${req.url}`);
  
  // CORSヘッダーを設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // OPTIONSリクエストに対するレスポンス
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }
  
  // POSTリクエストのみ受け付ける
  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ 
      jsonrpc: "2.0", 
      error: { code: -32600, message: "Method not allowed" }, 
      id: null 
    }));
    return;
  }
  
  // リクエストボディを読み込む
  let body = '';
  req.on('data', (chunk) => {
    body += chunk.toString();
  });
  
  req.on('end', async () => {
    try {
      // JSONリクエストをパース
      const jsonRequest = JSON.parse(body);
      logger.debug('リクエスト内容:', jsonRequest);
      
      // バージョン情報のリクエスト
      if (jsonRequest.method === 'version') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          result: {
            name: "Hello MCP HTTP Server",
            version: "1.0.0"
          },
          id: jsonRequest.id
        }));
        return;
      }
      
      // リソース一覧のリクエスト
      if (jsonRequest.method === 'resources/list') {
        const allResources = resourceManager.getAllResources();
        const resourcesList = {
          resources: allResources.map(r => ({ name: r.id, uri: r.uri }))
        };
        
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          result: resourcesList,
          id: jsonRequest.id
        }));
        return;
      }
      
      // ツール一覧のリクエスト
      if (jsonRequest.method === 'tools/list') {
        // この実装はシンプル化のため固定値を返します
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          jsonrpc: "2.0",
          result: {
            tools: [
              { name: "current-time", inputSchema: { type: "object" } },
              { name: "greet", inputSchema: { 
                  type: "object", 
                  properties: { name: { type: "string" } },
                  additionalProperties: false,
                  $schema: "http://json-schema.org/draft-07/schema#"
                } 
              },
              { name: "calculate", inputSchema: { 
                  type: "object", 
                  properties: { 
                    operation: { type: "string", enum: ["add", "subtract", "multiply", "divide"] },
                    a: { type: "number" },
                    b: { type: "number" }
                  },
                  required: ["operation", "a", "b"],
                  additionalProperties: false,
                  $schema: "http://json-schema.org/draft-07/schema#"
                } 
              }
            ]
          },
          id: jsonRequest.id
        }));
        return;
      }
      
      // 未対応のメソッド
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32601, message: "Method not found" },
        id: jsonRequest.id
      }));
      
    } catch (error) {
      logger.error('リクエスト処理中にエラーが発生しました:', error);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        jsonrpc: "2.0",
        error: { code: -32700, message: "Parse error" },
        id: null
      }));
    }
  });
});

async function startServer(): Promise<void> {
  try {
    httpServer.listen(PORT, () => {
      logger.info(`HTTP Server running on http://localhost:${PORT}`);
      logger.info("サーバーが起動し、リソースとツールが登録されました");
      
      // 登録されたリソース一覧を表示
      const allResources = resourceManager.getAllResources();
      logger.info(`登録されたリソース数: ${allResources.length}`);
      logger.info("Ctrl+Cで終了します");
    });
  } catch (error) {
    logger.error("サーバーの起動中にエラーが発生しました:", error);
  }
}

// サーバーを起動
startServer();

// 終了ハンドラ
process.on("SIGINT", async () => {
  logger.info("サーバーをシャットダウンしています...");
  httpServer.close();
  process.exit(0);
});
```

### 解説

- **HTTPサーバー**: Node.jsの標準HTTPモジュールを使用
- **JSON-RPC**: 2.0仕様に準拠したシンプルな実装
- **CORS**: クロスオリジンリクエストを許可するヘッダー設定
- **エラーハンドリング**: さまざまなエラーケースに対応
- **簡易実装**: 完全なMCP実装ではなく、基本的なメソッドのみをサポート

### 確認ポイント
- HTTPサーバーは正常に起動しますか？
- CURLやPostmanなどのツールでリクエストを送信できますか？
- JSON-RPCレスポンスは正しいフォーマットですか？
- CORSヘッダーは正しく設定されていますか？

<a id="step7"></a>
## ステップ7: 総合演習

### 目標
- 学んだ内容の復習と統合
- プロジェクトの拡張
- 独自機能の追加

### 演習課題

1. **新しいリソースタイプの追加**
   - JSONデータを返すリソースを作成
   - 画像URLを返すリソースを作成（実際の画像ではなくURLのみ）

2. **新しいツールの実装**
   - テキスト変換ツール（大文字/小文字、逆順など）
   - 天気情報ツール（固定データで良い）

3. **エラーハンドリングの強化**
   - より詳細なエラーメッセージ
   - エラーコードの適切な使用

4. **HTTPクライアントの実装**
   - HTTP APIを呼び出すシンプルなクライアント
   - ブラウザから呼び出せるHTMLページ

### ヒント

- `src/schemas.ts`に新しいスキーマを追加
- `ResourceManager`クラスを拡張して新しいリソースタイプをサポート
- ツールは`server.tool()`で簡単に追加できる
- エラーハンドリングには`try-catch`ブロックを使用
- HTTPクライアントにはfetchAPIやXMLHttpRequestが使用可能

### 解説

この演習では、独自のアイデアを取り入れてプロジェクトを拡張します。基本的な構造は変えずに、新しい機能を追加することで理解を深めましょう。

## まとめ

このチュートリアルでは、MCPの基本概念から始め、サーバーとクライアントの実装、リソース管理、ツール機能の追加、HTTPサーバーの実装まで、段階的にMCPアプリケーションを構築しました。

実際のコードと説明を通じて、MCPの重要な概念や実装パターンを学ぶことができました。

次のステップとして、以下を検討してください：
- より複雑なリソースとツールの実装
- セキュリティ機能の追加（認証、認可）
- パフォーマンスの最適化
- ユーザーインターフェースの作成

MCPを使用することで、大規模言語モデルにリッチなコンテキストを提供し、より高度なアプリケーションを構築できます。
