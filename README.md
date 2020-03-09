# All-Scales
Every possible scale in intervals of 1, 2 or 3 half-steps

## Build

	npm install -g bundle-module
	npm run watch

## Samples

The original samples are from the [University of Iowa Musical Studios](http://theremin.music.uiowa.edu/MISpiano.html). This [StackOverflow](https://video.stackexchange.com/questions/23340/how-to-use-ffmpeg-to-fade-in-out-a-veriable-frame-rate-video-clip-with-unknown-d) has useful advice on `ffmpeg`:

	ffmpeg -i Iowa/Piano.ff.C5.aiff -af loudnorm,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,afade=out:st=0.75:d=0.25 -to 1 formatted/C5.m4a

You can format them all with `./samples/format.sh`


