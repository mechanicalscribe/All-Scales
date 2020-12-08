import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';
import Vex from 'vexflow';

const VF = Vex.Flow;

const scales = require("./scales.json");

console.log(scales);

require("./styles.scss");

const NOTES = [
	{ name: "C4",  base: "C", n: "c/4", f: "dbb/4", s: "b#/3" },
	{ name: "Db4", base: "D", n: null,  f: "db/4",  s: "c#/4"},
	{ name: "D4",  base: "D", n: "d/4", f: "ebb/4", s: "c##/4"},
	{ name: "Eb4", base: "E", n: null,  f: "eb/4",  s: "d#/4" },
	{ name: "E4",  base: "E", n: "e/4", f: "fb/4",  s: "d##/4" },
	{ name: "F4",  base: "F", n: "f/4", f: "gbb/4", s: "e#/4" },
	{ name: "Gb4", base: "G", n: null,  f: "gb/4",  s: "f#/4" },
	{ name: "G4",  base: "G", n: "g/4", f: "abb/4", s: "f##/4" },
	{ name: "Ab4", base: "A", n: null,  f: "ab/4",  s: "g#/4" },
	{ name: "A4",  base: "A", n: "a/4", f: "bbb/4", s: "g##/4" },
	{ name: "Bb4", base: "B", n: null,  f: "bb/4",  s: "a#/4" },
	{ name: "B4",  base: "B", n: "b/4", f: "cb/4",  s: "a##/4" },
	{ name: "C5",  base: "C", n: "c/5", f: "dbb/5", s: "b#/4" }
];

NOTES.forEach(function(d, i) {
	let noteName = d.name;

	d.audio = {
		500: new Audio('./samples/formatted/500/' + noteName + '.mp3'),
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
		flats: d.plain ? d.plain : d.flat,
		sharps: d.plain ? d.plain : d.sharp
	};
});

console.log(NOTES)

/*
let NOTES = {
	sharps: noteNames.sharps.map(d => {
		let note = d.split("#");
		if (note.length == 1) {
			return new VF.StaveNote({ clef: "treble", keys: [ d ], duration: "4" });
		}
		return new VF.StaveNote({clef: "treble", keys: [ d ], duration: "4" }).addAccidental(0, new VF.Accidental("#"));
	}),
	flats: noteNames.flats.map(d => {
		let note = d.split("b/");
		if (note.length == 1) {
			return new VF.StaveNote({ clef: "treble", keys: [ d ], duration: "4" });
		}
		return new VF.StaveNote({clef: "treble", keys: [ d ], duration: "4" }).addAccidental(0, new VF.Accidental("b"));
	})
};
*/

let container = document.querySelector("#scales");

let MODE = "flats";

function drawScale(id) {
	if (typeof id == "undefined") {
		console.log("Please pass an id for this new scale");
		return;
	}

	let intervals = scales[id];

	console.log(intervals);

	// https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript
	let scale = intervals.reduce(function(r, a) {
		r.push((r.length && r[r.length - 1] || 0) + a);
		return r;
	}, []);

	console.log(scale);

	let time = scale.length + "/4";

	let div = document.createElement("div");
	div.id = "scale_" + id;
	container.append(div);

	const renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
	renderer.resize(780, 200);
	let context = renderer.getContext();

	let stave = new VF.Stave(10, 10, 760);
	stave.addClef('treble').addTimeSignature(time);

	stave.setContext(context).draw();


	// if consecutive notes have the same base and the first is flat, add a natural sign

	let notes = [];

	for (let c = 0; c < scale.length; c += 1) {
		let n = scale[c];
		let note;
		if (c == 0 || MODE !== "flats") {
			note = NOTES[n].canonical[MODE];
		} else {
			if (NOTES[scale[c - 1]].base === NOTES[n].base) {
				note = NOTES[n].natural;
			} else {
				note = NOTES[n].canonical[MODE];
			}
		}
		note.data = NOTES[n];
		notes.push(note);
	}

	let voice = new VF.Voice({num_beats: scale.length, beat_value: 4});
	voice.addTickables(notes);

	let formatter = new VF.Formatter().joinVoices([voice]).format([voice], 750);

	formatter.joinVoices([voice]).formatToStave([voice], stave);	

	voice.draw(context, stave);

	let nodes = document.querySelectorAll(".vf-stavenote");

	function playNote(index, duration) {
		let note = notes[index];
		let node = nodes[index];

		if (duration !== 500 && duration !== 1000 && duration !== 2000) {
			duration = 1000;
		}

		let audio = note.data.audio[duration];
		audio.play();
		select(node).selectAll("path").style("fill", "red").style("stroke", "red").transition().duration(duration).style("fill", "black").style("stroke", "black");
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
		node.setAttribute("data-note", note.name);

		node.addEventListener("click", function() {
			playNote(n, 500);
		});

	});

	return {
		intervals: intervals,
		scale: scale,
		notes: notes,
		playScale: playScale
	}
}

let scale = drawScale(301);

select("#play_scale").on("click", function() {
	console.log(scale);
	scale.playScale(500, 500);
});
