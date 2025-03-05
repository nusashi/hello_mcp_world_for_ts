# hello_world プロジェクト構造と設計

## プロジェクト構造

```
src/
├── client/
│   └── index.ts    // MCPクライアント実装
├── index.ts        // MCPサーバー (stdio通信)
├── http-server.ts  // HTTP APIサーバー
├── logger.ts       // ロギング機能
├── resource-manager.ts // リソース管理
└── schemas.ts      // スキーマ定義
```

## 主要コンポーネント

### 1. MCPサーバー (`index.ts`)

MCPサーバーは、クライアントからの接続を受け付け、リソースやツールを提供します。

```typescript
// サーバーインスタンスを作成
const server = new McpServer({
  name: "Hello MCP Server",
  version: "1.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  }
});
```

主な機能：
- サーバーの初期化と設定
- リソースの登録
- ツールの登録
- クライアントからのリクエスト処理

### 2. リソース管理 (`resource-manager.ts`)

リソース管理クラスは、MCPリソースの登録と提供を担当します。

```typescript
// リソースマネージャーの使用例
resourceManager.registerResource("hello_world", "hello://world", async (uri) => {
  return {
    contents: [{
      uri: uri.toString(),
      mimeType: "text/plain",
      text: "Hello, MCP World!",
    }],
  };
});
```

主な機能：
- 静的リソースの登録
- 動的リソース（パラメータ付きURI）の処理
- リソース一覧の管理

### 3. スキーマ定義 (`schemas.ts`)

Zodを使用して、データ構造とバリデーションルールを定義します。

```typescript
// リソース読み込み結果のスキーマ
export const ResourceReadResultSchema = z.object({
  contents: z.array(z.object({
    uri: z.string(),
    mimeType: z.string(),
    text: z.string().optional(),
    binary: z.string().optional(),
  })),
});
```

主な機能：
- データ型定義
- ランタイムバリデーション
- TypeScriptの型推論サポート

### 4. MCPクライアント (`client/index.ts`)

MCPクライアントは、サーバーに接続してリソースの読み込みやツールの呼び出しを行います。

```typescript
// クライアントインスタンスを作成
const client = new Client({
  name: "Hello MCP Client",
  version: "1.0.0",
}, {
  capabilities: {
    resources: {},
    tools: {},
  }
});
```

主な機能：
- サーバーへの接続
- リソース読み込みリクエスト
- ツール呼び出しリクエスト
- レスポンス処理

### 5. HTTPサーバー (`http-server.ts`)

HTTP経由でMCP機能を提供するサーバーです。

```typescript
// HTTPサーバーとMCPサーバーを接続
const httpServer = http.createServer(async (req, res) => {
  // リクエスト処理...
});
```

主な機能：
- HTTP経由のJSON-RPC実装
- MCPリソースとツールへのHTTPアクセス
- CORSサポート

### 6. ロギング (`logger.ts`)

環境変数で制御可能なロギング機能を提供します。

```typescript
// ロガーの使用例
const logger = new Logger("SERVER");
logger.info("サーバーが起動しました");
```

主な機能：
- 異なるログレベルのサポート
- 環境変数による設定
- コンポーネント識別子の付加

## データフロー

1. クライアントがサーバーに接続
2. サーバーとクライアントが機能交換（capabilities）
3. クライアントがリソース一覧を要求
4. クライアントが特定のリソースを読み込み
5. クライアントがツールを呼び出し
6. サーバーが結果を返す
7. 必要に応じて2-6を繰り返す

## 実装の特徴

### 1. リソース管理の抽象化

MCPのURIテンプレート機能が完全には実装されていない場合があるため、`ResourceManager`クラスを使用して抽象化レイヤーを提供しています。これにより：

- 静的URIと動的URIの両方をサポート
- 日本語などの非ASCII文字を含むパラメータを適切に処理
- URIテンプレートを使用せずに同様の機能を実現

```typescript
// 日本語名の挨拶リソース
const japaneseNames: string[] = ["山田太郎", "佐藤花子"];
japaneseNames.forEach(name => {
  resourceManager.registerGreeting(name, "ja");
});
```

### 2. Zodを使用した型安全性

Zodを使用することで、TypeScriptの静的型チェックとランタイムでのバリデーションの両方を実現しています：

```typescript
// スキーマ定義
export const CalculateArgsSchema = {
  operation: z.enum(["add", "subtract", "multiply", "divide"]),
  a: z.number(),
  b: z.number(),
};

// 型の導出
const CalculateArgsSchemaObject = z.object(CalculateArgsSchema);
export type CalculateArgs = z.infer<typeof CalculateArgsSchemaObject>;
```

### 3. 環境変数による設定

ロガーのレベルなど、動作を環境変数で制御できるようにしています：

```typescript
private static level: LogLevel = 
  process.env.MCP_LOG_LEVEL ? 
  parseInt(process.env.MCP_LOG_LEVEL) : 
  LogLevel.DEBUG; // デフォルトでDEBUGレベルにする
```

### 4. 複数のトランスポート

StdioとHTTPの2つのトランスポート方式をサポートし、異なる使用シナリオに対応しています：

- Stdio: コマンドラインツールなどで
- HTTP: Webアプリケーションなどで

## 設計上の決定

### 1. 最小限の実装

このプロジェクトは教育用であり、MCPの基本概念を示すことを目的としています。そのため、以下の機能は簡略化または省略されています：

- 認証・認可
- 複雑なエラーハンドリング
- パフォーマンス最適化
- 完全なHTTP実装

### 2. 日本語サポート

国際化対応の例として、日本語名のリソースやメッセージをサポートしています：

```typescript
// 日本語名の挨拶リソース
const japaneseNames: string[] = ["山田太郎", "佐藤花子"];

// 日本語出力の例
return {
  content: [{
    type: "text",
    text: `こんにちは、${name}さん！MCPの世界へようこそ！`,
  }],
};
```

### 3. エラーハンドリング

基本的なエラーハンドリングを実装しています。例えば、計算ツールでの0による除算のチェック：

```typescript
case "divide":
  if (b === 0) throw new Error("0で除算できません");
  result = a / b;
  break;
```

## 拡張ポイント

このプロジェクトは基本実装ですが、以下のような拡張が可能です：

1. **リソースタイプの追加**
   - JSONデータリソース
   - バイナリデータリソース
   - 構造化データリソース

2. **ツールの追加**
   - 外部APIとの連携
   - データベースクエリ
   - ファイル操作

3. **認証・認可の追加**
   - トークンベースの認証
   - ロールベースのアクセス制御

4. **WebSocketトランスポート**
   - リアルタイム通信のサポート
   - 双方向通信

5. **Webインターフェース**
   - HTTP APIを使用したWebクライアント
   - リソースとツールのビジュアル表示

## まとめ

`hello_world`プロジェクトは、MCPの基本概念と実装方法を学ぶための教育用サンプルです。リソース、ツール、トランスポートなどの主要コンポーネントを示し、実際のMCPアプリケーション開発の基礎となる知識を提供します。
