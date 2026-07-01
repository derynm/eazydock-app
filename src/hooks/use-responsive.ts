import { useWindowDimensions } from 'react-native';

import { Breakpoints } from '@/constants/theme';

export type Responsive = {
  width: number;
  height: number;
  /** ≥ 700px — pinned sidebar + master–detail. */
  isTablet: boolean;
  /** ≥ 1100px — room for wider list pane / 3-up grids. */
  isWide: boolean;
  /** < 700px — overlay drawer, single column. */
  isPhone: boolean;
};

export function useResponsive(): Responsive {
  const { width, height } = useWindowDimensions();
  const isTablet = width >= Breakpoints.tablet;
  return {
    width,
    height,
    isTablet,
    isWide: width >= Breakpoints.wide,
    isPhone: !isTablet,
  };
}
