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

import { CanBeNil, Flitz } from "flitz";
import { DocumentationFormat, DocumentationOptions } from "..";
import { LoadedController } from "../types";
import { initOpenApi3Documentation } from "./swagger";

type InitDocumentationAction<TDoc extends DocumentationOptions = DocumentationOptions> = (options: InitDocumentationOptions<TDoc>) => Promise<void>;

export interface InitDocumentationOptions<TDoc extends DocumentationOptions = DocumentationOptions> {
  app: Flitz;
  controllers: LoadedController[];
  documentation: TDoc;
}

export async function initDocumentation(options: InitDocumentationOptions) {
  let initDocs: CanBeNil<InitDocumentationAction<any>>;

  const format = options.documentation?.format || DocumentationFormat.OpenApi3;

  switch (format) {
    case DocumentationFormat.OpenApi3:
      initDocs = initOpenApi3Documentation;
      break;
  }

  if (!initDocs) {
    throw new TypeError('options.format not supported');
  }

  await initDocs(options);
}
