// Copyright 2020-present Marcel Joachim Kloubert <marcel.kloubert@gmx.net>
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import ejs from 'ejs';
import fs from 'fs';
import path from 'path';

const pathToSwaggerUi: string = path.resolve(
  require('swagger-ui-dist').absolutePath()
);
const indexHtmlFilePath = path.join(pathToSwaggerUi, 'index.html');

export default async (): Promise<string> => {
  const template = await fs.promises.readFile(indexHtmlFilePath, 'utf8');

  const oldLines = template.split('\n');

  const newLines: string[] = [];
  let linesToSkip = 0;
  for (const l of oldLines) {
    if (linesToSkip > 0) {
      --linesToSkip;
      continue;
    }

    if (l.trim().startsWith('window.ui = ui')) {
      // code to remove URL text field

      newLines.push(l);
      newLines.push("document.querySelector('#swagger-ui .topbar-wrapper .download-url-wrapper').remove()");
    } else if (l.trim().startsWith('const ui = SwaggerUIBundle({')) {
      // change URL

      newLines.push(l);
      newLines.push("url: './json',");

      linesToSkip = 1;
    } else {
      newLines.push(l);
    }
  }

  return ejs.render(newLines.join('\n'), {
  });
};
