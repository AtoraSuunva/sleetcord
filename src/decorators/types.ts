/**
 * A type representing a decorator handler, which when returned by a function
 * makes that function as a decorator for a method (or accessor)
 *
 * @example
 * ```typescript
 * const myDecorator = (...args: unknown[]) => MethodDecoratorHandler
 *
 * class MyClass {
 *   @myDecorator(arg1, arg2)
 *   myMethod() {}
 * }
 * ```
 */
export type MethodDecoratorHandler<Target> = (
  target: Target,
  key: string | symbol,
  descriptor: PropertyDescriptor,
) => void

/**
 * Represents a method decorator function, which can be applied to a class method
 * or accessor
 */
export type MethodDecorator<Args extends unknown[], Target> = (
  ...args: Args
) => MethodDecoratorHandler<Target>
