
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
    t_acessos: 't_acessos'
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
      modelProps: "t_acessos"
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
    empresa: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    logoUrl: string | null
    createdAt: Date | null
  }

  export type T_acessosMaxAggregateOutputType = {
    id: number | null
    login: string | null
    senha: string | null
    nome: string | null
    empresa: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    logoUrl: string | null
    createdAt: Date | null
  }

  export type T_acessosCountAggregateOutputType = {
    id: number
    login: number
    senha: number
    nome: number
    empresa: number
    funcao: number
    banco: number
    adm: number
    ativo: number
    con: number
    pwd: number
    cnpj: number
    ddd: number
    whatsapp: number
    logoUrl: number
    createdAt: number
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
    empresa?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    logoUrl?: true
    createdAt?: true
  }

  export type T_acessosMaxAggregateInputType = {
    id?: true
    login?: true
    senha?: true
    nome?: true
    empresa?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    logoUrl?: true
    createdAt?: true
  }

  export type T_acessosCountAggregateInputType = {
    id?: true
    login?: true
    senha?: true
    nome?: true
    empresa?: true
    funcao?: true
    banco?: true
    adm?: true
    ativo?: true
    con?: true
    pwd?: true
    cnpj?: true
    ddd?: true
    whatsapp?: true
    logoUrl?: true
    createdAt?: true
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
    empresa: string | null
    funcao: string | null
    banco: string | null
    adm: string | null
    ativo: string | null
    con: number | null
    pwd: string | null
    cnpj: string | null
    ddd: string | null
    whatsapp: string | null
    logoUrl: string | null
    createdAt: Date
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
    empresa?: boolean
    funcao?: boolean
    banco?: boolean
    adm?: boolean
    ativo?: boolean
    con?: boolean
    pwd?: boolean
    cnpj?: boolean
    ddd?: boolean
    whatsapp?: boolean
    logoUrl?: boolean
    createdAt?: boolean
  }, ExtArgs["result"]["t_acessos"]>



  export type t_acessosSelectScalar = {
    id?: boolean
    login?: boolean
    senha?: boolean
    nome?: boolean
    empresa?: boolean
    funcao?: boolean
    banco?: boolean
    adm?: boolean
    ativo?: boolean
    con?: boolean
    pwd?: boolean
    cnpj?: boolean
    ddd?: boolean
    whatsapp?: boolean
    logoUrl?: boolean
    createdAt?: boolean
  }

  export type t_acessosOmit<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = $Extensions.GetOmit<"id" | "login" | "senha" | "nome" | "empresa" | "funcao" | "banco" | "adm" | "ativo" | "con" | "pwd" | "cnpj" | "ddd" | "whatsapp" | "logoUrl" | "createdAt", ExtArgs["result"]["t_acessos"]>

  export type $t_acessosPayload<ExtArgs extends $Extensions.InternalArgs = $Extensions.DefaultArgs> = {
    name: "t_acessos"
    objects: {}
    scalars: $Extensions.GetPayloadResult<{
      id: number
      login: string | null
      senha: string | null
      nome: string | null
      empresa: string | null
      funcao: string | null
      banco: string | null
      adm: string | null
      ativo: string | null
      con: number | null
      pwd: string | null
      cnpj: string | null
      ddd: string | null
      whatsapp: string | null
      logoUrl: string | null
      createdAt: Date
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
    readonly empresa: FieldRef<"t_acessos", 'String'>
    readonly funcao: FieldRef<"t_acessos", 'String'>
    readonly banco: FieldRef<"t_acessos", 'String'>
    readonly adm: FieldRef<"t_acessos", 'String'>
    readonly ativo: FieldRef<"t_acessos", 'String'>
    readonly con: FieldRef<"t_acessos", 'Int'>
    readonly pwd: FieldRef<"t_acessos", 'String'>
    readonly cnpj: FieldRef<"t_acessos", 'String'>
    readonly ddd: FieldRef<"t_acessos", 'String'>
    readonly whatsapp: FieldRef<"t_acessos", 'String'>
    readonly logoUrl: FieldRef<"t_acessos", 'String'>
    readonly createdAt: FieldRef<"t_acessos", 'DateTime'>
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
    empresa: 'empresa',
    funcao: 'funcao',
    banco: 'banco',
    adm: 'adm',
    ativo: 'ativo',
    con: 'con',
    pwd: 'pwd',
    cnpj: 'cnpj',
    ddd: 'ddd',
    whatsapp: 'whatsapp',
    logoUrl: 'logoUrl',
    createdAt: 'createdAt'
  };

  export type T_acessosScalarFieldEnum = (typeof T_acessosScalarFieldEnum)[keyof typeof T_acessosScalarFieldEnum]


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
    empresa?: StringNullableFilter<"t_acessos"> | string | null
    funcao?: StringNullableFilter<"t_acessos"> | string | null
    banco?: StringNullableFilter<"t_acessos"> | string | null
    adm?: StringNullableFilter<"t_acessos"> | string | null
    ativo?: StringNullableFilter<"t_acessos"> | string | null
    con?: IntNullableFilter<"t_acessos"> | number | null
    pwd?: StringNullableFilter<"t_acessos"> | string | null
    cnpj?: StringNullableFilter<"t_acessos"> | string | null
    ddd?: StringNullableFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableFilter<"t_acessos"> | string | null
    createdAt?: DateTimeFilter<"t_acessos"> | Date | string
  }

  export type t_acessosOrderByWithRelationInput = {
    id?: SortOrder
    login?: SortOrderInput | SortOrder
    senha?: SortOrderInput | SortOrder
    nome?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    funcao?: SortOrderInput | SortOrder
    banco?: SortOrderInput | SortOrder
    adm?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
    con?: SortOrderInput | SortOrder
    pwd?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    ddd?: SortOrderInput | SortOrder
    whatsapp?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
  }

  export type t_acessosWhereUniqueInput = Prisma.AtLeast<{
    id?: number
    AND?: t_acessosWhereInput | t_acessosWhereInput[]
    OR?: t_acessosWhereInput[]
    NOT?: t_acessosWhereInput | t_acessosWhereInput[]
    login?: StringNullableFilter<"t_acessos"> | string | null
    senha?: StringNullableFilter<"t_acessos"> | string | null
    nome?: StringNullableFilter<"t_acessos"> | string | null
    empresa?: StringNullableFilter<"t_acessos"> | string | null
    funcao?: StringNullableFilter<"t_acessos"> | string | null
    banco?: StringNullableFilter<"t_acessos"> | string | null
    adm?: StringNullableFilter<"t_acessos"> | string | null
    ativo?: StringNullableFilter<"t_acessos"> | string | null
    con?: IntNullableFilter<"t_acessos"> | number | null
    pwd?: StringNullableFilter<"t_acessos"> | string | null
    cnpj?: StringNullableFilter<"t_acessos"> | string | null
    ddd?: StringNullableFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableFilter<"t_acessos"> | string | null
    createdAt?: DateTimeFilter<"t_acessos"> | Date | string
  }, "id">

  export type t_acessosOrderByWithAggregationInput = {
    id?: SortOrder
    login?: SortOrderInput | SortOrder
    senha?: SortOrderInput | SortOrder
    nome?: SortOrderInput | SortOrder
    empresa?: SortOrderInput | SortOrder
    funcao?: SortOrderInput | SortOrder
    banco?: SortOrderInput | SortOrder
    adm?: SortOrderInput | SortOrder
    ativo?: SortOrderInput | SortOrder
    con?: SortOrderInput | SortOrder
    pwd?: SortOrderInput | SortOrder
    cnpj?: SortOrderInput | SortOrder
    ddd?: SortOrderInput | SortOrder
    whatsapp?: SortOrderInput | SortOrder
    logoUrl?: SortOrderInput | SortOrder
    createdAt?: SortOrder
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
    empresa?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    funcao?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    banco?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    adm?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    ativo?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    con?: IntNullableWithAggregatesFilter<"t_acessos"> | number | null
    pwd?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    cnpj?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    ddd?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    whatsapp?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    logoUrl?: StringNullableWithAggregatesFilter<"t_acessos"> | string | null
    createdAt?: DateTimeWithAggregatesFilter<"t_acessos"> | Date | string
  }

  export type t_acessosCreateInput = {
    login?: string | null
    senha?: string | null
    nome?: string | null
    empresa?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    logoUrl?: string | null
    createdAt?: Date | string
  }

  export type t_acessosUncheckedCreateInput = {
    id?: number
    login?: string | null
    senha?: string | null
    nome?: string | null
    empresa?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    logoUrl?: string | null
    createdAt?: Date | string
  }

  export type t_acessosUpdateInput = {
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type t_acessosUncheckedUpdateInput = {
    id?: IntFieldUpdateOperationsInput | number
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type t_acessosCreateManyInput = {
    login?: string | null
    senha?: string | null
    nome?: string | null
    empresa?: string | null
    funcao?: string | null
    banco?: string | null
    adm?: string | null
    ativo?: string | null
    con?: number | null
    pwd?: string | null
    cnpj?: string | null
    ddd?: string | null
    whatsapp?: string | null
    logoUrl?: string | null
    createdAt?: Date | string
  }

  export type t_acessosUpdateManyMutationInput = {
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
  }

  export type t_acessosUncheckedUpdateManyInput = {
    id?: IntFieldUpdateOperationsInput | number
    login?: NullableStringFieldUpdateOperationsInput | string | null
    senha?: NullableStringFieldUpdateOperationsInput | string | null
    nome?: NullableStringFieldUpdateOperationsInput | string | null
    empresa?: NullableStringFieldUpdateOperationsInput | string | null
    funcao?: NullableStringFieldUpdateOperationsInput | string | null
    banco?: NullableStringFieldUpdateOperationsInput | string | null
    adm?: NullableStringFieldUpdateOperationsInput | string | null
    ativo?: NullableStringFieldUpdateOperationsInput | string | null
    con?: NullableIntFieldUpdateOperationsInput | number | null
    pwd?: NullableStringFieldUpdateOperationsInput | string | null
    cnpj?: NullableStringFieldUpdateOperationsInput | string | null
    ddd?: NullableStringFieldUpdateOperationsInput | string | null
    whatsapp?: NullableStringFieldUpdateOperationsInput | string | null
    logoUrl?: NullableStringFieldUpdateOperationsInput | string | null
    createdAt?: DateTimeFieldUpdateOperationsInput | Date | string
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
    empresa?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    logoUrl?: SortOrder
    createdAt?: SortOrder
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
    empresa?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    logoUrl?: SortOrder
    createdAt?: SortOrder
  }

  export type t_acessosMinOrderByAggregateInput = {
    id?: SortOrder
    login?: SortOrder
    senha?: SortOrder
    nome?: SortOrder
    empresa?: SortOrder
    funcao?: SortOrder
    banco?: SortOrder
    adm?: SortOrder
    ativo?: SortOrder
    con?: SortOrder
    pwd?: SortOrder
    cnpj?: SortOrder
    ddd?: SortOrder
    whatsapp?: SortOrder
    logoUrl?: SortOrder
    createdAt?: SortOrder
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