/*
 jsPointerHandler v1.03.17
 */

"use strict";


(function ($) {

	function jsPointerHandler() {

		var manager;
		var debug = false;
		var minDelay = 2000; // minimum delay between 2 similar events of different type for them to be recognized as 2 separate events
		var minDelayAfterTouch = 2000; //minimum delay after a touch event for a mouseover event to be accepted
		var dblClickDelay = 300; //the maximum delay in ms between 2 clicks to be recognized as double click
		if (!window.jsphManager) {
			window.jsphManager = {
				support: {mouse: false, pointer: false, touch: false},
				events: {},
				globalEvents: {},
				eventCounter: 1,
				clickInProgress: false,
				clickTimer: 0,
				dblClickTimestamp: -1,
				hoveredElements: {},
				pressId: -1,
				touchTimestamp: -1,
				delegates: {},
				x: 0,
				y: 0,
				observer: new MutationObserver(onDomChange),
				fetchX: fetchX,
				fetchY: fetchY
			};
			var config = {
				childList: true,
				subtree: false
			};
			window.jsphManager.observer.observe($('body').get(0), config);

			if ('onmousedown' in window && 'onmouseup' in window) {
				window.jsphManager.support.mouse = true;
			}

			if ('onpointerdown' in window && 'onpointerup' in window) {
				window.jsphManager.support.pointer = true;
			}

			if ('ontouchstart' in window && 'ontouchend' in window) {
				window.jsphManager.support.touch = true;
			}

			//this works only up to iOS 12; see below
			if (/(iPhone|iPad)/i.test(navigator.userAgent)) {
				window.jsphManager.support.mouse = false;
			}

			/*
				trying to match ipads and iphones which from iOS 13 claim to be Mac OS X
				If the vendor is Apple and it's a multitouch device, it should be an iPad or iPhone/iPod
			 */
			if (/^Apple/.test(window.navigator.vendor) && window.navigator.maxTouchPoints === 5) {
				window.jsphManager.support.mouse = false;
			}

			//handlers on window
			if (window.jsphManager.support.pointer) {
				$(window).on("pointerdown.jsPointerHandler", onWindowDown);
				if (debug) db('pointer support activated');
			} else {
				if (window.jsphManager.support.touch) {
					$(window).on("touchstart.jsPointerHandler", onWindowDown);
					if (debug) db('touch support activated');
				}
				if (window.jsphManager.support.mouse) {
					$(window).on("mousedown.jsPointerHandler", onWindowDown);
					if (debug) db('mouse support activated');
				}
			}

			if (window.jsphManager.support.pointer) {
				$(window).on("pointerup.jsPointerHandler", onWindowUp);
			} else {
				if (window.jsphManager.support.touch) $(window).on("touchend.jsPointerHandler", onWindowUp);
				if (window.jsphManager.support.mouse) $(window).on("mouseup.jsPointerHandler", onWindowUp);
			}

			if (window.jsphManager.support.pointer) {
				$(window).on("pointercancel.jsPointerHandler", onWindowCancel);
			} else {
				if (window.jsphManager.support.touch) $(window).on("touchcancel.jsPointerHandler", onWindowCancel);
			}

			if (window.jsphManager.support.pointer) {
				/*
				the following css rule needs to be in place, otherwise touch devices cancel the move event taking
				it for themselves for scrolling or panning
				possibly this will have to be put in an optional configuration to not break essential usability
				*/
				// $("*").css('touch-action', "none");
				$(window).on("pointermove.jsPointerHandler", onWindowMove);
			} else {
				if (window.jsphManager.support.touch) $(window).on("touchmove.jsPointerHandler", onWindowMove);
				if (window.jsphManager.support.mouse) $(window).on("mousemove.jsPointerHandler", onWindowMove);
			}
		}
		manager = window.jsphManager;


		/* public methods */
		this.listen = function (elements, settings) {
			elements.each(function () {
				var element = $(this);
				var localSettings = cln(settings);
				localSettings.counter = -1;
				if (typeof (localSettings.callbacks) === 'undefined') localSettings.callbacks = {};
				if (objectLength(manager.delegates) > 0) {
					for (var i in manager.delegates) {
						if (element.get(0) === manager.delegates[i].element.get(0)) {
							localSettings.counter = i;
							break;
						}
					}
				}

				if (localSettings.counter === -1) {
					localSettings.counter = manager.eventCounter++;
					element.attr('data-jsph', localSettings.counter);
					manager.delegates[localSettings.counter] = {element: element, settings: localSettings};
				} else {
					manager.delegates[localSettings.counter].settings = $.extend(true, manager.delegates[localSettings.counter].settings, localSettings);
				}


				if (localSettings.callbacks.down || localSettings.callbacks.click || localSettings.callbacks.dblclick || localSettings.pressClass || localSettings.activeClass) {
					if (manager.support.pointer) {
						$(element).on("pointerdown.jsPointerHandler", onPointerDown);
					} else {
						if (manager.support.touch) $(element).on("touchstart.jsPointerHandler", onPointerDown);
						if (manager.support.mouse) $(element).on("mousedown.jsPointerHandler", onPointerDown);
					}
				}
				if (localSettings.callbacks.up || localSettings.callbacks.click || localSettings.callbacks.dblclick || localSettings.pressClass || localSettings.activeClass) {
					if (manager.support.pointer) {
						$(element).on("pointerup.jsPointerHandler", onPointerUp);
					} else {
						if (manager.support.touch) $(element).on("touchend.jsPointerHandler", onPointerUp);
						if (manager.support.mouse) $(element).on("mouseup.jsPointerHandler", onPointerUp);
					}
				}

				if (localSettings.callbacks.over || localSettings.callbacks.leave || localSettings.hoverClass || localSettings.activeClass) {
					if (manager.support.pointer) {
						$(element).on("pointerover.jsPointerHandler", onPointerOver);
						$(element).on("pointerleave.jsPointerHandler", onPointerLeave);
					}
					if (manager.support.mouse) {
						$(element).on("mouseover.jsPointerHandler", onPointerOver);
						$(element).on("mouseleave.jsPointerHandler", onPointerLeave);
					}
				}
			});
		};

		this.clear = function (elements) {
			elements.each(function () {
				var element = $(this);
				var delegateId = element.attr('data-jsph');
				if (manager.hoveredElements[delegateId]) {
					stopHovering({
						type: 'pointerleave',
						delegateTarget: element.get(0),
						target: element.get(0)
					}, manager.delegates[delegateId].settings);
				}
				if (typeof (manager.delegates[delegateId]) === 'undefined') {
					console.warn("jsPH error on clear: element not registered");
					console.warn(element);
					return;
				}

				var settings = manager.delegates[delegateId].settings;

				if (settings.callbacks.down || settings.callbacks.click || settings.callbacks.dblclick || settings.pressClass || settings.activeClass) {
					if (manager.support.pointer) {
						$(element).off("pointerdown.jsPointerHandler");
					} else {
						if (manager.support.mouse) $(element).off("mousedown.jsPointerHandler");
						if (manager.support.touch) $(element).off("touchstart.jsPointerHandler");
					}
				}
				if (settings.callbacks.up || settings.callbacks.click || settings.callbacks.dblclick || settings.pressClass || settings.activeClass) {
					if (manager.support.pointer) {
						$(element).off("pointerup.jsPointerHandler");
					} else {
						if (manager.support.mouse) $(element).off("mouseup.jsPointerHandler");
						if (manager.support.touch) $(element).off("touchend.jsPointerHandler");
					}
				}

				if (settings.callbacks.over || settings.callbacks.leave || settings.hoverClass || settings.activeClass) {
					if (manager.support.pointer) {
						$(element).off("pointerover.jsPointerHandler");
						$(element).off("pointerleave.jsPointerHandler");
					}
					if (manager.support.mouse) {
						$(element).off("mouseover.jsPointerHandler");
						$(element).off("mouseleave.jsPointerHandler");
					}
				}

				delete manager.delegates[delegateId];
			});
		};

		this.pause = function (elements) {
			elements.each(function () {
				var element = $(this);
				var delegateId = element.attr('data-jsph');
				if (manager.hoveredElements[delegateId]) {
					stopHovering({
						type: 'pointerleave',
						delegateTarget: element.get(0),
						target: element.get(0)
					}, manager.delegates[delegateId].settings);
				}
				if (typeof (manager.delegates[delegateId]) === 'undefined') {
					console.warn("jsPH error on pause: element not registered");
					console.warn(element);
					return;
				}
				var settings = manager.delegates[delegateId].settings;
				settings.disabled = true;
			});
		};

		this.resume = function (elements) {
			elements.each(function () {
				var element = $(this);
				var delegateId = element.attr('data-jsph');
				if (typeof (manager.delegates[delegateId]) === 'undefined') {
					console.warn("jsPH error on resume: element not registered");
					console.warn(element);
					return;
				}
				var settings = manager.delegates[delegateId].settings;
				settings.disabled = false;
			});
		};

		/* private methods */

		function onPointerDown(e) {
			if (e.type !== 'touchstart' && e.which !== 1) return;
			if (manager.clickInProgress) return;
			manager.x = fetchX(e);
			manager.y = fetchY(e);
			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}
			var delegate = $(e.delegateTarget);
			var delegateId = delegate.attr('data-jsph');
			var settings = manager.delegates[delegateId].settings;
			if (settings.disabled === true) return;
			if (debug) db('onPointerDown [%@] %@', e.type, settings.counter);
			var ts = Date.now();
			manager.globalEvents.down = ts;

			if (e.type === 'touchstart') {
				manager.touchTimestamp = Date.now();
			} else if (Date.now() - manager.touchTimestamp < minDelayAfterTouch) {
				return;
			}

			//start hover state in case of touch event
			if (e.type === 'touchstart' || (e.type === 'pointerdown' && e.originalEvent.pointerType !== 'mouse')) {
				startHovering(e, settings);
			}

			var id = settings.counter + '_down';
			if (manager.events[id]) {
				var delta = Math.abs(ts - manager.events[id].ts);
				if (manager.events[id].type !== e.type && delta < minDelay) {
					return;
				}
			}

			manager.events[id] = {
				ts: ts,
				type: e.type
			};

			manager.clickInProgress = settings.counter;
			manager.pressId = settings.counter;
			if (settings.pressClass) {
				delegate.addClass(settings.pressClass);
			}
			if (settings.activeClass && manager.hoveredElements[manager.pressId]) {
				delegate.addClass(settings.activeClass);
			}

			if (typeof (settings.callbacks.down) === 'function') {
				settings.callbacks.down.call(this, e);
			}
		}

		function onPointerUp(e) {
			if (e.type !== 'touchend' && e.which !== 1) return;
			manager.x = fetchX(e);
			manager.y = fetchY(e);
			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}

			if (!manager.delegates[manager.clickInProgress]) return;

			var delegate = manager.delegates[manager.clickInProgress].element;
			var delegateId = delegate.attr('data-jsph');
			var settings = manager.delegates[delegateId].settings;
			if (settings.disabled === true) return;
			if (debug) db('onPointerUp [%@] %@', e.type, settings.counter);
			var ts = Date.now();
			manager.globalEvents.up = ts;

			if (e.type === 'touchend') {
				manager.touchTimestamp = Date.now();
			} else if (Date.now() - manager.touchTimestamp < minDelayAfterTouch) {
				return;
			}

			//end hover state in case of touch event
			if (e.type === 'touchend' || (e.type === 'pointerup' && e.originalEvent.pointerType !== 'mouse')) {
				stopHovering(e, settings);
			}

			var id = settings.counter + '_up';
			if (manager.events[id]) {
				var delta = Math.abs(ts - manager.events[id].ts);
				if (manager.events[id].type !== e.type && delta < minDelay) {
					return;
				}
			}

			manager.pressId = -1;
			if (settings.pressClass) {
				delegate.removeClass(settings.pressClass);
			}
			if (settings.activeClass) {
				delegate.removeClass(settings.activeClass);
			}

			manager.events[id] = {
				ts: ts,
				type: e.type
			};

			var realTarget = $(document.elementFromPoint(manager.x, manager.y));
			if (!delegate.is(realTarget) && !$.contains(delegate.get(0), realTarget.get(0))) {
				if (typeof (settings.callbacks.out) === 'function') {
					var e2 = cln(e);
					e2.type = 'pointerout';
					settings.callbacks.out.call(this, e2);
				}
				manager.clickInProgress = false;

				/* check if another element should receive a pointerover event now that the button is no longer pressed */
				var newId = fetchIdForElement(realTarget);
				if (newId !== -1) {
					if (e.type !== 'touchend' && !(e.type === 'pointerup' && e.originalEvent.pointerType !== 'mouse')) {
						if (debug) db('onPointerUp');
						startHovering({
							type: 'pointerover',
							delegateTarget: manager.delegates[newId].element.get(0),
							target: manager.delegates[newId].element.get(0)
						}, manager.delegates[newId].settings);
					}
				}
				return;
			}

			if (typeof (settings.callbacks.up) === 'function' && manager.clickInProgress === settings.counter) {
				settings.callbacks.up.call(this, e);
			}

			if ((typeof (settings.callbacks.click) === 'function' || typeof (settings.callbacks.dblclick) === 'function') && manager.clickInProgress === settings.counter) {
				if (typeof (settings.callbacks.dblclick) === 'function') {
					if (settings.waitForDblclick) {
						if (manager.clickTimer !== 0) {
							clearTimeout(manager.clickTimer);
							manager.clickTimer = 0;
							onDblClick(e, settings);
						} else {
							manager.clickTimer = setTimeout(function () {
								onClick(e, settings)
							}, dblClickDelay);
						}
					} else {
						if (Math.abs(Date.now() - manager.dblClickTimestamp) < dblClickDelay) {
							onDblClick(e, settings);
						} else {
							manager.dblClickTimestamp = Date.now();
							onClick(e, settings);
						}
					}
				} else {
					onClick(e, settings);
				}
			}

			manager.clickInProgress = false;
		}

		function onPointerOver(e) {
			e.preventDefault();
			e.stopPropagation();
			manager.x = fetchX(e);
			manager.y = fetchY(e);
			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}
			if (Date.now() - manager.touchTimestamp < minDelayAfterTouch) {
				return;
			}
			var delegate = $(e.delegateTarget);
			var delegateId = delegate.attr('data-jsph');
			var settings = manager.delegates[delegateId].settings;
			if (settings.disabled === true) return;
			if (debug) db('onPointerOver [%@]', e.type);
			if (!manager.hoveredElements[settings.counter] && (manager.clickInProgress === false || manager.clickInProgress === settings.counter)) {
				startHovering(e, settings);
			}
		}

		function startHovering(e, settings) {
			if (settings.disabled === true) return;
			/*

			the next statement tries to get rid of fake hover events on touch devices. Mormally the
			pointerType === touch should be enough, but iOS sometimes sends "mouse" here for whatever reason.
			However iOS sets button = 0 and buttons = 0 in that case which is a contradiction (left button is pressed
			and the number of pressed buttons is 0). This allows us to filter out this fake event and ignore it.

			*/
			if (typeof (e.pointerType) !== 'undefined' && e.pointerType === 'touch' || (e.button === 0 && e.buttons === 0)) return;
			if (debug) db('startHovering [%@] %@', e.type, settings.counter);
			var e2 = cln(e);
			var prefix = e.type.match(/^(touch|pointer|mouse)/);
			e2.type = prefix[1] + 'over';
			var delegate = $(e.delegateTarget);
			manager.hoveredElements[settings.counter] = true;
			if (settings.hoverClass) {
				delegate.addClass(settings.hoverClass);
			}
			if (settings.activeClass && manager.hoveredElements[manager.pressId]) {
				delegate.addClass(settings.activeClass);
			}
			if (typeof (settings.callbacks.over) === 'function') {
				settings.callbacks.over.call(this, e2);
			}
		}

		function onPointerLeave(e) {
			e.preventDefault();
			manager.x = fetchX(e);
			manager.y = fetchY(e);
			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}
			if (Date.now() - manager.touchTimestamp < minDelayAfterTouch) return;
			var delegate = $(e.delegateTarget);
			var delegateId = delegate.attr('data-jsph');
			var settings = manager.delegates[delegateId].settings;
			if (settings.disabled === true) return;
			if (debug) db('onPointerLeave [%@]', e.type);
			if (manager.hoveredElements[settings.counter]) {
				stopHovering(e, settings);
			}
		}

		function stopHovering(e, settings) {
			if ((typeof (settings) !== 'undefined' && settings.disabled === true)) return;
			if (typeof (e.pointerType) !== 'undefined' && e.pointerType === 'touch') return;
			if (debug) db('stopHovering [%@] %@', e.type, settings.counter);
			var e2 = cln(e);
			var prefix = e.type.match(/^(touch|pointer|mouse)/);
			e2.type = prefix[1] + 'leave';
			var delegate = $(e.delegateTarget);
			delete manager.hoveredElements[settings.counter];
			if (settings.hoverClass) {
				delegate.removeClass(settings.hoverClass);
			}
			if (settings.activeClass) {
				delegate.removeClass(settings.activeClass);
			}

			if (typeof (settings.callbacks.leave) === 'function') {
				settings.callbacks.leave.call(this, e2);
			}
		}

		function onClick(e, settings) {
			if (settings.disabled === true) return;
			if (manager.clickTimer !== 0) {
				clearTimeout(manager.clickTimer);
				manager.clickTimer = 0;
			}
			if (typeof (settings.callbacks.click) === 'function') {
				if (debug) db('onClick [%@]', e.type);
				var e2 = cln(e);
				e2.type = 'click';
				settings.callbacks.click.call(this, e2);
			}
		}

		function onDblClick(e, settings) {
			if (settings.disabled === true) return;
			if (debug) db('onDblClick [%@]', e.type);
			var e2 = cln(e);
			e2.type = 'dblclick';
			settings.callbacks.dblclick.call(this, e2);
		}

		function fetchIdForElement(target) {
			for (var i in manager.delegates) {
				if (manager.delegates[i].element.is(target) || $.contains(manager.delegates[i].element.get(0), target.get(0))) {
					return parseInt(i);
				}
			}
			return -1;
		}

		function onWindowDown(e) {
			if (e.which !== 1) return;
			manager.x = fetchX(e);
			manager.y = fetchY(e);

			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}

			if (debug) db('onWindowDown [%@] - %@', e.type, e.timeStamp);
			var ts = Date.now();

			if (Math.abs(ts - (manager.globalEvents.down || 0)) > 100) {
				manager.globalEvents.down = ts;
				manager.clickInProgress = 'window';
			}

		}

		function onWindowMove(e) {
			if (debug) db('onWindowMove [%@]', e.type);
			manager.x = fetchX(e);
			manager.y = fetchY(e);
			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}
			if (manager.delegates[manager.clickInProgress]) {
				if (typeof (manager.delegates[manager.clickInProgress].settings.callbacks.move) === 'function') {
					manager.delegates[manager.clickInProgress].settings.callbacks.move.call(this, {
						x: manager.x,
						y: manager.y
					});
				}
				var realTarget = $(document.elementFromPoint(manager.x, manager.y));
				if (!manager.delegates[manager.clickInProgress].element.is(realTarget) && !$.contains(manager.delegates[manager.clickInProgress].element.get(0), realTarget.get(0))) {
					if (objectLength(manager.hoveredElements) > 0) {
						var e2 = cln(e);
						e2.delegateTarget = manager.delegates[manager.clickInProgress].element.get(0);
						e2.target = e2.delegateTarget;
						if (debug) db('onWindowMove (and leave element) [%@]', e.type);
						stopHovering(e2, manager.delegates[manager.clickInProgress].settings);
					}
				} else {
					if (!manager.hoveredElements[manager.clickInProgress]) {
						var e2 = cln(e);
						e2.delegateTarget = manager.delegates[manager.clickInProgress].element.get(0);
						e2.target = e2.delegateTarget;
						if (debug) db('onWindowMove (and enter element) [%@]', e.type);
						startHovering(e2, manager.delegates[manager.clickInProgress].settings);
					}
				}
			}
		}

		function onWindowUp(e) {
			if (e.which !== 1) return;
			if (debug) db('onWindowUp [%@]', e.type);
			var ts = Date.now();
			manager.x = fetchX(e);
			manager.y = fetchY(e);

			var matches = e.type.match(/^(pointer|touch|mouse)/);
			manager.pointerType = matches[1];
			if (manager.pointerType === 'pointer') {
				manager.pointerType = e.originalEvent.pointerType;
			}
			if (Math.abs(ts - (manager.globalEvents.up || 0)) > 100) {
				manager.globalEvents.up = ts;
				if (manager.delegates[manager.clickInProgress]) {
					manager.pressId = -1;
					if (manager.delegates[manager.clickInProgress].settings.pressClass) {
						manager.delegates[manager.clickInProgress].element.removeClass(manager.delegates[manager.clickInProgress].settings.pressClass);
					}
					if (manager.delegates[manager.clickInProgress].settings.activeClass) {
						manager.delegates[manager.clickInProgress].element.removeClass(manager.delegates[manager.clickInProgress].settings.activeClass);
					}

					if (typeof (manager.delegates[manager.clickInProgress].settings.callbacks.out) === 'function') {
						var e2 = cln(e);
						e2.type = 'pointerout';
						manager.delegates[manager.clickInProgress].settings.callbacks.out.call(this, e2);
					}
				}

				//check if the button was released outside of the browser window
				if (manager.x < 0 || manager.x > window.innerWidth || manager.y < 0 || manager.y > window.innerHeight) {
					if (typeof (manager.delegates[manager.clickInProgress]) !== 'undefined' && typeof (manager.delegates[manager.clickInProgress].settings.callbacks.outsidewindow) === 'function') {
						var e2 = cln(e);
						e2.type = 'pointeroutsidewindow';
						manager.delegates[manager.clickInProgress].settings.callbacks.outsidewindow.call(this, e2);
					}
				}
				manager.clickInProgress = false;

				/* check if another element should receive a pointerover event now that the button is no longer pressed */
				var newTarget = $(document.elementFromPoint(manager.x, manager.y));
				var newId = fetchIdForElement(newTarget);
				if (newId !== -1) {
					if (e.type !== 'touchend' && !(e.type === 'pointerup' && e.originalEvent.pointerType !== 'mouse')) {
						startHovering({
							type: 'pointerover',
							delegateTarget: manager.delegates[newId].element.get(0),
							target: manager.delegates[newId].element.get(0)
						}, manager.delegates[newId].settings);
					}
				}
			}
		}

		function onWindowCancel(e) {
			if (manager.delegates[manager.clickInProgress]) {
				manager.pressId = -1;
				if (manager.delegates[manager.clickInProgress].settings.pressClass) {
					manager.delegates[manager.clickInProgress].element.removeClass(manager.delegates[manager.clickInProgress].settings.pressClass);
				}
				if (manager.delegates[manager.clickInProgress].settings.activeClass) {
					manager.delegates[manager.clickInProgress].element.removeClass(manager.delegates[manager.clickInProgress].settings.activeClass);
				}
			}
			manager.clickInProgress = false;
		}

		function onDomChange(mutations) {
			for (var i in manager.hoveredElements) {
				if (typeof (manager.delegates[i]) === 'undefined') {
					delete manager.hoveredElements[i];
				}
			}
			for (var i in manager.delegates) {
				if (!document.body.contains(manager.delegates[i].element.get(0))) {
					delete manager.delegates[i];
					if (manager.clickInProgress === parseInt(i)) manager.clickInProgress = -1;
					if (manager.hoveredElements[i]) delete manager.hoveredElements[i];
				}
			}
			var newTarget = $(document.elementFromPoint(manager.x, manager.y));
			var newId = fetchIdForElement(newTarget);
			if (newId !== -1 && !manager.hoveredElements[newId] && manager.pointerType === 'mouse') {
				if (debug) db("onDomChange -> start (%@, %@)", manager.x, manager.y);
				startHovering({
					type: 'pointerover',
					delegateTarget: manager.delegates[newId].element.get(0),
					target: manager.delegates[newId].element.get(0)
				}, manager.delegates[newId].settings);
			} else if (newId === -1 && objectLength(manager.hoveredElements) > 0) {
				if (debug) db("onDomChange -> stop (%@, %@)", manager.x, manager.y);
				for (var i in manager.hoveredElements) {
					if (typeof (manager.delegates[i]) !== 'undefined') {
						stopHovering({
							type: 'pointerleave',
							delegateTarget: manager.delegates[i].element.get(0),
							target: manager.delegates[i].element.get(0)
						}, manager.delegates[i].settings);
					} else {
						delete manager.hoveredElements[i];
					}
				}
			}
		}

		function fetchX(e) {
			if (typeof (e.clientX) !== 'undefined') return e.clientX;
			if (typeof (e.originalEvent.clientX) !== 'undefined') return e.originalEvent.clientX;
			if (typeof (e.originalEvent.changedTouches) !== 'undefined' && typeof (e.originalEvent.changedTouches[0]) !== 'undefined') return e.originalEvent.changedTouches[0].clientX;
			return 0;
		}

		function fetchY(e) {
			if (typeof (e.clientY) !== 'undefined') return e.clientY;
			if (typeof (e.originalEvent.clientY) !== 'undefined') return e.originalEvent.clientY;
			if (typeof (e.originalEvent.changedTouches) !== 'undefined' && typeof (e.originalEvent.changedTouches[0]) !== 'undefined') return e.originalEvent.changedTouches[0].clientY;
			return 0;
		}

		function cln(o) {
			return jQuery.extend(true, {}, o);
		}

		function db() {
			console.trace(stringf.apply(this, arguments));
			// $('#console').append(stringf.apply(this, arguments) + ", ");
		}

	}

	//export class
	window.jsPointerHandler = jsPointerHandler;

})(jQuery);
