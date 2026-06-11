/**
 * Fluid Loader - Document Service Factory
 *
 * Manages protocol-based registration and creation of document services.
 * Routes resolved URLs to the appropriate service factory based on protocol.
 */

import type {
  IContainerConnection,
  IDeltaStreamConnection,
  IDocumentService,
  IDocumentServiceFactory,
  IFluidResolvedUrl,
  IStorageConnection,
} from "./types";
import { UnsupportedProtocolError, DocumentServiceError } from "./errors";

/** Factory function that creates a document service from a resolved URL */
export type DocumentServiceCreator = (
  resolvedUrl: IFluidResolvedUrl,
) => Promise<IDocumentService>;

/**
 * Default document service implementation.
 * Provides stub connections for container, storage, and delta stream.
 */
class DefaultDocumentService implements IDocumentService {
  private disposed = false;

  constructor(private readonly resolvedUrl: IFluidResolvedUrl) {}

  async connectToContainer(): Promise<IContainerConnection> {
    this.ensureNotDisposed();
    return {
      containerId: this.resolvedUrl.containerId,
      close: () => {
        /* connection closed */
      },
      on: (_event: string, _handler: (...args: unknown[]) => void) => {
        /* event listener registered */
      },
    };
  }

  async connectToStorage(): Promise<IStorageConnection> {
    this.ensureNotDisposed();
    return {
      getSnapshot: async () => ({}),
      createBlob: async (_content: unknown) => `blob-${Date.now()}`,
      getBlob: async (_blobId: string) => ({}),
    };
  }

  async connectToDeltaStream(): Promise<IDeltaStreamConnection> {
    this.ensureNotDisposed();
    return {
      submit: (_operation: unknown) => {
        /* operation submitted */
      },
      on: (_event: string, _handler: (...args: unknown[]) => void) => {
        /* event listener registered */
      },
      disconnect: () => {
        /* disconnected */
      },
    };
  }

  dispose(): void {
    this.disposed = true;
  }

  private ensureNotDisposed(): void {
    if (this.disposed) {
      throw new DocumentServiceError(
        "Document service has been disposed",
        this.resolvedUrl.serviceEndpoint,
      );
    }
  }
}

/**
 * Concrete implementation of IDocumentServiceFactory.
 *
 * Maintains a registry mapping protocol names to service creator functions.
 * When creating a document service, looks up the protocol from the resolved
 * URL and delegates to the registered creator.
 */
export class FluidDocumentServiceFactory implements IDocumentServiceFactory {
  private readonly registry = new Map<string, DocumentServiceCreator>();

  constructor() {
    // Register the default "fluid" and "https" protocols
    this.registerDefaultProtocols();
  }

  registerProtocol(
    protocol: string,
    factory: DocumentServiceCreator,
  ): void {
    this.registry.set(protocol.toLowerCase(), factory);
  }

  hasProtocol(protocol: string): boolean {
    return this.registry.has(protocol.toLowerCase());
  }

  async createDocumentService(
    resolvedUrl: IFluidResolvedUrl,
  ): Promise<IDocumentService> {
    const protocol = resolvedUrl.protocol.toLowerCase();
    const creator = this.registry.get(protocol);

    if (!creator) {
      throw new UnsupportedProtocolError(
        protocol,
        this.getSupportedProtocols(),
      );
    }

    try {
      return await creator(resolvedUrl);
    } catch (err) {
      if (err instanceof UnsupportedProtocolError) throw err;
      throw new DocumentServiceError(
        `Failed to create document service for "${protocol}": ${err instanceof Error ? err.message : String(err)}`,
        resolvedUrl.serviceEndpoint,
      );
    }
  }

  /** Get list of registered protocol names */
  getSupportedProtocols(): string[] {
    return Array.from(this.registry.keys());
  }

  private registerDefaultProtocols(): void {
    // Default "fluid" protocol: uses DefaultDocumentService
    this.registerProtocol("fluid", async (resolvedUrl) => {
      return new DefaultDocumentService(resolvedUrl);
    });

    // Default "https" protocol: same implementation
    this.registerProtocol("https", async (resolvedUrl) => {
      return new DefaultDocumentService(resolvedUrl);
    });

    // Default "http" protocol
    this.registerProtocol("http", async (resolvedUrl) => {
      return new DefaultDocumentService(resolvedUrl);
    });
  }
}
