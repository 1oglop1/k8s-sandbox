export type ResourceNameFn = (n?: string) => string;

export function mkResourceNameFn(prefix: string): ResourceNameFn {
  return (n?: string): string => {
    return n ? `${prefix}${n}` : prefix.substring(0, prefix.length - 1);
  };
}
