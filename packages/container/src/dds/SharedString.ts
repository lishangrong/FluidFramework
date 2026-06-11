import { SharedObjectBase } from "./SharedObjectBase.js";
import type { ISharedString } from "../interfaces/ISharedString.js";

/** SharedString 操作类型。 */
interface IStringOp {
	readonly action: "insert" | "remove";
	readonly pos: number;
	readonly text?: string;
	readonly end?: number;
}

/**
 * 共享文本数据结构。
 * v0.1.0 采用简化的位置插入/删除模型。
 */
export class SharedString extends SharedObjectBase implements ISharedString {
	public static readonly TYPE = "SharedString";
	private content: string = "";

	constructor(id: string) {
		super(id, SharedString.TYPE);
	}

	getText(): string {
		return this.content;
	}

	getLength(): number {
		return this.content.length;
	}

	insertText(pos: number, text: string): void {
		const clamped = Math.max(0, Math.min(pos, this.content.length));
		this.content =
			this.content.slice(0, clamped) + text + this.content.slice(clamped);
		const op: IStringOp = { action: "insert", pos: clamped, text };
		void this.submitOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
		});
	}

	removeText(start: number, end: number): void {
		const s = Math.max(0, Math.min(start, this.content.length));
		const e = Math.max(s, Math.min(end, this.content.length));
		if (s === e) return;
		this.content = this.content.slice(0, s) + this.content.slice(e);
		const op: IStringOp = { action: "remove", pos: s, end: e };
		void this.submitOp(op);
		this.safeEmit("changed", {
			objectId: this.id,
			type: this.type,
		});
	}

	replaceText(start: number, end: number, text: string): void {
		this.removeText(start, end);
		this.insertText(start, text);
	}

	/**
	 * 将当前文本内容序列化为二进制快照。
	 */
	snapshot(): Uint8Array {
		return this.serializer.encode(this.content);
	}

	/**
	 * 从二进制快照恢复文本内容。
	 */
	loadFromSnapshot(data: Uint8Array): void {
		this.content = this.serializer.decode(data) as string;
	}

	/**
	 * 应用远端操作。
	 */
	applyOp(op: unknown): void {
		const strOp = op as IStringOp;
		switch (strOp.action) {
			case "insert":
				if (strOp.text !== undefined) {
					const pos = Math.max(0, Math.min(strOp.pos, this.content.length));
					this.content =
						this.content.slice(0, pos) + strOp.text + this.content.slice(pos);
				}
				break;
			case "remove":
				if (strOp.end !== undefined) {
					const s = Math.max(0, Math.min(strOp.pos, this.content.length));
					const e = Math.max(s, Math.min(strOp.end, this.content.length));
					this.content = this.content.slice(0, s) + this.content.slice(e);
				}
				break;
		}
	}
}
