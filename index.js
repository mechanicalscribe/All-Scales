import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';
import { nanoid } from 'nanoid';
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

const PALETTE = ['#ffffa1', '#ffeb99', '#ffd891', '#ffc489', '#ffb081', '#ff9c79', '#ff8971', '#ff7569'];
const INTERVAL_COLORS = [
	PALETTE[1],
	PALETTE[3],
	PALETTE[5]
];

let scaleContainer = document.querySelector("#scales");

function Scale(scale_number, root) {
	const that = this;
	that.id = nanoid();
	that.root = root || "C";

	const div = document.createElement("div");
	that.el = select(div);

	div.id = "scale_" + that.id;
	div.classList.add("scale");
	div.innerHTML = template();

	scaleContainer.append(div);

	// build control panel

	let keySelect = that.el.select(".key_select");

	keySelect.selectAll("option")
		.data(Object.keys(ROOTS))
		.join("option")
		.attr("value", d => {
			return d;
		})
		.attr("selected", d => d === root ? "selected" : null)
		.html(d => d);

	that.el.select(".options_button").on("click", function() {
		if (this.dataset.open === "false") {
			that.el.select(".scale_options").style("display", "block");
			this.innerHTML = "&minus;";
			this.dataset.open = "true";
		} else {
			that.el.select(".scale_options").style("display", "none");
			this.innerHTML = "&plus;";
			this.dataset.open = "false";			
		}
	});

	const container = document.querySelector("#scale_" + that.id + " .staff");
	const play_button = document.querySelector("#scale_" + that.id + " .play_button");

	play_button.addEventListener("click", function() {
		console.log(that.scale);
		if (that.scale) {
			that.playScale(250, 500);
		}
	});


	const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
	renderer.resize(780, 136);

	let context = that.context = renderer.getContext();

	let stave = that.stave = new VF.Stave(5, 10, 760, {
		space_above_staff_ln: 3.5,
		left_bar: false
	});

	stave.addClef('treble'); //.addTimeSignature(time);

	stave.setContext(context).draw();

	that.drawScale(scale_number, root)
}


Scale.prototype.drawScale = function(scale_number, root) {
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

	const that = this;

	if (root) {
		that.root = root; // already set to 'C' in constructor if unspecified
	}

	that.scale_number = scale_number;
	that.scale_name = scale_names[String(scale_number)] ? scale_names[String(scale_number)][0] : null
	that.slug = that.scale_number + "_" + that.root.replace("#", "s");

	// add name to template
	that.el.select(".scale_title").html(`SCALE #${ that.scale_number }` + (that.scale_name ? (': "' + that.scale_name + '"') : ""));	



	that.intervals = scales[scale_number];

	// https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript
	that.scale = that.intervals.reduce(function(r, a) {
		r.push((r.length && r[r.length - 1] || 0) + a);
		return r;
	}, []);	

	const mode = ROOTS[that.root][1]; // sharps or flats
	const offset = ROOTS[that.root][0] + 39;

	that.notes = [];
	let previous;

	for (let c = 0; c < that.scale.length; c += 1) {
		let n = that.scale[c] + offset;
		let note;
		if (c == 0 || mode !== "flat") {
			note = NOTES[n].canonical[mode];
		} else {
			// if consecutive notes have the same base and the first is flat, add a natural sign
			if (previous.base === NOTES[n].base) {
				note = NOTES[n].natural;
			} else {
				note = NOTES[n].canonical[mode];
			}
		}
		note.data = NOTES[n];
		that.notes.push(note);
		previous = note.data;
	}	

	const voice = that.voice = new VF.Voice({ num_beats: that.scale.length, beat_value: 4 });
	voice.addTickables(that.notes);

	const START_X = 50;
	const TARGET = that.stave.width - START_X * 2;

	that.stave.setNoteStartX(START_X);

	let formatter = new VF.Formatter().format([voice], TARGET + TARGET / (that.scale.length - 1) );
	// let formatter = new VF.Formatter().format([voice], (scale.length - 0) * 60 );
	// let formatter = new VF.Formatter().format([voice], 600 );
	// formatter.formatToStave([voice], stave);

	voice.draw(that.context, that.stave);

	// event listeners for click-to-play

	that.nodes = document.querySelectorAll("#scale_" + that.id + " .vf-stavenote")

	that.notes.forEach(function(note, n) {
		const node = that.nodes[n];

		node.setAttribute("data-note", note.name);

		node.addEventListener("click", function() {
			that.playNote(n, 500);
		});	
	});

	that.drawIntervals();

}

Scale.prototype.drawIntervals = function() {
	const that = this;

	const BBox = that.stave.getBoundingBox();

	const INTERVAL = {
		y: null,
		w: null,
		h: 22,
		m: 3 // margin between spacers and boxes
	};

	const svg = select(that.context.svg);

	const intervalLines = that.intervalLines = svg.append("g").attr("id", "intervalLines");

	that.notes.forEach((note, n) => {
		let node = that.nodes[n];

		if (n < that.notes.length - 1) {
			let interval = that.intervals[n + 1];

			const p = [
				note.getBoundingBox(),
				that.notes[n + 1].getBoundingBox()
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
				.style("fill", INTERVAL_COLORS[interval - 1]);

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
}


Scale.prototype.playNote = function(index, duration) {
	const that = this;

	let note = that.notes[index];
	let node = that.nodes[index];

	if (duration !== 500 && duration !== 1000 && duration !== 2000) {
		duration = 1000;
	}

	let audio = note.data.audio[duration];
	audio.play();
	select(node).selectAll("path").style("fill", "red").style("stroke", "red").transition().duration(duration * 2).style("fill", "black").style("stroke", "black");
}

Scale.prototype.playScale = function(tempo, duration) {
	const that = this;

	if (typeof tempo === "undefined") {
		tempo = 1000;
	}

	if (!duration) {
		duration = 1000;
	}		

	for (let c = 0; c < that.scale.length; c += 1) {
		setTimeout(function() {
			that.playNote(c, duration);
		}, tempo * c);
	}
}

let scale0 = new Scale(2, "Gb");
let scale1 = new Scale("major", "C");
let scale2 = new Scale(730, "B");
// drawScale("blues", "G#");
// drawScale(scales.length - 1, "F");
// drawScale("minor", "Eb");
