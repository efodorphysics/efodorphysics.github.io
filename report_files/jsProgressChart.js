class jsProgressChart {

	data;
	conf;

	constructor	(conf, data) {
		this.data = data;
		this.conf = conf;
		this.buildGraph();
	}

	buildGraph() {
		let html = '';
		html += `<h2 class="pcTitle">${this.conf.title}</h2>`;
		if (this.conf.subTitle) {
			html += `<p>${this.conf.subTitle}</p>`;
		}
		html += `<div class="progressChart">`;
		for (let row of this.data) {
			html += `<div class='pcRowLabel'><span class="longLabel">${row.label}</span><span class="shortLabel">${row.ref}</span></div><div class="pcProgressFrame"><div class="pcProgressBar" style="width: ${row.progress}%"></div><div class="pcPercentageLabel">${row.progress}%</div></div>`;
		}
		html+=`</div>`;
		this.conf.parent.append(html);
	}
}