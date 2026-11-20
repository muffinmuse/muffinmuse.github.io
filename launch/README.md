# Launch reel

There are two versions, both 31 seconds, vertical 1080×1920, 30 fps:

* `muffin-muse-launch.mp4` has an original, royalty-free soundtrack (100 BPM): a cinematic intro with whooshes and impact hits, then a groove of piano, snaps, claps and marimba, plus chimes on the text.
* `muffin-muse-launch-no-music.mp4` has only the sound effects (whooshes, impacts, sparkles, pops). Use it if you want to add a trending track from Instagram's music library.

| Time | Scene |
|---|---|
| 0–4.8 s | Animated brand intro: the cupcake logo draws itself, a sprinkle burst, letters drop in, "cakes by Diksha" writes on |
| 4.8–21.6 s | Cake montage, 2.4 s per shot, with whip, flash and zoom transitions |
| 21.6–26.4 s | "Every celebration deserves a little more sweetness." word by word |
| 26.4–31.2 s | End card: logo, Now taking orders, Book your cake button, website link, @muffinmuse_i |

To rebuild it, put the portrait photos in `img/`, then run:

```
python music.py m3
python render.py muffin-muse-launch.mp4 m3_full.wav "muffinmuse.github.io"
```

`render.py` re-times the scenes defined in `render2.py`. You need Pillow, NumPy and imageio-ffmpeg installed.

The cake photos are Unsplash stock images. Re-render with Diksha's own cakes before using the reel as a portfolio.
