"use strict";

exports.__esModule = true;
exports.default = useParentSize;
var _debounce = _interopRequireDefault(require("lodash/debounce"));
var _react = require("react");
function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }
function _extends() { _extends = Object.assign ? Object.assign.bind() : function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }
var defaultIgnoreDimensions = [];
var defaultInitialSize = {
  width: 0,
  height: 0,
  top: 0,
  left: 0
};
function useParentSize(_temp) {
  var _ref = _temp === void 0 ? {} : _temp,
    _ref$initialSize = _ref.initialSize,
    initialSize = _ref$initialSize === void 0 ? defaultInitialSize : _ref$initialSize,
    _ref$debounceTime = _ref.debounceTime,
    debounceTime = _ref$debounceTime === void 0 ? 300 : _ref$debounceTime,
    _ref$ignoreDimensions = _ref.ignoreDimensions,
    ignoreDimensions = _ref$ignoreDimensions === void 0 ? defaultIgnoreDimensions : _ref$ignoreDimensions,
    _ref$enableDebounceLe = _ref.enableDebounceLeadingCall,
    enableDebounceLeadingCall = _ref$enableDebounceLe === void 0 ? true : _ref$enableDebounceLe,
    resizeObserverPolyfill = _ref.resizeObserverPolyfill;
  var parentRef = (0, _react.useRef)(null);
  var animationFrameID = (0, _react.useRef)(0);
  var _useState = (0, _react.useState)(_extends({}, defaultInitialSize, initialSize)),
    state = _useState[0],
    setState = _useState[1];
  var resize = (0, _react.useMemo)(function () {
    var normalized = Array.isArray(ignoreDimensions) ? ignoreDimensions : [ignoreDimensions];
    return (0, _debounce.default)(function (incoming) {
      setState(function (existing) {
        var stateKeys = Object.keys(existing);
        var keysWithChanges = stateKeys.filter(function (key) {
          return existing[key] !== incoming[key];
        });
        var shouldBail = keysWithChanges.every(function (key) {
          return normalized.includes(key);
        });
        return shouldBail ? existing : incoming;
      });
    }, debounceTime, {
      leading: enableDebounceLeadingCall
    });
  }, [debounceTime, enableDebounceLeadingCall, ignoreDimensions]);
  (0, _react.useEffect)(function () {
    var LocalResizeObserver = resizeObserverPolyfill || window.ResizeObserver;
    var observer = new LocalResizeObserver(function (entries) {
      entries.forEach(function (entry) {
        var _entry$contentRect;
        var _ref2 = (_entry$contentRect = entry == null ? void 0 : entry.contentRect) != null ? _entry$contentRect : {},
          left = _ref2.left,
          top = _ref2.top,
          width = _ref2.width,
          height = _ref2.height;
        animationFrameID.current = window.requestAnimationFrame(function () {
          resize({
            width: width,
            height: height,
            top: top,
            left: left
          });
        });
      });
    });
    if (parentRef.current) observer.observe(parentRef.current);
    return function () {
      window.cancelAnimationFrame(animationFrameID.current);
      observer.disconnect();
      resize.cancel();
    };
  }, [resize, resizeObserverPolyfill]);
  return _extends({
    parentRef: parentRef,
    resize: resize
  }, state);
}