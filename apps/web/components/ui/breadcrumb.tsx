import * as React from 'react';
import { ChevronRight } from 'lucide-react';
import { Slot } from '@radix-ui/react-slot';
import { cn } from '@/lib/utils';

const Breadcrumb = React.forwardRef<HTMLElement, React.HTMLAttributes<HTMLElement>>(
    ({ className, ...props }, ref) => (
        <nav
            ref={ref}
            aria-label="breadcrumb"
            className={cn('flex', className)}
            {...props}
        />
    )
);
Breadcrumb.displayName = 'Breadcrumb';

const BreadcrumbList = React.forwardRef<HTMLOListElement, React.HTMLAttributes<HTMLOListElement>>(
    ({ className, ...props }, ref) => (
        <ol
            ref={ref}
            className={cn('flex flex-wrap items-center gap-1', className)}
            {...props}
        />
    )
);
BreadcrumbList.displayName = 'BreadcrumbList';

const BreadcrumbItem = React.forwardRef<HTMLLIElement, React.LiHTMLAttributes<HTMLLIElement>>(
    ({ className, ...props }, ref) => (
        <li
            ref={ref}
            className={cn('inline-flex items-center gap-1', className)}
            {...props}
        />
    )
);
BreadcrumbItem.displayName = 'BreadcrumbItem';

const BreadcrumbLink = React.forwardRef<
    HTMLAnchorElement,
    React.ComponentPropsWithoutRef<'a'> & { asChild?: boolean }
>(({ className, asChild, ...props }, ref) => {
    const Comp = asChild ? Slot : 'a';
    return (
        <Comp
            ref={ref}
            className={cn('transition-colors hover:text-foreground', className)}
            {...props}
        />
    );
});
BreadcrumbLink.displayName = 'BreadcrumbLink';

const BreadcrumbPage = React.forwardRef<HTMLSpanElement, React.HTMLAttributes<HTMLSpanElement>>(
    ({ className, ...props }, ref) => (
        <span ref={ref} className={cn('font-semibold', className)} {...props} />
    )
);
BreadcrumbPage.displayName = 'BreadcrumbPage';

const BreadcrumbSeparator = React.forwardRef<HTMLLIElement, React.HTMLAttributes<HTMLLIElement>>(
    ({ className, children, ...props }, ref) => (
        <li
            ref={ref}
            role="presentation"
            aria-hidden="true"
            className={cn('[&>svg]:h-3.5 [&>svg]:w-3.5', className)}
            {...props}
        >
            {children ?? <ChevronRight />}
        </li>
    )
);
BreadcrumbSeparator.displayName = 'BreadcrumbSeparator';

export {
    Breadcrumb,
    BreadcrumbList,
    BreadcrumbItem,
    BreadcrumbLink,
    BreadcrumbPage,
    BreadcrumbSeparator,
};
