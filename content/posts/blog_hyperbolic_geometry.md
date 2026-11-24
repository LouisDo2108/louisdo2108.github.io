---
title: "A Practical Primer on Hyperbolic Geometry for Representation Learning"
date: 2026-11-25
tags: [hyperbolic geometry, representation learning, vision-language models, retrieval]
extra:
  math: true
---

This post collects the hyperbolic geometry I needed while working on vision-language retrieval.
It is written as a reference: definitions, the formulas you actually implement, and short notes on why each piece matters.
Most of the material comes from MERU, Hyperbolic Neural Networks++, Fully Hyperbolic Neural Networks and a few recent papers, which I cite at the end.

Throughout, $c > 0$ is the (absolute) curvature, so the space has constant curvature $-c$.
$\lVert \cdot \rVert$ is the Euclidean norm and $\langle \cdot, \cdot \rangle$ is the Euclidean inner product.

## 1. Why hyperbolic space?

Concepts are hierarchical.
"Dog" is a "mammal", which is an "animal".
A photo of a black cat is more specific than the caption "a cat".
The number of nodes in a tree grows exponentially with depth.

Euclidean space only has polynomial volume growth: a ball of radius $r$ in $\mathbb{R}^n$ has volume proportional to $r^n$.
Embedding a large tree in it forces either very high dimension or high distortion.
Hyperbolic space has exponential volume growth.
For example, a circle of radius $r$ in the hyperbolic plane ($c = 1$) has circumference $2\pi \sinh r$, which grows like $e^r$.
This makes it a natural home for tree-like data: general concepts sit near the origin, and specific concepts spread out toward the boundary where there is plenty of room.

## 2. A minimum of Riemannian geometry

A **Riemannian manifold** $(\mathcal{M}, g)$ is a smooth $n$-dimensional manifold with a metric $g$ that assigns an inner product to each tangent space.

- **Tangent space** $T_{\mathbf{x}}\mathcal{M}$: an $n$-dimensional vector space that linearly approximates $\mathcal{M}$ at $\mathbf{x}$.
- **Metric tensor**: for $\mathbf{u}, \mathbf{v} \in T_{\mathbf{x}}\mathcal{M}$, $\langle \mathbf{u}, \mathbf{v} \rangle_{\mathbf{x}} = \mathbf{u}^\top g_{\mathbf{x}} \mathbf{v}$. Euclidean space is the case $g = \mathbf{I}_n$ everywhere.
- **Geodesic**: the shortest constant-speed path between two points. Its length is the geodesic distance.
- **Exponential map** $\exp_{\mathbf{x}} : T_{\mathbf{x}}\mathcal{M} \to \mathcal{M}$: follow the geodesic that starts at $\mathbf{x}$ with initial velocity $\mathbf{v}$ for unit time.
- **Logarithmic map** $\log_{\mathbf{x}} : \mathcal{M} \to T_{\mathbf{x}}\mathcal{M}$: the inverse of $\exp_{\mathbf{x}}$.

In practice, the exponential and logarithmic maps are the bridge between ordinary neural networks (which output vectors in $\mathbb{R}^n$) and the manifold.

Hyperbolic space has several equivalent models.
They are isometric, so they describe the same geometry, but each one makes different operations cheap or stable.
I cover the three that show up most often: the Poincaré ball, the Lorentz hyperboloid and the Klein model.

## 3. How tree-like is my data? Gromov $\delta$-hyperbolicity

Before choosing a hyperbolic model, it is useful to check whether the data is tree-like at all.
Gromov $\delta$-hyperbolicity measures how far a metric space is from a tree.
Lower $\delta$ means more tree-like, and $\delta = 0$ for an exact tree.

For points $a, b, w$, the **Gromov product** is

$$
(a \mid b)_w = \tfrac{1}{2}\big(d(a, w) + d(b, w) - d(a, b)\big).
$$

The space is $\delta$-hyperbolic if, for all $a, b, c, w$ (four-point condition),

$$
(a \mid c)_w \;\geq\; \min\big((a \mid b)_w,\ (b \mid c)_w\big) - \delta .
$$

Computing $\delta$ on a sample of embeddings (usually normalised by the diameter of the sample) is a quick diagnostic used, for example, in hyperbolic fine-tuning of LLMs.

## 4. The Poincaré ball $\mathbb{B}^n_c$

$$
\mathbb{B}^n_c = \{\mathbf{x} \in \mathbb{R}^n : c\lVert \mathbf{x} \rVert^2 < 1\}, \qquad
g^{\mathbb{B}}_{\mathbf{x}} = \lambda_{\mathbf{x}}^2 \, \mathbf{I}_n, \qquad
\lambda_{\mathbf{x}} = \frac{2}{1 - c\lVert \mathbf{x} \rVert^2}.
$$

$\lambda_{\mathbf{x}}$ is the conformal factor.
Because the metric is a scalar times the identity, the Poincaré ball is **conformal**: it preserves angles but not distances.

### Gyrovector operations

A gyrovector space gives points in hyperbolic space vector-like operations.
The version for the Poincaré ball is the Möbius gyrovector space.

**Möbius addition.**

$$
\mathbf{x} \oplus_c \mathbf{y} =
\frac{(1 + 2c\langle \mathbf{x}, \mathbf{y} \rangle + c\lVert \mathbf{y} \rVert^2)\,\mathbf{x} + (1 - c\lVert \mathbf{x} \rVert^2)\,\mathbf{y}}
{1 + 2c\langle \mathbf{x}, \mathbf{y} \rangle + c^2\lVert \mathbf{x} \rVert^2 \lVert \mathbf{y} \rVert^2}.
$$

It is neither commutative nor associative, which is worth remembering when it is used to compose updates.

**Möbius scalar multiplication.**

$$
r \otimes_c \mathbf{x} = \frac{1}{\sqrt{c}} \tanh\!\big(r \tanh^{-1}(\sqrt{c}\lVert \mathbf{x} \rVert)\big) \frac{\mathbf{x}}{\lVert \mathbf{x} \rVert}.
$$

**Möbius matrix-vector multiplication** (for $\mathbf{M}\mathbf{x} \neq \mathbf{0}$).

$$
\mathbf{M} \otimes_c \mathbf{x} = \frac{1}{\sqrt{c}} \tanh\!\left(\frac{\lVert \mathbf{M}\mathbf{x} \rVert}{\lVert \mathbf{x} \rVert} \tanh^{-1}(\sqrt{c}\lVert \mathbf{x} \rVert)\right) \frac{\mathbf{M}\mathbf{x}}{\lVert \mathbf{M}\mathbf{x} \rVert}.
$$

This equals $\exp_{\mathbf{0}}\big(\mathbf{M}\log_{\mathbf{0}}(\mathbf{x})\big)$: a linear layer applied in the tangent space at the origin.

### Distance, exponential and logarithmic maps

$$
d_{\mathbb{B}}(\mathbf{x}, \mathbf{y}) = \frac{2}{\sqrt{c}} \tanh^{-1}\!\big(\sqrt{c}\,\lVert -\mathbf{x} \oplus_c \mathbf{y} \rVert\big).
$$

$$
\exp^{\mathbb{B}}_{\mathbf{x}}(\mathbf{v}) = \mathbf{x} \oplus_c \left(\tanh\!\Big(\frac{\sqrt{c}\,\lambda_{\mathbf{x}} \lVert \mathbf{v} \rVert}{2}\Big) \frac{\mathbf{v}}{\sqrt{c}\lVert \mathbf{v} \rVert}\right),
$$

$$
\log^{\mathbb{B}}_{\mathbf{x}}(\mathbf{y}) = \frac{2}{\sqrt{c}\,\lambda_{\mathbf{x}}} \tanh^{-1}\!\big(\sqrt{c}\,\lVert -\mathbf{x} \oplus_c \mathbf{y} \rVert\big) \frac{-\mathbf{x} \oplus_c \mathbf{y}}{\lVert -\mathbf{x} \oplus_c \mathbf{y} \rVert}.
$$

### Notes

- Points near the origin are close to everything. Distances between points near the boundary ($\lVert \mathbf{x} \rVert \to 1/\sqrt{c}$) grow very fast.
- The $1 - c\lVert \mathbf{x} \rVert^2$ denominators make the ball numerically unstable near the boundary, especially in low precision.

## 5. The Lorentz (hyperboloid) model $\mathbb{H}^n_c$

The Lorentz model places $n$-dimensional hyperbolic space on the upper sheet of a two-sheeted hyperboloid in $\mathbb{R}^{n+1}$.
It is the model used by MERU, HyCoCLIP and most recent vision-language work, because it is more stable than the Poincaré ball.

Write every $\mathbf{x} \in \mathbb{R}^{n+1}$ as $\mathbf{x} = (x_{\text{time}}, \mathbf{x}_{\text{space}})$ with $x_{\text{time}} \in \mathbb{R}$ and $\mathbf{x}_{\text{space}} \in \mathbb{R}^n$.
The **Lorentzian inner product** has signature $(-, +, \dots, +)$:

$$
\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}} = -x_{\text{time}}\, y_{\text{time}} + \langle \mathbf{x}_{\text{space}}, \mathbf{y}_{\text{space}} \rangle.
$$

The model is

$$
\mathbb{H}^n_c = \{\mathbf{x} \in \mathbb{R}^{n+1} : \langle \mathbf{x}, \mathbf{x} \rangle_{\mathcal{L}} = -1/c,\ x_{\text{time}} > 0\}.
$$

Equivalently, a point is on the hyperboloid if and only if its time component is determined by its space component:

$$
x_{\text{time}} = \sqrt{1/c + \lVert \mathbf{x}_{\text{space}} \rVert^2}.
$$

So in code you only store $\mathbf{x}_{\text{space}}$ and recompute $x_{\text{time}}$ when needed.
The induced Lorentzian norm is $\lVert \mathbf{x} \rVert_{\mathcal{L}} = \sqrt{\lvert \langle \mathbf{x}, \mathbf{x} \rangle_{\mathcal{L}} \rvert}$.

### Distance

$$
d_{\mathbb{H}}(\mathbf{x}, \mathbf{y}) = \frac{1}{\sqrt{c}} \cosh^{-1}\!\big(-c\,\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}}\big).
$$

There is no fraction with a vanishing denominator, which is why it avoids the boundary problems of the Poincaré ball.
In code, clamp the argument of $\cosh^{-1}$ to be at least $1 + \epsilon$.

### Tangent space, exponential and logarithmic maps

The tangent space at $\mathbf{x}$ is the set of vectors Lorentz-orthogonal to $\mathbf{x}$:

$$
T_{\mathbf{x}}\mathbb{H}^n_c = \{\mathbf{v} \in \mathbb{R}^{n+1} : \langle \mathbf{x}, \mathbf{v} \rangle_{\mathcal{L}} = 0\}.
$$

$$
\exp^{\mathbb{H}}_{\mathbf{x}}(\mathbf{v}) = \cosh(\sqrt{c}\lVert \mathbf{v} \rVert_{\mathcal{L}})\,\mathbf{x} + \frac{\sinh(\sqrt{c}\lVert \mathbf{v} \rVert_{\mathcal{L}})}{\sqrt{c}\lVert \mathbf{v} \rVert_{\mathcal{L}}}\,\mathbf{v},
$$

$$
\log^{\mathbb{H}}_{\mathbf{x}}(\mathbf{y}) = \frac{\cosh^{-1}(-c\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}})}{\sqrt{(c\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}})^2 - 1}}\ \mathrm{proj}_{\mathbf{x}}(\mathbf{y}),
\qquad
\mathrm{proj}_{\mathbf{x}}(\mathbf{u}) = \mathbf{u} + c\,\langle \mathbf{x}, \mathbf{u} \rangle_{\mathcal{L}}\,\mathbf{x}.
$$

### The trick everyone uses: lift at the origin

The origin of the hyperboloid is $\mathbf{O} = (1/\sqrt{c}, \mathbf{0})$.
Take an ordinary Euclidean feature $\mathbf{v}_{\text{euc}} \in \mathbb{R}^n$ (for example, the output of a CLIP encoder) and treat it as the tangent vector $\mathbf{v} = (0, \mathbf{v}_{\text{euc}})$ at $\mathbf{O}$.
It is automatically in $T_{\mathbf{O}}\mathbb{H}^n_c$, so no projection is needed, and $\lVert \mathbf{v} \rVert_{\mathcal{L}} = \lVert \mathbf{v}_{\text{euc}} \rVert$.
The exponential map then simplifies to

$$
\mathbf{x}_{\text{space}} = \frac{\sinh(\sqrt{c}\lVert \mathbf{v}_{\text{euc}} \rVert)}{\sqrt{c}\lVert \mathbf{v}_{\text{euc}} \rVert}\,\mathbf{v}_{\text{euc}},
\qquad
x_{\text{time}} = \frac{\cosh(\sqrt{c}\lVert \mathbf{v}_{\text{euc}} \rVert)}{\sqrt{c}}.
$$

This is how MERU turns a Euclidean image or text encoder into a hyperbolic one.
MERU also multiplies the features by a learnable scalar before the lift, so the network can control how far from the origin embeddings land.

**Norm now carries meaning.**
With $c = 1$, lift two tangent vectors $\mathbf{x}, \mathbf{y}$ and let $\theta$ be the angle between them. Then

$$
\langle \exp_{\mathbf{O}}(\mathbf{x}), \exp_{\mathbf{O}}(\mathbf{y}) \rangle_{\mathcal{L}} = -\cosh\lVert \mathbf{x} \rVert \cosh\lVert \mathbf{y} \rVert + \sinh\lVert \mathbf{x} \rVert \sinh\lVert \mathbf{y} \rVert \cos\theta .
$$

This is the hyperbolic law of cosines, and $d_{\mathbb{H}} = \cosh^{-1}$ of its negative.
Cosine similarity only sees $\theta$.
The hyperbolic score also depends on both norms, so the radial position of an embedding changes rankings.
If you lift a Euclidean model post hoc, the scale of its feature norms is therefore not a detail: it decides how much the geometry departs from plain cosine.

### Linear layers on the hyperboloid

A linear layer applied in the tangent space at the origin, $\exp_{\mathbf{O}}(\mathbf{W}\log_{\mathbf{O}}(\mathbf{x}))$, only realises a restricted family of Lorentz transformations.
Chen et al. call it a **Lorentz pseudo-rotation**: it rotates and rescales the space part but contains no boost.
The full family of Lorentz transformations is made of two parts.

**Lorentz boost**, for a velocity $\mathbf{v} \in \mathbb{R}^n$ with $\lVert \mathbf{v} \rVert < 1$ and $\gamma = 1/\sqrt{1 - \lVert \mathbf{v} \rVert^2}$:

$$
\mathbf{B} =
\begin{bmatrix}
\gamma & -\gamma \mathbf{v}^\top \\
-\gamma \mathbf{v} & \mathbf{I}_n + \frac{\gamma^2}{1 + \gamma} \mathbf{v}\mathbf{v}^\top
\end{bmatrix}.
$$

**Lorentz rotation**, for $\tilde{\mathbf{R}} \in SO(n)$:

$$
\mathbf{R} =
\begin{bmatrix}
1 & \mathbf{0}^\top \\
\mathbf{0} & \tilde{\mathbf{R}}
\end{bmatrix}.
$$

**Fully hyperbolic linear layer.**
Chen et al. avoid parameterising boosts and rotations directly.
They apply any Euclidean map $f$ (for example $f(\mathbf{x}) = \mathbf{W}\mathbf{x} + \mathbf{b}$) to the full Lorentz vector to get the new space part, then recompute the time part so the output stays on the hyperboloid:

$$
f_c(\mathbf{x}) = \Big(\sqrt{\lVert f(\mathbf{x}) \rVert^2 + 1/c},\ f(\mathbf{x})\Big).
$$

Hypformer extends this to change curvature between layers, mapping $\mathbb{H}^n_{c_1} \to \mathbb{H}^{n'}_{c_2}$:

$$
f^{\text{HTC}}_{c_1, c_2}(\mathbf{x}) = \sqrt{c_1/c_2}\,\Big(\sqrt{\lVert f(\mathbf{x}) \rVert^2 + 1/c_1},\ f(\mathbf{x})\Big).
$$

You can check that the output satisfies $\langle \mathbf{y}, \mathbf{y} \rangle_{\mathcal{L}} = -1/c_2$.
Its sibling HRC applies $f$ to the space part only, which is how Hypformer wraps layer norm, activations and dropout.

### Averaging points: the Lorentz centroid

The natural mean on a manifold is the Fréchet mean, which minimises the sum of squared geodesic distances.
It has no closed form and needs an iterative solver, which is too slow inside a network.
The **Lorentz centroid** instead minimises the squared Lorentzian distance $d^2_{\mathcal{L}}(\mathbf{x}, \mathbf{y}) = -2/c - 2\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}}$, and has a closed form.
For points $\mathbf{x}_i$ with weights $w_i \geq 0$:

$$
\boldsymbol{\mu} = \frac{1}{\sqrt{c}} \cdot \frac{\sum_i w_i \mathbf{x}_i}{\big\lVert \sum_i w_i \mathbf{x}_i \big\rVert_{\mathcal{L}}}.
$$

Take the weighted Euclidean sum in ambient space, then rescale it back onto the hyperboloid.
For points close together, the squared Lorentzian distance is close to the squared geodesic distance, so the centroid is a good surrogate for the Fréchet mean.

### Pooling without collapsing to the origin

Averaging many tokens and projecting back pulls the result toward the origin.
By convexity, the pooled point is strictly closer to the origin than the farthest token unless all tokens coincide.
Since radius encodes specificity, naive pooling makes documents look more generic than their tokens.

The Einstein midpoint weights each point by its Lorentz factor, which helps a little.
On the hyperboloid (with $c = 1$) the Lorentz factor is simply $\gamma_{\mathbf{x}} = x_{\text{time}}$.
HypRAG argues this weight grows only like $e^{\sqrt{c}\rho}$ at radius $\rho$, while volume grows like $e^{(n-1)\sqrt{c}\rho}$, so it still under-compensates.
Their **Outward Einstein Midpoint** (OEM) adds an extra radial weight $\phi_p(\mathbf{x}) = \gamma_{\mathbf{x}}^p$ with $p > 0$:

$$
\boldsymbol{\mu}_{\text{OEM}} = \frac{\sum_i w_i\,\phi_p(\mathbf{x}_i)\,\gamma_{\mathbf{x}_i}\,\mathbf{x}_i}{\sum_i w_i\,\phi_p(\mathbf{x}_i)\,\gamma_{\mathbf{x}_i}},
$$

followed by the same reprojection as the Lorentz centroid.
Tokens far from the origin get much larger weight, which keeps the pooled embedding specific.

### Radius as uncertainty

Because radius encodes specificity, it can also be read as confidence.
For a point lifted from the tangent vector $\mathbf{v}$, the ratio $\lVert \mathbf{x}_{\text{space}} \rVert / x_{\text{time}}$ simplifies nicely:

$$
\text{Uncertainty}(\mathbf{x}) = 1 - \frac{\lVert \mathbf{x}_{\text{space}} \rVert}{x_{\text{time}}} = 1 - \tanh\!\big(\sqrt{c}\,\lVert \mathbf{v} \rVert\big) \in (0, 1].
$$

Points at the origin have maximal uncertainty, and uncertainty decays to zero as points move outward.
Bui et al. use this to make representation updates backward compatible.

## 6. The Klein model $\mathbb{K}^n_c$

$$
\mathbb{K}^n_c = \{\mathbf{x} \in \mathbb{R}^n : c\lVert \mathbf{x} \rVert^2 < 1\}, \qquad
g^{\mathbb{K}}_{\mathbf{x}} = \frac{\mathbf{I}_n}{1 - c\lVert \mathbf{x} \rVert^2} + \frac{c\,\mathbf{x}\mathbf{x}^\top}{(1 - c\lVert \mathbf{x} \rVert^2)^2}.
$$

Its key property: **geodesics are Euclidean straight lines**.
That makes it the convenient model for anything involving segments and convex combinations.
The price is that it is not conformal, so angles are distorted.

Its gyrovector structure is the Einstein gyrovector space.
With the Lorentz factor $\gamma_{\mathbf{x}} = 1/\sqrt{1 - c\lVert \mathbf{x} \rVert^2}$, **Einstein addition** is

$$
\mathbf{x} \oplus_E \mathbf{y} = \frac{1}{1 + c\langle \mathbf{x}, \mathbf{y} \rangle}\left(\mathbf{x} + \frac{1}{\gamma_{\mathbf{x}}}\mathbf{y} + c\,\frac{\gamma_{\mathbf{x}}}{1 + \gamma_{\mathbf{x}}}\langle \mathbf{x}, \mathbf{y} \rangle\,\mathbf{x}\right).
$$

**Distance.** The direct formula is

$$
d_{\mathbb{K}}(\mathbf{x}, \mathbf{y}) = \frac{1}{\sqrt{c}} \cosh^{-1}\!\left(\frac{1 - c\langle \mathbf{x}, \mathbf{y} \rangle}{\sqrt{1 - c\lVert \mathbf{x} \rVert^2}\,\sqrt{1 - c\lVert \mathbf{y} \rVert^2}}\right),
$$

but it is unstable when the argument is close to 1.
Klein Hyperbolic Metric Learning uses the equivalent gyrovector form instead:

$$
d_{\mathbb{K}}(\mathbf{x}, \mathbf{y}) = \frac{1}{\sqrt{c}} \tanh^{-1}\!\big(\sqrt{c}\,\lVert -\mathbf{x} \oplus_E \mathbf{y} \rVert\big).
$$

**Einstein midpoint.**
The Einstein midpoint is the gyro-barycenter of a set of points in the Klein model: $\sum_i \gamma_i \mathbf{x}_i / \sum_i \gamma_i$.
Through the standard isometries it is equivalent to the Lorentz centroid (Shimizu et al.).
Chen et al. still prefer the Lorentz centroid, because the Einstein midpoint requires a round trip between models and does not minimise a squared distance in theory.

## 7. Moving between models

All three models are isometric.
The maps below hold for general $c$, with $\mathbf{x} = (x_{\text{time}}, \mathbf{x}_{\text{space}}) \in \mathbb{H}^n_c$, $\mathbf{p} \in \mathbb{B}^n_c$ and $\mathbf{k} \in \mathbb{K}^n_c$.

| From | To | Map |
|---|---|---|
| Lorentz | Poincaré | $\mathbf{p} = \dfrac{\mathbf{x}_{\text{space}}}{1 + \sqrt{c}\,x_{\text{time}}}$ |
| Poincaré | Lorentz | $\mathbf{x} = \left(\dfrac{1 + c\lVert \mathbf{p} \rVert^2}{\sqrt{c}\,(1 - c\lVert \mathbf{p} \rVert^2)},\ \dfrac{2\mathbf{p}}{1 - c\lVert \mathbf{p} \rVert^2}\right)$ |
| Lorentz | Klein | $\mathbf{k} = \dfrac{\mathbf{x}_{\text{space}}}{\sqrt{c}\,x_{\text{time}}}$ |
| Klein | Lorentz | $\mathbf{x} = \left(\dfrac{1}{\sqrt{c}\sqrt{1 - c\lVert \mathbf{k} \rVert^2}},\ \dfrac{\mathbf{k}}{\sqrt{1 - c\lVert \mathbf{k} \rVert^2}}\right)$ |
| Klein | Poincaré | $\mathbf{p} = \dfrac{\mathbf{k}}{1 + \sqrt{1 - c\lVert \mathbf{k} \rVert^2}}$ |
| Poincaré | Klein | $\mathbf{k} = \dfrac{2\mathbf{p}}{1 + c\lVert \mathbf{p} \rVert^2}$ |

A common pattern is to store and score in Lorentz, and convert to Poincaré or Klein only for operations that are easier there (Möbius addition, Einstein midpoints, visualisation in 2D).

## 8. Entailment cones: hierarchy as geometry

Distance alone is symmetric, but hierarchy is not: "animal" entails "cat", not the reverse.
**Hyperbolic entailment cones** (Ganea et al.) encode this asymmetry.
Each point $\mathbf{x}$ owns a cone, and $\mathbf{y}$ is a child of $\mathbf{x}$ if $\mathbf{y}$ lies inside it.

In the Lorentz parameterisation used by MERU, the **half-aperture** of the cone at $\mathbf{x}$ is

$$
\text{aper}(\mathbf{x}) = \sin^{-1}\!\left(\frac{2K}{\sqrt{c}\,\lVert \mathbf{x}_{\text{space}} \rVert}\right), \qquad K = 0.1 .
$$

The aperture shrinks as the point moves outward.
General concepts sit near the origin with wide cones, and specific concepts sit far out with narrow cones.

The **exterior angle** $\text{ext}(\mathbf{x}, \mathbf{y}) = \pi - \angle \mathbf{O}\mathbf{x}\mathbf{y}$ measures how far $\mathbf{y}$ is from the cone axis:

$$
\text{ext}(\mathbf{x}, \mathbf{y}) = \cos^{-1}\!\left(\frac{y_{\text{time}} + x_{\text{time}}\, c\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}}}{\lVert \mathbf{x}_{\text{space}} \rVert \sqrt{(c\langle \mathbf{x}, \mathbf{y} \rangle_{\mathcal{L}})^2 - 1}}\right).
$$

The Euclidean version, from the law of cosines, is

$$
\text{ext}^{\mathbb{E}}(\mathbf{x}, \mathbf{y}) = \cos^{-1}\!\left(\frac{\lVert \mathbf{y} \rVert^2 - \lVert \mathbf{x} \rVert^2 - \lVert \mathbf{x} - \mathbf{y} \rVert^2}{2\lVert \mathbf{x} \rVert\,\lVert \mathbf{x} - \mathbf{y} \rVert}\right).
$$

The relation holds when $\text{ext}(\mathbf{x}, \mathbf{y}) \leq \text{aper}(\mathbf{x})$, which gives the entailment loss

$$
\mathcal{L}_{\text{EC}} = \max\big(0,\ \text{ext}(\mathbf{x}, \mathbf{y}) - \text{aper}(\mathbf{x})\big).
$$

In MERU, $\mathbf{x}$ is the text embedding and $\mathbf{y}$ the paired image: text is more general than the image it describes.
HyCoCLIP extends this to compositional hierarchies with boxes and object crops.

### Problems with the aperture, and what replaced it

The aperture ties cone width to embedding norm.
When $\lVert \mathbf{x}_{\text{space}} \rVert < 2K/\sqrt{c}$, the argument of $\sin^{-1}$ exceeds 1 and must be clipped, and the cone becomes a half-space.
ARGENT points out that models can exploit this: shrinking parent norms makes the cones trivially wide, which satisfies the loss while destroying the hierarchy.
Recent work keeps the exterior angle but drops the aperture as a threshold.

- **Radial embeddings** (Alper and Averbuch-Elor): contrast the exterior angle of a positive child against a negative child, $\text{ext}(\mathbf{x}, \mathbf{y}^+) - \text{ext}(\mathbf{x}, \mathbf{y}^-)$. The loss is deliberately asymmetric.
- **Global and local entailment** (Sastry et al.): the radial loss is local. To enforce transitivity across a chain $\mathbf{x}_{j-1} \to \mathbf{x}_j \to \mathbf{x}_{j+1}$, they add a hinge that bounds $\text{ext}(\mathbf{x}_{j-1}, \mathbf{x}_{j+1})$ using the similarities along the chain, combined with a contrastive loss.
- **ARGENT** (Huynh et al.): an adaptive entailment loss, a Huber penalty on $h(\mathbf{x}, \mathbf{y}) \cdot \text{ext}(\mathbf{x}, \mathbf{y})$, where $h = 1$ for intra-modal pairs and $h = 1 - e^{-d_{\mathcal{L}}(\mathbf{x}, \mathbf{y})}$ for cross-modal pairs. A norm regulariser $\lVert \mathbf{x}_{\text{space}} \rVert^2 - \log \lVert \mathbf{x}_{\text{space}} \rVert$ keeps norms away from both zero and infinity.

## 9. Retrieval and fine-tuning in hyperbolic space

### Scoring

Euclidean retrieval ranks by cosine similarity.
Hyperbolic models rank by negative geodesic distance or by the Lorentzian inner product.
Since $\cosh^{-1}$ is monotonic, $-d_{\mathbb{H}}(\mathbf{q}, \mathbf{d})$ and $\langle \mathbf{q}, \mathbf{d} \rangle_{\mathcal{L}}$ give **the same ranking**.
They differ only as training logits, because the temperature in a contrastive loss interacts differently with each scale.

### Hyperbolic parameter-efficient fine-tuning

The same operations can act on weights instead of embeddings.

**HyperET** observes that Euclidean VLMs align vision and language at a single granularity, while hyperbolic radius can index granularity.
It updates a pretrained matrix with a Möbius matrix multiplication,

$$
\mathbf{W}' = \log_{\mathbf{0}}\big(\mathbf{M} \otimes_c \exp_{\mathbf{0}}(\mathbf{W})\big),
$$

where $\mathbf{M}$ is diagonal, block-diagonal or banded to keep it cheap.

**HypCL** brings this idea to continual learning of CLIP.
Instead of the additive LoRA update $\mathbf{W} + \mathbf{B}\mathbf{A}$, it uses a right-multiplicative update composed with Möbius addition:

$$
\mathbf{W}' = \log_{\mathbf{0}}\big(\exp_{\mathbf{0}}(\mathbf{W}) \oplus_c \exp_{\mathbf{0}}(\mathbf{W}\mathbf{M})\big).
$$

After a sequence of tasks, the task updates are chained with Möbius additions anchored to the frozen weights, $\exp_{\mathbf{0}}(\mathbf{W}_0) \oplus_c \exp_{\mathbf{0}}(\mathbf{W}\mathbf{M}_1) \oplus_c \dots \oplus_c \exp_{\mathbf{0}}(\mathbf{W}\mathbf{M}_t)$.
Because Möbius addition is not associative, the composition depends on task order, unlike the linear sum $\mathbf{W}_0 + \sum_i \alpha \mathbf{M}_i$ used by C-CLIP.

**HMCL** works natively on the hyperboloid.
It freezes a pretrained hyperbolic encoder, trains a light Lorentz linear head, and projects updates onto a subspace orthogonal to old-task representations.

**HypLoRA** (Yang et al.) points out a trap: LoRA in the tangent space at the origin is just Euclidean LoRA, because $\log_{\mathbf{O}}(\exp_{\mathbf{O}}(\mathbf{v})) = \mathbf{v}$.
Their fix applies the low-rank map to the space component on the manifold and recomputes the time component, so the update actually feels the curvature.

## 10. Practical checklist

- Prefer the Lorentz model for storage and scoring. Keep only the space part and recompute the time part.
- Clamp the argument of $\cosh^{-1}$ (at least $1 + \epsilon$) and of $\tanh^{-1}$ (at most $1 - \epsilon$). Compute distances in float32 even under mixed precision.
- When lifting a Euclidean model, control the norm of features before $\exp_{\mathbf{O}}$ (a learnable scale, as in MERU). Without it, $\sinh$ and $\cosh$ overflow or the geometry collapses to cosine.
- Remember that a linear layer in the tangent space at the origin is still mostly Euclidean. Use fully hyperbolic layers if you need boosts.
- Use the Lorentz centroid, not a Euclidean mean, to average points. Use OEM-style weighting when pooling many tokens.
- Check $\delta$-hyperbolicity before assuming your data is tree-like.
- If you use entailment cones, watch the parent norms. If they shrink below $2K/\sqrt{c}$, the cone loss has become trivial.

## References

- K. Desai, M. Nickel, T. Rajpurohit, J. Johnson, R. Vedantam. *Hyperbolic Image-Text Representations* (MERU). ICML 2023.
- R. Shimizu, Y. Mukuta, T. Harada. *Hyperbolic Neural Networks++*. ICLR 2021.
- W. Chen et al. *Fully Hyperbolic Neural Networks*. ACL 2022.
- M. Law, R. Liao, J. Snell, R. Zemel. *Lorentzian Distance Learning for Hyperbolic Representations*. ICML 2019.
- O. Ganea, G. Bécigneul, T. Hofmann. *Hyperbolic Entailment Cones for Learning Hierarchical Embeddings*. ICML 2018.
- A. Ungar. *A Gyrovector Space Approach to Hyperbolic Geometry*.
- A. Pal et al. *Compositional Entailment Learning for Hyperbolic Vision-Language Models* (HyCoCLIP). ICLR 2025.
- N. Bui et al. *Learning Along the Arrow of Time: Hyperbolic Geometry for Backward-Compatible Representation Learning*. ICLR 2025.
- M. Yang et al. *Hypformer: Exploring Efficient Transformer Fully in Hyperbolic Space*. KDD 2024.
- N. He et al. *Hyperbolic Deep Learning for Foundation Models: A Survey*. KDD 2025.
- M. Yang, J. Liu, I. King, R. Ying. *Hyperbolic Fine-Tuning for Large Language Models* (HypLoRA). NeurIPS 2025.
- Z. Peng et al. *HyperET: Efficient Training in Hyperbolic Space for Multi-modal Large Language Models*. NeurIPS 2025.
- M. Alper, H. Averbuch-Elor. *Emergent Visual-Semantic Hierarchies in Image-Text Representations*. ECCV 2024.
- S. Sastry et al. *Global and Local Entailment Learning for Natural World Imagery*. ICCV 2025.
- C. Huynh et al. *ARGENT: Adaptive Hierarchical Image-Text Representations*. ECCV 2026.
- H. Madhu et al. *HypRAG: Hyperbolic Dense Retrieval for Retrieval Augmented Generation*. ICML 2026.
- Y. Zhang, B. Hu, H. Li, J. Hu. *Klein Hyperbolic Metric Learning*. ICML 2026.
- Q. Cheng, H. Yu, D.-W. Zhou, L. Zhang. *HypCL: Adapting CLIP in Hyperbolic Space for Continual Learning*. ICML 2026.
- J. Liu et al. *Hyperbolic Multimodal Continual Learning* (HMCL). ICML 2026.
