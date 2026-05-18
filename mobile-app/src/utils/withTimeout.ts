/** Rejects if `promise` does not settle within `ms` (prevents infinite spinners on dead networks). */
export function withTimeout<T>(promise: Promise<T>, ms: number, message: string): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(message)), ms);
    });
    return Promise.race([
        promise.finally(() => {
            if (timer !== undefined) clearTimeout(timer);
        }),
        timeout,
    ]) as Promise<T>;
}
