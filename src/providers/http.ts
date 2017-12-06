import {Http, RequestOptionsArgs, Response} from "@angular/http";
import {Validator, ValidatorResult} from "jsonschema";

/**
 * Abstracts the Http service of angular in async methods.
 * In addition, a smarter response type is used.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 0.0.1
 */
export class HttpClient {

   constructor(
     private readonly http: Http
   ) {}

   async get(url: string, options?: RequestOptionsArgs): Promise<HttpResponse> {
     throw new Error("This method is not implemented yet");
   }
 }

 /**
  * Abstracts the Response type of angular in a smarter way.
  *
  * @author nmaerchy <nm@studer-raimann.ch>
  * @version 1.0.0
  */
  export class HttpResponse {

    readonly ok: boolean;
    readonly status: number;
    readonly statusText: string;

    private readonly validator: Validator = new Validator();

   constructor(
     private readonly response: Response
   ) {
     this.ok = response.ok;
     this.status = response.status;
     this.statusText = response.statusText;
   }

   /**
    * Parses the response into json with the given {@code schema}.
    *
    * @param {Object} schema the json schema to validate the response
    *
    * @returns {Object} the valid json
    * @throws JsonValidationError if the body could not be parsed or does not match the schema
    */
    json(schema: object): object {

      const json: object = this.tryJson(this.response, (): Error =>
        new JsonValidationError("Could not parse response body to json")
      );

      const result: ValidatorResult = this.validator.validate(json, schema);

      if (result.valid) {
        return json;
      }

      throw new JsonValidationError(result.errors[0].message);
    }

   /**
    * /**
    * Returns the body as a string, presuming `toString()` can be called on the response body.
    *
    * When decoding an `ArrayBuffer`, the optional `encodingHint` parameter determines how the
    * bytes in the buffer will be interpreted. Valid values are:
    *
    * - `legacy` - incorrectly interpret the bytes as UTF-16 (technically, UCS-2). Only characters
    *   in the Basic Multilingual Plane are supported, surrogate pairs are not handled correctly.
    *   In addition, the endianness of the 16-bit octet pairs in the `ArrayBuffer` is not taken
    *   into consideration. This is the default behavior to avoid breaking apps, but should be
    *   considered deprecated.
    *
    * - `iso-8859` - interpret the bytes as ISO-8859 (which can be used for ASCII encoded text).
    *
    * @param {"legacy" | "iso-8859"} encodingHint the encoding hint to use
    *
    * @returns {string} the resulting text
    */
    text(encodingHint?: "legacy" | "iso-8859"): string {
     return this.response.text(encodingHint);
    }

   /**
    * @returns {ArrayBuffer} the body as an array buffer
    */
    arrayBuffer(): ArrayBuffer {
     return this.response.arrayBuffer();
    }

   /**
    * @returns {Blob} the request's body as a Blob, assuming that body exists
    */
    blob(): Blob {
     return this.response.blob();
    }

   /**
    * Executes the {@link Response#json} method in a try catch.
    * If an error occurs the given {@code errorSupplier} is used to throw an {@link Error}.
    *
    * @param {Response} response response to call the json method
    * @param {() => Error} errorSupplier supplies the error that is thrown on catch
    *
    * @returns {object} the resulting json
    */
    private tryJson(response: Response, errorSupplier: () => Error): object {
      try {
        return response.json();
      } catch (error) {
        throw errorSupplier();
      }
    }
  }

/**
 * Indicates a that a json could not be parsed or does not match a required json schema.
 *
 * @author nmaerchy <nm@studer-raimann.ch>
 * @version 1.0.0
 */
export class JsonValidationError extends Error {

  constructor(message: string) {
    super(message);
    Object.setPrototypeOf(this, JsonValidationError.prototype);
  }
}
