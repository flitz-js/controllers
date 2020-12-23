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

import { Contract } from "..";
import { getValuesFromList, isNil } from "../utils";
import { SetupFlitzAppControllerValueImportAction, SetupFlitzAppControllerValueImportActionContext, SETUP_VALUE_IMPORT } from "../types";
import { isClass } from "../utils";
import { getActionList, importControllerValue } from "./utils";

/**
 * Marks a property or method for importing a list of values by contract.
 * 
 * @param {Contract} contract The contract.
 * 
 * @returns {MethodDecorator} The new decorator function.
 */
export function ImportMany(contract: Contract): any {
  if (typeof contract !== 'string') {
    throw new TypeError('contract must be string');
  }

  return (target: any, propertyName: string, descriptor: PropertyDescriptor) => {
    if (!isClass(target)) {
      throw new TypeError('target must be class');
    }

    getActionList<SetupFlitzAppControllerValueImportAction>(target, SETUP_VALUE_IMPORT).push(
      async (context: SetupFlitzAppControllerValueImportActionContext) => {
        let values: any = false;

        const contractValues = getValuesFromList(context.values, contract);
        if (!isNil(contractValues)) {
          values = contractValues;
        }

        if (!Array.isArray(values) || !values.length) {
          throw new Error('No values found for ' + contract);
        }

        importControllerValue(
          context.controller, propertyName, descriptor,
          values
        );
      }
    );
  };
}
