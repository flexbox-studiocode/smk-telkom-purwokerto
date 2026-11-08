import { useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { campusGeometry, clampPan, centerCampusPoint, gestureAxis, meaningfulPan } from '../utils/campusPan';

export default function useCampusPan({ viewport, stage, scenery, slider, previous, next }, onLearn) {
  const control = useRef(null);
  useLayoutEffect(() => {
    const view = viewport.current, image = stage.current;
    if (!view || !image) return undefined;
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const state = { max: 0, inset: 0, width: 0, imageWidth: 0, fraction: null, position: 0, gesture: null, frame: 0, dragFrame: 0, suppressClick: false, learned: false, wheelStart: 0, wheelTime: 0, destination: null };
    const enabled = () => view.dataset.mapReady === 'true';
    const stop = () => { cancelAnimationFrame(state.frame); state.frame = 0; state.destination = null; };
    const sync = () => {
      if (state.max > 0) state.fraction = state.position / state.max;
      image.style.setProperty('transform', `translate3d(${-state.position - state.inset}px,0,0)`);
      image.style.setProperty('--campus-camera-x', `${state.position + state.inset}px`);
      image.style.setProperty('--campus-viewport-width', `${state.width}px`);
      image.style.setProperty('--campus-fraction', String(state.fraction || 0));
      image.style.setProperty('--campus-floor-pan', `${media.matches ? 0 : Math.min(16, state.position * 0.04)}px`);
      if (scenery.current) {
        scenery.current.parentElement.style.setProperty('--campus-floor-pan', image.style.getPropertyValue('--campus-floor-pan'));
        scenery.current.parentElement.style.setProperty('--campus-unit', image.style.getPropertyValue('--campus-unit'));
        for (const property of ['width', 'transform', '--campus-unit', '--campus-scale', '--campus-fraction', '--campus-floor-pan', '--campus-camera-x', '--campus-viewport-width']) scenery.current.style.setProperty(property, image.style.getPropertyValue(property));
      }
      view.dataset.pan = String(state.position); view.dataset.panMax = String(state.max); view.dataset.panInset = String(state.inset);
      if (slider.current) slider.current.closest('.campus-controls').style.setProperty('--campus-fraction', String(state.max > 0 ? state.position / state.max : 0));
      if (slider.current) { slider.current.value = String(Math.round(state.max > 0 ? state.fraction * 1000 : 0)); slider.current.disabled = !enabled() || state.max <= 0; }
      if (previous.current) previous.current.disabled = !enabled() || state.position <= 0.5;
      if (next.current) next.current.disabled = !enabled() || state.position >= state.max - 0.5;
    };
    const position = value => { state.position = clampPan(value, state.max); sync(); };
    const acknowledge = () => { if (!state.learned) { state.learned = true; onLearn(); } };
    const learn = start => { if (meaningfulPan(start, state.position)) acknowledge(); };
    const to = (value, smooth = true, completed) => {
      stop();
      const destination = clampPan(value, state.max), start = state.position;
      if (!smooth || media.matches || Math.abs(destination - start) < 0.5) { position(destination); completed?.(); return; }
      const begun = performance.now(); state.destination = destination;
      const tick = time => {
        const progress = Math.min(1, (time - begun) / 320);
        position(start + (destination - start) * (1 - (1 - progress) ** 3));
        if (progress < 1) state.frame = requestAnimationFrame(tick);
        else { state.frame = 0; state.destination = null; completed?.(); }
      };
      state.frame = requestAnimationFrame(tick);
    };
    const endGesture = () => {
      const gesture = state.gesture;
      if (!gesture) return;
      cancelAnimationFrame(state.dragFrame); state.dragFrame = 0;
      if (gesture.axis === 'horizontal') { position(gesture.pending); learn(gesture.scroll); state.suppressClick = true; }
      state.gesture = null; view.dataset.dragging = 'false';
      if (view.hasPointerCapture(gesture.id)) view.releasePointerCapture(gesture.id);
    };
    const measure = () => {
      stop(); endGesture(); const fraction = state.fraction;
      state.width = view.clientWidth;
      const failed = view.dataset.mapFailed === 'true', geometry = campusGeometry(state.width);
      state.imageWidth = failed ? state.width : geometry.width; state.max = failed ? 0 : geometry.maximum;
      state.inset = failed ? 0 : geometry.inset;
      image.style.setProperty('width', `${state.imageWidth}px`); view.style.setProperty('height', `${failed ? 224 : geometry.height}px`);
      image.style.setProperty('--campus-unit', `${geometry.unit}px`); image.style.setProperty('--campus-scale', String(geometry.unit));
      const root = view.closest('.campus-explorer');
      root.style.setProperty('--campus-control-unit', `${state.width / 1847}px`);
      root.style.setProperty('--campus-map-unit', `${geometry.unit}px`);
      position(fraction === null ? geometry.initial : state.max * fraction);
    };
    const down = event => {
      if (!enabled() || state.max <= 0 || !event.isPrimary || event.button !== 0) return;
      stop(); endGesture(); state.suppressClick = false;
      state.gesture = { id: event.pointerId, x: event.clientX, y: event.clientY, scroll: state.position, axis: 'pending', pending: state.position };
    };
    const move = event => {
      const gesture = state.gesture;
      if (!gesture || gesture.id !== event.pointerId) return;
      const dx = event.clientX - gesture.x, dy = event.clientY - gesture.y;
      if (gesture.axis === 'pending') gesture.axis = gestureAxis(dx, dy);
      if (gesture.axis !== 'horizontal') return;
      if (event.cancelable) event.preventDefault();
      view.dataset.dragging = 'true';
      if (!view.hasPointerCapture(event.pointerId)) view.setPointerCapture(event.pointerId);
      gesture.pending = gesture.scroll - dx;
      if (!state.dragFrame) state.dragFrame = requestAnimationFrame(() => { state.dragFrame = 0; if (state.gesture === gesture) { position(gesture.pending); learn(gesture.scroll); } });
    };
    const up = event => { if (state.gesture?.id === event.pointerId) endGesture(); };
    const click = event => { if (state.suppressClick && event.detail !== 0) { event.preventDefault(); event.stopPropagation(); state.suppressClick = false; } };
    const wheel = event => {
      if (!enabled() || state.max <= 0 || event.ctrlKey) return;
      const horizontal = event.shiftKey || Math.abs(event.deltaX) > Math.abs(event.deltaY);
      if (!horizontal) return;
      const delta = event.deltaX || (event.shiftKey ? event.deltaY : 0);
      if (!delta) return;
      event.preventDefault(); event.stopPropagation(); stop();
      const now = performance.now();
      if (now - state.wheelTime > 250) state.wheelStart = state.position;
      state.wheelTime = now;
      position(state.position + delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? state.width : 1)); learn(state.wheelStart);
    };
    const key = event => {
      if (!enabled() || event.target !== view || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const target = clampPan(event.key === 'Home' ? 0 : event.key === 'End' ? state.max : state.position + (event.key === 'ArrowLeft' ? -1 : 1) * state.width * 0.4, state.max);
      if (target !== state.position) acknowledge();
      to(target);
    };
    const reduced = () => { if (media.matches && state.destination !== null) { const destination = state.destination; stop(); position(destination); } sync(); };
    const blur = () => { endGesture(); stop(); };
    const preventDrag = event => event.preventDefault();
    const observer = new ResizeObserver(measure); observer.observe(view); observer.observe(image);
    view.addEventListener('pointerdown', down); window.addEventListener('pointermove', move, { passive: false });
    window.addEventListener('pointerup', up); window.addEventListener('pointercancel', up); window.addEventListener('blur', blur);
    view.addEventListener('click', click, true); view.addEventListener('wheel', wheel, { passive: false });
    view.addEventListener('keydown', key); view.addEventListener('dragstart', preventDrag);
    media.addEventListener('change', reduced);
    control.current = {
      measure, stop,
      by: amount => { const target = clampPan(state.position + amount * state.width, state.max); if (target !== state.position) acknowledge(); to(target); },
      fraction: value => { const start = state.position; to(value * state.max, false); if (start !== state.position) acknowledge(); },
      locate: (x, completed) => to(centerCampusPoint(x, state.imageWidth, state.width) - state.inset, true, completed),
      reveal: x => { const local = x * state.imageWidth - state.position - state.inset; if (local < 100 || local > state.width - 100) to(centerCampusPoint(x, state.imageWidth, state.width) - state.inset); },
    };
    measure();
    return () => {
      observer.disconnect(); endGesture(); stop(); cancelAnimationFrame(state.dragFrame); control.current = null;
      view.removeEventListener('pointerdown', down); window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('blur', blur);
      view.removeEventListener('click', click, true); view.removeEventListener('wheel', wheel); view.removeEventListener('keydown', key); view.removeEventListener('dragstart', preventDrag); media.removeEventListener('change', reduced);
    };
  }, [onLearn, viewport, stage, scenery, slider, previous, next]);
  const by = useCallback(value => control.current?.by(value), []), fraction = useCallback(value => control.current?.fraction(value), []);
  const locate = useCallback((value, completed) => control.current?.locate(value, completed), []), reveal = useCallback(value => control.current?.reveal(value), []), refresh = useCallback(() => control.current?.measure(), []);
  return useMemo(() => ({ by, fraction, locate, reveal, refresh }), [by, fraction, locate, reveal, refresh]);
}
