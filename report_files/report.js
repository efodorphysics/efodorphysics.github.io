"use strict";

let waitDialog;
let main;
let reportType;
let year;
let semester;
let reference;
let login;
const refreshLabelsEvent = new Event('refreshLabels');

$(DOMready);

function DOMready() {

	$.ajaxSetup({
		type: "POST",
		cache: false,
		dataType: "json",
		timeout: 10000,
		success: ajaxSuccess,
		error: ajaxError,
		url: "actions.php"
	});

	let reportTypeLabel = '';

	switch (reportType) {
		case 'dean':
			reportTypeLabel = 'Faculty report';
			break;
		case 'program':
			reportTypeLabel = 'Programme report';
			break;
		case 'track':
			reportTypeLabel = 'Track report';
			break;
		case 'course':
			reportTypeLabel = 'Course report';
			break;
		case 'assessment':
			reportTypeLabel = 'Fairness in assessment report';
			break;
		case 'student':
			reportTypeLabel = 'Student report';
			break;
	}

	$('#subtitle').html(reportTypeLabel);

	/* in order to accelerate report generation about tenfold, the main element is only appended to the dom once
	generation of graphs has finished */
	main = $('<div id="main"></div>');
	waitDialog = new jsModalWait('generating report ...');

	if (!phpError && reportType && reference && year && semester) {
		startAjax('buildReport', {type: reportType, ref: reference, year: year, semester: semester});
	} else if (phpError) {
		main.append(phpError);
		$('body').append(main);
	}
}

function checkFailState(failState) {
	if (failState !== false) {
		main.append(failState);
		createVerticalSpace(50);
		return true;
	} else return false;
}

function buildReport(data, failState) {
	waitDialog.show();
	let errorMessage = false;
	let nerdyError = false;
	try {
		switch (reportType) {
			case 'dean':
				createInfoBox(data.faculty.info);
				main.append(`<div>This report provides an all overall summary of participation and general trends across the various programmes in ${data.faculty.info.faculty} for the ${semester === 'W' ? 'winter' : 'summer'} semester ${year}.</div>`)
				createVerticalSpace(30);
				createFacultyParticipationGraph(data.faculty.participation);
				createFacultyOverallRatings(data.faculty);
				createHorizontalLine();
				createFacultyRatingsByProgramType(data.faculty);
				createHorizontalLine();
				createFacultyRatingsByProgram(data.faculty);
				break;
			case 'program':
				createInfoBox(data.program.info);
				if (checkFailState(failState)) {
					break;
				}
				createParticipationGraph(data.program.participation);
				if (data.program.data.length === 0) {
					showNotEvaluatedMessage();
					break; //no participation
				}
				createProgramComparison(data.program);
				createVerticalSpace(50);
				createProgramItemLevel(data.program);
				main.append("<h2>This section details student responses to the questions by course.</h2>")
				for (let i in data.courses) {
					createHorizontalLine();
					buildMinimizedCourseReport(data.courses[i]);
				}
				createVerticalSpace(50);
				break;
			case 'public_program':
				createInfoBox(data.public_program.info);
				if (checkFailState(failState)) {
					break;
				}
				if (data.public_program.data.length === 0) {
					showNotEvaluatedMessage();
					break; //no participation
				}
				createProgramComparison(data.public_program);
				createVerticalSpace(50);
				createProgramItemLevel(data.public_program);
				createVerticalSpace(50);
				break;
			case 'track':
				createInfoBox(data.track.info);
				if (checkFailState(failState)) {
					break;
				}
				createParticipationGraph(data.track.participation);
				if (data.track.data.length === 0) {
					showNotEvaluatedMessage();
					break; //no participation
				}
				createProgramComparison(data.track);
				createVerticalSpace(50);
				createProgramItemLevel(data.track);
				main.append("<h2>This section details student responses to the questions by course.</h2>")
				for (let i in data.courses) {
					createHorizontalLine();
					buildMinimizedCourseReport(data.courses[i]);
				}
				createVerticalSpace(50);
				break;
			case 'course':
				createInfoBox(data.courses[reference].info);
				if (data.courses[reference].data.length === 0) {
					showNotEvaluatedMessage();
					break;
				}
				createCourseItemLevel(data.courses[reference], main);
				createCommentsLevel(data.courses[reference], main);
				createVerticalSpace(100);
				break;
			case 'assessment':
				createInfoBox(data.courses[reference].info);
				if (data.courses[reference].data.length === 0) {
					showNotEvaluatedMessage();
					break;
				}
				createCourseItemLevel(data.courses[reference], main, true, false);
				createCommentsLevel(data.courses[reference], main);
				createVerticalSpace(100);
				break;
			case 'student':
				createInfoBox(data.courses[reference].info);
				if (data.courses[reference].data.length === 0) {
					showNotEvaluatedMessage();
					break;
				}
				createCourseItemLevel(data.courses[reference], main);
				createVerticalSpace(100);
				break;
		}
	} catch (error) {
		errorMessage = `An error occurred while creating the report. Please contact course.feedback@uni.lu with the following information:<br><br><b>reportType:</b> "${reportType}"<br><b>reference:</b> "${reference}"<br><b>year:</b> "${year}"<br><b>semester:</b> "${semester}<br><b>UA:</b> ${navigator.userAgent}"`;
		console.log(error);
		nerdyError = `login: ${login}\nreportType: "${reportType}"\nreference: "${reference}"\nyear: "${year}"\nsemester: "${semester}\nUA: ${navigator.userAgent}\nexception: ${error}`;
	}
	$('body').append(main);
	$('body').append('<div id="copyright">Copyright © <a href="https://www.uni.lu" target="_blank">Université du Luxembourg</a> 2022. All rights reserved.</div></div>');
	window.dispatchEvent(refreshLabelsEvent); //refreshes the labels of all stacked bar charts
	$('.blockToggle').on('click', toggleBlock);
	waitDialog.hide();
	if (errorMessage !== false) {
		startAjax('jsException', {errorMsg: nerdyError});
		showMessage(errorMessage);
	}
}

function buildMinimizedCourseReport(data) {
	let courseBlock = $(`<div id="course_${data.info.cpe_id}" class="courseBlock"></div>`);
	createMinimizedInfoBox(data.info);
	if (data.data.length === 0) {
		showNotEvaluatedMessage();
		return;
	}
	createCourseItemLevel(data, courseBlock, false, false);
	createCommentsLevel(data, courseBlock, false);
	main.append(courseBlock);
}

function createMinimizedInfoBox(info) {
	let html = '';
	if (typeof (info.reference) !== 'undefined') {
		html += `<h3>${info.reference}</h3>`;
	}
	if (typeof (info.title) !== 'undefined' && typeof (info.type) !== 'undefined') {
		html += `<h3>${info.title} [${info.type}]</h3>`;
	}
	if (typeof (info.teachers) !== 'undefined') {
		html += `<p><b>Teachers:</b> ${info.teachers}</p>`;
	}
	html += '<div class="blockToggle collapsed courseLevel unselectable"></div>';
	main.append(html);
}

function createInfoBox(info) {
	let html = "";
	html += '<table class="info">';

	switch (reportType) {
		case 'program':
		case 'public_program':
			html += `<tr><td><b>Programme name:</b></td><td>${info.title} [${info.reference}]</td></tr>`;
			html += `<tr><td><b>Type of programme:</b></td><td>${info.type}</td></tr>`;
			html += `<tr><td><b>Number of courses:</b></td><td>${info.course_count}</td></tr>`;
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			break;
		case 'track':
			html += `<tr><td><b>Track name:</b></td><td>${info.title} [${info.reference}]</td></tr>`;
			html += `<tr><td><b>Programme name:</b></td><td>${info.prg_title}</td></tr>`;
			html += `<tr><td><b>Type of programme:</b></td><td>${info.type}</td></tr>`;
			html += `<tr><td><b>Number of courses:</b></td><td>${info.course_count}</td></tr>`;
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			break;
		case 'dean':
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			let pCount = '';
			for (let i in info.programCount) {
				if (pCount !== '') {
					pCount += ",<br>";
				}
				pCount += `${info.programCount[i]} ${i} programmes`;
			}
			html += `<tr><td><b>Number of programs:</b></td><td>${pCount}</td></tr>`;
			if (info.surveyCount > 0) {
				html += `<tr><td><b>Number of surveys filled:</b></td><td>${info.surveyCount}</td></tr>`;
				html += `<tr><td><b>Number of students participating:</b></td><td>${info.studentCount}</td></tr>`;
			}
			break;
		case 'course':
			html += `<tr><td><b>Course name:</b></td><td>${info.title} [${info.reference}]</td></tr>`;
			html += `<tr><td><b>Type of course:</b></td><td>${info.type}</td></tr>`;
			html += `<tr><td><b>Number of students enrolled:</b></td><td>${info.student_count}</td></tr>`;
			html += `<tr><td><b>Study programmes:</b></td><td>${info.programs}</td></tr>`;
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			break;
		case 'assessment':
			html += `<tr><td><b>Course name:</b></td><td>${info.title} [${info.reference}]</td></tr>`;
			html += `<tr><td><b>Number of students enrolled:</b></td><td>${info.student_count}</td></tr>`;
			html += `<tr><td><b>Study programmes:</b></td><td>${info.programs}</td></tr>`;
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			break;
		case 'student':
			html += `<tr><td><b>Course name:</b></td><td>${info.title} [${info.reference}]</td></tr>`;
			html += `<tr><td><b>Type of course:</b></td><td>${info.type}</td></tr>`;
			html += `<tr><td><b>Number of students enrolled:</b></td><td>${info.student_count}</td></tr>`;
			html += `<tr><td><b>Study programmes:</b></td><td>${info.programs}</td></tr>`;
			html += `<tr><td><b>Faculty:</b></td><td>${info.faculty}</td></tr>`;
			break;
	}
	html += `<tr><td><b>Semester:</b></td><td>${semester === 'W' ? 'Winter' : 'Summer'} ${year}</td></tr>`;
	if (reportType === 'program' && showDataDownload === 1) {
		html += `<tr class="screenOnly"><td><b>Raw data:</b></td><td>click <a class="downloadLink" href="download.php?reference=${encodeURIComponent(reference)}&type=${encodeURIComponent(reportType)}&year=${encodeURIComponent(year)}&semester=${encodeURIComponent(semester)}" target="_blank">here</a> to download raw data in CSV format</td></tr>`;
		html += `<tr class="screenOnly"><td></td><td>for an explanation of the file format, download this <a class="downloadLink" href="documents/raw%20data%20file%20format.pdf" target="_blank">manual</a></td></tr>`;
	}
	html += "</table>";
	main.append(html);
	createVerticalSpace(50);
}

function createFacultyParticipationGraph(data) {
	let participation = [];
	for (let row of data.onceByProgram) {
		participation.push({label: row.prg_title, ref: row.prg_ref, progress: parseInt(row.percentage)});
	}
	let conf = {
		title: "Percentage of courses receiving at least one feedback per study programme",
		subTitle: `Overall, ${data.onceTotal}% of courses were evaluated at least once.`,
		parent: main
	}
	new jsProgressChart(conf, participation);

	participation = [];
	for (let row of data.studentsByProgram) {
		participation.push({label: row.prg_title, ref: row.prg_ref, progress: parseInt(row.percentage)});
	}
	conf = {
		title: "Percentage of students that participated in student feedback this semester, per study programme.",
		parent: main
	}
	new jsProgressChart(conf, participation);
}

function createFacultyOverallRatings(data) {
	main.append("<h2>Overall ratings</h2>");
	main.append("<h3>Percent responses to the overall satisfaction question for faculty</h3>");
	let chart;

	//groups data preparation
	for (let g of data.groupOrder) {
		let group = data.groups[g];
		let conf = {
			parent: main,
			fields: data.legends.groups[g],
			type: 'single',
			reference: `${reference}_group_${g}`,
			count: false,
			labelType: 'percent'
		};
		let dt = {};

		if (typeof (conf.title) === 'undefined') {
			conf.title = group.faculty.label;
		}

		dt = {}
		dt.total = group.faculty.count;
		dt.values = group.faculty.answers;
		chart = new jsStackedBarChart(conf, dt);
	}

	//overall data preparation
	if (typeof (data.legends.overall) !== 'undefined') {
		let conf = {
			parent: main,
			fields: data.legends.overall,
			type: 'single',
			reference: `${reference}_overall`,
			count: false,
			labelType: 'percent'
		};

		if (typeof (conf.title) === 'undefined') {
			conf.title = data.overall.faculty.label;
		}

		let dt = {}
		dt.total = data.overall.faculty.count;
		dt.values = data.overall.faculty.answers;
		main.append("<hr class='dashed'>");
		new jsStackedBarChart(conf, dt);
	}

	createVerticalSpace(50);
	main.append("<h3>Percent responses to rating items (questions) for faculty</h3><p>This section summarizes student responses concerning their learning experience, course organisation, interaction, student and course characteristics, assignments, assessment and individual rapport in each course. Note: the applicable response scale is provided above each corresponding set of questions.</p>");
	let prevFields = false;
	let chartCount = 0;
	for (let field of data.fieldOrder) {
		let skipLegend = false;
		let fieldId = field.field_id;
		let fields = data.legends.fields[fieldId];
		if (prevFields !== false && compareFields(fields, prevFields)) {
			skipLegend = true;
		}
		prevFields = fields;
		let conf = {
			parent: main,
			fields: fields,
			count: false,
			title: field.question,
			reference: `${reference}_${fieldId}`,
			type: 'single',
			labelType: 'percent'
		}
		let dt = data.itemLevel.faculty[fieldId];
		if (dt) {
			chartCount++;
			chart = new jsStackedBarChart(conf, dt, skipLegend);
		}
	}

	createVerticalSpace(50);
}

function createFacultyRatingsByProgramType(data) {
	main.append("<h2>Overall ratings by programme type</h2>");
	main.append("<h3>Percent responses to the overall satisfaction question for bachelor programmes, master programmes and all other programmes</h3>");
	let chart;

	//groups data preparation
	for (let g of data.groupOrder) {
		let group = data.groups[g];
		let conf = {
			parent: main,
			fields: data.legends.groups[g],
			type: 'comparison',
			reference: `${reference}_group_${g}_byProgramType`,
			counts: {},
			labelType: 'percent'
		};
		let dt = {};
		for (let p in data.groups[g]) {
			if (p === 'faculty') {
				continue;
			}
			let ref = p;
			let name = p;
			let prgData = group[ref];

			if (typeof (conf.title) === 'undefined') {
				conf.title = prgData.label;
			}

			dt[ref] = {};
			dt[ref].total = prgData.count;
			dt[ref].values = prgData.answers;
			dt[ref].label = name;
		}
		chart = new jsStackedBarChart(conf, dt);
	}

	//overall data preparation
	if (typeof (data.legends.overall) !== 'undefined') {
		let conf = {
			parent: main,
			fields: data.legends.overall,
			type: 'comparison',
			reference: `${reference}_overall_byProgramType`,
			counts: {},
			labelType: 'percent'
		};
		let dt = {};
		for (let p in data.overall) {
			if (p === 'faculty') {
				continue;
			}
			let ref = p;
			let name = p;
			let prgData = data.overall[ref];

			if (typeof (conf.title) === 'undefined') {
				conf.title = prgData.label;
			}

			dt[ref] = {};
			dt[ref].total = prgData.count;
			dt[ref].values = prgData.answers;
			dt[ref].label = name;
		}
		main.append("<hr class='dashed'>");
		new jsStackedBarChart(conf, dt);
	}

	createVerticalSpace(50);
	main.append("<h3>Percent responses to rating items (questions) for bachelor programmes, master programmes and all other programmes</h3><p>This section summarizes student responses concerning their learning experience, course organisation, interaction, student and course characteristics, assignments, assessment and individual rapport in each course. Note: the applicable response scale is provided above each corresponding set of questions.</p>");

	//groups data preparation
	let prevFields = false;
	for (let field of data.fieldOrder) {
		let skipLegend = false;
		let g = field.field_id;
		let fields = data.legends.fields[g];
		if (prevFields !== false && compareFields(fields, prevFields)) {
			/* the fields are the same skip printing the legend */
			skipLegend = true;
		}
		prevFields = fields;
		let conf = {
			parent: main,
			fields: data.legends.fields[g],
			type: 'comparison',
			reference: `${g}_byProgramType`,
			counts: {},
			labelType: 'percent'
		};
		let dt = {};
		for (let p in data.itemLevel) {
			if (p === 'faculty') {
				continue;
			}
			let ref = p;
			let name = p;
			let prgData = data.itemLevel[p][g];

			if (typeof (conf.title) === 'undefined') {
				conf.title = field.question;
			}

			dt[ref] = {};
			dt[ref].total = prgData.total;
			dt[ref].values = prgData.values;
			dt[ref].label = name;
		}
		chart = new jsStackedBarChart(conf, dt, skipLegend);
	}
}

function createFacultyRatingsByProgram(data) {
	main.append("<h2>Overall ratings by study programme</h2>");
	let programs = data.programs;
	let chart;

	for (let i in programs.overall) {
		main.append(`<h3>Percent responses to the overall satisfaction question for ${i} programmes</h3>`);
		//groups data preparation
		for (let g of data.groupOrder) {
			let group = programs.groups[g];
			let conf = {
				parent: main,
				fields: data.legends.groups[g],
				type: 'comparison',
				reference: `${reference}_group_${g}_${i}_byProgramme`,
				counts: {},
				labelType: 'percent'
			};
			let dt = {};
			for (let p in group[i]) {
				let ref = p;
				let prgData = group[i][ref];

				if (typeof (conf.title) === 'undefined') {
					conf.title = prgData.label;
				}

				dt[ref] = {};
				dt[ref].total = prgData.count;
				dt[ref].values = prgData.answers;
				dt[ref].label = prgData.title;
			}
			chart = new jsStackedBarChart(conf, dt);
		}

		//overall data preparation
		if (typeof (data.legends.overall) !== 'undefined') {
			let conf = {
				parent: main,
				fields: data.legends.overall,
				type: 'comparison',
				reference: `${reference}_overall_${i}_byProgramme`,
				counts: {},
				labelType: 'percent'
			};
			let dt = {};
			for (let p in programs.overall[i]) {
				let ref = p;
				let prgData = programs.overall[i][ref];

				if (typeof (conf.title) === 'undefined') {
					conf.title = prgData.label;
				}

				dt[ref] = {};
				dt[ref].total = prgData.count;
				dt[ref].values = prgData.answers;
				dt[ref].label = prgData.title;
			}
			main.append("<hr class='dashed'>");
			chart = new jsStackedBarChart(conf, dt);
		}

		createVerticalSpace(50);
	}
}


function createParticipationGraph(data) {
	let participation = [];
	for (let row of data) {
		participation.push({label: `${row.course_title} <span class='survey_type'>${row.cpe_type}</span>`, ref: row.course_ref, progress: parseInt(row.participation)});
	}
	let conf = {
		title: `Participation rates by course in this ${(reportType === 'program' || reportType === 'public_program') ? "study programme" : "track"}`,
		parent: main
	}
	new jsProgressChart(conf, participation);
}

function showNotEvaluatedMessage() {
	main.append("<p>No student submitted any feedback.<p>");
}

function createProgramComparison(data) {
	if (data.groups.length < 1) {
		return;
	}
	main.append(`<h2>Percent responses to the overall satisfaction question for this ${(reportType === 'program') || reportType === 'public_program' ? "study programme" : "track"}</h2>`);
	let chart;

	//groups data preparation
	for (let g of data.groupOrder) {
		let group = data.groups[g];
		let conf = {
			parent: main,
			fields: data.legends.groups[g],
			type: 'comparison',
			reference: `${reference}_group_${g}`,
			counts: {},
			labelType: 'percent'
		};
		let dt = {};

		let name = `other ${data.info.type} programmes`;
		let othersData = group.others;

		if (typeof (conf.title) === 'undefined') {
			conf.title = othersData.label;
		}

		dt['others'] = {};
		dt['others'].total = othersData.count;
		dt['others'].values = othersData.answers;
		dt['others'].label = name;

		dt['thisProgramme'] = {}
		dt['thisProgramme'].total = group.program.count;
		dt['thisProgramme'].values = group.program.answers;
		dt['thisProgramme'].label = `this ${(reportType === 'program' || reportType === 'public_program') ? "study programme" : "track"}`;
		chart = new jsStackedBarChart(conf, dt);
	}

	//overall data preparation
	if (typeof (data.legends.overall) !== 'undefined') {
		let conf = {
			parent: main,
			fields: data.legends.overall,
			type: 'comparison',
			reference: `${reference}_overall`,
			counts: {},
			labelType: 'percent'
		};
		let dt = {};

		let name = `other ${data.info.type} programmes`;
		let othersData = data.overall.others;

		if (typeof (conf.title) === 'undefined') {
			conf.title = othersData.label;
		}

		dt['others'] = {};
		dt['others'].total = othersData.count;
		dt['others'].values = othersData.answers;
		dt['others'].label = name;

		dt['thisCourse'] = {}
		dt['thisCourse'].total = data.overall.program.count;
		dt['thisCourse'].values = data.overall.program.answers;
		dt['thisCourse'].label = `this ${(reportType === 'program' || reportType === 'public_program') ? "study programme" : "track"}`;
		main.append("<hr class='dashed'>");
		new jsStackedBarChart(conf, dt);
	}

}

/* output item specific ratings of the report */
function createCourseItemLevel(data, target, title = true, explanation = true) {
	if (data.data.length === 0) return;
	if (title) {
		target.append("<h2>Responses to rating scale items (questions):</h2>");
		if (explanation) {
			target.append("<p>This section summarizes student responses concerning their learning experience, course organisation, interaction, student and course characteristics, assignments, assessment and individual rapport in your course. Note: the applicable response scale is provided above each corresponding set of questions.</p>");
		}
	}
	let prevFields = false;
	let chart;
	let chartCount = 0;
	for (let field of data.fieldOrder) {
		let skipLegend = false;
		let fieldId = field.field_id;
		if (field.value_type === "mc") {
			let fields = data.legend[fieldId];
			if (prevFields !== false && compareFields(fields, prevFields)) {
				/* the fields are the same skip printing the legend */
				skipLegend = true;
			}
			prevFields = fields;
			let conf = {
				parent: target,
				fields: data.legend[fieldId],
				count: data.studentCount,
				title: field.question,
				reference: `${reference}_${fieldId}`,
				type: 'single'
			}
			let dt = data.data[fieldId];
			if (dt) {
				chartCount++;
				// console.log(conf);
				// console.log(dt);
				// console.log('---');
				chart = new jsStackedBarChart(conf, dt, skipLegend);
			}
		} else if (field.value_type === "text" || field.value_type === "mc_text") {
			prevFields = false;
		}
	}
	if (chartCount === 0) {
		target.append("<p>No ratings have been submitted for this course, but it received some comments.</p>")
	}
	createVerticalSpace(50, target);
}

function createProgramItemLevel(data) {
	if (data.data.length === 0) return;
	main.append(`<h2>Percent responses to rating items (questions) for this ${(reportType === 'program' || reportType === 'public_program') ? "study programme" : "track"}</h2>`);
	let prevFields = false;
	let chart;
	let chartCount = 0;
	for (let field of data.fieldOrder) {
		let skipLegend = false;
		let fieldId = field.field_id;
		if (field.value_type === "mc") {
			let fields = data.legends.fields[fieldId];
			if (prevFields !== false && compareFields(fields, prevFields)) {
				/* the fields are the same skip printing the legend */
				skipLegend = true;
			}
			prevFields = fields;
			let conf = {
				parent: main,
				fields: data.legends.fields[fieldId],
				count: false,
				title: field.question,
				reference: `${reference}_${fieldId}`,
				type: 'single',
				labelType: 'percent'
			}
			let dt = data.data[fieldId];
			if (dt) {
				chartCount++;
				chart = new jsStackedBarChart(conf, dt, skipLegend);
			}
		} else if (field.value_type === "text" || field.value_type === "mc_text") {
			/* if there were charts before add legend to the last one */
			prevFields = false;
		}
	}
	if (chartCount === 0) {
		main.append("<p>No ratings have been submitted for this programme, but it received some responses to open-ended questions.</p>")
	}
	createVerticalSpace(50);

}

/* output open text answers */
function createCommentsLevel(data, target, title = true) {
	let html = '';
	for (let field of data.fieldOrder) {
		let fieldId = field.field_id;
		if (field.value_type === "text" && typeof (data.data[fieldId]) !== 'undefined' && data.data[fieldId].values.length > 0) {
			html += `<div></div><div class="blockToggle collapsed commentLevel unselectable"></div><div class="commentsQuestion">${field.question}</div><div class="commentsGroup">`;
			for (let comment of data.data[fieldId].values) {
				html += `<div class="comment">${comment}</div>`;
			}
			html += `</div></div>`;
		} else if (field.value_type === "mc_text" && typeof (data.data[fieldId]) !== 'undefined' && data.data[fieldId].values.length > 0) {
			html += `<div></div><div class="blockToggle collapsed commentLevel unselectable"></div><div class="commentsQuestion">${field.question}</div><div class="commentsGroup">`;
			orderArrayByProperty(data.data[fieldId].values, 'mc', true);
			for (let comment of data.data[fieldId].values) {
				let legend = fetchObjectFromArray(data.legend[fieldId], {value: comment.mc.toString()});
				html += `<div class="mc_text_choice"><div class="mc_text_colourIndicator" style="background-color: ${legend.colour}"></div>${legend.label}</div>`;
				html += `<div class="mc_text_comment">${comment.text}</div>`;
			}
			html += `</div></div>`;
		}
	}
	if (html !== '') {
		if (title === true) {
			html = "<h2>Responses to open-ended questions:</h2><p>This section reports all comments received from your students in response to the following open-ended questions. Each shaded box contains the complete comment of a student. Note: where applicable, student comments are paired with their respective closed responses.</p>" + html;
		}
		target.append(html);
	}
}

function toggleBlock(e) {
	let button = $(e.delegateTarget);
	if (button.hasClass('collapsed')) {
		button.removeClass('collapsed');
		button.addClass('expanded');
		window.dispatchEvent(refreshLabelsEvent); //refreshes the labels of all stacked bar charts
	} else {
		button.removeClass('expanded');
		button.addClass('collapsed');
	}
}

function createVerticalSpace(h, target = main) {
	target.append(`<div class='verticalSpace' style="height: ${h}px"></div>`);
}

function createHorizontalLine(target = main) {
	target.append(`<hr>`);
}


/* helper functions */

function compareFields(a1, a2) {
	//if count of elements differs, we can return false right away
	if (a1.length !== a2.length) return false;
	for (let i in a1) {
		let o1 = a1[i];
		let o2 = a2[i];
		if (o1.value !== o2.value || o1.colour !== o2.colour || o1.label !== o2.label) {
			return false;
		}
	}
	return true;
}


function showMessage() {
	/*
	 usage: showMessage([buttons array], message_with_sf_placholders, [sf_param1, ...], [callback_function], [callback_param1, ...]);
	 */
	let callback = null;
	const argv = [];
	const argc = arguments.length;
	const params = [];
	let buttons;
	for (let i = 0; i < argc; i++) {
		if (callback !== null) {
			params.push(arguments[i]);
		} else if (typeof (arguments[i]) === 'function') {
			callback = arguments[i];
		} else if (arguments[i] instanceof Array) {
			buttons = arguments[i];
		} else {
			argv.push(arguments[i]);
		}
	}
	const msg = sf.apply(this, argv);
	if (!buttons) {
		buttons = [
			{label: 'OK', 'default': true, cancel: true, value: 'ok'}
		];
	}
	const dialogData = {
		buttons: buttons,
		contents: msg,
		width: 500,
		callback: callback
	};
	new nxDialog('Message', dialogData, params);
	$(".nxDialogBody").css("user-select", "text");
}

/* server communication */

function startAjax(action, data) {
	waitDialog.show();
	let params = {
		action: action,
		module: 'report',
		data: JSON.stringify(data)
	};
	$.ajax({
		data: params
	});
}

function ajaxError(jqXHR) {
	waitDialog.hide();
	if (!jqXHR) {
		console.log('An unspecified AJAX error occurred.');
		return;
	} else if (jqXHR.status === 200) {
		//this happens if script executes without errors, but does not send anything back
		console.log('An AJAX error occurred with status 200.');
		return;
	}
	let txt = `Error status: ${jqXHR.statusText} [${jqXHR.status}]`;
	if (jqXHR.responseJSON) {
		txt = jqXHR.responseJSON.fatalError || jqXHR.responseJSON.error || txt;
	}
	let dialogData = {
		buttons: [{
			label: 'OK',
			'default': true,
			cancel: true,
			value: 'ok'
		}],
		contents: txt,
		title: 'Error: ' + jqXHR.statusText,
		width: 500
	};
	new nxDialog('ajaxError', dialogData);
	console.log(`An AJAX error occurred with status: ${jqXHR.statusText} [${jqXHR.status}]`);
	console.log(txt);
}

function ajaxSuccess(res) {
	waitDialog.hide();
	//if there was a fatal PHP error that prevented the script from finishing show that error
	//this data is created in PHP via the register_shutdown_function
	let dialogData;
	if (res.fatalError) {
		dialogData = {
			buttons: [{
				label: 'OK',
				'default': true,
				cancel: true,
				value: 'ok'
			}],
			contents: '<strong>Sorry! The action cannot be completed.</strong><br />' + res.fatalError,
			title: "Error",
			iconWidth: 64,
			width: 500
		};
		new nxDialog('fatalError', dialogData);
		return;
	}
	//if a normal error occured in PHP that did not prevent the script from finishing, show it
	if (res.error !== false) {
		dialogData = {
			buttons: [{
				label: 'OK',
				'default': true,
				cancel: true,
				value: 'ok'
			}],
			contents: '<strong>Sorry! The action cannot be completed.</strong><br />' + res.error,
			title: "Error",
			iconWidth: 64,
			width: 500
		};
		new nxDialog('error', dialogData);
		return;
	}
	if (res.warnings) {
		for (let i in res.warnings) {
			showMessage(res.warnings[i]);
		}
	}
	if (res.debug) {
		console.log('---- debug info ----');
		console.log(`action '${res.action}':`);
		console.log(res.debug);
		console.log('--------------------');
	}
	switch (res.action) {
		case 'buildReport':
			login = res.login;
			buildReport(res.data, res.failState ?? false);
			break;
	}
}