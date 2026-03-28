import { useState, useCallback, useRef, useEffect } from 'react';

/** useDebounce — debounce a reactive value */
export function useDebounce(value, delay = 300) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debouncedValue;
}

/** useDebouncedCallback — stable debounced callback (no re-render loop) */
export function useDebouncedCallback(fn, delay = 300) {
  const timerRef   = useRef(null);
  const fnRef      = useRef(fn);
  // Keep fnRef current without causing re-renders
  useEffect(() => { fnRef.current = fn; });
  return useCallback((...args) => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => fnRef.current(...args), delay);
  }, [delay]);
}

/** useDisclosure — open/close toggle */
export function useDisclosure(initial = false) {
  const [isOpen, setIsOpen] = useState(initial);
  const open    = useCallback(() => setIsOpen(true),       []);
  const close   = useCallback(() => setIsOpen(false),      []);
  const toggle  = useCallback(() => setIsOpen(o => !o),   []);
  return { isOpen, open, close, toggle };
}

/** useLocalStorage — persistent state */
export function useLocalStorage(key, initialValue) {
  const [storedValue, setStoredValue] = useState(() => {
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch { return initialValue; }
  });
  const setValue = useCallback((value) => {
    try {
      const val = value instanceof Function ? value(storedValue) : value;
      setStoredValue(val);
      window.localStorage.setItem(key, JSON.stringify(val));
    } catch (err) { console.warn('useLocalStorage:', err); }
  }, [key, storedValue]);
  return [storedValue, setValue];
}

/** usePagination — page state management */
export function usePagination(initialLimit = 10) {
  const [page,  setPage]  = useState(1);
  const [limit, setLimit] = useState(initialLimit);
  const goTo  = useCallback((p) => setPage(p), []);
  const reset = useCallback(() => setPage(1),  []);
  return { page, limit, goTo, reset, setLimit, setPage };
}

/** useClickOutside — detect outside clicks */
export function useClickOutside(ref, handler) {
  useEffect(() => {
    const listener = (e) => {
      if (!ref.current || ref.current.contains(e.target)) return;
      handler(e);
    };
    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler]);
}

/** useScrollTop — scroll to top on mount */
export function useScrollTop(deps = []) {
  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, deps);
}

/** useImagePreview — file input with preview URL */
export function useImagePreview(initialUrl = null) {
  const [preview, setPreview] = useState(initialUrl);
  const [file,    setFile]    = useState(null);
  const handleFileChange = useCallback((e) => {
    const selected = e.target.files?.[0];
    if (!selected || !selected.type.startsWith('image/')) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  }, []);
  const reset = useCallback(() => { setPreview(initialUrl); setFile(null); }, [initialUrl]);
  return { preview, file, handleFileChange, reset, setPreview };
}

/** useWindowSize — reactive window dimensions */
export function useWindowSize() {
  const [size, setSize] = useState({ width: window.innerWidth, height: window.innerHeight });
  useEffect(() => {
    const handler = () => setSize({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', handler);
    return () => window.removeEventListener('resize', handler);
  }, []);
  return size;
}

/** useOnlineStatus — network connectivity */
export function useOnlineStatus() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on  = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online',  on);
    window.addEventListener('offline', off);
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off); };
  }, []);
  return online;
}
