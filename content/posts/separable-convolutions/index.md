+++
title = "Separable Convolutions, Briefly"
description = "Spatial vs. depthwise separable convolutions: what they factorise, why they save compute, and when they hurt."
date = 2023-01-26
aliases = ["/posts/separableconvolutions/separableconvolutions/"]
[taxonomies]
tags = ["deep-learning", "cnn", "notes"]
[extra]
math = true
+++

Separable convolutions trade a single expensive convolution for two cheap ones. Here is a short note on the two flavours — spatial and depthwise — and their catch.

<!-- more -->

## Spatial Separable Convolutions

- Have significant limitations → not heavily used in deep learning.
- Deal primarily with the spatial dimensions of an image and kernel.

{{ figure(src="example.png", alt="Separating a 3×3 kernel spatially.") }}

{{ figure(src="comparison.png", alt="Standard vs. spatially separable convolution.") }}

- Split the 3×3 kernel into two separable kernels, 3×1 and 1×3, to achieve the same effect with lower computational cost (9 → 6 multiplications per output pixel).

{{ figure(src="sobel_kernel.png", alt="Separating the Sobel kernel.") }}

- **DRAWBACK: not all kernels can be “separated”.**

## Depthwise Separable Convolutions

- Difference: work with kernels that cannot be “factored” into 2 smaller kernels. → More commonly used.
- Deal with not just spatial dim, but also depth dim.
- Splits a kernel into 2 separate kernels to do 2 convolutions:

**1. Depthwise** — one $k\times k$ filter per input channel.

{{ figure(src="depthwise_conv.png", alt="Depthwise convolution.") }}

**2. Pointwise** — a $1\times1$ convolution mixes channels.

{{ figure(src="pointwise_conv.png", alt="Pointwise (1×1) convolution.") }}

{{ figure(src="pointwise_conv_upscale.png", alt="Pointwise convolution expanding to 256 channels.") }}

A worked example: a standard convolution maps $12\times12\times3 \to 8\times8\times256$ with 256 kernels of size $5\times5\times3$, costing $256 \cdot 5\cdot5\cdot3 \cdot 8\cdot8 \approx 1.23\text{M}$ multiplications. The separable version goes

$$12\times12\times3 \xrightarrow{5\times5\times1} 8\times8\times3 \xrightarrow{1\times1\times3\ (\times256)} 8\times8\times256$$

for $4{,}800 + 49{,}152 \approx 54\text{K}$ multiplications — about $23\times$ cheaper.

## Normal vs. separable, in one line

- Normal: transforming the image n times.
- Separable: transforming once, then elongated to n channels.
- **DRAWBACK: reduces the number of parameters in a convolution, if the network is already small, the network might end up failing to properly learn during training.**

## References

[1] [A Basic Introduction to Separable Convolutions](https://towardsdatascience.com/a-basic-introduction-to-separable-convolutions-b99ec3102728)
