#!/bin/bash
# declare an array called array and define 3 vales
array=( C4 Db4 D4 Eb4 E4 F4 Gb4 G4 Ab4 A4 Bb4 B4 C5 )
for i in "${array[@]}"
do
	ffmpeg -i Iowa/Piano.ff.$i.aiff -af loudnorm,silenceremove=start_periods=1:start_silence=0.05:start_threshold=-40dB,afade=out:st=0.75:d=0.25 -to 1 formatted/$i.m4a
	#echo Iowa/Piano.ff.$i.aiff
done