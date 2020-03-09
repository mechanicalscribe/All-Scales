const fs = require('fs');

let SCALES = [];

function addInterval(scale, steps) {
	scale.push(steps);

	let sum = scale.reduce((s, n) => s + n );

	if (sum > 12) {
		return;
	} else if (sum === 12) {
		SCALES.push(scale);
		// console.log(scale, sum);
		return;
	} else {
		addInterval(scale.slice(0), 1);
		addInterval(scale.slice(0), 2);
		addInterval(scale.slice(0), 3);
	}
}

addInterval([], 0);

console.log(SCALES.length);

SCALES.forEach(s => {
	if (s.join("_") === [ 0, 3, 2, 1, 1, 3, 2 ].join("_")) {
		console.log(s);
	}
});

let json = JSON.stringify(SCALES);
json  = json.replace(/\[0/g, "\n\t[0");
json = json.replace("]]", "]\n]");

fs.writeFileSync("../scales.json", json);