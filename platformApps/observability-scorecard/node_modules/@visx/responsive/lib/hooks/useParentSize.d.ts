import { RefObject } from 'react';
import { DebounceSettings, ResizeObserverPolyfill } from '../types';
export declare type ParentSizeState = {
    width: number;
    height: number;
    top: number;
    left: number;
};
export declare type UseParentSizeConfig = {
    /** Initial size before measuring the parent. */
    initialSize?: Partial<ParentSizeState>;
    /** Optionally inject a ResizeObserver polyfill, else this *must* be globally available. */
    resizeObserverPolyfill?: ResizeObserverPolyfill;
    /** Optional dimensions provided won't trigger a state change when changed. */
    ignoreDimensions?: keyof ParentSizeState | (keyof ParentSizeState)[];
} & DebounceSettings;
declare type UseParentSizeResult<T extends HTMLElement = HTMLDivElement> = ParentSizeState & {
    parentRef: RefObject<T>;
    resize: (state: ParentSizeState) => void;
};
export default function useParentSize<T extends HTMLElement = HTMLDivElement>({ initialSize, debounceTime, ignoreDimensions, enableDebounceLeadingCall, resizeObserverPolyfill, }?: UseParentSizeConfig): UseParentSizeResult<T>;
export {};
//# sourceMappingURL=useParentSize.d.ts.map