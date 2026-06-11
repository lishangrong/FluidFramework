import type { IDocumentServiceFactory } from "../interfaces/IDocumentServiceFactory.js";
import { ProtocolError } from "../errors/ProtocolError.js";
import { LoaderErrorCode } from "../errors/LoaderErrorCode.js";

/**
 * 协议 → 文档服务工厂的注册表。
 * 管理多种协议各自对应的工厂实例。
 */
export class DocumentServiceFactoryRegistry {
	private readonly factories = new Map<string, IDocumentServiceFactory>();

	constructor(factories?: IDocumentServiceFactory[]) {
		if (factories) {
			for (const factory of factories) {
				this.register(factory);
			}
		}
	}

	register(factory: IDocumentServiceFactory): void {
		if (this.factories.has(factory.protocolName)) {
			throw new ProtocolError(
				`Protocol "${factory.protocolName}" is already registered`,
				LoaderErrorCode.ProtocolAlreadyRegistered,
				{ protocolName: factory.protocolName },
			);
		}
		this.factories.set(factory.protocolName, factory);
	}

	unregister(protocolName: string): boolean {
		return this.factories.delete(protocolName);
	}

	get(protocolName: string): IDocumentServiceFactory {
		const factory = this.factories.get(protocolName);
		if (!factory) {
			throw new ProtocolError(
				`No factory registered for protocol "${protocolName}". Registered: ${this.getRegisteredProtocols().join(", ") || "(none)"}`,
				LoaderErrorCode.ProtocolNotRegistered,
				{
					protocolName,
					registered: this.getRegisteredProtocols(),
				},
			);
		}
		return factory;
	}

	tryGet(protocolName: string): IDocumentServiceFactory | undefined {
		return this.factories.get(protocolName);
	}

	has(protocolName: string): boolean {
		return this.factories.has(protocolName);
	}

	getRegisteredProtocols(): readonly string[] {
		return [...this.factories.keys()];
	}
}
