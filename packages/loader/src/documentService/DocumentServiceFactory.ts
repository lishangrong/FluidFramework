import type {
	IDocumentServiceFactory,
	ICreateContainerParams,
} from "../interfaces/IDocumentServiceFactory.js";
import type { IDocumentService } from "../interfaces/IDocumentService.js";
import type { IResolvedUrl } from "../interfaces/IResolvedUrl.js";
import { DocumentServiceFactoryRegistry } from "./DocumentServiceFactoryRegistry.js";

/**
 * 组合文档服务工厂。
 * 持有一个 Registry，根据 IResolvedUrl 中的协议类型委托给正确的子工厂。
 */
export class DocumentServiceFactory implements IDocumentServiceFactory {
	readonly protocolName = "multi-protocol";
	private readonly registry: DocumentServiceFactoryRegistry;

	constructor(factories: IDocumentServiceFactory[]) {
		this.registry = new DocumentServiceFactoryRegistry(factories);
	}

	async createDocumentService(
		resolvedUrl: IResolvedUrl,
	): Promise<IDocumentService> {
		const factory = this.registry.get(resolvedUrl.type);
		return factory.createDocumentService(resolvedUrl);
	}

	async createContainer(
		params: ICreateContainerParams,
	): Promise<IResolvedUrl> {
		const factory = this.registry.get(params.resolvedUrl.type);
		return factory.createContainer(params);
	}

	getRegistry(): DocumentServiceFactoryRegistry {
		return this.registry;
	}
}
