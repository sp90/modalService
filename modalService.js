(function() {
	'use strict';

	var modules = [];

	angular
		.module('service.modalService', modules)
		.service('ModalService', ModalService);

	function ModalService($rootScope, $window, $compile, $q, $timeout) {
		var openModals = [];
		var baseIndex = -1;
		var body = angular.element(document).find('body').eq(0);
		var html = angular.element(document).find('html').eq(0);
		var ctrl = this;

		ctrl.open = function(options) {
			return $q(function(resolve, reject) {
				// Check if either component and components are defined
				if (!options.component && !options.components) {
					return reject('Missing components definition');
				}

				// Check if the user is trying to bind on reserved names
				if (options.bindings && (options.bindings.close || options.bindings.confirm || options.bindings.next)) {
					return reject('Close, Confirm & Next must not be in your bindings, its reserved');
				}

				if (!angular.isUndefined(options.className) && typeof options.className !== 'string') {
					return reject('Option; className has to be a string')
				}

				// If components are not defined, use empty array
				options.components = options.components || [];

				// If component is defined the put in the beginning of the array
				if (options.component) {
					options.components.unshift(options.component);
				}

				// Prep stepIndex in the modal array
				var stepIndex = 0;

				// Prep component element array
				var componentStepArr = [];

				// Create indexes
				var index = baseIndex + 1;
				baseIndex = index;

				// Setup base settings
				options.closeButton = angular.isUndefined(options.closeButton) ? true : options.closeButton;
				options.closeByEscape = angular.isUndefined(options.closeByEscape) ? true : options.closeByEscape;
				options.closeByDocument = angular.isUndefined(options.closeByDocument) ? true : options.closeByDocument;
				options.className = angular.isUndefined(options.className) ? '' : options.className;

				// Prep scope
				var newScope = $rootScope.$new(true, $rootScope);

				// Prep bindings
				var bindings = prepBindings(options.bindings);

				// Bind user bindings to scope
				angular.extend(newScope, bindings.scope);

				// Loop through the components array and prep the component elements
				angular.forEach(options.components, function(component) {
					if (!component) {
						return reject('Missing component definition');
					}

					// Create component kebab-cased name
					var componentName = kebabCase(component);

					// Create component DOM element
					var componentDomEl = angular.element('<' + componentName + '></' + componentName + '>');

					// Prep element attributes for component
					var componentAttr = {
						'class': 'modal-service__component',
						'next': 'next({ data: data });',
						'close': 'close({ err: err });',
						'confirm': 'confirm({ res: res });',
						'next-data': 'nextData',
						'ng-click': '$event.stopPropagation();'
					};

					// Merge external bindings and default settings
					angular.extend(componentAttr, bindings.attr);

					// Bind attributes to our component DOM element
					componentDomEl.attr(componentAttr);

					// Push component DOM element to componentStepArr
					componentStepArr.push(componentDomEl);
				});

				// Bind close, confirm & next function to scope
				newScope.next = next;
				newScope.close = close;
				newScope.confirm = confirm;

				// Close by clicking the escape button
				if (options.closeByEscape) {
					angular
						.element($window)
						.on('keydown', closeByEscape);
				}

				// Close by click on the overlay
				if (options.closeByDocument) {
					newScope.closeByDocument = close;
				}

				// TODO - use the next() to init first component maybe?
				// Init the first component
				var newModalEl = createDomEl(componentStepArr[stepIndex]);

				// Add body class when modal is open
				html.addClass('modal-service--open');
				//window.enableScrolling(false);
				window.scrollTo(0, 1);

				// Compile the elements with the scope and append to body
				body.append($compile(newModalEl)(newScope));

				// Before push to dom add to array
				openModals.push({
					index: index,
					stepIndex: stepIndex,
					modalDomEl: newModalEl,
					scope: newScope
				});

				/**
				 *  Helper functions
				 */
				function createDomEl(compEl) {
					// Prep close button
					var closeDomEl = angular.element('<div></div>').attr({
						'class': 'modal-service__close',
						'ng-click': 'close({ err: err });'
					});

					// Prep wrapper
					var modalDomEl = angular.element('<div></div>');
					var modalDomAttr = {
						'class': 'modal-service',
						'role': 'dialog',
						'ng-click': ''
					}

					if (options.className) {
						modalDomAttr.class = modalDomAttr.class + ' ' + options.className;
					}

					// Prep content wrap dom element
					var modalWrapDomEl = angular.element('<div></div>');
					var modalWrapDomAttr = {
						'class': 'modal-service__wrap'
					}

					// Prep content dom element
					var modalContentDomEl = angular.element('<div></div>');
					var modalContentDomAttr = {
						'class': 'modal-service__content'
					}

					// Bind the ng-click closeByDocument to the overlay
					if (options.closeByDocument) {
						modalDomAttr['ng-click'] += 'closeByDocument();';
					}

					// Bind attribbutes to modal content element and append component
					modalContentDomEl
						.attr(modalContentDomAttr)
						.append(compEl)

					// Append close button if selected
					if (options.closeButton) {
						modalContentDomEl.append(closeDomEl);
					}

					// Wrap the whole content block in div
					modalWrapDomEl
						.attr(modalWrapDomAttr)
						.append(modalContentDomEl);

					// Bind attribbutes to modal element and append component
					return modalDomEl
						.attr(modalDomAttr)
						.append(modalWrapDomEl);
				}

				// Initial close function
				// Does reject
				function close(result) {
					garbageCollect();
					reject(result);
				}

				// Initial confirm function
				// Does resolve
				function confirm(result) {
					garbageCollect();
					resolve(result);
				}

				// Remove all event listerners, dom elements & scopes
				// for a specific modal
				function garbageCollect() {
					// Find correct modal
					var modalIndex = findIndex(openModals, 'index', index);

					// Remove body class when modal is open
					html.removeClass('modal-service--open');
					html.removeClass('modal-service--next');

					// Destroy scope
					openModals[modalIndex].scope.$destroy();

					// Remove event listener for window ESC key
					angular
						.element($window)
						.off('keydown', closeByEscape);

					$timeout(function() {
						//window.enableScrolling(true);

						// Cleanup element
						openModals[modalIndex].modalDomEl.remove();

						// Remove this modal from store
						openModals.splice(modalIndex, 1);
					}, 250);
				}

				// To close on escape click
				function closeByEscape(e) {
					if (e.keyCode === 27) {
						close();
					}
				}

				// If modal components used as steps
				function next(res) {
					// Find correct modal
					var modalIndex = findIndex(openModals, 'index', index);

					// Add next class to body to not animate inbetween modals
					html.addClass('modal-service--next');

					// Go next
					openModals[modalIndex].stepIndex += 1;
					var modalStepIndex = openModals[modalIndex].stepIndex;
					var modalScope = openModals[modalIndex].scope;

					// Close if no more components
					if (modalStepIndex === componentStepArr.length) {
						return close();
					}

					// Remove and destroy element and destroy scope
					openModals[modalIndex].modalDomEl.remove();

					// Create new and bind new scope
					var newModalEl = createDomEl(componentStepArr[modalStepIndex]);

					modalScope.nextData = res.data;

					// Compile the elements with the scope and append to body
					body.append($compile(newModalEl)(modalScope));

					// Add new modal element and scope to our data arr
					openModals[modalIndex].modalDomEl = newModalEl;
					openModals[modalIndex].scope = modalScope;

					// On next it will send Data, Scope, prevComp, nextComp
					if (options.nextCb && typeof options.nextCb === 'function') {
						options.nextCb({
							nextData: res.data,
							newScope: openModals[modalIndex].scope,
							prevComponent: options.components[modalStepIndex - 1],
							nextComponent: options.components[modalStepIndex]
						});
					}
				}
			});
		}

		// Prep bindings for scope and element attributes
		function prepBindings(bindings) {
			var scope = {}; // Objects of functions
			var attr = {}; // Object

			// Run through each binding and create the needed attr and scope
			angular.forEach(bindings, function(val, key) {
				attr[kebabCase(key)] = typeof val === 'function' ? key + '({ res: res });' : key
				scope[key] = val;
			});

			return {
				scope: scope,
				attr: attr
			}
		}

		// kebabCase regex
		var KEBAB_CASE_REGEXP = /[A-Z]/g;

		// Change from camelCase to kebabCase
		function kebabCase(name, separator) {
			separator = separator || '-';

			return name.replace(KEBAB_CASE_REGEXP, function(letter, pos) {
				return (pos ? separator : '') + letter.toLowerCase();
			});
		}

		// Find index of prop and val
		function findIndex(arr, prop, val) {
			var index;

			arr.some(function(entry, i) {
				if (entry[prop] === val) {
					index = i;

					return true;
				}
			});

			return index;
		}
	}
})();
