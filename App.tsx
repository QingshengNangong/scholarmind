
import React, { useState, useEffect, useRef } from 'react';
import { 
  FileText, 
  BarChart2, 
  Share2, 
  BookOpen, 
  MessageSquare, 
  Lightbulb, 
  Search, 
  ArrowRight, 
  UploadCloud,
  Layers,
  Activity,
  Award,
  Globe,
  Compass,
  Bookmark,
  Sparkles,
  RefreshCw,
  Trash2,
  Languages,
  Copy,
  Check,
  Settings as SettingsIcon,
  AlertTriangle,
  Loader2,
  Tag,
  Server,
  Zap,
  Key,
  Download,
  RotateCcw,
  FileDown,
  Cpu,
  BrainCircuit,
  ChevronDown,
  ExternalLink,
  ShieldCheck,
  Link as LinkIcon,
  X as XIcon
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell, 
  CartesianGrid 
} from 'recharts';
import ReactMarkdown from 'react-markdown';

// Components & Services
import ConceptGraph from './components/ConceptGraph';
import ChatInterface from './components/ChatInterface';
import { analyzePaper, generateExtendedAnalysis, findRelatedWork, translateText, fetchCustomModels, performWebSearch, setGeminiConfig, listGeminiModels, pickModel, MissingKeyError, GeminiConfig, DEFAULT_FAST_MODEL, DEFAULT_SMART_MODEL } from './services/geminiService';
import { AnalysisResult, RelatedPaper, AnalysisStatus, SupportedLanguage, UILanguage, CustomAIConfig, ModelOption, SearchResult } from './types';

// Configure PDF.js worker
// pdf.js (about 1.6 MB with its worker) loads only when a PDF is uploaded
const loadPdfjs = async () => {
  const [pdfjsLib, worker] = await Promise.all([
    import('pdfjs-dist'),
    import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
  ]);
  pdfjsLib.GlobalWorkerOptions.workerSrc = worker.default;
  return pdfjsLib;
};

const SAMPLE_TEXT_EN = `The inductive bias of the Transformer architecture, characterized by its lack of recurrence and reliance on self-attention mechanisms, has fundamentally altered the landscape of Natural Language Processing (NLP). Formally, the scaled dot-product attention is defined as Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V, facilitating the modeling of long-range dependencies without the vanishing gradient problems inherent in Recurrent Neural Networks (RNNs). However, the quadratic time and space complexity with respect to sequence length, O(L^2), poses significant scalability challenges. Recent research has pivoted towards linearized attention mechanisms and sparse approximations, such as the Reformer and Linformer, to mitigate these bottlenecks. Furthermore, the pre-training and fine-tuning paradigm, exemplified by BERT and GPT, leverages self-supervised learning on massive corpora to learn contextualized representations. Optimizing these over-parameterized models often involves navigating a non-convex loss landscape, where techniques like AdamW optimizers and learning rate warm-ups are crucial for convergence. More recently, parameter-efficient fine-tuning (PEFT) methods like Low-Rank Adaptation (LoRA) have emerged, freezing pre-trained weights and injecting rank-decomposition matrices to adapt models to downstream tasks with minimal computational overhead. Moreover, the emergence of in-context learning capabilities in Large Language Models (LLMs) challenges traditional understanding of generalization, suggesting that these models implicitly perform Bayesian inference or gradient descent during the forward pass of inference.`;

const SAMPLE_TEXT_CN = `Transformer架构的归纳偏置（Inductive Bias），以其摒弃循环结构并完全依赖自注意力机制为特征，从根本上重塑了自然语言处理（NLP）的格局。形式上，缩放点积注意力定义为 Attention(Q, K, V) = softmax(QK^T / sqrt(d_k))V，这使得模型能够捕捉长距离依赖关系，从而避免了循环神经网络（RNNs）中常见的梯度消失问题。然而，其相对于序列长度的二次方时间和空间复杂度 O(L^2) 带来了显著的可扩展性挑战。近期的研究转向了线性化注意力机制和稀疏近似方法（如Reformer和Linformer），以缓解这些瓶颈。此外，以BERT和GPT为代表的预训练-微调（Pre-training and Fine-tuning）范式，利用海量语料库上的自监督学习来学习上下文表征。优化这些超参数化模型通常涉及在非凸损失曲面中寻找极值，其中AdamW优化器和学习率预热对于收敛至关重要。最近，参数高效微调（PEFT）方法如低秩适应（LoRA）应运而生，通过冻结预训练权重并注入秩分解矩阵，以最小的计算开销使模型适应下游任务。此外，大型语言模型（LLMs）中上下文学习（In-Context Learning）能力的涌现挑战了对泛化的传统理解，暗示这些模型在推理的前向传播过程中隐式地执行了贝叶斯推理或梯度下降。`;

const translations = {
  en: {
    analysis: "Analysis",
    translation: "Translation",
    critique: "Deep Analysis",
    discovery: "Discovery",
    webSearch: "Web Search",
    askPaper: "Ask Paper",
    myLibrary: "My Library",
    savedPapers: "Saved Papers",
    topicsTracked: "Topics Tracked",
    evaluateTitle: "Academic Paper Reading System",
    evaluateSubtitle: "Paste your abstract, introduction, or full paper text below to get instant summaries, entity graphs, and readability analysis.",
    placeholder: "Paste academic text here...",
    loadSampleEn: "Load Sample (EN)",
    loadSampleZh: "Load Sample (CN)",
    uploadPdf: "Upload PDF / TXT",
    extracting: "Extracting text...",
    analyzeBtn: "Analyze Text",
    analyzing: "Analyzing structure, entities, and concepts...",
    error: "An error occurred during analysis. Please check your API Key or try a shorter text.",
    tryAgain: "Try Again",
    analysisReport: "Analysis Report",
    startNew: "Start New",
    summaryTitle: "Executive Summary",
    extractedKeywords: "Extracted Keywords",
    readability: "Readability",
    readabilityTooltip: "Score indicates the complexity of the text for a general audience.",
    knowledgeGraph: "Knowledge Graph",
    forceLayout: "Force Directed Layout",
    keyEntities: "Key Entities Analysis",
    entityName: "Entity Name",
    category: "Category",
    freq: "Freq",
    multiLangTrans: "Multi-language Translation",
    originalText: "Original Text",
    translateBtn: "Translate",
    translating: "Translating content...",
    aiPeerReview: "Deep Reading Analysis",
    relatedPaperTitle: "Related to this Paper",
    groundingSource: "Found via Google Search Grounding based on paper keywords",
    noRelated: "No related papers found.",
    recommendedTitle: "Recommended For You",
    personalizedReason: "Personalized based on your reading history and extracted topics",
    personalizedPick: "Personalized Pick",
    refresh: "Refresh",
    startAnalyzing: "Start analyzing papers to get recommendations.",
    clickRefresh: "Click refresh to generate recommendations.",
    copy: "Copy",
    copied: "Copied!",
    saveToLibrary: "Save to Library",
    removeFromLibrary: "Remove from Library",
    settings: "Settings",
    dataManagement: "Data Management",
    customAPI: "Custom AI Configuration",
    customAPIDesc: "Use your own OpenAI-compatible API (e.g., DeepSeek, Ollama) for Deep Analysis tasks.",
    baseUrl: "Base URL (e.g., https://api.openai.com/v1)",
    apiKey: "API Key",
    fetchModels: "Check Model List",
    selectModel: "Select Model",
    clearDataTitle: "Clear Local Data",
    clearDataDesc: "This will remove all saved bookmarks and tracked topics from your browser. This action cannot be undone.",
    clearBtn: "Clear All Data",
    cancel: "Cancel",
    confirmDelete: "Yes, Clear Data",
    noDataToClear: "No data to clear.",
    dataCleared: "Data cleared.",
    loading_structure: "Analyzing document structure...",
    loading_entities: "Extracting entities and concepts...",
    loading_graph: "Building knowledge graph...",
    loading_readability: "Calculating readability metrics...",
    loading_summary: "Generating executive summary...",
    saved: "Saved",
    enabled: "Enabled",
    disabled: "Disabled",
    retryAnalysis: "Retry Analysis",
    export: "Export",
    downloadMd: "Markdown",
    downloadTxt: "Text File",
    noBookmarks: "No saved papers yet.",
    noTopics: "No topics tracked yet.",
    defaultSystemModels: "Default System Models",
    defaultModelsDesc: "Chosen from the models your key can use. Custom AI below, when enabled, replaces the reasoning model for Deep Analysis.",
    fastModel: "Fast Model (Analysis, Chat)",
    reasoningModel: "Reasoning Model (Deep Analysis, Search)",
    entityDist: "Entity Distribution",
    avgSentence: "Avg Sentence Length",
    techDensity: "Technical Term Density",
    topKeywords: "Top Keywords Relevance",
    words: "words",
    searchPlaceholder: "Search for concepts, facts, or data...",
    searchBtn: "Search",
    sources: "Sources",
    searching: "Searching...",
    geminiKeyTitle: "Gemini API Key",
    geminiKeyDesc: "Analysis, translation, search and Q&A run on Google Gemini with your own key. Bind one before you start.",
    geminiKeyPrivacy: "Your key is kept only in this browser. Requests go directly from your browser to the address below; this site's server never sees the key or your text.",
    getKeyLink: "Get a free key at Google AI Studio",
    geminiBaseUrl: "API address (optional)",
    geminiBaseUrlHint: "Leave empty for the official endpoint. Fill in a Gemini-compatible proxy if Google is not reachable from your network.",
    rememberKey: "Remember on this device (otherwise cleared when the tab closes)",
    verifyKey: "Verify & load models",
    removeKey: "Unbind",
    keyBound: "Key bound",
    keyNotBound: "Not bound",
    keyVerified: "Key works: {n} models available.",
    keyCheckFailed: "Key check failed: ",
    needKeyTitle: "Bind your Gemini API key first",
    needKeyDesc: "This demo does not ship with a key. Add your own in Settings; it stays in your browser.",
    bindKeyBtn: "Bind API Key",
    requestFailed: "Request failed: ",
    networkError: "Cannot reach the API address. Check your network, or fill in a reachable proxy address in Settings.",
    dismiss: "Dismiss"
  },
  zh: {
    analysis: "分析报告",
    translation: "多语翻译",
    critique: "深度分析",
    discovery: "发现推荐",
    webSearch: "网络搜索",
    askPaper: "论文问答",
    myLibrary: "我的图书馆",
    savedPapers: "收藏论文",
    topicsTracked: "关注主题",
    evaluateTitle: "学术论文辅助阅读系统",
    evaluateSubtitle: "在下方粘贴摘要、简介或全文，即可即时获得摘要、实体关系图和可读性分析。",
    placeholder: "在此粘贴学术文本...",
    loadSampleEn: "加载示例 (英文)",
    loadSampleZh: "加载示例 (中文)",
    uploadPdf: "上传 PDF / TXT",
    extracting: "正在提取文本...",
    analyzeBtn: "分析文本",
    analyzing: "正在分析结构、实体和概念...",
    error: "分析过程中发生错误。请检查您的 API 密钥或尝试较短的文本。",
    tryAgain: "重试",
    analysisReport: "分析报告",
    startNew: "开始新分析",
    summaryTitle: "核心摘要报告",
    extractedKeywords: "提取关键词",
    readability: "可读性",
    readabilityTooltip: "分数表示文本对普通读者的复杂程度。",
    knowledgeGraph: "知识图谱",
    forceLayout: "力导向布局",
    keyEntities: "关键实体分析",
    entityName: "实体名称",
    category: "类别",
    freq: "频率",
    multiLangTrans: "多语言翻译",
    originalText: "原文",
    translateBtn: "翻译",
    translating: "正在翻译内容...",
    aiPeerReview: "深度阅读分析",
    relatedPaperTitle: "相关论文",
    groundingSource: "基于论文关键词通过 Google 搜索生成",
    noRelated: "未找到相关论文。",
    recommendedTitle: "为您推荐",
    personalizedReason: "基于您的阅读历史和提取主题的个性化推荐",
    personalizedPick: "个性化精选",
    refresh: "刷新",
    startAnalyzing: "开始分析论文以获取推荐。",
    clickRefresh: "点击刷新以生成推荐。",
    copy: "复制",
    copied: "已复制！",
    saveToLibrary: "保存到资料库",
    removeFromLibrary: "从资料库移除",
    settings: "设置",
    dataManagement: "数据管理",
    customAPI: "自定义 AI 配置",
    customAPIDesc: "使用兼容 OpenAI 的 API（如 DeepSeek, Ollama）进行深度分析任务。",
    baseUrl: "API 地址 (例如 https://api.openai.com/v1)",
    apiKey: "API 密钥",
    fetchModels: "检测模型列表",
    selectModel: "选择模型",
    clearDataTitle: "清除本地数据",
    clearDataDesc: "这将从您的浏览器中删除所有保存的书签和关注的主题。此操作无法撤销。",
    clearBtn: "清除所有数据",
    cancel: "取消",
    confirmDelete: "是的，清除数据",
    noDataToClear: "没有可清除的数据。",
    dataCleared: "数据已清除。",
    loading_structure: "正在分析文档结构...",
    loading_entities: "正在提取实体和概念...",
    loading_graph: "正在构建知识图谱...",
    loading_readability: "正在计算可读性指标...",
    loading_summary: "正在生成摘要...",
    saved: "已保存",
    enabled: "已启用",
    disabled: "已禁用",
    retryAnalysis: "重试分析",
    export: "导出",
    downloadMd: "Markdown",
    downloadTxt: "纯文本 (TXT)",
    noBookmarks: "暂无收藏论文。",
    noTopics: "暂无关注主题。",
    defaultSystemModels: "默认系统模型",
    defaultModelsDesc: "从你的 Key 可用的模型中选择。启用下方的自定义 AI 后，深度分析将改用自定义模型。",
    fastModel: "快速模型 (分析, 问答)",
    reasoningModel: "推理模型 (深度分析, 搜索)",
    entityDist: "实体分布",
    avgSentence: "平均句长",
    techDensity: "术语密度",
    topKeywords: "关键词相关度",
    words: "词",
    searchPlaceholder: "搜索概念、事实或数据...",
    searchBtn: "搜索",
    sources: "来源",
    searching: "搜索中...",
    geminiKeyTitle: "Gemini API Key",
    geminiKeyDesc: "分析、翻译、搜索与问答都由 Google Gemini 完成，需要使用你自己的 API Key。开始前请先绑定。",
    geminiKeyPrivacy: "Key 只保存在当前浏览器里。请求由你的浏览器直接发往下方地址，本站服务器既看不到 Key，也看不到你提交的文本。",
    getKeyLink: "在 Google AI Studio 免费申请 Key",
    geminiBaseUrl: "接口地址（选填）",
    geminiBaseUrlHint: "留空即使用官方接口。如果你的网络无法直连 Google，可以填写兼容 Gemini 格式的代理地址。",
    rememberKey: "在此设备上记住（不勾选则关闭标签页后清除）",
    verifyKey: "验证并获取模型",
    removeKey: "解除绑定",
    keyBound: "已绑定",
    keyNotBound: "未绑定",
    keyVerified: "验证通过，可用模型 {n} 个。",
    keyCheckFailed: "验证失败：",
    needKeyTitle: "请先绑定 Gemini API Key",
    needKeyDesc: "本演示不附带 Key，请在「设置」中填入你自己的 Key，它只保存在你的浏览器里。",
    bindKeyBtn: "绑定 API Key",
    requestFailed: "请求失败：",
    networkError: "无法连接接口地址。请检查网络，或在「设置」中填写可以访问的代理地址。",
    dismiss: "关闭"
  },
  ko: {
    analysis: "분석 보고서",
    translation: "다국어 번역",
    critique: "심층 분석",
    discovery: "발견 및 추천",
    webSearch: "웹 검색",
    askPaper: "논문 질문",
    myLibrary: "내 서재",
    savedPapers: "저장된 논문",
    topicsTracked: "관심 주제",
    evaluateTitle: "학술 논문 보조 리딩 시스템",
    evaluateSubtitle: "초록, 서론 또는 논문 전문을 붙여넣으면 요약, 엔티티 관계도, 가독성 분석을 즉시 확인할 수 있습니다.",
    placeholder: "여기에 학술 텍스트를 붙여넣으세요...",
    loadSampleEn: "예시 로드 (영어)",
    loadSampleZh: "예시 로드 (중국어)",
    uploadPdf: "PDF / TXT 업로드",
    extracting: "텍스트 추출 중...",
    analyzeBtn: "텍스트 분석",
    analyzing: "구조, 엔티티 및 개념 분석 중...",
    error: "분석 중 오류가 발생했습니다. API 키를 확인하거나 더 짧은 텍스트로 시도해 주세요.",
    tryAgain: "재시도",
    analysisReport: "분석 보고서",
    startNew: "새 분석 시작",
    summaryTitle: "핵심 요약 보고서",
    extractedKeywords: "추출된 키워드",
    readability: "가독성",
    readabilityTooltip: "점수는 일반 독자가 읽기에 얼마나 복잡한지를 나타냅니다.",
    knowledgeGraph: "지식 그래프",
    forceLayout: "Force Directed Layout",
    keyEntities: "주요 엔티티 분석",
    entityName: "엔티티 명",
    category: "카테고리",
    freq: "빈도",
    multiLangTrans: "다국어 번역",
    originalText: "원문",
    translateBtn: "번역",
    translating: "번역 중...",
    aiPeerReview: "심층 리딩 분석",
    relatedPaperTitle: "관련 논문",
    groundingSource: "논문 키워드를 기반으로 Google 검색을 통해 발견됨",
    noRelated: "관련 논문을 찾을 수 없습니다.",
    recommendedTitle: "추천 논문",
    personalizedReason: "읽기 기록 및 추출된 주제를 기반으로 한 개인화 추천",
    personalizedPick: "개인화 추천",
    refresh: "새로고침",
    startAnalyzing: "추천을 받으려면 논문 분석을 시작하세요.",
    clickRefresh: "추천을 생성하려면 새로고침을 클릭하세요.",
    copy: "복사",
    copied: "복사됨!",
    saveToLibrary: "서재에 저장",
    removeFromLibrary: "서재에서 삭제",
    settings: "설정",
    dataManagement: "데이터 관리",
    customAPI: "사용자 지정 AI 구성",
    customAPIDesc: "심층 분석 작업에 OpenAI 호환 API(예: DeepSeek, Ollama)를 사용합니다.",
    baseUrl: "기본 URL (예: https://api.openai.com/v1)",
    apiKey: "API 키",
    fetchModels: "모델 목록 확인",
    selectModel: "모델 선택",
    clearDataTitle: "로컬 데이터 지우기",
    clearDataDesc: "브라우저에 저장된 모든 북마크와 관심 주제가 삭제됩니다. 이 작업은 취소할 수 없습니다.",
    clearBtn: "모든 데이터 지우기",
    cancel: "취소",
    confirmDelete: "네, 데이터 지우기",
    noDataToClear: "지울 데이터가 없습니다.",
    dataCleared: "데이터가 지워졌습니다.",
    loading_structure: "문서 구조 분석 중...",
    loading_entities: "엔티티 및 개념 추출 중...",
    loading_graph: "지식 그래프 구축 중...",
    loading_readability: "가독성 지표 계산 중...",
    loading_summary: "요약 생성 중...",
    saved: "저장됨",
    enabled: "활성화됨",
    disabled: "비활성화됨",
    retryAnalysis: "분석 재시도",
    export: "내보내기",
    downloadMd: "Markdown",
    downloadTxt: "텍스트 파일 (TXT)",
    noBookmarks: "저장된 논문이 없습니다.",
    noTopics: "추적 중인 주제가 없습니다.",
    defaultSystemModels: "기본 시스템 모델",
    defaultModelsDesc: "키로 사용할 수 있는 모델 중에서 선택합니다. 아래 사용자 지정 AI를 켜면 심층 분석은 해당 모델을 사용합니다.",
    fastModel: "빠른 모델 (분석, 채팅)",
    reasoningModel: "추론 모델 (심층 분석, 검색)",
    entityDist: "엔티티 분포",
    avgSentence: "평균 문장 길이",
    techDensity: "전문 용어 밀도",
    topKeywords: "주요 키워드 관련성",
    words: "단어",
    searchPlaceholder: "개념, 사실, 또는 데이터를 검색...",
    searchBtn: "검색",
    sources: "출처",
    searching: "검색 중...",
    geminiKeyTitle: "Gemini API 키",
    geminiKeyDesc: "분석, 번역, 검색, Q&A는 본인의 키로 Google Gemini에서 실행됩니다. 시작하기 전에 키를 등록하세요.",
    geminiKeyPrivacy: "키는 이 브라우저에만 저장됩니다. 요청은 브라우저에서 아래 주소로 직접 전송되며, 이 사이트의 서버는 키나 텍스트를 볼 수 없습니다.",
    getKeyLink: "Google AI Studio에서 무료 키 발급",
    geminiBaseUrl: "API 주소 (선택)",
    geminiBaseUrlHint: "비워 두면 공식 엔드포인트를 사용합니다. Google에 연결할 수 없는 경우 Gemini 호환 프록시 주소를 입력하세요.",
    rememberKey: "이 기기에 저장 (선택하지 않으면 탭을 닫을 때 삭제)",
    verifyKey: "확인 및 모델 불러오기",
    removeKey: "등록 해제",
    keyBound: "등록됨",
    keyNotBound: "미등록",
    keyVerified: "확인 완료: 사용 가능한 모델 {n}개.",
    keyCheckFailed: "키 확인 실패: ",
    needKeyTitle: "먼저 Gemini API 키를 등록하세요",
    needKeyDesc: "이 데모에는 키가 포함되어 있지 않습니다. 설정에서 본인의 키를 입력하세요. 키는 브라우저에만 저장됩니다.",
    bindKeyBtn: "API 키 등록",
    requestFailed: "요청 실패: ",
    networkError: "API 주소에 연결할 수 없습니다. 네트워크를 확인하거나 설정에서 접속 가능한 프록시 주소를 입력하세요.",
    dismiss: "닫기"
  },
  ja: {
    analysis: "分析レポート",
    translation: "多言語翻訳",
    critique: "詳細分析",
    discovery: "発見と推奨",
    webSearch: "ウェブ検索",
    askPaper: "論文Q&A",
    myLibrary: "マイライブラリ",
    savedPapers: "保存された論文",
    topicsTracked: "追跡中のトピック",
    evaluateTitle: "学術論文リーディング支援システム",
    evaluateSubtitle: "要旨、序論、または論文全文を貼り付けると、要約、エンティティグラフ、可読性分析を即座に取得できます。",
    placeholder: "ここに学術テキストを貼り付けてください...",
    loadSampleEn: "サンプル読み込み (英語)",
    loadSampleZh: "サンプル読み込み (中国語)",
    uploadPdf: "PDF / TXT アップロード",
    extracting: "テキスト抽出中...",
    analyzeBtn: "テキスト分析",
    analyzing: "構造、エンティティ、概念を分析中...",
    error: "分析中にエラーが発生しました。APIキーを確認するか、短いテキストで試してください。",
    tryAgain: "再試行",
    analysisReport: "分析レポート",
    startNew: "新しい分析を開始",
    summaryTitle: "エグゼクティブサマリー",
    extractedKeywords: "抽出されたキーワード",
    readability: "可読性",
    readabilityTooltip: "スコアは一般読者にとってのテキストの複雑さを示します。",
    knowledgeGraph: "ナレッジグラフ",
    forceLayout: "力指向レイアウト",
    keyEntities: "主要エンティティ分析",
    entityName: "エンティティ名",
    category: "カテゴリ",
    freq: "頻度",
    multiLangTrans: "多言語翻訳",
    originalText: "原文",
    translateBtn: "翻訳",
    translating: "翻訳中...",
    aiPeerReview: "詳細リーディング分析",
    relatedPaperTitle: "関連論文",
    groundingSource: "論文のキーワードに基づきGoogle検索経由で発見",
    noRelated: "関連論文が見つかりませんでした。",
    recommendedTitle: "おすすめ",
    personalizedReason: "閲覧履歴と抽出されたトピックに基づくパーソナライズされた推奨",
    personalizedPick: "パーソナライズ",
    refresh: "更新",
    startAnalyzing: "推奨を取得するには論文の分析を開始してください。",
    clickRefresh: "更新をクリックして推奨を生成します。",
    copy: "コピー",
    copied: "コピーしました！",
    saveToLibrary: "ライブラリに保存",
    removeFromLibrary: "ライブラリから削除",
    settings: "設定",
    dataManagement: "データ管理",
    customAPI: "カスタムAI設定",
    customAPIDesc: "詳細分析タスクにOpenAI互換API（DeepSeek、Ollamaなど）を使用します。",
    baseUrl: "ベースURL (例: https://api.openai.com/v1)",
    apiKey: "APIキー",
    fetchModels: "モデルリストを確認",
    selectModel: "モデルを選択",
    clearDataTitle: "ローカルデータを消去",
    clearDataDesc: "ブラウザから保存されたブックマークとトピックがすべて削除されます。この操作は取り消せません。",
    clearBtn: "すべてのデータを消去",
    cancel: "キャンセル",
    confirmDelete: "はい、データを消去します",
    noDataToClear: "消去するデータがありません。",
    dataCleared: "データが消去されました。",
    loading_structure: "ドキュメント構造を分析中...",
    loading_entities: "エンティティと概念を抽出中...",
    loading_graph: "ナレッジグラフを構築中...",
    loading_readability: "可読性指標を計算中...",
    loading_summary: "要約を生成中...",
    saved: "保存済み",
    enabled: "有効",
    disabled: "無効",
    retryAnalysis: "分析を再試行",
    export: "エクスポート",
    downloadMd: "Markdown",
    downloadTxt: "テキストファイル (TXT)",
    noBookmarks: "保存された論文はありません。",
    noTopics: "追跡中のトピックはありません。",
    defaultSystemModels: "デフォルトシステムモデル",
    defaultModelsDesc: "キーで利用できるモデルから選択します。下のカスタム AI を有効にすると、詳細分析はそのモデルを使います。",
    fastModel: "高速モデル (分析、チャット)",
    reasoningModel: "推論モデル (詳細分析、検索)",
    entityDist: "エンティティ分布",
    avgSentence: "平均文長",
    techDensity: "専門用語密度",
    topKeywords: "キーワード関連度",
    words: "語",
    searchPlaceholder: "概念、事実、またはデータを検索...",
    searchBtn: "検索",
    sources: "情報源",
    searching: "検索中...",
    geminiKeyTitle: "Gemini API キー",
    geminiKeyDesc: "分析・翻訳・検索・Q&A はご自身のキーで Google Gemini を使って実行します。始める前にキーを登録してください。",
    geminiKeyPrivacy: "キーはこのブラウザにのみ保存されます。リクエストはブラウザから下記のアドレスへ直接送られ、本サイトのサーバーはキーもテキストも受け取りません。",
    getKeyLink: "Google AI Studio で無料キーを取得",
    geminiBaseUrl: "API アドレス（任意）",
    geminiBaseUrlHint: "空欄なら公式エンドポイントを使います。Google に接続できない場合は Gemini 互換プロキシのアドレスを入力してください。",
    rememberKey: "このデバイスに保存（オフの場合はタブを閉じると消去）",
    verifyKey: "確認してモデルを取得",
    removeKey: "登録解除",
    keyBound: "登録済み",
    keyNotBound: "未登録",
    keyVerified: "確認完了：利用可能なモデル {n} 件。",
    keyCheckFailed: "キーの確認に失敗しました：",
    needKeyTitle: "まず Gemini API キーを登録してください",
    needKeyDesc: "このデモにはキーが含まれていません。設定でご自身のキーを入力してください。キーはブラウザにのみ保存されます。",
    bindKeyBtn: "API キーを登録",
    requestFailed: "リクエストに失敗しました：",
    networkError: "API アドレスに接続できません。ネットワークを確認するか、設定で接続可能なプロキシのアドレスを入力してください。",
    dismiss: "閉じる"
  }
};

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [status, setStatus] = useState<AnalysisStatus>(AnalysisStatus.IDLE);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'translation' | 'critique' | 'discovery' | 'settings' | 'library' | 'search'>('dashboard');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [uiLanguage, setUiLanguage] = useState<UILanguage>(() => {
    const nav = (navigator.language || '').toLowerCase();
    return nav.startsWith('zh') ? 'zh' : nav.startsWith('ko') ? 'ko' : nav.startsWith('ja') ? 'ja' : 'en';
  });
  const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);

  // Auxiliary States for Features
  const [extendedAnalysis, setExtendedAnalysis] = useState<string | null>(null);
  const [isAnalysisLoading, setIsAnalysisLoading] = useState(false);
  
  // Translation State
  const [translatedText, setTranslatedText] = useState<string>('');
  const [targetLang, setTargetLang] = useState<SupportedLanguage>('Chinese');
  const [isTranslating, setIsTranslating] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  // Discovery & Personalization State
  const [relatedPapers, setRelatedPapers] = useState<RelatedPaper[]>([]); // Contextual (Related to current paper)
  const [recommendedPapers, setRecommendedPapers] = useState<RelatedPaper[]>([]); // Personalized (Based on history)
  const [isSearchingContextual, setIsSearchingContextual] = useState(false);
  const [isSearchingPersonal, setIsSearchingPersonal] = useState(false);

  // Web Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResult, setSearchResult] = useState<SearchResult | null>(null);
  const [isSearchingWeb, setIsSearchingWeb] = useState(false);
  const searchResultsRef = useRef<HTMLDivElement>(null);
  
  // Custom API State
  const [customAiConfig, setCustomAiConfig] = useState<CustomAIConfig>(() => {
    try {
      const saved = localStorage.getItem('scholarMind_customAI');
      return saved ? JSON.parse(saved) : { isEnabled: false, baseUrl: '', apiKey: '', selectedModel: '' };
    } catch (e) {
      return { isEnabled: false, baseUrl: '', apiKey: '', selectedModel: '' };
    }
  });
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [isCheckingModels, setIsCheckingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);
  const [modelFetchSuccess, setModelFetchSuccess] = useState<string | null>(null);

  // Gemini key bound by the visitor: localStorage when "remember" is on, sessionStorage otherwise
  const [geminiConfig, setGeminiConfigState] = useState<GeminiConfig & { remember: boolean }>(() => {
    const empty = { apiKey: '', baseUrl: '', fastModel: '', smartModel: '', remember: true };
    try {
      const saved = localStorage.getItem('scholarMind_gemini') || sessionStorage.getItem('scholarMind_gemini');
      return saved ? { ...empty, ...JSON.parse(saved) } : empty;
    } catch (e) {
      return empty;
    }
  });
  const [geminiModels, setGeminiModels] = useState<ModelOption[]>([]);
  const [isCheckingKey, setIsCheckingKey] = useState(false);
  const [keyCheckError, setKeyCheckError] = useState<string | null>(null);
  const [keyCheckSuccess, setKeyCheckSuccess] = useState<string | null>(null);
  const hasKey = geminiConfig.apiKey.trim() !== '';

  // Last failed request, shown as a banner above the current view
  const [aiNotice, setAiNotice] = useState<string | null>(null);

  // Settings State
  const [isConfirmingClear, setIsConfirmingClear] = useState(false);

  // Loading Message State
  const [loadingMessage, setLoadingMessage] = useState("");
  
  // PDF processing state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  
  // User Profile (Persistence with LocalStorage)
  const [userInterests, setUserInterests] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('scholarMind_interests');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [bookmarks, setBookmarks] = useState<RelatedPaper[]>(() => {
    try {
      const saved = localStorage.getItem('scholarMind_bookmarks');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const t = translations[uiLanguage];
  
  // Calculate Entity Distribution Data
  const entityCategoryData = result?.entities ? result.entities.reduce((acc, curr) => {
    const existing = acc.find(item => item.name === curr.category);
    if (existing) {
      existing.value += curr.count;
    } else {
      acc.push({ name: curr.category, value: curr.count });
    }
    return acc;
  }, [] as {name: string, value: number}[]).sort((a, b) => b.value - a.value) : [];

  const CHART_COLORS = ['#78716c', '#a8a29e', '#d6d3d1', '#57534e', '#44403c', '#e7e5e4'];

  // Effect: Cycle loading messages during analysis
  useEffect(() => {
    if (status === AnalysisStatus.ANALYZING) {
      const messages = [
        t.loading_structure,
        t.loading_entities,
        t.loading_graph,
        t.loading_readability,
        t.loading_summary
      ];
      setLoadingMessage(messages[0]);
      let i = 0;
      const interval = setInterval(() => {
        i = (i + 1) % messages.length;
        setLoadingMessage(messages[i]);
      }, 2500);
      return () => clearInterval(interval);
    }
  }, [status, uiLanguage]);

  // Effect: Scroll to top of search results when result changes
  useEffect(() => {
    if (searchResult && searchResultsRef.current) {
      searchResultsRef.current.scrollTop = 0;
    }
  }, [searchResult]);

  // Effect: Persist user interests
  useEffect(() => {
    localStorage.setItem('scholarMind_interests', JSON.stringify(userInterests));
  }, [userInterests]);

  // Effect: Persist bookmarks
  useEffect(() => {
    localStorage.setItem('scholarMind_bookmarks', JSON.stringify(bookmarks));
  }, [bookmarks]);

  // Effect: Persist the Gemini key where the visitor asked
  useEffect(() => {
    setGeminiConfig(geminiConfig);
    try {
      const data = JSON.stringify(geminiConfig);
      if (!hasKey) {
        localStorage.removeItem('scholarMind_gemini');
        sessionStorage.removeItem('scholarMind_gemini');
      } else if (geminiConfig.remember) {
        localStorage.setItem('scholarMind_gemini', data);
        sessionStorage.removeItem('scholarMind_gemini');
      } else {
        sessionStorage.setItem('scholarMind_gemini', data);
        localStorage.removeItem('scholarMind_gemini');
      }
    } catch (e) {
      // storage blocked: the key still works for this page view
    }
  }, [geminiConfig]);

  useEffect(() => {
    document.documentElement.lang = uiLanguage === 'zh' ? 'zh-CN' : uiLanguage;
  }, [uiLanguage]);

  // Effect: Persist Custom AI Config
  useEffect(() => {
    localStorage.setItem('scholarMind_customAI', JSON.stringify(customAiConfig));
  }, [customAiConfig]);

  // Effect: When analysis completes, update user interest profile
  useEffect(() => {
    if (result && result.keywords) {
      const newKeywords = result.keywords.slice(0, 5).map(k => k.word);
      setUserInterests(prev => {
        // Simple distinct merge
        const combined = new Set([...prev, ...newKeywords]);
        return Array.from(combined);
      });
    }
  }, [result]);

  const errorText = (error: unknown) => {
    const raw = error instanceof Error ? error.message : String(error);
    // fetch() itself failed: endpoint unreachable (common where Google is blocked) or refused by CORS
    if (/^(Failed to fetch|NetworkError|Load failed)/.test(raw)) return t.networkError;
    // The SDK wraps the API's JSON body; surface its message when there is one
    const m = raw.match(/"message"\s*:\s*"([^"]+)"/);
    return (m ? m[1] : raw).slice(0, 300);
  };

  const reportError = (error: unknown) => {
    if (error instanceof MissingKeyError) {
      setActiveTab('settings');
      return;
    }
    setAiNotice(t.requestFailed + errorText(error));
  };

  // Sends the visitor to Settings when no key is bound yet
  const requireKey = () => {
    if (hasKey) return true;
    setActiveTab('settings');
    return false;
  };

  const handleAnalyze = async () => {
    if (!inputText.trim() || !requireKey()) return;
    setAiNotice(null);
    setStatus(AnalysisStatus.ANALYZING);
    try {
      const data = await analyzePaper(inputText, uiLanguage);
      setResult(data);
      setStatus(AnalysisStatus.COMPLETE);
    } catch (error) {
      console.error(error);
      setAiNotice(t.requestFailed + errorText(error));
      setStatus(AnalysisStatus.ERROR);
    }
  };

  const handleExtendedAnalysis = async () => {
    if (!inputText) return;
    // Don't re-run if already exists, unless forcing retry (handled by clearing state before calling)
    if (extendedAnalysis) return;
    if (!customAiConfig.isEnabled && !requireKey()) return;

    setIsAnalysisLoading(true);
    try {
      const text = await generateExtendedAnalysis(inputText, uiLanguage, customAiConfig);
      setExtendedAnalysis(text);
    } catch (e) {
      reportError(e);
      setExtendedAnalysis("Failed to generate analysis.");
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleRetryAnalysis = async () => {
    if (!inputText) return;
    if (!customAiConfig.isEnabled && !requireKey()) return;
    
    // Clear previous analysis immediately
    setExtendedAnalysis(null);
    setIsAnalysisLoading(true);
    
    try {
      // Ensure we use the current 'uiLanguage' state so the re-generation matches the user's preference
      const text = await generateExtendedAnalysis(inputText, uiLanguage, customAiConfig);
      setExtendedAnalysis(text);
    } catch (e) {
      console.error("Retry failed:", e);
      reportError(e);
      // Localize the error message based on current language
      const errorMsg = uiLanguage === 'zh' 
        ? "无法重新生成分析报告，请检查网络或配置后重试。" 
        : uiLanguage === 'ko'
        ? "분석 보고서를 재생성할 수 없습니다. 네트워크 연결 또는 설정을 확인하고 다시 시도하세요."
        : uiLanguage === 'ja'
        ? "分析レポートを再生成できませんでした。ネットワーク接続または設定を確認して、もう一度お試しください。"
        : "Failed to regenerate analysis. Please check your connection or settings and try again.";
      setExtendedAnalysis(errorMsg);
    } finally {
      setIsAnalysisLoading(false);
    }
  };

  const handleDownload = async (format: 'md' | 'txt') => {
    if (!extendedAnalysis) return;
    
    const extension = format === 'md' ? 'md' : 'txt';
    const mimeType = format === 'md' ? 'text/markdown' : 'text/plain';
    const timestamp = new Date().toISOString().slice(0, 10);
    const suggestedName = `scholar_mind_analysis_${timestamp}.${extension}`;
    
    // Helper function for fallback download
    const downloadViaBlob = () => {
      const blob = new Blob([extendedAnalysis], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = suggestedName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    };

    try {
      // Modern browsers (Chrome, Edge, Opera) support File System Access API
      // We check for existence, but it might still fail in iframes with SecurityError
      if ('showSaveFilePicker' in window) {
        const options = {
          suggestedName: suggestedName,
          types: [
            {
              description: format === 'md' ? 'Markdown File' : 'Text File',
              accept: {
                [mimeType]: [`.${extension}`],
              },
            },
          ],
        };
        
        // @ts-ignore - TS might not know about showSaveFilePicker yet
        const fileHandle = await window.showSaveFilePicker(options);
        const writable = await fileHandle.createWritable();
        await writable.write(extendedAnalysis);
        await writable.close();
      } else {
        downloadViaBlob();
      }
    } catch (error: any) {
      // If user cancelled, do nothing
      if (error.name === 'AbortError') {
        return;
      }
      
      // Fallback for SecurityError (iframe restriction) or other unforeseen errors
      console.warn('File System Access API failed, falling back to legacy download:', error);
      downloadViaBlob();
    }
  };

  const handleTranslate = async () => {
    if (!inputText || !requireKey()) return;
    setIsTranslating(true);
    try {
      const text = await translateText(inputText, targetLang);
      setTranslatedText(text);
    } catch (e) {
      reportError(e);
      setTranslatedText("");
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopyTranslation = () => {
    if (!translatedText) return;
    navigator.clipboard.writeText(translatedText);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleContextualSearch = async () => {
    if (!result?.keywords || relatedPapers.length > 0 || !requireKey()) return;
    setIsSearchingContextual(true);
    try {
      const topKeywords = result.keywords.slice(0, 3).map(k => k.word).join(" ");
      const papers = await findRelatedWork(`Academic papers about ${topKeywords}`);
      setRelatedPapers(papers);
    } catch (e) {
      reportError(e);
    } finally {
      setIsSearchingContextual(false);
    }
  };

  const handlePersonalizedRecommendation = async () => {
    if (userInterests.length === 0 || !requireKey()) return;
    setIsSearchingPersonal(true);
    try {
      // Pick up to 4 random interests to diversify query
      const shuffled = [...userInterests].sort(() => 0.5 - Math.random());
      const queryTerms = shuffled.slice(0, 4).join(", ");
      const papers = await findRelatedWork(`Latest academic research papers regarding: ${queryTerms}`);
      setRecommendedPapers(papers);
    } catch (e) {
      reportError(e);
    } finally {
      setIsSearchingPersonal(false);
    }
  };

  const handleWebSearch = async () => {
    if (!searchQuery.trim() || !requireKey()) return;
    setIsSearchingWeb(true);
    setSearchResult(null);
    try {
      const data = await performWebSearch(searchQuery, uiLanguage);
      setSearchResult(data);
    } catch (e) {
       console.error(e);
       reportError(e);
    } finally {
      setIsSearchingWeb(false);
    }
  };

  const handleCheckModels = async () => {
    if (!customAiConfig.baseUrl || !customAiConfig.apiKey) return;
    setIsCheckingModels(true);
    setModelFetchError(null);
    setModelFetchSuccess(null);
    try {
      const models = await fetchCustomModels(customAiConfig.baseUrl, customAiConfig.apiKey);
      setAvailableModels(models);
      setModelFetchSuccess(`Found ${models.length} models.`);
      if (models.length > 0 && !customAiConfig.selectedModel) {
        setCustomAiConfig(prev => ({ ...prev, selectedModel: models[0].id }));
      }
    } catch (err) {
      setModelFetchError("Failed to fetch models. Check URL/Key.");
      setAvailableModels([]);
    } finally {
      setIsCheckingModels(false);
    }
  };

  const handleCheckKey = async () => {
    if (!hasKey) return;
    setIsCheckingKey(true);
    setKeyCheckError(null);
    setKeyCheckSuccess(null);
    try {
      const models = await listGeminiModels(geminiConfig.apiKey, geminiConfig.baseUrl);
      setGeminiModels(models);
      setKeyCheckSuccess(t.keyVerified.replace('{n}', String(models.length)));
      setGeminiConfigState(prev => ({
        ...prev,
        fastModel: models.some(m => m.id === prev.fastModel) ? prev.fastModel : pickModel(models, 'flash', DEFAULT_FAST_MODEL),
        smartModel: models.some(m => m.id === prev.smartModel) ? prev.smartModel : pickModel(models, 'pro', DEFAULT_SMART_MODEL),
      }));
    } catch (err) {
      setGeminiModels([]);
      setKeyCheckError(t.keyCheckFailed + errorText(err));
    } finally {
      setIsCheckingKey(false);
    }
  };

  const handleUnbindKey = () => {
    setGeminiConfigState(prev => ({ ...prev, apiKey: '', fastModel: '', smartModel: '' }));
    setGeminiModels([]);
    setKeyCheckError(null);
    setKeyCheckSuccess(null);
  };

  const handleClearData = () => {
    localStorage.removeItem('scholarMind_interests');
    localStorage.removeItem('scholarMind_bookmarks');
    setUserInterests([]);
    setBookmarks([]);
    setIsConfirmingClear(false);
  };

  const toggleBookmark = (paper: RelatedPaper) => {
    setBookmarks(prev => {
      const exists = prev.find(p => p.url === paper.url);
      if (exists) return prev.filter(p => p.url !== paper.url);
      return [...prev, paper];
    });
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Robust file type checking: use type if available, fallback to extension
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isTxt = file.type === 'text/plain' || file.name.toLowerCase().endsWith('.txt');

    if (!isPdf && !isTxt) {
      alert("Please upload a PDF or TXT file.");
      return;
    }

    setIsExtracting(true);
    try {
      if (isPdf) {
        const arrayBuffer = await file.arrayBuffer();
        const pdfjsLib = await loadPdfjs();
        const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
        let fullText = '';
        
        // Limit to first 10 pages to avoid performance issues
        const maxPages = Math.min(pdf.numPages, 10);
        
        for (let i = 1; i <= maxPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          const pageText = textContent.items.map((item: any) => item.str).join(' ');
          fullText += pageText + '\n\n';
        }
        setInputText(fullText);
      } else if (isTxt) {
        const text = await file.text();
        setInputText(text);
      }
    } catch (error) {
      console.error("File extraction error:", error);
      alert("Failed to extract text from file.");
    } finally {
      setIsExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleStartNew = () => {
    setStatus(AnalysisStatus.IDLE);
    setInputText('');
    setResult(null);
    setExtendedAnalysis(null);
    setTranslatedText('');
    setRelatedPapers([]);
    setActiveTab('dashboard');
  };

  const getDifficultyColor = (score: number) => {
    if (score < 40) return 'text-emerald-700 bg-emerald-50 border border-emerald-100';
    if (score < 70) return 'text-amber-700 bg-amber-50 border border-amber-100';
    return 'text-rose-700 bg-rose-50 border border-rose-100';
  };

  const getProgressColor = (score: number) => {
    if (score < 40) return 'bg-emerald-500';
    if (score < 70) return 'bg-amber-500';
    return 'bg-rose-500';
  };

  const getLocalizedDifficulty = (level: string) => {
    if (uiLanguage === 'en') return level;
    
    // Common mappings
    const lower = level.toLowerCase();
    
    if (uiLanguage === 'zh') {
      if (lower.includes('elementary')) return '初级';
      if (lower.includes('intermediate')) return '中级';
      if (lower.includes('advanced')) return '高级';
      if (lower.includes('expert')) return '专家级';
    }
    
    if (uiLanguage === 'ko') {
      if (lower.includes('elementary')) return '초급';
      if (lower.includes('intermediate')) return '중급';
      if (lower.includes('advanced')) return '고급';
      if (lower.includes('expert')) return '전문가';
    }
    
    if (uiLanguage === 'ja') {
      if (lower.includes('elementary')) return '初級';
      if (lower.includes('intermediate')) return '中級';
      if (lower.includes('advanced')) return '上級';
      if (lower.includes('expert')) return '専門家';
    }

    return level;
  };

  const getLanguageLabel = (lang: UILanguage) => {
    switch (lang) {
      case 'zh': return '简体中文';
      case 'ko': return '한국어';
      case 'ja': return '日本語';
      case 'en': 
      default: return 'English';
    }
  }

  const cycleLanguage = () => {
    setUiLanguage(prev => {
      if (prev === 'en') return 'zh';
      if (prev === 'zh') return 'ko';
      if (prev === 'ko') return 'ja';
      return 'en';
    });
  }

  const removeMarkdownSymbols = (text: string) => {
    if (!text) return "";
    // Remove **bold** markers
    let cleaned = text.replace(/\*\*(.*?)\*\*/g, '$1');
    // Remove __bold__ markers
    cleaned = cleaned.replace(/__(.*?)__/g, '$1');
    // Remove single *italic* markers using refined negative lookbehind/lookahead
    // Matches *text* where * is not preceded by start/newline and followed by non-space
    cleaned = cleaned.replace(/(?<!^)(?<!\n)\*(?=[^\s])(.*?)(?<=[^\s])\*/g, '$1'); 
    return cleaned;
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row font-serif text-stone-800 bg-stone-50 selection:bg-stone-200">
      
      {/* Sidebar Navigation */}
      <aside className="fixed bottom-0 inset-x-0 md:inset-auto md:sticky md:top-0 w-full md:w-20 lg:w-64 bg-[#f7f7f5] border-t md:border-t-0 md:border-r border-stone-200 flex-shrink-0 flex flex-row md:flex-col h-auto md:min-h-screen z-30">
        <div className="hidden md:flex p-6 items-center justify-between">
          <div className="flex items-center gap-3 group cursor-pointer">
             {/* Logo Mark */}
             <div className="w-10 h-10 bg-stone-900 rounded-xl flex items-center justify-center shadow-[0_2px_10px_-4px_rgba(0,0,0,0.2)] text-stone-50 transition-transform group-hover:scale-105">
                <BookOpen size={20} strokeWidth={2} />
             </div>
             {/* Text Lockup */}
             <div className="hidden lg:flex flex-col">
                <span className="font-serif font-bold text-xl text-stone-900 tracking-tight leading-none">ScholarMind</span>
                <span className="text-[10px] font-sans font-medium text-stone-400 uppercase tracking-[0.2em] mt-1">Academic AI</span>
             </div>
          </div>
        </div>
        
        {/* Language Toggle */}
        <div className="hidden md:flex px-4 py-4 border-b border-stone-200 justify-center lg:justify-start relative">
           <button 
             onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
             className="flex items-center gap-2 bg-white hover:bg-stone-100 border border-stone-200 text-stone-600 px-3 py-1.5 rounded-full text-sm transition-colors shadow-sm w-full lg:w-auto justify-center lg:justify-start"
           >
             <Languages size={16} />
             <span className="hidden lg:block flex-1 text-left">{getLanguageLabel(uiLanguage)}</span>
             <ChevronDown size={14} className={`hidden lg:block transition-transform ${isLangMenuOpen ? 'rotate-180' : ''}`} />
           </button>

           {isLangMenuOpen && (
              <div className="absolute top-16 left-4 right-4 lg:right-auto lg:w-40 bg-white border border-stone-200 rounded-xl shadow-xl z-50 overflow-hidden flex flex-col py-1 animate-in fade-in zoom-in-95 duration-200">
                 {(['en', 'zh', 'ko', 'ja'] as UILanguage[]).map((lang) => (
                    <button 
                      key={lang}
                      onClick={() => { setUiLanguage(lang); setIsLangMenuOpen(false); }} 
                      className={`px-4 py-2.5 text-left text-sm hover:bg-stone-50 flex items-center justify-between ${uiLanguage === lang ? 'text-stone-900 font-medium bg-stone-50' : 'text-stone-600'}`}
                    >
                      {getLanguageLabel(lang)}
                      {uiLanguage === lang && <Check size={14} className="text-stone-800" />}
                    </button>
                 ))}
              </div>
           )}
        </div>

        <nav className="flex-1 flex md:block justify-around p-1.5 md:p-4 md:space-y-2">
          <button aria-label={t.analysis} title={t.analysis} 
            onClick={() => setActiveTab('dashboard')}
            className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'dashboard' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'}`}
          >
            <Activity size={20} className={activeTab === 'dashboard' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.analysis}</span>
          </button>

          <button aria-label={t.translation} title={t.translation} 
             onClick={() => setActiveTab('translation')}
             disabled={!result}
             className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'translation' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'} ${!result ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Globe size={20} className={activeTab === 'translation' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.translation}</span>
          </button>

          <button aria-label={t.critique} title={t.critique} 
             onClick={() => { setActiveTab('critique'); if (result) handleExtendedAnalysis(); }}
             disabled={!result}
             className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'critique' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'} ${!result ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Lightbulb size={20} className={activeTab === 'critique' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.critique}</span>
          </button>

          <button aria-label={t.discovery} title={t.discovery} 
            onClick={() => { setActiveTab('discovery'); if (result) handleContextualSearch(); }}
            disabled={!result}
            className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'discovery' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'} ${!result ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <Compass size={20} className={activeTab === 'discovery' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.discovery}</span>
          </button>
          
          <button aria-label={t.webSearch} title={t.webSearch} 
            onClick={() => setActiveTab('search')}
            className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'search' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'}`}
          >
            <Search size={20} className={activeTab === 'search' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.webSearch}</span>
          </button>

          <button aria-label={t.settings} title={t.settings} 
            onClick={() => setActiveTab('settings')}
            className={`md:w-full flex items-center justify-center lg:justify-start gap-3 px-3 md:px-4 py-3 rounded-lg transition-all duration-200 ${activeTab === 'settings' ? 'bg-white text-stone-900 shadow-sm ring-1 ring-stone-950/5 font-medium' : 'text-stone-500 hover:bg-stone-200/50 hover:text-stone-800'}`}
          >
            <SettingsIcon size={20} className={activeTab === 'settings' ? 'text-stone-800' : 'text-stone-400'} />
            <span className="hidden lg:block">{t.settings}</span>
          </button>
        </nav>

        {/* User Stats Mini View - Interactive */}
        <button 
           onClick={() => setActiveTab('library')}
           className={`w-full text-left p-4 border-t border-stone-200 hidden lg:block transition-all duration-200 group ${activeTab === 'library' ? 'bg-stone-100' : 'hover:bg-stone-50'}`}
        >
           <div className={`text-xs font-semibold uppercase tracking-wider mb-3 transition-colors ${activeTab === 'library' ? 'text-stone-900' : 'text-stone-400 group-hover:text-stone-600'}`}>
              {t.myLibrary}
           </div>
           <div className="flex items-center gap-2 mb-2 text-stone-600 text-sm">
             <Bookmark size={16} className={activeTab === 'library' ? "text-stone-800" : "text-stone-400"}/>
             <span>{bookmarks.length} {t.savedPapers}</span>
           </div>
           <div className="flex items-center gap-2 text-stone-600 text-sm">
             <Sparkles size={16} className={activeTab === 'library' ? "text-stone-800" : "text-stone-400"}/>
             <span>{userInterests.length} {t.topicsTracked}</span>
           </div>
        </button>

        <div className="p-1.5 md:p-4 md:border-t border-stone-200">
          <button 
            onClick={() => setIsChatOpen(true)}
            aria-label={t.askPaper}
            disabled={!result}
            className={`w-full flex items-center justify-center gap-2 bg-stone-900 hover:bg-stone-800 text-stone-50 p-3 rounded-xl font-medium transition-all shadow-lg shadow-stone-900/10 ${!result ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            <MessageSquare size={18} />
            <span className="hidden lg:block">{t.askPaper}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 bg-[#fafaf9] min-h-screen relative overflow-x-hidden pb-20 md:pb-0">
        
        {/* Top Bar (Mobile Title) */}
        <div className="md:hidden bg-[#f7f7f5] text-stone-900 p-4 flex items-center justify-between sticky top-0 z-20 border-b border-stone-200">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-stone-900 rounded-lg flex items-center justify-center text-stone-50 shadow-sm">
               <BookOpen size={16} strokeWidth={2} />
            </div>
            <span className="font-serif font-bold text-lg text-stone-900 tracking-tight">ScholarMind</span>
          </div>
          <button 
             onClick={cycleLanguage}
             className="bg-white border border-stone-200 text-stone-600 px-3 py-1 rounded text-xs"
           >
             {uiLanguage === 'en' ? 'EN' : uiLanguage === 'zh' ? '中' : uiLanguage === 'ko' ? '한' : '日'}
           </button>
        </div>

        <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">

          {aiNotice && (
            <div role="alert" className="max-w-3xl mx-auto flex items-start gap-3 bg-rose-50 border border-rose-100 text-rose-800 px-4 py-3 rounded-xl text-sm">
              <AlertTriangle size={18} className="flex-shrink-0 mt-0.5" />
              <p className="flex-1 break-words">{aiNotice}</p>
              <button onClick={() => setAiNotice(null)} aria-label={t.dismiss} className="text-rose-400 hover:text-rose-700">
                <XIcon size={16} />
              </button>
            </div>
          )}
          
          {/* Input Section - Only show if no result and not in settings */}
          {status === AnalysisStatus.IDLE && activeTab !== 'settings' && activeTab !== 'library' && activeTab !== 'search' && (
            <div className="bg-white rounded-2xl shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] border border-stone-200 p-6 md:p-12 text-center space-y-8 max-w-3xl mx-auto mt-10">
              <div className="w-16 h-16 bg-stone-100 text-stone-600 rounded-full flex items-center justify-center mx-auto mb-4 ring-1 ring-stone-950/5">
                <FileText size={32} strokeWidth={1.5} />
              </div>
              <div>
                <h2 className="text-3xl md:text-4xl font-light text-stone-900 mb-4 tracking-tight">{t.evaluateTitle}</h2>
                <p className="text-stone-500 max-w-lg mx-auto leading-relaxed">
                  {t.evaluateSubtitle}
                </p>
              </div>

              {!hasKey && (
                <div className="flex flex-col sm:flex-row items-center gap-4 text-left bg-amber-50 border border-amber-200 rounded-xl p-5">
                  <div className="p-2 bg-white rounded-lg text-amber-600 ring-1 ring-amber-200">
                    <Key size={20} />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-stone-800">{t.needKeyTitle}</p>
                    <p className="text-sm text-stone-600 mt-1">{t.needKeyDesc}</p>
                  </div>
                  <button
                    onClick={() => setActiveTab('settings')}
                    className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-lg text-sm font-medium whitespace-nowrap"
                  >
                    {t.bindKeyBtn}
                  </button>
                </div>
              )}
              
              <div className="relative group">
                {isExtracting && (
                  <div className="absolute inset-0 z-10 bg-white/80 flex flex-col items-center justify-center rounded-xl backdrop-blur-sm">
                    <Loader2 className="animate-spin text-stone-800 mb-2" size={32} />
                    <p className="text-stone-600 font-medium">{t.extracting}</p>
                  </div>
                )}
                <textarea
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  placeholder={t.placeholder}
                  className="w-full h-48 p-6 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-200 focus:border-stone-400 focus:outline-none resize-none transition-all text-sm md:text-base placeholder:text-stone-400"
                />
                <div className="absolute bottom-4 right-4 flex gap-2">
                  <input 
                    type="file" 
                    accept=".pdf,.txt,application/pdf,text/plain" 
                    onChange={handleFileUpload} 
                    className="hidden" 
                    ref={fileInputRef}
                  />
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs text-stone-400 hover:text-stone-700 font-medium px-3 py-1 rounded-md hover:bg-stone-100 transition flex items-center gap-1"
                  >
                    <UploadCloud size={14} />
                    {t.uploadPdf}
                  </button>
                  <button 
                    onClick={() => setInputText(SAMPLE_TEXT_EN)}
                    className="text-xs text-stone-400 hover:text-stone-700 font-medium px-3 py-1 rounded-md hover:bg-stone-100 transition"
                  >
                    {t.loadSampleEn}
                  </button>
                  <button 
                    onClick={() => setInputText(SAMPLE_TEXT_CN)}
                    className="text-xs text-stone-400 hover:text-stone-700 font-medium px-3 py-1 rounded-md hover:bg-stone-100 transition"
                  >
                    {t.loadSampleZh}
                  </button>
                </div>
              </div>

              <button
                onClick={handleAnalyze}
                disabled={!inputText}
                className="w-full md:w-auto px-10 py-3.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl font-medium flex items-center justify-center gap-2 mx-auto transition-transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:scale-100 shadow-xl shadow-stone-900/10"
              >
                <UploadCloud size={20} />
                {t.analyzeBtn}
              </button>
            </div>
          )}

          {/* Loading State with Skeleton */}
          {status === AnalysisStatus.ANALYZING && (
            <div className="space-y-8 animate-fade-in max-w-7xl mx-auto min-h-[60vh] flex flex-col justify-center">
               <div className="flex flex-col items-center justify-center py-8 text-center space-y-4">
                  <Loader2 className="w-8 h-8 text-stone-800 animate-spin" />
                  <p className="text-stone-500 font-serif text-lg animate-pulse">{loadingMessage}</p>
               </div>
               
               {/* Dashboard Skeleton */}
               <div className="opacity-40 pointer-events-none transition-all duration-500 blur-[0.5px]">
                  <div className="flex justify-between items-center mb-6">
                    <div className="h-8 bg-stone-200 rounded w-48"></div>
                    <div className="h-4 bg-stone-200 rounded w-24"></div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                     <div className="md:col-span-2 bg-white p-8 rounded-xl border border-stone-200 min-h-[250px]">
                        <div className="h-6 bg-stone-200 rounded w-1/4 mb-6"></div>
                        <div className="space-y-4">
                           <div className="h-4 bg-stone-100 rounded w-full"></div>
                           <div className="h-4 bg-stone-100 rounded w-full"></div>
                           <div className="h-4 bg-stone-100 rounded w-11/12"></div>
                           <div className="h-4 bg-stone-100 rounded w-full"></div>
                        </div>
                        <div className="mt-8 pt-6 border-t border-stone-100">
                           <div className="h-4 bg-stone-100 rounded w-32 mb-4"></div>
                           <div className="flex gap-2">
                             <div className="h-8 bg-stone-100 rounded w-20"></div>
                             <div className="h-8 bg-stone-100 rounded w-24"></div>
                           </div>
                        </div>
                     </div>
                     <div className="bg-white p-8 rounded-xl border border-stone-200 min-h-[250px]">
                        <div className="h-6 bg-stone-200 rounded w-1/2 mb-6"></div>
                        <div className="h-24 bg-stone-50 rounded-full w-24 mb-6"></div>
                        <div className="h-4 bg-stone-100 rounded w-full"></div>
                     </div>
                  </div>
                  <div className="mt-6 bg-white rounded-xl border border-stone-200 h-[300px]"></div>
               </div>
            </div>
          )}

           {/* Error State */}
           {status === AnalysisStatus.ERROR && (
            <div className="bg-rose-50 border border-rose-100 text-rose-800 p-8 rounded-xl text-center shadow-sm">
              <p>{t.error}</p>
              <button onClick={() => { setStatus(AnalysisStatus.IDLE); setAiNotice(null); }} className="mt-4 text-sm font-semibold hover:text-rose-950 underline decoration-rose-300 underline-offset-4">{t.tryAgain}</button>
            </div>
          )}

          {/* Web Search View */}
          {activeTab === 'search' && (
             <div className="max-w-4xl mx-auto mt-6">
                <div className="bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 overflow-hidden flex flex-col min-h-[80vh]">
                   {/* Search Header - Sticky */}
                   <div className="p-6 md:p-8 border-b border-stone-100 bg-white sticky top-0 z-10 shadow-sm">
                      <div className="flex flex-col space-y-4">
                         <div className="flex items-center gap-3 mb-1">
                            <Search className="text-stone-800" size={24} strokeWidth={1.5} />
                            <h2 className="text-2xl font-light text-stone-900">{t.webSearch}</h2>
                         </div>
                         <div className="flex gap-3">
                            <div className="relative flex-1">
                               <input 
                                  type="text" 
                                  value={searchQuery}
                                  onChange={(e) => setSearchQuery(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && handleWebSearch()}
                                  placeholder={t.searchPlaceholder}
                                  className="w-full pl-4 pr-4 py-3 bg-stone-50 border border-stone-200 rounded-xl focus:ring-2 focus:ring-stone-200 focus:border-stone-400 focus:outline-none transition-all font-serif placeholder:text-stone-400 text-lg"
                               />
                            </div>
                            <button 
                               onClick={handleWebSearch}
                               disabled={isSearchingWeb || !searchQuery.trim()}
                               className="px-6 py-3 bg-stone-900 text-white rounded-xl font-medium hover:bg-stone-800 disabled:opacity-50 transition-all shadow-lg shadow-stone-900/10 flex items-center gap-2 flex-shrink-0"
                            >
                               {isSearchingWeb ? <Loader2 className="animate-spin" size={18} /> : <Search size={18} />}
                               {t.searchBtn}
                            </button>
                         </div>
                      </div>
                   </div>
                   
                   {/* Results Area */}
                   <div className="flex-1 bg-[#fafaf9] overflow-y-auto" ref={searchResultsRef}>
                      {isSearchingWeb ? (
                         <div className="p-8 md:p-12 max-w-3xl mx-auto space-y-8 animate-pulse">
                            <div className="h-6 bg-stone-200 rounded w-1/3 mb-8"></div>
                            <div className="space-y-4">
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-5/6"></div>
                            </div>
                            <div className="space-y-4 pt-4">
                                <div className="h-4 bg-stone-200 rounded w-11/12"></div>
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-4/5"></div>
                            </div>
                            <div className="h-40 bg-stone-200 rounded-xl w-full mt-8"></div>
                         </div>
                      ) : searchResult ? (
                         <div className="animate-fade-in p-8 md:p-12">
                            {/* Main Content Container */}
                            <div className="max-w-3xl mx-auto">
                                <div className="prose prose-stone prose-lg max-w-none prose-p:leading-loose prose-headings:font-light prose-strong:font-normal prose-strong:text-stone-900">
                                   <ReactMarkdown
                                      components={{
                                         h1: ({node, ...props}) => <h1 className="text-3xl font-light text-stone-900 mb-8 mt-4 tracking-tight" {...props} />,
                                         h2: ({node, ...props}) => <h2 className="text-2xl font-light text-stone-900 mt-12 mb-6 pb-3 border-b border-stone-200 tracking-tight" {...props} />,
                                         h3: ({node, ...props}) => <h3 className="text-xl font-medium text-stone-800 mt-10 mb-4" {...props} />,
                                         p: ({node, ...props}) => <p className="leading-9 text-stone-700 mb-6 text-lg font-serif" {...props} />,
                                         ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-8 space-y-3 text-stone-700 marker:text-stone-400" {...props} />,
                                         ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-8 space-y-3 text-stone-700 marker:text-stone-400" {...props} />,
                                         li: ({node, ...props}) => <li className="leading-8 pl-2" {...props} />,
                                         blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-stone-300 pl-6 italic my-10 text-stone-500 py-2 bg-stone-100/50 rounded-r-lg" {...props} />,
                                         a: ({node, ...props}) => <a className="text-stone-900 underline decoration-stone-300 hover:decoration-stone-600 transition-all underline-offset-4" {...props} target="_blank" rel="noopener noreferrer" />,
                                      }}
                                   >
                                      {removeMarkdownSymbols(searchResult.text)}
                                   </ReactMarkdown>
                                </div>
                                
                                {searchResult.sources.length > 0 && (
                                   <div className="border-t border-stone-200 pt-10 mt-16">
                                      <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-6 flex items-center gap-2">
                                         <ShieldCheck size={14} className="text-emerald-600" />
                                         {t.sources}
                                      </h3>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                         {searchResult.sources.map((source, idx) => (
                                            <a 
                                               key={idx} 
                                               href={source.url} 
                                               target="_blank" 
                                               rel="noopener noreferrer"
                                               className="flex flex-col p-5 rounded-xl border border-stone-200 bg-white hover:border-stone-400 hover:shadow-lg hover:-translate-y-1 transition-all group duration-300 h-full"
                                            >
                                               <div className="flex items-start justify-between mb-3">
                                                  <div className="p-2 bg-stone-50 rounded-lg text-stone-400 group-hover:text-stone-900 group-hover:bg-stone-200 transition-colors">
                                                     <ExternalLink size={16} />
                                                  </div>
                                                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-100 opacity-100 transition-opacity">
                                                     Verified
                                                  </span>
                                               </div>
                                               
                                               <div className="text-base font-serif font-medium text-stone-900 group-hover:underline decoration-stone-300 underline-offset-4 mb-auto leading-snug">
                                                  {source.title}
                                               </div>
                                               
                                               <div className="mt-4 pt-3 border-t border-stone-50 flex items-center gap-2 text-xs text-stone-400 font-mono truncate">
                                                  <LinkIcon size={12} />
                                                  {new URL(source.url).hostname.replace('www.', '')}
                                               </div>
                                            </a>
                                         ))}
                                      </div>
                                   </div>
                                )}
                            </div>
                         </div>
                      ) : (
                         <div className="h-full flex flex-col items-center justify-center text-stone-300 italic gap-6 opacity-60 min-h-[400px]">
                            <div className="p-6 bg-stone-100 rounded-full">
                                <Search size={48} strokeWidth={1} />
                            </div>
                            <p className="font-light text-lg max-w-md text-center">{t.searchPlaceholder}</p>
                         </div>
                      )}
                   </div>
                </div>
             </div>
          )}

          {/* Dashboard View */}
          {status === AnalysisStatus.COMPLETE && result && activeTab === 'dashboard' && (
            <div className="space-y-6 animate-fade-in">
              <div className="flex justify-between items-center mb-6">
                <h1 className="text-3xl font-light text-stone-900 tracking-tight">{t.analysisReport}</h1>
                <button onClick={handleStartNew} className="text-sm text-stone-500 hover:text-stone-900 underline decoration-stone-300 underline-offset-4">{t.startNew}</button>
              </div>

              {/* Summary and Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Executive Summary & Keywords */}
                <div className="md:col-span-2 bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                  <div className="flex items-center gap-2 mb-6 text-stone-700 border-b border-stone-100 pb-4">
                    <Layers size={20} strokeWidth={1.5} />
                    <h3 className="font-medium tracking-wide">{t.summaryTitle}</h3>
                  </div>
                  <p className="text-stone-600 leading-loose text-base md:text-lg font-serif">
                    {result.summary}
                  </p>
                  
                  <div className="mt-8 pt-6 border-t border-stone-100">
                     <h4 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-4">{t.extractedKeywords}</h4>
                     <div className="flex flex-wrap gap-2">
                        {result.keywords.slice(0, 5).map((kw, i) => (
                           <span key={i} className="px-3 py-1.5 bg-stone-50 text-stone-600 rounded-md text-sm border border-stone-200">
                              {kw.word}
                           </span>
                        ))}
                     </div>
                  </div>
                </div>

                {/* Difficulty Score */}
                <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 flex flex-col justify-between">
                  <div className="flex items-center gap-2 mb-4 text-stone-400">
                    <Award size={20} strokeWidth={1.5} />
                    <h3 className="font-semibold text-xs uppercase tracking-widest">{t.readability}</h3>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-2 mb-3 cursor-help" title={t.readabilityTooltip}>
                      <span className="text-6xl font-light text-stone-900">{result.difficulty.score}</span>
                      <span className="text-stone-400 font-medium mb-2 text-lg">/100</span>
                    </div>

                    {/* Progress Bar Visualization */}
                    <div className="w-full bg-stone-100 rounded-full h-2 mb-6 overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ease-out ${getProgressColor(result.difficulty.score)}`}
                        style={{ width: `${result.difficulty.score}%` }}
                      ></div>
                    </div>

                    <div 
                      className={`inline-block px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide cursor-help ${getDifficultyColor(result.difficulty.score)}`}
                      title={t.readabilityTooltip}
                    >
                      {getLocalizedDifficulty(result.difficulty.level)}
                    </div>
                  </div>
                  <p className="text-sm text-stone-500 mt-6 leading-relaxed border-t border-stone-100 pt-4">{result.difficulty.explanation}</p>
                </div>
              </div>

               {/* Detailed Metrics Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Entity Category Chart */}
                  <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                    <div className="flex items-center gap-2 mb-6 text-stone-700">
                      <Tag size={20} strokeWidth={1.5} />
                      <h3 className="font-medium tracking-wide">{t.entityDist}</h3>
                    </div>
                    <div className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={entityCategoryData} layout="vertical" margin={{ left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                          <XAxis type="number" hide />
                          <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 12, fontFamily: 'Source Serif 4'}} />
                          <Tooltip 
                            cursor={{fill: '#f5f5f4'}}
                            contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}}
                          />
                          <Bar dataKey="value" fill="#57534e" radius={[0, 4, 4, 0]} barSize={20}>
                            {entityCategoryData.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Text Stats & Keyword Scores */}
                  <div className="flex flex-col gap-6">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-6">
                        <div className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                          <div className="flex items-center gap-2 text-stone-400 mb-2">
                              <FileText size={16} />
                              <span className="text-xs font-bold uppercase tracking-wider">{t.avgSentence}</span>
                          </div>
                          <div className="text-2xl font-light text-stone-900">
                              {result.difficulty.avgSentenceLength} <span className="text-sm text-stone-400">{t.words}</span>
                          </div>
                        </div>
                        <div className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                          <div className="flex items-center gap-2 text-stone-400 mb-2">
                              <Activity size={16} />
                              <span className="text-xs font-bold uppercase tracking-wider">{t.techDensity}</span>
                          </div>
                          <div className="text-2xl font-light text-stone-900">
                              {(result.difficulty.technicalTermDensity * 100).toFixed(1)}%
                          </div>
                        </div>
                    </div>

                    {/* Keyword Chart */}
                    <div className="bg-white p-6 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 flex-1">
                        <div className="flex items-center gap-2 mb-4 text-stone-700">
                          <Key size={18} strokeWidth={1.5} />
                          <h3 className="font-medium tracking-wide">{t.topKeywords}</h3>
                        </div>
                        <div className="h-40">
                          <ResponsiveContainer width="100%" height="100%">
                              <BarChart data={result.keywords.slice(0,5)}>
                                <XAxis dataKey="word" tick={{fontSize: 10}} interval={0} />
                                <Tooltip cursor={{fill: '#f5f5f4'}} />
                                <Bar dataKey="score" fill="#a8a29e" radius={[4, 4, 0, 0]} />
                              </BarChart>
                          </ResponsiveContainer>
                        </div>
                    </div>
                  </div>
              </div>

              {/* Concept Graph */}
              <div className="bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 overflow-hidden">
                <div className="p-4 px-6 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
                  <div className="flex items-center gap-2 text-stone-700">
                    <Share2 size={18} strokeWidth={1.5} />
                    <h3 className="font-medium tracking-wide">{t.knowledgeGraph}</h3>
                  </div>
                  <span className="text-xs text-stone-400 font-medium uppercase tracking-wider">{t.forceLayout}</span>
                </div>
                <div className="p-0">
                  <ConceptGraph data={result.conceptGraph} />
                </div>
              </div>
              
               {/* Entities Table */}
                <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                  <div className="flex items-center gap-2 mb-6 text-stone-700">
                    <Activity size={20} strokeWidth={1.5} />
                    <h3 className="font-medium tracking-wide">{t.keyEntities}</h3>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="text-stone-400 font-medium text-xs uppercase tracking-wider border-b border-stone-100">
                        <tr>
                          <th className="px-4 py-3 font-normal">{t.entityName}</th>
                          <th className="px-4 py-3 font-normal">{t.category}</th>
                          <th className="px-4 py-3 text-right font-normal">{t.freq}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100">
                        {result.entities.slice(0, 8).map((entity, i) => (
                          <tr key={i} className="hover:bg-stone-50/50 transition-colors">
                            <td className="px-4 py-4 font-medium text-stone-800">{entity.name}</td>
                            <td className="px-4 py-4">
                              <span className="px-2.5 py-1 bg-stone-100 text-stone-500 text-xs rounded border border-stone-200">
                                {entity.category}
                              </span>
                            </td>
                            <td className="px-4 py-4 text-right text-stone-400 tabular-nums">{entity.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
            </div>
          )}
          
          {/* Translation View */}
          {status === AnalysisStatus.COMPLETE && activeTab === 'translation' && (
             <div className="h-[calc(100vh-140px)] flex flex-col bg-white rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 overflow-hidden">
                <div className="p-4 px-6 border-b border-stone-200 flex flex-wrap items-center justify-between gap-4 bg-stone-50/30">
                   <div className="flex items-center gap-2 text-stone-700">
                      <Globe size={18} strokeWidth={1.5} />
                      <span className="font-medium tracking-wide">{t.multiLangTrans}</span>
                   </div>
                   <div className="flex items-center gap-3">
                      <select 
                         value={targetLang}
                         onChange={(e) => setTargetLang(e.target.value as SupportedLanguage)}
                         className="px-3 py-2 bg-white border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 text-stone-600 shadow-sm"
                      >
                         <option value="Chinese">Chinese (Simplified)</option>
                         <option value="Spanish">Spanish</option>
                         <option value="French">French</option>
                         <option value="German">German</option>
                         <option value="Japanese">Japanese</option>
                         <option value="Portuguese">Portuguese</option>
                         <option value="Korean">Korean</option>
                      </select>
                      <button 
                         onClick={handleTranslate}
                         disabled={isTranslating}
                         className="flex items-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm font-medium hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm"
                      >
                         {isTranslating ? <RefreshCw className="animate-spin" size={16}/> : <Globe size={16}/>}
                         {t.translateBtn}
                      </button>
                   </div>
                </div>
                
                <div className="flex-1 flex flex-col md:flex-row overflow-hidden relative">
                   {/* Source */}
                   <div className="flex-1 border-b md:border-b-0 md:border-r border-stone-200 flex flex-col min-h-[300px]">
                      <div className="p-3 bg-stone-50 text-xs text-stone-400 font-bold uppercase tracking-widest text-center border-b border-stone-200">{t.originalText}</div>
                      <div className="flex-1 p-8 overflow-y-auto bg-[#fafaf9] text-stone-700 leading-loose whitespace-pre-wrap font-serif text-base">
                         {inputText}
                      </div>
                   </div>
                   {/* Target */}
                   <div className="flex-1 flex flex-col min-h-[300px] relative bg-white">
                      <div className="p-3 bg-white text-xs text-stone-900 font-bold uppercase tracking-widest text-center border-b border-stone-200 flex justify-between items-center px-6">
                         <span className="flex-1 text-center">{targetLang}</span>
                         {translatedText && (
                            <button 
                               onClick={handleCopyTranslation} 
                               className="flex items-center gap-1 text-xs text-stone-500 hover:text-stone-900 transition-colors"
                            >
                               {isCopied ? <Check size={12} /> : <Copy size={12} />}
                               {isCopied ? t.copied : t.copy}
                            </button>
                         )}
                      </div>
                      <div className="flex-1 p-8 overflow-y-auto leading-loose relative">
                         {isTranslating ? (
                            <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] z-10 p-8 space-y-6 animate-pulse">
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-11/12"></div>
                                <div className="h-4 bg-stone-200 rounded w-full"></div>
                                <div className="h-4 bg-stone-200 rounded w-3/4"></div>
                                <div className="flex items-center gap-2 text-stone-500 mt-4">
                                     <Loader2 className="animate-spin" size={16} />
                                     <span className="text-sm font-medium">{t.translating}</span>
                                </div>
                            </div>
                         ) : null}
                         
                         {translatedText ? (
                            <div className="prose prose-stone max-w-none">
                               <ReactMarkdown>{translatedText}</ReactMarkdown>
                            </div>
                         ) : !isTranslating && (
                            <div className="h-full flex flex-col items-center justify-center text-stone-300 italic gap-4 opacity-60">
                                <Globe size={48} strokeWidth={1} />
                                <p className="font-light">Select a language and click Translate to see results here.</p>
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          )}

          {/* Analysis / Critique View */}
          {status === AnalysisStatus.COMPLETE && activeTab === 'critique' && (
            <div className="bg-white p-10 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 min-h-[600px]">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
                <div className="flex flex-col">
                   <h2 className="text-2xl font-light flex items-center gap-3 text-stone-900">
                     <Lightbulb className="text-stone-400" strokeWidth={1.5} />
                     {t.aiPeerReview}
                   </h2>
                   {customAiConfig.isEnabled && (
                     <div className="flex items-center gap-2 mt-2 px-3 py-1 bg-emerald-50 text-emerald-700 text-xs font-medium rounded-full border border-emerald-200 w-fit">
                       <Zap size={14} fill="currentColor" />
                       <span>Using {customAiConfig.selectedModel || 'Custom AI'}</span>
                     </div>
                   )}
                </div>
                
                {/* Actions: Retry & Export */}
                <div className="flex items-center gap-2">
                   <button
                     onClick={handleRetryAnalysis}
                     disabled={isAnalysisLoading}
                     className="flex items-center gap-2 px-3 py-1.5 text-stone-500 hover:text-stone-800 hover:bg-stone-50 rounded-lg text-sm border border-transparent hover:border-stone-200 transition-all"
                     title={t.retryAnalysis}
                   >
                     <RotateCcw size={16} className={isAnalysisLoading ? "animate-spin" : ""} />
                     <span className="hidden sm:inline">{t.retryAnalysis}</span>
                   </button>

                   <div className="h-4 w-px bg-stone-200 mx-1"></div>

                   <div className="flex items-center bg-stone-50 rounded-lg border border-stone-200 p-0.5">
                      <span className="text-xs font-semibold text-stone-400 px-2 uppercase tracking-wide hidden sm:inline-block">{t.export}</span>
                      <button 
                        onClick={() => handleDownload('md')}
                        disabled={!extendedAnalysis}
                        className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-md transition-all disabled:opacity-30"
                        title={t.downloadMd}
                      >
                         <FileDown size={16} />
                      </button>
                      <button 
                        onClick={() => handleDownload('txt')}
                        disabled={!extendedAnalysis}
                        className="p-1.5 text-stone-500 hover:text-stone-800 hover:bg-white rounded-md transition-all disabled:opacity-30"
                        title={t.downloadTxt}
                      >
                         <FileText size={16} />
                      </button>
                   </div>
                </div>
              </div>
              
              {isAnalysisLoading ? (
                <div className="space-y-4 animate-pulse max-w-2xl">
                  <div className="h-4 bg-stone-100 rounded w-3/4"></div>
                  <div className="h-4 bg-stone-100 rounded w-full"></div>
                  <div className="h-4 bg-stone-100 rounded w-5/6"></div>
                  <div className="h-32 bg-stone-100 rounded w-full mt-8"></div>
                </div>
              ) : (
                <div className="max-w-none text-stone-600">
                  <ReactMarkdown
                    components={{
                      h1: ({node, ...props}) => <h1 className="text-3xl font-light text-stone-900 mt-10 mb-6" {...props} />,
                      h2: ({node, ...props}) => <h2 className="text-2xl font-light text-stone-900 mt-10 mb-6 border-b border-stone-100 pb-2" {...props} />,
                      h3: ({node, ...props}) => <h3 className="text-xl font-medium text-stone-800 mt-14 mb-6 border-b border-stone-100 pb-2" {...props} />,
                      p: ({node, ...props}) => <p className="leading-8 mb-8" {...props} />,
                      ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-8 space-y-3" {...props} />,
                      ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-8 space-y-3" {...props} />,
                      li: ({node, ...props}) => <li className="leading-8 pl-1" {...props} />,
                      blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-stone-200 pl-4 italic my-8 text-stone-500" {...props} />,
                      strong: ({node, ...props}) => <strong className="font-semibold text-stone-900" {...props} />,
                    }}
                  >
                    {extendedAnalysis || ""}
                  </ReactMarkdown>
                </div>
              )}
            </div>
          )}

          {/* Discovery & Recommendations View */}
          {status === AnalysisStatus.COMPLETE && activeTab === 'discovery' && (
            <div className="space-y-8">
              
              {/* Contextual - Related to this Paper */}
              <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                <div className="flex justify-between items-start mb-8">
                   <div>
                     <h2 className="text-xl font-light flex items-center gap-3 text-stone-900">
                       <Search className="text-stone-400" size={20} strokeWidth={2} />
                       {t.relatedPaperTitle}
                     </h2>
                     <p className="text-stone-400 text-xs mt-2 uppercase tracking-wide">{t.groundingSource}</p>
                   </div>
                </div>

                {isSearchingContextual ? (
                   <div className="grid gap-4">
                     {[1, 2, 3, 4, 5].map(i => (
                       <div key={i} className="p-6 border border-stone-200 rounded-lg bg-white space-y-3">
                         <div className="h-5 bg-stone-100 rounded w-3/4 animate-pulse"></div>
                         <div className="h-4 bg-stone-50 rounded w-1/2 animate-pulse"></div>
                       </div>
                     ))}
                   </div>
                ) : relatedPapers.length > 0 ? (
                  <div className="grid gap-4">
                    {relatedPapers.map((paper, i) => {
                      const isBookmarked = bookmarks.some(b => b.url === paper.url);
                      return (
                        <div key={i} className={`flex justify-between items-start p-6 border rounded-xl transition-all group ${isBookmarked ? 'border-amber-200 bg-amber-50/30' : 'border-stone-200 bg-[#fafaf9] hover:border-stone-300'}`}>
                          <div className="flex-1">
                             <div className="flex items-start gap-3">
                                <a href={paper.url} target="_blank" rel="noreferrer" className="font-serif text-lg text-stone-900 group-hover:text-stone-600 flex items-center gap-2 mb-2 transition-colors leading-tight">
                                  {paper.title}
                                </a>
                                {isBookmarked && (
                                  <span className="flex-shrink-0 px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full border border-amber-200 mt-1">
                                    {t.saved}
                                  </span>
                                )}
                             </div>
                             <a href={paper.url} target="_blank" rel="noreferrer" className="text-xs text-stone-400 truncate font-mono hover:underline block max-w-md">{paper.url}</a>
                             <p className="text-sm text-stone-600 mt-2 font-serif leading-relaxed">
                                {paper.snippet}
                             </p>
                          </div>
                          <button 
                             onClick={() => toggleBookmark(paper)}
                             className={`ml-4 p-3 rounded-xl transition-all shadow-sm ${isBookmarked ? 'bg-amber-100 text-amber-700 border border-amber-200' : 'bg-white border border-stone-200 text-stone-400 hover:text-stone-600 hover:border-stone-300'}`}
                             title={isBookmarked ? t.removeFromLibrary : t.saveToLibrary}
                          >
                             <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} strokeWidth={2} />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12 text-stone-400 italic font-light">{t.noRelated}</div>
                )}
              </div>

              {/* Personalized - For You */}
              <div className="bg-[#f5f5f4] p-8 rounded-xl border border-stone-200">
                <div className="flex justify-between items-start mb-8">
                   <div>
                     <h2 className="text-xl font-light flex items-center gap-3 text-stone-900">
                       <Sparkles className="text-stone-500" size={20} strokeWidth={1.5} />
                       {t.recommendedTitle}
                     </h2>
                     <p className="text-stone-500 text-sm mt-2 font-light">{t.personalizedReason}</p>
                   </div>
                   <button 
                      onClick={handlePersonalizedRecommendation}
                      className="flex items-center gap-2 px-3 py-1.5 bg-white text-stone-600 border border-stone-200 rounded text-sm hover:border-stone-400 transition-colors shadow-sm"
                   >
                      <RefreshCw size={14} className={isSearchingPersonal ? "animate-spin" : ""} />
                      {t.refresh}
                   </button>
                </div>
                
                {/* Interest Chips */}
                <div className="flex flex-wrap gap-2 mb-8">
                   {userInterests.map((interest, i) => (
                      <span key={i} className="px-3 py-1 bg-white text-stone-600 text-xs font-medium rounded border border-stone-200 shadow-sm flex items-center gap-2 group">
                         {interest}
                         <button onClick={() => setUserInterests(prev => prev.filter(p => p !== interest))} className="hover:text-rose-500 ml-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={12} />
                         </button>
                      </span>
                   ))}
                </div>

                {isSearchingPersonal ? (
                   <div className="grid gap-4">
                     {[1, 2, 3, 4, 5].map(i => (
                       <div key={i} className="p-6 border border-stone-200 rounded-lg bg-white space-y-3">
                         <div className="h-5 bg-stone-100 rounded w-2/3 animate-pulse"></div>
                         <div className="h-4 bg-stone-50 rounded w-1/3 animate-pulse"></div>
                       </div>
                     ))}
                   </div>
                ) : recommendedPapers.length > 0 ? (
                  <div className="grid gap-4">
                    {recommendedPapers.map((paper, i) => {
                      const isBookmarked = bookmarks.some(b => b.url === paper.url);
                      // Calculate matching interests
                      const matchingInterests = userInterests.filter(interest => 
                        paper.title.toLowerCase().includes(interest.toLowerCase())
                      );

                      return (
                        <div key={i} className={`p-6 rounded-xl border transition-all ${isBookmarked ? 'bg-amber-50/30 border-amber-200' : 'bg-white border-stone-200 hover:shadow-md'}`}>
                          <div className="flex justify-between gap-4">
                             <a href={paper.url} target="_blank" rel="noreferrer" className="font-serif text-stone-900 hover:text-stone-600 block mb-3 text-lg leading-snug">
                               {paper.title}
                             </a>
                             <button 
                                onClick={() => toggleBookmark(paper)}
                                className={`flex-shrink-0 p-2.5 rounded-lg h-fit transition-all ${isBookmarked ? 'bg-amber-100 text-amber-700' : 'text-stone-300 hover:text-stone-600 hover:bg-stone-100'}`}
                                title={isBookmarked ? t.removeFromLibrary : t.saveToLibrary}
                             >
                                <Bookmark size={20} fill={isBookmarked ? "currentColor" : "none"} strokeWidth={2} />
                             </button>
                          </div>
                          
                          <p className="text-sm text-stone-600 mt-2 mb-3 font-serif leading-relaxed line-clamp-3">
                            {paper.snippet}
                          </p>

                          <div className="flex flex-wrap items-center gap-2 mt-2">
                             <div className="flex items-center gap-2 text-xs text-stone-500 font-medium uppercase tracking-wide">
                                <span className="px-2 py-0.5 bg-stone-100 rounded border border-stone-200">{t.personalizedPick}</span>
                             </div>
                             {matchingInterests.length > 0 && matchingInterests.map((interest, idx) => (
                                <span key={idx} className="px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded border border-emerald-200 flex items-center gap-1">
                                  <Check size={10} strokeWidth={3} />
                                  {interest}
                                </span>
                             ))}
                             {isBookmarked && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded border border-amber-200">
                                  {t.saved}
                                </span>
                             )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-stone-400 bg-white/50 rounded-lg border border-dashed border-stone-300">
                     {userInterests.length > 0 ? t.clickRefresh : t.startAnalyzing}
                  </div>
                )}
              </div>
              
            </div>
          )}

          {/* Library View */}
          {activeTab === 'library' && (
            <div className="space-y-8 animate-fade-in">
               <h1 className="text-3xl font-light text-stone-900 tracking-tight">{t.myLibrary}</h1>

               {/* Topics Section */}
               <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4">
                     <Sparkles className="text-stone-500" size={20} strokeWidth={1.5} />
                     <h2 className="text-xl font-light text-stone-900">{t.topicsTracked}</h2>
                  </div>
                  
                  {userInterests.length > 0 ? (
                    <div className="flex flex-wrap gap-3">
                       {userInterests.map((interest, i) => (
                          <span key={i} className="px-4 py-2 bg-stone-50 text-stone-700 text-sm font-medium rounded-lg border border-stone-200 shadow-sm flex items-center gap-3 group transition-all hover:border-stone-300">
                             {interest}
                             <button 
                               onClick={(e) => { e.stopPropagation(); setUserInterests(prev => prev.filter(p => p !== interest)); }} 
                               className="text-stone-400 hover:text-rose-500 transition-colors p-0.5 rounded-md hover:bg-stone-200"
                             >
                                <Trash2 size={14} />
                             </button>
                          </span>
                       ))}
                    </div>
                  ) : (
                    <div className="text-stone-400 italic font-light py-4">{t.noTopics}</div>
                  )}
               </div>

               {/* Bookmarks Section */}
               <div className="bg-white p-8 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200">
                  <div className="flex items-center gap-3 mb-6 border-b border-stone-100 pb-4">
                     <Bookmark className="text-stone-500" size={20} strokeWidth={1.5} />
                     <h2 className="text-xl font-light text-stone-900">{t.savedPapers}</h2>
                  </div>

                  {bookmarks.length > 0 ? (
                    <div className="grid gap-4">
                      {bookmarks.map((paper, i) => (
                        <div key={i} className="flex justify-between items-start p-6 border border-stone-200 rounded-xl bg-[#fafaf9] hover:bg-white hover:shadow-md transition-all group">
                          <div className="flex-1 pr-4">
                             <a href={paper.url} target="_blank" rel="noreferrer" className="font-serif text-lg text-stone-900 group-hover:text-stone-600 block mb-2 transition-colors leading-tight">
                               {paper.title}
                             </a>
                             <a href={paper.url} target="_blank" rel="noreferrer" className="text-xs text-stone-400 truncate font-mono hover:underline block mb-3 max-w-xl">{paper.url}</a>
                             <p className="text-sm text-stone-600 font-serif leading-relaxed line-clamp-2">
                                {paper.snippet}
                             </p>
                          </div>
                          <button 
                             onClick={() => toggleBookmark(paper)}
                             className="p-2.5 rounded-lg text-rose-300 hover:text-rose-600 hover:bg-rose-50 border border-transparent hover:border-rose-100 transition-all flex-shrink-0"
                             title={t.removeFromLibrary}
                          >
                             <Trash2 size={18} strokeWidth={2} />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-stone-400 italic font-light py-4">{t.noBookmarks}</div>
                  )}
               </div>
            </div>
          )}

          {/* Settings View */}
          {activeTab === 'settings' && (
            <div className="bg-white p-10 rounded-xl shadow-[0_2px_8px_-2px_rgba(0,0,0,0.05)] border border-stone-200 max-w-2xl mx-auto mt-12">
               <h2 className="text-2xl font-light mb-8 flex items-center gap-3 text-stone-900">
                  <SettingsIcon className="text-stone-400" strokeWidth={1.5} />
                  {t.settings}
               </h2>
               
               <div className="space-y-12">
                  
                  {/* Gemini API Key Section */}
                  <div className="border-b border-stone-100 pb-8">
                     <div className="flex justify-between items-start gap-4 mb-6">
                        <div className="flex items-start gap-4">
                           <div className="p-2 bg-stone-100 rounded-lg text-stone-600">
                              <Key size={24} strokeWidth={1.5} />
                           </div>
                           <div>
                              <h3 className="text-lg font-medium text-stone-800">{t.geminiKeyTitle}</h3>
                              <p className="text-stone-500 text-sm mt-1">{t.geminiKeyDesc}</p>
                           </div>
                        </div>
                        <span className={`text-xs font-bold uppercase tracking-wider whitespace-nowrap ${hasKey ? 'text-emerald-600' : 'text-amber-600'}`}>
                           {hasKey ? t.keyBound : t.keyNotBound}
                        </span>
                     </div>

                     <div className="space-y-4">
                        <div>
                           <label htmlFor="gemini-key" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t.apiKey}</label>
                           <div className="relative">
                              <Key size={16} className="absolute left-3 top-3 text-stone-400" />
                              <input
                                id="gemini-key"
                                type="password"
                                autoComplete="off"
                                spellCheck={false}
                                value={geminiConfig.apiKey}
                                onChange={(e) => { setGeminiConfigState(prev => ({ ...prev, apiKey: e.target.value })); setKeyCheckSuccess(null); setKeyCheckError(null); }}
                                placeholder="AIza..."
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                              />
                           </div>
                           <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-stone-500 hover:text-stone-800 mt-2 underline decoration-stone-300 underline-offset-4">
                              {t.getKeyLink} <ExternalLink size={12} />
                           </a>
                        </div>

                        <div>
                           <label htmlFor="gemini-base" className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t.geminiBaseUrl}</label>
                           <div className="relative">
                              <Globe size={16} className="absolute left-3 top-3 text-stone-400" />
                              <input
                                id="gemini-base"
                                type="url"
                                spellCheck={false}
                                value={geminiConfig.baseUrl}
                                onChange={(e) => setGeminiConfigState(prev => ({ ...prev, baseUrl: e.target.value }))}
                                placeholder="https://generativelanguage.googleapis.com"
                                className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                              />
                           </div>
                           <p className="text-xs text-stone-400 mt-2">{t.geminiBaseUrlHint}</p>
                        </div>

                        <label className="flex items-center gap-2 text-sm text-stone-600 cursor-pointer select-none">
                           <input
                             type="checkbox"
                             checked={geminiConfig.remember}
                             onChange={(e) => setGeminiConfigState(prev => ({ ...prev, remember: e.target.checked }))}
                             className="w-4 h-4 accent-stone-800"
                           />
                           {t.rememberKey}
                        </label>

                        <div className="flex flex-col sm:flex-row gap-3 pt-1">
                           <button
                              onClick={handleCheckKey}
                              disabled={isCheckingKey || !hasKey}
                              className="flex items-center justify-center gap-2 px-4 py-2 bg-stone-900 text-white rounded-lg text-sm hover:bg-stone-800 disabled:opacity-50 transition-colors shadow-sm font-medium"
                           >
                              {isCheckingKey ? <Loader2 className="animate-spin" size={16} /> : <ShieldCheck size={16} />}
                              {t.verifyKey}
                           </button>
                           {hasKey && (
                             <button
                                onClick={handleUnbindKey}
                                className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-600 rounded-lg text-sm hover:bg-stone-50 transition-colors font-medium"
                             >
                                <Trash2 size={16} />
                                {t.removeKey}
                             </button>
                           )}
                        </div>

                        {keyCheckError && <p className="text-xs text-rose-500 break-words">{keyCheckError}</p>}
                        {keyCheckSuccess && <p className="text-xs text-emerald-600">{keyCheckSuccess}</p>}

                        <p className="flex items-start gap-2 text-xs text-stone-500 bg-stone-50 border border-stone-200 rounded-lg p-3">
                           <ShieldCheck size={14} className="flex-shrink-0 mt-0.5 text-stone-400" />
                           {t.geminiKeyPrivacy}
                        </p>
                     </div>

                     <div className="mt-6">
                        <p className="text-xs text-stone-500 mb-3">{t.defaultModelsDesc}</p>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                           {([
                             ['fastModel', t.fastModel, <Zap size={18} className="text-amber-500" fill="currentColor" />, DEFAULT_FAST_MODEL],
                             ['smartModel', t.reasoningModel, <BrainCircuit size={18} className="text-indigo-500" />, DEFAULT_SMART_MODEL],
                           ] as const).map(([field, label, icon, fallback]) => (
                             <div key={field} className="p-4 bg-stone-50 border border-stone-200 rounded-lg space-y-3">
                                <div className="flex items-center gap-3">
                                   {icon}
                                   <span className="text-sm font-medium text-stone-700">{label}</span>
                                </div>
                                {geminiModels.length > 0 ? (
                                  <select
                                    value={geminiConfig[field] || fallback}
                                    onChange={(e) => setGeminiConfigState(prev => ({ ...prev, [field]: e.target.value }))}
                                    className="w-full px-3 py-2 bg-white border border-stone-200 rounded-md text-xs font-mono focus:outline-none focus:ring-2 focus:ring-stone-200"
                                  >
                                     {!geminiModels.some(m => m.id === (geminiConfig[field] || fallback)) && (
                                       <option value={geminiConfig[field] || fallback}>{geminiConfig[field] || fallback}</option>
                                     )}
                                     {geminiModels.map(m => <option key={m.id} value={m.id}>{m.id}</option>)}
                                  </select>
                                ) : (
                                  <span className="inline-block text-xs font-mono bg-white px-2.5 py-1 rounded-md border border-stone-200 text-stone-600">{geminiConfig[field] || fallback}</span>
                                )}
                             </div>
                           ))}
                        </div>
                     </div>
                  </div>

                  {/* Custom API Section */}
                  <div className="border-b border-stone-100 pb-8">
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h3 className="text-lg font-medium text-stone-800 flex items-center gap-2">
                           <Server size={18} className="text-stone-500" />
                           {t.customAPI}
                        </h3>
                        <p className="text-stone-500 text-sm mt-1">{t.customAPIDesc}</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <span className={`text-xs font-bold uppercase tracking-wider ${customAiConfig.isEnabled ? 'text-emerald-600' : 'text-stone-400'}`}>
                            {customAiConfig.isEnabled ? t.enabled : t.disabled}
                         </span>
                         <button 
                           onClick={() => setCustomAiConfig(prev => ({ ...prev, isEnabled: !prev.isEnabled }))}
                           className={`w-11 h-6 flex items-center rounded-full p-1 transition-colors ${customAiConfig.isEnabled ? 'bg-emerald-500' : 'bg-stone-200'}`}
                         >
                            <div className={`bg-white w-4 h-4 rounded-full shadow-sm transform transition-transform ${customAiConfig.isEnabled ? 'translate-x-5' : 'translate-x-0'}`}></div>
                         </button>
                      </div>
                    </div>

                    <div className={`space-y-4 transition-opacity duration-200 ${customAiConfig.isEnabled ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
                       <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t.baseUrl}</label>
                          <div className="relative">
                            <Globe size={16} className="absolute left-3 top-3 text-stone-400" />
                            <input 
                              type="text" 
                              value={customAiConfig.baseUrl}
                              onChange={(e) => setCustomAiConfig(prev => ({ ...prev, baseUrl: e.target.value }))}
                              placeholder="https://api.openai.com/v1"
                              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                            />
                          </div>
                       </div>
                       
                       <div>
                          <label className="block text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">{t.apiKey}</label>
                          <div className="relative">
                            <Key size={16} className="absolute left-3 top-3 text-stone-400" />
                            <input 
                              type="password" 
                              value={customAiConfig.apiKey}
                              onChange={(e) => setCustomAiConfig(prev => ({ ...prev, apiKey: e.target.value }))}
                              placeholder="sk-..."
                              className="w-full pl-10 pr-4 py-2.5 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 transition-all font-mono"
                            />
                          </div>
                       </div>

                       <div className="flex flex-col sm:flex-row gap-4 pt-2">
                          <button 
                             onClick={handleCheckModels}
                             disabled={isCheckingModels || !customAiConfig.baseUrl || !customAiConfig.apiKey}
                             className="flex items-center justify-center gap-2 px-4 py-2 bg-white border border-stone-200 text-stone-700 rounded-lg text-sm hover:bg-stone-50 disabled:opacity-50 transition-colors shadow-sm font-medium"
                          >
                             {isCheckingModels ? <Loader2 className="animate-spin" size={16} /> : <RefreshCw size={16} />}
                             {t.fetchModels}
                          </button>

                          <div className="flex-1 relative">
                             <select 
                               value={customAiConfig.selectedModel}
                               onChange={(e) => setCustomAiConfig(prev => ({ ...prev, selectedModel: e.target.value }))}
                               className="w-full h-full px-4 py-2 bg-stone-50 border border-stone-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-stone-200 appearance-none"
                               disabled={availableModels.length === 0}
                             >
                                <option value="" disabled>{t.selectModel}</option>
                                {availableModels.map(m => (
                                   <option key={m.id} value={m.id}>
                                     {m.name && m.name !== m.id ? `${m.name} (${m.id})` : m.id}
                                   </option>
                                ))}
                             </select>
                             <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-stone-400">
                                <ArrowRight size={14} className="rotate-90" />
                             </div>
                          </div>
                       </div>
                       
                       {modelFetchError && (
                          <p className="text-xs text-rose-500 mt-2">{modelFetchError}</p>
                       )}
                       {modelFetchSuccess && (
                          <p className="text-xs text-emerald-600 mt-2">{modelFetchSuccess}</p>
                       )}
                    </div>
                  </div>

                  {/* Data Management Section */}
                  <div className="pt-4">
                     <h3 className="text-lg font-medium text-stone-800 text-rose-600 mb-2">{t.dataManagement}</h3>
                     <div className="bg-rose-50 border border-rose-100 rounded-lg p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                        <div>
                           <h4 className="font-medium text-rose-900">{t.clearDataTitle}</h4>
                           <p className="text-sm text-rose-700 mt-1 max-w-md">{t.clearDataDesc}</p>
                        </div>
                        <button 
                           onClick={() => setIsConfirmingClear(true)}
                           className="px-4 py-2 bg-white border border-rose-200 text-rose-600 rounded-lg text-sm font-medium hover:bg-rose-100 hover:border-rose-300 transition-colors shadow-sm whitespace-nowrap"
                        >
                           {t.clearBtn}
                        </button>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </div>
      </main>

      <ChatInterface 
        isOpen={isChatOpen} 
        onClose={() => setIsChatOpen(false)} 
        contextText={inputText}
        uiLanguage={uiLanguage}
        onNeedKey={() => { setIsChatOpen(false); setActiveTab('settings'); }}
      />

      {/* Clear Data Confirmation Modal */}
      {isConfirmingClear && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-2 bg-rose-50 rounded-full">
                <AlertTriangle size={24} />
              </div>
              <h3 className="text-lg font-semibold text-stone-900">{t.clearDataTitle}</h3>
            </div>
            <p className="text-stone-600 leading-relaxed">
              {t.clearDataDesc}
            </p>
            <div className="flex gap-3 pt-2">
              <button 
                onClick={() => setIsConfirmingClear(false)}
                className="flex-1 px-4 py-2.5 bg-stone-100 text-stone-700 font-medium rounded-xl hover:bg-stone-200 transition-colors"
              >
                {t.cancel}
              </button>
              <button 
                onClick={handleClearData}
                className="flex-1 px-4 py-2.5 bg-rose-600 text-white font-medium rounded-xl hover:bg-rose-700 transition-colors shadow-lg shadow-rose-900/20"
              >
                {t.confirmDelete}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
