/**
 * Style token tables shared by HTML (Tailwind classes) and PDF (pdf-lib
 * point sizes). This is what keeps the two renderers visually in sync
 * for things like "sm font", "center align", "bold weight", etc.
 */

import type {
    AlignToken,
    FontSizeToken,
    FontWeightToken,
    ImageSizeToken,
    SpacingToken,
} from './types';

export const FONT_SIZE_PT: Record<FontSizeToken, number> = {
    xs: 7,
    sm: 9,
    md: 11,
    lg: 13,
    xl: 16,
};

export const FONT_SIZE_HTML_CLASS: Record<FontSizeToken, string> = {
    xs: 'text-[8px]',
    sm: 'text-[10px]',
    md: 'text-[12px]',
    lg: 'text-[14px]',
    xl: 'text-[16px]',
};

export const FONT_WEIGHT_HTML_CLASS: Record<FontWeightToken, string> = {
    normal: 'font-normal',
    bold: 'font-bold',
};

export const ALIGN_HTML_CLASS: Record<AlignToken, string> = {
    left: 'text-left',
    center: 'text-center',
    right: 'text-right',
};

export const ALIGN_FLEX_HTML_CLASS: Record<AlignToken, string> = {
    left: 'justify-start',
    center: 'justify-center',
    right: 'justify-end',
};

export const SPACING_PT: Record<SpacingToken, number> = {
    none: 0,
    xs: 2,
    sm: 4,
    md: 8,
    lg: 16,
};

export const SPACING_HTML_CLASS: Record<SpacingToken, string> = {
    none: 'mt-0',
    xs: 'mt-0.5',
    sm: 'mt-1',
    md: 'mt-2',
    lg: 'mt-4',
};

export const IMAGE_SIZE_PT: Record<ImageSizeToken, number> = {
    sm: 36,
    md: 48,
    lg: 64,
    xl: 88,
};

export const IMAGE_SIZE_PX: Record<ImageSizeToken, number> = {
    sm: 40,
    md: 56,
    lg: 72,
    xl: 96,
};
