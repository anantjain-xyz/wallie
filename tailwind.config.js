/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  darkMode: ['class', '[data-theme="dark"]'],
  theme: {
    screens: {
      sm: '640px',
      // => @media (min-width: 640px) { ... }

      md: '768px',
      // => @media (min-width: 768px) { ... }

      lg: '1024px',
      // => @media (min-width: 1024px) { ... }

      xl: '1280px',
      // => @media (min-width: 1280px) { ... }

      '2xl': '1536px',
      // => @media (min-width: 1536px) { ... }
    },
    // color: {
    //   // gray: colors.trueGray,
    // },
    fontFamily: {
      sans: [
        'Inter\\ UI',
        'SF\\ Pro\\ Display',
        '-apple-system',
        'BlinkMacSystemFont',
        'Segoe\\ UI',
        'Roboto',
        'Oxygen',
        'Ubuntu',
        'Cantarell',
        'Open\\ Sans',
        'Helvetica\\ Neue',
        'sans-serif',
      ],
      prosto: ['ProstoOne', 'sans-serif'],
      mono: [
        'ui-monospace',
        'SFMono-Regular',
        'Menlo',
        'Monaco',
        'Consolas',
        'Liberation\\ Mono',
        'Courier\\ New',
        'monospace',
      ],
    },
    borderWidth: {
      DEFAULT: '1px',
      0: '0',
      2: '2px',
      3: '3px',
      4: '4px',
      6: '6px',
      8: '8px',
    },
    extend: {
      keyframes: {
        'spin-fast': {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
      },
      animation: {
        'spin-fast': 'spin-fast 0.4s linear infinite',
      },
      boxShadow: {
        modal: 'rgb(0 0 0 / 9%) 0px 3px 12px',
        'large-modal': 'rgb(0 0 0 / 50%) 0px 16px 70px',
      },
      spacing: {
        2.5: '10px',
        4.5: '18px',
        3.5: '14px',
        34: '136px',
        70: '280px',
        140: '560px',
        100: '400px',
        175: '700px',
        53: '212px',
        90: '360px',
      },
      fontSize: {
        xxs: '0.5rem',
        xs: '0.75rem', // 12px
        sm: '0.8125rem', // 13px
        md: '0.9357rem', //15px
        14: '0.875rem',
        base: '1.0rem', // 16px
      },
      zIndex: {
        100: 100,
      },
      typography: {
        DEFAULT: {
          css: {
            h1: {
              fontSize: '1.875rem', // 30px
              fontWeight: '600',
              lineHeight: '1.2',
              marginTop: '1.5rem',
              marginBottom: '1rem',
              color: 'rgb(17, 24, 39)', // text-gray-900
            },
            h2: {
              fontSize: '1.5rem', // 24px
              fontWeight: '600',
              lineHeight: '1.3',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: 'rgb(17, 24, 39)', // text-gray-900
            },
            h3: {
              fontSize: '1.25rem', // 20px
              fontWeight: '600',
              lineHeight: '1.4',
              marginTop: '1.5rem',
              marginBottom: '0.75rem',
              color: 'rgb(17, 24, 39)', // text-gray-900
            },
            h4: {
              fontSize: '1.125rem', // 18px
              fontWeight: '600',
              lineHeight: '1.5',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
              color: 'rgb(17, 24, 39)', // text-gray-900
            }
          },
        },
      },
    },
  },
  variants: {
    extend: {
      backgroundColor: ['checked'],
      borderColor: ['checked'],
    },
  },
  plugins: [
    require('@tailwindcss/forms'), 
    require('@tailwindcss/typography')
  ],
}
