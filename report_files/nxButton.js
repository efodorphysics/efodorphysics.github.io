"use strict";

/*
 nxButton v3.07

 Depencies:
 jQuery 1.7 or newer


 Usage:

 var buttonData = {
 	label: <string>,
 	callback: <function>,
 	value: <string>,
 	style: <map>
 };
 var b1 = new nxButton(parent, id, buttonData);

 parent:		jQuery object to contain the new button
 id:			string of the id the button should receive

 data:
 label:			string of text to show on button
 callback:		the function to call when button is clicked
 value:			a custom string to send back on activation; necessary to identify the sender if more than one button uses the same handler
 params:		array of custom parameters to send back on click (value will not be sent if params is used)
 style:			a javascript object (map) that identifies custom css style
 icon:			url to image file to be used as icon (if label and icon are defined, the icon will show left of the label and if no label is defined, the icon will be the entire button)
 symbol:        id of an svg symbol to use as icon. The symbol must be defined in the DOM. This replaces the icon
 iconHeight:	height of the icon (a number will be interpreted as pixels, a string will be used as CSS string)
 iconWidth:		width of the icon (a number will be interpreted as pixels, a string will be used as CSS string)
 iconPosition: 'left' or 'right' => applicabale only if a button has both icon and label
 overlay:		an object that may contain the properties left, right, top and bottom (as number of pixels or CSS string)
 				if overlay is defined, the button will be positioned absolutely with the respective changes to the default position
 states:		an array of objects with properties label, icon and either value or params
 toggle:		if TRUE and states are defined, the button will cycle through these states at every click (usually 2 states as toggle button)
 state:			number that indicates at which state the button is at creation time
 disabled:		true if button starts in disabled mode
 default:		boolean that decides if the buttons gets a special look as default button (this is purely cosmetic, keyboard must be handled separately)

 */

(function ($) {

	var debugMode = false;

	function nxButton(parent, id, data) {
		if (typeof(parent) === 'string') {
			parent = $('#' + parent);
		}
		var label = data.label || "";
		var icon = data.icon || false;
		if (typeof(data.symbol) === 'string') {
			icon = sf('<svg><use xlink:href="#%@"></use></svg>', data.symbol);
		}
		var hoverIcon = data.hoverIcon || icon;
		if (typeof(data.hoverSymbol) === 'string') {
			icon = sf('<svg><use xlink:href="#%@"></use></svg>', data.hoverSymbol);
		}
		var selectedIcon = data.selectedIcon || icon;
		if (typeof(data.selectedSymbol) === 'string') {
			icon = sf('<svg><use xlink:href="#%@"></use></svg>', data.selectedSymbol);
		}
		var iconHeight = data.iconHeight || false;
		if (typeof(iconHeight) === 'number') {
			iconHeight += 'px';
		}
		var iconWidth = data.iconWidth || false;
		if (typeof(iconWidth) === 'number') {
			iconWidth += 'px';
		}
		var iconPosition = data.iconPosition || 'left';
		if (iconPosition !== 'left' && iconPosition !== 'right') {
			iconPosition = 'left;'
		}
		var callback = data.callback || null;
		var callBackParams = data.params || null;
		var style = data.style || null;
		var frameStyle = data.frameStyle || null;
		var tooltip = data.tooltip || false;
		var value = data.value;
		if (typeof (data.value) === 'undefined') value = null;
		var selected = data.selected || false;
		var disabled = data.disabled || false;
		var overlay = data.overlay || false;
		var toggle = data.toggle || false;
		var states = data.states || [];
		var theme = "theme_" + (data.theme || 'default');
		var svgLayer = data.svgLayer || "";
		var statesIndex = {};
		var mode = 0; //0 = label only, 1 = small icon & label, 2 = big icon without label
		var timer; //timer for tooltip

		/* if no states are defined, let's define one from the global variables */
		if (states.length === 0) {
			states.push({
				'icon': icon,
				'hoverIcon': hoverIcon,
				'selectedIcon': selectedIcon,
				'label': label,
				'value': value,
				'params': callBackParams
			});
			statesIndex['value'] = 0;
			if (icon) {
				if (label !== '') {
					mode = 1;
				} else {
					mode = 2;
				}
			}
		} else {
			/* fill in properties of every state, that may have been given globally if they remain unchanged no matter the state */
			var labelsPresent = true;
			var iconsPresent = true;
			for (var i in states) {
				if (typeof(states[i].icon) === 'undefined') states[i].icon = icon;
				if (typeof(states[i].symbol) === 'string') states[i].icon = sf('<svg><use xlink:href="#%@"></use></svg>', states[i].symbol);
				if (typeof(states[i].hoverIcon) === 'undefined') states[i].hoverIcon = hoverIcon || states[i].icon;
				if (typeof(states[i].hoverSymbol) === 'string') states[i].hoverIcon = sf('<svg><use xlink:href="#%@"></use></svg>', states[i].hoverSymbol);
				if (typeof(states[i].selectedIcon) === 'undefined') states[i].selectedIcon = selectedIcon || states[i].icon;
				if (typeof(states[i].selectedSymbol) === 'string') states[i].selectedIcon = sf('<svg><use xlink:href="#%@"></use></svg>', states[i].selectedSymbol);
				if (typeof(states[i].label) === 'undefined') states[i].label = label;
				if (typeof(states[i].value) === 'undefined') states[i].value = value;
				if (typeof(states[i].params) === 'undefined') states[i].params = callBackParams;
				statesIndex[states[i].value] = i; //builds an index to find the right state for a certain value
				if (states[i].icon === false) iconsPresent = false;
				if (states[i].label === '') labelsPresent = false;
			}
			if (iconsPresent) {
				if (labelsPresent) {
					mode = 1;
				} else {
					mode = 2;
				}
			}
		}
		var state = 0;
		if (statesIndex[data.state]) {
			state = statesIndex[data.state];
		} else if (typeof(data.state) === 'number') {
			state = data.state;
		}

		/* preload icons for all states */
		for (var i in states) {
			if (mode > 0) {
				if (/^<svg/i.test(states[i].icon)) {
					//if source is an SVG file it must be handled differently than a bitmap image
					states[i].image = $.parseHTML(states[i].icon);
					$(states[i].image).attr('id', 'icon_' + id);
					states[i].imageType = 'svg';
					if (typeof(iconHeight) === 'string') $(states[i].image).css('height', iconHeight);
					if (typeof(iconWidth) === 'string') $(states[i].image).css('width', iconWidth);
					$(states[i].image).addClass('nxButtonIcon');
					if (mode === 1) {
						$(states[i].image).addClass('nxButtonSmallIcon');
					} else {
						$(states[i].image).addClass('nxButtonBigIcon');
					}
				} else {
					//if source is not SVG we'll simply preload the bitmap images
					states[i].imageType = 'bitmap';
					states[i].image = new Image();
					states[i].image.src = states[i].icon;
					states[i].image.id = 'icon_' + id;
					if (typeof(iconHeight) === 'string') $(states[i].image).css('height', iconHeight);
					if (typeof(iconWidth) === 'string') $(states[i].image).css('width', iconWidth);
					$(states[i].image).addClass('nxButtonIcon');
					if (mode === 1) {
						$(states[i].image).addClass('nxButtonSmallIcon');
					} else {
						$(states[i].image).addClass('nxButtonBigIcon');
					}

					if (states[i].hoverIcon === states[i].icon) {
						states[i].hoverImage = null;
					} else {
						states[i].hoverImage = new Image();
						states[i].hoverImage.src = states[i].hoverIcon;
						states[i].hoverImage.id = 'hoverIcon_' + id;
						if (typeof(iconHeight) === 'string') $(states[i].hoverImage).css('height', iconHeight);
						if (typeof(iconWidth) === 'string') $(states[i].hoverImage).css('width', iconWidth);
						$(states[i].hoverImage).addClass('nxButtonHoverIcon');
						if (mode === 1) {
							$(states[i].hoverImage).addClass('nxButtonSmallIcon');
						} else {
							$(states[i].hoverImage).addClass('nxButtonBigIcon');
						}
					}

					if (states[i].selectedIcon === states[i].icon) {
						states[i].selectedImage = null;
					} else {
						states[i].selectedImage = new Image();
						states[i].selectedImage.src = states[i].selectedIcon;
						states[i].selectedImage.id = 'selectedIcon_' + id;
						if (typeof(iconHeight) === 'string') $(states[i].selectedImage).css('height', iconHeight);
						if (typeof(iconWidth) === 'string') $(states[i].selectedImage).css('width', iconWidth);
						$(states[i].selectedImage).addClass('nxButtonSelectedIcon');
						if (mode === 1) {
							$(states[i].selectedImage).addClass('nxButtonSmallIcon');
						} else {
							$(states[i].selectedImage).addClass('nxButtonBigIcon');
						}
					}

				}
			} else {
				states[i].imageType = 'none';
				states[i].image = null;
				states[i].selectedImage = null;
			}
		}

		var tooltipHTML = '';
		if (tooltip) {
			tooltipHTML = sf("<div id='tooltip_%@' class='nxButtonTooltip' style='display: none;'><div class='nxButtonTooltipPointFrame'><div class='nxButtonTooltipPoint'></div></div>%@</div>", id, tooltip);
		}
		var svgLayerHTML = "";
		if (svgLayer) {
			svgLayerHTML = sf("<div id='svgLayer_%@' class='nxButtonSVGLayer'>%@</div>", id, svgLayer);
		}
		$('body').append(tooltipHTML);
		var html = sf("<div id='background_%@' class='nxButtonBackground'>%@<div id='%@' class='nxButton'></div></div></div>", id, svgLayerHTML, id);
		parent.append(html);
		var button = $('#' + id);
		var tooltipElement = $('#tooltip_' + id);
		var background = $('#background_' + id);
		if (mode === 2) {
			background.addClass('nxButtonIconOnly');
			button.addClass('nxButtonIconOnly');
		}
		background.addClass(theme);
		button.addClass(theme);

		/* prevent contextmenu event on button to bubble */
		button.on('contextmenu',function (e) {
			e.stopPropagation();
			e.preventDefault();
		});

		updateState();

		if (style) {
			button.css(style);
		}
		if (frameStyle) {
			background.css(frameStyle);
		}
		if (overlay) {
			background.addClass('nxButtonOverlay');
			setPosition(overlay);
		}

		var pointerHandler = new jsPointerHandler();

		pointerHandler.listen(button, {
			callbacks: {
				down: mousedown,
				up: mouseup,
				over: buttonEnter,
				leave: buttonLeave,
				out: mouseout
			},
			hoverClass: 'nxButtonHovered',
			pressClass: 'nxButtonPressed',
			activeClass: 'nxButtonActive'
		});

		if (data['default']) {
			button.addClass('defaultButton');
			button.parent().addClass('defaultButton');
		}
		var active = false;
		if (selected) buttonSelected(true);
		if (disabled) disable();

		function showTooltip() {
			tooltipElement.show();
			var ttWidth = tooltipElement.outerWidth();
			var offset = button.offset();
			var w = button.outerWidth();
			var h = button.outerHeight();
			tooltipElement.css({
				'margin-left': -(ttWidth / 2) + 'px',
				top: (offset.top + h) + 'px',
				left: (offset.left + w / 2) + 'px'
			});
		}

		function buttonEnter(e) {
			debug('buttonenter');
			if (selected || disabled) return;
			if (tooltip) {
				clearTimeout(timer);
				timer = setTimeout(showTooltip, 300);
			}
		}

		function buttonLeave() {
			debug('buttonleave');
			if (selected || disabled) return;
			if (tooltip) {
				clearTimeout(timer);
				timer = null;
				tooltipElement.hide();
			}
		}

		function mousedown(e) {
			debug('mousedown');
			if (selected || disabled) return;
			active = true;
		}

		function mouseup(e) {
			if (active && callback) {
				if (callBackParams === null) {
					if (typeof(value) === 'function') {
						callback.call(this, value.call(this));
					} else {
						callback.call(this, value);
					}
				} else {
					callback.apply(this, callBackParams);
				}
			}
			active = false;
			if (toggle) state++;
			updateState();
		}

		function mouseout(e) {
			active = false;
		}

		function buttonSelected(newState) {
			debug('buttonSelected');
			selected = newState;
			if (selected) {
				pointerHandler.pause(button);
				active = false;
				button.addClass('nxButtonSelected');

				// in this case we need to clear the classes manually to prevent a graphic glitch as the
				// jsPointerHandler is paused while the classes exist already
				button.removeClass('nxButtonHovered');
				button.removeClass('nxButtonPressed');
				button.removeClass('nxButtonActive');
			} else {
				pointerHandler.resume(button);
				button.removeClass('nxButtonSelected');
			}
			updateState();
		}

		function disable() {
			disabled = true;
			button.addClass('nxButtonDisabled');
			pointerHandler.pause(button);
		}

		function enable() {
			disabled = false;
			button.removeClass('nxButtonDisabled');
			pointerHandler.resume(button);
		}

		function hide(reserveSpace) {
			if (!reserveSpace) {
				background.hide();
			} else {
				background.css('visibility', 'hidden');
			}
		}

		function show() {
			background.show();
			background.css('visibility', 'visible');
		}

		function setPosition(position) {
			if (typeof(position.left) === 'number') position.left += 'px';
			if (typeof(position.left) === 'string') background.css('left', position.left);
			if (typeof(position.right) === 'number') position.right += 'px';
			if (typeof(position.right) === 'string') background.css('right', position.right);
			if (typeof(position.top) === 'number') position.top += 'px';
			if (typeof(position.top) === 'string') background.css('top', position.top);
			if (typeof(position.bottom) === 'number') position.bottom += 'px';
			if (typeof(position.bottom) === 'string') background.css('bottom', position.bottom);
		}

		function setState(v) {
			if (typeof(statesIndex[v]) === 'undefined') {
				console.warn(sf('nxButton with id "%@": setState(%@) failed, unkown state!', id, v));
				return;
			}
			state = statesIndex[v];
			updateState();
		}

		function updateState() {
			if (state >= states.length) state = state % states.length;

			//copy properties of new state to global variables
			callBackParams = states[state].params;
			value = states[state].value;

			//update the look of the button
			button.html('');

			if (mode < 2 && iconPosition === 'right') {
				button.append('<span>' + states[state].label + '</span>');
			}
			if (mode > 0) {
				if (states[state].hoverImage) {
					button.append(states[state].hoverImage);
				}
				if (states[state].selectedImage && selected) {
					button.append(states[state].selectedImage);
				} else {
					button.append(states[state].image);
				}
			}
			if (mode < 2 && iconPosition === 'left') {
				button.append('<span>' + states[state].label + '</span>');
			}
		}

		function setLabel(newLabels) {
			if (typeof(newLabels) === 'string') {
				newLabels = [newLabels];	//if a single string is given, create an array with this string as single item
			}
			//check if number of given labels corresponds to number of states, then update labels
			if (newLabels.length && newLabels.length === states.length) {
				for (var i = 0; i < states.length; i++) {
					states[i].label = newLabels[i];
				}
			}
			updateState();
		}

		function setClass(s) {
			button.addClass(s);
			background.addClass(s);
		}

		function clearClass(s) {
			button.removeClass(s);
			background.removeClass(s);
		}

		function destroy() {
			pointerHandler.clear(button);
			tooltipElement.remove();
			background.remove();
		}

		/* functions for use with nxDialog or other widgets that handle keyboard input
		 * nxButton does not have a keyboard listener on its own */

		this.keydown = function () {
			if (selected || disabled) return;
			button.addClass('nxButtonActive');
		};

		this.keyup = function () {
			if (selected || disabled) return;
			button.removeClass('nxButtonActive');
			if (callback) {
				if (callBackParams === null) {
					if (typeof(value) === 'function') {
						callback.call(this, value.call(this));
					} else {
						callback.call(this, value);
					}
				} else {
					callback.apply(this, callBackParams);
				}
			}
			if (toggle) state++;
			updateState();
		};

		this.buttonSelected = buttonSelected;
		this.setPosition = setPosition;
		this.setState = setState;
		this.hide = hide;
		this.show = show;
		this.enable = enable;
		this.disable = disable;
		this.buttonLeave = buttonLeave;
		this.setLabel = setLabel;
		this.setClass = setClass;
		this.clearClass = clearClass;
		this.destroy = destroy;
		this.element = background;
	}

	function debug(msg) {
		if (!debugMode) return;
		if (console) {
			var ts = performance.now();
			ts = Math.round(ts);
			var ms = lpad(ts % 1000, 2, '0');
			ts = Math.floor(ts / 1000);
			var s = lpad(ts % 60, 2, '0');
			ts = Math.floor(ts / 60);
			var m = lpad(ts % 60, 2, '0');
			ts = Math.floor(ts / 60);
			var h = lpad(ts % 24, 2, '0');
			ts = Math.floor(ts / 24);

			var tsString = sf('%@:%@:%@.%@: ', h, m, s, ms);
			console.log(tsString + msg);
		}
		if ($('#console').length > 0) {
			$('#console').append(msg + '<br>');
		}
	}

	function sf(s) {
		for (var i = 1; i < arguments.length; i++) {
			s = s.replace(/%@/, arguments[i]);
		}
		return s;
	}

	window.nxButton = nxButton;

})(jQuery);
