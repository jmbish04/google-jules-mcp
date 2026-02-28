# UX/UI Agent Rules

These rules apply when requesting UX mockups from Stitch or implementing UI components.

## Design System
- Use shadcn/ui components exclusively
- Follow dark theme standards:
  - Background: `bg-background` (hsl(222.2 84% 4.9%))
  - Foreground: `text-foreground` (hsl(210 40% 98%))
  - Card: `bg-card` with `border-border`
  - Accent: `bg-accent` and `text-accent-foreground`

## Component Standards
- Use Radix UI primitives through shadcn
- Implement proper keyboard navigation
- Include focus indicators for accessibility
- Use semantic HTML elements

## Responsive Design
- Mobile-first approach
- Breakpoints: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px)
- Touch-friendly targets (min 44x44px)

## Accessibility
- WCAG AA compliance minimum
- Proper ARIA labels and roles
- Color contrast ratios: 4.5:1 for normal text, 3:1 for large text
- Support keyboard-only navigation

## Typography
- Font: Inter or system font stack
- Scale: text-sm, text-base, text-lg, text-xl, text-2xl
- Line height: leading-relaxed for body text

## Layout
- Use CSS Grid and Flexbox
- Consistent spacing using Tailwind's spacing scale
- Max width for content: max-w-7xl
- Padding: px-4 sm:px-6 lg:px-8
