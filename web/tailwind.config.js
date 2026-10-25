/** Was the Play CDN config in index.html; compiled at build time now. */
export default {
  content: ['./index.html', './App.tsx', './index.tsx', './components/**/*.tsx'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Source Serif 4 Variable"', '"Noto Serif SC"', '"Songti SC"', '"SimSun"', 'serif'],
        sans: ['"Inter Variable"', 'system-ui', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
      },
    },
  },
};
