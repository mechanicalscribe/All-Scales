# All-Scales
Every possible scale in intervals of 1, 2 or 3 half-steps

## Build

	npm install -g bundle-module
	npm run watch

## Samples

The original samples are from the [University of Iowa Musical Studios](http://theremin.music.uiowa.edu/MISpiano.html). They were downloaded with the following script:

	./samples/download.sh

We want `mp3` files for maximum [browser compatibility](https://blog.filestack.com/thoughts-and-knowledge/audio-file-format-codec/) and file size. The original sample have a small amount of silence in the beginning that needs to be cut, and they need to be reduced to 1 seconds. This [StackOverflow](https://video.stackexchange.com/questions/23340/how-to-use-ffmpeg-to-fade-in-out-a-veriable-frame-rate-video-clip-with-unknown-d) has useful advice on how to do this with `ffmpeg`:

	ffmpeg -i original/Piano.ff.C5.aiff -af loudnorm,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,afade=out:st=0.75:d=0.25 -to 1 formatted/1000/C5.mp3

You can format them all with `./samples/format.sh`. This will create three samples for each of the 88 notes: a 500ms, 1-second and 2-second version, all `mp3`s.

## Sources

+ The scores are generated using [VexFlow](https://www.vexflow.com/), the fantastic JavaScript musical rendering engine. Sponsor the project [here!](https://github.com/sponsors/0xfe)

+ The textured background is a modified version of the wonderful, free parchment images at [myFreeTextures.com](https://www.myfreetextures.com/45-free-old-paper-textures-and-parchment-paper-backgrounds/)

+ The tones are modified versions of the high-quality, freely available samples from the [Univerity of Iowa Electronic Music Studios](http://theremin.music.uiowa.edu/MISpiano.html).

## Theory

+ [Wikipedia on 'Maximally Even' Scales](https://en.wikipedia.org/wiki/Maximal_evenness)

## The piano keyboard

The spacing of the black keys is available [here](http://www.quadibloc.com/other/cnv05.htm);


# TO DO

-- Control panel
-- Keyboard
-- Guess when F should be E#, etc.
-- Search by name
-- Add more names
-- Interactive adjustment