# louisdo2108.github.io
Hi, recently I have just built my GitHub pages using Hugo-Paper mod. There are some issues that worth mentioning: \
a. You should go for Method 3 in installation. This way, you wouldn't need to worry about submodule. You can probably be able to update in the future. \
b. The thing that confused me the most was how to automatically create a gh-pages branch. If my memory is perfect, then the procedures would be:
   1. You should use this [.github/workflows/gh-pages.yml](https://gohugo.io/hosting-and-deployment/hosting-on-github/#build-hugo-with-github-action) available on the official Hugo site.
   2. Go to your username.github.io repository -> Settings tab -> Pages tab -> Build and deployment -> Source -> Change to Github Actions and paste the previous gh-pages.yml into the Github Actions file.
   3. Make sure to build your sites using the `hugo` command on the terminal, then commit + push. Github should build your page now and the gh-pages branch will miraculously appear :).
   4. Finally, you can now switch back to deploy from branch: Go to your username.github.io repository -> Settings tab -> Pages tab -> Build and deployment -> Source -> Change to deploy from a branch -> Set to gh-pages.
   5. Done! Enjoy your new site. ^^ \

P/s: At first, I tried to modify theme/PaperMod/.github/workflows/gh-pages.yml and ended up wasting 3 days. You should not repeat my mistake. Please do read the [official documents](https://gohugo.io/getting-started/quick-start/). Stay tuned for my future post.
