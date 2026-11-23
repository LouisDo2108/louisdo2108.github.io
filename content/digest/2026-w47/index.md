+++
title = "Week 47 · 16–22 Nov 2026"
description = "Paper digest for ISO week 2026-W47: cold-start cross-model embedding retrieval, a fair BM25 baseline for code search, agents that design their own self-improvement, reusing teacher RL rollouts for distillation and counterfactual JEPA world models."
date = 2026-11-16

[extra]
iso_week = "2026-W47"
week_end = 2026-11-22
trend = "Re-using what you already have is the common thread this week: Google projects queries from a new encoder into an existing index instead of re-embedding the corpus, a fair, identifier-expanded BM25 erases most of the dense advantage in code search, and CMU distils students from the teacher's saved GRPO rollouts instead of regenerating data. Agents and world models are also learning from their own experience: frontier LLMs organise their own self-improvement loops, and JEPA world models reuse an observed outcome's residual to answer \"what if\" questions."

[[extra.revision]]
title = "Precise Zero-Shot Dense Retrieval without Relevance Labels"
groups = "Carnegie Mellon University, University of Waterloo"
venue_short = "ACL 2023"
venue = "Annual Meeting of the Association for Computational Linguistics"
in_zotero = true
why = "HyDE: an LLM writes a hypothetical answer document and its embedding is used as the query, the generate-then-retrieve idea that this week's generate-then-grep expansion for BM25 code search applies with identifiers."
links = { pdf = "https://aclanthology.org/2023.acl-long.99.pdf", proceedings = "https://aclanthology.org/2023.acl-long.99/", arxiv = "https://arxiv.org/abs/2212.10496" }

[[extra.revision]]
title = "Reflexion: Language Agents with Verbal Reinforcement Learning"
groups = "Northeastern University, MIT, Princeton"
venue_short = "NeurIPS 2023"
venue = "Advances in Neural Information Processing Systems"
in_zotero = false
why = "Agents improve by writing verbal reflections on failures into memory instead of updating weights, the human-designed context-optimisation loop that this week's MIT paper asks whether capable agents can now invent for themselves."
links = { pdf = "https://arxiv.org/pdf/2303.11366", proceedings = "https://doi.org/10.52202/075280-0377", arxiv = "https://arxiv.org/abs/2303.11366" }

[[extra.revision]]
title = "Harnessing the Universal Geometry of Embeddings"
groups = "Cornell University"
venue_short = "NeurIPS 2025"
venue = "Advances in Neural Information Processing Systems"
in_zotero = false
why = "vec2vec translates embeddings between models without paired data by exploiting a shared latent geometry, the unsupervised end of the cross-model retrieval problem that ERA solves with a small anchor budget."
figure = { file = "vec2vec.png", caption = "Figure 3: Unsupervised embedding translation. With access only to embeddings from one model, vec2vec learns to map them close to the ideal embeddings of a second model without the documents or the first model.", license = "CC BY 4.0" }
links = { pdf = "https://arxiv.org/pdf/2505.12540", proceedings = "https://doi.org/10.52202/085713-1530", arxiv = "https://arxiv.org/abs/2505.12540" }

[[extra.papers]]
title = "ERA: Embed, Route, Adapt for Cold-Start Cross-Model Latent Retrieval"
groups = "Google"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "retrieval"
why = "Serves queries from a cheap encoder against an existing index built by another model without re-embedding the corpus: anchors chosen by cosine farthest-point sampling, an adapter trained with directional alignment plus orthogonal regularisation, and a router that escalates hard queries to the original encoder (up to +35% relative nDCG@10 on ArguAna)."
use_now = "When swapping or downsizing a query encoder, embed a few farthest-point-sampled anchor documents with both models and train a small linear adapter with an orthogonality regulariser instead of re-indexing."
figure = { file = "era.png", caption = "Figure 1: Overview of the ERA (Embed, Route, Adapt) architecture for cold-start cross-model latent retrieval.", license = "CC BY 4.0" }
links = { pdf = "https://arxiv.org/pdf/2611.26919", arxiv = "https://arxiv.org/abs/2611.26919" }

[[extra.papers]]
title = "Embeddings vs. Grep: Rethinking the Dense Advantage in Code Search"
groups = "Ant Group"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "retrieval"
why = "A repository-level code-search benchmark (RepoPremium) shows much of the dense-over-BM25 gap comes from evaluation choices (chunked BM25, counting edited tests) and queries missing the code's rare identifiers; expanding queries with LLM-written identifiers lets BM25 match dense retrieval on every Python pool."
use_now = "Before claiming a dense gain, compare against tuned whole-file BM25, fuse dense with BM25, and expand queries with LLM-generated identifiers (generate-then-grep)."
links = { pdf = "https://arxiv.org/pdf/2611.20455", arxiv = "https://arxiv.org/abs/2611.20455", code = "https://github.com/hq-bench/repo-premium" }

[[extra.papers]]
title = "Do LLM Agents Still Need to Be Told How to Self-Improve?"
groups = "MIT CSAIL, University of Tübingen"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "agentic"
why = "Gives a frozen frontier LLM only Read/Write/Bash/Gameplay tools, a budget and the goal of getting better at puzzle games; strong models invent their own curricula (writing practice and adversarial games) and context updates that transfer to held-out games and 3D navigation, with no prescribed self-improvement loop."
figure = { file = "self-improve.png", caption = "Figure 1: A frozen LLM is given the goal of improving at gameplay, builds its own test games, spawns player sessions and updates the player's context files based on observed failures.", license = "CC BY-NC-SA 4.0" }
links = { pdf = "https://arxiv.org/pdf/2611.23219", arxiv = "https://arxiv.org/abs/2611.23219" }

[[extra.papers]]
title = "Don't Discard Your Rollouts: Reusing Teacher RL Traces for Student Distillation"
groups = "Carnegie Mellon University"
venue_short = "NeurIPS 2026"
venue = "Advances in Neural Information Processing Systems"
in_zotero = false
topic = "rl"
why = "Distils students from the rollouts already saved during a teacher's GRPO run: easy prompts (by pass rate) for an SFT warm start, mixed-success prompts for DPO, and the teacher's saved log-likelihoods to pick student-compatible completions; matches canonical distillation on maths and code with no extra generation."
use_now = "Log prompt pass rates and per-completion log-likelihoods during GRPO so the rollouts can later be reused to distil smaller models."
links = { pdf = "https://arxiv.org/pdf/2611.26803", arxiv = "https://arxiv.org/abs/2611.26803", code = "https://github.com/vashistht/rollout_reuse" }

[[extra.papers]]
title = "Counterfactual World Models: JEPAs That Reason About \"What If\""
groups = "Brown University, New York University, AMI Labs"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "world-models"
why = "After observing an outcome, adds the observed residual to the factual model's prediction for another action to estimate what would have happened under the same hidden disturbance; no new training, with error bounds for short transitions, and counterfactual R² rising from about 40% to 86–96% in simulated control tasks."
links = { pdf = "https://arxiv.org/pdf/2611.24778", arxiv = "https://arxiv.org/abs/2611.24778" }
+++
