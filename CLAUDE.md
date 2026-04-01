# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 沟通语言

**所有交流必须使用中文。** 代码注释、文档说明、技术讨论等均应使用中文撰写。代码本身（变量名、函数名、类型定义等）保持英文。

## 代码库背景

这是 Claude Code（Anthropic 的 CLI 工具）的**源代码快照**，来源于 npm 包中公开暴露的 source map（2026年3月31日）。该代码库用于教育、防御性安全研究和软件供应链分析。

**关键约束：**
- 原始代码版权归 Anthropic 所有；这是一个非官方的研究存档
- `stubs/` 目录包含 Anthropic 内部包的占位实现，用于编译依赖解析
- `src/shims/` 目录包含 `bun:bundle` 和 `bun:ffi` 的 polyfill 实现

## 构建命令

```bash
# 安装依赖
bun install

# 构建
bun run build.ts

# 运行
bun dist/cli.js
```

构建使用自定义 Bun 插件（`build.ts`）处理：
- `bun:bundle` → `src/shims/bunBundle.ts`（feature flag polyfill，所有 feature 返回 false）
- `bun:ffi` → `src/shims/bunFfi.ts`（FFI polyfill）
- `src/*` 路径别名解析
- 缺失模块自动替换为空 stub

## 技术栈

| 类别 | 技术 |
|---|---|
| 运行时 | Bun |
| 语言 | TypeScript (strict) |
| 终端 UI | React + Ink |
| CLI 解析 | Commander.js (extra-typings) |
| Schema 验证 | Zod v4 |
| 代码搜索 | ripgrep |
| 协议 | MCP SDK, LSP |
| API | Anthropic SDK |
| 特性开关 | `bun:bundle` feature flags + GrowthBook |

## 核心架构

### 入口点

- `src/entrypoints/cli.tsx` — CLI 主入口
- `src/entrypoints/sdk/` — Agent SDK 类型定义
- `src/screens/REPL.tsx` — 主交互式 REPL 界面
- `src/screens/Doctor.tsx` — 环境诊断界面

### 查询引擎 (`src/QueryEngine.ts`)

核心 LLM API 调用引擎（约 46K 行）。负责：
- 流式响应和工具调用循环
- Thinking/extended thinking 模式
- 重试逻辑和错误分类
- Token 计数和成本追踪

### 工具系统 (`src/tools/`, `src/tools.ts`, `src/Tool.ts`)

每个 agent 能力都是一个独立的工具模块。主要工具：
- `BashTool` — Shell 命令执行
- `FileReadTool/FileWriteTool/FileEditTool` — 文件操作
- `GlobTool/GrepTool` — 代码搜索（基于 ripgrep）
- `WebFetchTool/WebSearchTool` — 网络访问
- `AgentTool` — 子 agent 派生（swarm 编排）
- `SkillTool` — 可复用工作流执行
- `MCPTool` — MCP 服务器工具调用
- `AskUserQuestionTool` — 用户交互提示
- `EnterPlanModeTool/ExitPlanModeTool` — 规划模式切换
- `EnterWorktreeTool/ExitWorktreeTool` — Git worktree 隔离
- `TaskCreateTool/TaskUpdateTool/TaskListTool` — 任务管理

### 命令系统 (`src/commands/`, `src/commands.ts`)

以 `/` 为前缀的斜杠命令（约 50 个命令）。`commands.ts` 中的注册使用条件导入来加载不同环境的命令集。

### 服务层 (`src/services/`)

- `api/` — Anthropic API 客户端、文件 API、bootstrap
- `mcp/` — Model Context Protocol 服务器连接管理
- `oauth/` — OAuth 2.0 认证流程
- `lsp/` — Language Server Protocol 管理器
- `analytics/` — GrowthBook 特性开关和分析
- `compact/` — 会话上下文压缩
- `plugins/` — 插件加载器

### 桥接系统 (`src/bridge/`)

IDE 扩展（VS Code、JetBrains）的双向通信层：
- `replBridge.ts` — REPL 会话桥接
- `bridgeMessaging.ts` — 消息协议
- `jwtUtils.ts` — JWT 认证
- `sessionRunner.ts` — 会话执行

### 状态管理 (`src/state/`)

- `AppStateStore.ts` — 中央状态存储
- `store.ts` — 状态选择器和变更

### 权限系统

每次工具调用都通过 `src/hooks/toolPermission/` 进行权限检查。模式包括：`default`、`plan`、`bypassPermissions`、`auto`。

## Stub 模块 (`stubs/`)

Anthropic 内部包的占位实现，用于编译时依赖解析：
- `@ant/claude-for-chrome-mcp` — Chrome MCP 集成
- `@ant/computer-use-*` — Computer Use 相关模块
- `@anthropic-ai/foundry-sdk` — Foundry SDK
- `@anthropic-ai/mcpb` — MCPB 协议
- `@anthropic-ai/sandbox-runtime` — Sandbox 运行时
- `*-napi` — Native API 模块（音频、图像处理、颜色差异等）

## Shim 模块 (`src/shims/`)

- `bunBundle.ts` — `bun:bundle` polyfill，所有 feature flags 返回 false
- `bunFfi.ts` — `bun:ffi` polyfill

## 特性标志

通过 Bun 的 `bun:bundle` 实现死代码消除（在 shim 中所有返回 false）：

```typescript
import { feature } from 'bun:bundle'

const voiceCommand = feature('VOICE_MODE')
  ? require('./commands/voice/index.js').default
  : null
```

重要标志：`PROACTIVE`、`KAIROS`、`BRIDGE_MODE`、`DAEMON`、`VOICE_MODE`、`AGENT_TRIGGERS`、`MONITOR_TOOL`、`COORDINATOR_MODE`

## 关键模式

### 并行预取（启动优化）

```typescript
// 在重型模块评估之前作为副作用触发
startMdmRawRead()
startKeychainPrefetch()
```

### 懒加载

重型模块（OpenTelemetry、gRPC、analytics）通过动态 `import()` 延迟加载。

### Agent Swarms

通过 `AgentTool` 派生子 agent，`src/coordinator/coordinatorMode.ts` 处理多 agent 编排。

### Skills (`src/skills/`)

通过 `SkillTool` 执行的可复用工作流。捆绑技能在 `bundledSkills.ts`，动态技能从 `loadSkillsDir.ts` 加载。

## 大文件注意事项

大型文件需要针对性读取（使用 offset/limit）：
- `QueryEngine.ts`（约 46K 行）
- `Tool.ts`（约 29K 行）
- `commands.ts`（约 25K 行）

## 环境特定代码

部分代码路径通过 `process.env.USER_TYPE === 'ant'` 控制（Anthropic 内部构建）。这些工具/命令在公开版本中为 null。

## Windows 环境

Git 在 Windows 下会自动转换 LF 到 CRLF，产生 `LF will be replaced by CRLF` 警告，这是预期行为。