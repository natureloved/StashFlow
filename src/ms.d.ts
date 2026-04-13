declare module 'ms' {
  interface Options {
    /**
     * Set to `true` to use verbose output.
     */
    long?: boolean;
  }

  /**
   * Parse various time formats to milliseconds.
   *
   * @param value - The value to parse.
   * @param options - Options for parsing.
   * @returns The parsed value in milliseconds.
   */
  function ms(value: string, options?: Options): number;

  /**
   * Format milliseconds to a human-readable string.
   *
   * @param value - The number of milliseconds to format.
   * @param options - Options for formatting.
   * @returns The formatted string.
   */
  function ms(value: number, options?: Options): string;

  export = ms;
}
