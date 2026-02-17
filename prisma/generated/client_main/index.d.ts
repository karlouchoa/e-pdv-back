
/**
 * Client
**/

import * as runtime from './runtime/library.js';
import $Types = runtime.Types // general types
import $Public = runtime.Types.Public
import $Utils = runtime.Types.Utils
import $Extensions = runtime.Types.Extensions
import $Result = runtime.Types.Result

export type PrismaPromise<T> = $Public.PrismaPromise<T>


/**
 * Model t_acessos
 * 
 */
export type t_acessos = $Result.DefaultSelection<Prisma.$t_acessosPayload>
/**
 * Model t_banco
 * 
 */
export type t_banco = $Result.DefaultSelection<Prisma.$t_bancoPayload>
/**
 * Model t_log
 * 
 */
export type t_log = $Result.DefaultSelection<Prisma.$t_logPayload>

/**
 * ##  Prisma Client ʲˢ
 *
 * Type-safe database client for TypeScript & Node.js
 * @example
 * ```
 * const prisma = new PrismaClient()
 * // Fetch zero or more T_acessos
 * const t_acessos = await prisma.t_acessos.findMany()
 * ```
 *
 *
 * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
 */
export class PrismaClient<
  ClientOptions extends Prisma.PrismaClientOptions = Prisma.PrismaClientOptions,
  const U = 'log' extends keyof ClientOptions ? ClientOptions['log'] extends Array<Prisma.LogLevel | Prisma.LogDefinition> ? Prisma.GetEvents<ClientOptions['log']> : never : never,
  ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs
> {
  [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['other'] }

    /**
   * ##  Prisma Client ʲˢ
   *
   * Type-safe database client for TypeScript & Node.js
   * @example
   * ```
   * const prisma = new PrismaClient()
   * // Fetch zero or more T_acessos
   * const t_acessos = await prisma.t_acessos.findMany()
   * ```
   *
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client).
   */

  constructor(optionsArg ?: Prisma.Subset<ClientOptions, Prisma.PrismaClientOptions>);
  $on<V extends U>(eventType: V, callback: (event: V extends 'query' ? Prisma.QueryEvent : Prisma.LogEvent) => void): PrismaClient;

  /**
   * Connect with the database
   */
  $connect(): $Utils.JsPromise<void>;

  /**
   * Disconnect from the database
   */
  $disconnect(): $Utils.JsPromise<void>;

/**
   * Executes a prepared raw query and returns the number of affected rows.
   * @example
   * ```
   * const result = await prisma.$executeRaw`UPDATE User SET cool = ${true} WHERE email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Executes a raw query and returns the number of affected rows.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$executeRawUnsafe('UPDATE User SET cool = $1 WHERE email = $2 ;', true, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $executeRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<number>;

  /**
   * Performs a prepared raw query and returns the `SELECT` data.
   * @example
   * ```
   * const result = await prisma.$queryRaw`SELECT * FROM User WHERE id = ${1} OR email = ${'user@email.com'};`
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRaw<T = unknown>(query: TemplateStringsArray | Prisma.Sql, ...values: any[]): Prisma.PrismaPromise<T>;

  /**
   * Performs a raw query and returns the `SELECT` data.
   * Susceptible to SQL injections, see documentation.
   * @example
   * ```
   * const result = await prisma.$queryRawUnsafe('SELECT * FROM User WHERE id = $1 OR email = $2;', 1, 'user@email.com')
   * ```
   *
   * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/raw-database-access).
   */
  $queryRawUnsafe<T = unknown>(query: string, ...values: any[]): Prisma.PrismaPromise<T>;


  /**
   * Allows the running of a sequence of read/write operations that are guaranteed to either succeed or fail as a whole.
   * @example
   * ```
   * const [george, bob, alice] = await prisma.$transaction([
   *   prisma.user.create({ data: { name: 'George' } }),
   *   prisma.user.create({ data: { name: 'Bob' } }),
   *   prisma.user.create({ data: { name: 'Alice' } }),
   * ])
   * ```
   * 
   * Read more in our [docs](https://www.prisma.io/docs/concepts/components/prisma-client/transactions).
   */
  $transaction<P extends Prisma.PrismaPromise<any>[]>(arg: [...P], options?: { isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<runtime.Types.Utils.UnwrapTuple<P>>

  $transaction<R>(fn: (prisma: Omit<PrismaClient, runtime.ITXClientDenyList>) => $Utils.JsPromise<R>, options?: { maxWait?: number, timeout?: number, isolationLevel?: Prisma.TransactionIsolationLevel }): $Utils.JsPromise<R>


  $extends: $Extensions.ExtendsHook<"extends", Prisma.TypeMapCb<ClientOptions>, ExtArgs, $Utils.Call<Prisma.TypeMapCb<ClientOptions>, {
    extArgs: ExtArgs
  }>>

      /**
   * `prisma.t_acessos`: Exposes CRUD operations for the **t_acessos** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more T_acessos
    * const t_acessos = await prisma.t_acessos.findMany()
    * ```
    */
  get t_acessos(): Prisma.t_acessosDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.t_banco`: Exposes CRUD operations for the **t_banco** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more T_bancos
    * const t_bancos = await prisma.t_banco.findMany()
    * ```
    */
  get t_banco(): Prisma.t_bancoDelegate<ExtArgs, ClientOptions>;

  /**
   * `prisma.t_log`: Exposes CRUD operations for the **t_log** model.
    * Example usage:
    * ```ts
    * // Fetch zero or more T_logs
    * const t_logs = await prisma.t_log.findMany()
    * ```
    */
  get t_log(): Prisma.t_logDelegate<ExtArgs, ClientOptions>;
}

export namespace Prisma {
  export import DMMF = runtime.DMMF

  export type PrismaPromise<T> = $Public.PrismaPromise<T>

  /**
   * Validator
   */
  export import validator = runtime.Public.validator

  /**
   * Prisma Errors
   */
  export import PrismaClientKnownRequestError = runtime.PrismaClientKnownRequestError
  export import PrismaClientUnknownRequestError = runtime.PrismaClientUnknownRequestError
  export import PrismaClientRustPanicError = runtime.PrismaClientRustPanicError
  export import PrismaClientInitializationError = runtime.PrismaClientInitializationError
  export import PrismaClientValidationError = runtime.PrismaClientValidationError

  /**
   * Re-export of sql-template-tag
   */
  export import sql = runtime.sqltag
  export import empty = runtime.empty
  export import join = runtime.join
  export import raw = runtime.raw
  export import Sql = runtime.Sql



  /**
   * Decimal.js
   */
  export import Decimal = runtime.Decimal

  export type DecimalJsLike = runtime.DecimalJsLike

  /**
   * Metrics
   */
  export type Metrics = runtime.Metrics
  export type Metric<T> = runtime.Metric<T>
  export type MetricHistogram = runtime.MetricHistogram
  export type MetricHistogramBucket = runtime.MetricHistogramBucket

  /**
  * Extensions
  */
  export import Extension = $Extensions.UserArgs
  export import getExtensionContext = runtime.Extensions.getExtensionContext
  export import Args = $Public.Args
  export import Payload = $Public.Payload
  export import Result = $Public.Result
  export import Exact = $Public.Exact

  /**
   * Prisma Client JS version: 6.19.0
   * Query Engine version: 2ba551f319ab1df4bc874a89965d8b3641056773
   */
  export type PrismaVersion = {
    client: string
  }

  export const prismaVersion: PrismaVersion

  /**
   * Utility Types
   */


  export import Bytes = runtime.Bytes
  export import JsonObject = runtime.JsonObject
  export import JsonArray = runtime.JsonArray
  export import JsonValue = runtime.JsonValue
  export import InputJsonObject = runtime.InputJsonObject
  export import InputJsonArray = runtime.InputJsonArray
  export import InputJsonValue = runtime.InputJsonValue

  /**
   * Types of the values used to represent different kinds of `null` values when working with JSON fields.
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  namespace NullTypes {
    /**
    * Type of `Prisma.DbNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.DbNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class DbNull {
      private DbNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.JsonNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.JsonNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class JsonNull {
      private JsonNull: never
      private constructor()
    }

    /**
    * Type of `Prisma.AnyNull`.
    *
    * You cannot use other instances of this class. Please use the `Prisma.AnyNull` value.
    *
    * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
    */
    class AnyNull {
      private AnyNull: never
      private constructor()
    }
  }

  /**
   * Helper for filtering JSON entries that have `null` on the database (empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const DbNull: NullTypes.DbNull

  /**
   * Helper for filtering JSON entries that have JSON `null` values (not empty on the db)
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const JsonNull: NullTypes.JsonNull

  /**
   * Helper for filtering JSON entries that are `Prisma.DbNull` or `Prisma.JsonNull`
   *
   * @see https://www.prisma.io/docs/concepts/components/prisma-client/working-with-fields/working-with-json-fields#filtering-on-a-json-field
   */
  export const AnyNull: NullTypes.AnyNull

  type SelectAndInclude = {
    select: any
    include: any
  }

  type SelectAndOmit = {
    select: any
    omit: any
  }

  /**
   * Get the type of the value, that the Promise holds.
   */
  export type PromiseType<T extends PromiseLike<any>> = T extends PromiseLike<infer U> ? U : T;

  /**
   * Get the return type of a function which returns a Promise.
   */
  export type PromiseReturnType<T extends (...args: any) => $Utils.JsPromise<any>> = PromiseType<ReturnType<T>>

  /**
   * From T, pick a set of properties whose keys are in the union K
   */
  type Prisma__Pick<T, K extends keyof T> = {
      [P in K]: T[P];
  };


  export type Enumerable<T> = T | Array<T>;

  export type RequiredKeys<T> = {
    [K in keyof T]-?: {} extends Prisma__Pick<T, K> ? never : K
  }[keyof T]

  export type TruthyKeys<T> = keyof {
    [K in keyof T as T[K] extends false | undefined | null ? never : K]: K
  }

  export type TrueKeys<T> = TruthyKeys<Prisma__Pick<T, RequiredKeys<T>>>

  /**
   * Subset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection
   */
  export type Subset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never;
  };

  /**
   * SelectSubset
   * @desc From `T` pick properties that exist in `U`. Simple version of Intersection.
   * Additionally, it validates, if both select and include are present. If the case, it errors.
   */
  export type SelectSubset<T, U> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    (T extends SelectAndInclude
      ? 'Please either choose `select` or `include`.'
      : T extends SelectAndOmit
        ? 'Please either choose `select` or `omit`.'
        : {})

  /**
   * Subset + Intersection
   * @desc From `T` pick properties that exist in `U` and intersect `K`
   */
  export type SubsetIntersection<T, U, K> = {
    [key in keyof T]: key extends keyof U ? T[key] : never
  } &
    K

  type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never };

  /**
   * XOR is needed to have a real mutually exclusive union type
   * https://stackoverflow.com/questions/42123407/does-typescript-support-mutually-exclusive-types
   */
  type XOR<T, U> =
    T extends object ?
    U extends object ?
      (Without<T, U> & U) | (Without<U, T> & T)
    : U : T


  /**
   * Is T a Record?
   */
  type IsObject<T extends any> = T extends Array<any>
  ? False
  : T extends Date
  ? False
  : T extends Uint8Array
  ? False
  : T extends BigInt
  ? False
  : T extends object
  ? True
  : False


  /**
   * If it's T[], return T
   */
  export type UnEnumerate<T extends unknown> = T extends Array<infer U> ? U : T

  /**
   * From ts-toolbelt
   */

  type __Either<O extends object, K extends Key> = Omit<O, K> &
    {
      // Merge all but K
      [P in K]: Prisma__Pick<O, P & keyof O> // With K possibilities
    }[K]

  type EitherStrict<O extends object, K extends Key> = Strict<__Either<O, K>>

  type EitherLoose<O extends object, K extends Key> = ComputeRaw<__Either<O, K>>

  type _Either<
    O extends object,
    K extends Key,
    strict extends Boolean
  > = {
    1: EitherStrict<O, K>
    0: EitherLoose<O, K>
  }[strict]

  type Either<
    O extends object,
    K extends Key,
    strict extends Boolean = 1
  > = O extends unknown ? _Either<O, K, strict> : never

  export type Union = any

  type PatchUndefined<O extends object, O1 extends object> = {
    [K in keyof O]: O[K] extends undefined ? At<O1, K> : O[K]
  } & {}

  /** Helper Types for "Merge" **/
  export type IntersectOf<U extends Union> = (
    U extends unknown ? (k: U) => void : never
  ) extends (k: infer I) => void
    ? I
    : never

  export type Overwrite<O extends object, O1 extends object> = {
      [K in keyof O]: K extends keyof O1 ? O1[K] : O[K];
  } & {};

  type _Merge<U extends object> = IntersectOf<Overwrite<U, {
      [K in keyof U]-?: At<U, K>;
  }>>;

  type Key = string | number | symbol;
  type AtBasic<O extends object, K extends Key> = K extends keyof O ? O[K] : never;
  type AtStrict<O extends object, K extends Key> = O[K & keyof O];
  type AtLoose<O extends object, K extends Key> = O extends unknown ? AtStrict<O, K> : never;
  export type At<O extends object, K extends Key, strict extends Boolean = 1> = {
      1: AtStrict<O, K>;
      0: AtLoose<O, K>;
  }[strict];

  export type ComputeRaw<A extends any> = A extends Function ? A : {
    [K in keyof A]: A[K];
  } & {};

  export type OptionalFlat<O> = {
    [K in keyof O]?: O[K];
  } & {};

  type _Record<K extends keyof any, T> = {
    [P in K]: T;
  };

  // cause typescript not to expand types and preserve names
  type NoExpand<T> = T extends unknown ? T : never;

  // this type assumes the passed object is entirely optional
  type AtLeast<O extends object, K extends string> = NoExpand<
    O extends unknown
    ? | (K extends keyof O ? { [P in K]: O[P] } & O : O)
      | {[P in keyof O as P extends K ? P : never]-?: O[P]} & O
    : never>;

  type _Strict<U, _U = U> = U extends unknown ? U & OptionalFlat<_Record<Exclude<Keys<_U>, keyof U>, never>> : never;

  export type Strict<U extends object> = ComputeRaw<_Strict<U>>;
  /** End Helper Types for "Merge" **/

  export type Merge<U extends object> = ComputeRaw<_Merge<Strict<U>>>;

  /**
  A [[Boolean]]
  */
  export type Boolean = True | False

  // /**
  // 1
  // */
  export type True = 1

  /**
  0
  */
  export type False = 0

  export type Not<B extends Boolean> = {
    0: 1
    1: 0
  }[B]

  export type Extends<A1 extends any, A2 extends any> = [A1] extends [never]
    ? 0 // anything `never` is false
    : A1 extends A2
    ? 1
    : 0

  export type Has<U extends Union, U1 extends Union> = Not<
    Extends<Exclude<U1, U>, U1>
  >

  export type Or<B1 extends Boolean, B2 extends Boolean> = {
    0: {
      0: 0
      1: 1
    }
    1: {
      0: 1
      1: 1
    }
  }[B1][B2]

  export type Keys<U extends Union> = U extends unknown ? keyof U : never

  type Cast<A, B> = A extends B ? A : B;

  export const type: unique symbol;



  /**
   * Used by group by
   */

  export type GetScalarType<T, O> = O extends object ? {
    [P in keyof T]: P extends keyof O
      ? O[P]
      : never
  } : never

  type FieldPaths<
    T,
    U = Omit<T, '_avg' | '_sum' | '_count' | '_min' | '_max'>
  > = IsObject<T> extends True ? U : T

  type GetHavingFields<T> = {
    [K in keyof T]: Or<
      Or<Extends<'OR', K>, Extends<'AND', K>>,
      Extends<'NOT', K>
    > extends True
      ? // infer is only needed to not hit TS limit
        // based on the brilliant idea of Pierre-Antoine Mills
        // https://github.com/microsoft/TypeScript/issues/30188#issuecomment-478938437
        T[K] extends infer TK
        ? GetHavingFields<UnEnumerate<TK> extends object ? Merge<UnEnumerate<TK>> : never>
        : never
      : {} extends FieldPaths<T[K]>
      ? never
      : K
  }[keyof T]

  /**
   * Convert tuple to union
   */
  type _TupleToUnion<T> = T extends (infer E)[] ? E : never
  type TupleToUnion<K extends readonly any[]> = _TupleToUnion<K>
  type MaybeTupleToUnion<T> = T extends any[] ? TupleToUnion<T> : T

  /**
   * Like `Pick`, but additionally can also accept an array of keys
   */
  type PickEnumerable<T, K extends Enumerable<keyof T> | keyof T> = Prisma__Pick<T, MaybeTupleToUnion<K>>

  /**
   * Exclude all keys with underscores
   */
  type ExcludeUnderscoreKeys<T extends string> = T extends `_${string}` ? never : T


  export type FieldRef<Model, FieldType> = runtime.FieldRef<Model, FieldType>

  type FieldRefInputType<Model, FieldType> = Model extends never ? never : FieldRef<Model, FieldType>


  export const ModelName: {
    t_acessos: 't_acessos',
    t_banco: 't_banco',
    t_log: 't_log'
  };

  export type ModelName = (typeof ModelName)[keyof typeof ModelName]


  export type Datasources = {
    db?: Datasource
  }

  interface TypeMapCb<ClientOptions = {}> extends $Utils.Fn<{extArgs: $Extensions.InternalArgs }, $Utils.Record<string, any>> {
    returns: Prisma.TypeMap<this['params']['extArgs'], ClientOptions extends { omit: infer OmitOptions } ? OmitOptions : {}>
  }

  export type TypeMap<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> = {
    globalOmitOptions: {
      omit: GlobalOmitOptions
    }
    meta: {
      modelProps: "t_acessos" | "t_banco" | "t_log"
      txIsolationLevel: Prisma.TransactionIsolationLevel
    }
    model: {
      t_acessos: {
        payload: Prisma.$t_acessosPayload<ExtArgs>
        fields: Prisma.t_acessosFieldRefs
        operations: {
          findUnique: {
            args: Prisma.t_acessosFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.t_acessosFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          findFirst: {
            args: Prisma.t_acessosFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.t_acessosFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          findMany: {
            args: Prisma.t_acessosFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>[]
          }
          create: {
            args: Prisma.t_acessosCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          createMany: {
            args: Prisma.t_acessosCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.t_acessosDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          update: {
            args: Prisma.t_acessosUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          deleteMany: {
            args: Prisma.t_acessosDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.t_acessosUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.t_acessosUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_acessosPayload>
          }
          aggregate: {
            args: Prisma.T_acessosAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateT_acessos>
          }
          groupBy: {
            args: Prisma.t_acessosGroupByArgs<ExtArgs>
            result: $Utils.Optional<T_acessosGroupByOutputType>[]
          }
          count: {
            args: Prisma.t_acessosCountArgs<ExtArgs>
            result: $Utils.Optional<T_acessosCountAggregateOutputType> | number
          }
        }
      }
      t_banco: {
        payload: Prisma.$t_bancoPayload<ExtArgs>
        fields: Prisma.t_bancoFieldRefs
        operations: {
          findUnique: {
            args: Prisma.t_bancoFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.t_bancoFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          findFirst: {
            args: Prisma.t_bancoFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.t_bancoFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          findMany: {
            args: Prisma.t_bancoFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>[]
          }
          create: {
            args: Prisma.t_bancoCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          createMany: {
            args: Prisma.t_bancoCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.t_bancoDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          update: {
            args: Prisma.t_bancoUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          deleteMany: {
            args: Prisma.t_bancoDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.t_bancoUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.t_bancoUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_bancoPayload>
          }
          aggregate: {
            args: Prisma.T_bancoAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateT_banco>
          }
          groupBy: {
            args: Prisma.t_bancoGroupByArgs<ExtArgs>
            result: $Utils.Optional<T_bancoGroupByOutputType>[]
          }
          count: {
            args: Prisma.t_bancoCountArgs<ExtArgs>
            result: $Utils.Optional<T_bancoCountAggregateOutputType> | number
          }
        }
      }
      t_log: {
        payload: Prisma.$t_logPayload<ExtArgs>
        fields: Prisma.t_logFieldRefs
        operations: {
          findUnique: {
            args: Prisma.t_logFindUniqueArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload> | null
          }
          findUniqueOrThrow: {
            args: Prisma.t_logFindUniqueOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          findFirst: {
            args: Prisma.t_logFindFirstArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload> | null
          }
          findFirstOrThrow: {
            args: Prisma.t_logFindFirstOrThrowArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          findMany: {
            args: Prisma.t_logFindManyArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>[]
          }
          create: {
            args: Prisma.t_logCreateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          createMany: {
            args: Prisma.t_logCreateManyArgs<ExtArgs>
            result: BatchPayload
          }
          delete: {
            args: Prisma.t_logDeleteArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          update: {
            args: Prisma.t_logUpdateArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          deleteMany: {
            args: Prisma.t_logDeleteManyArgs<ExtArgs>
            result: BatchPayload
          }
          updateMany: {
            args: Prisma.t_logUpdateManyArgs<ExtArgs>
            result: BatchPayload
          }
          upsert: {
            args: Prisma.t_logUpsertArgs<ExtArgs>
            result: $Utils.PayloadToResult<Prisma.$t_logPayload>
          }
          aggregate: {
            args: Prisma.T_logAggregateArgs<ExtArgs>
            result: $Utils.Optional<AggregateT_log>
          }
          groupBy: {
            args: Prisma.t_logGroupByArgs<ExtArgs>
            result: $Utils.Optional<T_logGroupByOutputType>[]
          }
          count: {
            args: Prisma.t_logCountArgs<ExtArgs>
            result: $Utils.Optional<T_logCountAggregateOutputType> | number
          }
        }
      }
    }
  } & {
    other: {
      payload: any
      operations: {
        $executeRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $executeRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
        $queryRaw: {
          args: [query: TemplateStringsArray | Prisma.Sql, ...values: any[]],
          result: any
        }
        $queryRawUnsafe: {
          args: [query: string, ...values: any[]],
          result: any
        }
      }
    }
  }
  export const defineExtension: $Extensions.ExtendsHook<"define", Prisma.TypeMapCb, $Extensions.DefaultArgs>
  export type DefaultPrismaClient = PrismaClient
  export type ErrorFormat = 'pretty' | 'colorless' | 'minimal'
  export interface PrismaClientOptions {
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasources?: Datasources
    /**
     * Overwrites the datasource url from your schema.prisma file
     */
    datasourceUrl?: string
    /**
     * @default "colorless"
     */
    errorFormat?: ErrorFormat
    /**
     * @example
     * ```
     * // Shorthand for `emit: 'stdout'`
     * log: ['query', 'info', 'warn', 'error']
     * 
     * // Emit as events only
     * log: [
     *   { emit: 'event', level: 'query' },
     *   { emit: 'event', level: 'info' },
     *   { emit: 'event', level: 'warn' }
     *   { emit: 'event', level: 'error' }
     * ]
     * 
     * / Emit as events and log to stdout
     * og: [
     *  { emit: 'stdout', level: 'query' },
     *  { emit: 'stdout', level: 'info' },
     *  { emit: 'stdout', level: 'warn' }
     *  { emit: 'stdout', level: 'error' }
     * 
     * ```
     * Read more in our [docs](https://www.prisma.io/docs/reference/tools-and-interfaces/prisma-client/logging#the-log-option).
     */
    log?: (LogLevel | LogDefinition)[]
    /**
     * The default values for transactionOptions
     * maxWait ?= 2000
     * timeout ?= 5000
     */
    transactionOptions?: {
      maxWait?: number
      timeout?: number
      isolationLevel?: Prisma.TransactionIsolationLevel
    }
    /**
     * Instance of a Driver Adapter, e.g., like one provided by `@prisma/adapter-planetscale`
     */
    adapter?: runtime.SqlDriverAdapterFactory | null
    /**
     * Global configuration for omitting model fields by default.
     * 
     * @example
     * ```
     * const prisma = new PrismaClient({
     *   omit: {
     *     user: {
     *       password: true
     *     }
     *   }
     * })
     * ```
     */
    omit?: Prisma.GlobalOmitConfig
  }
  export type GlobalOmitConfig = {
    t_acessos?: t_acessosOmit
    t_banco?: t_bancoOmit
    t_log?: t_logOmit
  }

  /* Types for Logging */
  export type LogLevel = 'info' | 'query' | 'warn' | 'error'
  export type LogDefinition = {
    level: LogLevel
    emit: 'stdout' | 'event'
  }

  export type CheckIsLogLevel<T> = T extends LogLevel ? T : never;

  export type GetLogType<T> = CheckIsLogLevel<
    T extends LogDefinition ? T['level'] : T
  >;

  export type GetEvents<T extends any[]> = T extends Array<LogLevel | LogDefinition>
    ? GetLogType<T[number]>
    : never;

  export type QueryEvent = {
    timestamp: Date
    query: string
    params: string
    duration: number
    target: string
  }

  export type LogEvent = {
    timestamp: Date
    message: string
    target: string
  }
  /* End Types for Logging */


  export type PrismaAction =
    | 'findUnique'
    | 'findUniqueOrThrow'
    | 'findMany'
    | 'findFirst'
    | 'findFirstOrThrow'
    | 'create'
    | 'createMany'
    | 'createManyAndReturn'
    | 'update'
    | 'updateMany'
    | 'updateManyAndReturn'
    | 'upsert'
    | 'delete'
    | 'deleteMany'
    | 'executeRaw'
    | 'queryRaw'
    | 'aggregate'
    | 'count'
    | 'runCommandRaw'
    | 'findRaw'
    | 'groupBy'

  // tested in getLogLevel.test.ts
  export function getLogLevel(log: Array<LogLevel | LogDefinition>): LogLevel | undefined;

  /**
   * `PrismaClient` proxy available in interactive transactions.
   */
  export type TransactionClient = Omit<Prisma.DefaultPrismaClient, runtime.ITXClientDenyList>

  export type Datasource = {
    url?: string
  }

  /**
   * Count Types
   */



  /**
   * Models
   */

  /**
   * Model t_acessos
   */

  export type AggregateT_acessos = {
    _count: T_acessosCountAggregateOutputType | null
    _avg: T_acessosAvgAggregateOutputType | null
    _sum: T_acessosSumAggregateOutputType | null
    _min: T_acessosMinAggregateOutputType | null
    _max: T_acessosMaxAggregateOutputType | null
  }

  export type T_acessosAvgAggregateOutputType = {
    id: number | null
    con: number | null
  }

  export type T_acessosSumAggregateOutputType = {
    id: number | null
    con: number | null
  }

  export type T_acessosMinAggregateOutputType = {
    id: number | null
    login: string | null
    senha: string | null
    nome: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    createdAt: Date | null
    Empresa: string | null
    logoUrl: string | null
    imagem_capa: string | null
    subdominio: string | null
  }

  export type T_acessosMaxAggregateOutputType = {
    id: number | null
    login: string | null
    senha: string | null
    nome: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    createdAt: Date | null
    Empresa: string | null
    logoUrl: string | null
    imagem_capa: string | null
    subdominio: string | null
  }

  export type T_acessosCountAggregateOutputType = {
    id: number
    login: number
    senha: number
    nome: number
    funcao: number
    banco: number
    adm: number
    ativo: number
    con: number
    pwd: number
    cnpj: number
    ddd: number
    whatsapp: number
    createdAt: number
    Empresa: number
    logoUrl: number
    imagem_capa: number
    subdominio: number
    _all: number
  }


  export type T_acessosAvgAggregateInputType = {
    id?: true
    con?: true
  }

  export type T_acessosSumAggregateInputType = {
    id?: true
    con?: true
  }

  export type T_acessosMinAggregateInputType = {
    id?: true
    login?: true
    senha?: true
    nome?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    createdAt?: true
    Empresa?: true
    logoUrl?: true
    imagem_capa?: true
    subdominio?: true
  }

  export type T_acessosMaxAggregateInputType = {
    id?: true
    login?: true
    senha?: true
    nome?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    createdAt?: true
    Empresa?: true
    logoUrl?: true
    imagem_capa?: true
    subdominio?: true
  }

  export type T_acessosCountAggregateInputType = {
    id?: true
    login?: true
    senha?: true
    nome?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    createdAt?: true
    Empresa?: true
    logoUrl?: true
    imagem_capa?: true
    subdominio?: true
    _all?: true
  }

  export type T_acessosAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_acessos to aggregate.
     */
    where?: t_acessosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_acessos to fetch.
     */
    orderBy?: t_acessosOrderByWithRelationInput | t_acessosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: t_acessosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_acessos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_acessos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned t_acessos
    **/
    _count?: true | T_acessosCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: T_acessosAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: T_acessosSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: T_acessosMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: T_acessosMaxAggregateInputType
  }

  export type GetT_acessosAggregateType<T extends T_acessosAggregateArgs> = {
        [P in keyof T & keyof AggregateT_acessos]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateT_acessos[P]>
      : GetScalarType<T[P], AggregateT_acessos[P]>
  }




  export type t_acessosGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: t_acessosWhereInput
    orderBy?: t_acessosOrderByWithAggregationInput | t_acessosOrderByWithAggregationInput[]
    by: T_acessosScalarFieldEnum[] | T_acessosScalarFieldEnum
    having?: t_acessosScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: T_acessosCountAggregateInputType | true
    _avg?: T_acessosAvgAggregateInputType
    _sum?: T_acessosSumAggregateInputType
    _min?: T_acessosMinAggregateInputType
    _max?: T_acessosMaxAggregateInputType
  }

  export type T_acessosGroupByOutputType = {
    id: number
    login: string | null
    senha: string | null
    nome: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    createdAt: Date
    Empresa: string | null
    logoUrl: string | null
    imagem_capa: string | null
    subdominio: string | null
    _count: T_acessosCountAggregateOutputType | null
    _avg: T_acessosAvgAggregateOutputType | null
    _sum: T_acessosSumAggregateOutputType | null
    _min: T_acessosMinAggregateOutputType | null
    _max: T_acessosMaxAggregateOutputType | null
  }

  type GetT_acessosGroupByPayload<T extends t_acessosGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<T_acessosGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof T_acessosGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], T_acessosGroupByOutputType[P]>
            : GetScalarType<T[P], T_acessosGroupByOutputType[P]>
        }
      >
    >


  export type t_acessosSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    login?: boolean
    senha?: boolean
    nome?: boolean
    funcao?: boolean
    banco?: boolean
    adm?: boolean
    ativo?: boolean
    con?: boolean
    pwd?: boolean
    cnpj?: boolean
    ddd?: boolean
    whatsapp?: boolean
    createdAt?: boolean
    Empresa?: boolean
    logoUrl?: boolean
    imagem_capa?: boolean
    subdominio?: boolean
  }, ExtArgs["result"]["t_acessos"]>



  export type t_acessosSelectScalar = {
    id?: boolean
    login?: boolean
    senha?: boolean
    nome?: boolean
    funcao?: boolean
    banco?: boolean
    adm?: boolean
    ativo?: boolean
    con?: boolean
    pwd?: boolean
    cnpj?: boolean
    ddd?: boolean
    whatsapp?: boolean
    createdAt?: boolean
    Empresa?: boolean
    logoUrl?: boolean
    imagem_capa?: boolean
    subdominio?: boolean
  }

  export type t_acessosOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "login" | "senha" | "nome" | "funcao" | "banco" | "adm" | "ativo" | "con" | "pwd" | "cnpj" | "ddd" | "whatsapp" | "createdAt" | "Empresa" | "logoUrl" | "imagem_capa" | "subdominio", ExtArgs["result"]["t_acessos"]>

  export type $t_acessosPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "t_acessos"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      login: string | null
      senha: string | null
      nome: string | null
      funcao: string | null
      banco: string | null
      adm: string | null
      ativo: string | null
      con: number | null
      pwd: string | null
      cnpj: string | null
      ddd: string | null
      whatsapp: string | null
      createdAt: Date
      Empresa: string | null
      logoUrl: string | null
      imagem_capa: string | null
      subdominio: string | null
    }, ExtArgs["result"]["t_acessos"]>
    composites: {}
  }

  type t_acessosGetPayload<S extends boolean | null | undefined | t_acessosDefaultArgs> = $Result.GetResult<Prisma.$t_acessosPayload, S>

  type t_acessosCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<t_acessosFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: T_acessosCountAggregateInputType | true
    }

  export interface t_acessosDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['t_acessos'], meta: { name: 't_acessos' } }
    /**
     * Find zero or one T_acessos that matches the filter.
     * @param {t_acessosFindUniqueArgs} args - Arguments to find a T_acessos
     * @example
     * // Get one T_acessos
     * const t_acessos = await prisma.t_acessos.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends t_acessosFindUniqueArgs>(args: SelectSubset<T, t_acessosFindUniqueArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one T_acessos that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {t_acessosFindUniqueOrThrowArgs} args - Arguments to find a T_acessos
     * @example
     * // Get one T_acessos
     * const t_acessos = await prisma.t_acessos.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends t_acessosFindUniqueOrThrowArgs>(args: SelectSubset<T, t_acessosFindUniqueOrThrowArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_acessos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosFindFirstArgs} args - Arguments to find a T_acessos
     * @example
     * // Get one T_acessos
     * const t_acessos = await prisma.t_acessos.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends t_acessosFindFirstArgs>(args?: SelectSubset<T, t_acessosFindFirstArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_acessos that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosFindFirstOrThrowArgs} args - Arguments to find a T_acessos
     * @example
     * // Get one T_acessos
     * const t_acessos = await prisma.t_acessos.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends t_acessosFindFirstOrThrowArgs>(args?: SelectSubset<T, t_acessosFindFirstOrThrowArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more T_acessos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all T_acessos
     * const t_acessos = await prisma.t_acessos.findMany()
     * 
     * // Get first 10 T_acessos
     * const t_acessos = await prisma.t_acessos.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const t_acessosWithIdOnly = await prisma.t_acessos.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends t_acessosFindManyArgs>(args?: SelectSubset<T, t_acessosFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a T_acessos.
     * @param {t_acessosCreateArgs} args - Arguments to create a T_acessos.
     * @example
     * // Create one T_acessos
     * const T_acessos = await prisma.t_acessos.create({
     *   data: {
     *     // ... data to create a T_acessos
     *   }
     * })
     * 
     */
    create<T extends t_acessosCreateArgs>(args: SelectSubset<T, t_acessosCreateArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many T_acessos.
     * @param {t_acessosCreateManyArgs} args - Arguments to create many T_acessos.
     * @example
     * // Create many T_acessos
     * const t_acessos = await prisma.t_acessos.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends t_acessosCreateManyArgs>(args?: SelectSubset<T, t_acessosCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a T_acessos.
     * @param {t_acessosDeleteArgs} args - Arguments to delete one T_acessos.
     * @example
     * // Delete one T_acessos
     * const T_acessos = await prisma.t_acessos.delete({
     *   where: {
     *     // ... filter to delete one T_acessos
     *   }
     * })
     * 
     */
    delete<T extends t_acessosDeleteArgs>(args: SelectSubset<T, t_acessosDeleteArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one T_acessos.
     * @param {t_acessosUpdateArgs} args - Arguments to update one T_acessos.
     * @example
     * // Update one T_acessos
     * const t_acessos = await prisma.t_acessos.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends t_acessosUpdateArgs>(args: SelectSubset<T, t_acessosUpdateArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more T_acessos.
     * @param {t_acessosDeleteManyArgs} args - Arguments to filter T_acessos to delete.
     * @example
     * // Delete a few T_acessos
     * const { count } = await prisma.t_acessos.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends t_acessosDeleteManyArgs>(args?: SelectSubset<T, t_acessosDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more T_acessos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many T_acessos
     * const t_acessos = await prisma.t_acessos.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends t_acessosUpdateManyArgs>(args: SelectSubset<T, t_acessosUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one T_acessos.
     * @param {t_acessosUpsertArgs} args - Arguments to update or create a T_acessos.
     * @example
     * // Update or create a T_acessos
     * const t_acessos = await prisma.t_acessos.upsert({
     *   create: {
     *     // ... data to create a T_acessos
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the T_acessos we want to update
     *   }
     * })
     */
    upsert<T extends t_acessosUpsertArgs>(args: SelectSubset<T, t_acessosUpsertArgs<ExtArgs>>): Prisma__t_acessosClient<$Result.GetResult<Prisma.$t_acessosPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of T_acessos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosCountArgs} args - Arguments to filter T_acessos to count.
     * @example
     * // Count the number of T_acessos
     * const count = await prisma.t_acessos.count({
     *   where: {
     *     // ... the filter for the T_acessos we want to count
     *   }
     * })
    **/
    count<T extends t_acessosCountArgs>(
      args?: Subset<T, t_acessosCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], T_acessosCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a T_acessos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {T_acessosAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends T_acessosAggregateArgs>(args: Subset<T, T_acessosAggregateArgs>): Prisma.PrismaPromise<GetT_acessosAggregateType<T>>

    /**
     * Group by T_acessos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_acessosGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends t_acessosGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: t_acessosGroupByArgs['orderBy'] }
        : { orderBy?: t_acessosGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, t_acessosGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetT_acessosGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the t_acessos model
   */
  readonly fields: t_acessosFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for t_acessos.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__t_acessosClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the t_acessos model
   */
  interface t_acessosFieldRefs {
    readonly id: FieldRef<"t_acessos", 'Int'>
    readonly login: FieldRef<"t_acessos", 'String'>
    readonly senha: FieldRef<"t_acessos", 'String'>
    readonly nome: FieldRef<"t_acessos", 'String'>
    readonly funcao: FieldRef<"t_acessos", 'String'>
    readonly banco: FieldRef<"t_acessos", 'String'>
    readonly adm: FieldRef<"t_acessos", 'String'>
    readonly ativo: FieldRef<"t_acessos", 'String'>
    readonly con: FieldRef<"t_acessos", 'Int'>
    readonly pwd: FieldRef<"t_acessos", 'String'>
    readonly cnpj: FieldRef<"t_acessos", 'String'>
    readonly ddd: FieldRef<"t_acessos", 'String'>
    readonly whatsapp: FieldRef<"t_acessos", 'String'>
    readonly createdAt: FieldRef<"t_acessos", 'DateTime'>
    readonly Empresa: FieldRef<"t_acessos", 'String'>
    readonly logoUrl: FieldRef<"t_acessos", 'String'>
    readonly imagem_capa: FieldRef<"t_acessos", 'String'>
    readonly subdominio: FieldRef<"t_acessos", 'String'>
  }
    

  // Custom InputTypes
  /**
   * t_acessos findUnique
   */
  export type t_acessosFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter, which t_acessos to fetch.
     */
    where: t_acessosWhereUniqueInput
  }

  /**
   * t_acessos findUniqueOrThrow
   */
  export type t_acessosFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter, which t_acessos to fetch.
     */
    where: t_acessosWhereUniqueInput
  }

  /**
   * t_acessos findFirst
   */
  export type t_acessosFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter, which t_acessos to fetch.
     */
    where?: t_acessosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_acessos to fetch.
     */
    orderBy?: t_acessosOrderByWithRelationInput | t_acessosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_acessos.
     */
    cursor?: t_acessosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_acessos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_acessos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_acessos.
     */
    distinct?: T_acessosScalarFieldEnum | T_acessosScalarFieldEnum[]
  }

  /**
   * t_acessos findFirstOrThrow
   */
  export type t_acessosFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter, which t_acessos to fetch.
     */
    where?: t_acessosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_acessos to fetch.
     */
    orderBy?: t_acessosOrderByWithRelationInput | t_acessosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_acessos.
     */
    cursor?: t_acessosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_acessos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_acessos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_acessos.
     */
    distinct?: T_acessosScalarFieldEnum | T_acessosScalarFieldEnum[]
  }

  /**
   * t_acessos findMany
   */
  export type t_acessosFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter, which t_acessos to fetch.
     */
    where?: t_acessosWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_acessos to fetch.
     */
    orderBy?: t_acessosOrderByWithRelationInput | t_acessosOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing t_acessos.
     */
    cursor?: t_acessosWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_acessos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_acessos.
     */
    skip?: number
    distinct?: T_acessosScalarFieldEnum | T_acessosScalarFieldEnum[]
  }

  /**
   * t_acessos create
   */
  export type t_acessosCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * The data needed to create a t_acessos.
     */
    data?: XOR<t_acessosCreateInput, t_acessosUncheckedCreateInput>
  }

  /**
   * t_acessos createMany
   */
  export type t_acessosCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many t_acessos.
     */
    data: t_acessosCreateManyInput | t_acessosCreateManyInput[]
  }

  /**
   * t_acessos update
   */
  export type t_acessosUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * The data needed to update a t_acessos.
     */
    data: XOR<t_acessosUpdateInput, t_acessosUncheckedUpdateInput>
    /**
     * Choose, which t_acessos to update.
     */
    where: t_acessosWhereUniqueInput
  }

  /**
   * t_acessos updateMany
   */
  export type t_acessosUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update t_acessos.
     */
    data: XOR<t_acessosUpdateManyMutationInput, t_acessosUncheckedUpdateManyInput>
    /**
     * Filter which t_acessos to update
     */
    where?: t_acessosWhereInput
    /**
     * Limit how many t_acessos to update.
     */
    limit?: number
  }

  /**
   * t_acessos upsert
   */
  export type t_acessosUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * The filter to search for the t_acessos to update in case it exists.
     */
    where: t_acessosWhereUniqueInput
    /**
     * In case the t_acessos found by the `where` argument doesn't exist, create a new t_acessos with this data.
     */
    create: XOR<t_acessosCreateInput, t_acessosUncheckedCreateInput>
    /**
     * In case the t_acessos was found with the provided `where` argument, update it with this data.
     */
    update: XOR<t_acessosUpdateInput, t_acessosUncheckedUpdateInput>
  }

  /**
   * t_acessos delete
   */
  export type t_acessosDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
    /**
     * Filter which t_acessos to delete.
     */
    where: t_acessosWhereUniqueInput
  }

  /**
   * t_acessos deleteMany
   */
  export type t_acessosDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_acessos to delete
     */
    where?: t_acessosWhereInput
    /**
     * Limit how many t_acessos to delete.
     */
    limit?: number
  }

  /**
   * t_acessos without action
   */
  export type t_acessosDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_acessos
     */
    select?: t_acessosSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_acessos
     */
    omit?: t_acessosOmit<ExtArgs> | null
  }


  /**
   * Model t_banco
   */

  export type AggregateT_banco = {
    _count: T_bancoCountAggregateOutputType | null
    _avg: T_bancoAvgAggregateOutputType | null
    _sum: T_bancoSumAggregateOutputType | null
    _min: T_bancoMinAggregateOutputType | null
    _max: T_bancoMaxAggregateOutputType | null
  }

  export type T_bancoAvgAggregateOutputType = {
    id: number | null
  }

  export type T_bancoSumAggregateOutputType = {
    id: number | null
  }

  export type T_bancoMinAggregateOutputType = {
    id: number | null
    banco: string | null
    hscode: string | null
    data: Date | null
  }

  export type T_bancoMaxAggregateOutputType = {
    id: number | null
    banco: string | null
    hscode: string | null
    data: Date | null
  }

  export type T_bancoCountAggregateOutputType = {
    id: number
    banco: number
    hscode: number
    data: number
    _all: number
  }


  export type T_bancoAvgAggregateInputType = {
    id?: true
  }

  export type T_bancoSumAggregateInputType = {
    id?: true
  }

  export type T_bancoMinAggregateInputType = {
    id?: true
    banco?: true
    hscode?: true
    data?: true
  }

  export type T_bancoMaxAggregateInputType = {
    id?: true
    banco?: true
    hscode?: true
    data?: true
  }

  export type T_bancoCountAggregateInputType = {
    id?: true
    banco?: true
    hscode?: true
    data?: true
    _all?: true
  }

  export type T_bancoAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_banco to aggregate.
     */
    where?: t_bancoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_bancos to fetch.
     */
    orderBy?: t_bancoOrderByWithRelationInput | t_bancoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: t_bancoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_bancos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_bancos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned t_bancos
    **/
    _count?: true | T_bancoCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: T_bancoAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: T_bancoSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: T_bancoMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: T_bancoMaxAggregateInputType
  }

  export type GetT_bancoAggregateType<T extends T_bancoAggregateArgs> = {
        [P in keyof T & keyof AggregateT_banco]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateT_banco[P]>
      : GetScalarType<T[P], AggregateT_banco[P]>
  }




  export type t_bancoGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: t_bancoWhereInput
    orderBy?: t_bancoOrderByWithAggregationInput | t_bancoOrderByWithAggregationInput[]
    by: T_bancoScalarFieldEnum[] | T_bancoScalarFieldEnum
    having?: t_bancoScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: T_bancoCountAggregateInputType | true
    _avg?: T_bancoAvgAggregateInputType
    _sum?: T_bancoSumAggregateInputType
    _min?: T_bancoMinAggregateInputType
    _max?: T_bancoMaxAggregateInputType
  }

  export type T_bancoGroupByOutputType = {
    id: number
    banco: string | null
    hscode: string | null
    data: Date | null
    _count: T_bancoCountAggregateOutputType | null
    _avg: T_bancoAvgAggregateOutputType | null
    _sum: T_bancoSumAggregateOutputType | null
    _min: T_bancoMinAggregateOutputType | null
    _max: T_bancoMaxAggregateOutputType | null
  }

  type GetT_bancoGroupByPayload<T extends t_bancoGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<T_bancoGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof T_bancoGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], T_bancoGroupByOutputType[P]>
            : GetScalarType<T[P], T_bancoGroupByOutputType[P]>
        }
      >
    >


  export type t_bancoSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    id?: boolean
    banco?: boolean
    hscode?: boolean
    data?: boolean
  }, ExtArgs["result"]["t_banco"]>



  export type t_bancoSelectScalar = {
    id?: boolean
    banco?: boolean
    hscode?: boolean
    data?: boolean
  }

  export type t_bancoOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "banco" | "hscode" | "data", ExtArgs["result"]["t_banco"]>

  export type $t_bancoPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "t_banco"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      banco: string | null
      hscode: string | null
      data: Date | null
    }, ExtArgs["result"]["t_banco"]>
    composites: {}
  }

  type t_bancoGetPayload<S extends boolean | null | undefined | t_bancoDefaultArgs> = $Result.GetResult<Prisma.$t_bancoPayload, S>

  type t_bancoCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<t_bancoFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: T_bancoCountAggregateInputType | true
    }

  export interface t_bancoDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['t_banco'], meta: { name: 't_banco' } }
    /**
     * Find zero or one T_banco that matches the filter.
     * @param {t_bancoFindUniqueArgs} args - Arguments to find a T_banco
     * @example
     * // Get one T_banco
     * const t_banco = await prisma.t_banco.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends t_bancoFindUniqueArgs>(args: SelectSubset<T, t_bancoFindUniqueArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one T_banco that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {t_bancoFindUniqueOrThrowArgs} args - Arguments to find a T_banco
     * @example
     * // Get one T_banco
     * const t_banco = await prisma.t_banco.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends t_bancoFindUniqueOrThrowArgs>(args: SelectSubset<T, t_bancoFindUniqueOrThrowArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_banco that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoFindFirstArgs} args - Arguments to find a T_banco
     * @example
     * // Get one T_banco
     * const t_banco = await prisma.t_banco.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends t_bancoFindFirstArgs>(args?: SelectSubset<T, t_bancoFindFirstArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_banco that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoFindFirstOrThrowArgs} args - Arguments to find a T_banco
     * @example
     * // Get one T_banco
     * const t_banco = await prisma.t_banco.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends t_bancoFindFirstOrThrowArgs>(args?: SelectSubset<T, t_bancoFindFirstOrThrowArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more T_bancos that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all T_bancos
     * const t_bancos = await prisma.t_banco.findMany()
     * 
     * // Get first 10 T_bancos
     * const t_bancos = await prisma.t_banco.findMany({ take: 10 })
     * 
     * // Only select the `id`
     * const t_bancoWithIdOnly = await prisma.t_banco.findMany({ select: { id: true } })
     * 
     */
    findMany<T extends t_bancoFindManyArgs>(args?: SelectSubset<T, t_bancoFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a T_banco.
     * @param {t_bancoCreateArgs} args - Arguments to create a T_banco.
     * @example
     * // Create one T_banco
     * const T_banco = await prisma.t_banco.create({
     *   data: {
     *     // ... data to create a T_banco
     *   }
     * })
     * 
     */
    create<T extends t_bancoCreateArgs>(args: SelectSubset<T, t_bancoCreateArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many T_bancos.
     * @param {t_bancoCreateManyArgs} args - Arguments to create many T_bancos.
     * @example
     * // Create many T_bancos
     * const t_banco = await prisma.t_banco.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends t_bancoCreateManyArgs>(args?: SelectSubset<T, t_bancoCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a T_banco.
     * @param {t_bancoDeleteArgs} args - Arguments to delete one T_banco.
     * @example
     * // Delete one T_banco
     * const T_banco = await prisma.t_banco.delete({
     *   where: {
     *     // ... filter to delete one T_banco
     *   }
     * })
     * 
     */
    delete<T extends t_bancoDeleteArgs>(args: SelectSubset<T, t_bancoDeleteArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one T_banco.
     * @param {t_bancoUpdateArgs} args - Arguments to update one T_banco.
     * @example
     * // Update one T_banco
     * const t_banco = await prisma.t_banco.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends t_bancoUpdateArgs>(args: SelectSubset<T, t_bancoUpdateArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more T_bancos.
     * @param {t_bancoDeleteManyArgs} args - Arguments to filter T_bancos to delete.
     * @example
     * // Delete a few T_bancos
     * const { count } = await prisma.t_banco.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends t_bancoDeleteManyArgs>(args?: SelectSubset<T, t_bancoDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more T_bancos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many T_bancos
     * const t_banco = await prisma.t_banco.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends t_bancoUpdateManyArgs>(args: SelectSubset<T, t_bancoUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one T_banco.
     * @param {t_bancoUpsertArgs} args - Arguments to update or create a T_banco.
     * @example
     * // Update or create a T_banco
     * const t_banco = await prisma.t_banco.upsert({
     *   create: {
     *     // ... data to create a T_banco
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the T_banco we want to update
     *   }
     * })
     */
    upsert<T extends t_bancoUpsertArgs>(args: SelectSubset<T, t_bancoUpsertArgs<ExtArgs>>): Prisma__t_bancoClient<$Result.GetResult<Prisma.$t_bancoPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of T_bancos.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoCountArgs} args - Arguments to filter T_bancos to count.
     * @example
     * // Count the number of T_bancos
     * const count = await prisma.t_banco.count({
     *   where: {
     *     // ... the filter for the T_bancos we want to count
     *   }
     * })
    **/
    count<T extends t_bancoCountArgs>(
      args?: Subset<T, t_bancoCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], T_bancoCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a T_banco.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {T_bancoAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends T_bancoAggregateArgs>(args: Subset<T, T_bancoAggregateArgs>): Prisma.PrismaPromise<GetT_bancoAggregateType<T>>

    /**
     * Group by T_banco.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_bancoGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends t_bancoGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: t_bancoGroupByArgs['orderBy'] }
        : { orderBy?: t_bancoGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, t_bancoGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetT_bancoGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the t_banco model
   */
  readonly fields: t_bancoFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for t_banco.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__t_bancoClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the t_banco model
   */
  interface t_bancoFieldRefs {
    readonly id: FieldRef<"t_banco", 'Int'>
    readonly banco: FieldRef<"t_banco", 'String'>
    readonly hscode: FieldRef<"t_banco", 'String'>
    readonly data: FieldRef<"t_banco", 'DateTime'>
  }
    

  // Custom InputTypes
  /**
   * t_banco findUnique
   */
  export type t_bancoFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter, which t_banco to fetch.
     */
    where: t_bancoWhereUniqueInput
  }

  /**
   * t_banco findUniqueOrThrow
   */
  export type t_bancoFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter, which t_banco to fetch.
     */
    where: t_bancoWhereUniqueInput
  }

  /**
   * t_banco findFirst
   */
  export type t_bancoFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter, which t_banco to fetch.
     */
    where?: t_bancoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_bancos to fetch.
     */
    orderBy?: t_bancoOrderByWithRelationInput | t_bancoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_bancos.
     */
    cursor?: t_bancoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_bancos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_bancos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_bancos.
     */
    distinct?: T_bancoScalarFieldEnum | T_bancoScalarFieldEnum[]
  }

  /**
   * t_banco findFirstOrThrow
   */
  export type t_bancoFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter, which t_banco to fetch.
     */
    where?: t_bancoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_bancos to fetch.
     */
    orderBy?: t_bancoOrderByWithRelationInput | t_bancoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_bancos.
     */
    cursor?: t_bancoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_bancos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_bancos.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_bancos.
     */
    distinct?: T_bancoScalarFieldEnum | T_bancoScalarFieldEnum[]
  }

  /**
   * t_banco findMany
   */
  export type t_bancoFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter, which t_bancos to fetch.
     */
    where?: t_bancoWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_bancos to fetch.
     */
    orderBy?: t_bancoOrderByWithRelationInput | t_bancoOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing t_bancos.
     */
    cursor?: t_bancoWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_bancos from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_bancos.
     */
    skip?: number
    distinct?: T_bancoScalarFieldEnum | T_bancoScalarFieldEnum[]
  }

  /**
   * t_banco create
   */
  export type t_bancoCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * The data needed to create a t_banco.
     */
    data?: XOR<t_bancoCreateInput, t_bancoUncheckedCreateInput>
  }

  /**
   * t_banco createMany
   */
  export type t_bancoCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many t_bancos.
     */
    data: t_bancoCreateManyInput | t_bancoCreateManyInput[]
  }

  /**
   * t_banco update
   */
  export type t_bancoUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * The data needed to update a t_banco.
     */
    data: XOR<t_bancoUpdateInput, t_bancoUncheckedUpdateInput>
    /**
     * Choose, which t_banco to update.
     */
    where: t_bancoWhereUniqueInput
  }

  /**
   * t_banco updateMany
   */
  export type t_bancoUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update t_bancos.
     */
    data: XOR<t_bancoUpdateManyMutationInput, t_bancoUncheckedUpdateManyInput>
    /**
     * Filter which t_bancos to update
     */
    where?: t_bancoWhereInput
    /**
     * Limit how many t_bancos to update.
     */
    limit?: number
  }

  /**
   * t_banco upsert
   */
  export type t_bancoUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * The filter to search for the t_banco to update in case it exists.
     */
    where: t_bancoWhereUniqueInput
    /**
     * In case the t_banco found by the `where` argument doesn't exist, create a new t_banco with this data.
     */
    create: XOR<t_bancoCreateInput, t_bancoUncheckedCreateInput>
    /**
     * In case the t_banco was found with the provided `where` argument, update it with this data.
     */
    update: XOR<t_bancoUpdateInput, t_bancoUncheckedUpdateInput>
  }

  /**
   * t_banco delete
   */
  export type t_bancoDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
    /**
     * Filter which t_banco to delete.
     */
    where: t_bancoWhereUniqueInput
  }

  /**
   * t_banco deleteMany
   */
  export type t_bancoDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_bancos to delete
     */
    where?: t_bancoWhereInput
    /**
     * Limit how many t_bancos to delete.
     */
    limit?: number
  }

  /**
   * t_banco without action
   */
  export type t_bancoDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_banco
     */
    select?: t_bancoSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_banco
     */
    omit?: t_bancoOmit<ExtArgs> | null
  }


  /**
   * Model t_log
   */

  export type AggregateT_log = {
    _count: T_logCountAggregateOutputType | null
    _avg: T_logAvgAggregateOutputType | null
    _sum: T_logSumAggregateOutputType | null
    _min: T_logMinAggregateOutputType | null
    _max: T_logMaxAggregateOutputType | null
  }

  export type T_logAvgAggregateOutputType = {
    reglog: number | null
  }

  export type T_logSumAggregateOutputType = {
    reglog: number | null
  }

  export type T_logMinAggregateOutputType = {
    reglog: number | null
    data: Date | null
    login: string | null
    usuario: string | null
    empresa: string | null
    loja: string | null
    motivo: string | null
  }

  export type T_logMaxAggregateOutputType = {
    reglog: number | null
    data: Date | null
    login: string | null
    usuario: string | null
    empresa: string | null
    loja: string | null
    motivo: string | null
  }

  export type T_logCountAggregateOutputType = {
    reglog: number
    data: number
    login: number
    usuario: number
    empresa: number
    loja: number
    motivo: number
    _all: number
  }


  export type T_logAvgAggregateInputType = {
    reglog?: true
  }

  export type T_logSumAggregateInputType = {
    reglog?: true
  }

  export type T_logMinAggregateInputType = {
    reglog?: true
    data?: true
    login?: true
    usuario?: true
    empresa?: true
    loja?: true
    motivo?: true
  }

  export type T_logMaxAggregateInputType = {
    reglog?: true
    data?: true
    login?: true
    usuario?: true
    empresa?: true
    loja?: true
    motivo?: true
  }

  export type T_logCountAggregateInputType = {
    reglog?: true
    data?: true
    login?: true
    usuario?: true
    empresa?: true
    loja?: true
    motivo?: true
    _all?: true
  }

  export type T_logAggregateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_log to aggregate.
     */
    where?: t_logWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_logs to fetch.
     */
    orderBy?: t_logOrderByWithRelationInput | t_logOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the start position
     */
    cursor?: t_logWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Count returned t_logs
    **/
    _count?: true | T_logCountAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to average
    **/
    _avg?: T_logAvgAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to sum
    **/
    _sum?: T_logSumAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the minimum value
    **/
    _min?: T_logMinAggregateInputType
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/aggregations Aggregation Docs}
     * 
     * Select which fields to find the maximum value
    **/
    _max?: T_logMaxAggregateInputType
  }

  export type GetT_logAggregateType<T extends T_logAggregateArgs> = {
        [P in keyof T & keyof AggregateT_log]: P extends '_count' | 'count'
      ? T[P] extends true
        ? number
        : GetScalarType<T[P], AggregateT_log[P]>
      : GetScalarType<T[P], AggregateT_log[P]>
  }




  export type t_logGroupByArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    where?: t_logWhereInput
    orderBy?: t_logOrderByWithAggregationInput | t_logOrderByWithAggregationInput[]
    by: T_logScalarFieldEnum[] | T_logScalarFieldEnum
    having?: t_logScalarWhereWithAggregatesInput
    take?: number
    skip?: number
    _count?: T_logCountAggregateInputType | true
    _avg?: T_logAvgAggregateInputType
    _sum?: T_logSumAggregateInputType
    _min?: T_logMinAggregateInputType
    _max?: T_logMaxAggregateInputType
  }

  export type T_logGroupByOutputType = {
    reglog: number
    data: Date | null
    login: string
    usuario: string | null
    empresa: string | null
    loja: string | null
    motivo: string | null
    _count: T_logCountAggregateOutputType | null
    _avg: T_logAvgAggregateOutputType | null
    _sum: T_logSumAggregateOutputType | null
    _min: T_logMinAggregateOutputType | null
    _max: T_logMaxAggregateOutputType | null
  }

  type GetT_logGroupByPayload<T extends t_logGroupByArgs> = Prisma.PrismaPromise<
    Array<
      PickEnumerable<T_logGroupByOutputType, T['by']> &
        {
          [P in ((keyof T) & (keyof T_logGroupByOutputType))]: P extends '_count'
            ? T[P] extends boolean
              ? number
              : GetScalarType<T[P], T_logGroupByOutputType[P]>
            : GetScalarType<T[P], T_logGroupByOutputType[P]>
        }
      >
    >


  export type t_logSelect<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetSelect<{
    reglog?: boolean
    data?: boolean
    login?: boolean
    usuario?: boolean
    empresa?: boolean
    loja?: boolean
    motivo?: boolean
  }, ExtArgs["result"]["t_log"]>



  export type t_logSelectScalar = {
    reglog?: boolean
    data?: boolean
    login?: boolean
    usuario?: boolean
    empresa?: boolean
    loja?: boolean
    motivo?: boolean
  }

  export type t_logOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"reglog" | "data" | "login" | "usuario" | "empresa" | "loja" | "motivo", ExtArgs["result"]["t_log"]>

  export type $t_logPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "t_log"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      reglog: number
      data: Date | null
      login: string
      usuario: string | null
      empresa: string | null
      loja: string | null
      motivo: string | null
    }, ExtArgs["result"]["t_log"]>
    composites: {}
  }

  type t_logGetPayload<S extends boolean | null | undefined | t_logDefaultArgs> = $Result.GetResult<Prisma.$t_logPayload, S>

  type t_logCountArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> =
    Omit<t_logFindManyArgs, 'select' | 'include' | 'distinct' | 'omit'> & {
      select?: T_logCountAggregateInputType | true
    }

  export interface t_logDelegate<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> {
    [K: symbol]: { types: Prisma.TypeMap<ExtArgs>['model']['t_log'], meta: { name: 't_log' } }
    /**
     * Find zero or one T_log that matches the filter.
     * @param {t_logFindUniqueArgs} args - Arguments to find a T_log
     * @example
     * // Get one T_log
     * const t_log = await prisma.t_log.findUnique({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUnique<T extends t_logFindUniqueArgs>(args: SelectSubset<T, t_logFindUniqueArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "findUnique", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find one T_log that matches the filter or throw an error with `error.code='P2025'`
     * if no matches were found.
     * @param {t_logFindUniqueOrThrowArgs} args - Arguments to find a T_log
     * @example
     * // Get one T_log
     * const t_log = await prisma.t_log.findUniqueOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findUniqueOrThrow<T extends t_logFindUniqueOrThrowArgs>(args: SelectSubset<T, t_logFindUniqueOrThrowArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "findUniqueOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_log that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logFindFirstArgs} args - Arguments to find a T_log
     * @example
     * // Get one T_log
     * const t_log = await prisma.t_log.findFirst({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirst<T extends t_logFindFirstArgs>(args?: SelectSubset<T, t_logFindFirstArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "findFirst", GlobalOmitOptions> | null, null, ExtArgs, GlobalOmitOptions>

    /**
     * Find the first T_log that matches the filter or
     * throw `PrismaKnownClientError` with `P2025` code if no matches were found.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logFindFirstOrThrowArgs} args - Arguments to find a T_log
     * @example
     * // Get one T_log
     * const t_log = await prisma.t_log.findFirstOrThrow({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     */
    findFirstOrThrow<T extends t_logFindFirstOrThrowArgs>(args?: SelectSubset<T, t_logFindFirstOrThrowArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "findFirstOrThrow", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Find zero or more T_logs that matches the filter.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logFindManyArgs} args - Arguments to filter and select certain fields only.
     * @example
     * // Get all T_logs
     * const t_logs = await prisma.t_log.findMany()
     * 
     * // Get first 10 T_logs
     * const t_logs = await prisma.t_log.findMany({ take: 10 })
     * 
     * // Only select the `reglog`
     * const t_logWithReglogOnly = await prisma.t_log.findMany({ select: { reglog: true } })
     * 
     */
    findMany<T extends t_logFindManyArgs>(args?: SelectSubset<T, t_logFindManyArgs<ExtArgs>>): Prisma.PrismaPromise<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "findMany", GlobalOmitOptions>>

    /**
     * Create a T_log.
     * @param {t_logCreateArgs} args - Arguments to create a T_log.
     * @example
     * // Create one T_log
     * const T_log = await prisma.t_log.create({
     *   data: {
     *     // ... data to create a T_log
     *   }
     * })
     * 
     */
    create<T extends t_logCreateArgs>(args: SelectSubset<T, t_logCreateArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "create", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Create many T_logs.
     * @param {t_logCreateManyArgs} args - Arguments to create many T_logs.
     * @example
     * // Create many T_logs
     * const t_log = await prisma.t_log.createMany({
     *   data: [
     *     // ... provide data here
     *   ]
     * })
     *     
     */
    createMany<T extends t_logCreateManyArgs>(args?: SelectSubset<T, t_logCreateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Delete a T_log.
     * @param {t_logDeleteArgs} args - Arguments to delete one T_log.
     * @example
     * // Delete one T_log
     * const T_log = await prisma.t_log.delete({
     *   where: {
     *     // ... filter to delete one T_log
     *   }
     * })
     * 
     */
    delete<T extends t_logDeleteArgs>(args: SelectSubset<T, t_logDeleteArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "delete", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Update one T_log.
     * @param {t_logUpdateArgs} args - Arguments to update one T_log.
     * @example
     * // Update one T_log
     * const t_log = await prisma.t_log.update({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    update<T extends t_logUpdateArgs>(args: SelectSubset<T, t_logUpdateArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "update", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>

    /**
     * Delete zero or more T_logs.
     * @param {t_logDeleteManyArgs} args - Arguments to filter T_logs to delete.
     * @example
     * // Delete a few T_logs
     * const { count } = await prisma.t_log.deleteMany({
     *   where: {
     *     // ... provide filter here
     *   }
     * })
     * 
     */
    deleteMany<T extends t_logDeleteManyArgs>(args?: SelectSubset<T, t_logDeleteManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Update zero or more T_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logUpdateManyArgs} args - Arguments to update one or more rows.
     * @example
     * // Update many T_logs
     * const t_log = await prisma.t_log.updateMany({
     *   where: {
     *     // ... provide filter here
     *   },
     *   data: {
     *     // ... provide data here
     *   }
     * })
     * 
     */
    updateMany<T extends t_logUpdateManyArgs>(args: SelectSubset<T, t_logUpdateManyArgs<ExtArgs>>): Prisma.PrismaPromise<BatchPayload>

    /**
     * Create or update one T_log.
     * @param {t_logUpsertArgs} args - Arguments to update or create a T_log.
     * @example
     * // Update or create a T_log
     * const t_log = await prisma.t_log.upsert({
     *   create: {
     *     // ... data to create a T_log
     *   },
     *   update: {
     *     // ... in case it already exists, update
     *   },
     *   where: {
     *     // ... the filter for the T_log we want to update
     *   }
     * })
     */
    upsert<T extends t_logUpsertArgs>(args: SelectSubset<T, t_logUpsertArgs<ExtArgs>>): Prisma__t_logClient<$Result.GetResult<Prisma.$t_logPayload<ExtArgs>, T, "upsert", GlobalOmitOptions>, never, ExtArgs, GlobalOmitOptions>


    /**
     * Count the number of T_logs.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logCountArgs} args - Arguments to filter T_logs to count.
     * @example
     * // Count the number of T_logs
     * const count = await prisma.t_log.count({
     *   where: {
     *     // ... the filter for the T_logs we want to count
     *   }
     * })
    **/
    count<T extends t_logCountArgs>(
      args?: Subset<T, t_logCountArgs>,
    ): Prisma.PrismaPromise<
      T extends $Utils.Record<'select', any>
        ? T['select'] extends true
          ? number
          : GetScalarType<T['select'], T_logCountAggregateOutputType>
        : number
    >

    /**
     * Allows you to perform aggregations operations on a T_log.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {T_logAggregateArgs} args - Select which aggregations you would like to apply and on what fields.
     * @example
     * // Ordered by age ascending
     * // Where email contains prisma.io
     * // Limited to the 10 users
     * const aggregations = await prisma.user.aggregate({
     *   _avg: {
     *     age: true,
     *   },
     *   where: {
     *     email: {
     *       contains: "prisma.io",
     *     },
     *   },
     *   orderBy: {
     *     age: "asc",
     *   },
     *   take: 10,
     * })
    **/
    aggregate<T extends T_logAggregateArgs>(args: Subset<T, T_logAggregateArgs>): Prisma.PrismaPromise<GetT_logAggregateType<T>>

    /**
     * Group by T_log.
     * Note, that providing `undefined` is treated as the value not being there.
     * Read more here: https://pris.ly/d/null-undefined
     * @param {t_logGroupByArgs} args - Group by arguments.
     * @example
     * // Group by city, order by createdAt, get count
     * const result = await prisma.user.groupBy({
     *   by: ['city', 'createdAt'],
     *   orderBy: {
     *     createdAt: true
     *   },
     *   _count: {
     *     _all: true
     *   },
     * })
     * 
    **/
    groupBy<
      T extends t_logGroupByArgs,
      HasSelectOrTake extends Or<
        Extends<'skip', Keys<T>>,
        Extends<'take', Keys<T>>
      >,
      OrderByArg extends True extends HasSelectOrTake
        ? { orderBy: t_logGroupByArgs['orderBy'] }
        : { orderBy?: t_logGroupByArgs['orderBy'] },
      OrderFields extends ExcludeUnderscoreKeys<Keys<MaybeTupleToUnion<T['orderBy']>>>,
      ByFields extends MaybeTupleToUnion<T['by']>,
      ByValid extends Has<ByFields, OrderFields>,
      HavingFields extends GetHavingFields<T['having']>,
      HavingValid extends Has<ByFields, HavingFields>,
      ByEmpty extends T['by'] extends never[] ? True : False,
      InputErrors extends ByEmpty extends True
      ? `Error: "by" must not be empty.`
      : HavingValid extends False
      ? {
          [P in HavingFields]: P extends ByFields
            ? never
            : P extends string
            ? `Error: Field "${P}" used in "having" needs to be provided in "by".`
            : [
                Error,
                'Field ',
                P,
                ` in "having" needs to be provided in "by"`,
              ]
        }[HavingFields]
      : 'take' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "take", you also need to provide "orderBy"'
      : 'skip' extends Keys<T>
      ? 'orderBy' extends Keys<T>
        ? ByValid extends True
          ? {}
          : {
              [P in OrderFields]: P extends ByFields
                ? never
                : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
            }[OrderFields]
        : 'Error: If you provide "skip", you also need to provide "orderBy"'
      : ByValid extends True
      ? {}
      : {
          [P in OrderFields]: P extends ByFields
            ? never
            : `Error: Field "${P}" in "orderBy" needs to be provided in "by"`
        }[OrderFields]
    >(args: SubsetIntersection<T, t_logGroupByArgs, OrderByArg> & InputErrors): {} extends InputErrors ? GetT_logGroupByPayload<T> : Prisma.PrismaPromise<InputErrors>
  /**
   * Fields of the t_log model
   */
  readonly fields: t_logFieldRefs;
  }

  /**
   * The delegate class that acts as a "Promise-like" for t_log.
   * Why is this prefixed with `Prisma__`?
   * Because we want to prevent naming conflicts as mentioned in
   * https://github.com/prisma/prisma-client-js/issues/707
   */
  export interface Prisma__t_logClient<T, Null = never, ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs, GlobalOmitOptions = {}> extends Prisma.PrismaPromise<T> {
    readonly [Symbol.toStringTag]: "PrismaPromise"
    /**
     * Attaches callbacks for the resolution and/or rejection of the Promise.
     * @param onfulfilled The callback to execute when the Promise is resolved.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of which ever callback is executed.
     */
    then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | undefined | null, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | undefined | null): $Utils.JsPromise<TResult1 | TResult2>
    /**
     * Attaches a callback for only the rejection of the Promise.
     * @param onrejected The callback to execute when the Promise is rejected.
     * @returns A Promise for the completion of the callback.
     */
    catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | undefined | null): $Utils.JsPromise<T | TResult>
    /**
     * Attaches a callback that is invoked when the Promise is settled (fulfilled or rejected). The
     * resolved value cannot be modified from the callback.
     * @param onfinally The callback to execute when the Promise is settled (fulfilled or rejected).
     * @returns A Promise for the completion of the callback.
     */
    finally(onfinally?: (() => void) | undefined | null): $Utils.JsPromise<T>
  }




  /**
   * Fields of the t_log model
   */
  interface t_logFieldRefs {
    readonly reglog: FieldRef<"t_log", 'Int'>
    readonly data: FieldRef<"t_log", 'DateTime'>
    readonly login: FieldRef<"t_log", 'String'>
    readonly usuario: FieldRef<"t_log", 'String'>
    readonly empresa: FieldRef<"t_log", 'String'>
    readonly loja: FieldRef<"t_log", 'String'>
    readonly motivo: FieldRef<"t_log", 'String'>
  }
    

  // Custom InputTypes
  /**
   * t_log findUnique
   */
  export type t_logFindUniqueArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter, which t_log to fetch.
     */
    where: t_logWhereUniqueInput
  }

  /**
   * t_log findUniqueOrThrow
   */
  export type t_logFindUniqueOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter, which t_log to fetch.
     */
    where: t_logWhereUniqueInput
  }

  /**
   * t_log findFirst
   */
  export type t_logFindFirstArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter, which t_log to fetch.
     */
    where?: t_logWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_logs to fetch.
     */
    orderBy?: t_logOrderByWithRelationInput | t_logOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_logs.
     */
    cursor?: t_logWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_logs.
     */
    distinct?: T_logScalarFieldEnum | T_logScalarFieldEnum[]
  }

  /**
   * t_log findFirstOrThrow
   */
  export type t_logFindFirstOrThrowArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter, which t_log to fetch.
     */
    where?: t_logWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_logs to fetch.
     */
    orderBy?: t_logOrderByWithRelationInput | t_logOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for searching for t_logs.
     */
    cursor?: t_logWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_logs.
     */
    skip?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/distinct Distinct Docs}
     * 
     * Filter by unique combinations of t_logs.
     */
    distinct?: T_logScalarFieldEnum | T_logScalarFieldEnum[]
  }

  /**
   * t_log findMany
   */
  export type t_logFindManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter, which t_logs to fetch.
     */
    where?: t_logWhereInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/sorting Sorting Docs}
     * 
     * Determine the order of t_logs to fetch.
     */
    orderBy?: t_logOrderByWithRelationInput | t_logOrderByWithRelationInput[]
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination#cursor-based-pagination Cursor Docs}
     * 
     * Sets the position for listing t_logs.
     */
    cursor?: t_logWhereUniqueInput
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Take `±n` t_logs from the position of the cursor.
     */
    take?: number
    /**
     * {@link https://www.prisma.io/docs/concepts/components/prisma-client/pagination Pagination Docs}
     * 
     * Skip the first `n` t_logs.
     */
    skip?: number
    distinct?: T_logScalarFieldEnum | T_logScalarFieldEnum[]
  }

  /**
   * t_log create
   */
  export type t_logCreateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * The data needed to create a t_log.
     */
    data: XOR<t_logCreateInput, t_logUncheckedCreateInput>
  }

  /**
   * t_log createMany
   */
  export type t_logCreateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to create many t_logs.
     */
    data: t_logCreateManyInput | t_logCreateManyInput[]
  }

  /**
   * t_log update
   */
  export type t_logUpdateArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * The data needed to update a t_log.
     */
    data: XOR<t_logUpdateInput, t_logUncheckedUpdateInput>
    /**
     * Choose, which t_log to update.
     */
    where: t_logWhereUniqueInput
  }

  /**
   * t_log updateMany
   */
  export type t_logUpdateManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * The data used to update t_logs.
     */
    data: XOR<t_logUpdateManyMutationInput, t_logUncheckedUpdateManyInput>
    /**
     * Filter which t_logs to update
     */
    where?: t_logWhereInput
    /**
     * Limit how many t_logs to update.
     */
    limit?: number
  }

  /**
   * t_log upsert
   */
  export type t_logUpsertArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * The filter to search for the t_log to update in case it exists.
     */
    where: t_logWhereUniqueInput
    /**
     * In case the t_log found by the `where` argument doesn't exist, create a new t_log with this data.
     */
    create: XOR<t_logCreateInput, t_logUncheckedCreateInput>
    /**
     * In case the t_log was found with the provided `where` argument, update it with this data.
     */
    update: XOR<t_logUpdateInput, t_logUncheckedUpdateInput>
  }

  /**
   * t_log delete
   */
  export type t_logDeleteArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
    /**
     * Filter which t_log to delete.
     */
    where: t_logWhereUniqueInput
  }

  /**
   * t_log deleteMany
   */
  export type t_logDeleteManyArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Filter which t_logs to delete
     */
    where?: t_logWhereInput
    /**
     * Limit how many t_logs to delete.
     */
    limit?: number
  }

  /**
   * t_log without action
   */
  export type t_logDefaultArgs<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    /**
     * Select specific fields to fetch from the t_log
     */
    select?: t_logSelect<ExtArgs> | null
    /**
     * Omit specific fields from the t_log
     */
    omit?: t_logOmit<ExtArgs> | null
  }


  /**
   * Enums
   */

  export const TransactionIsolationLevel: {
    ReadUncommitted: 'ReadUncommitted',
    ReadCommitted: 'ReadCommitted',
    RepeatableRead: 'RepeatableRead',
    Serializable: 'Serializable',
    Snapshot: 'Snapshot'
  };

  export type TransactionIsolationLevel = (typeof TransactionIsolationLevel)[keyof typeof TransactionIsolationLevel]


  export const T_acessosScalarFieldEnum: {
    id: 'id',
    login: 'login',
    senha: 'senha',
    nome: 'nome',
    funcao: 'funcao',
    banco: 'banco',
    adm: 'adm',
    ativo: 'ativo',
    con: 'con',
    pwd: 'pwd',
    cnpj: 'cnpj',
    ddd: 'ddd',
    whatsapp: 'whatsapp',
    createdAt: 'createdAt',
    Empresa: 'Empresa',
    logoUrl: 'logoUrl',
    imagem_capa: 'imagem_capa',
    subdominio: 'subdominio'
  };

  export type T_acessosScalarFieldEnum = (typeof T_acessosScalarFieldEnum)[keyof typeof T_acessosScalarFieldEnum]


  export const T_bancoScalarFieldEnum: {
    id: 'id',
    banco: 'banco',
    hscode: 'hscode',
    data: 'data'
  };

  export type T_bancoScalarFieldEnum = (typeof T_bancoScalarFieldEnum)[keyof typeof T_bancoScalarFieldEnum]


  export const T_logScalarFieldEnum: {
    reglog: 'reglog',
    data: 'data',
    login: 'login',
    usuario: 'usuario',
    empresa: 'empresa',
    loja: 'loja',
    motivo: 'motivo'
  };

  export type T_logScalarFieldEnum = (typeof T_logScalarFieldEnum)[keyof typeof T_logScalarFieldEnum]


  export const SortOrder: {
    asc: 'asc',
    desc: 'desc'
  };

  export type SortOrder = (typeof SortOrder)[keyof typeof SortOrder]


  export const NullsOrder: {
    first: 'first',
    last: 'last'
  };

  export type NullsOrder = (typeof NullsOrder)[keyof typeof NullsOrder]


  /**
   * Field references
   */


  /**
   * Reference to a field of type 'Int'
   */
  export type IntFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Int'>
    


  /**
   * Reference to a field of type 'String'
   */
  export type StringFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'String'>
    


  /**
   * Reference to a field of type 'DateTime'
   */
  export type DateTimeFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'DateTime'>
    


  /**
   * Reference to a field of type 'Float'
   */
  export type FloatFieldRefInput<$PrismaModel> = FieldRefInputType<$PrismaModel, 'Float'>
    
  /**
   * Deep Input Types
   */


  export type t_acessosWhereInput = {
    AND?: t_acessosWhereInput | t_acessosWhereInput[]
    OR?: t_acessosWhereInput[]
    NOT?: t_acessosWhereInput | t_acessosWhereInput[]
    id?: IntFilter<"t_acessos"> | number
    login?: StringNullableFilter<"t_acessos"> | string | null
    senha?: StringNullableFilter<"t_acessos"> | string | null
    nome?: StringNullableFilter<"t_acessos"> | string | null
    funcao?: StringNullableFilter<"t_acessos"> | string | null
    banco?: StringNullableFilter<"t_acessos"> | string | null
    adm?: StringNullableFilter<"t_acessos"> | string | null
    ativo?: StringNullableFilter<"t_acessos"> | string | null
    con?: IntNullableFilter<"t_acessos"> | number | null
    pwd?: StringNullableFilter<"t_acessos"> | string | null
    cnpj?: StringNullableFilter<"t_acessos"> | string | null
    ddd?: StringNullableFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableFilter<"t_acessos"> | string | null
    createdAt?: DateTimeFilter<"t_acessos"> | Date | string
    Empresa?: StringNullableFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableFilter<"t_acessos"> | string | null
    imagem_capa?: StringNullableFilter<"t_acessos"> | string | null
    subdominio?: StringNullableFilter<"t_acessos"> | string | null
  }

  export type t_acessosOrderByWithRelationInput = {
    id?: SortOrder
    login?: SortOrderInput | SortOrder
    senha?: SortOrderInput | SortOrder
    nome?: SortOrderInput | SortOrder
    funcao?: SortOrderInput | SortOrder
    banco?: SortOrderInput | SortOrder
    adm?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
    con?: SortOrderInput | SortOrder
    pwd?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    ddd?: SortOrderInput | SortOrder
    whatsapp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    Empresa?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    imagem_capa?: SortOrderInput | SortOrder
    subdominio?: SortOrderInput | SortOrder
  }

  export type t_acessosWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: t_acessosWhereInput | t_acessosWhereInput[]
    OR?: t_acessosWhereInput[]
    NOT?: t_acessosWhereInput | t_acessosWhereInput[]
    login?: StringNullableFilter<"t_acessos"> | string | null
    senha?: StringNullableFilter<"t_acessos"> | string | null
    nome?: StringNullableFilter<"t_acessos"> | string | null
    funcao?: StringNullableFilter<"t_acessos"> | string | null
    banco?: StringNullableFilter<"t_acessos"> | string | null
    adm?: StringNullableFilter<"t_acessos"> | string | null
    ativo?: StringNullableFilter<"t_acessos"> | string | null
    con?: IntNullableFilter<"t_acessos"> | number | null
    pwd?: StringNullableFilter<"t_acessos"> | string | null
    cnpj?: StringNullableFilter<"t_acessos"> | string | null
    ddd?: StringNullableFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableFilter<"t_acessos"> | string | null
    createdAt?: DateTimeFilter<"t_acessos"> | Date | string
    Empresa?: StringNullableFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableFilter<"t_acessos"> | string | null
    imagem_capa?: StringNullableFilter<"t_acessos"> | string | null
    subdominio?: StringNullableFilter<"t_acessos"> | string | null
  }, "id">

  export type t_acessosOrderByWithAggregationInput = {
    id?: SortOrder
    login?: SortOrderInput | SortOrder
    senha?: SortOrderInput | SortOrder
    nome?: SortOrderInput | SortOrder
    funcao?: SortOrderInput | SortOrder
    banco?: SortOrderInput | SortOrder
    adm?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
    con?: SortOrderInput | SortOrder
    pwd?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    ddd?: SortOrderInput | SortOrder
    whatsapp?: SortOrderInput | SortOrder
    createdAt?: SortOrder
    Empresa?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    imagem_capa?: SortOrderInput | SortOrder
    subdominio?: SortOrderInput | SortOrder
    _count?: t_acessosCountOrderByAggregateInput
    _avg?: t_acessosAvgOrderByAggregateInput
    _max?: t_acessosMaxOrderByAggregateInput
    _min?: t_acessosMinOrderByAggregateInput
    _sum?: t_acessosSumOrderByAggregateInput
  }

  export type t_acessosScalarWhereWithAggregatesInput = {
    AND?: t_acessosScalarWhereWithAggregatesInput | t_acessosScalarWhereWithAggregatesInput[]
    OR?: t_acessosScalarWhereWithAggregatesInput[]
    NOT?: t_acessosScalarWhereWithAggregatesInput | t_acessosScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"t_acessos"> | number
    login?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    senha?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    nome?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    funcao?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    banco?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    adm?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    ativo?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    con?: IntNullableWithAggregatesFilter<"t_acessos"> | number | null
    pwd?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    cnpj?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    ddd?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"t_acessos"> | Date | string
    Empresa?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    imagem_capa?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    subdominio?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
  }

  export type t_bancoWhereInput = {
    AND?: t_bancoWhereInput | t_bancoWhereInput[]
    OR?: t_bancoWhereInput[]
    NOT?: t_bancoWhereInput | t_bancoWhereInput[]
    id?: IntFilter<"t_banco"> | number
    banco?: StringNullableFilter<"t_banco"> | string | null
    hscode?: StringNullableFilter<"t_banco"> | string | null
    data?: DateTimeNullableFilter<"t_banco"> | Date | string | null
  }

  export type t_bancoOrderByWithRelationInput = {
    id?: SortOrder
    banco?: SortOrderInput | SortOrder
    hscode?: SortOrderInput | SortOrder
    data?: SortOrderInput | SortOrder
  }

  export type t_bancoWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: t_bancoWhereInput | t_bancoWhereInput[]
    OR?: t_bancoWhereInput[]
    NOT?: t_bancoWhereInput | t_bancoWhereInput[]
    banco?: StringNullableFilter<"t_banco"> | string | null
    hscode?: StringNullableFilter<"t_banco"> | string | null
    data?: DateTimeNullableFilter<"t_banco"> | Date | string | null
  }, "id">

  export type t_bancoOrderByWithAggregationInput = {
    id?: SortOrder
    banco?: SortOrderInput | SortOrder
    hscode?: SortOrderInput | SortOrder
    data?: SortOrderInput | SortOrder
    _count?: t_bancoCountOrderByAggregateInput
    _avg?: t_bancoAvgOrderByAggregateInput
    _max?: t_bancoMaxOrderByAggregateInput
    _min?: t_bancoMinOrderByAggregateInput
    _sum?: t_bancoSumOrderByAggregateInput
  }

  export type t_bancoScalarWhereWithAggregatesInput = {
    AND?: t_bancoScalarWhereWithAggregatesInput | t_bancoScalarWhereWithAggregatesInput[]
    OR?: t_bancoScalarWhereWithAggregatesInput[]
    NOT?: t_bancoScalarWhereWithAggregatesInput | t_bancoScalarWhereWithAggregatesInput[]
    id?: IntWithAggregatesFilter<"t_banco"> | number
    banco?: StringNullableWithAggregatesFilter<"t_banco"> | string | null
    hscode?: StringNullableWithAggregatesFilter<"t_banco"> | string | null
    data?: DateTimeNullableWithAggregatesFilter<"t_banco"> | Date | string | null
  }

  export type t_logWhereInput = {
    AND?: t_logWhereInput | t_logWhereInput[]
    OR?: t_logWhereInput[]
    NOT?: t_logWhereInput | t_logWhereInput[]
    reglog?: IntFilter<"t_log"> | number
    data?: DateTimeNullableFilter<"t_log"> | Date | string | null
    login?: StringFilter<"t_log"> | string
    usuario?: StringNullableFilter<"t_log"> | string | null
    empresa?: StringNullableFilter<"t_log"> | string | null
    loja?: StringNullableFilter<"t_log"> | string | null
    motivo?: StringNullableFilter<"t_log"> | string | null
  }

  export type t_logOrderByWithRelationInput = {
    reglog?: SortOrder
    data?: SortOrderInput | SortOrder
    login?: SortOrder
    usuario?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    loja?: SortOrderInput | SortOrder
    motivo?: SortOrderInput | SortOrder
  }

  export type t_logWhereUniqueInput = Prisma.AtLeast<{
    reglog?: number
    AND?: t_logWhereInput | t_logWhereInput[]
    OR?: t_logWhereInput[]
    NOT?: t_logWhereInput | t_logWhereInput[]
    data?: DateTimeNullableFilter<"t_log"> | Date | string | null
    login?: StringFilter<"t_log"> | string
    usuario?: StringNullableFilter<"t_log"> | string | null
    empresa?: StringNullableFilter<"t_log"> | string | null
    loja?: StringNullableFilter<"t_log"> | string | null
    motivo?: StringNullableFilter<"t_log"> | string | null
  }, "reglog">

  export type t_logOrderByWithAggregationInput = {
    reglog?: SortOrder
    data?: SortOrderInput | SortOrder
    login?: SortOrder
    usuario?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    loja?: SortOrderInput | SortOrder
    motivo?: SortOrderInput | SortOrder
    _count?: t_logCountOrderByAggregateInput
    _avg?: t_logAvgOrderByAggregateInput
    _max?: t_logMaxOrderByAggregateInput
    _min?: t_logMinOrderByAggregateInput
    _sum?: t_logSumOrderByAggregateInput
  }

  export type t_logScalarWhereWithAggregatesInput = {
    AND?: t_logScalarWhereWithAggregatesInput | t_logScalarWhereWithAggregatesInput[]
    OR?: t_logScalarWhereWithAggregatesInput[]
    NOT?: t_logScalarWhereWithAggregatesInput | t_logScalarWhereWithAggregatesInput[]
    reglog?: IntWithAggregatesFilter<"t_log"> | number
    data?: DateTimeNullableWithAggregatesFilter<"t_log"> | Date | string | null
    login?: StringWithAggregatesFilter<"t_log"> | string
    usuario?: StringNullableWithAggregatesFilter<"t_log"> | string | null
    empresa?: StringNullableWithAggregatesFilter<"t_log"> | string | null
    loja?: StringNullableWithAggregatesFilter<"t_log"> | string | null
    motivo?: StringNullableWithAggregatesFilter<"t_log"> | string | null
  }

  export type t_acessosCreateInput = {
    login?: string | null
    senha?: string | null
    nome?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    createdAt?: Date | string
    Empresa?: string | null
    logoUrl?: string | null
    imagem_capa?: string | null
    subdominio?: string | null
  }

  export type t_acessosUncheckedCreateInput = {
    id?: number
    login?: string | null
    senha?: string | null
    nome?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    createdAt?: Date | string
    Empresa?: string | null
    logoUrl?: string | null
    imagem_capa?: string | null
    subdominio?: string | null
  }

  export type t_acessosUpdateInput = {
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Empresa?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imagem_capa?: NullableStringFieldUpdateOperationsInput | string | null
    subdominio?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_acessosUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Empresa?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imagem_capa?: NullableStringFieldUpdateOperationsInput | string | null
    subdominio?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_acessosCreateManyInput = {
    login?: string | null
    senha?: string | null
    nome?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    createdAt?: Date | string
    Empresa?: string | null
    logoUrl?: string | null
    imagem_capa?: string | null
    subdominio?: string | null
  }

  export type t_acessosUpdateManyMutationInput = {
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Empresa?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imagem_capa?: NullableStringFieldUpdateOperationsInput | string | null
    subdominio?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_acessosUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
    Empresa?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    imagem_capa?: NullableStringFieldUpdateOperationsInput | string | null
    subdominio?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_bancoCreateInput = {
    banco?: string | null
    hscode?: string | null
    data?: Date | string | null
  }

  export type t_bancoUncheckedCreateInput = {
    id?: number
    banco?: string | null
    hscode?: string | null
    data?: Date | string | null
  }

  export type t_bancoUpdateInput = {
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    hscode?: NullableStringFieldUpdateOperationsInput | string | null
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type t_bancoUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    hscode?: NullableStringFieldUpdateOperationsInput | string | null
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type t_bancoCreateManyInput = {
    banco?: string | null
    hscode?: string | null
    data?: Date | string | null
  }

  export type t_bancoUpdateManyMutationInput = {
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    hscode?: NullableStringFieldUpdateOperationsInput | string | null
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type t_bancoUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    hscode?: NullableStringFieldUpdateOperationsInput | string | null
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
  }

  export type t_logCreateInput = {
    data?: Date | string | null
    login: string
    usuario?: string | null
    empresa?: string | null
    loja?: string | null
    motivo?: string | null
  }

  export type t_logUncheckedCreateInput = {
    reglog?: number
    data?: Date | string | null
    login: string
    usuario?: string | null
    empresa?: string | null
    loja?: string | null
    motivo?: string | null
  }

  export type t_logUpdateInput = {
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    login?: StringFieldUpdateOperationsInput | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    loja?: NullableStringFieldUpdateOperationsInput | string | null
    motivo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_logUncheckedUpdateInput = {
    reglog?: IntFieldUpdateOperationsInput | number
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    login?: StringFieldUpdateOperationsInput | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    loja?: NullableStringFieldUpdateOperationsInput | string | null
    motivo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_logCreateManyInput = {
    data?: Date | string | null
    login: string
    usuario?: string | null
    empresa?: string | null
    loja?: string | null
    motivo?: string | null
  }

  export type t_logUpdateManyMutationInput = {
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    login?: StringFieldUpdateOperationsInput | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    loja?: NullableStringFieldUpdateOperationsInput | string | null
    motivo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type t_logUncheckedUpdateManyInput = {
    reglog?: IntFieldUpdateOperationsInput | number
    data?: NullableDateTimeFieldUpdateOperationsInput | Date | string | null
    login?: StringFieldUpdateOperationsInput | string
    usuario?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    loja?: NullableStringFieldUpdateOperationsInput | string | null
    motivo?: NullableStringFieldUpdateOperationsInput | string | null
  }

  export type IntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type StringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type IntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type DateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type SortOrderInput = {
    sort: SortOrder
    nulls?: NullsOrder
  }

  export type t_acessosCountOrderByAggregateInput = {
    id?: SortOrder
    login?: SortOrder
    senha?: SortOrder
    nome?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    createdAt?: SortOrder
    Empresa?: SortOrder
    logoUrl?: SortOrder
    imagem_capa?: SortOrder
    subdominio?: SortOrder
  }

  export type t_acessosAvgOrderByAggregateInput = {
    id?: SortOrder
    con?: SortOrder
  }

  export type t_acessosMaxOrderByAggregateInput = {
    id?: SortOrder
    login?: SortOrder
    senha?: SortOrder
    nome?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    createdAt?: SortOrder
    Empresa?: SortOrder
    logoUrl?: SortOrder
    imagem_capa?: SortOrder
    subdominio?: SortOrder
  }

  export type t_acessosMinOrderByAggregateInput = {
    id?: SortOrder
    login?: SortOrder
    senha?: SortOrder
    nome?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    createdAt?: SortOrder
    Empresa?: SortOrder
    logoUrl?: SortOrder
    imagem_capa?: SortOrder
    subdominio?: SortOrder
  }

  export type t_acessosSumOrderByAggregateInput = {
    id?: SortOrder
    con?: SortOrder
  }

  export type IntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type StringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type IntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type DateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type DateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type t_bancoCountOrderByAggregateInput = {
    id?: SortOrder
    banco?: SortOrder
    hscode?: SortOrder
    data?: SortOrder
  }

  export type t_bancoAvgOrderByAggregateInput = {
    id?: SortOrder
  }

  export type t_bancoMaxOrderByAggregateInput = {
    id?: SortOrder
    banco?: SortOrder
    hscode?: SortOrder
    data?: SortOrder
  }

  export type t_bancoMinOrderByAggregateInput = {
    id?: SortOrder
    banco?: SortOrder
    hscode?: SortOrder
    data?: SortOrder
  }

  export type t_bancoSumOrderByAggregateInput = {
    id?: SortOrder
  }

  export type DateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type StringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type t_logCountOrderByAggregateInput = {
    reglog?: SortOrder
    data?: SortOrder
    login?: SortOrder
    usuario?: SortOrder
    empresa?: SortOrder
    loja?: SortOrder
    motivo?: SortOrder
  }

  export type t_logAvgOrderByAggregateInput = {
    reglog?: SortOrder
  }

  export type t_logMaxOrderByAggregateInput = {
    reglog?: SortOrder
    data?: SortOrder
    login?: SortOrder
    usuario?: SortOrder
    empresa?: SortOrder
    loja?: SortOrder
    motivo?: SortOrder
  }

  export type t_logMinOrderByAggregateInput = {
    reglog?: SortOrder
    data?: SortOrder
    login?: SortOrder
    usuario?: SortOrder
    empresa?: SortOrder
    loja?: SortOrder
    motivo?: SortOrder
  }

  export type t_logSumOrderByAggregateInput = {
    reglog?: SortOrder
  }

  export type StringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }

  export type NullableStringFieldUpdateOperationsInput = {
    set?: string | null
  }

  export type NullableIntFieldUpdateOperationsInput = {
    set?: number | null
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type DateTimeFieldUpdateOperationsInput = {
    set?: Date | string
  }

  export type IntFieldUpdateOperationsInput = {
    set?: number
    increment?: number
    decrement?: number
    multiply?: number
    divide?: number
  }

  export type NullableDateTimeFieldUpdateOperationsInput = {
    set?: Date | string | null
  }

  export type StringFieldUpdateOperationsInput = {
    set?: string
  }

  export type NestedIntFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntFilter<$PrismaModel> | number
  }

  export type NestedStringNullableFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableFilter<$PrismaModel> | string | null
  }

  export type NestedIntNullableFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeFilter<$PrismaModel> | Date | string
  }

  export type NestedIntWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntWithAggregatesFilter<$PrismaModel> | number
    _count?: NestedIntFilter<$PrismaModel>
    _avg?: NestedFloatFilter<$PrismaModel>
    _sum?: NestedIntFilter<$PrismaModel>
    _min?: NestedIntFilter<$PrismaModel>
    _max?: NestedIntFilter<$PrismaModel>
  }

  export type NestedFloatFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel>
    in?: number[]
    notIn?: number[]
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatFilter<$PrismaModel> | number
  }

  export type NestedStringNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel> | null
    in?: string[] | null
    notIn?: string[] | null
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringNullableWithAggregatesFilter<$PrismaModel> | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedStringNullableFilter<$PrismaModel>
    _max?: NestedStringNullableFilter<$PrismaModel>
  }

  export type NestedIntNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: number | IntFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | IntFieldRefInput<$PrismaModel>
    lte?: number | IntFieldRefInput<$PrismaModel>
    gt?: number | IntFieldRefInput<$PrismaModel>
    gte?: number | IntFieldRefInput<$PrismaModel>
    not?: NestedIntNullableWithAggregatesFilter<$PrismaModel> | number | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _avg?: NestedFloatNullableFilter<$PrismaModel>
    _sum?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedIntNullableFilter<$PrismaModel>
    _max?: NestedIntNullableFilter<$PrismaModel>
  }

  export type NestedFloatNullableFilter<$PrismaModel = never> = {
    equals?: number | FloatFieldRefInput<$PrismaModel> | null
    in?: number[] | null
    notIn?: number[] | null
    lt?: number | FloatFieldRefInput<$PrismaModel>
    lte?: number | FloatFieldRefInput<$PrismaModel>
    gt?: number | FloatFieldRefInput<$PrismaModel>
    gte?: number | FloatFieldRefInput<$PrismaModel>
    not?: NestedFloatNullableFilter<$PrismaModel> | number | null
  }

  export type NestedDateTimeWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    in?: Date[] | string[]
    notIn?: Date[] | string[]
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeWithAggregatesFilter<$PrismaModel> | Date | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedDateTimeFilter<$PrismaModel>
    _max?: NestedDateTimeFilter<$PrismaModel>
  }

  export type NestedDateTimeNullableFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableFilter<$PrismaModel> | Date | string | null
  }

  export type NestedDateTimeNullableWithAggregatesFilter<$PrismaModel = never> = {
    equals?: Date | string | DateTimeFieldRefInput<$PrismaModel> | null
    in?: Date[] | string[] | null
    notIn?: Date[] | string[] | null
    lt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    lte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gt?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    gte?: Date | string | DateTimeFieldRefInput<$PrismaModel>
    not?: NestedDateTimeNullableWithAggregatesFilter<$PrismaModel> | Date | string | null
    _count?: NestedIntNullableFilter<$PrismaModel>
    _min?: NestedDateTimeNullableFilter<$PrismaModel>
    _max?: NestedDateTimeNullableFilter<$PrismaModel>
  }

  export type NestedStringFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringFilter<$PrismaModel> | string
  }

  export type NestedStringWithAggregatesFilter<$PrismaModel = never> = {
    equals?: string | StringFieldRefInput<$PrismaModel>
    in?: string[]
    notIn?: string[]
    lt?: string | StringFieldRefInput<$PrismaModel>
    lte?: string | StringFieldRefInput<$PrismaModel>
    gt?: string | StringFieldRefInput<$PrismaModel>
    gte?: string | StringFieldRefInput<$PrismaModel>
    contains?: string | StringFieldRefInput<$PrismaModel>
    startsWith?: string | StringFieldRefInput<$PrismaModel>
    endsWith?: string | StringFieldRefInput<$PrismaModel>
    not?: NestedStringWithAggregatesFilter<$PrismaModel> | string
    _count?: NestedIntFilter<$PrismaModel>
    _min?: NestedStringFilter<$PrismaModel>
    _max?: NestedStringFilter<$PrismaModel>
  }



  /**
   * Batch Payload for updateMany & deleteMany & createMany
   */

  export type BatchPayload = {
    count: number
  }

  /**
   * DMMF
   */
  export const dmmf: runtime.BaseDMMF
}