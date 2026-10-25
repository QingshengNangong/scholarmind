# ScholarMind

学术论文辅助阅读系统 · An academic paper reading assistant

**在线 Demo / Live demo：** https://qingshengnangong.com/scholarmind/（需要自备 Gemini API Key / bring your own Gemini API key）

![ScholarMind 网页版界面](docs/screenshot.png)

[中文](#中文) · [English](#english)

---

## 中文

ScholarMind 是《自然语言处理（英语）》课程的期末项目（2025.12 – 2026.01），帮助读者快速理解一篇中英文学术文本。项目分为两部分：

| 目录 | 内容 | 分析方式 |
|---|---|---|
| [`python/`](python/) | 命令行程序 | 本地运行，基于 spaCy 的规则与统计方法 |
| [`web/`](web/) | 网页版（即在线 Demo） | 调用 Google Gemini 大模型 |

### 功能

**Python 命令行版**
- 自动摘要：TextRank 抽取式摘要；可选接入 OpenAI 兼容接口生成摘要。
- 实体识别：spaCy NER，加上针对学术术语的规则补充。
- 概念图谱：依存句法抽取主谓宾三元组，用 NetworkX 构建有向图并可视化。
- 术语定义抽取、关键词提取、文本概况统计（TTR、hapax 等）与阅读难度评估。
- 中英文自动识别，切换 `en_core_web_lg` / `zh_core_web_lg` 模型；结果可导出为 JSON。

处理流程见 [`docs/pipeline.png`](docs/pipeline.png)。

**网页版**
- 摘要、实体、关键词、可读性评分与交互式概念图谱（D3）。
- 多语翻译、深度阅读分析、相关论文推荐与网络搜索（Google Search grounding）。
- 针对当前论文的问答，支持上传 PDF / TXT，界面提供中、英、日、韩四种语言。
- 深度分析可改用任意 OpenAI 兼容接口。

### 快速开始

**Python 版**（Python 3.10 及以上）

```bash
cd python
pip install -r requirements.txt
python -m spacy download en_core_web_lg
python -m spacy download zh_core_web_lg   # 分析中文文本时需要
python scholarmind.py
```

进入交互模式后，输入 `demo` 或 `demo_zh` 查看示例，也可以直接输入文本或文件路径。输入 `ai` 可配置 OpenAI 兼容接口，`quit` 退出。图谱里的中文标签需要先为 Matplotlib 配置中文字体。

**网页版**（Node.js 18 及以上）

```bash
cd web
npm install
npm run dev      # 开发服务器 http://localhost:3000/scholarmind/
npm run build    # 生成 dist/
```

### API Key 与隐私

网页版不附带任何 Key。使用者在「设置」中填入自己的 Gemini API Key（可在 [Google AI Studio](https://aistudio.google.com/apikey) 免费申请），Key 只保存在浏览器本地。请求由浏览器直接发往 Google，或发往使用者自己填写的兼容代理，Demo 所在的服务器既拿不到 Key，也看不到提交的文本。在无法直连 Google 的网络环境下，需要填写代理地址才能使用。

### 技术栈

Python 版：spaCy、NetworkX、NumPy、Matplotlib。
网页版：React 19、TypeScript、Vite、Tailwind CSS、D3、Recharts、pdf.js、Google Gen AI SDK。网页原型最初由 Google AI Studio 生成，之后改为本地构建，加入了自带 Key 机制、手机端布局和错误提示。

---

## English

ScholarMind is the final project for a *Natural Language Processing (in English)* course (Dec 2025 – Jan 2026). It helps readers get through academic texts in English or Chinese. The repository has two parts:

| Folder | What it is | How it analyses text |
|---|---|---|
| [`python/`](python/) | Command-line program | Runs locally, with rule-based and statistical methods on spaCy |
| [`web/`](web/) | Web app (the live demo) | Calls Google Gemini |

### Features

**Python CLI**
- Summarisation: extractive TextRank summaries, with optional LLM summaries through any OpenAI-compatible endpoint.
- Entity recognition: spaCy NER plus rules for academic terminology.
- Concept graph: subject–verb–object triples from dependency parses, built into a directed NetworkX graph and plotted.
- Definition extraction, keyword extraction, text statistics (TTR, hapax and more) and a reading-difficulty score.
- Automatic English/Chinese detection that switches between `en_core_web_lg` and `zh_core_web_lg`; results export to JSON.

The pipeline is drawn in [`docs/pipeline.png`](docs/pipeline.png).

**Web app**
- Summary, entities, keywords, readability score and an interactive D3 concept graph.
- Translation, deep-reading analysis, related-paper discovery and web search (Google Search grounding).
- Chat with the paper, PDF/TXT upload, and a UI in English, Chinese, Japanese and Korean.
- Deep analysis can run on any OpenAI-compatible endpoint instead.

### Getting started

**Python** (3.10 or later)

```bash
cd python
pip install -r requirements.txt
python -m spacy download en_core_web_lg
python -m spacy download zh_core_web_lg   # only for Chinese text
python scholarmind.py
```

In the interactive prompt, type `demo` or `demo_zh` for a sample run, or paste text or a file path. Type `ai` to configure an OpenAI-compatible endpoint and `quit` to exit. Chinese labels in the graph need a CJK font configured for Matplotlib.

**Web app** (Node.js 18 or later)

```bash
cd web
npm install
npm run dev      # dev server at http://localhost:3000/scholarmind/
npm run build    # outputs dist/
```

### API key and privacy

The web app ships without a key. Users paste their own Gemini API key in Settings (free from [Google AI Studio](https://aistudio.google.com/apikey)). The key is stored only in their browser. Requests go from the browser straight to Google, or to a compatible proxy the user enters, so the server hosting the demo never sees the key or the submitted text. Where Google is unreachable, a proxy address is required.

### Tech stack

Python: spaCy, NetworkX, NumPy, Matplotlib.
Web: React 19, TypeScript, Vite, Tailwind CSS, D3, Recharts, pdf.js and the Google Gen AI SDK. The web prototype was first generated with Google AI Studio, then moved to a local build with bring-your-own-key, a phone layout and clearer error messages.

---

## License

[MIT](LICENSE) © 2025-2026 Mingtao Xia
