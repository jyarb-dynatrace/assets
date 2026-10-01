import React from 'react';
import { DebounceSettings, Simplify, ResizeObserverPolyfill } from '../types';
/**
 * @deprecated
 * @TODO remove in the next major version - exported for backwards compatibility
 */
export declare type WithParentSizeProps = DebounceSettings;
declare type WithParentSizeConfig = {
    initialWidth?: number;
    initialHeight?: number;
} & DebounceSettings;
declare type WithParentSizeState = {
    parentWidth?: number;
    parentHeight?: number;
};
export declare type WithParentSizeProvidedProps = WithParentSizeState;
declare type WithParentSizeComponentProps<P extends WithParentSizeProvidedProps> = Simplify<Omit<P, keyof WithParentSizeProvidedProps> & WithParentSizeConfig>;
export default function withParentSize<P extends WithParentSizeProvidedProps>(BaseComponent: React.ComponentType<P>, 
/** Optionally inject a ResizeObserver polyfill, else this *must* be globally available. */
resizeObserverPolyfill?: ResizeObserverPolyfill): React.ComponentType<WithParentSizeComponentProps<P>>;
export {};
//# sourceMappingURL=withParentSize.d.ts.map