"""
跨语言学术论文辅助阅读系统 (Academic Paper Reading Assistant)

功能：
1. 自动摘要 - 基于TextRank的抽取式摘要
2. 关键实体提取 - NER识别论文中的关键人物、机构、术语
3. 核心概念图谱 - 可视化论文中概念之间的关系
4. 术语定义抽取 - 识别论文中对术语的定义句
5. 关键词提取 - 基于TF-IDF的关键词抽取
6. 文本难度评估 - 评估论文的阅读难度等级
7. 中英双语支持 - 支持中文和英文论文分析

技术栈：SpaCy, NetworkX, Matplotlib, NumPy

作者：Mingtao Xia
课程：自然语言处理（英语）
"""

import spacy
import numpy as np
import networkx as nx
import matplotlib.pyplot as plt
from collections import Counter, defaultdict
from dataclasses import dataclass
from pathlib import Path
import re
import json
import urllib.request
import urllib.error


@dataclass
class CustomAIConfig:
    base_url: str
    api_key: str
    model: str = "gpt-3.5-turbo"


def detect_language(text):
    """检测文本语言（中文/英文）"""
    chinese_chars = len(re.findall(r"[\u4e00-\u9fff]", text))
    alpha_numeric = len(re.findall(r"[A-Za-z0-9]", text))
    total_chars = chinese_chars + alpha_numeric
    return "zh" if total_chars > 0 and chinese_chars / total_chars > 0.3 else "en"


class AcademicPaperAssistant:
    """学术论文辅助阅读系统"""

    def __init__(
        self, model_name="en_core_web_lg", custom_ai=None, use_custom_ai=False
    ):
        """初始化，加载SpaCy模型"""
        print(f"正在加载模型 {model_name}...")
        self.nlp = spacy.load(model_name)
        self.lang = "zh" if "zh" in model_name else "en"
        self.custom_ai = custom_ai
        self.use_custom_ai = use_custom_ai
        print("模型加载完成！")

    def switch_language(self, lang):
        """切换语言模型"""
        model = "zh_core_web_lg" if lang == "zh" else "en_core_web_lg"
        print(f"切换至{'中文' if lang == 'zh' else '英文'}模型...")
        self.nlp = spacy.load(model)
        self.lang = lang
        print("切换完成！")

    def load_text(self, source):
        """加载文本，支持文件路径或直接文本"""
        if Path(source).exists():
            with open(source, "r", encoding="utf-8") as f:
                return f.read()
        return source

    def configure_custom_ai(self, base_url, api_key, model="gpt-3.5-turbo"):
        """配置用户自定义AI模型（OpenAI兼容接口）"""
        base_url = base_url.rstrip("/")
        self.custom_ai = CustomAIConfig(base_url=base_url, api_key=api_key, model=model)
        self.use_custom_ai = True

    def toggle_custom_ai(self, enabled):
        """启用/关闭自定义AI模型"""
        self.use_custom_ai = bool(enabled) and self.custom_ai is not None

    def _is_content_token(self, token):
        if self.lang == "zh":
            return not token.is_space and not token.is_punct
        return token.is_alpha

    def _content_tokens(self, doc):
        return [token for token in doc if self._is_content_token(token)]

    def _split_sentences(self, text):
        if self.lang != "zh":
            return [s.strip() for s in re.split(r"(?<=[.!?])\s+", text) if s.strip()]
        return [s.strip() for s in re.split(r"(?<=[。！？；])", text) if s.strip()]

    def _get_sentences(self, doc, text):
        if self.lang != "zh":
            return [sent for sent in doc.sents if sent.text.strip()]
        sentence_texts = self._split_sentences(text)
        spans = []
        cursor = 0
        for sent_text in sentence_texts:
            idx = text.find(sent_text, cursor)
            if idx == -1:
                continue
            span = doc.char_span(idx, idx + len(sent_text), alignment_mode="expand")
            if span is not None and span.text.strip():
                spans.append(span)
            cursor = idx + len(sent_text)
        return spans if spans else [sent for sent in doc.sents if sent.text.strip()]

    def _call_custom_ai(self, prompt):
        if not self.custom_ai:
            return None
        url = f"{self.custom_ai.base_url}/v1/chat/completions"
        payload = {
            "model": self.custom_ai.model,
            "messages": [
                {"role": "system", "content": "You are a helpful academic assistant."},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
        }
        headers = {
            "Content-Type": "application/json",
            "Authorization": f"Bearer {self.custom_ai.api_key}",
        }
        req = urllib.request.Request(
            url, data=json.dumps(payload).encode("utf-8"), headers=headers
        )
        try:
            with urllib.request.urlopen(req, timeout=30) as response:
                data = json.loads(response.read().decode("utf-8"))
            return data["choices"][0]["message"]["content"].strip()
        except (
            urllib.error.URLError,
            KeyError,
            IndexError,
            json.JSONDecodeError,
        ) as exc:
            print(f"自定义AI调用失败: {exc}")
            return None

    def _summarize_with_custom_ai(self, text, num_sentences=3):
        if not self.custom_ai or not self.use_custom_ai:
            return None
        lang_tip = "中文" if detect_language(text) == "zh" else "英文"
        prompt = (
            f"请用{lang_tip}生成{num_sentences}句话的学术摘要，保持客观准确。\n\n"
            f"文本：\n{text.strip()}"
        )
        summary_text = self._call_custom_ai(prompt)
        if not summary_text:
            return None
        summary_doc = self.nlp(summary_text)
        summary_sents = [
            s.text.strip() for s in self._get_sentences(summary_doc, summary_text)
        ]
        return {
            "summary_text": summary_text,
            "summary_sentences": summary_sents,
        }

    def basic_text_stats(self, text):
        """输出文本基础统计信息，包含丰富的直观指标"""
        text = self.load_text(text)
        doc = self.nlp(text)

        sentences = self._get_sentences(doc, text)
        tokens = self._content_tokens(doc)
        content_words = []
        all_words_for_hapax = []
        for token in tokens:
            if self.lang == "zh":
                all_words_for_hapax.append(token.text)
            else:
                all_words_for_hapax.append(token.lemma_.lower())
            if token.is_stop:
                continue
            if self.lang == "zh":
                content_words.append(token.text)
            else:
                content_words.append(token.lemma_.lower())
        sentence_lengths = [
            len([t for t in sent if self._is_content_token(t)]) for sent in sentences
        ]

        word_count = len(tokens)
        unique_words = len(set(content_words)) if content_words else 0
        avg_sentence_length = word_count / len(sentences) if sentences else 0
        median_sentence_length = (
            float(np.median(sentence_lengths)) if sentence_lengths else 0
        )
        top_words = Counter(content_words).most_common(5)

        # === 新增直观指标 ===
        # 1. 词汇丰富度指标
        word_freq = Counter(all_words_for_hapax)
        hapax_legomena = sum(
            1 for w, c in word_freq.items() if c == 1
        )  # 只出现一次的词
        hapax_ratio = round((hapax_legomena / word_count * 100) if word_count else 0, 1)

        # 2. Type-Token Ratio (TTR) - 词汇多样性
        type_count = len(set(all_words_for_hapax))
        ttr = round((type_count / word_count * 100) if word_count else 0, 1)

        # 3. 句长变异系数 (Coefficient of Variation) - 句子结构多样性
        if sentence_lengths and len(sentence_lengths) > 1:
            std_sentence_length = float(np.std(sentence_lengths))
            cv_sentence = round(
                (std_sentence_length / avg_sentence_length * 100)
                if avg_sentence_length
                else 0,
                1,
            )
        else:
            std_sentence_length = 0
            cv_sentence = 0

        # 4. 长句比例 (句长 > 均值 + 1标准差)
        long_sent_threshold = (
            avg_sentence_length + std_sentence_length
            if std_sentence_length
            else avg_sentence_length * 1.5
        )
        long_sentences = sum(1 for l in sentence_lengths if l > long_sent_threshold)
        long_sentence_ratio = round(
            (long_sentences / len(sentences) * 100) if sentences else 0, 1
        )

        # 5. 短句比例 (句长 < 均值 - 1标准差，最少3词)
        short_sent_threshold = (
            max(3, avg_sentence_length - std_sentence_length)
            if std_sentence_length
            else avg_sentence_length * 0.5
        )
        short_sentences = sum(1 for l in sentence_lengths if l < short_sent_threshold)
        short_sentence_ratio = round(
            (short_sentences / len(sentences) * 100) if sentences else 0, 1
        )

        # 6. 停用词率
        stop_words = sum(1 for t in doc if self._is_content_token(t) and t.is_stop)
        stop_word_ratio = round((stop_words / word_count * 100) if word_count else 0, 1)

        # 7. 信息密度 = 实义词 / 总词数
        content_word_ratio = round(
            (len(content_words) / word_count * 100) if word_count else 0, 1
        )

        # 8. 平均词长
        avg_word_length = round(
            sum(len(t.text) for t in tokens) / word_count if word_count else 0, 2
        )

        # 9. 词汇覆盖率 - top N 词覆盖的文本比例
        top_10_freq = sum(c for w, c in Counter(all_words_for_hapax).most_common(10))
        top_10_coverage = round(
            (top_10_freq / word_count * 100) if word_count else 0, 1
        )

        return {
            "char_count": len(text),
            "word_count": word_count,
            "sentence_count": len(sentences),
            "avg_sentence_length": round(avg_sentence_length, 1),
            "median_sentence_length": round(median_sentence_length, 1),
            "std_sentence_length": round(std_sentence_length, 1),
            "unique_word_ratio": round(
                (unique_words / word_count * 100) if word_count else 0, 1
            ),
            "top_words": top_words,
            # 新增指标
            "type_token_ratio": ttr,
            "hapax_ratio": hapax_ratio,
            "cv_sentence_length": cv_sentence,
            "long_sentence_ratio": long_sentence_ratio,
            "short_sentence_ratio": short_sentence_ratio,
            "stop_word_ratio": stop_word_ratio,
            "content_word_ratio": content_word_ratio,
            "avg_word_length": avg_word_length,
            "top_10_coverage": top_10_coverage,
        }

    # ==================== 1. 自动摘要模块 ====================

    def _sentence_similarity(self, sent1, sent2):
        """计算两个句子的相似度（基于词向量/词重叠）"""
        if sent1.vector_norm and sent2.vector_norm:
            return sent1.similarity(sent2)
        tokens1 = {t.text for t in sent1 if self._is_content_token(t)}
        tokens2 = {t.text for t in sent2 if self._is_content_token(t)}
        if not tokens1 or not tokens2:
            return 0.0
        return len(tokens1 & tokens2) / len(tokens1 | tokens2)

    def _textrank_summarize(self, doc, num_sentences=3):
        """基于TextRank算法的抽取式摘要"""
        min_len = 10 if self.lang == "zh" else 20
        sentences = [
            sent
            for sent in self._get_sentences(doc, doc.text)
            if len(sent.text.strip()) > min_len
        ]
        if len(sentences) <= num_sentences:
            return sentences

        # 构建句子相似度矩阵
        n = len(sentences)
        similarity_matrix = np.zeros((n, n))
        for i in range(n):
            for j in range(n):
                if i != j:
                    similarity_matrix[i][j] = self._sentence_similarity(
                        sentences[i], sentences[j]
                    )

        # PageRank计算句子重要性
        graph = nx.from_numpy_array(similarity_matrix)
        try:
            scores = nx.pagerank(graph, max_iter=100)
        except:
            scores = {i: 1.0 for i in range(n)}

        # 按重要性排序，保持原文顺序返回
        ranked_indices = sorted(scores.keys(), key=lambda x: scores[x], reverse=True)[
            :num_sentences
        ]
        ranked_indices.sort()  # 恢复原文顺序

        return [sentences[i] for i in ranked_indices]

    def summarize(self, text, num_sentences=3):
        """生成摘要，包含丰富的评估指标"""
        text = self.load_text(text)
        doc = self.nlp(text)
        original_sents = self._get_sentences(doc, text)
        custom_summary = self._summarize_with_custom_ai(text, num_sentences)
        if custom_summary:
            summary_text = custom_summary["summary_text"]
            summary_sents = custom_summary["summary_sentences"]
            summary_doc = self.nlp(summary_text)
        else:
            summary_sents = [
                s.text.strip() for s in self._textrank_summarize(doc, num_sentences)
            ]
            summary_text = " ".join(summary_sents)
            summary_doc = self.nlp(summary_text)

        total_words = len(self._content_tokens(doc))
        summary_words = len(self._content_tokens(summary_doc))
        compression_ratio = round(
            (summary_words / total_words * 100) if total_words else 0, 1
        )

        # === 新增直观指标 ===
        # 1. 句子压缩率 (选取了多少比例的句子)
        sentence_selection_ratio = round(
            (len(summary_sents) / len(original_sents) * 100) if original_sents else 0, 1
        )

        # 2. 信息保留率估算 - 基于关键词覆盖
        original_keywords = set()
        for token in doc:
            if token.pos_ in ("NOUN", "PROPN", "VERB") and not token.is_stop:
                original_keywords.add(
                    token.lemma_.lower() if self.lang != "zh" else token.text
                )

        summary_keywords = set()
        for token in summary_doc:
            if token.pos_ in ("NOUN", "PROPN", "VERB") and not token.is_stop:
                summary_keywords.add(
                    token.lemma_.lower() if self.lang != "zh" else token.text
                )

        keyword_coverage = round(
            (len(summary_keywords & original_keywords) / len(original_keywords) * 100)
            if original_keywords
            else 0,
            1,
        )

        # 3. 信息密度 (摘要中关键词占比 vs 原文)
        original_keyword_density = round(
            (len(original_keywords) / total_words * 100) if total_words else 0, 1
        )
        summary_keyword_density = round(
            (len(summary_keywords) / summary_words * 100) if summary_words else 0, 1
        )
        density_improvement = round(
            summary_keyword_density - original_keyword_density, 1
        )

        # 4. 平均句长对比
        original_avg_sent_len = (
            round(total_words / len(original_sents), 1) if original_sents else 0
        )
        summary_avg_sent_len = (
            round(summary_words / len(summary_sents), 1) if summary_sents else 0
        )

        # 5. 冗余削减率 = 100% - 压缩率
        redundancy_reduction = round(100 - compression_ratio, 1)

        # 6. 实体保留率
        original_ents = set(ent.text for ent in doc.ents)
        summary_ents = set(ent.text for ent in summary_doc.ents)
        entity_retention = round(
            (len(summary_ents & original_ents) / len(original_ents) * 100)
            if original_ents
            else 100,
            1,
        )

        return {
            "summary": summary_text,
            "sentences": summary_sents,
            "original_length": len(original_sents),
            "summary_length": len(summary_sents),
            "original_words": total_words,
            "summary_words": summary_words,
            "compression_ratio": compression_ratio,
            # 新增指标
            "sentence_selection_ratio": sentence_selection_ratio,
            "keyword_coverage": keyword_coverage,
            "original_keyword_density": original_keyword_density,
            "summary_keyword_density": summary_keyword_density,
            "density_improvement": density_improvement,
            "original_avg_sent_len": original_avg_sent_len,
            "summary_avg_sent_len": summary_avg_sent_len,
            "redundancy_reduction": redundancy_reduction,
            "entity_retention": entity_retention,
        }

    # ==================== 2. 关键实体提取模块 ====================

    # 实体类别中英文映射及描述
    ENTITY_LABELS = {
        # SpaCy原生实体类型
        "PERSON": "人物 (Person)",
        "ORG": "组织机构 (Organization)",
        "GPE": "地理政治实体 (Geo-Political Entity)",
        "LOC": "地点 (Location)",
        "DATE": "日期 (Date)",
        "TIME": "时间 (Time)",
        "MONEY": "金额 (Money)",
        "PERCENT": "百分比 (Percentage)",
        "CARDINAL": "基数词 (Cardinal Number)",
        "ORDINAL": "序数词 (Ordinal Number)",
        "QUANTITY": "数量 (Quantity)",
        "PRODUCT": "产品 (Product)",
        "EVENT": "事件 (Event)",
        "WORK_OF_ART": "作品 (Work of Art)",
        "LAW": "法律法规 (Law)",
        "LANGUAGE": "语言 (Language)",
        "FAC": "设施 (Facility)",
        "NORP": "国籍/宗教/政治团体 (Nationality/Religious/Political Group)",
        # 自定义学术实体类型
        "ALGORITHM": "算法 (Algorithm)",
        "MODEL": "模型 (Model)",
        "DATASET": "数据集 (Dataset)",
        "METRIC": "评估指标 (Metric)",
        "FRAMEWORK": "框架/库 (Framework/Library)",
        "TASK": "任务类型 (Task)",
        "TECHNIQUE": "技术方法 (Technique)",
        "ACRONYM": "缩略词 (Acronym)",
        "PUBLICATION": "出版物 (Publication)",
        "CONFERENCE": "学术会议 (Conference)",
        "UNIVERSITY": "大学 (University)",
        "THEOREM": "定理/公式 (Theorem/Formula)",
        "CHEMICAL": "化学物质 (Chemical)",
        "DISEASE": "疾病 (Disease)",
        "GENE_PROTEIN": "基因/蛋白质 (Gene/Protein)",
        "SPECIES": "物种 (Species)",
        "VERSION": "版本号 (Version Number)",
        "URL": "网址 (URL)",
        "EMAIL": "电子邮件 (Email)",
    }

    # 学术实体识别的正则模式
    ACADEMIC_PATTERNS = {
        "ALGORITHM": [
            r"\b([A-Z][a-z]*(?:[-][A-Z][a-z]*)*)\s+(?:algorithm|Algorithm)\b",
            r"\b(k-means|k-nearest|KNN|SVM|CNN|RNN|LSTM|GRU|GAN|VAE|MLP|DNN)\b",
            r"\b(backpropagation|gradient descent|Adam|SGD|dropout|batch normalization)\b",
            r"\b(PageRank|TextRank|TF-IDF|Word2Vec|GloVe|FastText)\b",
            r"\b(beam search|greedy search|dynamic programming|A\*)\b",
        ],
        "MODEL": [
            r"\b(BERT|GPT|GPT-[234]|ChatGPT|T5|RoBERTa|XLNet|ALBERT|DistilBERT|ELECTRA)\b",
            r"\b(Transformer|ResNet|VGG|Inception|YOLO|U-Net|EfficientNet)\b",
            r"\b(LLaMA|PaLM|Claude|Gemini|Mistral|Falcon|Phi)\b",
            r"\b(word2vec|doc2vec|ELMo|fastText)\b",
            r"\b([A-Z]{2,}(?:-[A-Z]+)*)\s+model\b",
        ],
        "DATASET": [
            r"\b(ImageNet|MNIST|CIFAR-(?:10|100)|COCO|Pascal VOC)\b",
            r"\b(SQuAD|GLUE|SuperGLUE|CoNLL|WikiText|OpenWebText)\b",
            r"\b(MS MARCO|Natural Questions|TriviaQA|HotpotQA)\b",
            r"\b(Penn Treebank|Brown Corpus|Reuters|20 Newsgroups)\b",
            r"\b([A-Z][a-zA-Z]*(?:[-][A-Z][a-zA-Z]*)*)\s+(?:dataset|corpus|benchmark)\b",
        ],
        "METRIC": [
            r"\b(accuracy|precision|recall|F1(?:-score)?|F-measure|AUC|ROC)\b",
            r"\b(BLEU|ROUGE|METEOR|CIDEr|perplexity|cross-entropy)\b",
            r"\b(MSE|RMSE|MAE|R-squared|R²|IoU|mAP)\b",
            r"\b(cosine similarity|Jaccard|Dice coefficient|edit distance)\b",
            r"\b(p-value|t-test|chi-square|ANOVA|correlation)\b",
        ],
        "FRAMEWORK": [
            r"\b(TensorFlow|PyTorch|Keras|Scikit-learn|sklearn|spaCy|NLTK)\b",
            r"\b(Hugging Face|Transformers|JAX|Flax|MXNet|Caffe|Theano)\b",
            r"\b(NumPy|Pandas|Matplotlib|Seaborn|SciPy|OpenCV)\b",
            r"\b(Apache Spark|Hadoop|Kafka|Airflow|MLflow|Kubeflow)\b",
            r"\b(Docker|Kubernetes|AWS|GCP|Azure|Lambda)\b",
        ],
        "TASK": [
            r"\b(named entity recognition|NER|POS tagging|parsing|tokenization)\b",
            r"\b(sentiment analysis|text classification|question answering|QA)\b",
            r"\b(machine translation|MT|summarization|text generation)\b",
            r"\b(object detection|image classification|semantic segmentation)\b",
            r"\b(speech recognition|ASR|text-to-speech|TTS|OCR)\b",
            r"\b(information extraction|IE|relation extraction|RE|coreference resolution)\b",
        ],
        "TECHNIQUE": [
            r"\b(attention mechanism|self-attention|multi-head attention)\b",
            r"\b(transfer learning|fine-tuning|pre-training|zero-shot|few-shot)\b",
            r"\b(data augmentation|regularization|normalization|embedding)\b",
            r"\b(cross-validation|hyperparameter tuning|grid search|ensemble)\b",
            r"\b(word embedding|contextual embedding|positional encoding)\b",
        ],
        "ACRONYM": [
            r"\b([A-Z]{2,6})\b(?=\s*\([^)]+\))",  # 缩写后跟括号解释
            r"\(([A-Z]{2,6})\)",  # 括号内的缩写
        ],
        "PUBLICATION": [
            r"\b(Nature|Science|Cell|PNAS|IEEE|ACM|Springer|Elsevier)\b",
            r"\b(arXiv|bioRxiv|medRxiv|SSRN|PubMed)\b",
            r"\b(Journal of [A-Z][a-zA-Z\s]+)\b",
        ],
        "CONFERENCE": [
            r"\b(NeurIPS|ICML|ICLR|CVPR|ICCV|ECCV|ACL|EMNLP|NAACL|COLING)\b",
            r"\b(AAAI|IJCAI|KDD|WWW|SIGIR|SIGMOD|VLDB|ICDE)\b",
            r"\b(CHI|UIST|IUI|HRI|CSCW)\b",
        ],
        "UNIVERSITY": [
            r"\b(MIT|Stanford|Harvard|Berkeley|Cambridge|Oxford|CMU)\b",
            r"\b(Tsinghua|Peking|Fudan|Zhejiang|SJTU|USTC)\b",
            r"\b(University of [A-Z][a-zA-Z\s]+)\b",
            r"\b([A-Z][a-zA-Z]+\s+University)\b",
        ],
        "THEOREM": [
            r"\b(Theorem\s+\d+(?:\.\d+)?|Lemma\s+\d+|Proposition\s+\d+)\b",
            r"\b(Bayes['']?\s+theorem|central limit theorem|law of large numbers)\b",
            r"\b(Eq(?:uation)?\.?\s*\(?\d+\)?)\b",
        ],
        "CHEMICAL": [
            r"\b(H2O|CO2|NaCl|O2|N2|CH4|H2SO4|HCl|NaOH)\b",
            r"\b([A-Z][a-z]?\d*(?:[A-Z][a-z]?\d*)+)\b",  # 化学式模式
        ],
        "DISEASE": [
            r"\b(COVID-19|SARS|MERS|HIV|AIDS|cancer|diabetes|Alzheimer)\b",
            r"\b(influenza|pneumonia|hepatitis|tuberculosis|malaria)\b",
        ],
        "GENE_PROTEIN": [
            r"\b([A-Z]{2,5}\d+[A-Z]?)\b",  # 如 TP53, BRCA1
            r"\b(mRNA|tRNA|rRNA|siRNA|miRNA|lncRNA)\b",
            r"\b(kinase|receptor|enzyme|antibody|antigen)\b",
        ],
        "SPECIES": [
            r"\b([A-Z][a-z]+\s+[a-z]+)\b",  # 拉丁学名如 Homo sapiens
            r"\b(E\.\s*coli|S\.\s*cerevisiae|C\.\s*elegans|D\.\s*melanogaster)\b",
        ],
        "VERSION": [
            r"\b(v\d+(?:\.\d+)*(?:-[a-zA-Z]+)?)\b",  # v1.0, v2.3.1-beta
            r"\b(version\s+\d+(?:\.\d+)*)\b",
            r"\b(\d+\.\d+(?:\.\d+)?(?:-[a-zA-Z]+\d*)?)\b",  # 3.8.0, 2.0-rc1
        ],
        "URL": [
            r"(https?://[^\s<>\"{}|\\^`\[\]]+)",
            r"(www\.[^\s<>\"{}|\\^`\[\]]+)",
        ],
        "EMAIL": [
            r"([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})",
        ],
    }

    def _extract_custom_entities(self, text):
        """使用正则模式提取自定义学术实体"""
        custom_entities = defaultdict(list)

        for entity_type, patterns in self.ACADEMIC_PATTERNS.items():
            for pattern in patterns:
                matches = re.finditer(
                    pattern,
                    text,
                    re.IGNORECASE
                    if entity_type not in ["ACRONYM", "GENE_PROTEIN", "CHEMICAL"]
                    else 0,
                )
                for match in matches:
                    entity_text = match.group(1) if match.groups() else match.group(0)
                    entity_text = entity_text.strip()
                    if (
                        len(entity_text) > 1
                        and entity_text not in custom_entities[entity_type]
                    ):
                        custom_entities[entity_type].append(entity_text)

        return custom_entities

    def extract_entities(self, text, include_custom=True):
        """提取命名实体并统计

        Args:
            text: 输入文本或文件路径
            include_custom: 是否包含自定义学术实体识别（默认True）

        Returns:
            包含实体列表、统计信息和类别说明的字典
        """
        text = self.load_text(text)
        doc = self.nlp(text)

        entities = defaultdict(list)

        # 1. SpaCy原生NER实体
        for ent in doc.ents:
            entities[ent.label_].append(ent.text)

        # 2. 自定义学术实体识别
        if include_custom:
            custom_entities = self._extract_custom_entities(text)
            for label, ents in custom_entities.items():
                # 避免重复添加已被SpaCy识别的实体
                for ent in ents:
                    if ent not in entities[label]:
                        entities[label].append(ent)

        # 统计每类实体的频率
        entity_stats = {}
        for label, ents in entities.items():
            counter = Counter(ents)
            label_desc = self.ENTITY_LABELS.get(label, label)
            entity_stats[label] = {
                "description": label_desc,
                "count": len(ents),
                "unique": len(counter),
                "top_entities": counter.most_common(5),
            }

        # 按实体数量排序
        sorted_stats = dict(
            sorted(entity_stats.items(), key=lambda x: x[1]["count"], reverse=True)
        )

        total_entities = sum(len(v) for v in entities.values())
        unique_entities = sum(len(set(v)) for v in entities.values())
        word_count = len(self._content_tokens(doc))
        sentence_count = len(self._get_sentences(doc, text))
        density_per_1k = round(
            (total_entities / word_count * 1000) if word_count else 0, 1
        )
        unique_ratio = round(
            (unique_entities / total_entities * 100) if total_entities else 0, 1
        )

        # === 新增直观指标 ===
        # 1. 实体覆盖率 (每句平均实体数)
        entities_per_sentence = round(
            total_entities / sentence_count if sentence_count else 0, 2
        )

        # 2. 实体多样性指数 (Shannon entropy归一化)
        type_counts = [len(v) for v in entities.values()]
        if type_counts and sum(type_counts) > 0:
            probs = np.array(type_counts) / sum(type_counts)
            probs = probs[probs > 0]
            entropy = -np.sum(probs * np.log2(probs))
            max_entropy = np.log2(len(type_counts)) if len(type_counts) > 1 else 1
            diversity_index = round(
                (entropy / max_entropy * 100) if max_entropy else 0, 1
            )
        else:
            diversity_index = 0

        # 3. 实体集中度 (top 3类型占比)
        top_3_count = sum(sorted(type_counts, reverse=True)[:3]) if type_counts else 0
        concentration_ratio = round(
            (top_3_count / total_entities * 100) if total_entities else 0, 1
        )

        # 4. 学术实体占比 (自定义类型 vs SpaCy原生)
        academic_labels = set(self.ACADEMIC_PATTERNS.keys())
        academic_count = sum(
            len(v) for k, v in entities.items() if k in academic_labels
        )
        academic_ratio = round(
            (academic_count / total_entities * 100) if total_entities else 0, 1
        )

        # 5. 重复实体率 (同一实体出现多次的比例)
        repeated_entities = sum(
            c - 1
            for ents in entities.values()
            for e, c in Counter(ents).items()
            if c > 1
        )
        repetition_ratio = round(
            (repeated_entities / total_entities * 100) if total_entities else 0, 1
        )

        # 6. 人物/机构比例 (学术论文特征指标)
        person_count = len(entities.get("PERSON", []))
        org_count = len(entities.get("ORG", []))
        person_org_ratio = round(
            (person_count / org_count) if org_count else person_count, 2
        )

        return {
            "entities": dict(entities),
            "statistics": sorted_stats,
            "total_entities": total_entities,
            "unique_entities": unique_entities,
            "entity_types": len(entities),
            "density_per_1k": density_per_1k,
            "unique_ratio": unique_ratio,
            # 新增指标
            "entities_per_sentence": entities_per_sentence,
            "diversity_index": diversity_index,
            "concentration_ratio": concentration_ratio,
            "academic_entity_ratio": academic_ratio,
            "repetition_ratio": repetition_ratio,
            "person_org_ratio": person_org_ratio,
            "label_descriptions": {
                k: v for k, v in self.ENTITY_LABELS.items() if k in entities
            },
        }

    # ==================== 3. 核心概念图谱模块 ====================

    def _extract_triples(self, doc, text):
        """从文本中抽取三元组（主语-谓语-宾语）"""
        triples = []

        for sent in self._get_sentences(doc, text):
            for token in sent:
                # 寻找动词作为关系
                if token.pos_ == "VERB":
                    subject = None
                    obj = None

                    for child in token.children:
                        if child.dep_ in ("nsubj", "nsubjpass"):
                            subject = self._get_compound(child)
                        elif child.dep_ in ("dobj", "pobj", "attr"):
                            obj = self._get_compound(child)

                    if subject and obj and len(subject) > 1 and len(obj) > 1:
                        triples.append((subject, token.lemma_, obj))

        return triples

    def _get_compound(self, token):
        """获取复合词（包含修饰成分）"""
        compounds = [
            child.text for child in token.lefts if child.dep_ in ("compound", "amod")
        ]
        compounds.append(token.text)
        return " ".join(compounds)

    def build_concept_graph(self, text, min_freq=1):
        """构建概念关系图谱"""
        text = self.load_text(text)
        doc = self.nlp(text)

        triples = self._extract_triples(doc, text)

        # 统计三元组频率
        triple_counter = Counter(triples)
        filtered_triples = [(t, c) for t, c in triple_counter.items() if c >= min_freq]

        # 构建图
        G = nx.DiGraph()
        for (subj, rel, obj), freq in filtered_triples:
            G.add_edge(subj, obj, relation=rel, weight=freq)

        num_nodes = G.number_of_nodes()
        num_edges = G.number_of_edges()
        avg_degree = round(
            (sum(dict(G.degree()).values()) / num_nodes) if num_nodes else 0, 2
        )
        density = round(nx.density(G), 4) if num_nodes > 1 else 0
        top_nodes = sorted(G.degree(), key=lambda x: x[1], reverse=True)[:5]

        # === 新增直观指标 ===
        # 1. 连通性指标
        if num_nodes > 0:
            # 弱连通分量数
            num_components = nx.number_weakly_connected_components(G)
            largest_component = max(nx.weakly_connected_components(G), key=len)
            largest_component_ratio = round(len(largest_component) / num_nodes * 100, 1)
        else:
            num_components = 0
            largest_component_ratio = 0

        # 2. 中心性指标
        if num_nodes > 0:
            # 度中心性
            degree_centrality = nx.degree_centrality(G)
            top_central_nodes = sorted(
                degree_centrality.items(), key=lambda x: x[1], reverse=True
            )[:5]
            avg_centrality = round(
                sum(degree_centrality.values()) / len(degree_centrality) * 100, 1
            )

            # PageRank中心性
            try:
                pagerank = nx.pagerank(G, max_iter=100)
                top_pagerank_nodes = sorted(
                    pagerank.items(), key=lambda x: x[1], reverse=True
                )[:5]
            except:
                top_pagerank_nodes = []
        else:
            top_central_nodes = []
            avg_centrality = 0
            top_pagerank_nodes = []

        # 3. 关系多样性 (不同谓词类型数量)
        unique_relations = set(data["relation"] for _, _, data in G.edges(data=True))
        relation_diversity = len(unique_relations)

        # 4. 边权重统计
        weights = [data.get("weight", 1) for _, _, data in G.edges(data=True)]
        if weights:
            avg_edge_weight = round(sum(weights) / len(weights), 2)
            max_edge_weight = max(weights)
        else:
            avg_edge_weight = 0
            max_edge_weight = 0

        # 5. 图的复杂度评分 (基于节点数、边数、密度的综合评分)
        if num_nodes > 0:
            complexity_score = round(
                min(100, (num_nodes * 2 + num_edges * 3 + density * 1000) / 10), 1
            )
        else:
            complexity_score = 0

        # 6. 孤立节点比例 (度为0的节点)
        isolated_nodes = [n for n in G.nodes() if G.degree(n) == 0]
        isolated_ratio = round(
            (len(isolated_nodes) / num_nodes * 100) if num_nodes else 0, 1
        )

        # 7. 入度/出度比 (信息流向指标)
        if num_nodes > 0:
            in_degrees = [d for n, d in G.in_degree()]
            out_degrees = [d for n, d in G.out_degree()]
            avg_in_degree = round(sum(in_degrees) / num_nodes, 2)
            avg_out_degree = round(sum(out_degrees) / num_nodes, 2)
        else:
            avg_in_degree = 0
            avg_out_degree = 0

        return {
            "graph": G,
            "triples": [(t[0], t[1], t[2], c) for t, c in filtered_triples],
            "num_nodes": num_nodes,
            "num_edges": num_edges,
            "avg_degree": avg_degree,
            "density": density,
            "top_nodes": top_nodes,
            # 新增指标
            "num_components": num_components,
            "largest_component_ratio": largest_component_ratio,
            "top_central_nodes": [(n, round(c * 100, 1)) for n, c in top_central_nodes],
            "avg_centrality": avg_centrality,
            "top_pagerank_nodes": [
                (n, round(p * 100, 2)) for n, p in top_pagerank_nodes
            ],
            "relation_diversity": relation_diversity,
            "avg_edge_weight": avg_edge_weight,
            "max_edge_weight": max_edge_weight,
            "complexity_score": complexity_score,
            "isolated_ratio": isolated_ratio,
            "avg_in_degree": avg_in_degree,
            "avg_out_degree": avg_out_degree,
        }

    def visualize_graph(self, graph_data, output_path=None, title="Concept Graph"):
        """可视化概念图谱"""
        G = graph_data["graph"]
        if G.number_of_nodes() == 0:
            print("图谱为空，无法可视化")
            return

        plt.figure(figsize=(12, 8))
        pos = nx.spring_layout(G, k=2, iterations=50)

        # 节点大小根据度数
        degrees = dict(G.degree())
        node_sizes = [300 + degrees[n] * 200 for n in G.nodes()]

        # 绘制
        nx.draw_networkx_nodes(
            G, pos, node_size=node_sizes, node_color="lightblue", alpha=0.7
        )
        nx.draw_networkx_labels(G, pos, font_size=9)
        nx.draw_networkx_edges(G, pos, edge_color="gray", arrows=True, alpha=0.6)

        # 边标签
        edge_labels = nx.get_edge_attributes(G, "relation")
        nx.draw_networkx_edge_labels(G, pos, edge_labels, font_size=7)

        plt.title(title)
        plt.axis("off")
        plt.tight_layout()

        if output_path:
            plt.savefig(output_path, dpi=150, bbox_inches="tight")
            print(f"图谱已保存至: {output_path}")
        plt.show()

    # ==================== 4. 术语定义抽取模块 ====================

    def extract_definitions(self, text):
        """抽取术语定义句"""
        text = self.load_text(text)
        doc = self.nlp(text)

        # 定义句模式
        definition_patterns = [
            r"(\w+(?:\s+\w+)?)\s+(?:is|are|refers to|means|denotes)\s+(.+?)(?:\.|$)",
            r"(\w+(?:\s+\w+)?)\s+(?:can be defined as|is defined as)\s+(.+?)(?:\.|$)",
            r"(?:The term\s+)?[\"']?(\w+(?:\s+\w+)?)[\"']?\s+(?:is|refers to)\s+(.+?)(?:\.|$)",
            r"(.+?)是指(.+?)(?:。|$)",
            r"(.+?)指的是(.+?)(?:。|$)",
            r"(.+?)可定义为(.+?)(?:。|$)",
        ]

        definitions = []
        for sent in self._get_sentences(doc, text):
            sent_text = sent.text.strip()
            for pattern in definition_patterns:
                match = re.search(pattern, sent_text, re.IGNORECASE)
                if match:
                    term = match.group(1).strip()
                    definition = match.group(2).strip()
                    if len(term) > 2 and len(definition) > 10:
                        definitions.append(
                            {
                                "term": term,
                                "definition": definition,
                                "sentence": sent_text,
                            }
                        )
                    break

        return definitions

    # ==================== 5. 关键词提取模块 ====================

    def extract_keywords(self, text, top_n=10):
        """基于TF-IDF思想的关键词提取，包含丰富统计指标"""
        text = self.load_text(text)
        doc = self.nlp(text)

        # 提取名词和形容词作为候选关键词
        candidates = []
        pos_distribution = Counter()
        pos_candidates = (
            ("NOUN", "PROPN", "ADJ", "VERB")
            if self.lang == "zh"
            else ("NOUN", "PROPN", "ADJ")
        )
        min_length = 2 if self.lang == "zh" else 3
        for token in doc:
            if (
                token.pos_ in pos_candidates
                and not token.is_stop
                and len(token.text) >= min_length
                and self._is_content_token(token)
            ):
                word = token.text if self.lang == "zh" else token.lemma_.lower()
                candidates.append(word)
                pos_distribution[token.pos_] += 1

        # 计算词频
        word_freq = Counter(candidates)
        total_words = len(candidates)
        unique_keywords = len(word_freq)

        # 计算TF分数，结合词性权重
        keywords = []
        for word, freq in word_freq.most_common(top_n * 2):
            tf = freq / total_words if total_words > 0 else 0
            keywords.append(
                {"word": word, "frequency": freq, "score": round(tf * 100, 2)}
            )

        top_keywords = sorted(keywords, key=lambda x: x["score"], reverse=True)[:top_n]

        # === 新增直观指标 ===
        # 1. 关键词覆盖率 (top N 关键词占候选词的比例)
        top_n_freq = sum(k["frequency"] for k in top_keywords)
        coverage_ratio = round(
            (top_n_freq / total_words * 100) if total_words else 0, 1
        )

        # 2. 关键词集中度 (top 3 关键词占比)
        top_3_freq = sum(k["frequency"] for k in top_keywords[:3])
        concentration_ratio = round(
            (top_3_freq / total_words * 100) if total_words else 0, 1
        )

        # 3. 词频分布均匀度 (基于Gini系数的反向，值越高分布越均匀)
        if word_freq:
            freqs = sorted(word_freq.values())
            n = len(freqs)
            if n > 1 and sum(freqs) > 0:
                gini = sum((2 * i - n - 1) * f for i, f in enumerate(freqs, 1)) / (
                    n * sum(freqs)
                )
                uniformity = round((1 - abs(gini)) * 100, 1)
            else:
                uniformity = 100
        else:
            uniformity = 0

        # 4. 平均关键词长度
        avg_keyword_length = round(
            sum(len(k["word"]) for k in top_keywords) / len(top_keywords)
            if top_keywords
            else 0,
            1,
        )

        # 5. 词性分布比例
        pos_ratios = {
            pos: round(count / total_words * 100, 1) if total_words else 0
            for pos, count in pos_distribution.most_common()
        }

        # 6. 稀有关键词率 (只出现1次的候选词比例)
        hapax_keywords = sum(1 for w, c in word_freq.items() if c == 1)
        hapax_ratio = round(
            (hapax_keywords / unique_keywords * 100) if unique_keywords else 0, 1
        )

        # 7. 关键词密度 (每100词的关键词出现次数)
        content_word_count = len(self._content_tokens(doc))
        keyword_density = round(
            (total_words / content_word_count * 100) if content_word_count else 0, 1
        )

        return {
            "keywords": top_keywords,
            "total_candidates": total_words,
            "unique_keywords": unique_keywords,
            # 新增指标
            "coverage_ratio": coverage_ratio,
            "concentration_ratio": concentration_ratio,
            "distribution_uniformity": uniformity,
            "avg_keyword_length": avg_keyword_length,
            "pos_distribution": pos_ratios,
            "hapax_ratio": hapax_ratio,
            "keyword_density": keyword_density,
        }

    # ==================== 6. 文本难度评估模块 ====================

    def assess_difficulty(self, text):
        """评估文本阅读难度，包含详细子评分"""
        text = self.load_text(text)
        doc = self.nlp(text)

        sentences = self._get_sentences(doc, text)
        words = self._content_tokens(doc)

        if not sentences or not words:
            return {"level": "未知", "score": 0, "sub_scores": {}, "metrics": {}}

        # 计算基础指标
        avg_sentence_length = len(words) / len(sentences)
        avg_word_length = sum(len(token.text) for token in words) / len(words)
        long_threshold = 2 if self.lang == "zh" else 6
        long_words = sum(1 for token in words if len(token.text) > long_threshold)
        long_word_ratio = long_words / len(words)

        # 专业术语比例（基于NER和大写词）
        technical_terms = len(
            [ent for ent in doc.ents if ent.label_ in ("ORG", "PRODUCT", "LAW")]
        )
        technical_ratio = technical_terms / len(sentences) if sentences else 0

        # === 新增细分评分维度 ===
        # 1. 句法复杂度评分 (0-25)
        sentence_lengths = [
            len([t for t in sent if self._is_content_token(t)]) for sent in sentences
        ]
        sentence_std = (
            float(np.std(sentence_lengths)) if len(sentence_lengths) > 1 else 0
        )
        syntax_score = min(25, avg_sentence_length * 0.8 + sentence_std * 0.3)

        # 2. 词汇复杂度评分 (0-25)
        unique_words = len(
            set(t.lemma_.lower() if self.lang != "zh" else t.text for t in words)
        )
        vocabulary_richness = unique_words / len(words) if words else 0
        vocab_score = min(25, avg_word_length * 2.5 + vocabulary_richness * 15)

        # 3. 专业术语评分 (0-25)
        # 包含NER实体、学术正则匹配、大写词
        upper_words = (
            sum(1 for t in words if t.text[0].isupper()) if self.lang != "zh" else 0
        )
        upper_ratio = upper_words / len(words) if words else 0
        academic_ents = len(
            [
                e
                for e in doc.ents
                if e.label_ in ("ORG", "PRODUCT", "LAW", "PERSON", "GPE", "WORK_OF_ART")
            ]
        )
        terminology_score = min(
            25,
            technical_ratio * 5
            + upper_ratio * 20
            + (academic_ents / len(sentences) if sentences else 0) * 3,
        )

        # 4. 抽象程度评分 (0-25)
        # 基于动词/名词比例和被动语态估算
        nouns = sum(1 for t in doc if t.pos_ in ("NOUN", "PROPN"))
        verbs = sum(1 for t in doc if t.pos_ == "VERB")
        noun_verb_ratio = nouns / verbs if verbs else nouns
        passive_indicators = sum(1 for t in doc if t.dep_ == "nsubjpass")
        passive_ratio = passive_indicators / len(sentences) if sentences else 0
        abstraction_score = min(
            25, noun_verb_ratio * 3 + passive_ratio * 10 + long_word_ratio * 15
        )

        # 综合难度分数 (0-100)
        score = syntax_score + vocab_score + terminology_score + abstraction_score

        # 难度等级
        if score < 30:
            level = "初级 (Elementary)"
            level_desc = "适合初学者，语言简洁易懂"
        elif score < 50:
            level = "中级 (Intermediate)"
            level_desc = "需要一定基础，包含部分专业内容"
        elif score < 70:
            level = "中高级 (Upper-Intermediate)"
            level_desc = "专业性较强，需要领域知识"
        else:
            level = "高级 (Advanced)"
            level_desc = "高度专业化，面向专家读者"

        # 各维度难度标签
        def get_dimension_level(s):
            if s < 8:
                return "低"
            elif s < 15:
                return "中"
            elif s < 20:
                return "中高"
            else:
                return "高"

        return {
            "level": level,
            "level_description": level_desc,
            "score": round(score, 1),
            "sub_scores": {
                "syntax_complexity": {
                    "score": round(syntax_score, 1),
                    "max": 25,
                    "level": get_dimension_level(syntax_score),
                    "description": "句法复杂度 (句长、句式变化)",
                },
                "vocabulary_complexity": {
                    "score": round(vocab_score, 1),
                    "max": 25,
                    "level": get_dimension_level(vocab_score),
                    "description": "词汇复杂度 (词长、词汇丰富度)",
                },
                "terminology_density": {
                    "score": round(terminology_score, 1),
                    "max": 25,
                    "level": get_dimension_level(terminology_score),
                    "description": "术语密度 (专业术语、实体)",
                },
                "abstraction_level": {
                    "score": round(abstraction_score, 1),
                    "max": 25,
                    "level": get_dimension_level(abstraction_score),
                    "description": "抽象程度 (名词化、被动语态)",
                },
            },
            "metrics": {
                "avg_sentence_length": round(avg_sentence_length, 1),
                "avg_word_length": round(avg_word_length, 1),
                "long_word_ratio": round(long_word_ratio * 100, 1),
                "vocabulary_richness": round(vocabulary_richness * 100, 1),
                "technical_term_ratio": round(technical_ratio * 100, 1),
                "passive_voice_ratio": round(passive_ratio * 100, 1),
                "noun_verb_ratio": round(noun_verb_ratio, 2),
                "sentence_count": len(sentences),
                "word_count": len(words),
            },
        }

    # ==================== 综合分析 ====================

    def analyze(self, text, num_summary_sentences=3):
        """综合分析论文，输出丰富的直观数据指标"""
        print("\n" + "=" * 70)
        print("学术论文辅助阅读系统 - 分析报告")
        print("=" * 70)

        # 0. 文本概览
        print("\n【0. 文本概览】")
        overview = self.basic_text_stats(text)
        print(
            f"字符数: {overview['char_count']} | 词数: {overview['word_count']} | 句数: {overview['sentence_count']}"
        )
        print(
            f"平均句长: {overview['avg_sentence_length']}词 | 中位句长: {overview['median_sentence_length']}词 | 标准差: {overview['std_sentence_length']}"
        )
        print(
            f"句长变异系数: {overview['cv_sentence_length']}% | 长句占比: {overview['long_sentence_ratio']}% | 短句占比: {overview['short_sentence_ratio']}%"
        )
        print(
            f"词汇多样性(TTR): {overview['type_token_ratio']}% | 唯一实义词率: {overview['unique_word_ratio']}% | 孤词率: {overview['hapax_ratio']}%"
        )
        print(
            f"停用词率: {overview['stop_word_ratio']}% | 实义词率: {overview['content_word_ratio']}% | 平均词长: {overview['avg_word_length']}字符"
        )
        print(f"Top10词覆盖率: {overview['top_10_coverage']}%")
        if overview["top_words"]:
            top_words = ", ".join([f"{w}({c})" for w, c in overview["top_words"]])
            print(f"高频词: {top_words}")

        # 1. 文本难度评估
        print("\n【1. 文本难度评估】")
        difficulty = self.assess_difficulty(text)
        print(f"难度等级: {difficulty['level']}")
        print(f"等级说明: {difficulty.get('level_description', '')}")
        print(f"综合难度分数: {difficulty['score']}/100")
        print("-" * 40)
        print("子维度评分:")
        if "sub_scores" in difficulty:
            for key, sub in difficulty["sub_scores"].items():
                print(
                    f"  {sub['description']}: {sub['score']}/{sub['max']} ({sub['level']})"
                )
        m = difficulty["metrics"]
        print("-" * 40)
        print(
            f"详细指标: 平均句长 {m['avg_sentence_length']}词 | 平均词长 {m['avg_word_length']}字符"
        )
        print(
            f"长词比例: {m['long_word_ratio']}% | 词汇丰富度: {m.get('vocabulary_richness', 'N/A')}%"
        )
        print(
            f"术语密度: {m.get('technical_term_ratio', 'N/A')}% | 被动语态率: {m.get('passive_voice_ratio', 'N/A')}%"
        )
        print(f"名动词比: {m.get('noun_verb_ratio', 'N/A')}")

        # 2. 摘要
        print("\n【2. 自动摘要】")
        summary = self.summarize(text, num_summary_sentences)
        print(
            f"原文句数: {summary['original_length']} → 摘要句数: {summary['summary_length']} (句子选取率: {summary['sentence_selection_ratio']}%)"
        )
        print(
            f"原文词数: {summary['original_words']} → 摘要词数: {summary['summary_words']} (词压缩率: {summary['compression_ratio']}%)"
        )
        print(
            f"冗余削减率: {summary['redundancy_reduction']}% | 关键词覆盖率: {summary['keyword_coverage']}% | 实体保留率: {summary['entity_retention']}%"
        )
        print(
            f"原文关键词密度: {summary['original_keyword_density']}% → 摘要关键词密度: {summary['summary_keyword_density']}% (提升: {summary['density_improvement']:+.1f}%)"
        )
        print(
            f"原文平均句长: {summary['original_avg_sent_len']}词 → 摘要平均句长: {summary['summary_avg_sent_len']}词"
        )
        print("-" * 40)
        for i, sent in enumerate(summary["sentences"], 1):
            print(f"  {i}. {sent[:100]}..." if len(sent) > 100 else f"  {i}. {sent}")

        # 3. 关键词
        print("\n【3. 关键词】")
        keywords_data = self.extract_keywords(text, top_n=8)
        keywords = keywords_data["keywords"]
        print(
            f"候选词总数: {keywords_data['total_candidates']} | 唯一关键词: {keywords_data['unique_keywords']}"
        )
        print(
            f"Top8覆盖率: {keywords_data['coverage_ratio']}% | Top3集中度: {keywords_data['concentration_ratio']}%"
        )
        print(
            f"分布均匀度: {keywords_data['distribution_uniformity']}% | 孤词率: {keywords_data['hapax_ratio']}%"
        )
        print(
            f"关键词密度: {keywords_data['keyword_density']}% | 平均关键词长度: {keywords_data['avg_keyword_length']}字符"
        )
        if keywords_data.get("pos_distribution"):
            pos_str = ", ".join(
                [f"{p}:{r}%" for p, r in keywords_data["pos_distribution"].items()]
            )
            print(f"词性分布: {pos_str}")
        kw_str = ", ".join(
            [f"{k['word']}({k['frequency']}, {k['score']}%)" for k in keywords[:8]]
        )
        print(f"关键词: {kw_str}")

        # 4. 实体
        print("\n【4. 关键实体】")
        entities = self.extract_entities(text)
        print(
            f"共识别 {entities['total_entities']} 个实体，涵盖 {entities['entity_types']} 种类型"
        )
        print(
            f"实体密度: {entities['density_per_1k']} 个/千词 | 唯一实体占比: {entities['unique_ratio']}%"
        )
        print(
            f"每句实体数: {entities['entities_per_sentence']} | 多样性指数: {entities['diversity_index']}%"
        )
        print(
            f"Top3类型集中度: {entities['concentration_ratio']}% | 学术实体占比: {entities['academic_entity_ratio']}%"
        )
        print(
            f"重复实体率: {entities['repetition_ratio']}% | 人物/机构比: {entities['person_org_ratio']}"
        )
        for label, stats in list(entities["statistics"].items())[:5]:
            if stats["top_entities"]:
                top = ", ".join([f"{e}({c})" for e, c in stats["top_entities"][:3]])
                desc = stats.get("description", label)
                print(f"  {desc}: {top}")

        # 5. 概念图谱
        print("\n【5. 概念图谱】")
        graph = self.build_concept_graph(text)
        print(
            f"节点数: {graph['num_nodes']} | 边数: {graph['num_edges']} | 平均度: {graph['avg_degree']} | 图密度: {graph['density']}"
        )
        print(
            f"连通分量数: {graph['num_components']} | 最大分量占比: {graph['largest_component_ratio']}%"
        )
        print(
            f"平均中心性: {graph['avg_centrality']}% | 关系多样性: {graph['relation_diversity']}种"
        )
        print(
            f"平均边权重: {graph['avg_edge_weight']} | 最大边权重: {graph['max_edge_weight']}"
        )
        print(
            f"复杂度评分: {graph['complexity_score']}/100 | 孤立节点率: {graph['isolated_ratio']}%"
        )
        print(
            f"平均入度: {graph['avg_in_degree']} | 平均出度: {graph['avg_out_degree']}"
        )
        if graph["top_nodes"]:
            top_nodes = ", ".join([f"{n}({d})" for n, d in graph["top_nodes"]])
            print(f"核心节点(度): {top_nodes}")
        if graph.get("top_central_nodes"):
            central = ", ".join(
                [f"{n}({c}%)" for n, c in graph["top_central_nodes"][:3]]
            )
            print(f"核心节点(中心性): {central}")
        if graph["triples"]:
            print("主要关系:")
            for subj, rel, obj, freq in sorted(graph["triples"], key=lambda x: -x[3])[
                :5
            ]:
                print(f"  {subj} --[{rel}]--> {obj} (频率:{freq})")

        # 6. 术语定义
        print("\n【6. 术语定义】")
        definitions = self.extract_definitions(text)
        if definitions:
            definition_ratio = round(
                (len(definitions) / overview["sentence_count"] * 100)
                if overview["sentence_count"]
                else 0,
                1,
            )
            print(f"识别定义句: {len(definitions)} 条 (占总句数: {definition_ratio}%)")
            for d in definitions[:3]:
                print(f"  {d['term']}: {d['definition'][:80]}...")
        else:
            print("  未检测到明确的术语定义句")

        print("\n" + "=" * 70)

        return {
            "overview": overview,
            "difficulty": difficulty,
            "summary": summary,
            "keywords": keywords_data,
            "entities": entities,
            "graph": graph,
            "definitions": definitions,
        }

    def export_report(self, results, output_path):
        """导出分析报告为JSON，包含所有直观指标"""
        export_data = {
            "overview": results.get("overview", {}),
            "difficulty": results.get("difficulty", {}),
            "summary": {k: v for k, v in results["summary"].items() if k != "sentences"}
            | {"sentences": results["summary"]["sentences"]},
            "keywords": results.get("keywords", {}),
            "entities": {
                k: v for k, v in results["entities"].items() if k != "entities"
            }
            | {"entities": results["entities"]["entities"]},
            "graph": {
                "num_nodes": results["graph"]["num_nodes"],
                "num_edges": results["graph"]["num_edges"],
                "avg_degree": results["graph"]["avg_degree"],
                "density": results["graph"]["density"],
                "top_nodes": results["graph"]["top_nodes"],
                "triples": results["graph"]["triples"],
                "num_components": results["graph"].get("num_components", 0),
                "largest_component_ratio": results["graph"].get(
                    "largest_component_ratio", 0
                ),
                "top_central_nodes": results["graph"].get("top_central_nodes", []),
                "avg_centrality": results["graph"].get("avg_centrality", 0),
                "relation_diversity": results["graph"].get("relation_diversity", 0),
                "complexity_score": results["graph"].get("complexity_score", 0),
                "avg_in_degree": results["graph"].get("avg_in_degree", 0),
                "avg_out_degree": results["graph"].get("avg_out_degree", 0),
            },
            "definitions": results["definitions"],
        }
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(export_data, f, ensure_ascii=False, indent=2)
        print(f"报告已导出至: {output_path}")


def interactive_mode():
    """交互模式"""
    print("\n" + "=" * 60)
    print("学术论文辅助阅读系统 (Academic Paper Reading Assistant)")
    print("=" * 60)
    print("命令说明:")
    print("  1. 输入文本或文件路径进行分析")
    print("  2. 输入 'demo' 查看英文示例")
    print("  3. 输入 'demo_zh' 查看中文示例")
    print("  4. 输入 'zh' 切换中文模型 / 'en' 切换英文模型")
    print("  5. 输入 'ai' 配置自定义AI模型")
    print("  6. 输入 'ai_on'/'ai_off' 开启或关闭自定义AI")
    print("  7. 输入 'quit' 退出")
    print("=" * 60)

    assistant = AcademicPaperAssistant()

    # 英文示例文本
    demo_text_en = """
    Natural Language Processing (NLP) is a field of artificial intelligence that focuses on
    the interaction between computers and humans through natural language. The ultimate goal
    of NLP is to enable computers to understand, interpret, and generate human language in
    a valuable way. Machine learning is a subset of artificial intelligence that provides
    systems the ability to automatically learn and improve from experience. Deep learning
    is a type of machine learning that uses neural networks with many layers.

    Transformers are a type of neural network architecture that has revolutionized NLP.
    BERT, developed by Google, is a transformer-based model that achieved state-of-the-art
    results on many NLP tasks. GPT, created by OpenAI, is another influential transformer
    model that excels at text generation. These models have been applied to various tasks
    including sentiment analysis, named entity recognition, and machine translation.

    Word embeddings refer to dense vector representations of words that capture semantic
    relationships. Word2Vec is a popular technique for learning word embeddings from large
    text corpora. The attention mechanism allows models to focus on relevant parts of the
    input when producing output.
    """

    # 中文示例文本
    demo_text_zh = """
    自然语言处理是人工智能领域的一个重要分支，主要研究如何让计算机理解和生成人类语言。
    近年来，深度学习技术的发展极大地推动了自然语言处理的进步。词向量是一种将词语映射到
    连续向量空间的技术，能够捕捉词语之间的语义关系。

    Transformer模型是一种基于注意力机制的神经网络架构，由谷歌在2017年提出。BERT模型
    是基于Transformer的预训练语言模型，在多项自然语言处理任务上取得了突破性成果。
    中国的研究机构如清华大学、北京大学也在自然语言处理领域做出了重要贡献。

    知识图谱是一种结构化的知识表示方法，通过实体和关系来描述现实世界中的概念及其联系。
    命名实体识别是指从文本中识别出具有特定意义的实体，如人名、地名、机构名等。
    """

    while True:
        print("\n" + "-" * 40)
        ai_status = "开" if assistant.use_custom_ai else "关"
        user_input = input(
            f"[当前模型: {'中文' if assistant.lang == 'zh' else '英文'} | 自定义AI: {ai_status}] 请输入: "
        ).strip()

        if user_input.lower() == "quit":
            print("感谢使用，再见！")
            break
        elif user_input.lower() == "zh":
            assistant.switch_language("zh")
        elif user_input.lower() == "en":
            assistant.switch_language("en")
        elif user_input.lower() == "ai":
            base_url = input("请输入自定义模型 base_url: ").strip()
            api_key = input("请输入 API key: ").strip()
            model_name = (
                input("请输入模型名称(默认 gpt-3.5-turbo): ").strip() or "gpt-3.5-turbo"
            )
            if base_url and api_key:
                assistant.configure_custom_ai(base_url, api_key, model_name)
                print("自定义AI配置完成，已启用。")
            else:
                print("base_url 或 API key 为空，未启用自定义AI。")
        elif user_input.lower() == "ai_on":
            assistant.toggle_custom_ai(True)
            print("自定义AI已开启。")
        elif user_input.lower() == "ai_off":
            assistant.toggle_custom_ai(False)
            print("自定义AI已关闭。")
        elif user_input.lower() == "demo":
            results = assistant.analyze(demo_text_en)
            _post_analysis(assistant, results)
        elif user_input.lower() == "demo_zh":
            if assistant.lang != "zh":
                assistant.switch_language("zh")
            results = assistant.analyze(demo_text_zh)
            _post_analysis(assistant, results)
        elif user_input:
            try:
                # 自动检测语言并切换模型
                detected_lang = detect_language(user_input)
                if detected_lang != assistant.lang:
                    switch = input(
                        f"检测到{'中文' if detected_lang == 'zh' else '英文'}文本，是否切换模型? (y/n): "
                    )
                    if switch.lower() == "y":
                        assistant.switch_language(detected_lang)

                results = assistant.analyze(user_input)
                _post_analysis(assistant, results)
            except Exception as e:
                print(f"分析出错: {e}")


def _post_analysis(assistant, results):
    """分析后的交互选项"""
    viz = input("\n是否生成概念图谱可视化? (y/n): ").strip().lower()
    if viz == "y":
        assistant.visualize_graph(results["graph"])

    export = input("是否导出JSON报告? (y/n): ").strip().lower()
    if export == "y":
        assistant.export_report(results, "analysis_report.json")


if __name__ == "__main__":
    interactive_mode()
