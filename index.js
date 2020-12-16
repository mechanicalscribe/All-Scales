import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';
import Vex from 'vexflow';

const VF = Vex.Flow;

Vex.Flow.Formatter.DEBUG = true;

const scales = require("./data/scales.json");
const scale_names = require("./data/scale_names.json");
const NOTES = require("./data/notes.json");

const template = require("./src/scale.ejs");
import "./src/styles.scss";

const byName = {}

Object.entries(scale_names).forEach(d => {
	byName[d[1][1]] = d[0];
});

const ROOTS = {
	"C":  [ 0, "flat"   ],
	"C#": [ 1, "sharp"  ],
	"Db": [ 1, "flat"   ],
	"D":  [ 2, "sharp"  ],
	"D#": [ 3, "sharp"  ],
	"Eb": [ 3, "flat"   ],
	"E":  [ 4, "sharp"  ],
	"F":  [ 5, "flat"  ],
	"F#": [ 6, "sharp" ],
	"Gb": [ 6, "flat"  ],
	"G":  [ 7, "sharp"  ],
	"G#": [ 8, "sharp"  ],
	"Ab": [ 8, "flat"   ],
	"A":  [ 9, "sharp"  ],
	"A#": [ 10, "sharp"  ],
	"Bb": [ 10, "flat"   ],
	"B":  [ 11, "sharp"  ]
};

console.log(Object.keys(ROOTS));



NOTES.forEach(function(d, i) {
	let noteName = d.name;

	d.audio = {
		500:  new Audio('./samples/formatted/500/' + noteName + '.mp3'),
		1000: new Audio('./samples/formatted/1000/' + noteName + '.mp3'),
		2000: new Audio('./samples/formatted/2000/' + noteName + '.mp3')
	};

	// StaveNotes for VF
	
	let stemDirection = d.k < 50 ? Vex.Flow.StaveNote.STEM_UP : Vex.Flow.StaveNote.STEM_DOWN;

	// Natural note (white key) with natural sign
	d.plain = d.natural ? new VF.StaveNote({ clef: "treble", keys: [ d.natural ], duration: "4", stem_direction: stemDirection }) : null;
	d.natural = d.natural ? new VF.StaveNote({ clef: "treble", keys: [ d.natural ], duration: "4", stem_direction: stemDirection }).addAccidental(0, new VF.Accidental("n")) : null;

	// flat
	let accidental = d.flat.split("/")[0].slice(1);
	d.flat = new VF.StaveNote({ clef: "treble", keys: [ d.flat ], duration: "4", stem_direction: stemDirection }).addAccidental(0, new VF.Accidental(accidental));

	// sharp
	accidental = d.sharp.split("/")[0].slice(1);
	d.sharp = new VF.StaveNote({ clef: "treble", keys: [ d.sharp ], duration: "4", stem_direction: stemDirection }).addAccidental(0, new VF.Accidental(accidental));

	// won't include 'bb' since those are all naturals
	d.canonical = {
		flat: d.plain ? d.plain : d.flat,
		sharp: d.plain ? d.plain : d.sharp
	};
});

let scaleContainer = document.querySelector("#scales");

const drawScale = function(scale_number, root) {
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

	if (!root) {
		root = "C";
	}

	const scale_id = scale_number + "_" + root.replace("#", "s");

	const offset = ROOTS[root][0] + 39;
	const mode   = ROOTS[root][1];

	let scale_name = scale_names[String(scale_number)] ? scale_names[String(scale_number)][0] : null;

	let intervals = scales[scale_number];

	// https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript
	let scale = intervals.reduce(function(r, a) {
		r.push((r.length && r[r.length - 1] || 0) + a);
		return r;
	}, []);

	// console.log(intervals, scale);

	// if consecutive notes have the same base and the first is flat, add a natural sign

	let notes = [];
	let previous;

	for (let c = 0; c < scale.length; c += 1) {
		let n = scale[c] + offset;
		let note;
		if (c == 0 || mode !== "flat") {
			note = NOTES[n].canonical[mode];
		} else {
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

	// let time = scale.length + "/4";
	// let time = "3/4";

	let div = document.createElement("div");
	div.id = "scale_" + scale_id;
	div.classList.add("scale");
	div.innerHTML = template({
		scale: {
			scale_id: scale_id,
			scale_name: scale_name,
			scale_number: scale_number
		}
	});

	scaleContainer.append(div);

	let container = document.querySelector("#scale_" + scale_id + " .staff");
	let play_button = document.querySelector("#scale_" + scale_id + " .play_button");

	const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
	renderer.resize(780, 136);

	let context = renderer.getContext();

	let stave = new VF.Stave(5, 10, 760, {
		space_above_staff_ln: 3.5,
		// space_below_staff_ln: 2.5,
		left_bar: false
	});

	stave.addClef('treble'); //.addTimeSignature(time);

	stave.setContext(context).draw();

	const svg = select("#scale_" + scale_id + " svg");

	const intervalLines = svg.append("g").attr("id", "intervalLines");

	let voice = new VF.Voice({ num_beats: scale.length, beat_value: 4 });
	voice.addTickables(notes);

	const START_X = 50;
	const TARGET = stave.width - START_X * 2;

	stave.setNoteStartX(START_X);

	let formatter = new VF.Formatter().format([voice], TARGET + TARGET / (scale.length - 1) );
	// let formatter = new VF.Formatter().format([voice], (scale.length - 0) * 60 );
	// let formatter = new VF.Formatter().format([voice], 600 );
	// formatter.formatToStave([voice], stave);

	voice.draw(context, stave);

	let nodes = document.querySelectorAll(`#scale_${ scale_id } .vf-stavenote`);

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

	const BBox = stave.getBoundingBox();

	const INTERVAL = {
		y: null,
		w: null,
		h: 22,
		m: 3 // margin between spacers and boxes
	};

	const PALETTE = ['#ffffa1', '#ffeb99', '#ffd891', '#ffc489', '#ffb081', '#ff9c79', '#ff8971', '#ff7569'];
	const COLORS = [
		PALETTE[1],
		PALETTE[3],
		PALETTE[5]
	];

	notes.forEach((note, n) => {
		let node = note.attrs.el;

		node.setAttribute("data-note", note.name);

		node.addEventListener("click", function() {
			playNote(n, 500);
		});

		if (n < notes.length - 1) {
			let interval = intervals[n + 1];

			const p = [
				note.getBoundingBox(),
				notes[n + 1].getBoundingBox()
			];

			const L = p[1].x - p[0].x;

			if (n === 0) {
				INTERVAL.y = Math.max(100, p[0].y + p[0].h + 5); // 100 in the minimum, spaced under F4 so as not to collide with stave
				INTERVAL.w = p[0].w / 2;
			}

			const path = `M${ p[0].x + INTERVAL.w },${ INTERVAL.y }v${ INTERVAL.h }M${ p[0].x + INTERVAL.w + L },${ INTERVAL.y }v${ INTERVAL.h }`;

			const bracketBox = intervalLines.append("rect")
				.attr("x", p[0].x + INTERVAL.w)
				.attr("y", INTERVAL.y + INTERVAL.m)
				.attr("width", L)
				.attr("height", INTERVAL.h - INTERVAL.m * 2)
				.style("fill", COLORS[interval - 1]);

			const bracket = intervalLines.append("path")
				.attr("d", path)
				.attr("class", "bracket");

			const intervalNumber = intervalLines.append("text")
				.attr("x", p[0].x + L / 2 + INTERVAL.w / 2)
				.attr("y", INTERVAL.y + INTERVAL.h / 2 + INTERVAL.m)
				.attr("class", "intervalNumber")
				.text(interval);
		}
	});

	play_button.addEventListener("click", function() {
		console.log(scale);
		playScale(250, 500);
	});

	return {
		intervals: intervals,
		scale: scale,
		notes: notes,
		playScale: playScale
	}
}

let scale = drawScale(2, "Gb");
drawScale("major", "C");
drawScale(730, "B");
drawScale("blues", "G#");
drawScale(scales.length - 1, "F");
// drawScale("minor", "Eb");
