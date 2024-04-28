class jsStackedBarChart {
	constructor(conf, data, skipLegend = false) {
		if (typeof (data) === 'undefined') {
			data = {total: 0, values: {}};
		}

		this.conf = conf;
		this.data = data;

		 //console.log(conf);
		 //console.log(data);

		let html = `<div class="stackedBarChartWrapper">`;

		if (!skipLegend) {
			html += this.createLegend();
		}

		html += `<div class="stackedBarChart" id="sbc_${this.conf.reference}">`;
		html += `<div class="sbcTitle">${this.conf.title}</div>`;

		if (this.conf.type === "single") {
			html += this.createSingleChart();
		} else if (this.conf.type === "comparison") {
			html += this.createComparisonCharts();
		}

		html += `</div>`;

		conf.parent.append(html);
		this.element = conf.parent.find(`div#sbc_${this.conf.reference}.stackedBarChart`);


		$(window).on("resize refreshLabels", () => {
			/* if parent of this chart is not set to display none, let's refresh the labels */
			if(conf.parent.css('display') !== 'none') {
				this.refreshLabels.call(this);
			}
		});
	}

	createComparisonCharts() {
		let html = '';
		html += `<div class="sbcComparisonFrame">`;
		for (let p in this.data) {
			let boxes = this.createBoxes(this.data[p], true);
			html += `<div class="sbcComparisonLabel">${this.data[p].label}</div>`;
			html += `<div class="sbcInvisibleFrame">`;
			html += `<div class='sbcBoxes'>${boxes}</div>`;
			html += `</div>`;
			html += `<div class="sbcParticipation">surveys filled: ${this.data[p].total}</div>`;
		}
		html += `</div>`;
		return html;
	}

	createSingleChart() {
		let boxes = this.createBoxes(this.data, true);
		let html = '';
		html += `<div class="sbcInvisibleFrame">`;
		html += `<div class='sbcBoxes'>${boxes}</div>`;
		html += `</div>`;

		if (this.data.values?.['N/A'] > 0) {
			html += `<div>${this.data.values['N/A']} student${this.data.values['N/A'] > 1 ? 's' : ''} rated this question as non applicable.</div>`;
		}
		if (this.conf.count !== false) {
			html += `<div class="sbcParticipation">student participation: ${this.data.total} out of ${this.conf.count} [${Math.round(this.data.total / this.conf.count * 100)}%]</div>`;
		} else {
			html += `<div class="sbcParticipation">surveys filled: ${this.data.total}</div>`;
		}
		html += `</div>`;

		return html;
	}

	createBoxes(data, addLabels) {
		let divider = data.total - (data.values?.['N/A'] ?? 0);

		let html = "";
		let negative = 0;
		let positive = 0;
		let neutral = 0;
		let totalBoxWidths = 0;

		for (let field of this.conf.fields) {
			if (!data.values[field.value]) {
				continue;
			}
			let count = data.values[field.value];
			let width = this.round(count / divider * 100);
			if (totalBoxWidths + width > 100) {
				//prevent linewrapping due to rounding errors
				width = 100 - totalBoxWidths;
			}
			html += `<div class="sbcBox" style="background-color: ${field.colour}; width: ${width}%;">`;
			if (addLabels) {
				if (this.conf.labelType === 'percent') {
					html += `<span class="sbcVoteCount">${Math.round(width)}%</span>`;
				} else {
					html += `<span class="sbcVoteCount">${count}</span>`;
				}
			}
			html += `</div>`;
			if (parseInt(field.value) < 0) {
				negative += width;
			} else if (parseInt(field.value) > 0) {
				positive += width;
			} else if (parseInt(field.value) === 0) {
				neutral = width;
			}
			totalBoxWidths += width;
		}
		return html;
	}

	createLegend() {
		let html = "<table class='sbcLegend'><tr>"
		let n = this.conf.fields.length;
		let cellWidth = Math.floor(100 / (n + 4)); //adding 4 to n in order to make outer cells bigger
		let colspanCenterCell = n - 2; //colspan for neutral cell label if there is one
		let labels = [];
		for (let row of this.conf.fields) {
			if (row.label) {
				labels.push(row.label);
			}
		}
		if (labels.length === 2 || labels.length === 3) {
			html += `<td style="width: ${2 * cellWidth}%"></td>`;
		}
		for (let row of this.conf.fields) {
			html += `<td class="sbcLegendSwatchCell" style="width: ${cellWidth}%"><div class="sbcLegendSwatch" style="background-color: ${row.colour}"></div></td>`;
		}
		if (labels.length === 2 || labels.length === 3) {
			html += `<td style="width: ${2 * cellWidth}%"></td>`;
		}
		html += `</tr><tr>`;
		if (labels.length === 2) {
			html += `<td colspan="2" class="sbcLegendLabelRight">${labels[0]}</td>`;
			html += `<td colspan="${colspanCenterCell}" class="sbcLegendLabelCenter">&nbsp;</td>`;
			html += `<td colspan="2" class="sbcLegendLabelLeft">${labels[1]}</td>`;
		} else if (labels.length === 3) {
			html += `<td colspan="2" class="sbcLegendLabelRight">${labels[0]}</td>`;
			html += `<td colspan="${colspanCenterCell}" class="sbcLegendLabelCenter">${labels[1]}</td>`;
			html += `<td colspan="2" class="sbcLegendLabelLeft">${labels[2]}</td>`;
		} else {
			for (let row of this.conf.fields) {
				html += `<td class="sbcLegendLabelCenter">${row.label}</td>`;
			}
		}
		html += "</tr></table>"
		return html;
	}

	/* the following function hides all labels that will not fit */
	refreshLabels() {
		this.element.find("span.sbcVoteCount").each(function (idx, el) {
			el = $(el);
			if (el.outerWidth() + 2 > el.parent().outerWidth()) {
				el.hide();
			} else {
				let w = Math.round(-el.outerWidth() / 2);
				el.css("margin-left", `${w}px`);
				el.show();
			}
		});
	}

	round(x) {
		return Math.round((x + Number.EPSILON) * 100) / 100;
	}
}