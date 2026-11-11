// GitHub Pages serves 404.html for unknown paths. Copying the app shell there lets
// deep links such as /table-desk/menu load the app instead of a 404 page.
import { copyFileSync } from 'node:fs'

copyFileSync('dist/index.html', 'dist/404.html')
