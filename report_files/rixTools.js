"use strict";

/*
 *  rixTools for Javascript v1.56
 *
 * 	compatibility changes:
 * 	v1.52+
 * 		- removed the functions compareObjects() and compareArrays(); please use the much more concise function
 * 		compareData() in their stead, as it allows nesting objects in arrays and the other way around
 *
 * 		- removed cloneArr(); use deepCopy() instead
 *
 */

//create a string in printf way, untyped placeholder: '%@'
function stringf(s) {
	for (let i = 1; i < arguments.length; i++) {
		const arg = objectToString(arguments[i]);
		s = s.replace(/%@/, arg);
	}
	return s;
}

window.sf = stringf;

function db() {
	//this writes to the console
	console.log(stringf.apply(this, arguments));
}

function dbObj(o) {
	let log = [];
	let s = '{\n';
	s = dbObjRoutine(o, s, log, '\t');
	s += '}';
	console.log(s, ...log);
}

function dbObjRoutine(o, s, log, prefix) {
	let bold = 'font-weight: bold; color: #AAAAFF'
	let clear = '';
	for (let k in o) {
		let v=o[k];
		s += `${prefix}%c${k}:%c `;
		log.push(bold, clear);
		if (typeof (v) === 'object') {
			let opener = '{';
			let closer = '}';
			if (v instanceof Array) {
				opener = '[';
				closer = ']';
			}
			s += `${opener}\n`;
			s = dbObjRoutine(v, s, log, prefix + '\t');
			s += `${prefix}${closer}\n`;
		} else if(typeof (v) === 'string') {
			s += `"${v}"\n`;
		} else {
			s += `${v}\n`;
		}
	}
	return s;
}

/*
 *  array manipulation
 */

//remove a given value from an array
function removeFromArray(a, v, k) {
	//a: array to search
	//v: value to remove
	//k: optional key, if the array contains objects, and the value to search for belongs to a specific key of said objects
	if (typeof (k) === 'undefined') {
		const idx = a.indexOf(v);
		if (idx > -1) {
			a.splice(idx, 1);
		}
	} else {
		for (let i in a) {
			if (typeof (a[i]) === 'object' && typeof (a[i][k]) !== 'undefined' && a[i][k] === v) {
				a.splice(i, 1);
			}
		}
	}
}

//find index of object in array based on value of subkey
function indexFromArray(a, v, k) {
	//a: array to search
	//v: value to look for
	//k: subkey of objects to search for the given value
	for (let i in a) {
		if (typeof (a[i]) === 'object' && typeof (a[i][k]) !== 'undefined' && a[i][k] === v) {
			return i;
		}
	}
	return -1;
}

/* return an object from an array based on one or more subvalue
 * usage example:
 *
 * let params = {id: 45, type: 'folder'};
 * let obj = fetchObjectFromArray(someArray, params);
 *
 * This example will check all the objects in someArray until it finds one that has an id of 45 and a type of 'folder',
 * then returns a copy of this object in it's entirety with all other values it might have
 */
function fetchObjectFromArray(a, params, byReference) {
	for (let i in a) {
		let match = true;
		for (let k in params) {
			if (typeof (a[i][k]) === 'undefined' || a[i][k] !== params[k]) {
				match = false;
			}
		}
		if (match) {
			if (byReference) {
				return a[i];
			} else {
				return cloneObj(a[i]);
			}
		}
	}
	return false;
}

/* if the last parameter is a boolean it will be interpreted for the invert flag, which causes the order to be inverted */
function orderArrayByProperty(list, ...orderKey) {
	let invert = false;
	if (typeof(orderKey[orderKey.length-1]) === 'boolean') {
		invert = orderKey.pop();
	}
	list.sort(function (a, b) {
		let nameA;
		let nameB;
		if (typeof (a[orderKey]) === 'string' && typeof (b[orderKey]) === 'string') {
			nameA = fetchFromObjPath(a, orderKey).toLowerCase().replace(/<.*?>/g, '');
			nameB = fetchFromObjPath(b, orderKey).toLowerCase().replace(/<.*?>/g, '');
		} else {
			nameA = fetchFromObjPath(a, orderKey);
			nameB = fetchFromObjPath(b, orderKey);
		}
		if (nameA < nameB) //sort string ascending
			return invert ? 1 : -1;
		if (nameA > nameB)
			return invert ? -1 : 1;
		return 0; //default return value (no sorting)
	});
}

function shuffleArray(list) {
	list.sort(function (a, b) {
		const inta = Math.random();
		const intb = Math.random();
		if (inta < intb) //sort string ascending
			return -1;
		if (inta > intb)
			return 1;
		return 0; //default return value (no sorting)
	});
}

/*
 *  object manipulation
 */

//convert an object to a string for debugging
function objectToString(o, space) {
	if (typeof (o) !== 'object') return o;
	if (typeof (space) === 'undefined') space = "  ";
	let s = '';
	for (let i in o) {
		s = s + '\n' + space + i + ': ' + objectToString(o[i], space + '  ');
	}
	return s;
}

//return number of elements in an object
function objectLength(o) {
	return (Object.keys(o).length);
}

//return n'th key of object o
function getKey(o, n) {
	let i = 0;
	for (let k in o) {
		if (i === n) return k;
		i++;
	}
	return null;
}

//create a new copy of an object with no references to the old
//if keys is provided (array of strings), remove any keys from clone, which are not included in the keys array
//dependency: jQuery
function cloneObj(o, keys) {
	if (typeof (o) !== 'object') return false;
	if (Array.isArray(o)) return false;
	const clone = jQuery.extend(true, {}, o);
	if (typeof (keys) !== 'undefined') {
		for (let i in clone) {
			if (keys.indexOf(i) === -1) delete clone[i];
		}
	}
	return clone;
}

/*
	recursively checks the path of an object if all keys and subkeys exist and if not initializes them and sets the value
	example:
	let o = {};
	let x = initObj(o, ['a', 'b', 'c', 'd'], 77);
	The result is like this, however without destroying other existing keys or subkeys:
		o = {
			a: {
				b: {
					c: {
						d: 77
					}
				}
			}
		}
	initObj returns the existing value if the path already exists or the newly attributed one
 */
function initObj(variable, keys, value) {
	const k = keys.shift();
	if (typeof (variable[k]) === 'undefined') {
		if (keys.length > 0) {
			variable[k] = {};
		} else {
			variable[k] = value;
		}
	}
	if (keys.length > 0) {
		initObj(variable[k], keys, value);
	} else {
		return variable[k];
	}
}

/*
	fetches a value from an object by verifying every key and subkey for its existence first
	example:
		let o = {
			a: {
				b: {
					c: {
						d: 77
					}
				}
			}
		}

	fetchFromObjPath(o, ['a', 'b', 'c', 'd']) => returns 77
	fetchFromObjPath(o, ['a', 'b', 'x', 'd']) => returns null
 */
function fetchFromObjPath(variable, keys) {
	keys = deepCopy(keys);
	if (typeof (variable) !== 'object' || variable === null) {
		return null;
	}
	const k = keys.shift();
	if (typeof (variable[k]) === 'undefined') {
		return null;
	} else if (keys.length > 0) {
		return fetchFromObjPath(variable[k], keys);
	} else {
		return variable[k];
	}
}


/*
 	switch content of 2 keys of an object, resp. if newKey does not exist yet, just rename the key
 */
function switchKeys(data, newKey, oldKey) {
	if (typeof(data[newKey]) !== 'undefined') {
		//if both languages exist, switch the contents of the two
		let tmp = data[newKey];
		data[newKey] = data[oldKey];
		data[oldKey] = tmp;
	} else {
		//if newLang does not exist yet, just redefine the key
		data[newKey] = data[oldKey];
		delete data[oldKey];
	}
}


/*
 *	complex objects & arrays
 */

/*	This compares 2 variables if they are identical on all levels; the variables can be of simple types, objects or
	arrays. Objects and arrays can go multiple levels deep nesting other arrays and objects. Null is also treated
	properly even though typeof(null) === "object".
	N.B. maps are not currently supported */

function compareData(d1, d2) {
	if (d1 === d2) {
		return true;
	} else if (d1 === null || d2 === null) {
		return false;
	} else if (typeof(d1) !== typeof(d2)) {
		return false;
	} else if (Array.isArray(d1)) {
		if (!Array.isArray(d2)) {
			return false;
		} else if (d1.length !== d2.length) {
			return false;
		}
		for (let i in d1) {
			if (typeof (d1[i]) === 'object') {
				if (compareData(d1[i], d2[i]) === false) {
					return false;
				}
			} else if (d1[i] !== d2[i]) {
				return false;
			}
		}
		return true;
	} else if (typeof (d1) === 'object') {
		if (Object.keys(d1).length !== Object.keys(d2).length) {
			return false;
		}
		for (let i in d1) {
			if (typeof (d1[i]) === 'object') {
				if (compareData(d1[i], d2[i]) === false) {
					return false;
				}
			} else if (d1[i] !== d2[i]) {
				return false;
			}
		}
		return true;
	} else {
		return false;
	}
}

/*	this iterates objects and arrays down to the deepest level and creates copies for each level, so that no references
	are used anywhere in the data */
function deepCopy(d) {
	if (Array.isArray(d)) {
		let a = [];
		for (let i in d) {
			a[i] = deepCopy(d[i]);
		}
		return a;
	} else if (d === null) {
		/*	this is necessary because in javascript typeof(null) === 'object' which would convert any null value to
			{} in the next if clause */
		return null;
	} else if (typeof (d) === 'object') {
		let a = {};
		for (let i in d) {
			a[i] = deepCopy(d[i]);
		}
		return a;
	} else {
		return d;
	}
}


/*
 *  forms
 */

function hiddenForm(id, method, action, target, fields) {
	$('body').append(sf('<div style="display: none;"><form id="%@" method="%@" action="%@" target="%@"></form></div>', id, method, action, target));
	const form = $('#' + id);
	for (let i in fields) {
		form.append(sf('<input type="hidden" id="%@" name="%@">', fields[i], fields[i]));
	}
}


/*
 * String conversions
 */

//adds a trailing slash if there is none already
function addTrailingSlash(s) {
	return s.replace(/\/?$/, "/");
}

function encodeToHex(str) {
	const bytes = toUTF8Array(str);
	return bytes.map(function (v) {
		return v.toString(16)
	}).join('');
}

function toUTF8Array(str) {
	const utf8 = [];
	for (let i = 0; i < str.length; i++) {
		let charcode = str.charCodeAt(i);
		if (charcode < 0x80) utf8.push(charcode);
		else if (charcode < 0x800) {
			utf8.push(0xc0 | (charcode >> 6),
				0x80 | (charcode & 0x3f));
		} else if (charcode < 0xd800 || charcode >= 0xe000) {
			utf8.push(0xe0 | (charcode >> 12),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f));
		} else {
			i++;
			// surrogate pair
			// UTF-16 encodes 0x10000-0x10FFFF by
			// subtracting 0x10000 and splitting the
			// 20 bits of 0x0-0xFFFFF into two halves
			charcode = 0x10000 + (((charcode & 0x3ff) << 10)
				| (str.charCodeAt(i) & 0x3ff));
			utf8.push(0xf0 | (charcode >> 18),
				0x80 | ((charcode >> 12) & 0x3f),
				0x80 | ((charcode >> 6) & 0x3f),
				0x80 | (charcode & 0x3f));
		}
	}
	return utf8;
}

function decodeHex(hex) {
	const str = '';
	if (typeof (hex) !== "string") hex = hex.toString();
	return decodeURIComponent(hex.replace(/[0-9a-f]{2}/g, '%$&'));
}

function addSlashes(str) {
	str = str.replace(/(['"])/g, "\$1");
	return str;
}

function encodeQuotes(str) {
	str = str.replace(/'/g, "&apos;");
	str = str.replace(/"/g, "&quot;");
	return str;
}

function decodeQuotes(str) {
	str = str.replace(/&apos;/g, "'");
	str = str.replace(/&quot;/g, '"');
	return str;
}

function escapeForRegex(str) {
	return str.replace(/[!$()*+.\/:=?\[\\\]^{|}#%&,\-;<>@_~]/g, "\\$&");
}


/*
 * Cookie Handling
 */

function createCookie(name, value, days) {
	let expires;
	if (days) {
		const date = new Date();
		date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
		expires = "; expires=" + date.toGMTString();
	} else {
		expires = "";
	}
	document.cookie = name + "=" + value + expires + "; path=/";
}

function readCookie(name) {
	const nameEQ = name + "=";
	const ca = document.cookie.split(';');
	for (let i = 0; i < ca.length; i++) {
		let c = ca[i];
		while (c.charAt(0) === ' ') c = c.substring(1, c.length);
		if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
	}
	return null;
}

function eraseCookie(name) {
	createCookie(name, "", -1);
}


/*
 * GET parameters
 */

function getURLParam(strParamName) {
	let strReturn = "";
	const strHref = window.location.href;
	if (strHref.indexOf("?") > -1) {
		const strQueryString = strHref.substr(strHref.indexOf("?"));
		const aQueryString = strQueryString.split("&");
		for (let iParam = 0; iParam < aQueryString.length; iParam++) {
			if (aQueryString[iParam].indexOf(strParamName + "=") > -1) {
				const aParam = aQueryString[iParam].split("=");
				strReturn = aParam[1];
				break;
			}
		}
	}
	return decodeURIComponent(strReturn);
}


/*
	strings
 */

/*
	left pad a string
		s 	string to pad
		n	length of resulting string
		c	character to be used for padding, defaults to a space character
 */
function lpad(s, n, c) {
	if (typeof (c) === 'undefined') c = ' ';
	s = String(s);
	while (s.length < n) {
		s = c + s;
	}
	return s;
}

/*
 right pad a string
 s 	string to pad
 n	length of resulting string
 c	character to be used for padding, defaults to a space character
 */

function rpad(s, n, c) {
	if (typeof (c) === 'undefined') c = ' ';
	s = String(s);
	while (s.length < n) {
		s += c;
	}
	return s;
}


function loremIpsum(n, noParagraphs) {
	const lorem = ["Lorem ipsum, quia dolor sit, amet, consectetur, adipisci velit, sed quia non numquam eius modi tempora incidunt, ut labore et dolore magnam aliquam quaerat voluptatem. ut enim ad minima veniam, quis nostrum exercitationem ullam corporis suscipit laboriosam, nisi ut aliquid ex ea commodi consequatur? quis autem vel eum iure reprehenderit, qui in ea voluptate velit esse, quam nihil molestiae consequatur, vel illum, qui dolorem eum fugiat, quo voluptas nulla pariatur?",
		"At vero eos et accusamus et iusto odio dignissimos ducimus, qui blanditiis praesentium voluptatum deleniti atque corrupti, quos dolores et quas molestias excepturi sint, obcaecati cupiditate non provident, similique sunt in culpa, qui officia deserunt mollitia animi, id est laborum et dolorum fuga. et harum quidem rerum facilis est et expedita distinctio. nam libero tempore, cum soluta nobis est eligendi optio, cumque nihil impedit, quo minus id, quod maxime placeat, facere possimus, omnis voluptas assumenda est, omnis dolor repellendus. temporibus autem quibusdam et aut officiis debitis aut rerum necessitatibus saepe eveniet, ut et voluptates repudiandae sint et molestiae non recusandae. itaque earum rerum hic tenetur a sapiente delectus, ut aut reiciendis voluptatibus maiores alias consequatur aut perferendis doloribus asperiores repellat.",
		"Hanc ego cum teneam sententiam, quid est cur verear, ne ad eam non possim accommodare Torquatos nostros? quos tu paulo ante cum memoriter, tum etiam erga nos amice et benivole collegisti, nec me tamen laudandis maioribus meis corrupisti nec segniorem ad respondendum reddidisti. quorum facta quem ad modum, quaeso, interpretaris? sicine eos censes aut in armatum hostem impetum fecisse aut in liberos atque in sanguinem suum tam crudelis fuisse, nihil ut de utilitatibus, nihil ut de commodis suis cogitarent? at id ne ferae quidem faciunt, ut ita ruant itaque turbent, ut earum motus et impetus quo pertineant non intellegamus, tu tam egregios viros censes tantas res gessisse sine causa?",
		"Quae fuerit causa, mox videro; interea hoc tenebo, si ob aliquam causam ista, quae sine dubio praeclara sunt, fecerint, virtutem iis per se ipsam causam non fuisse. -- Torquem detraxit hosti. -- Et quidem se texit, ne interiret. -- At magnum periculum adiit. -- In oculis quidem exercitus. -- Quid ex eo est consecutus? -- Laudem et caritatem, quae sunt vitae sine metu degendae praesidia firmissima. -- Filium morte multavit. -- Si sine causa, nollem me ab eo ortum, tam inportuno tamque crudeli; sin, ut dolore suo sanciret militaris imperii disciplinam exercitumque in gravissimo bello animadversionis metu contineret, saluti prospexit civium, qua intellegebat contineri suam. atque haec ratio late patet.",
		"In quo enim maxime consuevit iactare vestra se oratio, tua praesertim, qui studiose antiqua persequeris, claris et fortibus viris commemorandis eorumque factis non emolumento aliquo, sed ipsius honestatis decore laudandis, id totum evertitur eo delectu rerum, quem modo dixi, constituto, ut aut voluptates omittantur maiorum voluptatum adipiscendarum causa aut dolores suscipiantur maiorum dolorum effugiendorum gratia.",
		"Sed de clarorum hominum factis illustribus et gloriosis satis hoc loco dictum sit. erit enim iam de omnium virtutum cursu ad voluptatem proprius disserendi locus. nunc autem explicabo, voluptas ipsa quae qualisque sit, ut tollatur error omnis imperitorum intellegaturque ea, quae voluptaria, delicata, mollis habeatur disciplina, quam gravis, quam continens, quam severa sit. Non enim hanc solam sequimur, quae suavitate aliqua naturam ipsam movet et cum iucunditate quadam percipitur sensibus, sed maximam voluptatem illam habemus, quae percipitur omni dolore detracto, nam quoniam, cum privamur dolore, ipsa liberatione et vacuitate omnis molestiae gaudemus, omne autem id, quo gaudemus, voluptas est, ut omne, quo offendimur, dolor, doloris omnis privatio recte nominata est voluptas. ut enim, cum cibo et potione fames sitisque depulsa est, ipsa detractio molestiae consecutionem affert voluptatis, sic in omni re doloris amotio successionem efficit voluptatis.",
		"Itaque non placuit Epicuro medium esse quiddam inter dolorem et voluptatem; illud enim ipsum, quod quibusdam medium videretur, cum omni dolore careret, non modo voluptatem esse, verum etiam summam voluptatem. quisquis enim sentit, quem ad modum sit affectus, eum necesse est aut in voluptate esse aut in dolore. omnis autem privatione doloris putat Epicurus terminari summam voluptatem, ut postea variari voluptas distinguique possit, augeri amplificarique non possit.",
		"At etiam Athenis, ut e patre audiebam facete et urbane Stoicos irridente, statua est in Ceramico Chrysippi sedentis porrecta manu, quae manus significet illum in hae esse rogatiuncula delectatum: 'Numquidnam manus tua sic affecta, quem ad modum affecta nunc est, desiderat?' -- Nihil sane. -- 'At, si voluptas esset bonum, desideraret.' -- Ita credo. -- 'Non est igitur voluptas bonum.' Hoc ne statuam quidem dicturam pater aiebat, si loqui posset. conclusum est enim contra Cyrenaicos satis acute, nihil ad Epicurum. nam si ea sola voluptas esset, quae quasi titillaret sensus, ut ita dicam, et ad eos cum suavitate afflueret et illaberetur, nec manus esse contenta posset nec ulla pars vacuitate doloris sine iucundo motu voluptatis. sin autem summa voluptas est, ut Epicuro placet, nihil dolere, primum tibi recte, Chrysippe, concessum est nihil desiderare manum, cum ita esset affecta, secundum non recte, si voluptas esset bonum, fuisse desideraturam. idcirco enim non desideraret, quia, quod dolore caret, id in voluptate est.",
		"Extremum autem esse bonorum voluptatem ex hoc facillime perspici potest: Constituamus aliquem magnis, multis, perpetuis fruentem et animo et corpore voluptatibus nullo dolore nec impediente nec inpendente, quem tandem hoc statu praestabiliorem aut magis expetendum possimus dicere? inesse enim necesse est in eo, qui ita sit affectus, et firmitatem animi nec mortem nec dolorem timentis, quod mors sensu careat, dolor in longinquitate levis, in gravitate brevis soleat esse, ut eius magnitudinem celeritas, diuturnitatem allevatio consoletur.",
		"Ad ea cum accedit, ut neque divinum numen horreat nec praeteritas voluptates effluere patiatur earumque assidua recordatione laetetur, quid est, quod huc possit, quod melius sit, accedere? Statue contra aliquem confectum tantis animi corporisque doloribus, quanti in hominem maximi cadere possunt, nulla spe proposita fore levius aliquando, nulla praeterea neque praesenti nec expectata voluptate, quid eo miserius dici aut fingi potest? quodsi vita doloribus referta maxime fugienda est, summum profecto malum est vivere cum dolore, cui sententiae consentaneum est ultimum esse bonorum eum voluptate vivere. nec enim habet nostra mens quicquam, ubi consistat tamquam in extremo, omnesque et metus et aegritudines ad dolorem referuntur, nec praeterea est res ulla, quae sua natura aut sollicitare possit aut angere.",
		"Praeterea et appetendi et refugiendi et omnino rerum gerendarum initia proficiscuntur aut a voluptate aut a dolore. quod cum ita sit, perspicuum est omnis rectas res atque laudabilis eo referri, ut cum voluptate vivatur. quoniam autem id est vel summum bonorum vel ultimum vel extremum -- quod Graeci telos nominant --, quod ipsum nullam ad aliam rem, ad id autem res referuntur omnes, fatendum est summum esse bonum iucunde vivere.",
		"Id qui in una virtute ponunt et splendore nominis capti quid natura postulet non intellegunt, errore maximo, si Epicurum audire voluerint, liberabuntur: istae enim vestrae eximiae pulchraeque virtutes nisi voluptatem efficerent, quis eas aut laudabilis aut expetendas arbitraretur? ut enim medicorum scientiam non ipsius artis, sed bonae valetudinis causa probamus, et gubernatoris ars, quia bene navigandi rationem habet, utilitate, non arte laudatur, sic sapientia, quae ars vivendi putanda est, non expeteretur, si nihil efficeret; nunc expetitur, quod est tamquam artifex conquirendae et comparandae voluptatis --",
		"Quam autem ego dicam voluptatem, iam videtis, ne invidia verbi labefactetur oratio mea --. nam cum ignoratione rerum bonarum et malarum maxime hominum vita vexetur, ob eumque errorem et voluptatibus maximis saepe priventur et durissimis animi doloribus torqueantur, sapientia est adhibenda, quae et terroribus cupiditatibusque detractis et omnium falsarum opinionum temeritate derepta certissimam se nobis ducem praebeat ad voluptatem. sapientia enim est una, quae maestitiam pellat ex animis, quae nos exhorrescere metu non sinat. qua praeceptrice in tranquillitate vivi potest omnium cupiditatum ardore restincto. cupiditates enim sunt insatiabiles, quae non modo singulos homines, sed universas familias evertunt, totam etiam labefactant saepe rem publicam.",
		"Ex cupiditatibus odia, discidia, discordiae, seditiones, bella nascuntur, nec eae se foris solum iactant nec tantum in alios caeco impetu incurrunt, sed intus etiam in animis inclusae inter se dissident atque discordant, ex quo vitam amarissimam necesse est effici, ut sapiens solum amputata circumcisaque inanitate omni et errore naturae finibus contentus sine aegritudine possit et sine metu vivere.",
		"Quae est enim aut utilior aut ad bene vivendum aptior partitio quam illa, qua est usus Epicurus? qui unum genus posuit earum cupiditatum, quae essent et naturales et necessariae, alterum, quae naturales essent nec tamen necessariae, tertium, quae nec naturales nec necessariae. quarum ea ratio est, ut necessariae nec opera multa nec impensa expleantur; ne naturales quidem multa desiderant, propterea quod ipsa natura divitias, quibus contenta sit, et parabilis et terminatas habet; inanium autem cupiditatum nec modus ullus nec finis inveniri potest.",
		"Quodsi vitam omnem perturbari videmus errore et inscientia, sapientiamque esse solam, quae nos a libidinum impetu et a formidinum terrore vindicet et ipsius fortunae modice ferre doceat iniurias et omnis monstret vias, quae ad quietem et ad tranquillitatem ferant, quid est cur dubitemus dicere et sapientiam propter voluptates expetendam et insipientiam propter molestias esse fugiendam?"];
	let output = "";
	if (n > lorem.length) n = lorem.length;
	for (let i = 0; i < n; i++) {
		if (noParagraphs) {
			output += lorem[i] + "\n\n";
		} else {
			output += sf("<p>%@</p>\n", lorem[i]);
		}
	}
	return output;
}


/* convert a semicolon separated css string to a javaScript object for use with jQuery */
function CSS2Object(s) {
	if (!s) return {};
	const rules = s.split(/\s*;\s*/);
	const styles = {};
	for (let i in rules) {
		const captures = rules[i].match(/^(.*?)\s*:\s*(.*?)\s*$/);
		if (captures && captures[1] && captures[2]) {
			styles[captures[1]] = captures[2];
		}
	}
	return styles;
}


/* add an empty style tag into the head and return it as element */
function addStylesheet() {
	const style = document.createElement('style');
	document.getElementsByTagName('head')[0].appendChild(style);
	return document.styleSheets[document.styleSheets.length - 1];
}


/* add stylesheet rules to a style element */
function addStylesheetRules(stylesheet, rules) {
	for (let selector in rules) {
		stylesheet.insertRule(selector + '{' + rules[selector] + '}', stylesheet.cssRules.length);
	}

}

/* add stylesheet rules to a style element from an array of objects */
function addStylesheetRulesArray(stylesheet, cssArray, selectorKey, rulesKey) {
	for (let i in cssArray) {
		const selector = cssArray[i][selectorKey];
		const rules = cssArray[i][rulesKey];
		stylesheet.insertRule(selector + '{' + rules + '}', stylesheet.cssRules.length);
	}
}

function htmlEntities(str) {
	return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/* Used for input validation in all managers */
(function ($) {
	$.fn.inputFilter = function (inputFilter) {
		return this.on("input keydown keyup mousedown mouseup select contextmenu drop", function () {
			if (inputFilter(this.value)) {
				this.oldValue = this.value;
				this.oldSelectionStart = this.selectionStart;
				this.oldSelectionEnd = this.selectionEnd;
			} else if (this.hasOwnProperty("oldValue")) {
				this.value = this.oldValue;
				this.setSelectionRange(this.oldSelectionStart, this.oldSelectionEnd);
			}
		});
	};
}(jQuery));