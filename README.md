# 住宿业普查管理系统

> 面向文化和旅游厅的住宿业普查全流程数字化平台 —— PC 端 + 移动端 + AI 智能填报。

[![Vue](https://img.shields.io/badge/Vue-3.5-42b883)](https://vuejs.org/) [![Vite](https://img.shields.io/badge/Vite-6-646cff)](https://vitejs.dev/) [![Element Plus](https://img.shields.io/badge/Element_Plus-2.9-409eff)](https://element-plus.org/)

---

## ✨ 功能概览

| 模块 | 能力 |
|------|------|
| 🏨 **住宿单位管理** | 增删改查 / 批量 Excel 导入 / AI 字段校验 / 区域权限隔离 |
| 📋 **普查任务** | 任务创建/发布/分配/填报/审核 全生命周期 |
| 📱 **移动端填报** | 分步表单 / 草稿持久化 / **离线提交队列** / 语音输入 / 左右滑动切步 |
| 📊 **数据统计** | 12 项 KPI / 多维分布图 / 4 维排行榜 / 地图钻取 / 开业趋势 |
| 🤖 **AI 智能辅助** | 语音填报 / 照片识别 / **本地+AI双层异常检测** / 自然语言查询 / 报告生成 |
| 👥 **角色权限** | 6 类角色（超管/省/市/县/普查员/审核员）4 级数据范围 |

## 🛠 技术栈

- **前端**：Vue 3 (Composition API) + Vite 6 + Element Plus + Pinia
- **数据**：IndexedDB (Dexie 4) —— 客户端完整存储，零后端
- **图表**：ECharts 5 + 自封装组件
- **AI**：兼容 OpenAI 协议，开箱即用对接 DeepSeek / 智谱 / OpenAI / OpenRouter；离线时本地 mock 引擎 + 规则引擎

## 🚀 快速开始

### 安装依赖

```bash
npm install
```

### 启动开发服务器

```bash
npm run dev
# → http://localhost:3000/
```

### 生产构建

```bash
npm run build           # 构建到 dist/
npm run preview         # 本地预览构建产物 (http://localhost:4173)
```

## 🔐 演示账号

首次启动会自动初始化 **20 个用户、202 条住宿单位、5 个普查任务** 的演示数据。

| 角色 | 用户名 | 密码 |
|------|--------|------|
| 超级管理员 | `admin` | `admin123` |
| 省级管理员 | `prov_admin` | `admin123` |
| 市级管理员（昆明）| `km_admin` | `admin123` |
| 县级管理员（五华）| `wh_admin` | `admin123` |
| 普查员（五华）| `enum01` | `admin123` |
| 审核员（昆明）| `rev01` | `admin123` |

> 更多账号见 [`src/db/seed.js`](src/db/seed.js)

## 📂 项目结构

```
src/
├── ai/                   # AI 服务：客户端 / mock 引擎 / 规则引擎 / 提示词
│   ├── client.js         # 统一聊天接口（超时/重试/降级/埋点）
│   ├── anomalyRules.js   # 本地异常检测规则
│   ├── metrics.js        # 调用统计
│   └── services/         # 4 类业务场景服务
├── components/           # 公共组件
│   ├── accommodation/    # 5 个分块表单
│   ├── ai/               # 15 个 AI UI 组件
│   ├── charts/           # 6 个图表组件
│   ├── layout/           # PC 端布局
│   └── mobile/           # 移动端布局
├── composables/          # 组合式函数
│   └── useOfflineQueue.js  # 离线提交队列
├── db/                   # IndexedDB schema + 种子数据
├── router/               # 路由 + 守卫
├── stores/               # Pinia stores
├── styles/               # 全局样式
├── utils/                # 工具：权限/数据范围/校验/格式化/Excel
└── views/                # 页面
    ├── accommodation/    # 住宿单位
    ├── census/           # 普查任务
    ├── statistics/       # 数据统计
    ├── system/           # 系统管理
    ├── login/            # 登录
    └── mobile/           # 移动端（9 页）
```

## 🤖 AI 配置

进入 **系统管理 → AI 设置**：

1. **模拟模式**（默认）：开箱即用，所有 AI 功能由本地引擎驱动，不消耗任何 API
2. **真实模式**：填入 API Key 后切换，支持 DeepSeek / 智谱 / OpenAI / OpenRouter 一键预设
3. **降级保护**：真实模式调用失败自动降级到 mock，并通知用户
4. **调用统计** Tab：实时查看每个场景的调用次数、平均时延、成功率

### 默认 AI 能力

- ✅ 语音填报（基于浏览器 Web Speech API + AI 解析）
- ✅ 照片识别（兼容 OpenAI vision 格式）
- ✅ 表单智能补全
- ✅ **10 条本地数据校验规则**（床位/客房比、入住率范围、RevPAR 一致性等）
- ✅ 自然语言查询数据
- ✅ AI 报告生成

## 📦 部署

详见 [`DEPLOY.md`](./DEPLOY.md)，覆盖：

- 静态托管（Vercel / Netlify / GitHub Pages）
- Nginx 子路径部署
- Docker 容器化
- 反向代理 AI API（推荐生产环境使用）

## 🧩 角色权限矩阵

| 角色 | 住宿单位 | 普查任务 | 数据统计 | 系统管理 |
|------|---------|---------|---------|---------|
| 超级管理员 | 全部 | 全部 | 全部 + 导出 | 用户/角色/AI |
| 省级管理员 | 全部 | 全部 | 全部 + 导出 | 用户/AI |
| 市级管理员 | 本市 CRUD | 查看 + 填报 | 查看 | 用户查看 |
| 县级管理员 | 本县 CRUD | 查看 + 填报 | 查看 | — |
| 普查员 | 本县查看 | 填报 | 查看 | — |
| 审核员 | 查看 | 审核 | 查看 | — |

> 数据范围由 `src/utils/dataScope.js` 统一控制

## 🧪 验证已修复 Bug

执行 `npm run build` 应输出 `✓ built in xx s`，无 ts/编译错误。
本仓库已通过：
- ✅ 路由 / 权限守卫体检
- ✅ IndexedDB schema 一致性
- ✅ 8 个已知 Bug 修复
- ✅ 移动端离线队列
- ✅ AI 客户端可靠性加固

## 📝 License

MIT
