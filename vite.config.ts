import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';
import dtsPlugin from 'vite-plugin-dts';

export default defineConfig({
    plugins: [
        tsconfigPaths(),
        dtsPlugin({
            outDir: __dirname + '/dist/types',
            exclude: ['tests']
        })
    ],
    build: {
        lib: {
            entry: './src/index.ts',
            name: 'JsJson',
            fileName: (format) => `index.${format}.js`
        }
    }
});
