const path = require('node:path');

/**
 * @param {string} pkg
 * @param {string[]} files
 * @param {'prettier' | 'eslint' | 'both'} mode
 */
function packageTasks(pkg, files, mode = 'both') {
  const relative = files.map((file) => path.relative(pkg, file)).filter(Boolean);
  if (relative.length === 0) return [];
  const quoted = relative.map((file) => `"${file.replace(/"/g, '\\"')}"`).join(' ');
  const tasks = [];
  if (mode === 'prettier' || mode === 'both') {
    tasks.push(`pnpm --dir ${pkg} exec prettier --write ${quoted}`);
  }
  if (mode === 'eslint' || mode === 'both') {
    tasks.push(`pnpm --dir ${pkg} exec eslint --fix ${quoted}`);
  }
  return tasks;
}

module.exports = {
  'mobile/**/*.{js,jsx,ts,tsx}': (files) => packageTasks('mobile', files, 'both'),
  'mobile/**/*.{json,mjs,cjs}': (files) => packageTasks('mobile', files, 'prettier'),
  'api/**/*.{js,ts}': (files) => packageTasks('api', files, 'both'),
  'api/**/*.{mjs,cjs,json}': (files) => packageTasks('api', files, 'prettier'),
  'shared/**/*.{js,ts}': (files) => packageTasks('shared', files, 'both'),
  'shared/**/*.{mjs,cjs,json}': (files) => packageTasks('shared', files, 'prettier'),
};
