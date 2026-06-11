import { SharedObjectBase } from "./SharedObjectBase.js";
/**
 * 共享文本数据结构。
 * v0.1.0 采用简化的位置插入/删除模型。
 */
export class SharedString extends SharedObjectBase {
    static TYPE = "SharedString";
    content = "";
    constructor(id) {
        super(id, SharedString.TYPE);
    }
    getText() {
        return this.content;
    }
    getLength() {
        return this.content.length;
    }
    insertText(pos, text) {
        const clamped = Math.max(0, Math.min(pos, this.content.length));
        this.content =
            this.content.slice(0, clamped) + text + this.content.slice(clamped);
        const op = { action: "insert", pos: clamped, text };
        void this.submitOp(op);
        this.safeEmit("changed", {
            objectId: this.id,
            type: this.type,
        });
    }
    removeText(start, end) {
        const s = Math.max(0, Math.min(start, this.content.length));
        const e = Math.max(s, Math.min(end, this.content.length));
        if (s === e)
            return;
        this.content = this.content.slice(0, s) + this.content.slice(e);
        const op = { action: "remove", pos: s, end: e };
        void this.submitOp(op);
        this.safeEmit("changed", {
            objectId: this.id,
            type: this.type,
        });
    }
    replaceText(start, end, text) {
        this.removeText(start, end);
        this.insertText(start, text);
    }
    /**
     * 将当前文本内容序列化为二进制快照。
     */
    snapshot() {
        return this.serializer.encode(this.content);
    }
    /**
     * 从二进制快照恢复文本内容。
     */
    loadFromSnapshot(data) {
        this.content = this.serializer.decode(data);
    }
    /**
     * 应用远端操作。
     */
    applyOp(op) {
        const strOp = op;
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
//# sourceMappingURL=SharedString.js.map