import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedString } from "../interfaces/ISharedString.js";
/**
 * 共享文本数据结构。
 * v0.1.0 采用简化的位置插入/删除模型。
 */
export declare class SharedString extends SharedObjectBase implements ISharedString {
    static readonly TYPE = "SharedString";
    private content;
    constructor(id: string);
    getText(): string;
    getLength(): number;
    insertText(pos: number, text: string): void;
    removeText(start: number, end: number): void;
    replaceText(start: number, end: number, text: string): void;
    /**
     * 将当前文本内容序列化为二进制快照。
     */
    snapshot(): Uint8Array;
    /**
     * 从二进制快照恢复文本内容。
     */
    loadFromSnapshot(data: Uint8Array): void;
    /**
     * 应用远端操作。
     */
    applyOp(op: unknown): void;
}
//# sourceMappingURL=SharedString.d.ts.map