# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 代码库背景

这是 Claude Code（Anthropic 的 CLI 工具）的**源代码快照**，来源于 npm 包中公开暴露的 source map（2026年3月31日）。该代码库用于教育、防御性安全研究和软件供应链分析。

**关键约束：**
- 这是一个只读代码快照 —— 没有 `package.json`、`tsconfig.json` 或构建配置文件
- 无法直接构建、测试或运行此代码
- 原始代码版权归 Anthropic 所有；这是一个非官方的研究存档

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

- `src/main.tsx` — Commander.js CLI 解析器和 Ink 渲染器初始化
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

## 特性标志

通过 Bun 的 `bun:bundle` 实现死代码消除：

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