import pkg from './package.json'

import extension from 'rollup-plugin-gsext'
import del from 'rollup-plugin-delete'
import zip from 'rollup-plugin-zipdir'

export default {
  input: [
    'src/metadata.json'
  ],
  output: {
    dir: 'dist',
    format: 'esm'
  },
  plugins: [
    extension({
      useESM: true,
      metadata: {
        version: Number(pkg.version)
      }
    }),
    del({
      hook: 'writeBundle',
      targets: [
        'build/*.zip'
      ]
    }),
    process.env.package && zip({
      name: `${pkg.name}-v${pkg.version}.zip`,
      outputDir: 'build'
    })
  ]
}
