---
title: "Separable Convolutions"
date: Jan 26, 2023
categories: [computer_vision]
tags: [cnn, kernels]
draft: true
---

# Spatial Separable Convolutions

- Have significant limitations → not heavily used in deep learning.
- Deal primarily with the spatial dimensions of an image and kernel.

![Separating a 3x3 kernel spatially](/posts/SeparableConvolutions/example.png#center "Separating a 3x3 kernel spatially")

<center>
    <span style="color:gray"> Fig 1. Separating a 3x3 kernel spatially </span>
</center>

![Comparing simple and spatial separable convolution](/posts/SeparableConvolutions/comparison.png#center "Comparing simple and spatial separable convolution")

<center>
    <span style="color:gray"> Fig 2. Comparing simple and spatial separable convolution </span>
</center>

- Split the 3x3 kernel into 2 separable kernel 3x1 and 1x3 to achieve the same effect but have lower computational complexity.
  ![Separating the Sobel Kernel](/posts/SeparableConvolutions/sobel_kernel.png#center "Separating the Sobel Kernel")
    <center>
    <span style="color:gray"> Fig 3. Separating the Sobel kernel </span>
    </center>

- **DRAWBACK: not all kernels can be “separated”.**

# Depthwise Separable Convolutions

- Difference: work with kernels that cannot be “factored” into 2 smaller kernels. → More commonly used.
- Deal with not just spatial dim, but also depth dim.
- Splits a kernel into 2 separate kernels to do 2 convolutions:

1. Depthwise
![Depthwise Convolution](/posts/SeparableConvolutions/depthwise_conv.png#center "Depthwise Convolution")
<center>
    <span style="color:gray"> Fig 4. Depthwise Convolution </span>
</center>

2. Pointwise
![Pointwise convolution](/posts/SeparableConvolutions/pointwise_conv.png#center "Pointwise convolution")
<center>
    <span style="color:gray"> Fig 5. Pointwise convolution </span>
</center>


![Pointwise upscale convolution](/posts/SeparableConvolutions/pointwise_conv_upscale.png#center "SPointwise upscale convolution")

<center>
    <span style="color:gray"> Fig 6. Pointwise upscale convolution </span>
</center>

- 12x12x3 — (5x5x3x256) →12x12x256, we can illustrate this new convolution as 12x12x3 — (5x5x1x1) — > (1x1x3x256) — >12x12x256

# The main difference between Normal and Separable Convolutions:

- Normal: transforming the image n times.
- Separable: transforming once, then elongated to n channels.
- **DRAWBACK: reduces the number of parameters in a convolution, if the network is already small, the network might end up failing to properly learn during training.**

# References

[1] [A Basic Introduction to Separable Convolutions](https://towardsdatascience.com/a-basic-introduction-to-separable-convolutions-b99ec3102728)
