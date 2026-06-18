# 律所案件材料管理系统

一个面向律师事务所内部使用的前端原型项目，用于展示案件列表、查看案件详情、管理案件材料树，并支持将材料清单导出为 Excel 或 PDF。

## 项目概览

当前仓库的主体代码位于 `frontend/`，是一个基于 Vue 3 + TypeScript + Vite 的单页前端项目。现有实现已经覆盖首页、案件列表页、案件详情页、材料树组件、导出工具和 Mock 数据结构，适合作为后续接入真实接口和权限体系的前端基础。

需要注意的是，`frontend/index.html` 当前引用了 `src/main.ts`，但仓库中暂未提供对应入口文件，也没有看到路由初始化文件。因此，项目结构和页面模块已经较完整，但要直接启动并完整运行，仍需补齐应用入口和路由注册代码。

## 如何运行

### 运行环境

- Node.js `^18.0.0` 或 `>=20.0.0`
- npm `>=10.0.0`

### 安装依赖

```bash
cd frontend
npm install
```

### 启动开发环境

```bash
npm run dev
```

启动后可在浏览器访问 Vite 输出的本地地址，默认通常为 [http://localhost:5173](http://localhost:5173)。

### 生产构建

```bash
npm run build
```

### 本地预览构建结果

```bash
npm run preview
```

### 类型检查和代码规范检查

```bash
npm run check
npm run lint
```

## 当前状态说明

从现有代码结构看，页面、组件和业务工具函数已经实现了主要原型能力，但仓库还缺少以下关键启动条件：

- `frontend/src/main.ts` 入口文件缺失
- Vue Router 的集中式注册文件缺失
- 页面数据仍然来自 `frontend/src/mock/data.ts`，尚未接入真实后端

这意味着 README 中的模块说明基于“已有源码能力”整理，而不是将整个项目表述为已经可直接联调上线的完整系统。

## 技术栈

| 类别 | 技术 |
| --- | --- |
| 前端框架 | Vue 3 |
| 开发语言 | TypeScript |
| 构建工具 | Vite 5 |
| 路由依赖 | Vue Router 4 |
| 样式方案 | Tailwind CSS 3 |
| 图标库 | lucide-vue-next |
| Excel 导出 | xlsx |
| PDF 导出 | jspdf、jspdf-autotable |
| 代码检查 | ESLint |
| 类型检查 | vue-tsc |
| 工具库 | clsx、tailwind-merge |

此外，`frontend/vite.config.ts` 还配置了：

- `@` 指向 `frontend/src` 的路径别名
- 可选的 `unplugin-vue-dev-locator`
- 可选的 `vite-plugin-trae-solo-badge`
- 通过环境变量控制 source map 和调试插件开关

## 目录结构

```text
frontend/
|-- public/                 # 静态资源
|-- src/
|   |-- components/         # 通用组件
|   |-- composables/        # 组合式逻辑
|   |-- lib/                # 通用工具
|   |-- mock/               # Mock 数据
|   |-- pages/              # 页面组件
|   |-- types/              # 类型定义
|   |-- utils/              # 业务工具函数
|   |-- App.vue             # 根组件
|   `-- style.css           # 全局样式
|-- package.json
`-- vite.config.ts
```

## 核心模块功能

### 1. 首页

文件位置：`frontend/src/pages/HomePage.vue`

当前已实现：

- 系统欢迎页与品牌视觉展示
- 核心能力卡片展示
- 跳转到案件列表页的主入口按钮

### 2. 案件列表页

文件位置：`frontend/src/pages/CaseListPage.vue`

当前已实现：

- 案件统计面板
- 按案件名称、案号、当事人进行搜索
- 按案件状态筛选
- 案件卡片列表展示
- 点击案件进入详情页

页面数据当前来自 `frontend/src/mock/data.ts` 中的本地 Mock 数据。

### 3. 案件详情页

文件位置：`frontend/src/pages/CaseDetailPage.vue`

当前已实现：

- 案件基础信息展示
- 材料树管理区域
- 选中节点后的右侧详情面板
- Excel / PDF 材料清单导出入口
- 材料文件数、文件夹数统计

### 4. 材料树组件

文件位置：

- `frontend/src/components/MaterialTree.vue`
- `frontend/src/components/MaterialTreeItem.vue`

当前已实现：

- 递归渲染材料树
- 新建根文件夹、新建根文件
- 在文件夹下新增子文件夹或子文件
- 节点重命名、删除
- 展开 / 折叠文件夹
- 拖拽排序和层级调整
- 节点选中与高亮

这部分是项目里最核心的交互模块之一。

### 5. 树结构工具函数

文件位置：`frontend/src/utils/treeUtils.ts`

当前已实现：

- 树结构拍平 `flattenMaterialTree`
- 根据 ID 查找节点 / 父节点
- 新增、删除、更新节点
- 展开状态切换
- 节点拖拽移动
- 后代关系判断，防止错误拖拽
- 文件数量统计

### 6. 导出工具

文件位置：`frontend/src/utils/exportUtils.ts`

当前已实现：

- 导出 Excel 材料清单
- 导出 PDF 材料清单
- 导出时附带案件基础信息
- 将树结构材料拍平后输出为清单

### 7. 类型定义

文件位置：`frontend/src/types/index.ts`

核心模型包括：

- `Case`：案件信息
- `MaterialNode`：材料树节点
- `FlatMaterialItem`：导出用扁平材料项
- `CaseStatus`：案件状态枚举
- `MaterialNodeType`：节点类型枚举

### 8. Mock 数据

文件位置：`frontend/src/mock/data.ts`

当前已实现：

- 内置多组示例案件
- 每个案件包含完整的材料树结构
- 包含案件状态映射，用于列表和详情页展示
- 提供前端原型阶段使用的 ID 生成逻辑

### 9. 主题切换能力

文件位置：`frontend/src/composables/useTheme.ts`

当前已实现：

- 支持 `light` / `dark` 主题状态维护
- 支持读取本地缓存和系统主题偏好
- 通过给根节点添加 class 切换主题

这部分能力已经准备好，但当前页面中尚未看到完整接入。

## 后续优先补齐建议

如果后续继续完善，建议优先补下面几项：

1. 新增 `src/main.ts` 应用入口
2. 新增 Vue Router 路由注册文件
3. 将 Mock 数据替换为真实后端接口
4. 为“新建案件”和材料编辑增加持久化能力
5. 增加登录、权限控制和操作审计
6. 统一修复当前源码中的中文乱码内容

## 总结

这个仓库当前已经完成了“案件材料管理前端原型”的主体结构，尤其是案件展示、材料树交互和导出逻辑已经比较完整。根目录 README 适合作为接手项目时的快速说明文档；后续只要补齐应用入口和路由初始化，就能更顺畅地进入联调或继续开发阶段。
