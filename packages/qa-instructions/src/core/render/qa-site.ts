/**
 * The QA Site: where testers follow the QA Instructions. Points every
 * address on a Test Site at itself, keeping each address's path and query.
 */
export class QaSite {
  /** An address in text: runs to whitespace or the markup around it. */
  private static readonly ADDRESS = /https?:\/\/[^\s*`<>"']+/g;
  /** The scheme and authority an address starts with, as written. */
  private static readonly AUTHORITY = /^https?:\/\/[^/?#]*/i;

  private constructor(
    /** The QA Site's scheme, host, and port. */
    readonly origin: string,
    /** Any path the QA Site is served under, without a trailing slash. */
    private readonly prefix: string,
  ) {}

  /** The origin of an absolute http(s) address, or undefined for anything else. */
  static originOf(address: string | undefined): string | undefined {
    if (address === undefined) return undefined;
    try {
      const { protocol, origin } = new URL(address);
      return protocol === 'http:' || protocol === 'https:' ? origin : undefined;
    } catch {
      return undefined;
    }
  }

  /** @throws if `address` is not an absolute http(s) address. */
  static parse(address: string): QaSite {
    const origin = QaSite.originOf(address);
    if (origin === undefined) {
      throw new Error(
        `the QA Site must be an absolute http(s) address, not "${address}"`,
      );
    }
    const { pathname } = new URL(address);
    return new QaSite(origin, pathname.replace(/\/+$/, ''));
  }

  /** `text` with every address on `testSite` pointed at this QA Site. */
  retarget(text: string, testSite: string | undefined): string {
    if (testSite === undefined) return text;
    return text.replace(QaSite.ADDRESS, (address) => {
      if (QaSite.originOf(address) !== testSite) return address;
      const authority = QaSite.AUTHORITY.exec(address)?.[0] ?? '';
      return this.origin + this.prefix + address.slice(authority.length);
    });
  }
}
