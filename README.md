<p>
    <h1 align="center">Bun Vue.js Loader</h1>
    <div align="center">
        <p align="center"><i>Bun plugin for loading Vue.js files</i>
        </p>
    </div>
</p>

```bash
bun i -D bun-plugin-vue
```

## About
This project forked from [jh0rman/bun-plugin-vue](https://github.com/jh0rman/bun-plugin-vue) with some improvements and fixed compatibility issues.

## How-to
Basic usage for `Bun.build`:

```js
import vueLoader from 'bun-plugin-vue';

await Bun.build({
    // ...
    plugins: [
        // ...
        vueLoader(),
    ],
});
```

You can add in `bunfig.toml` for `Bun.serve`
```toml
[serve.static]
plugins = [
  "bun-plugin-vue"
]
```

## Plugin Development
To install dependencies:
```bash
bun install
```

To run:
```bash
bun run dev
```

To build:
```bash
bun run build
```

## License
Distributed under the MIT License. See [MIT License](https://opensource.org/license/MIT) for more information.

## References
- https://github.com/tsukkee/bun-plugin-vue3-prototype
- https://github.com/Bytenote/bun-css-loader