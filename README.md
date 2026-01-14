# Excel 成绩分析系统

一个基于 React + Vite + TypeScript + Tailwind CSS 构建的成绩分析系统，支持 Excel 数据导入、多维度分析和可视化展示。

## 功能特性

### 1. 数据管理
- ✅ 支持 Excel 文件导入（.xlsx, .xls）
- ✅ 多文件管理（导入、删除、重命名）
- ✅ 指定当前生效的数据文件
- ✅ 数据本地缓存（LocalStorage）
- ✅ PC 和移动端支持

### 2. 成绩总体分析
- ✅ 考试次数选择器（支持多选，默认分析全部）
- ✅ 学科趋势与平均分折线图
- ✅ 科目成绩关联性热力图
- ✅ 领航榜单（年级总分/单科前N名）
- ✅ 标准差分析
- ✅ 班级学科优势分析

### 3. 成绩班级分析
- ✅ 考试次数选择器
- ✅ 班级搜索/选择器
- ✅ 学科趋势与平均分（班级 vs 年级对比）
- ✅ 学生各科平均雷达图
- ✅ 科目关联性分析
- ✅ 难度系数分析
- ✅ 标准差分析
- ✅ 班级领航榜单
- ✅ 学科尖子生统计

### 4. 成绩个人分析
- ✅ 学生搜索/选择器（支持姓名模糊搜索）
- ✅ 个人成绩趋势（个人 vs 班级 vs 年级）
- ✅ 个人能力象限雷达图
- ✅ 学科关联性分析
- ✅ 成绩分布对比

## 技术栈

- **框架**: React 19 + Vite 7
- **语言**: TypeScript
- **样式**: Tailwind CSS 4
- **路由**: React Router DOM 7
- **图表**: ECharts + echarts-for-react
- **Excel 处理**: xlsx
- **图标**: Lucide React

## 设计特点

- 🎨 **暗黑风格**: 遵循苹果设计语言
- 📐 **空间感**: 注重留白与层级关系
- 🔄 **圆润组件**: 圆角设计，干净细腻
- 📱 **响应式**: PC、平板、手机端完美适配

## 安装与运行

### 安装依赖

```bash
npm install
```

### 开发模式

```bash
npm run dev
```

### 构建生产版本

```bash
npm run build
```

### 预览生产版本

```bash
npm run preview
```

## 数据格式

Excel 文件格式要求：
- 每个工作表（Sheet）代表一次考试
- 工作表名称应为数字（如：1, 2, 3...）
- 表头应包含以下列：
  - 考试、考试时间、班号、学号、姓名
  - 语文、数学、英语、物理、化学、政治、历史、地理、生物、总分
  - 语文级排名、数学级排名、英语级排名、物理级排名、化学级排名、政治级排名、历史级排名、地理级排名、生物级排名、总分级排名

## 使用说明

1. **导入数据**
   - 进入"数据管理"页面
   - 点击"选择文件"按钮上传 Excel 文件
   - 系统会自动解析并缓存数据

2. **设置生效文件**
   - 在数据管理页面选择要分析的文件
   - 点击"设为生效"按钮

3. **进行分析**
   - 进入相应的分析页面（总体/班级/个人）
   - 选择筛选条件（考试次数、班级、学生等）
   - 查看可视化图表和分析结果

## 项目结构

```
excel-analyzer/
├── src/
│   ├── components/          # 通用组件
│   │   ├── charts/          # 图表组件
│   │   ├── Button.tsx
│   │   ├── Card.tsx
│   │   ├── Input.tsx
│   │   ├── Layout.tsx
│   │   ├── Select.tsx
│   │   └── Sidebar.tsx
│   ├── context/             # React Context
│   │   └── DataContext.tsx
│   ├── pages/               # 页面组件
│   │   ├── ClassAnalysis.tsx
│   │   ├── DataManagement.tsx
│   │   ├── OverviewAnalysis.tsx
│   │   └── PersonalAnalysis.tsx
│   ├── types/               # TypeScript 类型定义
│   │   └── index.ts
│   ├── utils/               # 工具函数
│   │   ├── analysis.ts     # 数据分析函数
│   │   ├── excel.ts        # Excel 处理
│   │   └── storage.ts      # 本地存储
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── tailwind.config.js
├── postcss.config.js
└── package.json
```

## 浏览器支持

- Chrome (最新版)
- Firefox (最新版)
- Safari (最新版)
- Edge (最新版)

## 许可证

MIT
