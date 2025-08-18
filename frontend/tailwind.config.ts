import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
		"./index.html",
	],
	// Safelist commonly used classes to prevent purging
	safelist: [
		// Dynamic color classes
		'text-red-600', 'text-green-600', 'text-blue-600', 'text-purple-600',
		'bg-red-100', 'bg-green-100', 'bg-blue-100', 'bg-purple-100',
		// Animation classes that might be added dynamically
		'animate-spin', 'animate-pulse', 'animate-bounce',
		// Loading states
		'opacity-0', 'opacity-50', 'opacity-100',
		// Common utility classes
		'sr-only', 'not-sr-only', 'focus:not-sr-only',
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: 'hsl(var(--success))',
				warning: 'hsl(var(--warning))'
			},
			fontFamily: {
				'display': 'var(--font-display)',
				'body': 'var(--font-body)'
			},
			animation: {
				'gradient-shift': 'gradient-shift 8s ease infinite',
				'float': 'float 3s ease-in-out infinite',
				'pulse-glow': 'pulse-glow 2s ease-in-out infinite alternate',
				'fade-in': 'fade-in 0.6s ease-out',
				'slide-up': 'slide-up 0.6s ease-out',
				'scale-in': 'scale-in 0.3s ease-out'
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)'
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				},
				'gradient-shift': {
					'0%': { backgroundPosition: '0% 50%' },
					'50%': { backgroundPosition: '100% 50%' },
					'100%': { backgroundPosition: '0% 50%' }
				},
				'float': {
					'0%, 100%': { transform: 'translateY(0px)' },
					'50%': { transform: 'translateY(-10px)' }
				},
				'pulse-glow': {
					'from': { boxShadow: '0 0 20px hsl(var(--primary) / 0.3)' },
					'to': { boxShadow: '0 0 40px hsl(var(--primary) / 0.6)' }
				},
				'fade-in': {
					'0%': { opacity: '0', transform: 'translateY(20px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'slide-up': {
					'0%': { opacity: '0', transform: 'translateY(30px)' },
					'100%': { opacity: '1', transform: 'translateY(0)' }
				},
				'scale-in': {
					'0%': { opacity: '0', transform: 'scale(0.95)' },
					'100%': { opacity: '1', transform: 'scale(1)' }
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [
		require("tailwindcss-animate"),
		require("@tailwindcss/typography"),
		// Custom plugin for performance optimizations
		function({ addUtilities }) {
			addUtilities({
				// GPU acceleration utilities
				'.gpu': {
					transform: 'translateZ(0)',
					'backface-visibility': 'hidden',
					perspective: '1000px',
				},
				// Scroll optimization
				'.scroll-smooth': {
					'scroll-behavior': 'smooth',
					'-webkit-overflow-scrolling': 'touch',
				},
				// Custom scrollbar utilities
				'.scrollbar-thin': {
					'scrollbar-width': 'thin',
					'&::-webkit-scrollbar': {
						width: '8px',
						height: '8px',
					},
				},
				'.scrollbar-thumb-gray-300': {
					'&::-webkit-scrollbar-thumb': {
						'background-color': '#d1d5db',
						'border-radius': '4px',
					},
				},
				'.scrollbar-track-gray-100': {
					'&::-webkit-scrollbar-track': {
						'background-color': '#f3f4f6',
					},
				},
				// Focus visible for accessibility
				'.focus-visible-only': {
					'&:focus': {
						outline: 'none',
					},
					'&:focus-visible': {
						outline: '2px solid',
						'outline-color': 'hsl(var(--ring))',
						'outline-offset': '2px',
					},
				},
			});
		},
	],
	// Optimization for production builds
	...process.env.NODE_ENV === 'production' && {
		corePlugins: {
			// Disable unused core plugins for smaller bundle
			preflight: true,
			container: true,
			accessibility: true,
			pointerEvents: false,
			resize: false,
			placeholderOpacity: false,
			placeholderColor: false,
			textOpacity: false,
			backgroundOpacity: false,
			borderOpacity: false,
			divideOpacity: false,
			ringOpacity: false,
		},
	},
} satisfies Config;
