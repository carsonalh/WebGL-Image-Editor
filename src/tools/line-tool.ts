// our tool will work like this:
// begin: give the tool everything it needs to begin, a copy of the entire state, which it can copy into its own state all that it might need
// update: update it whenever the state updates, with a handle to the new state
// end: let it overwrite the real state with the updates

import store, {
    initialiseDisplayMask,
    setDisplayMask,
} from '../store';

type SceneState = ReturnType<typeof store.getState>['scene'];

export interface ToolInterface<ToolState> {
    begin(toolState: ToolState, sceneState: SceneState): void;
    update(toolState: ToolState, sceneState: SceneState): void;
    end(toolState: ToolState, sceneState: SceneState): void;
};

type LineTool = ReturnType<typeof store.getState>['lineTool'];

export default class LineToolClass implements ToolInterface<LineTool> {
    private width: number;
    private height: number;
    private displayMask: number[];

    constructor(size: [width: number, height: number]) {
        this.width = size[0];
        this.height = size[1];
        this.displayMask = new Array(this.width * this.height).fill(0);
    }

    begin(toolState: LineTool, sceneState: SceneState): void {
        initialiseDisplayMask([[this.width, this.height], this.displayMask]);
    }

    update(toolState: LineTool, sceneState: SceneState) {}

    end(toolState: LineTool, sceneState: SceneState) {}
};
