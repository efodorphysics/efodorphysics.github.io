/*
 nxDialog, v1.44

 dependencies: jQuery, jQueryUI, nxButton

 Example of usage:

 ----------------------------
$().ready(onDomReady);

function onDomReady() {
    var buttonData = {
        label: 'Click Me!',
        callback: function (e) {
            buttonClicked('param1', 'param2');
        }
    }
    new nxButton($('#buttonHolder'), 'clickMeButton', buttonData);
}

function buttonClicked(p1, p2, button, name) {
    if (!button) {
        var dialogData = {
            buttons: [
                {label: 'Cancel', 'cancel': true, value: 'cancel'},
                {label: 'OK', 'default': true, value: 'ok'}
            ],
            datafields: [
                'tfName'
            ],
            mandatory: [
                'tfName'
            ],
            focus: 'tfName',
            values: {
                tfName: 'Enter your name here'
            },
            contents: '<p>Who do you want to greet?<br><input type="text" id="tfName" style="width: 100%; margin-top: 10px;"></p>',
            title: 'Hello world',
            width: 400,
            callback: buttonClicked
        };
        new nxDialog('hwDialog', dialogData, arguments);
    }
    if (button === 'ok') {
        //in this example we use the nxDialog only as alert, and don't specify any other options than the contents
        new nxDialog('alertDialog', {contents: 'Hello ' + name + '!'});
        //the original parameters p1 and p2 are still available here!
    }
}
------------------------------

Example of a simple error message:

var dialogData = {
    buttons: [
        {label: 'OK', 'default': true, cancel: true, value: 'ok'}
    ],
    contents: errorText,
    title: errorTitle,
    width: 600,
    'z-index': 50
};
new nxDialog('error', dialogData);

 ------------------------------

 NOTE: if you want to use an existing HTML element as contents, rather than an HTML string, you can specify the id of said elements as such:

 var dialogData = {
    [...]
    contentId: 'dialogContentDiv'
 }

 if the attribute 'contentId' is specified, the attribute 'contents' will be ignored

*/

"use strict";

(function ($) {

	//constructor
	function nxDialog(id, data, originalParameters) {
		if (typeof (nxButton) === 'undefined') {
			alert('Dependency missing: nxButton');
			return;
		}
		var i;
		var original_id = id;
		var idCounter = 1;
		while ($('#' + id).length > 0) {
			id = original_id + "_" + idCounter++;
		}
		var buttons = data.buttons || [{label: 'OK', 'default': true, value: 1}];
		var contentId = '';
		var contents;
		if (data.contentId) {
			contentId = data.contentId;
		} else {
			contents = data.contents || '';
		}
		var title = data.title || '';
		var callback = data.callback || null;
		var datafields = data.datafields || [];
		var mandatory = data.mandatory || [];
		var blackList = data.blackList || {};
		var blackListLogic = data.blackListLogic || "and"; //default is "and" => all fields that have a blacklist need to fulfill requirements for OK button to light up
		blackListLogic = blackListLogic.toLowerCase();
		if (blackListLogic !== "or" && blackListLogic !== "and") blackListLogic = "and";
		var values = data.values || {};
		var dataFormat = data.dataFormat;
		if (dataFormat !== 'object') dataFormat = 'parameters'; //defines if the values of inputfields are added as parameters during callback or as a single object containing the data
		var fieldTypes = data.fieldTypes || {};
		var fieldOptions = data.fieldOptions || {};
		var fieldInstances = {};
		var icon = data.icon || false;
		var iconWidth = data.iconWidth || false;
		var iconHeight = data.iconHeight || false;
		var zIndex = data['z-index'] || 100;
		if (typeof (iconWidth) === 'number') iconWidth += 'px';
		if (typeof (iconHeight) === 'number') iconHeight += 'px';
		var touchDevice = data.touchDevice || false;
		$('body').append(sf('<div id="veil_%@" class="nxDialogVeil"><div id="%@" class="nxDialog"><div class="nxDialogTitle">%@</div><div class="nxDialogBody"></div><div class="nxDialogButtons"></div></div></div>', id, id, title));
		var veil = $('#veil_' + id);
		veil.css("z-index", zIndex);
		var box = $('#' + id);
		if (contentId !== '') {
			box.find('.nxDialogBody').append($('#' + contentId));
			box.find('.nxDialogBody > *').show();
		} else {

			//replace extended input field keywords with container elements
			for (i in fieldTypes) {
				var rxString = escapeForRegex(sf('\[\@%@\]', i));
				var rx = new RegExp(rxString, 'i');
				contents = contents.replace(rx, sf('<span id="%@_%@"></span>', id, i));
			}

			//insert content
			box.find('.nxDialogBody').append(contents);

			//insert icon
			if (icon) {
				if (typeof (icon) === 'string') {
					box.find('.nxDialogBody').prepend(sf("<img src='%@' class='nxDialogIcon'>", icon));
					if (iconWidth) box.find('.nxDialogIcon').css('width', iconWidth);
					if (iconHeight) box.find('.nxDialogIcon').css('height', iconHeight);
				} else if (icon instanceof HTMLImageElement) {
					$(icon).addClass('nxDialogIcon');
					box.find('.nxDialogBody').prepend(icon);
					if (iconWidth) box.find('.nxDialogIcon').css('width', iconWidth);
					if (iconHeight) box.find('.nxDialogIcon').css('height', iconHeight);
				}
			}

			//insert extended fields into container elements
			for (i in fieldTypes) {
				var container = box.find(sf('#%@_%@', id, i));
				switch (fieldTypes[i]) {
					case 'dropList':
						fieldOptions[i].onChange = function() {fieldInput()};
						fieldInstances[i] = new jsDropList(container, sf('%@_%@_dropList', id, i), fieldOptions[i]);
						break;
					case 'numberInput':
						fieldInstances[i] = new jsNumberInput(container, sf('%@_%@_numberInput', id, i), fieldOptions[i]);
						break;
				}
			}

		}
		for (i in values) {
			$('#' + i).val(values[i]);
		}

		var width = data.width || 400;
		if (screen.width < width) {
			width = screen.width - 20;
		}
		var leftMargin = -Math.ceil(width / 2);
		box.css({
			width: width + 'px',
			position: 'absolute',
			top: '50%',
			left: '50%',
			'margin-left': leftMargin + 'px',
			overflow: 'auto'
		});
		var height = box.outerHeight();
		var topMargin = -Math.ceil(height / 2) - 10;
		box.css({
			'margin-top': topMargin + 'px'
		});
		box.click(stopBubble);
		var buttonStrip = $('#' + id + ' .nxDialogButtons');
		var keyEvents = {};
		var buttonInstances = {};
		var buttonOptions = {};
		buttons.forEach(function (button, i) {
			buttonOptions[button.value] = {};
			var buttonData = {
				label: button.label,
				callback: dismiss,
				touchDevice: touchDevice,
				disabled: button.disabled || false,
				value: button.value
			};
			if (button['default']) {
				keyEvents['default'] = button.value;
				buttonData['default'] = true;
			}
			if (button['cancel']) {
				keyEvents['cancel'] = button.value;
			}
			if (button['keepOpen']) {
				buttonOptions[button.value].keepOpen = true;
			}
			buttonInstances[button.value] = new nxButton(buttonStrip, id + '_button_' + i, buttonData);
		});

		box.draggable({handle: ".nxDialogTitle"});
		if (data.focus) {
			$('#' + data.focus).focus();
		}
		var previousDialog = window.nxDialogTopMost || null;	//necessary to remember which was top most dialog before opening this one
		window.nxDialogTopMost = id;
		$(document).on('keydown.' + id, keydown);
		$(document).on('keyup.' + id, keyup);
		box.find("input, textarea").on({
			'keydown.nxDialogFields': fieldsKeyboard,
			'keyup.nxDialogFields': fieldsKeyboard,
			'input.nxDialogFields': fieldInput
		});
		box.find("select").on({
			'change.nxDialogFields': fieldInput
		});
		fieldInput(null, true);

		function refreshInputEvents() {
			box.find("input, textarea").off('keydown.nxDialogFields');
			box.find("input, textarea").off('keyup.nxDialogFields');
			box.find("input, textarea").off('input.nxDialogFields');
			box.find("select").off('change.nxDialogFields');
			box.find("input, textarea").on({
				'keydown.nxDialogFields': fieldsKeyboard,
				'keyup.nxDialogFields': fieldsKeyboard,
				'input.nxDialogFields': fieldInput
			});
			box.find("select").on({
				'change.nxDialogFields': fieldInput
			});
			fieldInput(null, true);
		}

		function fieldInput(e, init) {
			if (!keyEvents['default']) return;
			var emptyCheck = mandatory.every(function (field, index, array) {
				var v;
				if (!fieldTypes[field]) {
					v = $('#' + field).val();
				} else {
					switch (fieldTypes[field]) {
						case 'dropList':
						case 'numberInput':
							v = fieldInstances[field].getValue();
							break;
					}
				}
				if (!v) return false;
				return (!v.match(/^\s*$/));
			});
			if (blackListLogic === "and") {
				var contentCheck = true;
				for (var i in blackList) {
					var row = blackList[i];
					var v = $('#' + i).val();
					if (row.indexOf(v) !== -1) {
						contentCheck = false;
					}
				}
			} else if (blackListLogic === "or") {
				var contentCheck = false;
				for (var i in blackList) {
					var row = blackList[i];
					var v = $('#' + i).val();
					if (row.indexOf(v) === -1) {
						contentCheck = true;
					}
				}
			}
			if (emptyCheck && contentCheck) {
				if (!init) buttonInstances[keyEvents['default']].enable();
			} else {
				buttonInstances[keyEvents['default']].disable();
			}
		}

		function fieldsKeyboard(e) {
			//if an inputfield inside the dialog gets a keyboard event, stop propagation if it's not the RETURN or ESCAPE key (which are needed for the buttons)
			if (e.which !== 0x1B && e.which !== 0x0D) {
				e.stopPropagation();
			} else if (e.which === 0x0D) {
				//for textareas that need the return key, that event needs to be blocked from propagation as well
				if (e.currentTarget.tagName === 'TEXTAREA') {
					e.stopPropagation();
				}
			}
		}

		function keydown(e) {
			if (id !== window.nxDialogTopMost) return;
			window.nxDialogKeyDown = id;
			if (e.which === 0x0D && keyEvents['default']) {
				buttonInstances[keyEvents['default']].keydown(e);
			}
			if (e.which === 0x1B && keyEvents['cancel']) {
				buttonInstances[keyEvents['cancel']].keydown(e);
			}
			e.stopImmediatePropagation();
			var target = $('*:focus');
			if (target.length === 0) {
				e.preventDefault();	//if no element has focus (no text field or text area needs input), prevent default keyboard action
			} else if (veil.find(target).length === 0) {
				e.preventDefault();	//if an element does have focus, but it's outside of the scope of our dialog, also prevent default keyboard action => you should not be able to type in a field behind the dialog
			}
		}

		function keyup(e) {
			if (id !== window.nxDialogTopMost) return;
			if (id !== window.nxDialogKeyDown) {
				//if the dialog popped up only after keydown event, ignore the keyup event
				delete window.nxDialogKeyDown;
				return;
			}
			if (e.which === 0x0D && keyEvents['default']) {
				buttonInstances[keyEvents['default']].keyup(e);
			}
			if (e.which === 0x1B && keyEvents['cancel']) {
				buttonInstances[keyEvents['cancel']].keyup(e);
			}
			delete window.nxDialogKeyDown;
			e.stopImmediatePropagation();
			e.preventDefault();
		}

		function dismiss(sender) {
			if (!sender) sender = 'dummy';
			if (callback) {
				values = [];
				var valuesObj = {};
				var value;
				datafields.forEach(function (field, i) {
					if (!fieldTypes[field]) {
						value = $('#' + field).val();
						values.push(value);
						valuesObj[field] = value;
					} else {
						switch (fieldTypes[field]) {
							case 'dropList':
							case 'numberInput':
								value = fieldInstances[field].getValue();
								values.push(value);
								valuesObj[field] = value;
								break;
						}
					}
				});
				var parameters = [];
				for (i in originalParameters) {
					parameters.push(originalParameters[i]);
				}
				parameters.push(sender);
				if (dataFormat === 'object') {
					parameters.push(valuesObj);
				} else {
					for (var i in values) {
						parameters.push(values[i]);
					}
				}
				callback.apply(this, parameters);
			}
			if (sender === 'dummy' || buttonOptions[sender].keepOpen !== true) {
				window.nxDialogTopMost = previousDialog;
				$(document).off('keydown.' + id);
				$(document).off('keyup.' + id);
				box.find("input, textarea").off('keydown.nxDialogFields');
				box.find("input, textarea").off('keyup.nxDialogFields');
				box.find("input, textarea").off('input.nxDialogFields');
				box.find("select").off('change.nxDialogFields');
				veil.remove();
			}

		}

		function disableButton(v) {
			if (v in buttonInstances) buttonInstances[v].disable();
		}

		function enableButton(v) {
			if (v in buttonInstances) buttonInstances[v].enable();
		}

		function stopBubble(e) {
			e.stopImmediatePropagation();
		}

		function sf(s) {
			for (var i = 1; i < arguments.length; i++) {
				s = s.replace(/%@/, arguments[i]);
			}
			return s;
		}

		this.dismiss = dismiss;
		this.disableButton = disableButton;
		this.enableButton = enableButton;
		this.refreshInputEvents = refreshInputEvents;

		return this;
	}

	window.nxDialog = nxDialog;

})(jQuery);
