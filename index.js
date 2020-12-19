import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';
import { nanoid } from 'nanoid';
import { inputs, selections } from './lib/interactive-tools';
import Vex from 'vexflow';

const VF = Vex.Flow;

Vex.Flow.Formatter.DEBUG = true;

const scales = require("./data/scales.json");
const scale_names = require("./data/scale_names.json");
const NOTES = require("./data/notes.json");

console.log(scales);

const template = require("./src/scale.ejs");
import STYLE_COLORS from "./src/styles.scss";

console.log(STYLE_COLORS);

const byName = {}

Object.entries(scale_names).forEach(d => {
	byName[d[1][1]] = +d[0] - 1;
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

	const div = that.div = document.createElement("div");
	that.el = select(div);

	div.id = "scale_" + that.id;
	div.classList.add("scale");
	div.innerHTML = template();

	scaleContainer.append(div);

	// build control panel
	let selectItems = Object.keys(ROOTS).map(d => {
		return {
			value: d.replace("#", "s"),
			label: d.replace("#", "♯").replace(/b$/, "♭")
		}
	});

	let selectedIndex = Object.keys(ROOTS).indexOf(that.root);

	that.rootDropdown = selections.makeStyleBox("#scale_" + that.id + " .key_select_container", selectItems, {
		value_key: "value",
		label_key: "label",
		selected: that.root.replace("#", "s"),
		onChange: function(val, html) {
			that.drawScale(that.scale_number, html.replace("♯", "#").replace("♭", "b"));
		}
	});

	that.scaleNumberSelector = that.el.select("#scale_" + that.id + " .scale_number_input").node();

	that.scaleNumberSelector.addEventListener("change", function(e, v) {
		that.drawScale(+this.value - 1);
	});

	that.el.select(".options_button").on("click", function() {
		scaleContainer.removeChild(that.div);
		/*
		if (this.dataset.open === "false") {
			that.el.select(".scale_options").style("display", "block");
			this.innerHTML = "&minus;";
			this.dataset.open = "true";
		} else {
			that.el.select(".scale_options").style("display", "none");
			this.innerHTML = "&plus;";
			this.dataset.open = "false";			
		}
		*/
	});

	const container = document.querySelector("#scale_" + that.id + " .staff");
	const play_button = document.querySelector("#scale_" + that.id + " .play_button");

	play_button.addEventListener("click", function() {
		if (that.scale) {
			that.playScale(250, 500);
		}
	});

	const renderer = new VF.Renderer(container, VF.Renderer.Backends.SVG);
	renderer.resize(780, 136);

	let context = that.context = renderer.getContext();

	let stave = that.stave = new VF.Stave(5, 10, 760, {
		space_above_staff_ln: 1.5,
		left_bar: false
	});

	stave.addClef('treble'); //.addTimeSignature(time);

	stave.setContext(context).draw();

	if (typeof scale_number != "undefined") {
		that.drawScale(scale_number, root)
	}
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
	that.scale_name = scale_names[String(scale_number + 1)] ? scale_names[String(scale_number + 1)][0] : null
	that.slug = that.scale_number + "_" + that.root.replace("#", "s");

	that.rootDropdown.setValue(that.root.replace("#", "s"));
	that.scaleNumberSelector.value = that.scale_number + 1;

	// add name to template
	// `scale_number` is 0-indexed, so add one
	that.el.select(".scale_title").html(`<strong>Scale #${ that.scale_number + 1 }` + (that.scale_name ? (': </strong>&ldquo;' + that.scale_name + '&rdquo;') : "") + " in " + that.root);	

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

	that.context.clear();

	that.stave.setContext(that.context).draw();

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

	let sample = duration;

	if (sample !== 500 && sample !== 1000 && sample !== 2000) {
		sample = 1000;
	}

	let audio = note.data.audio[sample];
	audio.play();

	select(node).selectAll("path").style("fill", STYLE_COLORS.green).style("stroke", STYLE_COLORS.green).transition().duration(duration * 2).style("fill", "black").style("stroke", "black");
}

Scale.prototype.playScale = function(tempo, duration) {
	const that = this;

	if (typeof tempo === "undefined") {
		tempo = 500;
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

let scale0 = new Scale();
let scale1 = new Scale("major", "C");
let scale2 = new Scale(730, "B");
// drawScale("blues", "G#");
// drawScale(scales.length - 1, "F");
// drawScale("minor", "Eb");


scale0.drawScale("blues", "F")

scale1.drawScale(100, "D#")