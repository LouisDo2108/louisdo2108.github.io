+++
title = "Week 47 · 16–22 Nov 2026"
description = "Prototype week: sample papers to preview the digest layout."
date = 2026-11-16
draft = true

[extra]
iso_week = "2026-W47"
week_end = 2026-11-22
prototype = true
trend = "Prototype entries: well-known papers used only to preview the layout. Real weeks are filled in by the Monday digest task."

# ── How a week file works ─────────────────────────────────────────
# [[extra.revision]] : 3 fundamental / high-impact papers to re-read (newer preferred).
#                      in_zotero = false → shows "+ add to Zotero-DB".
# [[extra.papers]]   : this week's new papers (at most 10), grouped on the page by `topic`
#                      (retrieval | agentic | rl | representation | multimodal | world-models).
#                      retrieval covers BM25/TF-IDF, dense, sparse, generative retrieval and recsys;
#                      agentic covers agents, tool use, agentic search and agentic RL.
#                      in_zotero = false → "+ add to Zotero-DB" (not added automatically).
# Fields: title, groups, venue_short, venue, topic, why, use_now (optional), in_zotero,
#         figure = { file = "<image next to this file>", caption = "Figure N: …" } (optional),
#         links  = { pdf (proceedings PDF first, arXiv PDF fallback), proceedings, arxiv, code }

[[extra.revision]]
title = "ColPali: Efficient Document Retrieval with Vision Language Models"
groups = "Illuin Technology, CentraleSupélec, ETH Zürich"
venue_short = "ICLR 2025"
venue = "International Conference on Learning Representations"
in_zotero = true
why = "Retrieves document pages straight from their images with late interaction, skipping OCR and layout parsing."
figure = { file = "colpali.png", caption = "Figure 1: ColPali simplifies document retrieval w.r.t. standard retrieval methods while achieving stronger performances with better latencies." }
links = { pdf = "https://arxiv.org/pdf/2407.01449", arxiv = "https://arxiv.org/abs/2407.01449" }

[[extra.revision]]
title = "DeepSeek-R1: Incentivizing Reasoning Capability in LLMs via Reinforcement Learning"
groups = "DeepSeek-AI"
venue_short = "Nature 2025"
venue = "Nature"
in_zotero = true
why = "Shows that large-scale RL with rule-based rewards (GRPO) alone can make long chain-of-thought reasoning emerge."
figure = { file = "deepseek-r1.png", caption = "Figure 4: Performance of PPO and GRPO on the MATH task." }
links = { pdf = "https://arxiv.org/pdf/2501.12948", arxiv = "https://arxiv.org/abs/2501.12948" }

[[extra.revision]]
title = "Genie: Generative Interactive Environments"
groups = "Google DeepMind"
venue_short = "ICML 2024"
venue = "International Conference on Machine Learning"
in_zotero = false
zotero_added = true
why = "Learns a playable world model from unlabelled internet videos by inferring latent actions."
figure = { file = "genie.png", caption = "Figure 3: ST-transformer architecture, composed of spatiotemporal blocks with spatial, temporal and feed-forward layers." }
links = { pdf = "https://arxiv.org/pdf/2402.15391", arxiv = "https://arxiv.org/abs/2402.15391" }

[[extra.papers]]
title = "Direct Preference Optimization: Your Language Model is Secretly a Reward Model"
groups = "Stanford"
venue_short = "NeurIPS 2023"
venue = "Advances in Neural Information Processing Systems"
in_zotero = true
topic = "rl"
why = "Replaces the RLHF reward model and PPO loop with a single classification-style loss on preference pairs."
figure = { file = "dpo.png", caption = "Figure 1: DPO optimizes for human preferences while avoiding reinforcement learning." }
links = { pdf = "https://arxiv.org/pdf/2305.18290", arxiv = "https://arxiv.org/abs/2305.18290" }

[[extra.papers]]
title = "Learning Transferable Visual Models From Natural Language Supervision"
groups = "OpenAI"
venue_short = "ICML 2021"
venue = "International Conference on Machine Learning (PMLR 139)"
in_zotero = true
topic = "representation"
why = "CLIP: contrastive image–text pretraining at scale, the backbone behind most multimodal retrievers."
figure = { file = "clip.png", caption = "Figure 1: Summary of our approach. CLIP jointly trains an image encoder and a text encoder to predict the correct pairings of a batch of (image, text) training examples." }
links = { pdf = "https://proceedings.mlr.press/v139/radford21a/radford21a.pdf", proceedings = "https://proceedings.mlr.press/v139/radford21a.html", arxiv = "https://arxiv.org/abs/2103.00020", code = "https://github.com/openai/CLIP" }

[[extra.papers]]
title = "ColBERT: Efficient and Effective Passage Search via Contextualized Late Interaction over BERT"
groups = "Stanford"
venue_short = "SIGIR 2020"
venue = "ACM SIGIR Conference on Research and Development in Information Retrieval"
in_zotero = true
topic = "retrieval"
why = "Late interaction keeps per-token embeddings, getting close to cross-encoder quality at bi-encoder cost."
figure = { file = "colbert.png", caption = "Figure 2: Query–document matching paradigms in neural IR, contrasting existing approaches (a–c) with the proposed late interaction (d)." }
links = { pdf = "https://dl.acm.org/doi/pdf/10.1145/3397271.3401075", proceedings = "https://dl.acm.org/doi/10.1145/3397271.3401075", arxiv = "https://arxiv.org/abs/2004.12832", code = "https://github.com/stanford-futuredata/ColBERT" }

[[extra.papers]]
title = "Dense Passage Retrieval for Open-Domain Question Answering"
groups = "Meta AI (FAIR), University of Washington, Princeton"
venue_short = "EMNLP 2020"
venue = "Conference on Empirical Methods in Natural Language Processing"
in_zotero = true
topic = "retrieval"
why = "The standard dual-encoder baseline for dense retrieval and RAG."
links = { pdf = "https://aclanthology.org/2020.emnlp-main.550.pdf", proceedings = "https://aclanthology.org/2020.emnlp-main.550/", arxiv = "https://arxiv.org/abs/2004.04906", code = "https://github.com/facebookresearch/DPR" }

[[extra.papers]]
title = "Transformer Memory as a Differentiable Search Index"
groups = "Google Research"
venue_short = "NeurIPS 2022"
venue = "Advances in Neural Information Processing Systems"
in_zotero = true
topic = "retrieval"
why = "Generative retrieval: a single seq2seq model maps queries straight to document IDs."
figure = { file = "dsi.png", caption = "Figure 2: Hierarchical clustering assigns semantically structured docids; beam search navigates this trie at inference." }
links = { pdf = "https://arxiv.org/pdf/2202.06991", arxiv = "https://arxiv.org/abs/2202.06991" }

[[extra.papers]]
title = "Matryoshka Representation Learning"
groups = "University of Washington, Google Research"
venue_short = "NeurIPS 2022"
venue = "Advances in Neural Information Processing Systems"
in_zotero = true
topic = "representation"
why = "Nested embeddings that stay useful when truncated, so one model serves several index sizes."
use_now = "Truncate embeddings to 256-d to cut index storage, then re-rank the top results with full-size vectors."
figure = { file = "mrl.png", caption = "Figure 1: Matryoshka Representation Learning optimizes the original loss at several nested representation sizes, enabling adaptive deployment." }
links = { pdf = "https://arxiv.org/pdf/2205.13147", arxiv = "https://arxiv.org/abs/2205.13147" }

[[extra.papers]]
title = "Visual Instruction Tuning"
groups = "University of Wisconsin–Madison, Microsoft Research"
venue_short = "NeurIPS 2023"
venue = "Advances in Neural Information Processing Systems"
in_zotero = true
topic = "multimodal"
why = "LLaVA: connects a vision encoder to an LLM and trains it on GPT-generated visual instructions."
links = { pdf = "https://arxiv.org/pdf/2304.08485", arxiv = "https://arxiv.org/abs/2304.08485", code = "https://github.com/haotian-liu/LLaVA" }

[[extra.papers]]
title = "Mastering Diverse Domains through World Models"
groups = "Google DeepMind"
venue_short = "Nature 2025"
venue = "Nature"
in_zotero = false
topic = "world-models"
why = "DreamerV3: one set of hyperparameters learns behaviours in imagination across very different domains."
figure = { file = "dreamerv3.png", caption = "Figure 1: Benchmark summary. With fixed hyperparameters across all domains, Dreamer outperforms tuned expert algorithms." }
links = { pdf = "https://arxiv.org/pdf/2301.04104", arxiv = "https://arxiv.org/abs/2301.04104", code = "https://github.com/danijar/dreamerv3" }

[[extra.papers]]
title = "ReAct: Synergizing Reasoning and Acting in Language Models"
groups = "Princeton, Google Research"
venue_short = "ICLR 2023"
venue = "International Conference on Learning Representations"
in_zotero = false
topic = "agentic"
why = "Interleaves reasoning traces with tool calls, the pattern most LLM agents and agentic search systems still build on."
links = { pdf = "https://arxiv.org/pdf/2210.03629", arxiv = "https://arxiv.org/abs/2210.03629", code = "https://github.com/ysymyth/ReAct" }
+++
