import React from 'react';
import { Simplify, DebounceSettings } from '../types';
declare type WithScreenSizeConfig = {
    /** @deprecated use `debounceTime` instead */
    windowResizeDebounceTime?: number;
} & DebounceSettings;
/**
 * @deprecated
 * @TODO remove in the next major version - exported for backwards compatibility
 */
export declare type WithParentSizeProps = Omit<WithScreenSizeConfig, 'debounceTime'>;
declare type WithScreenSizeState = {
    screenWidth?: number;
    screenHeight?: number;
};
export declare type WithScreenSizeProvidedProps = WithScreenSizeState;
declare type WithScreenSizeComponentProps<P extends WithScreenSizeProvidedProps> = Simplify<Omit<P, keyof WithScreenSizeProvidedProps> & WithScreenSizeConfig>;
export default function withScreenSize<P extends WithScreenSizeProvidedProps>(BaseComponent: React.ComponentType<P>): React.ComponentType<WithScreenSizeComponentProps<P>>;
export {};
//# sourceMappingURL=withScreenSize.d.ts.map