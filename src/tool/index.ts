import DotTool from './dot-tool';
import LineTool from './line-tool';

export type ToolKey = 'dot' | 'line';

export interface Tool {
    onMouseDown(imageX: number, imageY: number): void;
    onMouseUp(imageX: number, imageY: number): void;
};

export { DotTool, LineTool };
