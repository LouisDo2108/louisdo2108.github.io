+++
title = "Week 46 · 9–15 Nov 2026"
description = "Paper digest for ISO week 2026-W46: legible LLM-driven recommendation, robot-use agents trained with RL in simulation, coverage collapse in policy optimization, speculative self-distillation and action representations for world models."
date = 2026-11-09

[extra]
iso_week = "2026-W46"
week_end = 2026-11-15
trend = "Post-training is the common thread this week: theory explains why REINFORCE-style updates can collapse a base model's coverage, while self-distillation and RL in simulation push new knowledge and skills (even robot control) into open-weight models. On the retrieval side, LLM-written natural-language interest profiles are now a production retrieval key at Meta, and world models increasingly reuse pretrained video encoders such as V-JEPA 2 instead of learning actions from scratch."

[[extra.revision]]
title = "Recommender Systems with Generative Retrieval"
groups = "Google, University of Wisconsin–Madison"
venue_short = "NeurIPS 2023"
venue = "Advances in Neural Information Processing Systems"
in_zotero = true
why = "TIGER: items become tuples of semantic IDs and recommendation becomes generative retrieval, the base that this week's generative recommenders (and CLEAR's retrieval addressing) build on."
figure = { file = "tiger.png", caption = "Figure 1: Overview of the TIGER framework. Sequential recommendation is expressed as generative retrieval by representing each item as a tuple of discrete semantic tokens.", license = "arXiv non-exclusive" }
links = { pdf = "https://arxiv.org/pdf/2305.05065", proceedings = "https://doi.org/10.52202/075280-0452", arxiv = "https://arxiv.org/abs/2305.05065" }

[[extra.revision]]
title = "On-Policy Distillation of Language Models: Learning from Self-Generated Mistakes"
groups = "Google DeepMind"
venue_short = "ICLR 2024"
venue = "International Conference on Learning Representations"
in_zotero = false
zotero_added = true
why = "GKD: trains the student on its own samples with teacher feedback, the on-policy distillation baseline that Speculative Self-Distillation refines."
links = { pdf = "https://proceedings.iclr.cc/paper_files/paper/2024/file/5be69a584901a26c521c2b51e40a4c20-Paper-Conference.pdf", proceedings = "https://proceedings.iclr.cc/paper_files/paper/2024/hash/5be69a584901a26c521c2b51e40a4c20-Abstract-Conference.html", arxiv = "https://arxiv.org/abs/2306.13649" }

[[extra.revision]]
title = "V-JEPA 2: Self-Supervised Video Models Enable Understanding, Prediction and Planning"
groups = "Meta FAIR"
venue_short = "arXiv 2025"
venue = "arXiv preprint"
in_zotero = false
zotero_added = true
why = "A self-supervised video encoder pretrained on 1M+ hours of video that also serves as an action-conditioned world model for planning; OnlyAct and several JEPA world models this week start from it."
figure = { file = "vjepa2.png", caption = "Figure 1: V-JEPA 2 overview. The video model is pretrained with a mask-denoising objective on internet-scale video and images, then used for understanding, prediction and robot planning.", license = "CC BY 4.0" }
links = { pdf = "https://arxiv.org/pdf/2506.09985", arxiv = "https://arxiv.org/abs/2506.09985", code = "https://github.com/facebookresearch/vjepa2" }

[[extra.papers]]
title = "CLEAR: Legible and Steerable Recommendation via Grounded Natural-Language Interests"
groups = "Meta"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "retrieval"
why = "A deployed recommender (Instagram, Facebook) whose user state is an editable list of LLM-inferred, behaviour-grounded interests; each interest drives lexical, behavioural and embedding retrieval plus ranking."
links = { pdf = "https://arxiv.org/pdf/2611.19110", arxiv = "https://arxiv.org/abs/2611.19110" }

[[extra.papers]]
title = "Training Reasoning Models in Simulation to Natively Use Real Robots"
groups = "MIT, UC Berkeley, UCSD, NVIDIA"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "agentic"
why = "Treats robot control like computer use: an open-weight 27B reasoning model is trained with RL purely in simulation to output end-effector poses, then transfers to unseen tasks, a new robot and a real dual-arm robot."
figure = { file = "robot-use-rl.png", caption = "Figure 2: One round of robot use. Like a computer-use agent that observes a screenshot and outputs a click, the model observes camera views and arm state, reasons, and outputs the next end-effector pose.", license = "arXiv non-exclusive" }
links = { pdf = "https://arxiv.org/pdf/2611.18562", arxiv = "https://arxiv.org/abs/2611.18562", code = "https://github.com/mit-han-lab/pear" }

[[extra.papers]]
title = "A Theory of Policy Optimization in Post-Training: Coverage Collapse and Reference Resets"
groups = "Microsoft Research, Kempner Institute at Harvard, UIUC, UCSD"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "rl"
why = "Shows REINFORCE (and so PPO/GRPO) can drive the probability of optimal responses towards zero even as reward rises, and proves that resetting the KL reference to the latest policy restores convergence."
use_now = "In long GRPO/PPO runs, periodically reset the KL reference model to the current policy instead of keeping the base model fixed."
figure = { file = "coverage-collapse.png", caption = "Figure 3: APMD keeps improving by resetting the reference policy; each surface shows the KL-regularized objective for one reference policy, coloured by reward.", license = "CC BY 4.0" }
links = { pdf = "https://arxiv.org/pdf/2611.14467", arxiv = "https://arxiv.org/abs/2611.14467" }

[[extra.papers]]
title = "Speculative Self-Distillation enables Efficient Knowledge Internalization"
groups = "Stanford, ETH Zürich"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "rl"
why = "Internalizes new facts and skills by self-distillation where the document-conditioned teacher only intervenes on tokens where it disagrees with the student; near on-policy accuracy with 38–69% fewer supervised tokens and the least forgetting."
use_now = "To bake updated documents into a model closed-book, let the student roll out and only take teacher tokens where the two next-token distributions diverge strongly."
figure = { file = "ssd.png", caption = "Figure 1: Speculative Self-Distillation decoding loop. The student sees only the prompt, the teacher also sees the privileged context, and the teacher takes over only where their next-token distributions diverge.", license = "arXiv non-exclusive" }
links = { pdf = "https://arxiv.org/pdf/2611.12016", arxiv = "https://arxiv.org/abs/2611.12016" }

[[extra.papers]]
title = "OnlyAct: Extracting Action Representations from Foundation Models for World Models"
groups = "University of Oxford"
venue_short = "arXiv 2026"
venue = "arXiv preprint"
in_zotero = false
topic = "world-models"
why = "Instead of learning latent actions from scratch, adapts V-JEPA 2 with label-free contrastive training so frame-pair embeddings keep the motion and drop the scene, giving one action space that transfers across domains."
figure = { file = "onlyact.png", caption = "Figure 2: OnlyAct learning pipeline. Frame pairs are encoded by a pretrained foundation model with shared low-rank adapters and trained contrastively to keep the action while discarding the scene.", license = "arXiv non-exclusive" }
links = { pdf = "https://arxiv.org/pdf/2611.14420", arxiv = "https://arxiv.org/abs/2611.14420" }
+++
