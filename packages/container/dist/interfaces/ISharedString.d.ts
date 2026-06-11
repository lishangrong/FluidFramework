import type { ISharedObject } from "./IDds.js";
/**
 * 共享文本数据结构接口。
 */
export interface ISharedString extends ISharedObject {
    /** 获取完整文本内容。 */
    getText(): string;
    /** 获取文本长度。 */
    getLength(): number;
    /** 在指定位置插入文本。 */
    insertText(pos: number, text: string): void;
    /** 删除指定范围的文本。 */
    removeText(start: number, end: number): void;
    /** 替换指定范围的文本。 */
    replaceText(start: number, end: number, text: string): void;
}
//# sourceMappingURL=ISharedString.d.ts.map