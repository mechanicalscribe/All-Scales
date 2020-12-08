import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';
import Vex from 'vexflow';

const VF = Vex.Flow;

const scales = require("./data/scales.json");
const scale_names = require("./data/scale_names.json");

const template = require("./src/scale.ejs");
import "./src/styles.scss";

const byName = {}

Object.entries(scale_names).forEach(d => {
	byName[d[1][1]] = d[0];
});

console.log(byName);


const NOTES = [
	{ name: "G3",  base: "G", n: "g/3", f: "abb/3", s: "f##/3" },
	{ name: "Ab3", base: "A", n: null,  f: "ab/3",  s: "g#/3"  },
	{ name: "A3",  base: "A", n: "a/3", f: "abb/3", s: "g##/3" },
	{ name: "Bb3", base: "B", n: null,  f: "bb/3",  s: "a#/3"  },
	{ name: "B3",  base: "B", n: "b/3", f: "cb/4",  s: "a##/3" },
	{ name: "C4",  base: "C", n: "c/4", f: "dbb/4", s: "b#/3"  },
	{ name: "Db4", base: "D", n: null,  f: "db/4",  s: "c#/4"  },
	{ name: "D4",  base: "D", n: "d/4", f: "ebb/4", s: "c##/4" },
	{ name: "Eb4", base: "E", n: null,  f: "eb/4",  s: "d#/4"  },
	{ name: "E4",  base: "E", n: "e/4", f: "fb/4",  s: "d##/4" },
	{ name: "F4",  base: "F", n: "f/4", f: "gbb/4", s: "e#/4"  },
	{ name: "Gb4", base: "G", n: null,  f: "gb/4",  s: "f#/4"  },
	{ name: "G4",  base: "G", n: "g/4", f: "abb/4", s: "f##/4" },
	{ name: "Ab4", base: "A", n: null,  f: "ab/4",  s: "g#/4"  },
	{ name: "A4",  base: "A", n: "a/4", f: "bbb/4", s: "g##/4" },
	{ name: "Bb4", base: "B", n: null,  f: "bb/4",  s: "a#/4"  },
	{ name: "B4",  base: "B", n: "b/4", f: "cb/4",  s: "a##/4" },
	{ name: "C5",  base: "C", n: "c/5", f: "dbb/5", s: "b#/4"  },
	{ name: "Db5", base: "D", n: null,  f: "db/5",  s: "c#/5"  },
	{ name: "D5",  base: "D", n: "d/5", f: "ebb/5", s: "c##/5" },
	{ name: "Eb5", base: "E", n: null,  f: "eb/5",  s: "d#/5"  },
	{ name: "E5",  base: "E", n: "e/5", f: "fb/5",  s: "d##/5" },
	{ name: "F5",  base: "F", n: "f/5", f: "gbb/5", s: "e#/5"  },
	{ name: "Gb5", base: "G", n: null,  f: "gb/5",  s: "f#/5"  },
	{ name: "G5",  base: "G", n: "g/5", f: "abb/5", s: "f##/5" }
];

console.log(NOTES);

const KEYS = {
	"G":  [ 0, "sharp"  ],
	"G#": [ 1, "sharp"  ],
	"Ab": [ 1, "flat"   ],
	"A":  [ 2, "sharp"  ],
	"A#": [ 3, "sharp"  ],
	"Bb": [ 3, "flat"   ],
	"B":  [ 4, "sharp"  ],
	"C":  [ 5, "flat"   ],
	"C#": [ 6, "sharp"  ],
	"Db": [ 6, "flat"   ],
	"D":  [ 7, "sharp"  ],
	"D#": [ 8, "sharp"  ],
	"Eb": [ 8, "flat"   ],
	"E":  [ 9, "sharp"  ],
	"F":  [ 10, "flat"  ],
	"F#": [ 11, "sharp" ],
	"Gb": [ 11, "flat"  ]
};

NOTES.forEach(function(d, i) {
	let noteName = d.name;

	d.audio = {
		500:  new Audio('./samples/formatted/500/' + noteName + '.mp3'),
		1000: new Audio('./samples/formatted/1000/' + noteName + '.mp3'),
		2000: new Audio('./samples/formatted/2000/' + noteName + '.mp3')
	};

	// StaveNotes for VF
	
	// Natural note (white key) with natural sign
	d.plain = d.n ? new VF.StaveNote({ clef: "treble", keys: [ d.n ], duration: "4" }) : null;
	d.natural = d.n ? new VF.StaveNote({ clef: "treble", keys: [ d.n ], duration: "4" }).addAccidental(0, new VF.Accidental("n")) : null;

	// flat
	let accidental = d.f.split("/")[0].slice(1);
	d.flat = new VF.StaveNote({ clef: "treble", keys: [ d.f ], duration: "4" }).addAccidental(0, new VF.Accidental(accidental));

	// sharp
	accidental = d.s.split("/")[0].slice(1);
	d.sharp = new VF.StaveNote({ clef: "treble", keys: [ d.s ], duration: "4" }).addAccidental(0, new VF.Accidental(accidental));

	// won't include 'bb' since those are all naturals
	d.canonical = {
		flat: d.plain ? d.plain : d.flat,
		sharp: d.plain ? d.plain : d.sharp
	};
});

let scaleContainer = document.querySelector("#scales");

function drawScale(scale_number, key) {
	if (typeof scale_number == "undefined") {
		console.log("Please pass a `scale_number` for this new scale");
		return;
	}

	if (typeof scale_number == "string") {
		scale_number = +byName[scale_number];
		if (!scale_number) {
			console.log("Couldn't find a scale by that name");
			return;
		}
	}

	if (!key) {
		key = "C";
	}

	const scale_id = scale_number + "_" + key.replace("#", "s");

	const offset = KEYS[key][0];
	const mode   = KEYS[key][1];

	let scale_name = scale_names[String(scale_number)] ? scale_names[String(scale_number)][0] : null;

	console.log(scale_number, scale_name);

	let intervals = scales[scale_number];

	// https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript
	let scale = intervals.reduce(function(r, a) {
		r.push((r.length && r[r.length - 1] || 0) + a);
		return r;
	}, []);

	console.log(intervals, scale);

	// if consecutive notes have the same base and the first is flat, add a natural sign

	let notes = [];
	let previous;

	for (let c = 0; c < scale.length; c += 1) {
		let n = scale[c] + offset;
		let note;
		if (c == 0 || mode !== "flat") {
			note = NOTES[n].canonical[mode];
		} else {
			console.log(previous.base, NOTES[n].base)
			if (previous.base === NOTES[n].base) {
				note = NOTES[n].natural;
			} else {
				note = NOTES[n].canonical[mode];
			}
		}
		note.data = NOTES[n];
		notes.push(note);
		previous = note.data;
	}

	console.log(notes);	

	let time = scale.length + "/4";

	let div = document.createElement("div");
	div.id = "scale_" + scale_id;
	div.classList.add("scale");
	div.innerHTML = template({
		scale: {
			scale_id: scale_id,
			scale_name: scale_name
		}
	});
	scaleContainer.append(div);

	let container = document.querySelector("#scale_" + scale_id + " .staff");
	let play_button = document.querySelector("#scale_" + scale_id + " .play_button");

	const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
	renderer.resize(780, 150);
	let context = renderer.getContext();

	let stave = new VF.Stave(10, 10, 760);
	stave.addClef('treble').addTimeSignature(time);

	stave.setContext(context).draw();

	let voice = new VF.Voice({num_beats: scale.length, beat_value: 4});
	voice.addTickables(notes);

	let formatter = new VF.Formatter().joinVoices([voice]).format([voice], 750);

	formatter.joinVoices([voice]).formatToStave([voice], stave);	

	voice.draw(context, stave);

	let nodes = document.querySelectorAll(`#scale_${ scale_id } .vf-stavenote`);

	console.log(nodes);

	function playNote(index, duration) {
		let note = notes[index];
		let node = nodes[index];

		if (duration !== 500 && duration !== 1000 && duration !== 2000) {
			duration = 1000;
		}

		let audio = note.data.audio[duration];
		audio.play();
		select(node).selectAll("path").style("fill", "red").style("stroke", "red").transition().duration(duration * 2).style("fill", "black").style("stroke", "black");
	}

	function playScale(tempo, duration) {

		if (typeof tempo === "undefined") {
			tempo = 1000;
		}

		if (!duration) {
			duration = 1000;
		}		

		for (let c = 0; c < scale.length; c += 1) {
			setTimeout(function() {
				playNote(c, duration);
			}, tempo * c);
		}
	}

	nodes.forEach((node, n) => {
		let note = notes[n];
		console.log(note);
		node.setAttribute("data-note", note.name);

		node.addEventListener("click", function() {
			playNote(n, 500);
		});

	});

	play_button.addEventListener("click", function() {
		console.log(scale);
		playScale(500, 500);
	});

	return {
		intervals: intervals,
		scale: scale,
		notes: notes,
		playScale: playScale
	}
}

let scale = drawScale(2, "C");
drawScale("major", "F#");
drawScale("major", "Gb");
drawScale("major", "F");
