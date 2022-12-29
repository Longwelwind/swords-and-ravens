import _ from 'lodash';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface MemoizeThrottleFunction<F extends (...args: any[]) => any> {
  (...args: Parameters<F>): void;
  flush: (...args: Parameters<F>) => void;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function memoizeThrottle<F extends (...args: any[]) => any>(
  func: F,
  wait = 0,
  options: _.ThrottleSettings = {},
  resolver?: (...args: Parameters<F>) => unknown
): MemoizeThrottleFunction<F> {
  const debounceMemo = _.memoize<
    (...args: Parameters<F>) => _.DebouncedFunc<F>
  >(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (..._args: Parameters<F>) => _.throttle(func, wait, options),
    resolver
  );

  function wrappedFunction(...args: Parameters<F>): ReturnType<F> | undefined {
    return debounceMemo(...args)(...args);
  }

  wrappedFunction.flush = (...args: Parameters<F>): void => {
    debounceMemo(...args).flush();
  };

  return wrappedFunction as unknown as MemoizeThrottleFunction<F>;
}