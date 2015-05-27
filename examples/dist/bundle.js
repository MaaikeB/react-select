require=(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
'use strict';

var React = require('react');

var Option = React.createClass({

	displayName: 'Value',

	propTypes: {
		label: React.PropTypes.string.isRequired
	},

	blockEvent: function blockEvent(event) {
		event.stopPropagation();
	},

	render: function render() {
		var label = this.props.label;

		if (this.props.optionLabelClick) {
			label = React.createElement(
				'a',
				{ className: 'Select-item-label__a',
					onMouseDown: this.blockEvent,
					onTouchEnd: this.props.onOptionLabelClick,
					onClick: this.props.onOptionLabelClick },
				label
			);
		}

		return React.createElement(
			'div',
			{ className: 'Select-item' },
			React.createElement(
				'span',
				{ className: 'Select-item-icon',
					onMouseDown: this.blockEvent,
					onClick: this.props.onRemove,
					onTouchEnd: this.props.onRemove },
				'×'
			),
			React.createElement(
				'span',
				{ className: 'Select-item-label' },
				label
			)
		);
	}

});

module.exports = Option;

},{"react":undefined}],"react-select":[function(require,module,exports){
'use strict';

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var React = require('react');
var Input = require('react-input-autosize');
var classes = require('classnames');
var Value = require('./Value');

var requestId = 0;

var Select = React.createClass({

	displayName: 'Select',

	propTypes: {
		value: React.PropTypes.any, // initial field value
		multi: React.PropTypes.bool, // multi-value input
		disabled: React.PropTypes.bool, // whether the Select is disabled or not
		options: React.PropTypes.array, // array of options
		delimiter: React.PropTypes.string, // delimiter to use to join multiple values
		asyncOptions: React.PropTypes.func, // function to call to get options
		autoload: React.PropTypes.bool, // whether to auto-load the default async options set
		placeholder: React.PropTypes.string, // field placeholder, displayed when there's no value
		noResultsText: React.PropTypes.string, // placeholder displayed when there are no matching search results
		clearable: React.PropTypes.bool, // should it be possible to reset value
		clearValueText: React.PropTypes.string, // title for the "clear" control
		clearAllText: React.PropTypes.string, // title for the "clear" control when multi: true
		searchable: React.PropTypes.bool, // whether to enable searching feature or not
		searchPromptText: React.PropTypes.string, // label to prompt for search input
		name: React.PropTypes.string, // field name, for hidden <input /> tag
		onChange: React.PropTypes.func, // onChange handler: function(newValue) {}
		onFocus: React.PropTypes.func, // onFocus handler: function(event) {}
		onBlur: React.PropTypes.func, // onBlur handler: function(event) {}
		className: React.PropTypes.string, // className for the outer element
		filterOption: React.PropTypes.func, // method to filter a single option: function(option, filterString)
		filterOptions: React.PropTypes.func, // method to filter the options array: function([options], filterString, [values])
		matchPos: React.PropTypes.string, // (any|start) match the start or entire string when filtering
		matchProp: React.PropTypes.string, // (any|label|value) which option property to filter on
		inputProps: React.PropTypes.object, // custom attributes for the Input (in the Select-control) e.g: {'data-foo': 'bar'}
		allowCreate: React.PropTypes.bool, // wether to allow creation of new entries
		/*
  * Allow user to make option label clickable. When this handler is defined we should
  * wrap label into <a>label</a> tag.
  *
  * onOptionLabelClick handler: function (value, event) {}
  *
  */
		onOptionLabelClick: React.PropTypes.func
	},

	getDefaultProps: function getDefaultProps() {
		return {
			value: undefined,
			options: undefined,
			disabled: false,
			delimiter: ',',
			asyncOptions: undefined,
			autoload: true,
			placeholder: 'Select...',
			noResultsText: 'No results found',
			clearable: true,
			clearValueText: 'Clear value',
			clearAllText: 'Clear all',
			searchable: true,
			searchPromptText: 'Type to search',
			name: undefined,
			onChange: undefined,
			className: undefined,
			matchPos: 'any',
			matchProp: 'any',
			inputProps: {},
			allowCreate: false,

			onOptionLabelClick: undefined
		};
	},

	getInitialState: function getInitialState() {
		return {
			/*
    * set by getStateFromValue on componentWillMount:
    * - value
    * - values
    * - filteredOptions
    * - inputValue
    * - placeholder
    * - focusedOption
   */
			options: this.props.options,
			isFocused: false,
			isOpen: false,
			isLoading: false
		};
	},

	componentWillMount: function componentWillMount() {
		this._optionsCache = {};
		this._optionsFilterString = '';
		this.setState(this.getStateFromValue(this.props.value));

		if (this.props.asyncOptions && this.props.autoload) {
			this.autoloadAsyncOptions();
		}

		var self = this;
		this._closeMenuIfClickedOutside = function (event) {
			if (!self.state.isOpen) {
				return;
			}
			var menuElem = self.refs.selectMenuContainer.getDOMNode();
			var controlElem = self.refs.control.getDOMNode();

			var eventOccuredOutsideMenu = self.clickedOutsideElement(menuElem, event);
			var eventOccuredOutsideControl = self.clickedOutsideElement(controlElem, event);

			// Hide dropdown menu if click occurred outside of menu
			if (eventOccuredOutsideMenu && eventOccuredOutsideControl) {
				self.setState({
					isOpen: false
				}, self._unbindCloseMenuIfClickedOutside);
			}
		};

		this._bindCloseMenuIfClickedOutside = function () {
			if (!document.addEventListener && document.attachEvent) {
				document.attachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.addEventListener('click', this._closeMenuIfClickedOutside);
			}
		};

		this._unbindCloseMenuIfClickedOutside = function () {
			if (!document.removeEventListener && document.detachEvent) {
				document.detachEvent('onclick', this._closeMenuIfClickedOutside);
			} else {
				document.removeEventListener('click', this._closeMenuIfClickedOutside);
			}
		};
	},

	componentWillUnmount: function componentWillUnmount() {
		clearTimeout(this._blurTimeout);
		clearTimeout(this._focusTimeout);

		if (this.state.isOpen) {
			this._unbindCloseMenuIfClickedOutside();
		}
	},

	componentWillReceiveProps: function componentWillReceiveProps(newProps) {
		if (JSON.stringify(newProps.options) !== JSON.stringify(this.props.options)) {
			this.setState({
				options: newProps.options,
				filteredOptions: this.filterOptions(newProps.options)
			});
		}
		if (newProps.value !== this.state.value) {
			this.setState(this.getStateFromValue(newProps.value, newProps.options));
		}
	},

	componentDidUpdate: function componentDidUpdate() {
		var self = this;

		if (!this.props.disabled && this._focusAfterUpdate) {
			clearTimeout(this._blurTimeout);

			this._focusTimeout = setTimeout(function () {
				self.getInputNode().focus();
				self._focusAfterUpdate = false;
			}, 50);
		}

		if (this._focusedOptionReveal) {
			if (this.refs.focused && this.refs.menu) {
				var focusedDOM = this.refs.focused.getDOMNode();
				var menuDOM = this.refs.menu.getDOMNode();
				var focusedRect = focusedDOM.getBoundingClientRect();
				var menuRect = menuDOM.getBoundingClientRect();

				if (focusedRect.bottom > menuRect.bottom || focusedRect.top < menuRect.top) {
					menuDOM.scrollTop = focusedDOM.offsetTop + focusedDOM.clientHeight - menuDOM.offsetHeight;
				}
			}

			this._focusedOptionReveal = false;
		}
	},

	focus: function focus() {
		this.getInputNode().focus();
	},

	clickedOutsideElement: function clickedOutsideElement(element, event) {
		var eventTarget = event.target ? event.target : event.srcElement;
		while (eventTarget != null) {
			if (eventTarget === element) return false;
			eventTarget = eventTarget.offsetParent;
		}
		return true;
	},

	getStateFromValue: function getStateFromValue(value, options) {
		if (!options) {
			options = this.state.options;
		}

		// reset internal filter string
		this._optionsFilterString = '';

		var values = this.initValuesArray(value, options),
		    filteredOptions = this.filterOptions(options, values);

		return {
			value: values.map(function (v) {
				return v.value;
			}).join(this.props.delimiter),
			values: values,
			inputValue: '',
			filteredOptions: filteredOptions,
			placeholder: !this.props.multi && values.length ? values[0].label : this.props.placeholder,
			focusedOption: !this.props.multi && values.length ? values[0] : filteredOptions[0]
		};
	},

	initValuesArray: function initValuesArray(values, options) {
		if (!Array.isArray(values)) {
			if (typeof values === 'string') {
				values = values.split(this.props.delimiter);
			} else {
				values = values ? [values] : [];
			}
		}

		return values.map(function (val) {
			if (typeof val === 'string') {
				for (var key in options) {
					if (options.hasOwnProperty(key) && options[key] && options[key].value === val) {
						return options[key];
					}
				}
				return { value: val, label: val };
			} else {
				return val;
			}
		});
	},

	setValue: function setValue(value, focusAfterUpdate) {
		if (focusAfterUpdate || focusAfterUpdate === undefined) {
			this._focusAfterUpdate = true;
		}
		var newState = this.getStateFromValue(value);
		newState.isOpen = false;
		this.fireChangeEvent(newState);
		this.setState(newState);
	},

	selectValue: function selectValue(value) {
		if (!this.props.multi) {
			this.setValue(value);
		} else if (value) {
			this.addValue(value);
		}
		this._unbindCloseMenuIfClickedOutside();
	},

	addValue: function addValue(value) {
		this.setValue(this.state.values.concat(value));
	},

	popValue: function popValue() {
		this.setValue(this.state.values.slice(0, this.state.values.length - 1));
	},

	removeValue: function removeValue(valueToRemove) {
		this.setValue(this.state.values.filter(function (value) {
			return value !== valueToRemove;
		}));
	},

	clearValue: function clearValue(event) {
		// if the event was triggered by a mousedown and not the primary
		// button, ignore it.
		if (event && event.type === 'mousedown' && event.button !== 0) {
			return;
		}
		this.setValue(null);
	},

	resetValue: function resetValue() {
		this.setValue(this.state.value === '' ? null : this.state.value);
	},

	getInputNode: function getInputNode() {
		var input = this.refs.input;
		return this.props.searchable ? input : input.getDOMNode();
	},

	fireChangeEvent: function fireChangeEvent(newState) {
		if (newState.value !== this.state.value && this.props.onChange) {
			this.props.onChange(newState.value, newState.values);
		}
	},

	handleMouseDown: function handleMouseDown(event) {
		// if the event was triggered by a mousedown and not the primary
		// button, or if the component is disabled, ignore it.
		if (this.props.disabled || event.type === 'mousedown' && event.button !== 0) {
			return;
		}

		event.stopPropagation();
		event.preventDefault();
		if (this.state.isFocused) {
			if (this.state.isOpen) {
				this.setState({
					isOpen: false
				});
			} else this.setState({
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			this._openAfterFocus = true;
			this.getInputNode().focus();
		}
	},

	handleInputFocus: function handleInputFocus(event) {
		var newIsOpen = this.state.isOpen || this._openAfterFocus;
		this.setState({
			isFocused: true,
			isOpen: newIsOpen
		}, function () {
			if (newIsOpen) {
				this._bindCloseMenuIfClickedOutside();
			} else {
				this._unbindCloseMenuIfClickedOutside();
			}
		});
		this._openAfterFocus = false;

		if (this.props.onFocus) {
			this.props.onFocus(event);
		}
	},

	handleInputBlur: function handleInputBlur(event) {
		var self = this;

		this._blurTimeout = setTimeout(function () {
			if (self._focusAfterUpdate) return;

			self.setState({
				isFocused: false
			});
		}, 50);

		if (this.props.onBlur) {
			this.props.onBlur(event);
		}
	},

	handleKeyDown: function handleKeyDown(event) {
		if (this.state.disabled) return;

		switch (event.keyCode) {

			case 8:
				// backspace
				if (!this.state.inputValue) {
					this.popValue();
				}
				return;

			case 9:
				// tab
				if (event.shiftKey || !this.state.isOpen || !this.state.focusedOption) {
					return;
				}
				this.selectFocusedOption();
				break;

			case 13:
				// enter
				this.selectFocusedOption();
				break;

			case 27:
				// escape
				if (this.state.isOpen) {
					this.resetValue();
				} else {
					this.clearValue();
				}
				break;

			case 38:
				// up
				this.focusPreviousOption();
				break;

			case 40:
				// down
				this.focusNextOption();
				break;

			case 188:
				// ,
				if (this.props.allowCreate) {
					event.preventDefault();
					event.stopPropagation();
					this.selectFocusedOption();
				};
				break;

			default:
				return;
		}

		event.preventDefault();
	},

	// Ensures that the currently focused option is available in filteredOptions.
	// If not, returns the first available option.
	_getNewFocusedOption: function _getNewFocusedOption(filteredOptions) {
		for (var key in filteredOptions) {
			if (filteredOptions.hasOwnProperty(key) && filteredOptions[key] === this.state.focusedOption) {
				return filteredOptions[key];
			}
		}
		return filteredOptions[0];
	},

	handleInputChange: function handleInputChange(event) {
		// assign an internal variable because we need to use
		// the latest value before setState() has completed.
		this._optionsFilterString = event.target.value;

		if (this.props.asyncOptions) {
			this.setState({
				isLoading: true,
				inputValue: event.target.value
			});
			this.loadAsyncOptions(event.target.value, {
				isLoading: false,
				isOpen: true
			}, this._bindCloseMenuIfClickedOutside);
		} else {
			var filteredOptions = this.filterOptions(this.state.options);
			this.setState({
				isOpen: true,
				inputValue: event.target.value,
				filteredOptions: filteredOptions,
				focusedOption: this._getNewFocusedOption(filteredOptions)
			}, this._bindCloseMenuIfClickedOutside);
		}
	},

	autoloadAsyncOptions: function autoloadAsyncOptions() {
		var self = this;
		this.loadAsyncOptions('', {}, function () {
			// update with fetched but don't focus
			self.setValue(self.props.value, false);
		});
	},

	loadAsyncOptions: function loadAsyncOptions(input, state, callback) {
		var thisRequestId = this._currentRequestId = requestId++;

		for (var i = 0; i <= input.length; i++) {
			var cacheKey = input.slice(0, i);
			if (this._optionsCache[cacheKey] && (input === cacheKey || this._optionsCache[cacheKey].complete)) {
				var options = this._optionsCache[cacheKey].options;
				var filteredOptions = this.filterOptions(options);

				var newState = {
					options: options,
					filteredOptions: filteredOptions,
					focusedOption: this._getNewFocusedOption(filteredOptions)
				};
				for (var key in state) {
					if (state.hasOwnProperty(key)) {
						newState[key] = state[key];
					}
				}
				this.setState(newState);
				if (callback) callback({});
				return;
			}
		}

		var self = this;
		this.props.asyncOptions(input, function (err, data) {

			if (err) throw err;

			self._optionsCache[input] = data;

			if (thisRequestId !== self._currentRequestId) {
				return;
			}
			var filteredOptions = self.filterOptions(data.options);

			var newState = {
				options: data.options,
				filteredOptions: filteredOptions,
				focusedOption: self._getNewFocusedOption(filteredOptions)
			};
			for (var key in state) {
				if (state.hasOwnProperty(key)) {
					newState[key] = state[key];
				}
			}
			self.setState(newState);

			if (callback) callback({});
		});
	},

	filterOptions: function filterOptions(options, values) {
		if (!this.props.searchable) {
			return options;
		}

		var filterValue = this._optionsFilterString;
		var exclude = (values || this.state.values).map(function (i) {
			return i.value;
		});
		if (this.props.filterOptions) {
			return this.props.filterOptions.call(this, options, filterValue, exclude);
		} else {
			var filterOption = function filterOption(op) {
				if (this.props.multi && exclude.indexOf(op.value) > -1) return false;
				if (this.props.filterOption) return this.props.filterOption.call(this, op, filterValue);
				var valueTest = String(op.value),
				    labelTest = String(op.label);
				return !filterValue || this.props.matchPos === 'start' ? this.props.matchProp !== 'label' && valueTest.toLowerCase().substr(0, filterValue.length) === filterValue || this.props.matchProp !== 'value' && labelTest.toLowerCase().substr(0, filterValue.length) === filterValue : this.props.matchProp !== 'label' && valueTest.toLowerCase().indexOf(filterValue.toLowerCase()) >= 0 || this.props.matchProp !== 'value' && labelTest.toLowerCase().indexOf(filterValue.toLowerCase()) >= 0;
			};
			return (options || []).filter(filterOption, this);
		}
	},

	selectFocusedOption: function selectFocusedOption() {
		if (this.props.allowCreate && !this.state.focusedOption) {
			return this.selectValue(this.state.inputValue);
		};
		return this.selectValue(this.state.focusedOption);
	},

	focusOption: function focusOption(op) {
		this.setState({
			focusedOption: op
		});
	},

	focusNextOption: function focusNextOption() {
		this.focusAdjacentOption('next');
	},

	focusPreviousOption: function focusPreviousOption() {
		this.focusAdjacentOption('previous');
	},

	focusAdjacentOption: function focusAdjacentOption(dir) {
		this._focusedOptionReveal = true;

		var ops = this.state.filteredOptions;

		if (!this.state.isOpen) {
			this.setState({
				isOpen: true,
				inputValue: '',
				focusedOption: this.state.focusedOption || ops[dir === 'next' ? 0 : ops.length - 1]
			}, this._bindCloseMenuIfClickedOutside);
			return;
		}

		if (!ops.length) {
			return;
		}

		var focusedIndex = -1;

		for (var i = 0; i < ops.length; i++) {
			if (this.state.focusedOption === ops[i]) {
				focusedIndex = i;
				break;
			}
		}

		var focusedOption = ops[0];

		if (dir === 'next' && focusedIndex > -1 && focusedIndex < ops.length - 1) {
			focusedOption = ops[focusedIndex + 1];
		} else if (dir === 'previous') {
			if (focusedIndex > 0) {
				focusedOption = ops[focusedIndex - 1];
			} else {
				focusedOption = ops[ops.length - 1];
			}
		}

		this.setState({
			focusedOption: focusedOption
		});
	},

	unfocusOption: function unfocusOption(op) {
		if (this.state.focusedOption === op) {
			this.setState({
				focusedOption: null
			});
		}
	},

	buildMenu: function buildMenu() {
		var focusedValue = this.state.focusedOption ? this.state.focusedOption.value : null;

		if (this.state.filteredOptions.length > 0) {
			focusedValue = focusedValue == null ? this.state.filteredOptions[0] : focusedValue;
		}
		// Add the current value to the filtered options in last resort
		if (this.props.allowCreate && !this.state.filteredOptions.length) {
			var inputValue = this.state.inputValue;
			this.state.filteredOptions.push({
				value: inputValue,
				label: inputValue,
				create: true
			});
		};

		var ops = Object.keys(this.state.filteredOptions).map(function (key) {
			var op = this.state.filteredOptions[key];
			var isFocused = focusedValue === op.value;

			var optionClass = classes({
				'Select-option': true,
				'is-focused': isFocused,
				'is-disabled': op.disabled
			});

			var ref = isFocused ? 'focused' : null;

			var mouseEnter = this.focusOption.bind(this, op);
			var mouseLeave = this.unfocusOption.bind(this, op);
			var mouseDown = this.selectValue.bind(this, op);

			if (op.disabled) {
				return React.createElement(
					'div',
					{ ref: ref, key: 'option-' + op.value, className: optionClass },
					op.label
				);
			} else {
				return React.createElement(
					'div',
					{ ref: ref, key: 'option-' + op.value, className: optionClass, onMouseEnter: mouseEnter, onMouseLeave: mouseLeave, onMouseDown: mouseDown, onClick: mouseDown },
					op.create ? 'Add ' + op.label + ' ?' : op.label
				);
			}
		}, this);

		return ops.length ? ops : React.createElement(
			'div',
			{ className: 'Select-noresults' },
			this.props.asyncOptions && !this.state.inputValue ? this.props.searchPromptText : this.props.noResultsText
		);
	},

	handleOptionLabelClick: function handleOptionLabelClick(value, event) {
		var handler = this.props.onOptionLabelClick;

		if (handler) {
			handler(value, event);
		}
	},

	render: function render() {
		var selectClass = classes('Select', this.props.className, {
			'is-multi': this.props.multi,
			'is-searchable': this.props.searchable,
			'is-open': this.state.isOpen,
			'is-focused': this.state.isFocused,
			'is-loading': this.state.isLoading,
			'is-disabled': this.props.disabled,
			'has-value': this.state.value
		});

		var value = [];

		if (this.props.multi) {
			this.state.values.forEach(function (val) {
				var props = {
					key: val.value,
					optionLabelClick: !!this.props.onOptionLabelClick,
					onOptionLabelClick: this.handleOptionLabelClick.bind(this, val),
					onRemove: this.removeValue.bind(this, val)
				};
				for (var key in val) {
					if (val.hasOwnProperty(key)) {
						props[key] = val[key];
					}
				}
				value.push(React.createElement(Value, props));
			}, this);
		}

		if (this.props.disabled || !this.state.inputValue && (!this.props.multi || !value.length)) {
			value.push(React.createElement(
				'div',
				{ className: 'Select-placeholder', key: 'placeholder' },
				this.state.placeholder
			));
		}

		var loading = this.state.isLoading ? React.createElement('span', { className: 'Select-loading', 'aria-hidden': 'true' }) : null;
		var clear = this.props.clearable && this.state.value && !this.props.disabled ? React.createElement('span', { className: 'Select-clear', title: this.props.multi ? this.props.clearAllText : this.props.clearValueText, 'aria-label': this.props.multi ? this.props.clearAllText : this.props.clearValueText, onMouseDown: this.clearValue, onClick: this.clearValue, dangerouslySetInnerHTML: { __html: '&times;' } }) : null;

		var menu;
		var menuProps;
		if (this.state.isOpen) {
			menuProps = {
				ref: 'menu',
				className: 'Select-menu'
			};
			if (this.props.multi) {
				menuProps.onMouseDown = this.handleMouseDown;
			}
			menu = React.createElement(
				'div',
				{ ref: 'selectMenuContainer', className: 'Select-menu-outer' },
				React.createElement(
					'div',
					menuProps,
					this.buildMenu()
				)
			);
		}

		var input;
		var inputProps = {
			ref: 'input',
			className: 'Select-input',
			tabIndex: this.props.tabIndex || 0,
			onFocus: this.handleInputFocus,
			onBlur: this.handleInputBlur
		};
		for (var key in this.props.inputProps) {
			if (this.props.inputProps.hasOwnProperty(key)) {
				inputProps[key] = this.props.inputProps[key];
			}
		}

		if (this.props.searchable && !this.props.disabled) {
			input = React.createElement(Input, _extends({ value: this.state.inputValue, onChange: this.handleInputChange, minWidth: '5' }, inputProps));
		} else {
			input = React.createElement(
				'div',
				inputProps,
				' '
			);
		}

		return React.createElement(
			'div',
			{ ref: 'wrapper', className: selectClass },
			React.createElement('input', { type: 'hidden', ref: 'value', name: this.props.name, value: this.state.value, disabled: this.props.disabled }),
			React.createElement(
				'div',
				{ className: 'Select-control', ref: 'control', onKeyDown: this.handleKeyDown, onMouseDown: this.handleMouseDown, onTouchEnd: this.handleMouseDown },
				value,
				input,
				React.createElement('span', { className: 'Select-arrow' }),
				loading,
				clear
			),
			menu
		);
	}

});

module.exports = Select;

},{"./Value":1,"classnames":undefined,"react":undefined,"react-input-autosize":undefined}]},{},[])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9yZWFjdC1jb21wb25lbnQtZ3VscC10YXNrcy9ub2RlX21vZHVsZXMvYnJvd3NlcmlmeS9ub2RlX21vZHVsZXMvYnJvd3Nlci1wYWNrL19wcmVsdWRlLmpzIiwiL1VzZXJzL21hYWlrZS9kZXYvcmVhY3Qtc2VsZWN0L3NyYy9WYWx1ZS5qcyIsIi9Vc2Vycy9tYWFpa2UvZGV2L3JlYWN0LXNlbGVjdC9zcmMvU2VsZWN0LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBOzs7QUNBQSxJQUFJLEtBQUssR0FBRyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUM7O0FBRTdCLElBQUksTUFBTSxHQUFHLEtBQUssQ0FBQyxXQUFXLENBQUM7O0FBRTlCLFlBQVcsRUFBRSxPQUFPOztBQUVwQixVQUFTLEVBQUU7QUFDVixPQUFLLEVBQUUsS0FBSyxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUMsVUFBVTtFQUN4Qzs7QUFFRCxXQUFVLEVBQUUsb0JBQVMsS0FBSyxFQUFFO0FBQzNCLE9BQUssQ0FBQyxlQUFlLEVBQUUsQ0FBQztFQUN4Qjs7QUFFRCxPQUFNLEVBQUUsa0JBQVc7QUFDbEIsTUFBSSxLQUFLLEdBQUcsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUM7O0FBRTdCLE1BQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxnQkFBZ0IsRUFBRTtBQUNoQyxRQUFLLEdBQ0o7O01BQUcsU0FBUyxFQUFDLHNCQUFzQjtBQUNsQyxnQkFBVyxFQUFFLElBQUksQ0FBQyxVQUFVLEFBQUM7QUFDN0IsZUFBVSxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEFBQUM7QUFDMUMsWUFBTyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLEFBQUM7SUFDdEMsS0FBSztJQUNILEFBQ0osQ0FBQztHQUNGOztBQUVELFNBQ0M7O0tBQUssU0FBUyxFQUFDLGFBQWE7R0FDM0I7O01BQU0sU0FBUyxFQUFDLGtCQUFrQjtBQUNqQyxnQkFBVyxFQUFF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TyxHQUFHLE1BQU0sQ0FBQyIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJ2YXIgUmVhY3QgPSByZXF1aXJlKCdyZWFjdCcpO1xuXG52YXIgT3B0aW9uID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdGRpc3BsYXlOYW1lOiAnVmFsdWUnLFxuXG5cdHByb3BUeXBlczoge1xuXHRcdGxhYmVsOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLmlzUmVxdWlyZWRcblx0fSxcblxuXHRibG9ja0V2ZW50OiBmdW5jdGlvbihldmVudCkge1xuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIGxhYmVsID0gdGhpcy5wcm9wcy5sYWJlbDtcblxuXHRcdGlmICh0aGlzLnByb3BzLm9wdGlvbkxhYmVsQ2xpY2spIHtcblx0XHRcdGxhYmVsID0gKFxuXHRcdFx0XHQ8YSBjbGFzc05hbWU9XCJTZWxlY3QtaXRlbS1sYWJlbF9fYVwiXG5cdFx0XHRcdFx0b25Nb3VzZURvd249e3RoaXMuYmxvY2tFdmVudH1cblx0XHRcdFx0XHRvblRvdWNoRW5kPXt0aGlzLnByb3BzLm9uT3B0aW9uTGFiZWxDbGlja31cblx0XHRcdFx0XHRvbkNsaWNrPXt0aGlzLnByb3BzLm9uT3B0aW9uTGFiZWxDbGlja30+XG5cdFx0XHRcdFx0e2xhYmVsfVxuXHRcdFx0XHQ8L2E+XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIlNlbGVjdC1pdGVtXCI+XG5cdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cIlNlbGVjdC1pdGVtLWljb25cIlxuXHRcdFx0XHRcdG9uTW91c2VEb3duPXt0aGlzLmJsb2NrRXZlbnR9XG5cdFx0XHRcdFx0b25DbGljaz17dGhpcy5wcm9wcy5vblJlbW92ZX1cblx0XHRcdFx0XHRvblRvdWNoRW5kPXt0aGlzLnByb3BzLm9uUmVtb3ZlfT4mdGltZXM7PC9zcGFuPlxuXHRcdFx0XHQ8c3BhbiBjbGFzc05hbWU9XCJTZWxlY3QtaXRlbS1sYWJlbFwiPntsYWJlbH08L3NwYW4+XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IE9wdGlvbjtcbiIsInZhciBSZWFjdCA9IHJlcXVpcmUoJ3JlYWN0Jyk7XG52YXIgSW5wdXQgPSByZXF1aXJlKCdyZWFjdC1pbnB1dC1hdXRvc2l6ZScpO1xudmFyIGNsYXNzZXMgPSByZXF1aXJlKCdjbGFzc25hbWVzJyk7XG52YXIgVmFsdWUgPSByZXF1aXJlKCcuL1ZhbHVlJyk7XG5cbnZhciByZXF1ZXN0SWQgPSAwO1xuXG52YXIgU2VsZWN0ID0gUmVhY3QuY3JlYXRlQ2xhc3Moe1xuXG5cdGRpc3BsYXlOYW1lOiAnU2VsZWN0JyxcblxuXHRwcm9wVHlwZXM6IHtcblx0XHR2YWx1ZTogUmVhY3QuUHJvcFR5cGVzLmFueSwgICAgICAgICAgICAgICAgLy8gaW5pdGlhbCBmaWVsZCB2YWx1ZVxuXHRcdG11bHRpOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgICAgICAgICAgICAgICAvLyBtdWx0aS12YWx1ZSBpbnB1dFxuXHRcdGRpc2FibGVkOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgICAgICAgICAgICAvLyB3aGV0aGVyIHRoZSBTZWxlY3QgaXMgZGlzYWJsZWQgb3Igbm90XG5cdFx0b3B0aW9uczogUmVhY3QuUHJvcFR5cGVzLmFycmF5LCAgICAgICAgICAgIC8vIGFycmF5IG9mIG9wdGlvbnNcblx0XHRkZWxpbWl0ZXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsICAgICAgICAgLy8gZGVsaW1pdGVyIHRvIHVzZSB0byBqb2luIG11bHRpcGxlIHZhbHVlc1xuXHRcdGFzeW5jT3B0aW9uczogUmVhY3QuUHJvcFR5cGVzLmZ1bmMsICAgICAgICAvLyBmdW5jdGlvbiB0byBjYWxsIHRvIGdldCBvcHRpb25zXG5cdFx0YXV0b2xvYWQ6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgICAgIC8vIHdoZXRoZXIgdG8gYXV0by1sb2FkIHRoZSBkZWZhdWx0IGFzeW5jIG9wdGlvbnMgc2V0XG5cdFx0cGxhY2Vob2xkZXI6IFJlYWN0LlByb3BUeXBlcy5zdHJpbmcsICAgICAgIC8vIGZpZWxkIHBsYWNlaG9sZGVyLCBkaXNwbGF5ZWQgd2hlbiB0aGVyZSdzIG5vIHZhbHVlXG5cdFx0bm9SZXN1bHRzVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgIC8vIHBsYWNlaG9sZGVyIGRpc3BsYXllZCB3aGVuIHRoZXJlIGFyZSBubyBtYXRjaGluZyBzZWFyY2ggcmVzdWx0c1xuXHRcdGNsZWFyYWJsZTogUmVhY3QuUHJvcFR5cGVzLmJvb2wsICAgICAgICAgICAvLyBzaG91bGQgaXQgYmUgcG9zc2libGUgdG8gcmVzZXQgdmFsdWVcblx0XHRjbGVhclZhbHVlVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgLy8gdGl0bGUgZm9yIHRoZSBcImNsZWFyXCIgY29udHJvbFxuXHRcdGNsZWFyQWxsVGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAvLyB0aXRsZSBmb3IgdGhlIFwiY2xlYXJcIiBjb250cm9sIHdoZW4gbXVsdGk6IHRydWVcblx0XHRzZWFyY2hhYmxlOiBSZWFjdC5Qcm9wVHlwZXMuYm9vbCwgICAgICAgICAgLy8gd2hldGhlciB0byBlbmFibGUgc2VhcmNoaW5nIGZlYXR1cmUgb3Igbm90XG5cdFx0c2VhcmNoUHJvbXB0VGV4dDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgIC8vIGxhYmVsIHRvIHByb21wdCBmb3Igc2VhcmNoIGlucHV0XG5cdFx0bmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAgICAgICAgIC8vIGZpZWxkIG5hbWUsIGZvciBoaWRkZW4gPGlucHV0IC8+IHRhZ1xuXHRcdG9uQ2hhbmdlOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgICAgICAgICAgICAvLyBvbkNoYW5nZSBoYW5kbGVyOiBmdW5jdGlvbihuZXdWYWx1ZSkge31cblx0XHRvbkZvY3VzOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgICAgICAgICAgICAgLy8gb25Gb2N1cyBoYW5kbGVyOiBmdW5jdGlvbihldmVudCkge31cblx0XHRvbkJsdXI6IFJlYWN0LlByb3BUeXBlcy5mdW5jLCAgICAgICAgICAgICAgLy8gb25CbHVyIGhhbmRsZXI6IGZ1bmN0aW9uKGV2ZW50KSB7fVxuXHRcdGNsYXNzTmFtZTogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAgICAvLyBjbGFzc05hbWUgZm9yIHRoZSBvdXRlciBlbGVtZW50XG5cdFx0ZmlsdGVyT3B0aW9uOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgICAgICAgIC8vIG1ldGhvZCB0byBmaWx0ZXIgYSBzaW5nbGUgb3B0aW9uOiBmdW5jdGlvbihvcHRpb24sIGZpbHRlclN0cmluZylcblx0XHRmaWx0ZXJPcHRpb25zOiBSZWFjdC5Qcm9wVHlwZXMuZnVuYywgICAgICAgLy8gbWV0aG9kIHRvIGZpbHRlciB0aGUgb3B0aW9ucyBhcnJheTogZnVuY3Rpb24oW29wdGlvbnNdLCBmaWx0ZXJTdHJpbmcsIFt2YWx1ZXNdKVxuXHRcdG1hdGNoUG9zOiBSZWFjdC5Qcm9wVHlwZXMuc3RyaW5nLCAgICAgICAgICAvLyAoYW55fHN0YXJ0KSBtYXRjaCB0aGUgc3RhcnQgb3IgZW50aXJlIHN0cmluZyB3aGVuIGZpbHRlcmluZ1xuXHRcdG1hdGNoUHJvcDogUmVhY3QuUHJvcFR5cGVzLnN0cmluZywgICAgICAgICAvLyAoYW55fGxhYmVsfHZhbHVlKSB3aGljaCBvcHRpb24gcHJvcGVydHkgdG8gZmlsdGVyIG9uXG5cdFx0aW5wdXRQcm9wczogUmVhY3QuUHJvcFR5cGVzLm9iamVjdCwgICAgICAgIC8vIGN1c3RvbSBhdHRyaWJ1dGVzIGZvciB0aGUgSW5wdXQgKGluIHRoZSBTZWxlY3QtY29udHJvbCkgZS5nOiB7J2RhdGEtZm9vJzogJ2Jhcid9XG5cdFx0YWxsb3dDcmVhdGU6IFJlYWN0LlByb3BUeXBlcy5ib29sLCAgICAgICAgIC8vIHdldGhlciB0byBhbGxvdyBjcmVhdGlvbiBvZiBuZXcgZW50cmllc1xuXHRcdC8qXG5cdFx0KiBBbGxvdyB1c2VyIHRvIG1ha2Ugb3B0aW9uIGxhYmVsIGNsaWNrYWJsZS4gV2hlbiB0aGlzIGhhbmRsZXIgaXMgZGVmaW5lZCB3ZSBzaG91bGRcblx0XHQqIHdyYXAgbGFiZWwgaW50byA8YT5sYWJlbDwvYT4gdGFnLlxuXHRcdCpcblx0XHQqIG9uT3B0aW9uTGFiZWxDbGljayBoYW5kbGVyOiBmdW5jdGlvbiAodmFsdWUsIGV2ZW50KSB7fVxuXHRcdCpcblx0XHQqL1xuXHRcdG9uT3B0aW9uTGFiZWxDbGljazogUmVhY3QuUHJvcFR5cGVzLmZ1bmNcblx0fSxcblxuXHRnZXREZWZhdWx0UHJvcHM6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHR2YWx1ZTogdW5kZWZpbmVkLFxuXHRcdFx0b3B0aW9uczogdW5kZWZpbmVkLFxuXHRcdFx0ZGlzYWJsZWQ6IGZhbHNlLFxuXHRcdFx0ZGVsaW1pdGVyOiAnLCcsXG5cdFx0XHRhc3luY09wdGlvbnM6IHVuZGVmaW5lZCxcblx0XHRcdGF1dG9sb2FkOiB0cnVlLFxuXHRcdFx0cGxhY2Vob2xkZXI6ICdTZWxlY3QuLi4nLFxuXHRcdFx0bm9SZXN1bHRzVGV4dDogJ05vIHJlc3VsdHMgZm91bmQnLFxuXHRcdFx0Y2xlYXJhYmxlOiB0cnVlLFxuXHRcdFx0Y2xlYXJWYWx1ZVRleHQ6ICdDbGVhciB2YWx1ZScsXG5cdFx0XHRjbGVhckFsbFRleHQ6ICdDbGVhciBhbGwnLFxuXHRcdFx0c2VhcmNoYWJsZTogdHJ1ZSxcblx0XHRcdHNlYXJjaFByb21wdFRleHQ6ICdUeXBlIHRvIHNlYXJjaCcsXG5cdFx0XHRuYW1lOiB1bmRlZmluZWQsXG5cdFx0XHRvbkNoYW5nZTogdW5kZWZpbmVkLFxuXHRcdFx0Y2xhc3NOYW1lOiB1bmRlZmluZWQsXG5cdFx0XHRtYXRjaFBvczogJ2FueScsXG5cdFx0XHRtYXRjaFByb3A6ICdhbnknLFxuXHRcdFx0aW5wdXRQcm9wczoge30sXG5cdFx0XHRhbGxvd0NyZWF0ZTogZmFsc2UsXG5cblx0XHRcdG9uT3B0aW9uTGFiZWxDbGljazogdW5kZWZpbmVkXG5cdFx0fTtcblx0fSxcblxuXHRnZXRJbml0aWFsU3RhdGU6IGZ1bmN0aW9uKCkge1xuXHRcdHJldHVybiB7XG5cdFx0XHQvKlxuXHRcdFx0ICogc2V0IGJ5IGdldFN0YXRlRnJvbVZhbHVlIG9uIGNvbXBvbmVudFdpbGxNb3VudDpcblx0XHRcdCAqIC0gdmFsdWVcblx0XHRcdCAqIC0gdmFsdWVzXG5cdFx0XHQgKiAtIGZpbHRlcmVkT3B0aW9uc1xuXHRcdFx0ICogLSBpbnB1dFZhbHVlXG5cdFx0XHQgKiAtIHBsYWNlaG9sZGVyXG5cdFx0XHQgKiAtIGZvY3VzZWRPcHRpb25cblx0XHRcdCovXG5cdFx0XHRvcHRpb25zOiB0aGlzLnByb3BzLm9wdGlvbnMsXG5cdFx0XHRpc0ZvY3VzZWQ6IGZhbHNlLFxuXHRcdFx0aXNPcGVuOiBmYWxzZSxcblx0XHRcdGlzTG9hZGluZzogZmFsc2Vcblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxNb3VudDogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5fb3B0aW9uc0NhY2hlID0ge307XG5cdFx0dGhpcy5fb3B0aW9uc0ZpbHRlclN0cmluZyA9ICcnO1xuXHRcdHRoaXMuc2V0U3RhdGUodGhpcy5nZXRTdGF0ZUZyb21WYWx1ZSh0aGlzLnByb3BzLnZhbHVlKSk7XG5cblx0XHRpZiAodGhpcy5wcm9wcy5hc3luY09wdGlvbnMgJiYgdGhpcy5wcm9wcy5hdXRvbG9hZCkge1xuXHRcdFx0dGhpcy5hdXRvbG9hZEFzeW5jT3B0aW9ucygpO1xuXHRcdH1cblxuXHRcdHZhciBzZWxmID0gdGhpcztcblx0XHR0aGlzLl9jbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlID0gZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRcdGlmICghc2VsZi5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdFx0cmV0dXJuO1xuXHRcdFx0fVxuXHRcdFx0dmFyIG1lbnVFbGVtID0gc2VsZi5yZWZzLnNlbGVjdE1lbnVDb250YWluZXIuZ2V0RE9NTm9kZSgpO1xuXHRcdFx0dmFyIGNvbnRyb2xFbGVtID0gc2VsZi5yZWZzLmNvbnRyb2wuZ2V0RE9NTm9kZSgpO1xuXG5cdFx0XHR2YXIgZXZlbnRPY2N1cmVkT3V0c2lkZU1lbnUgPSBzZWxmLmNsaWNrZWRPdXRzaWRlRWxlbWVudChtZW51RWxlbSwgZXZlbnQpO1xuXHRcdFx0dmFyIGV2ZW50T2NjdXJlZE91dHNpZGVDb250cm9sID0gc2VsZi5jbGlja2VkT3V0c2lkZUVsZW1lbnQoY29udHJvbEVsZW0sIGV2ZW50KTtcblxuXHRcdFx0Ly8gSGlkZSBkcm9wZG93biBtZW51IGlmIGNsaWNrIG9jY3VycmVkIG91dHNpZGUgb2YgbWVudVxuXHRcdFx0aWYgKGV2ZW50T2NjdXJlZE91dHNpZGVNZW51ICYmIGV2ZW50T2NjdXJlZE91dHNpZGVDb250cm9sKSB7XG5cdFx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRcdGlzT3BlbjogZmFsc2Vcblx0XHRcdFx0fSwgc2VsZi5fdW5iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuX2JpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlID0gZnVuY3Rpb24oKSB7XG5cdFx0XHRpZiAoIWRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIgJiYgZG9jdW1lbnQuYXR0YWNoRXZlbnQpIHtcblx0XHRcdFx0ZG9jdW1lbnQuYXR0YWNoRXZlbnQoJ29uY2xpY2snLCB0aGlzLl9jbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoJ2NsaWNrJywgdGhpcy5fY2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0XHR9XG5cdFx0fTtcblxuXHRcdHRoaXMuX3VuYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUgPSBmdW5jdGlvbigpIHtcblx0XHRcdGlmICghZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lciAmJiBkb2N1bWVudC5kZXRhY2hFdmVudCkge1xuXHRcdFx0XHRkb2N1bWVudC5kZXRhY2hFdmVudCgnb25jbGljaycsIHRoaXMuX2Nsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0ZG9jdW1lbnQucmVtb3ZlRXZlbnRMaXN0ZW5lcignY2xpY2snLCB0aGlzLl9jbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHRcdH1cblx0XHR9O1xuXHR9LFxuXG5cdGNvbXBvbmVudFdpbGxVbm1vdW50OiBmdW5jdGlvbigpIHtcblx0XHRjbGVhclRpbWVvdXQodGhpcy5fYmx1clRpbWVvdXQpO1xuXHRcdGNsZWFyVGltZW91dCh0aGlzLl9mb2N1c1RpbWVvdXQpO1xuXG5cdFx0aWYodGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdHRoaXMuX3VuYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUoKTtcblx0XHR9XG5cdH0sXG5cblx0Y29tcG9uZW50V2lsbFJlY2VpdmVQcm9wczogZnVuY3Rpb24obmV3UHJvcHMpIHtcblx0XHRpZiAoSlNPTi5zdHJpbmdpZnkobmV3UHJvcHMub3B0aW9ucykgIT09IEpTT04uc3RyaW5naWZ5KHRoaXMucHJvcHMub3B0aW9ucykpIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRvcHRpb25zOiBuZXdQcm9wcy5vcHRpb25zLFxuXHRcdFx0XHRmaWx0ZXJlZE9wdGlvbnM6IHRoaXMuZmlsdGVyT3B0aW9ucyhuZXdQcm9wcy5vcHRpb25zKVxuXHRcdFx0fSk7XG5cdFx0fVxuXHRcdGlmIChuZXdQcm9wcy52YWx1ZSAhPT0gdGhpcy5zdGF0ZS52YWx1ZSkge1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh0aGlzLmdldFN0YXRlRnJvbVZhbHVlKG5ld1Byb3BzLnZhbHVlLCBuZXdQcm9wcy5vcHRpb25zKSk7XG5cdFx0fVxuXHR9LFxuXG5cdGNvbXBvbmVudERpZFVwZGF0ZTogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGYgPSB0aGlzO1xuXG5cdFx0aWYgKCF0aGlzLnByb3BzLmRpc2FibGVkICYmIHRoaXMuX2ZvY3VzQWZ0ZXJVcGRhdGUpIHtcblx0XHRcdGNsZWFyVGltZW91dCh0aGlzLl9ibHVyVGltZW91dCk7XG5cblx0XHRcdHRoaXMuX2ZvY3VzVGltZW91dCA9IHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG5cdFx0XHRcdHNlbGYuZ2V0SW5wdXROb2RlKCkuZm9jdXMoKTtcblx0XHRcdFx0c2VsZi5fZm9jdXNBZnRlclVwZGF0ZSA9IGZhbHNlO1xuXHRcdFx0fSwgNTApO1xuXHRcdH1cblxuXHRcdGlmICh0aGlzLl9mb2N1c2VkT3B0aW9uUmV2ZWFsKSB7XG5cdFx0XHRpZiAodGhpcy5yZWZzLmZvY3VzZWQgJiYgdGhpcy5yZWZzLm1lbnUpIHtcblx0XHRcdFx0dmFyIGZvY3VzZWRET00gPSB0aGlzLnJlZnMuZm9jdXNlZC5nZXRET01Ob2RlKCk7XG5cdFx0XHRcdHZhciBtZW51RE9NID0gdGhpcy5yZWZzLm1lbnUuZ2V0RE9NTm9kZSgpO1xuXHRcdFx0XHR2YXIgZm9jdXNlZFJlY3QgPSBmb2N1c2VkRE9NLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXHRcdFx0XHR2YXIgbWVudVJlY3QgPSBtZW51RE9NLmdldEJvdW5kaW5nQ2xpZW50UmVjdCgpO1xuXG5cdFx0XHRcdGlmIChmb2N1c2VkUmVjdC5ib3R0b20gPiBtZW51UmVjdC5ib3R0b20gfHxcblx0XHRcdFx0XHRmb2N1c2VkUmVjdC50b3AgPCBtZW51UmVjdC50b3ApIHtcblx0XHRcdFx0XHRtZW51RE9NLnNjcm9sbFRvcCA9IChmb2N1c2VkRE9NLm9mZnNldFRvcCArIGZvY3VzZWRET00uY2xpZW50SGVpZ2h0IC0gbWVudURPTS5vZmZzZXRIZWlnaHQpO1xuXHRcdFx0XHR9XG5cdFx0XHR9XG5cblx0XHRcdHRoaXMuX2ZvY3VzZWRPcHRpb25SZXZlYWwgPSBmYWxzZTtcblx0XHR9XG5cdH0sXG5cblx0Zm9jdXM6IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZ2V0SW5wdXROb2RlKCkuZm9jdXMoKTtcblx0fSxcblxuXHRjbGlja2VkT3V0c2lkZUVsZW1lbnQ6IGZ1bmN0aW9uKGVsZW1lbnQsIGV2ZW50KSB7XG5cdFx0dmFyIGV2ZW50VGFyZ2V0ID0gKGV2ZW50LnRhcmdldCkgPyBldmVudC50YXJnZXQgOiBldmVudC5zcmNFbGVtZW50O1xuXHRcdHdoaWxlIChldmVudFRhcmdldCAhPSBudWxsKSB7XG5cdFx0XHRpZiAoZXZlbnRUYXJnZXQgPT09IGVsZW1lbnQpIHJldHVybiBmYWxzZTtcblx0XHRcdGV2ZW50VGFyZ2V0ID0gZXZlbnRUYXJnZXQub2Zmc2V0UGFyZW50O1xuXHRcdH1cblx0XHRyZXR1cm4gdHJ1ZTtcblx0fSxcblxuXHRnZXRTdGF0ZUZyb21WYWx1ZTogZnVuY3Rpb24odmFsdWUsIG9wdGlvbnMpIHtcblx0XHRpZiAoIW9wdGlvbnMpIHtcblx0XHRcdG9wdGlvbnMgPSB0aGlzLnN0YXRlLm9wdGlvbnM7XG5cdFx0fVxuXG5cdFx0Ly8gcmVzZXQgaW50ZXJuYWwgZmlsdGVyIHN0cmluZ1xuXHRcdHRoaXMuX29wdGlvbnNGaWx0ZXJTdHJpbmcgPSAnJztcblxuXHRcdHZhciB2YWx1ZXMgPSB0aGlzLmluaXRWYWx1ZXNBcnJheSh2YWx1ZSwgb3B0aW9ucyksXG5cdFx0XHRmaWx0ZXJlZE9wdGlvbnMgPSB0aGlzLmZpbHRlck9wdGlvbnMob3B0aW9ucywgdmFsdWVzKTtcblxuXHRcdHJldHVybiB7XG5cdFx0XHR2YWx1ZTogdmFsdWVzLm1hcChmdW5jdGlvbih2KSB7IHJldHVybiB2LnZhbHVlOyB9KS5qb2luKHRoaXMucHJvcHMuZGVsaW1pdGVyKSxcblx0XHRcdHZhbHVlczogdmFsdWVzLFxuXHRcdFx0aW5wdXRWYWx1ZTogJycsXG5cdFx0XHRmaWx0ZXJlZE9wdGlvbnM6IGZpbHRlcmVkT3B0aW9ucyxcblx0XHRcdHBsYWNlaG9sZGVyOiAhdGhpcy5wcm9wcy5tdWx0aSAmJiB2YWx1ZXMubGVuZ3RoID8gdmFsdWVzWzBdLmxhYmVsIDogdGhpcy5wcm9wcy5wbGFjZWhvbGRlcixcblx0XHRcdGZvY3VzZWRPcHRpb246ICF0aGlzLnByb3BzLm11bHRpICYmIHZhbHVlcy5sZW5ndGggPyB2YWx1ZXNbMF0gOiBmaWx0ZXJlZE9wdGlvbnNbMF1cblx0XHR9O1xuXHR9LFxuXG5cdGluaXRWYWx1ZXNBcnJheTogZnVuY3Rpb24odmFsdWVzLCBvcHRpb25zKSB7XG5cdFx0aWYgKCFBcnJheS5pc0FycmF5KHZhbHVlcykpIHtcblx0XHRcdGlmICh0eXBlb2YgdmFsdWVzID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHR2YWx1ZXMgPSB2YWx1ZXMuc3BsaXQodGhpcy5wcm9wcy5kZWxpbWl0ZXIpO1xuXHRcdFx0fSBlbHNlIHtcblx0XHRcdFx0dmFsdWVzID0gdmFsdWVzID8gW3ZhbHVlc10gOiBbXTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHRyZXR1cm4gdmFsdWVzLm1hcChmdW5jdGlvbih2YWwpIHtcblx0XHRcdGlmICh0eXBlb2YgdmFsID09PSAnc3RyaW5nJykge1xuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gb3B0aW9ucykge1xuXHRcdFx0XHRcdGlmIChvcHRpb25zLmhhc093blByb3BlcnR5KGtleSkgJiYgb3B0aW9uc1trZXldICYmIG9wdGlvbnNba2V5XS52YWx1ZSA9PT0gdmFsKSB7XG5cdFx0XHRcdFx0XHRyZXR1cm4gb3B0aW9uc1trZXldO1xuXHRcdFx0XHRcdH1cblx0XHRcdFx0fVxuXHRcdFx0XHRyZXR1cm4geyB2YWx1ZTogdmFsLCBsYWJlbDogdmFsIH07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRyZXR1cm4gdmFsO1xuXHRcdFx0fVxuXHRcdH0pO1xuXHR9LFxuXG5cdHNldFZhbHVlOiBmdW5jdGlvbih2YWx1ZSwgZm9jdXNBZnRlclVwZGF0ZSkge1xuXHRcdGlmIChmb2N1c0FmdGVyVXBkYXRlIHx8IGZvY3VzQWZ0ZXJVcGRhdGUgPT09IHVuZGVmaW5lZCkge1xuXHRcdFx0dGhpcy5fZm9jdXNBZnRlclVwZGF0ZSA9IHRydWU7XG5cdFx0fVxuXHRcdHZhciBuZXdTdGF0ZSA9IHRoaXMuZ2V0U3RhdGVGcm9tVmFsdWUodmFsdWUpO1xuXHRcdG5ld1N0YXRlLmlzT3BlbiA9IGZhbHNlO1xuXHRcdHRoaXMuZmlyZUNoYW5nZUV2ZW50KG5ld1N0YXRlKTtcblx0XHR0aGlzLnNldFN0YXRlKG5ld1N0YXRlKTtcblx0fSxcblxuXHRzZWxlY3RWYWx1ZTogZnVuY3Rpb24odmFsdWUpIHtcblx0XHRpZiAoIXRoaXMucHJvcHMubXVsdGkpIHtcblx0XHRcdHRoaXMuc2V0VmFsdWUodmFsdWUpO1xuXHRcdH0gZWxzZSBpZiAodmFsdWUpIHtcblx0XHRcdHRoaXMuYWRkVmFsdWUodmFsdWUpO1xuXHRcdH1cblx0XHR0aGlzLl91bmJpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKCk7XG5cdH0sXG5cblx0YWRkVmFsdWU6IGZ1bmN0aW9uKHZhbHVlKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0YXRlLnZhbHVlcy5jb25jYXQodmFsdWUpKTtcblx0fSxcblxuXHRwb3BWYWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0YXRlLnZhbHVlcy5zbGljZSgwLCB0aGlzLnN0YXRlLnZhbHVlcy5sZW5ndGggLSAxKSk7XG5cdH0sXG5cblx0cmVtb3ZlVmFsdWU6IGZ1bmN0aW9uKHZhbHVlVG9SZW1vdmUpIHtcblx0XHR0aGlzLnNldFZhbHVlKHRoaXMuc3RhdGUudmFsdWVzLmZpbHRlcihmdW5jdGlvbih2YWx1ZSkge1xuXHRcdFx0cmV0dXJuIHZhbHVlICE9PSB2YWx1ZVRvUmVtb3ZlO1xuXHRcdH0pKTtcblx0fSxcblxuXHRjbGVhclZhbHVlOiBmdW5jdGlvbihldmVudCkge1xuXHRcdC8vIGlmIHRoZSBldmVudCB3YXMgdHJpZ2dlcmVkIGJ5IGEgbW91c2Vkb3duIGFuZCBub3QgdGhlIHByaW1hcnlcblx0XHQvLyBidXR0b24sIGlnbm9yZSBpdC5cblx0XHRpZiAoZXZlbnQgJiYgZXZlbnQudHlwZSA9PT0gJ21vdXNlZG93bicgJiYgZXZlbnQuYnV0dG9uICE9PSAwKSB7XG5cdFx0XHRyZXR1cm47XG5cdFx0fVxuXHRcdHRoaXMuc2V0VmFsdWUobnVsbCk7XG5cdH0sXG5cblx0cmVzZXRWYWx1ZTogZnVuY3Rpb24oKSB7XG5cdFx0dGhpcy5zZXRWYWx1ZSh0aGlzLnN0YXRlLnZhbHVlID09PSAnJyA/IG51bGwgOiB0aGlzLnN0YXRlLnZhbHVlKTtcblx0fSxcblxuXHRnZXRJbnB1dE5vZGU6IGZ1bmN0aW9uICgpIHtcblx0XHR2YXIgaW5wdXQgPSB0aGlzLnJlZnMuaW5wdXQ7XG5cdFx0cmV0dXJuIHRoaXMucHJvcHMuc2VhcmNoYWJsZSA/IGlucHV0IDogaW5wdXQuZ2V0RE9NTm9kZSgpO1xuXHR9LFxuXG5cdGZpcmVDaGFuZ2VFdmVudDogZnVuY3Rpb24obmV3U3RhdGUpIHtcblx0XHRpZiAobmV3U3RhdGUudmFsdWUgIT09IHRoaXMuc3RhdGUudmFsdWUgJiYgdGhpcy5wcm9wcy5vbkNoYW5nZSkge1xuXHRcdFx0dGhpcy5wcm9wcy5vbkNoYW5nZShuZXdTdGF0ZS52YWx1ZSwgbmV3U3RhdGUudmFsdWVzKTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlTW91c2VEb3duOiBmdW5jdGlvbihldmVudCkge1xuXHRcdC8vIGlmIHRoZSBldmVudCB3YXMgdHJpZ2dlcmVkIGJ5IGEgbW91c2Vkb3duIGFuZCBub3QgdGhlIHByaW1hcnlcblx0XHQvLyBidXR0b24sIG9yIGlmIHRoZSBjb21wb25lbnQgaXMgZGlzYWJsZWQsIGlnbm9yZSBpdC5cblx0XHRpZiAodGhpcy5wcm9wcy5kaXNhYmxlZCB8fCAoZXZlbnQudHlwZSA9PT0gJ21vdXNlZG93bicgJiYgZXZlbnQuYnV0dG9uICE9PSAwKSkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdGV2ZW50LnByZXZlbnREZWZhdWx0KCk7XG5cdFx0aWYgKHRoaXMuc3RhdGUuaXNGb2N1c2VkKSB7XG5cdFx0XHRpZiAodGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdFx0aXNPcGVuOiBmYWxzZVxuXHRcdFx0XHR9KTtcblx0XHRcdH1cblx0XHRcdGVsc2UgdGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGlzT3BlbjogdHJ1ZVxuXHRcdFx0fSwgdGhpcy5fYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHRcdH0gZWxzZSB7XG5cdFx0XHR0aGlzLl9vcGVuQWZ0ZXJGb2N1cyA9IHRydWU7XG5cdFx0XHR0aGlzLmdldElucHV0Tm9kZSgpLmZvY3VzKCk7XG5cdFx0fVxuXHR9LFxuXG5cdGhhbmRsZUlucHV0Rm9jdXM6IGZ1bmN0aW9uKGV2ZW50KSB7XG5cdFx0dmFyIG5ld0lzT3BlbiA9IHRoaXMuc3RhdGUuaXNPcGVuIHx8IHRoaXMuX29wZW5BZnRlckZvY3VzO1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0aXNGb2N1c2VkOiB0cnVlLFxuXHRcdFx0aXNPcGVuOiBuZXdJc09wZW5cblx0XHR9LCBmdW5jdGlvbigpIHtcblx0XHRcdGlmKG5ld0lzT3Blbikge1xuXHRcdFx0XHR0aGlzLl9iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSgpO1xuXHRcdFx0fVxuXHRcdFx0ZWxzZSB7XG5cdFx0XHRcdHRoaXMuX3VuYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUoKTtcblx0XHRcdH1cblx0XHR9KTtcblx0XHR0aGlzLl9vcGVuQWZ0ZXJGb2N1cyA9IGZhbHNlO1xuXG5cdFx0aWYgKHRoaXMucHJvcHMub25Gb2N1cykge1xuXHRcdFx0dGhpcy5wcm9wcy5vbkZvY3VzKGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlSW5wdXRCbHVyOiBmdW5jdGlvbihldmVudCkge1xuXHRcdHZhciBzZWxmID0gdGhpcztcblxuXHRcdHRoaXMuX2JsdXJUaW1lb3V0ID0gc2V0VGltZW91dChmdW5jdGlvbigpIHtcblx0XHRcdGlmIChzZWxmLl9mb2N1c0FmdGVyVXBkYXRlKSByZXR1cm47XG5cblx0XHRcdHNlbGYuc2V0U3RhdGUoe1xuXHRcdFx0XHRpc0ZvY3VzZWQ6IGZhbHNlXG5cdFx0XHR9KTtcblx0XHR9LCA1MCk7XG5cblx0XHRpZiAodGhpcy5wcm9wcy5vbkJsdXIpIHtcblx0XHRcdHRoaXMucHJvcHMub25CbHVyKGV2ZW50KTtcblx0XHR9XG5cdH0sXG5cblx0aGFuZGxlS2V5RG93bjogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHRpZiAodGhpcy5zdGF0ZS5kaXNhYmxlZCkgcmV0dXJuO1xuXG5cdFx0c3dpdGNoIChldmVudC5rZXlDb2RlKSB7XG5cblx0XHRcdGNhc2UgODogLy8gYmFja3NwYWNlXG5cdFx0XHRcdGlmICghdGhpcy5zdGF0ZS5pbnB1dFZhbHVlKSB7XG5cdFx0XHRcdFx0dGhpcy5wb3BWYWx1ZSgpO1xuXHRcdFx0XHR9XG5cdFx0XHRyZXR1cm47XG5cblx0XHRcdGNhc2UgOTogLy8gdGFiXG5cdFx0XHRcdGlmIChldmVudC5zaGlmdEtleSB8fCAhdGhpcy5zdGF0ZS5pc09wZW4gfHwgIXRoaXMuc3RhdGUuZm9jdXNlZE9wdGlvbikge1xuXHRcdFx0XHRcdHJldHVybjtcblx0XHRcdFx0fVxuXHRcdFx0XHR0aGlzLnNlbGVjdEZvY3VzZWRPcHRpb24oKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDEzOiAvLyBlbnRlclxuXHRcdFx0XHR0aGlzLnNlbGVjdEZvY3VzZWRPcHRpb24oKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDI3OiAvLyBlc2NhcGVcblx0XHRcdFx0aWYgKHRoaXMuc3RhdGUuaXNPcGVuKSB7XG5cdFx0XHRcdFx0dGhpcy5yZXNldFZhbHVlKCk7XG5cdFx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdFx0dGhpcy5jbGVhclZhbHVlKCk7XG5cdFx0XHRcdH1cblx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDM4OiAvLyB1cFxuXHRcdFx0XHR0aGlzLmZvY3VzUHJldmlvdXNPcHRpb24oKTtcblx0XHRcdGJyZWFrO1xuXG5cdFx0XHRjYXNlIDQwOiAvLyBkb3duXG5cdFx0XHRcdHRoaXMuZm9jdXNOZXh0T3B0aW9uKCk7XG5cdFx0XHRicmVhaztcblxuXHRcdFx0Y2FzZSAxODg6IC8vICxcblx0XHRcdFx0aWYgKHRoaXMucHJvcHMuYWxsb3dDcmVhdGUpIHtcblx0XHRcdFx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHRcdFx0XHRcdGV2ZW50LnN0b3BQcm9wYWdhdGlvbigpO1xuXHRcdFx0XHRcdHRoaXMuc2VsZWN0Rm9jdXNlZE9wdGlvbigpO1xuXHRcdFx0XHR9O1xuXHRcdFx0YnJlYWs7XG5cblx0XHRcdGRlZmF1bHQ6IHJldHVybjtcblx0XHR9XG5cblx0XHRldmVudC5wcmV2ZW50RGVmYXVsdCgpO1xuXHR9LFxuXG5cdC8vIEVuc3VyZXMgdGhhdCB0aGUgY3VycmVudGx5IGZvY3VzZWQgb3B0aW9uIGlzIGF2YWlsYWJsZSBpbiBmaWx0ZXJlZE9wdGlvbnMuXG5cdC8vIElmIG5vdCwgcmV0dXJucyB0aGUgZmlyc3QgYXZhaWxhYmxlIG9wdGlvbi5cblx0X2dldE5ld0ZvY3VzZWRPcHRpb246IGZ1bmN0aW9uKGZpbHRlcmVkT3B0aW9ucykge1xuXHRcdGZvciAodmFyIGtleSBpbiBmaWx0ZXJlZE9wdGlvbnMpIHtcblx0XHRcdGlmIChmaWx0ZXJlZE9wdGlvbnMuaGFzT3duUHJvcGVydHkoa2V5KSAmJiBmaWx0ZXJlZE9wdGlvbnNba2V5XSA9PT0gdGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uKSB7XG5cdFx0XHRcdHJldHVybiBmaWx0ZXJlZE9wdGlvbnNba2V5XTtcblx0XHRcdH1cblx0XHR9XG5cdFx0cmV0dXJuIGZpbHRlcmVkT3B0aW9uc1swXTtcblx0fSxcblxuXHRoYW5kbGVJbnB1dENoYW5nZTogZnVuY3Rpb24oZXZlbnQpIHtcblx0XHQvLyBhc3NpZ24gYW4gaW50ZXJuYWwgdmFyaWFibGUgYmVjYXVzZSB3ZSBuZWVkIHRvIHVzZVxuXHRcdC8vIHRoZSBsYXRlc3QgdmFsdWUgYmVmb3JlIHNldFN0YXRlKCkgaGFzIGNvbXBsZXRlZC5cblx0XHR0aGlzLl9vcHRpb25zRmlsdGVyU3RyaW5nID0gZXZlbnQudGFyZ2V0LnZhbHVlO1xuXG5cdFx0aWYgKHRoaXMucHJvcHMuYXN5bmNPcHRpb25zKSB7XG5cdFx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdFx0aXNMb2FkaW5nOiB0cnVlLFxuXHRcdFx0XHRpbnB1dFZhbHVlOiBldmVudC50YXJnZXQudmFsdWVcblx0XHRcdH0pO1xuXHRcdFx0dGhpcy5sb2FkQXN5bmNPcHRpb25zKGV2ZW50LnRhcmdldC52YWx1ZSwge1xuXHRcdFx0XHRpc0xvYWRpbmc6IGZhbHNlLFxuXHRcdFx0XHRpc09wZW46IHRydWVcblx0XHRcdH0sIHRoaXMuX2JpbmRDbG9zZU1lbnVJZkNsaWNrZWRPdXRzaWRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGZpbHRlcmVkT3B0aW9ucyA9IHRoaXMuZmlsdGVyT3B0aW9ucyh0aGlzLnN0YXRlLm9wdGlvbnMpO1xuXHRcdFx0dGhpcy5zZXRTdGF0ZSh7XG5cdFx0XHRcdGlzT3BlbjogdHJ1ZSxcblx0XHRcdFx0aW5wdXRWYWx1ZTogZXZlbnQudGFyZ2V0LnZhbHVlLFxuXHRcdFx0XHRmaWx0ZXJlZE9wdGlvbnM6IGZpbHRlcmVkT3B0aW9ucyxcblx0XHRcdFx0Zm9jdXNlZE9wdGlvbjogdGhpcy5fZ2V0TmV3Rm9jdXNlZE9wdGlvbihmaWx0ZXJlZE9wdGlvbnMpXG5cdFx0XHR9LCB0aGlzLl9iaW5kQ2xvc2VNZW51SWZDbGlja2VkT3V0c2lkZSk7XG5cdFx0fVxuXHR9LFxuXG5cdGF1dG9sb2FkQXN5bmNPcHRpb25zOiBmdW5jdGlvbigpIHtcblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5sb2FkQXN5bmNPcHRpb25zKCcnLCB7fSwgZnVuY3Rpb24gKCkge1xuXHRcdFx0Ly8gdXBkYXRlIHdpdGggZmV0Y2hlZCBidXQgZG9uJ3QgZm9jdXNcblx0XHRcdHNlbGYuc2V0VmFsdWUoc2VsZi5wcm9wcy52YWx1ZSwgZmFsc2UpO1xuXHRcdH0pO1xuXHR9LFxuXG5cdGxvYWRBc3luY09wdGlvbnM6IGZ1bmN0aW9uKGlucHV0LCBzdGF0ZSwgY2FsbGJhY2spIHtcblx0XHR2YXIgdGhpc1JlcXVlc3RJZCA9IHRoaXMuX2N1cnJlbnRSZXF1ZXN0SWQgPSByZXF1ZXN0SWQrKztcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDw9IGlucHV0Lmxlbmd0aDsgaSsrKSB7XG5cdFx0XHR2YXIgY2FjaGVLZXkgPSBpbnB1dC5zbGljZSgwLCBpKTtcblx0XHRcdGlmICh0aGlzLl9vcHRpb25zQ2FjaGVbY2FjaGVLZXldICYmIChpbnB1dCA9PT0gY2FjaGVLZXkgfHwgdGhpcy5fb3B0aW9uc0NhY2hlW2NhY2hlS2V5XS5jb21wbGV0ZSkpIHtcblx0XHRcdFx0dmFyIG9wdGlvbnMgPSB0aGlzLl9vcHRpb25zQ2FjaGVbY2FjaGVLZXldLm9wdGlvbnM7XG5cdFx0XHRcdHZhciBmaWx0ZXJlZE9wdGlvbnMgPSB0aGlzLmZpbHRlck9wdGlvbnMob3B0aW9ucyk7XG5cblx0XHRcdFx0dmFyIG5ld1N0YXRlID0ge1xuXHRcdFx0XHRcdG9wdGlvbnM6IG9wdGlvbnMsXG5cdFx0XHRcdFx0ZmlsdGVyZWRPcHRpb25zOiBmaWx0ZXJlZE9wdGlvbnMsXG5cdFx0XHRcdFx0Zm9jdXNlZE9wdGlvbjogdGhpcy5fZ2V0TmV3Rm9jdXNlZE9wdGlvbihmaWx0ZXJlZE9wdGlvbnMpXG5cdFx0XHRcdH07XG5cdFx0XHRcdGZvciAodmFyIGtleSBpbiBzdGF0ZSkge1xuXHRcdFx0XHRcdGlmIChzdGF0ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0XHRuZXdTdGF0ZVtrZXldID0gc3RhdGVba2V5XTtcblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdFx0dGhpcy5zZXRTdGF0ZShuZXdTdGF0ZSk7XG5cdFx0XHRcdGlmKGNhbGxiYWNrKSBjYWxsYmFjayh7fSk7XG5cdFx0XHRcdHJldHVybjtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR2YXIgc2VsZiA9IHRoaXM7XG5cdFx0dGhpcy5wcm9wcy5hc3luY09wdGlvbnMoaW5wdXQsIGZ1bmN0aW9uKGVyciwgZGF0YSkge1xuXG5cdFx0XHRpZiAoZXJyKSB0aHJvdyBlcnI7XG5cblx0XHRcdHNlbGYuX29wdGlvbnNDYWNoZVtpbnB1dF0gPSBkYXRhO1xuXG5cdFx0XHRpZiAodGhpc1JlcXVlc3RJZCAhPT0gc2VsZi5fY3VycmVudFJlcXVlc3RJZCkge1xuXHRcdFx0XHRyZXR1cm47XG5cdFx0XHR9XG5cdFx0XHR2YXIgZmlsdGVyZWRPcHRpb25zID0gc2VsZi5maWx0ZXJPcHRpb25zKGRhdGEub3B0aW9ucyk7XG5cblx0XHRcdHZhciBuZXdTdGF0ZSA9IHtcblx0XHRcdFx0b3B0aW9uczogZGF0YS5vcHRpb25zLFxuXHRcdFx0XHRmaWx0ZXJlZE9wdGlvbnM6IGZpbHRlcmVkT3B0aW9ucyxcblx0XHRcdFx0Zm9jdXNlZE9wdGlvbjogc2VsZi5fZ2V0TmV3Rm9jdXNlZE9wdGlvbihmaWx0ZXJlZE9wdGlvbnMpXG5cdFx0XHR9O1xuXHRcdFx0Zm9yICh2YXIga2V5IGluIHN0YXRlKSB7XG5cdFx0XHRcdGlmIChzdGF0ZS5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0bmV3U3RhdGVba2V5XSA9IHN0YXRlW2tleV07XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHRcdHNlbGYuc2V0U3RhdGUobmV3U3RhdGUpO1xuXG5cdFx0XHRpZihjYWxsYmFjaykgY2FsbGJhY2soe30pO1xuXG5cdFx0fSk7XG5cdH0sXG5cblx0ZmlsdGVyT3B0aW9uczogZnVuY3Rpb24ob3B0aW9ucywgdmFsdWVzKSB7XG5cdFx0aWYgKCF0aGlzLnByb3BzLnNlYXJjaGFibGUpIHtcblx0XHRcdHJldHVybiBvcHRpb25zO1xuXHRcdH1cblxuXHRcdHZhciBmaWx0ZXJWYWx1ZSA9IHRoaXMuX29wdGlvbnNGaWx0ZXJTdHJpbmc7XG5cdFx0dmFyIGV4Y2x1ZGUgPSAodmFsdWVzIHx8IHRoaXMuc3RhdGUudmFsdWVzKS5tYXAoZnVuY3Rpb24oaSkge1xuXHRcdFx0cmV0dXJuIGkudmFsdWU7XG5cdFx0fSk7XG5cdFx0aWYgKHRoaXMucHJvcHMuZmlsdGVyT3B0aW9ucykge1xuXHRcdFx0cmV0dXJuIHRoaXMucHJvcHMuZmlsdGVyT3B0aW9ucy5jYWxsKHRoaXMsIG9wdGlvbnMsIGZpbHRlclZhbHVlLCBleGNsdWRlKTtcblx0XHR9IGVsc2Uge1xuXHRcdFx0dmFyIGZpbHRlck9wdGlvbiA9IGZ1bmN0aW9uKG9wKSB7XG5cdFx0XHRcdGlmICh0aGlzLnByb3BzLm11bHRpICYmIGV4Y2x1ZGUuaW5kZXhPZihvcC52YWx1ZSkgPiAtMSkgcmV0dXJuIGZhbHNlO1xuXHRcdFx0XHRpZiAodGhpcy5wcm9wcy5maWx0ZXJPcHRpb24pIHJldHVybiB0aGlzLnByb3BzLmZpbHRlck9wdGlvbi5jYWxsKHRoaXMsIG9wLCBmaWx0ZXJWYWx1ZSk7XG5cdFx0XHRcdHZhciB2YWx1ZVRlc3QgPSBTdHJpbmcob3AudmFsdWUpLCBsYWJlbFRlc3QgPSBTdHJpbmcob3AubGFiZWwpO1xuXHRcdFx0XHRyZXR1cm4gIWZpbHRlclZhbHVlIHx8ICh0aGlzLnByb3BzLm1hdGNoUG9zID09PSAnc3RhcnQnKSA/IChcblx0XHRcdFx0XHQodGhpcy5wcm9wcy5tYXRjaFByb3AgIT09ICdsYWJlbCcgJiYgdmFsdWVUZXN0LnRvTG93ZXJDYXNlKCkuc3Vic3RyKDAsIGZpbHRlclZhbHVlLmxlbmd0aCkgPT09IGZpbHRlclZhbHVlKSB8fFxuXHRcdFx0XHRcdCh0aGlzLnByb3BzLm1hdGNoUHJvcCAhPT0gJ3ZhbHVlJyAmJiBsYWJlbFRlc3QudG9Mb3dlckNhc2UoKS5zdWJzdHIoMCwgZmlsdGVyVmFsdWUubGVuZ3RoKSA9PT0gZmlsdGVyVmFsdWUpXG5cdFx0XHRcdCkgOiAoXG5cdFx0XHRcdFx0KHRoaXMucHJvcHMubWF0Y2hQcm9wICE9PSAnbGFiZWwnICYmIHZhbHVlVGVzdC50b0xvd2VyQ2FzZSgpLmluZGV4T2YoZmlsdGVyVmFsdWUudG9Mb3dlckNhc2UoKSkgPj0gMCkgfHxcblx0XHRcdFx0XHQodGhpcy5wcm9wcy5tYXRjaFByb3AgIT09ICd2YWx1ZScgJiYgbGFiZWxUZXN0LnRvTG93ZXJDYXNlKCkuaW5kZXhPZihmaWx0ZXJWYWx1ZS50b0xvd2VyQ2FzZSgpKSA+PSAwKVxuXHRcdFx0XHQpO1xuXHRcdFx0fTtcblx0XHRcdHJldHVybiAob3B0aW9ucyB8fCBbXSkuZmlsdGVyKGZpbHRlck9wdGlvbiwgdGhpcyk7XG5cdFx0fVxuXHR9LFxuXG5cdHNlbGVjdEZvY3VzZWRPcHRpb246IGZ1bmN0aW9uKCkge1xuXHRcdGlmICh0aGlzLnByb3BzLmFsbG93Q3JlYXRlICYmICF0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24pIHtcblx0XHRcdHJldHVybiB0aGlzLnNlbGVjdFZhbHVlKHRoaXMuc3RhdGUuaW5wdXRWYWx1ZSk7XG5cdFx0fTtcblx0XHRyZXR1cm4gdGhpcy5zZWxlY3RWYWx1ZSh0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24pO1xuXHR9LFxuXG5cdGZvY3VzT3B0aW9uOiBmdW5jdGlvbihvcCkge1xuXHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0Zm9jdXNlZE9wdGlvbjogb3Bcblx0XHR9KTtcblx0fSxcblxuXHRmb2N1c05leHRPcHRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZm9jdXNBZGphY2VudE9wdGlvbignbmV4dCcpO1xuXHR9LFxuXG5cdGZvY3VzUHJldmlvdXNPcHRpb246IGZ1bmN0aW9uKCkge1xuXHRcdHRoaXMuZm9jdXNBZGphY2VudE9wdGlvbigncHJldmlvdXMnKTtcblx0fSxcblxuXHRmb2N1c0FkamFjZW50T3B0aW9uOiBmdW5jdGlvbihkaXIpIHtcblx0XHR0aGlzLl9mb2N1c2VkT3B0aW9uUmV2ZWFsID0gdHJ1ZTtcblxuXHRcdHZhciBvcHMgPSB0aGlzLnN0YXRlLmZpbHRlcmVkT3B0aW9ucztcblxuXHRcdGlmICghdGhpcy5zdGF0ZS5pc09wZW4pIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRpc09wZW46IHRydWUsXG5cdFx0XHRcdGlucHV0VmFsdWU6ICcnLFxuXHRcdFx0XHRmb2N1c2VkT3B0aW9uOiB0aGlzLnN0YXRlLmZvY3VzZWRPcHRpb24gfHwgb3BzW2RpciA9PT0gJ25leHQnID8gMCA6IG9wcy5sZW5ndGggLSAxXVxuXHRcdFx0fSwgdGhpcy5fYmluZENsb3NlTWVudUlmQ2xpY2tlZE91dHNpZGUpO1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdGlmICghb3BzLmxlbmd0aCkge1xuXHRcdFx0cmV0dXJuO1xuXHRcdH1cblxuXHRcdHZhciBmb2N1c2VkSW5kZXggPSAtMTtcblxuXHRcdGZvciAodmFyIGkgPSAwOyBpIDwgb3BzLmxlbmd0aDsgaSsrKSB7XG5cdFx0XHRpZiAodGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uID09PSBvcHNbaV0pIHtcblx0XHRcdFx0Zm9jdXNlZEluZGV4ID0gaTtcblx0XHRcdFx0YnJlYWs7XG5cdFx0XHR9XG5cdFx0fVxuXG5cdFx0dmFyIGZvY3VzZWRPcHRpb24gPSBvcHNbMF07XG5cblx0XHRpZiAoZGlyID09PSAnbmV4dCcgJiYgZm9jdXNlZEluZGV4ID4gLTEgJiYgZm9jdXNlZEluZGV4IDwgb3BzLmxlbmd0aCAtIDEpIHtcblx0XHRcdGZvY3VzZWRPcHRpb24gPSBvcHNbZm9jdXNlZEluZGV4ICsgMV07XG5cdFx0fSBlbHNlIGlmIChkaXIgPT09ICdwcmV2aW91cycpIHtcblx0XHRcdGlmIChmb2N1c2VkSW5kZXggPiAwKSB7XG5cdFx0XHRcdGZvY3VzZWRPcHRpb24gPSBvcHNbZm9jdXNlZEluZGV4IC0gMV07XG5cdFx0XHR9IGVsc2Uge1xuXHRcdFx0XHRmb2N1c2VkT3B0aW9uID0gb3BzW29wcy5sZW5ndGggLSAxXTtcblx0XHRcdH1cblx0XHR9XG5cblx0XHR0aGlzLnNldFN0YXRlKHtcblx0XHRcdGZvY3VzZWRPcHRpb246IGZvY3VzZWRPcHRpb25cblx0XHR9KTtcblxuXHR9LFxuXG5cdHVuZm9jdXNPcHRpb246IGZ1bmN0aW9uKG9wKSB7XG5cdFx0aWYgKHRoaXMuc3RhdGUuZm9jdXNlZE9wdGlvbiA9PT0gb3ApIHtcblx0XHRcdHRoaXMuc2V0U3RhdGUoe1xuXHRcdFx0XHRmb2N1c2VkT3B0aW9uOiBudWxsXG5cdFx0XHR9KTtcblx0XHR9XG5cdH0sXG5cblx0YnVpbGRNZW51OiBmdW5jdGlvbigpIHtcblx0XHR2YXIgZm9jdXNlZFZhbHVlID0gdGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uID8gdGhpcy5zdGF0ZS5mb2N1c2VkT3B0aW9uLnZhbHVlIDogbnVsbDtcblxuXHRcdGlmKHRoaXMuc3RhdGUuZmlsdGVyZWRPcHRpb25zLmxlbmd0aCA+IDApIHtcblx0XHRcdGZvY3VzZWRWYWx1ZSA9IGZvY3VzZWRWYWx1ZSA9PSBudWxsID8gdGhpcy5zdGF0ZS5maWx0ZXJlZE9wdGlvbnNbMF0gOiBmb2N1c2VkVmFsdWU7XG5cdFx0fVxuXHRcdC8vIEFkZCB0aGUgY3VycmVudCB2YWx1ZSB0byB0aGUgZmlsdGVyZWQgb3B0aW9ucyBpbiBsYXN0IHJlc29ydFxuXHRcdGlmICh0aGlzLnByb3BzLmFsbG93Q3JlYXRlICYmICF0aGlzLnN0YXRlLmZpbHRlcmVkT3B0aW9ucy5sZW5ndGgpIHtcblx0XHRcdHZhciBpbnB1dFZhbHVlID0gdGhpcy5zdGF0ZS5pbnB1dFZhbHVlO1xuXHRcdFx0dGhpcy5zdGF0ZS5maWx0ZXJlZE9wdGlvbnMucHVzaCh7XG5cdFx0XHRcdHZhbHVlOiBpbnB1dFZhbHVlLFxuXHRcdFx0XHRsYWJlbDogaW5wdXRWYWx1ZSxcblx0XHRcdFx0Y3JlYXRlOiB0cnVlXG5cdFx0XHR9KVxuXHRcdH07XG5cblx0XHR2YXIgb3BzID0gT2JqZWN0LmtleXModGhpcy5zdGF0ZS5maWx0ZXJlZE9wdGlvbnMpLm1hcChmdW5jdGlvbihrZXkpIHtcblx0XHRcdHZhciBvcCA9IHRoaXMuc3RhdGUuZmlsdGVyZWRPcHRpb25zW2tleV07XG5cdFx0XHR2YXIgaXNGb2N1c2VkID0gZm9jdXNlZFZhbHVlID09PSBvcC52YWx1ZTtcblxuXHRcdFx0dmFyIG9wdGlvbkNsYXNzID0gY2xhc3Nlcyh7XG5cdFx0XHRcdCdTZWxlY3Qtb3B0aW9uJzogdHJ1ZSxcblx0XHRcdFx0J2lzLWZvY3VzZWQnOiBpc0ZvY3VzZWQsXG5cdFx0XHRcdCdpcy1kaXNhYmxlZCc6IG9wLmRpc2FibGVkXG5cdFx0XHR9KTtcblxuXHRcdFx0dmFyIHJlZiA9IGlzRm9jdXNlZCA/ICdmb2N1c2VkJyA6IG51bGw7XG5cblx0XHRcdHZhciBtb3VzZUVudGVyID0gdGhpcy5mb2N1c09wdGlvbi5iaW5kKHRoaXMsIG9wKTtcblx0XHRcdHZhciBtb3VzZUxlYXZlID0gdGhpcy51bmZvY3VzT3B0aW9uLmJpbmQodGhpcywgb3ApO1xuXHRcdFx0dmFyIG1vdXNlRG93biA9IHRoaXMuc2VsZWN0VmFsdWUuYmluZCh0aGlzLCBvcCk7XG5cblx0XHRcdGlmIChvcC5kaXNhYmxlZCkge1xuXHRcdFx0XHRyZXR1cm4gPGRpdiByZWY9e3JlZn0ga2V5PXsnb3B0aW9uLScgKyBvcC52YWx1ZX0gY2xhc3NOYW1lPXtvcHRpb25DbGFzc30+e29wLmxhYmVsfTwvZGl2Pjtcblx0XHRcdH0gZWxzZSB7XG5cdFx0XHRcdHJldHVybiA8ZGl2IHJlZj17cmVmfSBrZXk9eydvcHRpb24tJyArIG9wLnZhbHVlfSBjbGFzc05hbWU9e29wdGlvbkNsYXNzfSBvbk1vdXNlRW50ZXI9e21vdXNlRW50ZXJ9IG9uTW91c2VMZWF2ZT17bW91c2VMZWF2ZX0gb25Nb3VzZURvd249e21vdXNlRG93bn0gb25DbGljaz17bW91c2VEb3dufT57IG9wLmNyZWF0ZSA/IFwiQWRkIFwiK29wLmxhYmVsK1wiID9cIiA6IG9wLmxhYmVsfTwvZGl2Pjtcblx0XHRcdH1cblx0XHR9LCB0aGlzKTtcblxuXHRcdHJldHVybiBvcHMubGVuZ3RoID8gb3BzIDogKFxuXHRcdFx0PGRpdiBjbGFzc05hbWU9XCJTZWxlY3Qtbm9yZXN1bHRzXCI+XG5cdFx0XHRcdHt0aGlzLnByb3BzLmFzeW5jT3B0aW9ucyAmJiAhdGhpcy5zdGF0ZS5pbnB1dFZhbHVlID8gdGhpcy5wcm9wcy5zZWFyY2hQcm9tcHRUZXh0IDogdGhpcy5wcm9wcy5ub1Jlc3VsdHNUZXh0fVxuXHRcdFx0PC9kaXY+XG5cdFx0KTtcblx0fSxcblxuXHRoYW5kbGVPcHRpb25MYWJlbENsaWNrOiBmdW5jdGlvbiAodmFsdWUsIGV2ZW50KSB7XG5cdFx0dmFyIGhhbmRsZXIgPSB0aGlzLnByb3BzLm9uT3B0aW9uTGFiZWxDbGljaztcblxuXHRcdGlmIChoYW5kbGVyKSB7XG5cdFx0XHRoYW5kbGVyKHZhbHVlLCBldmVudCk7XG5cdFx0fVxuXHR9LFxuXG5cdHJlbmRlcjogZnVuY3Rpb24oKSB7XG5cdFx0dmFyIHNlbGVjdENsYXNzID0gY2xhc3NlcygnU2VsZWN0JywgdGhpcy5wcm9wcy5jbGFzc05hbWUsIHtcblx0XHRcdCdpcy1tdWx0aSc6IHRoaXMucHJvcHMubXVsdGksXG5cdFx0XHQnaXMtc2VhcmNoYWJsZSc6IHRoaXMucHJvcHMuc2VhcmNoYWJsZSxcblx0XHRcdCdpcy1vcGVuJzogdGhpcy5zdGF0ZS5pc09wZW4sXG5cdFx0XHQnaXMtZm9jdXNlZCc6IHRoaXMuc3RhdGUuaXNGb2N1c2VkLFxuXHRcdFx0J2lzLWxvYWRpbmcnOiB0aGlzLnN0YXRlLmlzTG9hZGluZyxcblx0XHRcdCdpcy1kaXNhYmxlZCc6IHRoaXMucHJvcHMuZGlzYWJsZWQsXG5cdFx0XHQnaGFzLXZhbHVlJzogdGhpcy5zdGF0ZS52YWx1ZVxuXHRcdH0pO1xuXG5cdFx0dmFyIHZhbHVlID0gW107XG5cblx0XHRpZiAodGhpcy5wcm9wcy5tdWx0aSkge1xuXHRcdFx0dGhpcy5zdGF0ZS52YWx1ZXMuZm9yRWFjaChmdW5jdGlvbih2YWwpIHtcblx0XHRcdFx0dmFyIHByb3BzID0ge1xuXHRcdFx0XHRcdGtleTogdmFsLnZhbHVlLFxuXHRcdFx0XHRcdG9wdGlvbkxhYmVsQ2xpY2s6ICEhdGhpcy5wcm9wcy5vbk9wdGlvbkxhYmVsQ2xpY2ssXG5cdFx0XHRcdFx0b25PcHRpb25MYWJlbENsaWNrOiB0aGlzLmhhbmRsZU9wdGlvbkxhYmVsQ2xpY2suYmluZCh0aGlzLCB2YWwpLFxuXHRcdFx0XHRcdG9uUmVtb3ZlOiB0aGlzLnJlbW92ZVZhbHVlLmJpbmQodGhpcywgdmFsKVxuXHRcdFx0XHR9O1xuXHRcdFx0XHRmb3IgKHZhciBrZXkgaW4gdmFsKSB7XG5cdFx0XHRcdFx0aWYgKHZhbC5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdFx0XHRwcm9wc1trZXldID0gdmFsW2tleV07XG5cdFx0XHRcdFx0fVxuXHRcdFx0XHR9XG5cdFx0XHRcdHZhbHVlLnB1c2goPFZhbHVlIHsuLi5wcm9wc30gLz4pO1xuXHRcdFx0fSwgdGhpcyk7XG5cdFx0fVxuXG5cdFx0aWYgKHRoaXMucHJvcHMuZGlzYWJsZWQgfHwgKCF0aGlzLnN0YXRlLmlucHV0VmFsdWUgJiYgKCF0aGlzLnByb3BzLm11bHRpIHx8ICF2YWx1ZS5sZW5ndGgpKSkge1xuXHRcdFx0dmFsdWUucHVzaCg8ZGl2IGNsYXNzTmFtZT1cIlNlbGVjdC1wbGFjZWhvbGRlclwiIGtleT1cInBsYWNlaG9sZGVyXCI+e3RoaXMuc3RhdGUucGxhY2Vob2xkZXJ9PC9kaXY+KTtcblx0XHR9XG5cblx0XHR2YXIgbG9hZGluZyA9IHRoaXMuc3RhdGUuaXNMb2FkaW5nID8gPHNwYW4gY2xhc3NOYW1lPVwiU2VsZWN0LWxvYWRpbmdcIiBhcmlhLWhpZGRlbj1cInRydWVcIiAvPiA6IG51bGw7XG5cdFx0dmFyIGNsZWFyID0gdGhpcy5wcm9wcy5jbGVhcmFibGUgJiYgdGhpcy5zdGF0ZS52YWx1ZSAmJiAhdGhpcy5wcm9wcy5kaXNhYmxlZCA/IDxzcGFuIGNsYXNzTmFtZT1cIlNlbGVjdC1jbGVhclwiIHRpdGxlPXt0aGlzLnByb3BzLm11bHRpID8gdGhpcy5wcm9wcy5jbGVhckFsbFRleHQgOiB0aGlzLnByb3BzLmNsZWFyVmFsdWVUZXh0fSBhcmlhLWxhYmVsPXt0aGlzLnByb3BzLm11bHRpID8gdGhpcy5wcm9wcy5jbGVhckFsbFRleHQgOiB0aGlzLnByb3BzLmNsZWFyVmFsdWVUZXh0fSBvbk1vdXNlRG93bj17dGhpcy5jbGVhclZhbHVlfSBvbkNsaWNrPXt0aGlzLmNsZWFyVmFsdWV9IGRhbmdlcm91c2x5U2V0SW5uZXJIVE1MPXt7IF9faHRtbDogJyZ0aW1lczsnIH19IC8+IDogbnVsbDtcblxuXHRcdHZhciBtZW51O1xuXHRcdHZhciBtZW51UHJvcHM7XG5cdFx0aWYgKHRoaXMuc3RhdGUuaXNPcGVuKSB7XG5cdFx0XHRtZW51UHJvcHMgPSB7XG5cdFx0XHRcdHJlZjogJ21lbnUnLFxuXHRcdFx0XHRjbGFzc05hbWU6ICdTZWxlY3QtbWVudSdcblx0XHRcdH07XG5cdFx0XHRpZiAodGhpcy5wcm9wcy5tdWx0aSkge1xuXHRcdFx0XHRtZW51UHJvcHMub25Nb3VzZURvd24gPSB0aGlzLmhhbmRsZU1vdXNlRG93bjtcblx0XHRcdH1cblx0XHRcdG1lbnUgPSAoXG5cdFx0XHRcdDxkaXYgcmVmPVwic2VsZWN0TWVudUNvbnRhaW5lclwiIGNsYXNzTmFtZT1cIlNlbGVjdC1tZW51LW91dGVyXCI+XG5cdFx0XHRcdFx0PGRpdiB7Li4ubWVudVByb3BzfT57dGhpcy5idWlsZE1lbnUoKX08L2Rpdj5cblx0XHRcdFx0PC9kaXY+XG5cdFx0XHQpO1xuXHRcdH1cblxuXHRcdHZhciBpbnB1dDtcblx0XHR2YXIgaW5wdXRQcm9wcyA9IHtcblx0XHRcdHJlZjogJ2lucHV0Jyxcblx0XHRcdGNsYXNzTmFtZTogJ1NlbGVjdC1pbnB1dCcsXG5cdFx0XHR0YWJJbmRleDogdGhpcy5wcm9wcy50YWJJbmRleCB8fCAwLFxuXHRcdFx0b25Gb2N1czogdGhpcy5oYW5kbGVJbnB1dEZvY3VzLFxuXHRcdFx0b25CbHVyOiB0aGlzLmhhbmRsZUlucHV0Qmx1clxuXHRcdH07XG5cdFx0Zm9yICh2YXIga2V5IGluIHRoaXMucHJvcHMuaW5wdXRQcm9wcykge1xuXHRcdFx0aWYgKHRoaXMucHJvcHMuaW5wdXRQcm9wcy5oYXNPd25Qcm9wZXJ0eShrZXkpKSB7XG5cdFx0XHRcdGlucHV0UHJvcHNba2V5XSA9IHRoaXMucHJvcHMuaW5wdXRQcm9wc1trZXldO1xuXHRcdFx0fVxuXHRcdH1cblxuXHRcdGlmICh0aGlzLnByb3BzLnNlYXJjaGFibGUgJiYgIXRoaXMucHJvcHMuZGlzYWJsZWQpIHtcblx0XHRcdGlucHV0ID0gPElucHV0IHZhbHVlPXt0aGlzLnN0YXRlLmlucHV0VmFsdWV9IG9uQ2hhbmdlPXt0aGlzLmhhbmRsZUlucHV0Q2hhbmdlfSBtaW5XaWR0aD1cIjVcIiB7Li4uaW5wdXRQcm9wc30gLz47XG5cdFx0fSBlbHNlIHtcblx0XHRcdGlucHV0ID0gPGRpdiB7Li4uaW5wdXRQcm9wc30+Jm5ic3A7PC9kaXY+O1xuXHRcdH1cblxuXHRcdHJldHVybiAoXG5cdFx0XHQ8ZGl2IHJlZj1cIndyYXBwZXJcIiBjbGFzc05hbWU9e3NlbGVjdENsYXNzfT5cblx0XHRcdFx0PGlucHV0IHR5cGU9XCJoaWRkZW5cIiByZWY9XCJ2YWx1ZVwiIG5hbWU9e3RoaXMucHJvcHMubmFtZX0gdmFsdWU9e3RoaXMuc3RhdGUudmFsdWV9IGRpc2FibGVkPXt0aGlzLnByb3BzLmRpc2FibGVkfSAvPlxuXHRcdFx0XHQ8ZGl2IGNsYXNzTmFtZT1cIlNlbGVjdC1jb250cm9sXCIgcmVmPVwiY29udHJvbFwiIG9uS2V5RG93bj17dGhpcy5oYW5kbGVLZXlEb3dufSBvbk1vdXNlRG93bj17dGhpcy5oYW5kbGVNb3VzZURvd259IG9uVG91Y2hFbmQ9e3RoaXMuaGFuZGxlTW91c2VEb3dufT5cblx0XHRcdFx0XHR7dmFsdWV9XG5cdFx0XHRcdFx0e2lucHV0fVxuXHRcdFx0XHRcdDxzcGFuIGNsYXNzTmFtZT1cIlNlbGVjdC1hcnJvd1wiIC8+XG5cdFx0XHRcdFx0e2xvYWRpbmd9XG5cdFx0XHRcdFx0e2NsZWFyfVxuXHRcdFx0XHQ8L2Rpdj5cblx0XHRcdFx0e21lbnV9XG5cdFx0XHQ8L2Rpdj5cblx0XHQpO1xuXHR9XG5cbn0pO1xuXG5tb2R1bGUuZXhwb3J0cyA9IFNlbGVjdDtcbiJdfQ==
