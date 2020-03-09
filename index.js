import { select, selectAll, event } from 'd3-selection';
import { transition, duration } from 'd3-transition';

const Vex = require('vexflow');
const VF = Vex.Flow;

const scales = require("./scales.json");

require("./styles.scss");

let noteNames = {
	sharps: ["c/4", "c#/4", "d/4", "d#/4", "e/4", "f/4", "f#/4", "g/4", "g#/4", "a/4", "a#/4", "b/4", "c/5"],
	flats: ["c/4", "db/4", "d/4", "eb/4", "e/4", "f/4", "gb/4", "g/4", "ab/4", "a/4", "bb/4", "b/4", "c/5"]
}

let playNotes = {};

noteNames.flats.forEach(function(d, i) {
	let noteName = noteNames.flats[i].split("/")[0].toUpperCase() + noteNames.flats[i].split("/")[1];
	// d.setAttribute("data-note", noteName);
	var audio = new Audio('./samples/formatted/' + noteName + '.m4a');
	playNotes[noteName] = audio;
});

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

let container = document.querySelector("#scales");

function drawScale(id) {
	if (typeof id == "undefined") {
		console.log("Please pass an id for this new scale");
		return;
	}

	let intervals = scales[id];

	// https://stackoverflow.com/questions/20477177/creating-an-array-of-cumulative-sum-in-javascript
	let scale = intervals.reduce(function(r, a) {
		r.push((r.length && r[r.length - 1] || 0) + a);
		return r;
	}, []);

	let time = scale.length + "/4";

	let div = document.createElement("div");
	div.id = "scale_" + id;
	container.append(div);

	let renderer = new VF.Renderer(div, VF.Renderer.Backends.SVG);
	renderer.resize(780, 200);
	let context = renderer.getContext();

	let stave = new VF.Stave(10, 10, 760);
	stave.addClef('treble').addTimeSignature(time);

	stave.setContext(context).draw();

	let notes = scale.map(d => {
		return NOTES.flats[d]
	});

	let voice = new VF.Voice({num_beats: scale.length, beat_value: 4});
	voice.addTickables(notes);

	let formatter = new VF.Formatter().joinVoices([voice]).format([voice], 750);

	formatter.joinVoices([voice]).formatToStave([voice], stave);	

	voice.draw(context, stave);

	let nodes = document.querySelectorAll(".vf-stavenote");

	nodes.forEach((node, n) => {
		let i = scale[n];
		let noteName = noteNames.flats[i].split("/")[0].toUpperCase() + noteNames.flats[i].split("/")[1];
		node.setAttribute("data-note", noteName);

		node.addEventListener("click", function() {
			let noteName = this.getAttribute("data-note");
			console.log(noteName, this);
			let audio = playNotes[noteName];
			audio.play();

			let node = select(this);
			console.log(node);
			node.selectAll("path").style("fill", "red").style("stroke", "red").transition().duration(1500).style("fill", "black").style("stroke", "black");
		})

	});

}

drawScale(301);