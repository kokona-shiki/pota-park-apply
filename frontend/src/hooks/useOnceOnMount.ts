import { useEffect, useRef } from 'react';

/**
 * 在组件挂载时只执行一次回调函数，兼容 React StrictMode
 * 当依赖项变化时会重置执行状态，允许再次执行
 *
 * @param callback - 要执行的回调函数，可以是同步或异步，可以返回清理函数
 * @param deps - 依赖项数组，当依赖变化时会重置执行状态
 *
 * @example
 * ```tsx
 * useOnceOnMount(() => {
 *   if (isAuthLoading || !user) return;
 *   loadData();
 * }, [isAuthLoading, user]);
 * ```
 *
 * @example
 * ```tsx
 * useOnceOnMount(async () => {
 *   if (isAuthLoading || !user) return;
 *   await loadData();
 * }, [isAuthLoading, user]);
 * ```
 */
export function useOnceOnMount(
  callback: () => void | (() => void) | Promise<void> | Promise<(() => void)>,
  deps: React.DependencyList = []
): void {
  const hasExecutedRef = useRef(false);
  const cleanupRef = useRef<(() => void) | void>(undefined);
  const prevDepsRef = useRef<React.DependencyList>(deps);

  useEffect(() => {
    // 检查依赖项是否变化
    const depsChanged = deps.length !== prevDepsRef.current.length ||
      deps.some((dep, index) => dep !== prevDepsRef.current[index]);

    // 如果依赖项变化，重置执行状态并清理之前的清理函数
    if (depsChanged) {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
      hasExecutedRef.current = false;
      prevDepsRef.current = deps;
    }

    // 如果已经执行过，跳过
    if (hasExecutedRef.current) {
      return;
    }

    // 标记为已执行
    hasExecutedRef.current = true;

    // 执行回调并保存清理函数
    const result = callback();

    // 处理异步回调
    if (result instanceof Promise) {
      result.then((cleanup) => {
        cleanupRef.current = cleanup;
      }).catch((error) => {
        console.error('useOnceOnMount callback error:', error);
      });
    } else {
      // 处理同步回调
      cleanupRef.current = result;
    }

    // 返回清理函数
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = undefined;
      }
    };
  }, [deps]); // 移除 callback 依赖，因为 callback 每次渲染都会变化
}

/**
 * 在组件挂载时只执行一次异步回调函数，支持 AbortController 取消请求
 * 当依赖项变化时会重置执行状态，允许再次执行
 *
 * @param callback - 要执行的异步回调函数，接收 AbortSignal 参数
 * @param deps - 依赖项数组，当依赖变化时会重置执行状态
 *
 * @example
 * ```tsx
 * useOnceOnMountWithAbort(async (signal) => {
 *   if (isAuthLoading || !user) return;
 *   await loadData(signal);
 * }, [isAuthLoading, user]);
 * ```
 */
export function useOnceOnMountWithAbort(
  callback: (signal: AbortSignal) => Promise<void>,
  deps: React.DependencyList = []
): void {
  const hasExecutedRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const prevDepsRef = useRef<React.DependencyList>(deps);

  useEffect(() => {
    // 检查依赖项是否变化
    const depsChanged = deps.length !== prevDepsRef.current.length ||
      deps.some((dep, index) => dep !== prevDepsRef.current[index]);

    // 如果依赖项变化，重置执行状态并取消之前的请求
    if (depsChanged) {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
        abortControllerRef.current = null;
      }
      hasExecutedRef.current = false;
      prevDepsRef.current = deps;
    }

    // 如果已经执行过，跳过
    if (hasExecutedRef.current) {
      return;
    }

    // 标记为已执行
    hasExecutedRef.current = true;

    // 创建新的 AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;

    // 执行异步回调
    callback(controller.signal).catch((error) => {
      // 忽略被取消的请求错误
      if (error.name === 'AbortError' || error.name === 'CanceledError') {
        console.debug('请求被取消:', error.message);
      } else {
        console.error('执行回调时出错:', error);
      }
    });

    // 清理函数：取消请求
    return () => {
      if (abortControllerRef.current === controller) {
        controller.abort();
        abortControllerRef.current = null;
      }
    };
  }, [deps]); // 移除 callback 依赖，因为 callback 每次渲染都会变化
}
